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
data/processed (parquet)
   │  langkah 4: muat db     isi PostgreSQL
   ▼
web/ dashboard (Next.js + Prisma + ECharts)
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
  langkah4_muat_db.py         memuat hasil ke PostgreSQL
  run.py                      menjalankan langkah 1-3
  test_rumus.py               uji rumus
web/
  prisma/schema.prisma        skema database (11 tabel)
  src/app/                    8 halaman + API (/api/ringkasan, /tren, /pergeseran,
                              /daerah/[kode], /klaster, /proyeksi, /unduh)
  src/components/             sidebar, filter, pencarian pemda, grafik ECharts
  src/lib/data.ts             semua kueri database (satu bagian per halaman)
docs/metodologi.md            temuan data, rumus, hasil backtest, keputusan
```

## Menjalankan

Pipeline data (Python):

```bash
pip install -r pipeline/requirements.txt
python -m pipeline.run
python -m pytest pipeline
```

Dashboard (Node.js 20+). Database lokal memakai PostgreSQL tanpa Docker (`npm run db`, biarkan terminalnya
terbuka):

```bash
cd web
npm install
cp .env.example .env
npm run db
```

Di terminal kedua:

```bash
cd web
npx prisma db push
cd ..
python -m pipeline.langkah4_muat_db
cd web
npm run dev
```

Buka http://localhost:3000. Untuk deploy, `DATABASE_URL` diganti dengan connection string Neon/Supabase.

## Halaman

| Halaman | Pertanyaan yang dijawab |
|---|---|
| Ringkasan Nasional | Bagaimana komposisi belanja bergeser 2022–2026? |
| Tren per Fungsi | Fungsi apa yang naik/turun konsisten? |
| Deteksi Pergeseran | Kapan dan di mana pergeseran tajam terjadi, siapa penyumbangnya? |
| Profil Daerah | Bagaimana satu pemda dibanding median dan klasternya? |
| Perbandingan | Apa beda 2–4 pemda (share atau nominal)? |
| Peta & Klaster | Pemda mana yang strukturnya mirip, dan siapa yang pindah kelompok? |
| Proyeksi 2027–2028 | Ke mana arah share bila pola berlanjut, seberapa akurat modelnya? |
| Kualitas Data & Unduh | Seberapa valid datanya, dan bagaimana mengunduhnya? |

Filter tahun, tingkat, provinsi, dan fungsi tersimpan di URL, jadi tampilan bisa dibagikan. Semua nama
pemda tertaut ke Profil Daerah.

## Status

| Milestone | Status |
|---|---|
| 1–2 Data: audit format, standardisasi, share, validasi | selesai |
| 3 Analitik dan prediksi dengan backtest | selesai |
| 4 Database + API + halaman Ringkasan Nasional | selesai |
| 5 Tujuh halaman lainnya | selesai, menunggu tinjauan (peta choropleth menunggu GeoJSON) |
| 6 Pengujian, dokumentasi, deploy Vercel | – |
