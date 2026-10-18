"""Langkah 2 — analisis pergeseran prioritas belanja.

Jalankan: python -m pipeline.langkah2_analisis   (butuh hasil langkah 1)

Keluaran (data/processed/):
  share_fungsi.parquet     share (%) dan Δshare (pp) per tahun x pemda x fungsi
  tren_fungsi.parquet      kemiringan tren share (pp/tahun) + kategori naik/turun/stabil
  ips_pergeseran.parquet   Indeks Pergeseran Struktur + penanda lonjakan
  klaster.parquet          klaster tiap pemda per tahun (CLR + K-Means)
  klaster_centroid.parquet profil share rata-rata tiap klaster
"""

import sys

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

from pipeline.langkah1_bersihkan import CONFIG, OUT

PERIODE = {"2022-2026": 2022, "2023-2026": CONFIG["tahun_patahan"]}  # nama -> tahun awal
NILAI_KECIL = 1e-4  # share < 0,01% (termasuk nol) diganti 0,01% agar log tidak ekstrem
# Untuk klaster, 4 fungsi bershare kecil (median < 2%) digabung jadi "Lainnya".
# Tanpa ini, klaster hanya memisahkan pemda dengan Pariwisata ~0% vs 0,5%.
KOMPONEN_KLASTER = {"01": ["01"], "04": ["04"], "06": ["06"], "07": ["07"], "10": ["10"], "LN": ["03", "05", "08", "11"]}


# --- rumus ---------------------------------------------------------------------
def clr(share: pd.DataFrame) -> pd.DataFrame:
    """Centered log-ratio: ln(x_f / rata-rata geometrik x). Baris = pemda-tahun, kolom = fungsi."""
    x = share.clip(lower=NILAI_KECIL)
    x = x.div(x.sum(axis=1), axis=0)
    log_x = np.log(x)
    return log_x.sub(log_x.mean(axis=1), axis=0)


def clr_balik(z: pd.DataFrame) -> pd.DataFrame:
    """Kebalikan CLR: hasilnya share yang berjumlah 1."""
    e = np.exp(z)
    return e.div(e.sum(axis=1), axis=0)


def kemiringan(tabel: pd.DataFrame) -> pd.Series:
    """Kemiringan regresi linear per baris; kolom = tahun."""
    t = tabel.columns.to_numpy(dtype=float)
    t_c = t - t.mean()
    return (tabel.sub(tabel.mean(axis=1), axis=0) * t_c).sum(axis=1) / (t_c**2).sum()


def z_robust(x: pd.Series) -> pd.Series:
    """(x - median) / (1,4826 x MAD)."""
    mad = (x - x.median()).abs().median()
    return (x - x.median()) / (1.4826 * mad) if mad > 0 else x * 0.0


def kelompok(tingkat: pd.Series) -> pd.Series:
    """Provinsi dianalisis terpisah dari kabupaten/kota."""
    return np.where(tingkat == "provinsi", "provinsi", "kabkota")


# --- analisis ------------------------------------------------------------------
def hitung_share_delta(fakta: pd.DataFrame) -> pd.DataFrame:
    df = fakta[["tahun", "kode_pemda", "tingkat", "kode_fungsi"]].copy()
    df["share_pct"] = fakta["share_belanja"] * 100
    df = df.sort_values(["kode_pemda", "kode_fungsi", "tahun"])
    df["delta_pp"] = df.groupby(["kode_pemda", "kode_fungsi"])["share_pct"].diff()
    df["patahan_klasifikasi"] = df["tahun"] == CONFIG["tahun_patahan"]
    return df.sort_values(["tahun", "kode_pemda", "kode_fungsi"]).reset_index(drop=True)


def hitung_tren(share: pd.DataFrame) -> pd.DataFrame:
    hasil = []
    for nama, awal in PERIODE.items():
        tabel = share[share["tahun"] >= awal].pivot_table(index=["kode_pemda", "kode_fungsi"], columns="tahun", values="share_pct")
        tabel = tabel.dropna()  # hanya pemda yang lengkap di periode ini
        slope = kemiringan(tabel)
        ambang = slope.abs().median()  # separuh pergerakan terkecil dianggap stabil
        kategori = np.select([slope > ambang, slope < -ambang], ["naik", "turun"], "stabil")
        hasil.append(pd.DataFrame({"periode": nama, "kemiringan_pp": slope, "kategori": kategori, "ambang_pp": ambang}).reset_index())
    return pd.concat(hasil, ignore_index=True)


