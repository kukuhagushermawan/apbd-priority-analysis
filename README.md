# Peta Prioritas Belanja Daerah

Pipeline data dan dashboard web untuk analisis temporal dan prediksi pergeseran prioritas belanja
APBD pemerintah daerah Indonesia 2022–2026 (DJPK Kemenkeu, status **Anggaran**: Belanja per Fungsi
dan APBD Ringkas).

## Struktur repo

```
data/
  raw/{2022..2026}/     # berkas xlsx DJPK asli (tidak pernah ditimpa)
  processed/            # keluaran Parquet tiap tahap pipeline
docs/
  audit_format.md       # hasil audit format per tahun (milestone 1)
pipeline/               # paket Python (pandas, openpyxl, NumPy, scikit-learn, pyarrow)
  config/
    schema_map.yaml     # peta tiap tahun -> skema baku, kamus fungsi, pemekaran Papua
    crosswalk_pemda.csv # crosswalk kode/nama pemda berversi (546 pemda)
  readers.py            # pembaca xlsx berbasis schema_map
  audit.py              # python -m pipeline.audit
  extract.py -> standardize.py -> aggregate.py -> share.py -> validate.py
  run.py                # python -m pipeline.run (orkestrator idempoten)
  tests/                # pytest: rumus (fixture kecil) + data asli
web/                    # Next.js + Prisma (milestone 4)
```

## Menjalankan

```bash
pip install -r pipeline/requirements.txt
python -m pipeline.audit        # verifikasi format data mentah terhadap schema_map.yaml
python -m pipeline.run          # ekstraksi -> standardisasi -> agregasi -> share -> validasi
python -m pytest                # uji unit + uji data asli
python -m ruff check pipeline   # lint
```

Atau gunakan `make install | audit | run | test | lint`. Detail tahap, keluaran, dan keputusan
metodologi ada di [docs/pipeline.md](docs/pipeline.md).

## Status milestone

| # | Milestone | Status |
|---|---|---|
| 1 | Audit format + `docs/audit_format.md` + `schema_map.yaml` | selesai |
| 2 | Standardisasi, agregasi, share, validasi + uji | selesai, menunggu tinjauan |
| 3 | Analitik (Δshare, tren, IPS, CLR + K-Means) dan model prediksi + backtest | – |
| 4 | Skema DB + API + halaman Ringkasan Nasional | – |
| 5 | Tujuh halaman lainnya | – |
| 6 | Pengujian, dokumentasi, deploy Vercel | – |

## Temuan audit singkat

- Format 2022 berbeda: hanya ada sheet wide, kode akun Ringkasan 3 digit, label fungsi tanpa nol di
  depan, dan 542 pemda (sebelum pemekaran Papua).
- Semua nilai dalam Rupiah penuh. Hanya 9 dari 11 fungsi yang muncul (tanpa Pertahanan dan Agama).
- Total fungsi sama persis dengan Belanja Daerah di Ringkasan.
- Ada indikasi patahan klasifikasi 2022 → 2023. Detail di [docs/audit_format.md](docs/audit_format.md).
