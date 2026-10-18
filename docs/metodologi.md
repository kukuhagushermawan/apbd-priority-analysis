# Metodologi

Data: APBD status **Anggaran** 2022–2026 dari DJPK Kemenkeu, yaitu berkas Belanja per Fungsi dan
APBD Ringkas. Semua angka adalah anggaran yang direncanakan, bukan realisasi.

Pipeline terdiri dari tiga langkah dan dijalankan dengan `python -m pipeline.run`.

| Langkah | Berkas | Isi |
|---|---|---|
| 1 | `pipeline/langkah1_bersihkan.py` | Membaca xlsx, menyamakan format, menghitung share, memvalidasi |
| 2 | `pipeline/langkah2_analisis.py` | Δshare, tren, IPS, klaster |
| 3 | `pipeline/langkah3_prediksi.py` | Proyeksi 2027–2028 dan backtest |

---

## 1. Menyamakan format data

**Temuan audit.** Format tahun 2022 berbeda dari tahun-tahun lainnya:

| | 2022 | 2023–2026 |
|---|---|---|
| Sheet Fungsi | hanya satu sheet (`Sheet3`) | sheet tabel + sheet data baris |
| Label fungsi | `1. Pelayanan Umum` | `01. Pelayanan Umum` |
| Nama fungsi 05 | Lingkungan Hidup | Perlindungan Lingkungan Hidup |
| Kode akun Ringkas | 3 digit (`511.`) | 4 digit (`5101.`) |
| Jumlah pemda | 542 (34 provinsi) | 546 (38 provinsi) |

Hal yang sama di semua tahun:
- **Satuan:** Rupiah penuh.
- **Tata letak sheet Fungsi:** baris 5 berisi nama fungsi, baris 6 jenis belanja, dan data mulai baris 7.
  Karena itu cukup satu cara baca untuk semua tahun. Lokasi berkas dan sheet per tahun dicatat di
  `pipeline/config.yaml`.

**Kode pemda dan pemekaran Papua.** Mulai APBD 2023 ada empat provinsi baru (35–38), dan 26
kab./kota pindah kode. Contohnya Merauke: 26.04 → 35.01. Kode 2022 diubah ke kode baru supaya satu
pemda tetap satu baris dari tahun ke tahun. Daftar 546 pemda tersimpan di
`pipeline/crosswalk_pemda.csv`. Provinsi Papua (26.00) dan Papua Barat (32.00) wilayahnya menyusut,
sedangkan empat provinsi baru tidak punya data 2022. Keenamnya diberi tanda `panel_seimbang = false`.

**Pertahanan dan Agama.** Kedua fungsi ini tidak muncul sama sekali di data 2022–2026, karena
keduanya urusan pemerintah pusat. Analisis memakai **9 fungsi**.

## 2. Share dan validasi

```
share_belanja = nilai_anggaran_fungsi / total_belanja        (total = jumlah 9 fungsi)
```

Validasi membandingkan total 9 fungsi dengan akun "5. Belanja Daerah" di Ringkasan untuk setiap
pemda dan tahun. Aturannya: LULUS bila selisih ≤ 0,01% atau ≤ Rp10.000, PERINGATAN bila ≤ 0,5%, dan
GAGAL bila lebih besar. Hasilnya **2.726 dari 2.726 LULUS**, dengan selisih terbesar Rp1.252 akibat
pembulatan sen. Pemeriksaan lain yang juga lulus: jumlah pemda sesuai judul berkas, setiap pemda
punya 9 fungsi, dan share berjumlah 100%.

Catatan: pada 7 pemda tahun 2025, pembagian Belanja Pegawai dan Barang/Jasa di berkas Fungsi berbeda
dari Ringkasan, tetapi totalnya tetap sama. Perbedaan ini tidak memengaruhi share fungsi.

## 3. Patahan klasifikasi 2022 → 2023

Dari 2022 ke 2023, 88% pemda serempak menurunkan share Pelayanan Umum, dan 85–89% menaikkan share
Ketertiban, Lingkungan Hidup, Perumahan, dan Perlindungan Sosial. Median IPS tahun itu 10,5 pp,
sekitar dua kali lipat tahun-tahun lain. Pergeseran sebesar ini lebih mungkin berasal dari perubahan
cara DJPK memetakan kegiatan ke fungsi (Kepmendagri 050) daripada keputusan 546 daerah sekaligus.

Penanganannya:
- Δshare dan IPS 2023 diberi tanda `patahan_klasifikasi`.
- Tren dihitung untuk dua periode, 2022–2026 dan 2023–2026.
- Klaster dilatih pada 2023–2026.
- Model prediksi juga boleh memakai periode 2023–2026.

## 4. Analisis (langkah 2)

| Ukuran | Rumus | Keterangan |
|---|---|---|
| Δshare | share(t) − share(t−1) | dalam poin persentase (pp) |
| Kemiringan tren | kemiringan regresi linear share terhadap tahun | pp/tahun. **Stabil** bila \|kemiringan\| < median \|kemiringan\| seluruh pemda-fungsi; di atas itu **naik** atau **turun** |
| IPS | ½ × Σ\|Δshare\| | 0 = struktur tidak berubah; 10 = 10% anggaran berpindah fungsi |
| Lonjakan IPS | z robust = (IPS − median) / (1,4826 × MAD) > 3 | dibandingkan dengan pemda setingkat pada tahun yang sama |
| CLR | ln(x_f / rata-rata geometrik x) | share < 0,01% diganti 0,01% supaya log tidak ekstrem |

