"""Orkestrator pipeline:  python -m pipeline.run [--force] [--out-dir DIR]

Tahap: 1 ekstraksi -> 2 standardisasi -> 3 agregasi -> 4 share -> 5 validasi.
Idempoten: tiap tahap menulis ulang Parquet-nya secara deterministik, dan
dilewati bila hash masukan + konfigurasi + kode tahap tidak berubah sejak
eksekusi terakhir (data/processed/_manifest.json). Exit 1 bila ada GAGAL.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

from pipeline import aggregate, extract, share, standardize, validate
from pipeline.crosswalk import CROSSWALK_PATH, muat_crosswalk
from pipeline.readers import PIPELINE_DIR, RAW_DIR, SCHEMA_MAP_PATH, load_schema_map
from pipeline.storage import PROCESSED_DIR, hash_files, load_manifest, read_parquet, save_manifest


def _src(name: str) -> Path:
    return PIPELINE_DIR / f"{name}.py"


def jalankan(out_dir: Path = PROCESSED_DIR, raw_dir: Path = RAW_DIR, force: bool = False, verbose: bool = True):
    sm = load_schema_map()
    crosswalk = muat_crosswalk()
    manifest = load_manifest(out_dir)
    log = print if verbose else (lambda *a, **k: None)

    def tahap(nama, inputs, outputs: dict, fn):
        paths = {k: out_dir / v for k, v in outputs.items()}
        h = hash_files(inputs)
        t0 = time.perf_counter()
        if not force and manifest.get(nama) == h and all(p.exists() for p in paths.values()):
            log(f"[lewati] {nama} (tidak ada perubahan)")
            return {k: read_parquet(p) for k, p in paths.items()}
        hasil = fn()
        manifest[nama] = h
        save_manifest(out_dir, manifest)
        log(f"[selesai] {nama} ({time.perf_counter() - t0:.1f} dtk) -> {', '.join(str(p.relative_to(out_dir)) for p in paths.values())}")
        return hasil

    cfg = [SCHEMA_MAP_PATH]
    raw = tahap(
        "1_ekstraksi",
        extract.input_files(sm, raw_dir) + cfg + [_src("readers"), _src("extract")],
        extract.OUTPUTS,
        lambda: extract.run(sm, out_dir, raw_dir),
    )
    std = tahap(
        "2_standardisasi",
        [out_dir / p for p in extract.OUTPUTS.values()] + cfg + [CROSSWALK_PATH, _src("standardize"), _src("crosswalk")],
        standardize.OUTPUTS,
        lambda: standardize.run(raw, sm, crosswalk, out_dir),
    )
    fakta = tahap(
        "3_agregasi",
        [out_dir / standardize.OUTPUTS["fungsi"], _src("aggregate")],
        {"fakta": aggregate.OUTPUT},
        lambda: {"fakta": aggregate.run(std["fungsi"], out_dir)},
    )["fakta"]
    sh = tahap(
        "4_share",
        [out_dir / aggregate.OUTPUT, CROSSWALK_PATH, _src("share")],
        {"share": share.OUTPUT},
        lambda: {"share": share.run(fakta, crosswalk, out_dir)},
    )["share"]
    log_val = tahap(
        "5_validasi",
        [out_dir / p for p in (*standardize.OUTPUTS.values(), aggregate.OUTPUT, share.OUTPUT, extract.OUTPUTS["metadata"])]
        + cfg
        + [CROSSWALK_PATH, _src("validate")],
        {"log": validate.OUTPUT},
        lambda: {
            "log": validate.run(fakta, sh, std["fungsi"], std["ringkas"], std["fungsi_long"], raw["metadata"], crosswalk, sm, out_dir)
        },
    )["log"]
    return {"fakta": fakta, "share": sh, "log_validasi": log_val, "standar": std}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--force", action="store_true", help="jalankan ulang semua tahap")
    ap.add_argument("--out-dir", type=Path, default=PROCESSED_DIR)
    args = ap.parse_args(argv)

    hasil = jalankan(args.out_dir, force=args.force)
    log_val = hasil["log_validasi"]
    print()
    print(validate.ringkasan_log(log_val))
    n_gagal = int((log_val["status"] == "GAGAL").sum())
    print(f"\nSTATUS PIPELINE: {'GAGAL' if n_gagal else 'LULUS'} ({n_gagal} pemeriksaan gagal)")
    return 1 if n_gagal else 0


if __name__ == "__main__":
    sys.exit(main())