def hitung_ips(share: pd.DataFrame) -> pd.DataFrame:
    """IPS(t) = ½ Σ_f |Δshare|. Lonjakan: z-score robust > 3 dibanding pemda setingkat di tahun yang sama."""
    ips = share.dropna(subset=["delta_pp"]).groupby(["tahun", "kode_pemda", "tingkat"])["delta_pp"].apply(lambda d: 0.5 * d.abs().sum())
    ips = ips.rename("ips_pp").reset_index()
    ips["kelompok"] = kelompok(ips["tingkat"])
    ips["z_robust"] = ips.groupby(["tahun", "kelompok"])["ips_pp"].transform(z_robust)
    ips["lonjakan"] = ips["z_robust"] > 3
    ips["patahan_klasifikasi"] = ips["tahun"] == CONFIG["tahun_patahan"]
    return ips


def hitung_klaster(fakta: pd.DataFrame, k_pilihan=range(2, 7)) -> tuple[pd.DataFrame, pd.DataFrame]:
    """K-Means di ruang CLR, dipisah provinsi vs kab/kota.

    Model dilatih pada 2023-2026 (setelah patahan klasifikasi) lalu dipakai untuk
    memberi label semua tahun termasuk 2022, sehingga arti klaster sama di setiap
    tahun dan migrasi antartahun bisa dilacak."""
    lebar = fakta.pivot_table(index=["tahun", "kode_pemda", "tingkat"], columns="kode_fungsi", values="share_belanja")
    komponen = pd.DataFrame({k: lebar[fs].sum(axis=1) for k, fs in KOMPONEN_KLASTER.items()})
    z = clr(komponen)
    nama_fungsi = {k: v["nama"] for k, v in CONFIG["fungsi"].items()} | {"LN": "Lainnya"}
    anggota, centroid = [], []
    for grup in ["provinsi", "kabkota"]:
        zg = z[kelompok(z.index.get_level_values("tingkat")) == grup]
        latih = zg[zg.index.get_level_values("tahun") >= CONFIG["tahun_patahan"]]
        skor = {k: silhouette_score(latih, KMeans(k, n_init=10, random_state=42).fit_predict(latih)) for k in k_pilihan}
        k_terbaik = max(skor, key=skor.get)
        model = KMeans(k_terbaik, n_init=10, random_state=42).fit(latih)

        pusat = pd.DataFrame(model.cluster_centers_, columns=zg.columns)
        share_pusat = clr_balik(pusat) * 100
        share_rata = clr_balik(latih.mean().to_frame().T).iloc[0] * 100
        # label = fungsi dengan selisih share (pp) terbesar terhadap rata-rata kelompok
        label = {i: f"K{i + 1} · {nama_fungsi[(share_pusat.loc[i] - share_rata).idxmax()]} tinggi" for i in pusat.index}
        klaster = model.predict(zg)
        anggota.append(
            pd.DataFrame(
                {
                    "kelompok": grup,
                    "klaster": klaster + 1,
                    "nama_klaster": [label[i] for i in klaster],
                    "k": k_terbaik,
                    "silhouette": skor[k_terbaik],
                },
                index=zg.index,
            ).reset_index()
        )
        print(f"silhouette {grup}:", {k: round(v, 3) for k, v in skor.items()})
        for i in pusat.index:
            for f in zg.columns:
                centroid.append([grup, i + 1, label[i], f, share_pusat.at[i, f], share_rata[f]])
    kolom = ["kelompok", "klaster", "nama_klaster", "komponen", "share_pct", "share_rata_kelompok_pct"]
    hasil = pd.concat(anggota, ignore_index=True).drop(columns="tingkat")
    hasil["patahan_klasifikasi"] = hasil["tahun"] < CONFIG["tahun_patahan"]
    return hasil, pd.DataFrame(centroid, columns=kolom)


def main() -> int:
    fakta = pd.read_parquet(OUT / "fakta_anggaran.parquet")
    share = hitung_share_delta(fakta)
    tren = hitung_tren(share)
    ips = hitung_ips(share)
    klaster, centroid = hitung_klaster(fakta)

    for nama, df in [
        ("share_fungsi", share),
        ("tren_fungsi", tren),
        ("ips_pergeseran", ips),
        ("klaster", klaster),
        ("klaster_centroid", centroid),
    ]:
        df.to_parquet(OUT / f"{nama}.parquet", index=False)

    print("Median IPS (pp) per tahun:", ips.groupby("tahun")["ips_pp"].median().round(2).to_dict())
    print("Jumlah lonjakan (z > 3) per tahun:", ips.groupby("tahun")["lonjakan"].sum().to_dict())
    print(tren.groupby(["periode", "kategori"]).size().unstack().to_string())
    for grup, g in klaster.groupby("kelompok"):
        print(f"Klaster {grup}: k={g['k'].iat[0]}, silhouette={g['silhouette'].iat[0]:.3f}")
        print(g.pivot_table(index="nama_klaster", columns="tahun", values="kode_pemda", aggfunc="count", fill_value=0).to_string())
    return 0


if __name__ == "__main__":
    sys.exit(main())
