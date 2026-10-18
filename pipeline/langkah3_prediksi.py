"""Langkah 3 — proyeksi eksploratif share belanja 2027-2028.

Jalankan: python -m pipeline.langkah3_prediksi   (butuh hasil langkah 1)

Cara kerja:
  1. Share tiap pemda diubah ke ruang CLR, supaya hasil proyeksi bisa
     dikembalikan menjadi share yang tetap berjumlah 100%.
  2. Empat model per pemda x fungsi:
       naif          share tahun depan = share tahun terakhir (baseline)
       tren_linear   garis regresi linear diteruskan
       tren_diredam  tren linear yang makin melemah (redaman 0,5 per tahun)
       tren_kelompok share terakhir + kemiringan median pemda setingkat
                     (meminjam pola bersama, lebih tahan terhadap noise)
  3. Backtest bergulir: latih s.d. t-1, tebak t, untuk t = 2024, 2025, 2026.
     Model dan periode latih (2022-2026 atau 2023-2026) terbaik dipilih
     otomatis per tingkat pemda berdasarkan MAE (pp) pada 2025-2026.
  4. Rentang ketidakpastian = persentil 80 kesalahan backtest, melebar
     sebanding akar horizon (2028 lebih lebar dari 2027).

Keluaran (data/processed/):
  proyeksi.parquet         share proyeksi + batas bawah/atas per pemda x fungsi
  metrik_backtest.parquet  MAE & MAPE tiap model, periode, tingkat, fungsi
"""

import sys

import numpy as np
import pandas as pd

from pipeline.langkah1_bersihkan import OUT
from pipeline.langkah2_analisis import PERIODE, clr, clr_balik

MODEL = ["naif", "tren_linear", "tren_diredam", "tren_kelompok"]
REDAMAN = 0.5
TAHUN_UJI = [2024, 2025, 2026]
TAHUN_PILIH = [2025, 2026]  # tahun uji yang bisa dipakai semua kombinasi model-periode
TAHUN_PROYEKSI = [2027, 2028]


def ramal(z: pd.DataFrame, tahun_latih: list[int], tahun_target: int, model: str, tingkat: pd.Series) -> pd.DataFrame:
    """z: CLR dengan index (tahun, kode_pemda), kolom fungsi. Hasil: share (%) per pemda."""
    y = np.stack([z.xs(t).reindex(z.index.unique("kode_pemda")).to_numpy() for t in tahun_latih])  # tahun x pemda x fungsi
    ada = ~np.isnan(y)
    t = np.array(tahun_latih, dtype=float)[:, None, None] * ada
    n = ada.sum(axis=0)
    terakhir = y[-1]  # share tahun latih terakhir (semua pemda ada sejak 2023)

    if model == "naif" or len(tahun_latih) < 2:
        pred = terakhir
    else:
        t_rata = t.sum(axis=0) / n
        y_rata = np.nansum(y, axis=0) / n
        dt = np.where(ada, t - t_rata, 0.0)
        slope = np.nansum(dt * np.nan_to_num(y - y_rata), axis=0) / np.maximum((dt**2).sum(axis=0), 1e-12)
        slope = np.where(n >= 2, slope, 0.0)  # pemda dengan 1 titik data -> tanpa tren
        h = tahun_target - max(tahun_latih)
        if model == "tren_linear":
            pred = y_rata + slope * (tahun_target - t_rata)
            pred = np.where(n >= 2, pred, terakhir)
        elif model == "tren_diredam":  # mulai dari nilai terakhir, kenaikan makin kecil tiap tahun
            pred = terakhir + slope * sum(REDAMAN**i for i in range(1, h + 1))
        else:  # tren_kelompok: kemiringan median pemda setingkat
            grup = tingkat.reindex(z.index.unique("kode_pemda")).to_numpy()
            slope_grup = np.zeros_like(slope)
            for g in np.unique(grup):
                pilih = (grup == g) & (n.min(axis=1) >= 2)
                slope_grup[grup == g] = np.median(slope[pilih], axis=0)
            pred = terakhir + slope_grup * h

    hasil = pd.DataFrame(pred, index=z.index.unique("kode_pemda"), columns=z.columns).dropna()
    return clr_balik(hasil) * 100


def backtest(share: pd.DataFrame, z: pd.DataFrame, tingkat: pd.Series) -> pd.DataFrame:
    """Kesalahan (pp) setiap pemda x fungsi untuk setiap model, periode, tahun uji."""
    hasil = []
    for nama_periode, awal in PERIODE.items():
        for tahun_uji in TAHUN_UJI:
            tahun_latih = list(range(awal, tahun_uji))
            for model in MODEL:
                if model != "naif" and len(tahun_latih) < 2:
                    continue  # tren butuh minimal 2 titik
                if model == "naif" and nama_periode != "2022-2026":
                    continue  # baseline naif tidak bergantung periode latih
                pred = ramal(z, tahun_latih, tahun_uji, model, tingkat)
                aktual = share.xs(tahun_uji).reindex(pred.index)
                err = (pred - aktual).stack().rename("galat_pp").reset_index()
                err["aktual_pct"] = aktual.stack().values
                err[["periode", "model", "tahun_uji"]] = [nama_periode if model != "naif" else "-", model, tahun_uji]
                hasil.append(err)
    df = pd.concat(hasil, ignore_index=True)
    df["tingkat"] = df["kode_pemda"].map(tingkat)
    return df