**Klaster.** K-Means dijalankan di ruang CLR, terpisah untuk provinsi dan kab/kota. Jumlah klaster
(k = 2–6) dipilih otomatis lewat skor silhouette. Empat fungsi yang share-nya kecil (Ketertiban,
Lingkungan Hidup, Pariwisata, Perlindungan Sosial) digabung menjadi "Lainnya". Tanpa penggabungan
ini, klaster hanya memisahkan pemda yang anggaran Pariwisatanya hampir nol.

Hasil saat ini: k = 2 untuk kedua kelompok.
- Kab/kota terbagi menjadi "Ekonomi tinggi" dan "Pendidikan tinggi". Jumlah pemda di klaster
  Pendidikan naik dari 229 (2023) menjadi 350 (2026).
- Nama klaster diambil dari fungsi yang share-nya paling jauh di atas rata-rata kelompok.

## 5. Proyeksi eksploratif 2027–2028 (langkah 3)

Proyeksi dibuat di ruang CLR, lalu dikembalikan menjadi share yang **selalu berjumlah 100%**.

| Model | Cara kerja |
|---|---|
| naif (baseline) | share tahun depan = share tahun terakhir |
| tren_linear | garis tren tiap pemda diteruskan |
| tren_diredam | tren tiap pemda, kenaikannya dikurangi separuh setiap tahun |
| tren_kelompok | share terakhir + kemiringan median pemda setingkat |

**Backtest bergulir.** Model dilatih sampai tahun t−1 untuk menebak tahun t (2024, 2025, 2026).
Untuk setiap tingkat pemda, kombinasi model dan periode latih dengan MAE terkecil pada 2025–2026
dipilih otomatis.

| MAE (pp), rata-rata 2025–2026 | Kabupaten | Kota | Provinsi |
|---|---|---|---|
| naif (baseline) | 1,343 | **1,143** | **1,652** |
| tren_kelompok, latih 2023–2026 | **1,318** | 1,155 | 1,749 |
| tren_diredam, latih 2023–2026 | 1,539 | 1,292 | 1,891 |
| tren_linear, latih 2023–2026 | 1,865 | 1,553 | 2,300 |
| tren_linear, latih 2022–2026 | 2,795 | 2,965 | 3,101 |

Cara membacanya:
- **Kabupaten** memakai tren_kelompok, yang sedikit lebih baik dari baseline (selisih sekitar 2%).
- **Kota dan provinsi** memakai baseline naif, karena belum ada model yang lebih akurat. Dashboard
  menyatakan hal ini apa adanya.
- Tren per pemda (tren_linear) justru paling buruk. Dengan hanya 5 titik tahunan, pola masing-masing
  pemda terlalu berisik. Pola bersama antarpemda lebih bisa dipercaya.

**Rentang ketidakpastian.** Lebarnya sama dengan persentil 80 kesalahan backtest model terpilih,
dihitung per fungsi, lalu dikalikan √horizon (2028 lebih lebar dari 2027).

**Peringatan.** Proyeksi ini bersifat **eksploratif**. Proyeksi bisa patah bila batas belanja pegawai
30% dan belanja infrastruktur 40% (UU 1/2022 HKPD) direlaksasi lewat UU APBN 2027.

## 6. Berkas hasil (`data/processed/`)

| Berkas | Isi |
|---|---|
| `fakta_anggaran.parquet` | Tahun × pemda × fungsi: nilai anggaran, total belanja, share |
| `log_validasi.parquet` | Hasil pemeriksaan data |
| `share_fungsi.parquet` | Share (%) dan Δshare (pp) |
| `tren_fungsi.parquet` | Kemiringan dan kategori tren per periode |
| `ips_pergeseran.parquet` | IPS, z robust, penanda lonjakan |
| `klaster.parquet`, `klaster_centroid.parquet` | Klaster tiap pemda per tahun dan profil rata-rata klaster |
| `proyeksi.parquet` | Share 2027–2028 beserta batas bawah dan atas |
| `metrik_backtest.parquet` | MAE dan MAPE tiap model, periode, tingkat, dan fungsi |

Uji rumus ada di `pipeline/test_rumus.py` dan dijalankan dengan `python -m pytest pipeline`. Uji ini
mencakup:
- rumus share, Δshare, IPS, kemiringan, z robust, CLR, proyeksi, dan pemilihan model;
- satu uji atas data asli.

## 7. Peta choropleth

Batas wilayah memakai geoBoundaries Indonesia ADM2 versi disederhanakan: 519 wilayah, kondisi 2020, data
BPS/WFP/OCHA ROAP, lisensi CC BY 3.0 IGO. Detail sumber dan hash berkas ada di `data/peta/SUMBER.md`.

Pemekaran Papua 2022 tidak mengubah batas kabupaten/kota, sehingga data 2020 tetap sesuai.

`python -m pipeline.cocokkan_peta` mencocokkan nama wilayah peta ke kode DJPK:
- **Otomatis:** pencocokan nama tanpa awalan "Kab.", dengan spasi dan tanda baca diabaikan.
- **Manual:** 10 padanan untuk nama yang sudah berganti, misalnya Mamuju Utara → Pasangkayu, Maluku
  Tenggara Barat → Kepulauan Tanimbar, Toba Samosir → Toba, dan "Kota Baru" → Kab. Kotabaru.

Hasilnya 508 dari 508 kab/kota cocok satu-satu. Sebanyak 11 wilayah peta tidak punya APBD sendiri
(kota/kab administrasi DKI, danau, waduk, hutan) dan digambar abu-abu.

Pada mode klaster provinsi, setiap kab/kota diwarnai menurut klaster provinsinya, sehingga 4 provinsi baru Papua tetap
tergambar.
