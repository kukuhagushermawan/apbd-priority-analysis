# Pipeline Data (Milestone 2)

Satu perintah menjalankan seluruh alur dari berkas xlsx DJPK sampai log validasi:

```bash
python -m pipeline.run            # tahap yang tidak berubah otomatis dilewati
python -m pipeline.run --force    # jalankan ulang semua tahap
```

Pipeline **idempoten**. Setiap tahap menulis ulang Parquet-nya secara deterministik. Tahap dilewati
bila hash berkas masukan, konfigurasi (`schema_map.yaml`, `crosswalk_pemda.csv`), dan kode tahap itu
sendiri sama dengan eksekusi terakhir, yang tercatat di `data/processed/_manifest.json`. Kode keluar
bernilai 1 bila ada pemeriksaan berstatus `GAGAL`. Workflow `.github/workflows/pipeline.yml`
menjalankan lint, audit, uji, dan pipeline di GitHub Actions, baik saat push maupun secara manual
(`workflow_dispatch`), lalu mengunggah Parquet sebagai artefak.

## Tahap dan keluaran

| # | Modul | Keluaran (`data/processed/`) | Isi |
|---|---|---|---|
| 1 | `extract.py` | `01_ekstraksi/fungsi_wide.parquet`, `fungsi_long.parquet`, `ringkas.parquet`, `metadata.parquet` | Nilai dan label mentah per tahun, belum dipetakan. Metadata berisi tanggal data dan "Jumlah: N daerah". |
| 2 | `standardize.py` | `02_standar/fungsi_standar.parquet`, `ringkas_standar.parquet`, `fungsi_long_standar.parquet` | Skema baku identik di semua tahun (lihat bawah). |
| 3 | `aggregate.py` | `03_agregat/fakta_anggaran.parquet` | Satu baris per tahun × pemda × fungsi (24.534 baris), ditambah rincian jenis 51–54. |
| 4 | `share.py` | `04_share/share_fungsi.parquet` | `share_belanja`, `total_belanja`, `panel_seimbang`. |
| 5 | `validate.py` | `05_validasi/log_validasi.parquet` | Satu baris per pemeriksaan (2.788 baris). |

### Skema baku (`fungsi_standar`)

| Kolom | Tipe | Aturan |
|---|---|---|
| `tahun` | int16 | |
| `kode_pemda` | string `NN.NN` | Kode baku 2023+. Kode 2022 di wilayah Papua dipetakan lewat `schema_map.yaml → pemekaran_papua`. |
| `nama_pemda` | string | Nama kanonik dari `crosswalk_pemda.csv` |
| `tingkat` | string | provinsi / kabupaten / kota |
| `provinsi_induk` | string `NN.00` | Provinsi **pada tahun tersebut**, diambil dari kode asli. Contoh: Merauke 2022 → 26.00, 2023+ → 35.00. |
| `kode_fungsi`, `nama_fungsi` | string | Dari kamus 11 fungsi + alias |
| `kode_jenis` | string `51`–`54` | Dari kamus jenis + alias |
| `nilai_anggaran` | float64 (Rp) | Sel kosong → 0 |

## Rumus share

```
share_belanja(t, pemda, f) = nilai_anggaran(t, pemda, f) / total_belanja(t, pemda)
total_belanja(t, pemda)    = Σ_f nilai_anggaran(t, pemda, f)   (9 fungsi aktif)
```

Penyebutnya adalah jumlah 9 fungsi, bukan akun Ringkasan, supaya share selalu berjumlah tepat 1.
Kedua total ini identik: selisih maksimum 0,0000% atau Rp1.252. Kesetaraan ini divalidasi di tahap 5.

## Crosswalk pemda berversi

`pipeline/config/crosswalk_pemda.csv` di-commit ke Git dan berisi 546 pemda: 38 provinsi, 415
kabupaten, dan 93 kota. Kolomnya:

- `kode_pemda`, `nama_pemda`, `tingkat`, `provinsi_induk`
- `kode_2022`, `provinsi_induk_2022`
- `tahun_pertama`, `tahun_terakhir`, `n_tahun`
- `panel_seimbang`
- `varian_nama`, yaitu nama lain yang pernah dipakai DJPK

