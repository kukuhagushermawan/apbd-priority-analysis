"""Tahap 1 — akuisisi & ekstraksi: xlsx per tahun -> Parquet mentah terstruktur.

Belum ada pemetaan kode; label dan nilai disimpan apa adanya agar tahap
standardisasi bisa diaudit terhadap sumber.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from pipeline.readers import (
    RAW_DIR,
    baca_fungsi_long,
    baca_fungsi_wide,
    baca_metadata_fungsi,
    baca_ringkas_wide,
)
from pipeline.storage import write_parquet

SUBDIR = "01_ekstraksi"
OUTPUTS = {
    "fungsi": f"{SUBDIR}/fungsi_wide.parquet",
    "fungsi_long": f"{SUBDIR}/fungsi_long.parquet",
    "ringkas": f"{SUBDIR}/ringkas.parquet",
    "metadata": f"{SUBDIR}/metadata.parquet",
}


def input_files(sm: dict, raw_dir: Path = RAW_DIR) -> list[Path]:
    files = set()
    for ycfg in sm["tahun"].values():
        files.add(raw_dir / ycfg["fungsi"]["berkas"])
        files.add(raw_dir / ycfg["ringkas"]["berkas"])
    return sorted(files)


def ekstrak(sm: dict, raw_dir: Path = RAW_DIR) -> dict[str, pd.DataFrame]:
    fungsi, fungsi_long, ringkas, meta = [], [], [], []
    for year, ycfg in sm["tahun"].items():
        fungsi.append(baca_fungsi_wide(year, ycfg["fungsi"], raw_dir))
        long = baca_fungsi_long(year, ycfg["fungsi"], raw_dir)
        if long is not None:
            fungsi_long.append(long)
        ringkas.append(baca_ringkas_wide(year, ycfg["ringkas"], raw_dir))
        meta.append(baca_metadata_fungsi(year, ycfg["fungsi"], raw_dir))

    def gabung(frames):
        df = pd.concat(frames, ignore_index=True)
        for col in df.columns:
            if df[col].dtype == object:
                df[col] = df[col].astype(str)
        return df

    return {
        "fungsi": gabung(fungsi),
        "fungsi_long": gabung(fungsi_long),
        "ringkas": gabung(ringkas),
        "metadata": pd.DataFrame(meta),
    }


def run(sm: dict, out_dir: Path, raw_dir: Path = RAW_DIR) -> dict[str, pd.DataFrame]:
    hasil = ekstrak(sm, raw_dir)
    for key, rel in OUTPUTS.items():
        write_parquet(hasil[key], out_dir / rel)
    return hasil
