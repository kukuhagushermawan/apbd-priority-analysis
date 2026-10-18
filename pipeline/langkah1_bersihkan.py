"""Langkah 1 — bersihkan data DJPK menjadi satu tabel baku.

Alur: baca xlsx 2022-2026 -> samakan format -> hitung share -> validasi.
Jalankan: python -m pipeline.langkah1_bersihkan

Keluaran (data/processed/):
  fakta_anggaran.parquet  satu baris per tahun x pemda x fungsi, berisi
                          nilai_anggaran, total_belanja, share_belanja
  log_validasi.parquet    hasil pemeriksaan data
"""

import re
import sys
from pathlib import Path

import pandas as pd
import yaml

FOLDER = Path(__file__).resolve().parent
RAW = FOLDER.parent / "data" / "raw"
OUT = FOLDER.parent / "data" / "processed"
CROSSWALK = FOLDER / "crosswalk_pemda.csv"
CONFIG = yaml.safe_load((FOLDER / "config.yaml").read_text(encoding="utf-8"))

POLA_KODE_PEMDA = re.compile(r"^\d{2}\.\d{2}$")


def kode_fungsi(label: str) -> str:
    """'1. Pelayanan Umum' (format 2022) atau '01. Pelayanan Umum' -> '01'."""
    nomor, nama = re.match(r"^\s*(\d+)\.\s*(.+?)\s*$", str(label)).groups()
    kode = f"{int(nomor):02d}"
    nama = " ".join(nama.lower().split())
    if kode not in CONFIG["fungsi"] or nama not in CONFIG["fungsi"][kode]["alias"]:
        raise ValueError(f"Fungsi tidak dikenal: {label!r}")
    return kode


def kode_baku(kode: pd.Series, tahun: int) -> pd.Series:
    """Kode 2022 di wilayah Papua -> kode setelah pemekaran (2023+)."""
    if tahun < CONFIG["tahun_patahan"]:
        return kode.replace(CONFIG["papua_kode_lama_ke_baru"])
    return kode


def adalah_kode_pemda(v) -> bool:
    return isinstance(v, str) and bool(POLA_KODE_PEMDA.match(v))


def baca_fungsi(tahun: int) -> tuple[pd.DataFrame, int]:
    """Sheet Belanja per Fungsi -> (tabel tahun x pemda x fungsi, jumlah daerah tertulis)."""
    c = CONFIG["tahun"][tahun]["fungsi"]
    # dtype=object: kode "01.10" tetap teks (tanpa ini pandas mengubahnya jadi 1.1)
    raw = pd.read_excel(RAW / c["berkas"], sheet_name=c["sheet"], header=None, dtype=object)
    jumlah_tertulis = int(re.search(r"\d+", str(raw.iat[2, 0])).group())

    nama_fungsi = raw.iloc[4].ffill()  # baris 5, sel gabungan selebar 4 jenis belanja
    kolom_nilai = [i for i in range(2, raw.shape[1]) if pd.notna(raw.iat[5, i])]
    data = raw.iloc[6:]
    data = data[data[0].map(adalah_kode_pemda)]

    nilai = data[kolom_nilai].apply(pd.to_numeric, errors="coerce").fillna(0.0)
    nilai.columns = [kode_fungsi(nama_fungsi[i]) for i in kolom_nilai]
    nilai = nilai.T.groupby(level=0).sum().T  # jumlahkan 4 jenis belanja per fungsi
    nilai.index = data[0].values

    df = nilai.rename_axis("kode_asli").reset_index().melt(id_vars="kode_asli", var_name="kode_fungsi", value_name="nilai_anggaran")
    df["nama_asli"] = df["kode_asli"].map(dict(zip(data[0], data[1].astype(str).str.strip(), strict=True)))
    df["tahun"] = tahun
    return df, jumlah_tertulis


def baca_total_ringkas(tahun: int) -> pd.Series:
    """Sheet Ringkas -> total '5. Belanja Daerah' per kode pemda (asli)."""
    c = CONFIG["tahun"][tahun]["ringkas"]
    raw = pd.read_excel(RAW / c["berkas"], sheet_name=c["sheet"], header=None, dtype=object)
    kode = raw.iloc[3]
    baris = raw[raw[0].astype(str).str.strip().str.match(r"^5\.\s")].iloc[0]
    kolom = [i for i in raw.columns if adalah_kode_pemda(kode[i])]  # buang 'Grand Total' dll.
    return pd.Series(pd.to_numeric(baris[kolom]).values, index=kode[kolom].values)


def buat_crosswalk(df: pd.DataFrame) -> pd.DataFrame:
    """Daftar pemda baku dari data; disimpan sebagai berkas berversi di Git."""
    tingkat = lambda kode, nama: "provinsi" if kode.endswith(".00") else ("kota" if nama.startswith("Kota") else "kabupaten")  # noqa: E731
    akhir = df.sort_values("tahun").groupby("kode_pemda").last()
    awal = df[df["tahun"] == 2022].drop_duplicates("kode_pemda").set_index("kode_pemda")["kode_asli"]
    cw = pd.DataFrame({"kode_pemda": akhir.index})
    cw["nama_pemda"] = [CONFIG["nama_kanonik"].get(k, akhir.at[k, "nama_asli"]) for k in cw["kode_pemda"]]
    cw["tingkat"] = [tingkat(k, n) for k, n in zip(cw["kode_pemda"], cw["nama_pemda"], strict=True)]
    cw["provinsi_induk"] = cw["kode_pemda"].str[:2] + ".00"
    cw["kode_2022"] = cw["kode_pemda"].map(awal).fillna("")
    n_tahun = df.groupby("kode_pemda")["tahun"].nunique()
    cw["panel_seimbang"] = (cw["kode_pemda"].map(n_tahun) == df["tahun"].nunique()) & ~cw["kode_pemda"].isin(CONFIG["panel_tidak_seimbang"])
    return cw


