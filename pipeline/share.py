"""Tahap 4 — share belanja per fungsi.

share_belanja = nilai_anggaran_fungsi / total_belanja, dengan total_belanja =
jumlah 9 fungsi aktif pemda tsb pada tahun tsb. Total ini identik dengan akun
"5. Belanja Daerah" di Ringkasan (divalidasi di tahap 5), sehingga share
selalu berjumlah tepat 1 per pemda-tahun.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from pipeline.storage import write_parquet

OUTPUT = "04_share/share_fungsi.parquet"


def hitung_share(fakta: pd.DataFrame, crosswalk: pd.DataFrame | None = None) -> pd.DataFrame:
    df = fakta[["tahun", "kode_pemda", "nama_pemda", "tingkat", "provinsi_induk", "kode_fungsi", "nama_fungsi", "nilai_anggaran"]].copy()
    df["total_belanja"] = df.groupby(["tahun", "kode_pemda"])["nilai_anggaran"].transform("sum")
    if (df["total_belanja"] <= 0).any():
        bad = df.loc[df["total_belanja"] <= 0, ["tahun", "kode_pemda"]].drop_duplicates().values.tolist()
        raise ValueError(f"Total belanja <= 0: {bad}")
    df["share_belanja"] = df["nilai_anggaran"] / df["total_belanja"]
    if crosswalk is not None:
        cw = crosswalk[["kode_pemda", "panel_seimbang"]].astype({"kode_pemda": df["kode_pemda"].dtype})
        df = df.merge(cw, on="kode_pemda", how="left", validate="m:1")
    return df.sort_values(["tahun", "kode_pemda", "kode_fungsi"]).reset_index(drop=True)


def run(fakta: pd.DataFrame, crosswalk: pd.DataFrame, out_dir: Path) -> pd.DataFrame:
    share = hitung_share(fakta, crosswalk)
    write_parquet(share, out_dir / OUTPUT)
    return share
