"""Crosswalk kode/nama pemda berversi (pipeline/config/crosswalk_pemda.csv).

Berkas CSV di-commit ke Git dan menjadi acuan tunggal kode baku. Pipeline
hanya membacanya; bila muncul kode yang tidak tercakup, pipeline gagal.
Regenerasi sengaja (mis. data tahun baru):  python -m pipeline.crosswalk
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

from pipeline.readers import PIPELINE_DIR, load_schema_map

CROSSWALK_PATH = PIPELINE_DIR / "config" / "crosswalk_pemda.csv"
KOLOM = [
    "kode_pemda",
    "nama_pemda",
    "tingkat",
    "provinsi_induk",
    "kode_2022",
    "provinsi_induk_2022",
    "tahun_pertama",
    "tahun_terakhir",
    "n_tahun",
    "panel_seimbang",
    "varian_nama",
]


def tingkat_dari(kode: str, nama: str) -> str:
    if kode.endswith(".00"):
        return "provinsi"
    if nama.startswith("Kab."):
        return "kabupaten"
    if nama.startswith("Kota"):
        return "kota"
    raise ValueError(f"Tingkat tidak dikenali: {kode} {nama}")


def kode_baku(kode: pd.Series, tahun: pd.Series, sm: dict) -> pd.Series:
    """Kode asli -> kode baku (2023+). Hanya berlaku sebelum tahun pemekaran."""
    pm = sm["pemekaran_papua"]
    lama = tahun < pm["tahun_berlaku"]
    return kode.where(~lama, kode.replace(pm["kode_lama_ke_baru"]))


def bangun_crosswalk(fungsi_raw: pd.DataFrame, sm: dict) -> pd.DataFrame:
    """fungsi_raw: keluaran tahap ekstraksi (tahun, kode_pemda, nama_pemda, ...)."""
    pemda = fungsi_raw[["tahun", "kode_pemda", "nama_pemda"]].drop_duplicates()
    pemda = pemda.assign(kode_asli=pemda["kode_pemda"], kode_pemda=kode_baku(pemda["kode_pemda"], pemda["tahun"], sm))
    kanonik = sm.get("nama_kanonik", {})
    tahun_akhir = pemda["tahun"].max()
    tidak_seimbang = set(sm["pemekaran_papua"]["panel_tidak_seimbang"])
    n_tahun_total = pemda["tahun"].nunique()

    rows = []
    for kode, g in pemda.sort_values("tahun").groupby("kode_pemda"):
        nama_terakhir = g.loc[g["tahun"].idxmax(), "nama_pemda"]
        nama = kanonik.get(kode, nama_terakhir)
        g22 = g[g["tahun"] == 2022]
        kode_22 = g22["kode_asli"].iloc[0] if len(g22) else None
        n = g["tahun"].nunique()
        rows.append(
            {
                "kode_pemda": kode,
                "nama_pemda": nama,
                "tingkat": tingkat_dari(kode, nama),
                "provinsi_induk": kode[:2] + ".00" if g["tahun"].max() == tahun_akhir else None,
                "kode_2022": kode_22,
                "provinsi_induk_2022": kode_22[:2] + ".00" if kode_22 else None,
                "tahun_pertama": int(g["tahun"].min()),
                "tahun_terakhir": int(g["tahun"].max()),
                "n_tahun": int(n),
                "panel_seimbang": bool(n == n_tahun_total and kode not in tidak_seimbang),
                "varian_nama": "|".join(sorted(set(g["nama_pemda"]) - {nama})),
            }
        )
    return pd.DataFrame(rows, columns=KOLOM).sort_values("kode_pemda").reset_index(drop=True)


def muat_crosswalk(path: Path = CROSSWALK_PATH) -> pd.DataFrame:
    return pd.read_csv(path, dtype=str, keep_default_na=False).assign(
        tahun_pertama=lambda d: d["tahun_pertama"].astype(int),
        tahun_terakhir=lambda d: d["tahun_terakhir"].astype(int),
        n_tahun=lambda d: d["n_tahun"].astype(int),
        panel_seimbang=lambda d: d["panel_seimbang"].map({"True": True, "False": False}),
    )


def main() -> int:
    from pipeline.extract import ekstrak

    sm = load_schema_map()
    cw = bangun_crosswalk(ekstrak(sm)["fungsi"], sm)
    cw.to_csv(CROSSWALK_PATH, index=False, lineterminator="\n")
    print(f"{len(cw)} pemda ditulis ke {CROSSWALK_PATH}")
    print(cw["tingkat"].value_counts().to_string())
    print("panel tidak seimbang:", cw.loc[~cw["panel_seimbang"], "kode_pemda"].tolist())
    return 0


if __name__ == "__main__":
    sys.exit(main())
