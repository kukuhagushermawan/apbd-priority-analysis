# Peta Prioritas Belanja Daerah

Analisis pergeseran prioritas belanja APBD pemerintah daerah Indonesia 2022–2026 dan proyeksinya ke
2027–2028. Sumber data: DJPK Kemenkeu, status **Anggaran**, berkas Belanja per Fungsi dan APBD
Ringkas.

## Alur

```
data/raw (xlsx DJPK)
   │  langkah 1: bersihkan   samakan format 5 tahun, hitung share, validasi
   │  langkah 2: analisis    Δshare, tren, Indeks Pergeseran Struktur, klaster
   │  langkah 3: prediksi    proyeksi 2027-2028 + backtest
   ▼
data/processed (parquet)  ──►  web/ dashboard (menyusul)
```

## Struktur

```
data/raw/                     data asli DJPK 2022-2026
pipeline/
  config.yaml                 lokasi sheet per tahun, kamus fungsi, kode pemekaran Papua
  crosswalk_pemda.csv         daftar 546 pemda
  langkah1_bersihkan.py
  langkah2_analisis.py
  langkah3_prediksi.py
  run.py                      menjalankan langkah 1-3
  test_rumus.py               uji rumus
docs/metodologi.md            temuan data, rumus, hasil backtest, keputusan
```

## Menjalankan

```bash
pip install -r pipeline/requirements.txt
python -m pipeline.run
python -m pytest pipeline
```

## Status

| Milestone | Status |
|---|---|
| 1–2 Data: audit format, standardisasi, share, validasi | selesai |
| 3 Analitik dan prediksi dengan backtest | selesai, menunggu tinjauan |
| 4 Database + API + halaman Ringkasan Nasional | berikutnya |
| 5 Tujuh halaman lainnya | – |
| 6 Pengujian, dokumentasi, deploy Vercel | – |
