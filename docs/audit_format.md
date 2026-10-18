# Audit Format Data Mentah DJPK (APBD 2022–2026)

Milestone 1. Tanggal audit: 18 Oktober 2026. Sumber: `data/raw/{2022..2026}/`, dua berkas per tahun
(Belanja per Fungsi dan APBD Ringkas), status **Anggaran**.

Semua angka di laporan ini bisa direproduksi dengan:

```bash
python -m pipeline.audit
```

Skrip ini membaca berkas sesuai `pipeline/config/schema_map.yaml`, lalu gagal (exit 1) bila header,
jumlah pemda, kecocokan wide vs long, atau total terhadap Ringkasan tidak sesuai. Berkas mentah tidak
pernah diubah.

---

## 1. Kesimpulan utama

1. **Tahun yang berbeda adalah 2022**, di kedua berkas:
   - **Belanja Fungsi 2022** hanya punya satu sheet (`Sheet3`). Tidak ada sheet `Datarow` (long),
     `Mandatory Spending`, atau tagging. Header ditulis `Kode Pemda`/`Nama Pemda` (tahun lain
     `Kodepemda`/`Namapemda`). Label fungsi tidak memakai nol di depan (`1. Pelayanan Umum`, bukan
     `01.`). Dua nama juga berbeda: fungsi 05 ditulis `Lingkungan Hidup` (tahun lain
     `Perlindungan Lingkungan Hidup`) dan jenis 52 ditulis `Belanja Barang Jasa`.
   - **Ringkas 2022** memakai **kode akun 3 digit** (`411.`, `511. Belanja Pegawai`, `624.`), sedangkan
     2023+ memakai 4 digit (`4101.`, `5101.`, `6204.`). Konversinya: `abc → ab0c`. Ringkas 2022 juga
     tidak punya sheet long.
   - **Cakupan pemda 2022 = 542** (34 provinsi), tahun lain 546 (38 provinsi). Ini terjadi karena
     pemekaran Papua berlaku mulai APBD 2023, dan 26 kabupaten/kota berganti kode (lihat §5).
2. **Satuan sama di semua tahun: Rupiah penuh.** Contohnya, Pendapatan Provinsi Aceh 2022 tercatat
   13.352.983.387.589 (≈ Rp13,35 T). Tidak ada berkas dalam ribuan atau jutaan. Ada nilai berdesimal
   (sen), terbanyak di 2026 (2.473 sel), dan nilainya tetap Rupiah.
3. **Hanya 9 dari 11 fungsi yang muncul.** Fungsi **02 Pertahanan** dan **09 Agama** tidak punya kolom
   maupun baris di kelima tahun, jadi nilainya bukan nol melainkan memang tidak tersedia (lihat §6).
4. **Total fungsi = total Belanja Daerah di Ringkasan, tepat.** Selisih maksimum 0,0000% di semua pemda
   dan tahun. Selisih absolut terbesar Rp1.252 (2025, akibat pembulatan sen). Toleransi awal 0,5%
   karenanya terlalu longgar (lihat §7).
5. **Ada indikasi patahan klasifikasi antara 2022 dan 2023** (lihat §8). Ini temuan terpenting untuk
   analitik dan model prediksi.

## 2. Inventaris berkas dan sheet