def bersihkan() -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    frames, ringkas, jumlah_tertulis = [], [], {}
    for tahun in CONFIG["tahun"]:
        df, jumlah_tertulis[tahun] = baca_fungsi(tahun)
        df["kode_pemda"] = kode_baku(df["kode_asli"], tahun)
        frames.append(df)
        total = baca_total_ringkas(tahun)
        ringkas.append(
            pd.DataFrame({"tahun": tahun, "kode_pemda": kode_baku(pd.Series(total.index), tahun), "total_ringkas": total.values})
        )
    df = pd.concat(frames, ignore_index=True)

    if not CROSSWALK.exists():
        buat_crosswalk(df).to_csv(CROSSWALK, index=False, lineterminator="\n")
    cw = pd.read_csv(CROSSWALK, dtype=str, keep_default_na=False)
    cw["panel_seimbang"] = cw["panel_seimbang"] == "True"
    tak_dikenal = set(df["kode_pemda"]) - set(cw["kode_pemda"])
    if tak_dikenal:
        raise ValueError(f"Kode pemda belum ada di crosswalk: {sorted(tak_dikenal)}")

    # provinsi induk mengikuti kode asli tahun tsb (Merauke 2022 -> Papua 26.00)
    df["provinsi_induk"] = df["kode_asli"].str[:2] + ".00"
    df = df.merge(cw[["kode_pemda", "nama_pemda", "tingkat", "panel_seimbang"]], on="kode_pemda")
    df["nama_fungsi"] = df["kode_fungsi"].map({k: v["nama"] for k, v in CONFIG["fungsi"].items()})
    df["total_belanja"] = df.groupby(["tahun", "kode_pemda"])["nilai_anggaran"].transform("sum")
    df["share_belanja"] = df["nilai_anggaran"] / df["total_belanja"]

    kolom = ["tahun", "kode_pemda", "nama_pemda", "tingkat", "provinsi_induk", "panel_seimbang", "kode_fungsi", "nama_fungsi"]
    df = df[kolom + ["nilai_anggaran", "total_belanja", "share_belanja"]]
    df = df.astype({"tahun": "int16"}).sort_values(["tahun", "kode_pemda", "kode_fungsi"]).reset_index(drop=True)
    return df, pd.concat(ringkas, ignore_index=True), jumlah_tertulis


def status_selisih(selisih_rp: float, selisih_pct: float) -> str:
    v = CONFIG["validasi"]
    if abs(selisih_pct) <= v["lulus_pct"] or abs(selisih_rp) <= v["lulus_rp"]:
        return "LULUS"
    return "PERINGATAN" if abs(selisih_pct) <= v["peringatan_pct"] else "GAGAL"


def validasi(df: pd.DataFrame, ringkas: pd.DataFrame, jumlah_tertulis: dict) -> pd.DataFrame:
    """Empat pemeriksaan: total vs Ringkasan, jumlah pemda, 9 fungsi lengkap, share = 100%."""
    log = []
    total = df.drop_duplicates(["tahun", "kode_pemda"]).merge(ringkas, on=["tahun", "kode_pemda"], how="outer")
    for r in total.itertuples():
        selisih = r.total_belanja - r.total_ringkas
        pct = selisih / r.total_ringkas * 100
        status = status_selisih(selisih, pct) if pd.notna(selisih) else "GAGAL"
        log.append([r.tahun, r.kode_pemda, "total_fungsi_vs_ringkas", r.total_ringkas, r.total_belanja, selisih, pct, status])

    for tahun, g in df.groupby("tahun"):
        n_pemda = g["kode_pemda"].nunique()
        tertulis = jumlah_tertulis[tahun]
        log.append([tahun, None, "jumlah_pemda", tertulis, n_pemda, n_pemda - tertulis, None, "LULUS" if n_pemda == tertulis else "GAGAL"])
        fungsi_per_pemda = g.groupby("kode_pemda")["kode_fungsi"].nunique()
        kurang = int((fungsi_per_pemda != 9).sum())
        log.append([tahun, None, "sembilan_fungsi_lengkap", n_pemda, n_pemda - kurang, kurang, None, "LULUS" if kurang == 0 else "GAGAL"])
        jumlah_share = g.groupby("kode_pemda")["share_belanja"].sum()
        deviasi = float((jumlah_share - 1).abs().max())
        log.append(
            [tahun, None, "share_berjumlah_100", 1.0, float(jumlah_share.min()), deviasi, None, "LULUS" if deviasi < 1e-9 else "GAGAL"]
        )

    kolom = ["tahun", "kode_pemda", "pemeriksaan", "nilai_harapan", "nilai_aktual", "selisih_rp", "selisih_pct", "status"]
    return pd.DataFrame(log, columns=kolom).astype({"tahun": "int16"})


def main() -> int:
    df, ringkas, jumlah_tertulis = bersihkan()
    log = validasi(df, ringkas, jumlah_tertulis)
    OUT.mkdir(parents=True, exist_ok=True)
    df.to_parquet(OUT / "fakta_anggaran.parquet", index=False)
    log.to_parquet(OUT / "log_validasi.parquet", index=False)

    print(f"fakta_anggaran: {len(df):,} baris, pemda per tahun: {df.groupby('tahun')['kode_pemda'].nunique().to_dict()}")
    print(log.groupby(["pemeriksaan", "status"]).size().to_string())
    gagal = log[log["status"] != "LULUS"]
    if len(gagal):
        print(gagal.to_string(index=False))
    return 1 if (log["status"] == "GAGAL").any() else 0


if __name__ == "__main__":
    sys.exit(main())
