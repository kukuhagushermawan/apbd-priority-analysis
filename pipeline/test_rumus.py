"""Uji rumus inti. Jalankan: python -m pytest pipeline"""

import numpy as np
import pandas as pd
import pytest

from pipeline.langkah1_bersihkan import RAW, kode_baku, kode_fungsi, status_selisih
from pipeline.langkah2_analisis import clr, clr_balik, hitung_ips, hitung_share_delta, kemiringan, z_robust
from pipeline.langkah3_prediksi import pilih_model, ramal


def fakta_contoh():
    """Satu kabupaten, 3 fungsi, 3 tahun."""
    share = {2023: [0.5, 0.3, 0.2], 2024: [0.4, 0.4, 0.2], 2025: [0.3, 0.5, 0.2]}
    rows = [[t, "01.01", "kabupaten", f, s] for t, v in share.items() for f, s in zip(["01", "07", "10"], v, strict=True)]
    return pd.DataFrame(rows, columns=["tahun", "kode_pemda", "tingkat", "kode_fungsi", "share_belanja"])


# --- langkah 1 -----------------------------------------------------------------
def test_kode_fungsi_format_2022_dan_2023():
    assert kode_fungsi("1. Pelayanan Umum") == "01"
    assert kode_fungsi("5. Lingkungan Hidup") == "05"
    assert kode_fungsi("05. Perlindungan Lingkungan Hidup") == "05"
    assert kode_fungsi("03. Ketertiban Dan Keamanan") == "03"
    with pytest.raises(ValueError):
        kode_fungsi("01. Pendidikan")


def test_kode_baku_papua_hanya_untuk_2022():
    kode = pd.Series(["26.04", "01.01"])
    assert kode_baku(kode, 2022).tolist() == ["35.01", "01.01"]
    assert kode_baku(kode, 2023).tolist() == ["26.04", "01.01"]


def test_status_validasi():
    assert status_selisih(5_000, 9.0) == "LULUS"  # di bawah Rp10.000
    assert status_selisih(1e9, 0.01) == "LULUS"
    assert status_selisih(1e9, 0.3) == "PERINGATAN"
    assert status_selisih(1e9, 0.6) == "GAGAL"


# --- langkah 2 -----------------------------------------------------------------
def test_delta_share_dalam_poin_persentase():
    d = hitung_share_delta(fakta_contoh()).set_index(["tahun", "kode_fungsi"])["delta_pp"]
    assert np.isnan(d[(2023, "01")])
    assert d[(2024, "01")] == pytest.approx(-10.0)
    assert d[(2024, "07")] == pytest.approx(10.0)


def test_ips_setengah_jumlah_mutlak_delta():
    ips = hitung_ips(hitung_share_delta(fakta_contoh())).set_index("tahun")["ips_pp"]
    assert ips[2024] == pytest.approx(10.0)  # ½ x (10 + 10 + 0)


def test_kemiringan_regresi_linear():
    tabel = pd.DataFrame([[50.0, 40.0, 30.0], [1.0, 1.0, 1.0]], columns=[2023, 2024, 2025])
    assert kemiringan(tabel).tolist() == pytest.approx([-10.0, 0.0])


def test_z_robust():
    z = z_robust(pd.Series([1.0, 2.0, 3.0, 4.0, 100.0]))
    assert z.iloc[2] == 0.0 and z.iloc[-1] > 3


def test_clr_jumlah_nol_dan_bisa_dibalik():
    share = pd.DataFrame([[0.5, 0.3, 0.2], [0.6, 0.4, 0.0]])
    z = clr(share)
    assert z.sum(axis=1).tolist() == pytest.approx([0.0, 0.0])
    assert clr_balik(z).iloc[0].tolist() == pytest.approx([0.5, 0.3, 0.2])
    assert clr_balik(z).sum(axis=1).tolist() == pytest.approx([1.0, 1.0])  # share nol tetap aman


# --- langkah 3 -----------------------------------------------------------------
def test_ramal_tren_linear_tepat_untuk_data_linear_dan_naif_tidak():
    f = fakta_contoh()
    share = f.pivot_table(index=["tahun", "kode_pemda"], columns="kode_fungsi", values="share_belanja")
    z = clr(share)
    tingkat = pd.Series({"01.01": "kabupaten"})
    # data yang linear sempurna di ruang CLR: tren_linear harus menebak 2025 tanpa galat
    z_linear = pd.concat({t: z.xs(2023) + (t - 2023) * (z.xs(2024) - z.xs(2023)) for t in [2023, 2024, 2025]}, names=["tahun"])
    aktual = clr_balik(z_linear.xs(2025)) * 100
    pred_tren = ramal(z_linear, [2023, 2024], 2025, "tren_linear", tingkat)
    pred_naif = ramal(z_linear, [2023, 2024], 2025, "naif", tingkat)
    assert (pred_tren - aktual).abs().max().max() < 1e-9
    assert (pred_naif - aktual).abs().mean().mean() > 1  # MAE naif > 1 pp
    assert pred_tren.sum(axis=1).iloc[0] == pytest.approx(100.0)


def test_pilih_model_jujur_bila_baseline_menang():
    m = pd.DataFrame(
        {
            "tingkat": ["kota"] * 4 + ["kabupaten"] * 4,
            "periode": ["-", "2023-2026"] * 4,
            "model": ["naif", "tren_kelompok"] * 4,
            "tahun_uji": [2025, 2025, 2026, 2026] * 2,
            "kode_fungsi": "SEMUA",
            "mae_pp": [1.0, 1.2, 1.0, 1.2, 1.5, 1.3, 1.5, 1.3],
        }
    )
    pilih = pilih_model(m)
    assert pilih.loc["kota", "model"] == "naif" and not pilih.loc["kota", "mengalahkan_baseline"]
    assert pilih.loc["kabupaten", "model"] == "tren_kelompok" and pilih.loc["kabupaten", "mengalahkan_baseline"]


# --- data asli (dilewati bila data/raw kosong) ---------------------------------
@pytest.mark.skipif(not any(RAW.glob("*/*.xlsx")), reason="data/raw kosong")
def test_semua_tahun_berformat_sama_dan_lulus_validasi():
    from pipeline.langkah1_bersihkan import bersihkan, validasi

    df, ringkas, jumlah = bersihkan()
    n_pemda = df.groupby("tahun")["kode_pemda"].nunique()
    assert n_pemda.to_dict() == {2022: 542, 2023: 546, 2024: 546, 2025: 546, 2026: 546}
    assert (df.groupby(["tahun", "kode_pemda"])["kode_fungsi"].nunique() == 9).all()  # tanpa Pertahanan & Agama
    assert not df.isna().any().any()
    assert (df.groupby(["tahun", "kode_pemda"])["share_belanja"].sum() - 1).abs().max() < 1e-9
    assert (validasi(df, ringkas, jumlah)["status"] == "LULUS").all()
