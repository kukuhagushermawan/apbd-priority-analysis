"""Tahap 2 — standardisasi: semua tahun -> skema baku identik.

Keluaran fungsi_standar: satu baris per tahun x pemda x fungsi x jenis dengan
kolom skema_baku.fungsi_long di schema_map.yaml.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from pipeline.crosswalk import kode_baku
from pipeline.readers import petakan_label
from pipeline.storage import write_parquet

SUBDIR = "02_standar"
OUTPUTS = {
    "fungsi": f"{SUBDIR}/fungsi_standar.parquet",
    "ringkas": f"{SUBDIR}/ringkas_standar.parquet",
    "fungsi_long": f"{SUBDIR}/fungsi_long_standar.parquet",
}

DTYPES_FUNGSI = {
    "tahun": "int16",
    "kode_pemda": "string",
    "nama_pemda": "string",
    "tingkat": "string",
    "provinsi_induk": "string",
    "kode_fungsi": "string",
    "nama_fungsi": "string",
    "kode_jenis": "string",
    "nilai_anggaran": "float64",
}
DTYPES_RINGKAS = {
    "tahun": "int16",
    "kode_pemda": "string",
    "nama_pemda": "string",
    "tingkat": "string",
    "provinsi_induk": "string",
    "kode_akun": "string",
    "nama_akun": "string",
    "nilai_anggaran": "float64",
}


def _peta_label(labels: pd.Series, kamus: dict) -> pd.Series:
    peta = {lab: petakan_label(lab, kamus) for lab in labels.unique()}
    return labels.map(peta)


def _pasang_pemda(df: pd.DataFrame, sm: dict, crosswalk: pd.DataFrame) -> pd.DataFrame:
    """Kode asli -> kode baku, provinsi induk per tahun, nama kanonik, tingkat."""
    df = df.assign(
        provinsi_induk=df["kode_pemda"].str[:2] + ".00",  # dari kode asli tahun tsb
        kode_pemda=kode_baku(df["kode_pemda"], df["tahun"], sm),
    ).drop(columns="nama_pemda")
    tak_dikenal = sorted(set(df["kode_pemda"]) - set(crosswalk["kode_pemda"]))
    if tak_dikenal:
        raise ValueError(f"Kode pemda tidak ada di crosswalk: {tak_dikenal}. Jalankan python -m pipeline.crosswalk")
    return df.merge(crosswalk[["kode_pemda", "nama_pemda", "tingkat"]], on="kode_pemda", how="left", validate="m:1")


def standardisasi_fungsi(raw: pd.DataFrame, sm: dict, crosswalk: pd.DataFrame) -> pd.DataFrame:
    kamus = sm["fungsi_baku"]
    df = raw.assign(
        kode_fungsi=_peta_label(raw["label_fungsi"], kamus),
        kode_jenis=_peta_label(raw["label_jenis"], sm["jenis_belanja_fungsi"]),
        nilai_anggaran=raw["nilai_anggaran"].fillna(0.0),
    )
    nonaktif = sorted(set(df["kode_fungsi"]) - {k for k, v in kamus.items() if v["aktif"]})
    if nonaktif:
        raise ValueError(f"Fungsi nonaktif muncul di data: {nonaktif}; tinjau kamus fungsi")
    df["nama_fungsi"] = df["kode_fungsi"].map({k: v["nama"] for k, v in kamus.items()})
    df = _pasang_pemda(df, sm, crosswalk)
    df = df[list(DTYPES_FUNGSI)].astype(DTYPES_FUNGSI)
    return df.sort_values(["tahun", "kode_pemda", "kode_fungsi", "kode_jenis"]).reset_index(drop=True)


def standardisasi_ringkas(raw: pd.DataFrame, sm: dict, crosswalk: pd.DataFrame) -> pd.DataFrame:
    df = raw.assign(nilai_anggaran=raw["nilai_anggaran"].fillna(0.0))
    df = _pasang_pemda(df, sm, crosswalk)
    df = df[list(DTYPES_RINGKAS)].astype(DTYPES_RINGKAS)
    return df.sort_values(["tahun", "kode_pemda", "kode_akun"]).reset_index(drop=True)


def standardisasi_fungsi_long(raw: pd.DataFrame, sm: dict) -> pd.DataFrame:
    """Sheet Datarow (2023+) dipetakan ke kode baku; hanya untuk cek silang."""
    df = raw.assign(
        kode_fungsi=_peta_label(raw["fungsi"], sm["fungsi_baku"]),
        kode_jenis=_peta_label(raw["jenis"], sm["jenis_belanja_fungsi"]),
        kode_pemda=kode_baku(raw["kode_pemda"], raw["tahun"], sm),
        nilai_anggaran=raw["nilai_anggaran"].fillna(0.0),
    )
    # 2025 memuat kunci ganda yang harus dijumlah (lihat schema_map)
    return (
        df.groupby(["tahun", "kode_pemda", "kode_fungsi", "kode_jenis"], as_index=False)["nilai_anggaran"].sum().astype({"tahun": "int16"})
    )


def run(raw: dict[str, pd.DataFrame], sm: dict, crosswalk: pd.DataFrame, out_dir: Path) -> dict[str, pd.DataFrame]:
    hasil = {
        "fungsi": standardisasi_fungsi(raw["fungsi"], sm, crosswalk),
        "ringkas": standardisasi_ringkas(raw["ringkas"], sm, crosswalk),
        "fungsi_long": standardisasi_fungsi_long(raw["fungsi_long"], sm),
    }
    for key, rel in OUTPUTS.items():
        write_parquet(hasil[key], out_dir / rel)
    return hasil
