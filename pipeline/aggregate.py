"""Tahap 3 — agregasi: satu baris per tahun x pemda x fungsi.

Rincian jenis belanja (51-54) dipertahankan sebagai kolom agar halaman Profil
Daerah dapat menampilkan nominal per jenis tanpa membaca ulang data standar.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from pipeline.storage import write_parquet

OUTPUT = "03_agregat/fakta_anggaran.parquet"
KUNCI = ["tahun", "kode_pemda", "nama_pemda", "tingkat", "provinsi_induk", "kode_fungsi", "nama_fungsi"]
KOLOM_JENIS = {"51": "nilai_pegawai", "52": "nilai_barang_jasa", "53": "nilai_modal", "54": "nilai_lainnya"}


def agregasi(fungsi_standar: pd.DataFrame) -> pd.DataFrame:
    jenis = (
        fungsi_standar.pivot_table(index=KUNCI, columns="kode_jenis", values="nilai_anggaran", aggfunc="sum", fill_value=0.0)
        .rename(columns=KOLOM_JENIS)
        .reindex(columns=list(KOLOM_JENIS.values()), fill_value=0.0)
    )
    jenis.columns.name = None
    out = jenis.reset_index()
    out.insert(len(KUNCI), "nilai_anggaran", out[list(KOLOM_JENIS.values())].sum(axis=1))
    return out.sort_values(["tahun", "kode_pemda", "kode_fungsi"]).reset_index(drop=True)


def run(fungsi_standar: pd.DataFrame, out_dir: Path) -> pd.DataFrame:
    fakta = agregasi(fungsi_standar)
    write_parquet(fakta, out_dir / OUTPUT)
    return fakta