Pipeline gagal bila menemukan kode yang tidak ada di crosswalk. Regenerasi dilakukan dengan
`python -m pipeline.crosswalk` dan diff-nya ditinjau sebelum commit.

## Keputusan metodologi (disetujui pada tinjauan milestone 1)

1. **Pertahanan (02) dan Agama (09).** Kedua fungsi ini dicek di semua tahun dan tidak ada sama sekali,
   tanpa kolom maupun baris, karena keduanya urusan absolut pemerintah pusat. Keduanya tetap tercantum
   di kamus dengan `aktif: false`. Analitik dihitung atas **9 fungsi aktif** dan tidak dibuat baris nol
   buatan. Pipeline akan gagal bila suatu saat fungsi nonaktif muncul di data.
2. **Patahan klasifikasi 2022→2023.** Dicatat di `schema_map.yaml → patahan_klasifikasi`. Analitik
   (milestone 3) menandai Δshare dan IPS 2023, menghitung z-score IPS antarpemda dalam tahun yang sama,
   dan menjalankan dua varian periode: 2022–2026 dan 2023–2026.
3. **Toleransi validasi.** LULUS bila selisih ≤ 0,01% atau ≤ Rp10.000. PERINGATAN bila selisih ≤ 0,5%.
   Selebihnya GAGAL.
4. **Panel tidak seimbang.** `panel_seimbang = false` untuk 26.00 Papua dan 32.00 Papua Barat (wilayahnya
   menyusut mulai 2023), serta 35.00–38.00 (provinsi baru tanpa data 2022). Kab./kota yang pindah
   provinsi tetap dianggap seimbang karena entitasnya sama.

## Pemeriksaan di `log_validasi`

| Pemeriksaan | Tingkat | Hasil saat ini |
|---|---|---|
| `total_fungsi_vs_ringkas` | per pemda-tahun | 2.726 LULUS (semua) |
| `jenis_{51..54}_vs_ringkas` | per pemda-tahun, hanya yang menyimpang | 14 PERINGATAN, semuanya 2025 |
| `jenis_vs_ringkas_per_tahun` | per tahun | 2025 PERINGATAN, tahun lain LULUS |
| `jumlah_pemda_vs_judul` | per tahun | LULUS |
| `kelengkapan_9_fungsi` | per tahun | LULUS |
| `jumlah_share_sama_dengan_1` | per tahun | LULUS |
| `nilai_negatif` | per tahun | LULUS |
| `wide_vs_long` | per tahun | LULUS (2023–2026), LEWATI (2022, tanpa sheet Datarow) |
| `cakupan_crosswalk` | per tahun | LULUS |
| `kunci_unik_fakta` | dataset | LULUS |
| `nilai_janggal_f??_j??` | per sel | 12 PERINGATAN (nilai > 0 tetapi < Rp1.000) |

**Temuan validasi.** Pada 7 pemda tahun 2025 (antara lain 01.22, 03.08, 04.03, 04.10), pembagian
Belanja Pegawai (51) dan Barang & Jasa (52) di berkas Fungsi berbeda dari akun 5101/5102 di
Ringkasan. Besarnya sama tetapi arahnya berlawanan, sehingga total belanja tetap cocok. Dugaan
penyebab: perbedaan pemetaan jenis antara kedua berkas DJPK. **Share fungsi tidak terdampak**, karena
share dihitung dari total per fungsi. Yang terdampak hanya rincian nominal per jenis di Profil Daerah,
jadi temuan ini cukup dicatat sebagai PERINGATAN.

## Uji

`python -m pytest` menjalankan 34 uji:

- **`test_rumus.py`** (fixture buatan kecil): pemetaan label semua varian tahun, konversi kode akun
  3→4 digit, pemetaan kode Papua, rumus share dan jumlahnya = 1, agregasi jenis, ambang status
  validasi, dan dugaan penyebab selisih.
- **`test_data_nyata.py`** (data asli):
  - skema, tipe, jumlah fungsi, dan jumlah jenis identik di kelima tahun;
  - tidak ada fungsi 02/09;
  - cakupan 542/546 pemda dan pemetaan Merauke;
  - penanda panel;
  - share = 1;
  - log tanpa GAGAL;
  - idempotensi (dua kali eksekusi menghasilkan Parquet identik).
