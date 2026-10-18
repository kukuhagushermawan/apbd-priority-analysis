"""Uji unit dengan fixture kecil buatan (tanpa data asli)."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from pipeline.aggregate import agregasi
from pipeline.crosswalk import kode_baku, tingkat_dari
from pipeline.readers import normalisasi_kode_akun, petakan_label, split_label
from pipeline.share import hitung_share
from pipeline.validate import cek_total_vs_ringkas, penyebab_total, status_selisih


# --- label & kode ------------------------------------------------------------
def test_split_label_membuang_indentasi_dan_spasi_ganda():
    assert split_label("          41. Pendapatan  Asli Daerah (PAD)") == ("41", "Pendapatan Asli Daerah (PAD)")


@pytest.mark.parametrize(
    "label,kode",
    [
        ("1. Pelayanan Umum", "01"),  # format 2022
        ("01. Pelayanan Umum", "01"),
        ("5. Lingkungan Hidup", "05"),  # nama 2022
        ("05. Perlindungan Lingkungan Hidup", "05"),
        ("03. Ketertiban Dan Keamanan", "03"),  # beda kapitalisasi 2026
        ("03. Ketertiban dan Keamanan", "03"),
    ],
)
def test_petakan_label_fungsi_semua_varian_tahun(sm, label, kode):
    assert petakan_label(label, sm["fungsi_baku"]) == kode


def test_petakan_label_jenis_2022(sm):
    assert petakan_label("52. Belanja Barang Jasa", sm["jenis_belanja_fungsi"]) == "52"


def test_petakan_label_menolak_nama_yang_tak_cocok(sm):
    with pytest.raises(ValueError):
        petakan_label("01. Pendidikan", sm["fungsi_baku"])


@pytest.mark.parametrize(
    "kode,skema,hasil", [("511", "3digit", "5101"), ("624", "3digit", "6204"), ("51", "3digit", "51"), ("5101", "4digit", "5101")]
)
def test_normalisasi_kode_akun(kode, skema, hasil):
    assert normalisasi_kode_akun(kode, skema) == hasil


def test_kode_baku_hanya_berlaku_sebelum_pemekaran(sm):
    kode = pd.Series(["26.04", "26.04", "01.01"])
    tahun = pd.Series([2022, 2023, 2022])
    assert kode_baku(kode, tahun, sm).tolist() == ["35.01", "26.04", "01.01"]


def test_tingkat_dari():
    assert tingkat_dari("11.00", "Provinsi Jawa Tengah") == "provinsi"
    assert tingkat_dari("11.01", "Kab. Banjarnegara") == "kabupaten"
    assert tingkat_dari("11.30", "Kota Semarang") == "kota"


# --- agregasi & share --------------------------------------------------------
def _fakta_kecil():
    rows = []
    for tahun, nilai in [(2022, {"01": 60.0, "10": 30.0, "07": 10.0}), (2023, {"01": 50.0, "10": 50.0, "07": 0.0})]:
        for f, v in nilai.items():
            rows.append([tahun, "01.01", "Kab. A", "kabupaten", "01.00", f, f"F{f}", v])
    return pd.DataFrame(
        rows, columns=["tahun", "kode_pemda", "nama_pemda", "tingkat", "provinsi_induk", "kode_fungsi", "nama_fungsi", "nilai_anggaran"]
    )


def test_hitung_share_rumus_dan_jumlah_satu():
    sh = hitung_share(_fakta_kecil()).set_index(["tahun", "kode_fungsi"])["share_belanja"]
    assert sh[(2022, "01")] == pytest.approx(0.6)
    assert sh[(2022, "07")] == pytest.approx(0.1)
    assert sh[(2023, "07")] == 0.0
    assert sh.groupby(level=0).sum().tolist() == pytest.approx([1.0, 1.0])


def test_hitung_share_menolak_total_nol():
    f = _fakta_kecil()
    f.loc[f["tahun"] == 2023, "nilai_anggaran"] = 0.0
    with pytest.raises(ValueError, match="Total belanja"):
        hitung_share(f)


def test_agregasi_menjumlah_jenis():
    std = pd.DataFrame(
        {
            "tahun": [2024] * 4,
            "kode_pemda": ["01.01"] * 4,
            "nama_pemda": ["Kab. A"] * 4,
            "tingkat": ["kabupaten"] * 4,
            "provinsi_induk": ["01.00"] * 4,
            "kode_fungsi": ["10"] * 4,
            "nama_fungsi": ["Pendidikan"] * 4,
            "kode_jenis": ["51", "52", "53", "54"],
            "nilai_anggaran": [100.0, 20.0, 5.0, 0.0],
        }
    )
    out = agregasi(std).iloc[0]
    assert out["nilai_anggaran"] == 125.0
    assert (out["nilai_pegawai"], out["nilai_barang_jasa"], out["nilai_modal"], out["nilai_lainnya"]) == (100.0, 20.0, 5.0, 0.0)


# --- validasi ----------------------------------------------------------------
@pytest.mark.parametrize(
    "rp,pct,status",
    [
        (0, 0, "LULUS"),
        (9_999, 5.0, "LULUS"),  # lolos lewat ambang absolut Rp10.000
        (5e8, 0.01, "LULUS"),  # tepat di ambang 0,01%
        (5e8, 0.3, "PERINGATAN"),
        (5e8, 0.5, "PERINGATAN"),
        (5e8, 0.51, "GAGAL"),
    ],
)
def test_status_selisih_ambang_disetujui(sm, rp, pct, status):
    assert status_selisih(rp, pct, sm["validasi"]) == status


def test_penyebab_beda_satuan_dan_fungsi_hilang():
    nf = pd.Series({"01": 600.0, "10": 300.0, "07": 100.0})
    assert "satuan" in penyebab_total(1_000.0, 1_000_000.0, nf, "GAGAL")
    assert "07" in penyebab_total(900.0, 1_000.0, pd.Series({"01": 600.0, "10": 300.0, "07": 100.0}), "GAGAL")
    assert penyebab_total(np.nan, 1.0, nf, "GAGAL") == "pemda tidak ada di berkas Fungsi"


def test_cek_total_vs_ringkas_menandai_selisih(sm):
    fakta = _fakta_kecil()
    ringkas = pd.DataFrame(
        {"tahun": [2022, 2023], "kode_pemda": ["01.01", "01.01"], "kode_akun": ["5", "5"], "nilai_anggaran": [100.0, 110.0]}
    )
    log = cek_total_vs_ringkas(fakta, ringkas, sm).set_index("tahun")
    assert log.loc[2022, "status"] == "LULUS"
    # selisih Rp10 < ambang absolut Rp10.000 -> tetap LULUS walau 9%
    assert log.loc[2023, "status"] == "LULUS"
    ringkas.loc[1, "nilai_anggaran"] = 1e9
    log = cek_total_vs_ringkas(fakta, ringkas, sm).set_index("tahun")
    assert log.loc[2023, "status"] == "GAGAL"