| Tahun | Berkas Fungsi | Sheet | Berkas Ringkas | Sheet |
|---|---|---|---|---|
| 2022 | `Anggaran-Belanja-Fungsi_2022.xlsx` (tanda hubung) | `Sheet3` (wide) | `Anggaran_APBD_Ringkas_2022.xlsx` | `APBD 2022_FINAL` (wide) |
| 2023 | `Anggaran_Belanja_Fungsi_2023.xlsx` | `Fungsi_Kepmen050`, `Datarow Fungsi_Kepmen050`, `Mandatory Spending`, `Datarow Mandatory Spending` | `Anggaran_APBD_Ringkas_2023.xlsx` | `Sheet2` (wide), `Sheet1` (long) |
| 2024 | `Anggaran_Belanja_Fungsi_2024.xlsx` | `Datarow Fungsi Kepmen`, `Fungsi Kepmen`, `Datarow Mandatory Spending`, `Mandatory Spending` | `Anggaran_APBD_Ringkas_2024.xlsx` | `Sheet2` (wide), `Sheet1` (long) |
| 2025 | `Anggaran_Belanja_Fungsi_2025.xlsx` | `Fungsi Kepmen`, `␣Datarow Fungsi Kepmen` (spasi di depan), `Mandatory Spending`, `Datarow Mandatory Spending` | `Anggaran_APBD_Ringkas_2025.xlsx` | `Tabel` (wide), `PIVOT`, `RAW` (long sampai level objek), `Ref Mapping Pajak` |
| 2026 | `Anggaran_Belanja_Fungsi_2026.xlsx` | `Datarow Fungsi Kepmen`, `Fungsi Kepmen`, `Datarow Mandatory Spending`, `Mandatory Spending` | `Anggaran_APBD_Ringkas_2026.xlsx` | `Tabel` (wide), `Pvt`, `Raw` (long) |

Tanggal cetak data: Fungsi 2022 "Per 22 Agustus 2022" sedangkan Ringkas 2022 "09 Juni 2022". Totalnya
tetap identik. Tanggal tahun lainnya: 12 Mei 2023, 4 Juli 2024, 18 Sep 2025 (Fungsi) / 28 Mei 2025
(Ringkas), dan 6 Agustus 2026.

## 3. Perbandingan struktur Belanja per Fungsi

Sheet wide punya tata letak yang **identik di kelima tahun**. Karena itu sheet ini dipakai sebagai
sumber utama dengan satu parser.

| Atribut | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|
| Sheet wide | `Sheet3` | `Fungsi_Kepmen050` | `Fungsi Kepmen` | `Fungsi Kepmen` | `Fungsi Kepmen` |
| Baris judul / tanggal / "Jumlah: N daerah" | 1 / 2 / 3 | sama | sama | sama | sama |
| Baris header fungsi (sel gabungan 4 kolom) | 5 | 5 | 5 | 5 | 5 |
| Baris header jenis | 6 | 6 | 6 | 6 | 6 |
| Baris data pertama | 7 | 7 | 7 | 7 | 7 |
| Kolom | A kode, B nama, C–AL = 9 fungsi × 4 jenis | sama | sama | sama | sama |
| Header kode/nama | **`Kode Pemda` / `Nama Pemda`** | `Kodepemda` / `Namapemda` | sama | sama | sama |
| Format label fungsi | **`1.` … `11.`** | `01.` … `11.` | sama | sama | sama |
| Nama fungsi 05 | **Lingkungan Hidup** | Perlindungan Lingkungan Hidup | sama | sama | sama |
| Nama jenis 52 | **Belanja Barang Jasa** | Belanja Barang dan Jasa | sama | sama | sama |
| Sheet long (`Datarow`) | **tidak ada** | ada | ada | ada (nama sheet berawalan spasi) | ada |
| Nama kolom fungsi di long | – | `StandarfungsiKepmen` | `StandarfungsiKepmen` | `Standarfungsikepmen (group)` | `Standarfungsikepmenfinal` |
| Nama kolom jenis di long | – | `AkunAnalisismap` | `Akunanalisis` | `AkunAnalisismap` | `AkunAnalisis` |
| Jumlah pemda | **542** | 546 | 546 | 546 | 546 |
| Sel kosong (= 0) | 3.953 | 2.185 | 2.308 | 2.458 | 2.810 |
| Wide vs long, selisih maks per pemda | – | Rp0 | Rp0 | Rp0 | Rp0 |
| Baris total/subtotal | tidak ada | tidak ada | tidak ada | tidak ada | tidak ada |