def ringkas_metrik(galat: pd.DataFrame) -> pd.DataFrame:
    """MAE (pp) dan MAPE (%) per tingkat x periode x model x tahun uji x fungsi (+ 'SEMUA')."""

    def agregat(g):
        besar = g["aktual_pct"] >= 0.1  # MAPE hanya untuk share >= 0,1% agar tidak meledak
        mape = (g.loc[besar, "galat_pp"].abs() / g.loc[besar, "aktual_pct"]).mean() * 100
        return pd.Series({"mae_pp": g["galat_pp"].abs().mean(), "mape_pct": mape, "n": len(g)})

    kunci = ["tingkat", "periode", "model", "tahun_uji"]
    per_fungsi = galat.groupby(kunci + ["kode_fungsi"]).apply(agregat, include_groups=False).reset_index()
    semua = galat.groupby(kunci).apply(agregat, include_groups=False).reset_index().assign(kode_fungsi="SEMUA")
    return pd.concat([semua, per_fungsi], ignore_index=True)


def pilih_model(metrik: pd.DataFrame) -> pd.DataFrame:
    m = metrik[(metrik["kode_fungsi"] == "SEMUA") & metrik["tahun_uji"].isin(TAHUN_PILIH)]
    rata = m.groupby(["tingkat", "periode", "model"])["mae_pp"].mean().reset_index()
    terbaik = rata.loc[rata.groupby("tingkat")["mae_pp"].idxmin()].set_index("tingkat")
    naif = rata[rata["model"] == "naif"].set_index("tingkat")["mae_pp"]
    terbaik["mae_naif_pp"] = naif
    terbaik["mengalahkan_baseline"] = terbaik["model"] != "naif"
    return terbaik


def main() -> int:
    fakta = pd.read_parquet(OUT / "fakta_anggaran.parquet")
    share = fakta.pivot_table(index=["tahun", "kode_pemda"], columns="kode_fungsi", values="share_belanja") * 100
    z = clr(share / 100)
    tingkat = fakta.drop_duplicates("kode_pemda").set_index("kode_pemda")["tingkat"]

    galat = backtest(share, z, tingkat)
    metrik = ringkas_metrik(galat)
    terpilih = pilih_model(metrik)

    proyeksi = []
    for tk, pilihan in terpilih.iterrows():
        awal = PERIODE.get(pilihan["periode"], min(PERIODE.values()))
        tahun_latih = list(range(awal, 2027))
        # rentang: persentil 80 |galat| backtest model terpilih (horizon 1), per fungsi
        g = galat[(galat["tingkat"] == tk) & (galat["model"] == pilihan["model"]) & (galat["periode"] == pilihan["periode"])]
        rentang = g.groupby("kode_fungsi")["galat_pp"].apply(lambda e: e.abs().quantile(0.8))
        pemda = tingkat[tingkat == tk].index
        for tahun in TAHUN_PROYEKSI:
            pred = ramal(z, tahun_latih, tahun, pilihan["model"], tingkat).reindex(pemda).dropna()
            lebar = rentang * np.sqrt(tahun - 2026)
            df = pred.stack().rename("share_pct").reset_index()
            df["batas_bawah_pct"] = (df["share_pct"] - df["kode_fungsi"].map(lebar)).clip(lower=0)
            df["batas_atas_pct"] = df["share_pct"] + df["kode_fungsi"].map(lebar)
            df[["tahun", "tingkat", "model", "periode_latih", "mengalahkan_baseline"]] = [
                tahun,
                tk,
                pilihan["model"],
                pilihan["periode"],
                pilihan["mengalahkan_baseline"],
            ]
            proyeksi.append(df)
    proyeksi = pd.concat(proyeksi, ignore_index=True)

    metrik = metrik.merge(
        terpilih[["periode", "model"]].reset_index().assign(terpilih=True), how="left", on=["tingkat", "periode", "model"]
    )
    metrik["terpilih"] = metrik["terpilih"].eq(True)
    proyeksi.to_parquet(OUT / "proyeksi.parquet", index=False)
    metrik.to_parquet(OUT / "metrik_backtest.parquet", index=False)

    tabel = metrik[(metrik["kode_fungsi"] == "SEMUA") & metrik["tahun_uji"].isin(TAHUN_PILIH)]
    print("MAE (pp) rata-rata 2025-2026:")
    print(tabel.pivot_table(index=["periode", "model"], columns="tingkat", values="mae_pp").round(3).to_string())
    print("\nModel terpilih per tingkat:")
    print(terpilih.round(3).to_string())
    return 0


if __name__ == "__main__":
    sys.exit(main())
