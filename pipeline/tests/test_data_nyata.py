"""Uji atas data DJPK asli: semua tahun harus menghasilkan skema identik."""

from __future__ import annotations

import pandas as pd

from pipeline.run import jalankan
from pipeline.standardize import DTYPES_FUNGSI
from pipeline.storage import hash_files

TAHUN = [2022, 2023, 2024, 2025, 2026]


def test_skema_dan_tipe_identik_semua_tahun(hasil):
    std = hasil["standar"]["fungsi"]
    assert sorted(std["tahun"].unique()) == TAHUN
    for tahun, g in std.groupby("tahun"):
        assert list(g.columns) == list(DTYPES_FUNGSI), tahun
        assert {c: str(t) for c, t in g.dtypes.items()} == DTYPES_FUNGSI, tahun
        assert not g.isna().any().any(), tahun


def test_jumlah_fungsi_dan_jenis_sama_semua_tahun(hasil, sm):
    aktif = sorted(k for k, v in sm["fungsi_baku"].items() if v["aktif"])
    std = hasil["standar"]["fungsi"]
    for tahun, g in std.groupby("tahun"):
        assert sorted(g["kode_fungsi"].unique()) == aktif, tahun
        assert sorted(g["kode_jenis"].unique()) == ["51", "52", "53", "54"], tahun
    per_pemda = hasil["fakta"].groupby(["tahun", "kode_pemda"])["kode_fungsi"].nunique()
    assert (per_pemda == len(aktif)).all()


def test_pertahanan_dan_agama_tidak_ada(hasil):
    assert not hasil["fakta"]["kode_fungsi"].isin(["02", "09"]).any()


def test_cakupan_pemda_dan_pemekaran_papua(hasil):
    fakta = hasil["fakta"]
    n = fakta.groupby("tahun")["kode_pemda"].nunique()
    assert n[2022] == 542 and (n.loc[2023:] == 546).all()
    f22 = fakta[fakta["tahun"] == 2022]
    assert not f22["kode_pemda"].isin(["26.04", "32.04"]).any()  # kode lama sudah dipetakan
    merauke = fakta[fakta["kode_pemda"] == "35.01"].drop_duplicates("tahun").set_index("tahun")
    assert merauke.loc[2022, "provinsi_induk"] == "26.00"
    assert merauke.loc[2023, "provinsi_induk"] == "35.00"
    assert len(merauke) == 5


def test_penanda_panel_tidak_seimbang(hasil):
    flag = hasil["share"].drop_duplicates("kode_pemda").set_index("kode_pemda")["panel_seimbang"]
    assert sorted(flag[~flag].index) == ["26.00", "32.00", "35.00", "36.00", "37.00", "38.00"]


def test_share_berjumlah_satu(hasil):
    s = hasil["share"].groupby(["tahun", "kode_pemda"])["share_belanja"].sum()
    assert (s - 1).abs().max() < 1e-9
    assert hasil["share"]["share_belanja"].between(0, 1).all()


def test_validasi_tanpa_gagal(hasil):
    log = hasil["log_validasi"]
    assert (log["status"] == "GAGAL").sum() == 0
    tot = log[log["pemeriksaan"] == "total_fungsi_vs_ringkas"]
    assert len(tot) == 542 + 4 * 546
    assert (tot["status"] == "LULUS").all()


def test_idempoten(hasil, out_dir):
    files = sorted(p for p in out_dir.rglob("*.parquet") if "05_validasi" not in p.parts)
    sebelum = hash_files(files)
    ulang = jalankan(out_dir=out_dir, force=True, verbose=False)
    assert hash_files(files) == sebelum
    pd.testing.assert_frame_equal(ulang["share"], hasil["share"])