Hal yang perlu dibersihkan:
- **Kode pemda harus dibaca sebagai teks.** Tanpa `dtype=str/object`, pandas mengubah `"01.10"` menjadi
  `1.1` (terbukti di sheet `Datarow` 2023). Formatnya selalu `NN.NN` (5 karakter), dan provinsi
  berakhiran `.00`.
- 2025 `Datarow`: baris pertama tidak berurutan dan ada kunci ganda (`11.00`, Ekonomi, jenis 52, dua
  baris). Kedua baris harus **dijumlahkan**, bukan dibuang. Sheet wide sudah berisi jumlahnya.
- 2026 `Datarow`: label `03. Ketertiban Dan Keamanan` dan `03. Ketertiban dan Keamanan` muncul
  bersamaan. Normalisasi casefold sudah menyelesaikannya.
- Ada nilai janggal > 0 tetapi < Rp1.000, total 12 sel, misalnya Rp2 di Kab. Bogor 2025 fungsi 05 dan
  beberapa sel Kab. Nias Selatan (`02.22`). Nilai ini dipertahankan dan dicatat sebagai anomali karena
  dampaknya ke share tidak berarti.
- Tidak ada nilai negatif.

## 4. Perbandingan struktur APBD Ringkas

Orientasinya terbalik: **akun di baris, pemda di kolom.** Baris 4 berisi kode pemda dan baris 5 berisi
nama pemda.

| Atribut | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|
| Sheet utama | `APBD 2022_FINAL` | `Sheet2` | `Sheet2` | `Tabel` | `Tabel` |
| Sel gabungan header | A4:A6 | A4:A6 | A4:A5 | A4:A5 | A4:A5 |
| Baris data pertama | **7** (baris 6 kosong) | **7** | 6 | 6 | 6 |
| Skema kode akun | **3 digit** (`511.`) | 4 digit (`5101.`) | 4 digit | 4 digit | 4 digit |
| Gaya label | Title case, `41. PAD` disingkat | berindentasi spasi + spasi ganda | KAPITAL untuk utama/kelompok | KAPITAL | KAPITAL |
| Kolom tambahan | – | – | – | **`Grand Total`** (wajib dibuang) | – |
| Akun `4302 Dana Darurat` | ada | ada | tidak ada | ada | tidak ada |
| Sheet long | **tidak ada** | `Sheet1` (level jenis) | `Sheet1` (+kolom `Tahun`) | `RAW` (level objek, 197 objek) | `Raw` (level jenis) |
| Label total belanja | `5. Belanja Daerah` | `5. Belanja Daerah` | `5. BELANJA DAERAH` | `5. BELANJA DAERAH` | `5. BELANJA DAERAH` |

Aturan baca: label di-trim dan spasinya disatukan, lalu dipecah dengan regex `^(\d+)\.\s*(.*)$`.
Kode 3 digit 2022 dikonversi ke 4 digit, dan kolom header yang bukan `NN.NN` ditolak kecuali tercantum
di `kolom_dibuang`. Ketiadaan akun Dana Darurat di beberapa tahun tidak memengaruhi total belanja.

## 5. Kode pemda dan panel tidak seimbang

| Transisi | Kode hilang | Kode baru | Penyebab |
|---|---|---|---|
| 2022 → 2023 | 26 | 30 | Pemekaran Papua: 4 provinsi baru (35.00 Papua Selatan, 36.00 Papua Tengah, 37.00 Papua Pegunungan, 38.00 Papua Barat Daya). 20 kab. dari Papua (26.xx) dan 6 kab./kota dari Papua Barat (32.xx) pindah kode. |
| 2023 → 2026 | 0 | 0 | Stabil, 546 pemda. |

