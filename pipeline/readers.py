"""Pembaca berkas xlsx DJPK mentah, dikendalikan oleh config/schema_map.yaml.

Semua fungsi di sini hanya membaca; berkas di data/raw tidak pernah diubah.
"""

from __future__ import annotations

import re
from pathlib import Path

import pandas as pd
import yaml

PIPELINE_DIR = Path(__file__).resolve().parent
REPO_ROOT = PIPELINE_DIR.parent
RAW_DIR = REPO_ROOT / "data" / "raw"
SCHEMA_MAP_PATH = PIPELINE_DIR / "config" / "schema_map.yaml"

KODE_PEMDA_RE = re.compile(r"^\d{2}\.\d{2}$")
LABEL_RE = re.compile(r"^\s*(\d+)\.\s*(.*?)\s*$")


def load_schema_map(path: Path = SCHEMA_MAP_PATH) -> dict:
    with open(path, encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def norm_text(value) -> str:
    """Trim, satukan spasi ganda, casefold."""
    return re.sub(r"\s+", " ", str(value)).strip().casefold()


def split_label(label) -> tuple[str, str]:
    """'  01. Pelayanan Umum' -> ('01', 'Pelayanan Umum'). Kode tanpa padding."""
    m = LABEL_RE.match(re.sub(r"\s+", " ", str(label)))
    if not m:
        raise ValueError(f"Label tanpa kode numerik: {label!r}")
    return m.group(1), m.group(2)


def petakan_label(label, kamus: dict) -> str:
    """Label mentah ('1. Pelayanan Umum') -> kode baku ('01'), dicek via alias."""
    kode, nama = split_label(label)
    kode = f"{int(kode):02d}"
    entri = kamus.get(kode)
    if entri is None or norm_text(nama) not in {norm_text(a) for a in entri["alias"]}:
        raise ValueError(f"Label {label!r} tidak cocok dengan kamus")
    return kode


def col_index(letter: str) -> int:
    """Huruf kolom Excel -> indeks 0-based ('A' -> 0, 'AL' -> 37)."""
    idx = 0
    for ch in letter.upper():
        idx = idx * 26 + (ord(ch) - 64)
    return idx - 1


def normalisasi_kode_akun(kode: str, skema: str) -> str:
    """Skema 3 digit 2022 ('511') -> 4 digit ('5101'). Kode 1-2 digit tetap."""
    if skema == "3digit" and len(kode) == 3:
        return kode[:2] + "0" + kode[2]
    return kode


def _read_raw(path: Path, sheet: str) -> pd.DataFrame:
    # dtype=object menjaga kode "01.10" sebagai teks (tanpa itu pandas -> 1.1)
    return pd.read_excel(path, sheet_name=sheet, header=None, dtype=object)


def baca_metadata_fungsi(year: int, cfg: dict, raw_dir: Path = RAW_DIR) -> dict:
    raw = _read_raw(raw_dir / cfg["berkas"], cfg["sheet"])
    jumlah = str(raw.iat[cfg["baris_jumlah_daerah"] - 1, 0])
    m = re.search(r"(\d+)", jumlah)
    return {
        "tahun": year,
        "judul": str(raw.iat[cfg["baris_judul"] - 1, 0]),
        "tanggal_data": str(raw.iat[cfg["baris_tanggal"] - 1, 0]),
        "jumlah_daerah_tertulis": int(m.group(1)) if m else None,
    }


def baca_fungsi_wide(year: int, cfg: dict, raw_dir: Path = RAW_DIR) -> pd.DataFrame:
    """Sheet 'Fungsi' (wide) -> long: tahun, kode_pemda, nama_pemda,
    label_fungsi, label_jenis, nilai_anggaran (mentah, belum dipetakan)."""
    raw = _read_raw(raw_dir / cfg["berkas"], cfg["sheet"])
    hdr_f = raw.iloc[cfg["baris_header_fungsi"] - 1].ffill()  # sel gabungan 4 kolom
    hdr_j = raw.iloc[cfg["baris_header_jenis"] - 1]
    ck, cn = col_index(cfg["kolom_kode"]), col_index(cfg["kolom_nama"])

    got = (norm_text(hdr_f[ck]), norm_text(hdr_f[cn]))
    want = (norm_text(cfg["header_kode"]), norm_text(cfg["header_nama"]))
    if got != want:
        raise ValueError(f"{year}: header kode/nama {got} != {want}")

    data = raw.iloc[cfg["baris_data_mulai"] - 1 :]
    data = data[data[ck].map(lambda v: isinstance(v, str) and bool(KODE_PEMDA_RE.match(v.strip())))]
    nilai_cols = range(col_index(cfg["kolom_nilai_mulai"]), raw.shape[1])
    frames = [
        pd.DataFrame(
            {
                "kode_pemda": data[ck].str.strip().values,
                "nama_pemda": data[cn].astype(str).str.strip().values,
                "label_fungsi": hdr_f[c],
                "label_jenis": hdr_j[c],
                "nilai_anggaran": pd.to_numeric(data[c], errors="coerce").values * cfg["faktor_satuan"],
            }
        )
        for c in nilai_cols
        if pd.notna(hdr_j[c])
    ]
    out = pd.concat(frames, ignore_index=True)
    out.insert(0, "tahun", year)
    return out


def baca_fungsi_long(year: int, cfg: dict, raw_dir: Path = RAW_DIR) -> pd.DataFrame | None:
    """Sheet 'Datarow' (long) untuk cek silang; None bila tidak tersedia (2022)."""
    long_cfg = cfg.get("cek_silang_long")
    if not long_cfg:
        return None
    df = pd.read_excel(raw_dir / cfg["berkas"], sheet_name=long_cfg["sheet"], dtype=object)
    missing = set(long_cfg["kolom"]) - set(df.columns)
    if missing:
        raise ValueError(f"{year}: kolom long hilang {missing}")
    df = df.rename(columns=long_cfg["kolom"])[list(long_cfg["kolom"].values())].dropna(how="all")
    df["kode_pemda"] = df["kode_pemda"].astype(str).str.strip()
    df["nilai_anggaran"] = pd.to_numeric(df["nilai_anggaran"], errors="coerce") * cfg["faktor_satuan"]
    df.insert(0, "tahun", year)
    return df


def baca_ringkas_wide(year: int, cfg: dict, raw_dir: Path = RAW_DIR) -> pd.DataFrame:
    """Sheet Ringkasan (akun x pemda) -> long: tahun, kode_pemda, nama_pemda,
    kode_akun (4 digit), nama_akun, nilai_anggaran."""
    raw = _read_raw(raw_dir / cfg["berkas"], cfg["sheet"])
    kode_row = raw.iloc[cfg["baris_kode_pemda"] - 1]
    nama_row = raw.iloc[cfg["baris_nama_pemda"] - 1]
    ca = col_index(cfg["kolom_akun"])
    dibuang = {norm_text(x) for x in cfg.get("kolom_dibuang", [])}

    pemda_cols, lain = [], []
    for c in range(raw.shape[1]):
        v = kode_row[c]
        if c == ca or pd.isna(v):
            continue
        if isinstance(v, str) and KODE_PEMDA_RE.match(v.strip()):
            pemda_cols.append(c)
        elif norm_text(v) not in dibuang:
            lain.append(v)
    if lain:
        raise ValueError(f"{year}: kolom header Ringkasan tak dikenal {lain}")

    frames = []
    for r in range(cfg["baris_data_mulai"] - 1, raw.shape[0]):
        label = raw.iat[r, ca]
        if pd.isna(label):
            continue
        kode, nama = split_label(label)
        frames.append(
            pd.DataFrame(
                {
                    "kode_pemda": [str(kode_row[c]).strip() for c in pemda_cols],
                    "nama_pemda": [str(nama_row[c]).strip() for c in pemda_cols],
                    "kode_akun": normalisasi_kode_akun(kode, cfg["skema_kode_akun"]),
                    "nama_akun": nama,
                    "nilai_anggaran": pd.to_numeric(raw.iloc[r, pemda_cols], errors="coerce").values * cfg["faktor_satuan"],
                }
            )
        )
    out = pd.concat(frames, ignore_index=True)
    out.insert(0, "tahun", year)
    return out