- Jumlah kabupaten (415) dan kota (93) **sama** di 2022 dan 2023. Yang berubah hanya provinsi induk dan
  kode. Kab./kota yang pindah tetap diperlakukan sebagai entitas yang sama dengan **kode baku = kode
  2023+**. Peta lengkap 26 kode ada di `schema_map.yaml → pemekaran_papua.kode_lama_ke_baru`.
- **Panel tidak seimbang:** `26.00` Papua dan `32.00` Papua Barat tetap ada di 2022 tetapi wilayahnya
  menyusut mulai 2023, sehingga share-nya tidak sebanding. Empat provinsi baru tidak punya data 2022.
  Keenamnya diberi penanda `panel_seimbang = false`.
- Varian nama pada kode yang sama: Toba Samosir → Toba, Limapuluh Kota ↔ Lima Puluh Kota (berganti
  bolak-balik pada 2025), Batanghari → Batang Hari, Sangihe → Kepulauan Sangihe, Baubau ↔ Bau-bau.
  Nama kanonik dicatat di `schema_map.yaml → nama_kanonik`.
- Tingkat pemda ditentukan dari kode berakhiran `.00` (provinsi), awalan `Kab.` (kabupaten), dan awalan
  `Kota` (kota). Tidak ada pemda di luar ketiga pola ini.

## 6. Fungsi Pertahanan (02) dan Agama (09)

Hasil pengecekan: kedua fungsi **tidak ada sama sekali** di data 2022–2026, baik di sheet wide maupun
long. Ini konsisten dengan pembagian urusan: pertahanan dan agama adalah urusan absolut pemerintah
pusat.

**Usulan keputusan (perlu persetujuan):** kamus tetap memuat 11 fungsi baku agar sesuai klasifikasi
DJPK, tetapi 02 dan 09 ditandai `aktif: false`. Share dan semua analitik dihitung atas **9 fungsi
aktif** yang jumlahnya 100%. Tidak dibuat baris bernilai nol untuk 02/09, karena nol buatan akan
mengganggu transformasi CLR dan K-Means.

Fungsi yang bisa bernilai nol pada pemda tertentu adalah Pariwisata (58 pemda di 2022, 3–10 pemda di
2023–2026) serta LH dan Perumahan (masing-masing 4 pemda, hanya di 2022). Fungsi-fungsi inilah yang
butuh penggantian nilai kecil sebelum CLR.

## 7. Validasi total dan kalibrasi toleransi

| Tahun | Pemda | Selisih maks (%) | Selisih maks (Rp) | Total Belanja Daerah (Rp T) |
|---|---|---|---|---|
| 2022 | 542 | 0,0000 | 1 | 1.200,87 |
| 2023 | 546 | 0,0000 | 0 | 1.278,15 |
| 2024 | 546 | 0,0000 | 0,002 | 1.382,33 |
| 2025 | 546 | 0,0000 | 1.252 | 1.399,99 |
| 2026 | 546 | 0,0000 | 0,004 | 1.249,31 |

Berkas Fungsi dan Ringkasan tampaknya diturunkan dari basis data DJPK yang sama, sehingga validasi
"jumlah fungsi = total belanja" hampir pasti lulus. **Usulan:** lulus bila selisih ≤ 0,01% **atau**
≤ Rp10.000. Toleransi 0,5% hanya dipakai sebagai batas peringatan. Validasi yang benar-benar informatif
di milestone 2 adalah:
- jumlah pemda = angka "Jumlah: N daerah" di judul sheet,
- wide = long per pemda (2023–2026),
- jumlah jenis 51–54 di berkas Fungsi dibandingkan akun Ringkasan (51 Operasi + 52 Modal + 53 BTT +
  54 Transfer). Pengelompokan jenisnya berbeda, jadi yang dicek hanya totalnya.

## 8. Indikasi patahan klasifikasi 2022 → 2023 (penting untuk analitik)

Median share per fungsi (semua pemda):

| Fungsi | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|
| 01 Pelayanan Umum | **38,01** | 32,19 | 33,11 | 31,66 | 30,46 |
| 03 Ketertiban & Keamanan | **0,40** | 1,20 | 1,23 | 1,34 | 1,36 |
| 05 Lingkungan Hidup | **0,63** | 1,53 | 1,44 | 1,42 | 1,34 |
| 06 Perumahan & Fasum | **1,14** | 2,89 | 2,48 | 2,38 | 2,01 |
| 11 Perlindungan Sosial | **0,30** | 0,87 | 0,83 | 0,85 | 0,79 |

Arah perubahan **serempak** dari 2022 ke 2023: 88% pemda menurunkan share Pelayanan Umum, dan 85–89%
menaikkan share 03/05/06/11. Pada transisi tahun lain, proporsinya 30–70%. Median IPS 2022→2023 =
**10,5 pp**, sekitar dua kali lipat transisi lain (4,6–6,0 pp).

Pergeseran sebesar dan seserempak ini lebih mungkin berasal dari perubahan pemetaan kegiatan ke fungsi
daripada keputusan kebijakan 546 daerah sekaligus. Nama sheet 2023 secara eksplisit merujuk Kepmendagri
050 (`Fungsi_Kepmen050`), sedangkan 2022 tidak. Dugaan ini belum bisa dipastikan dari data saja dan
perlu dikonfirmasi ke dokumentasi DJPK.

Dampak dan usulan penanganan (perlu persetujuan):
- Δshare dan IPS 2023 diberi penanda `patahan_klasifikasi = true` dan ditampilkan dengan catatan.
- Lonjakan IPS (z-score robust > 3) dihitung **dalam tahun yang sama antarpemda**, bukan antartahun.
  Dengan begitu 2023 tidak otomatis menandai hampir semua pemda.
- Kemiringan tren dan model prediksi dijalankan dalam dua varian, **2022–2026** dan **2023–2026**. Origin
  backtest pertama (latih 2022–2023 → prediksi 2024) dilaporkan terpisah karena terkontaminasi patahan
  ini.

## 9. Skema baku hasil standardisasi

Satu baris per `tahun × kode_pemda × kode_fungsi × kode_jenis`:

| Kolom | Tipe | Sumber / aturan |
|---|---|---|
| `tahun` | int16 | dari peta tahun |
| `kode_pemda` | str `NN.NN` | kode baku 2023+, 2022 dipetakan via `pemekaran_papua` |
| `nama_pemda` | str | nama kanonik |
| `tingkat` | provinsi/kabupaten/kota | aturan §5 |
| `provinsi_induk` | str `NN.00` | provinsi pada tahun tsb |
| `kode_fungsi` | str `01`–`11` | label → kode via kamus + alias |
| `nama_fungsi` | str | nama baku |
| `kode_jenis` | str `51`–`54` | label → kode via kamus + alias |
| `nilai_anggaran` | float64 (Rp) | sel kosong → 0, × `faktor_satuan` (= 1) |

Agregasi milestone 2 akan menjumlahkan `kode_jenis` menjadi satu baris per tahun × pemda × fungsi.

## 10. Data tambahan yang tersedia (opsional)

- **Tagging mandatory spending** (2023–2026): 2023 berisi Kesehatan, Pendidikan, dan gabungan keduanya.
  2024–2025 berisi Kesehatan dan Pendidikan. 2026 **hanya Pendidikan** ("belanja kesehatan sudah bukan
  termasuk belanja wajib"). Indikator pendidikan 20% di Profil Daerah bisa memakai **fungsi 10** (semua
  tahun, berlabel indikatif) dan menampilkan tagging pendidikan sebagai pembanding untuk 2023+.
- **Ringkas akun 5101 Belanja Pegawai** tersedia di semua tahun. Rasio belanja pegawai terhadap total
  belanja relevan untuk konteks batas 30% UU HKPD dan peringatan proyeksi 2027.
