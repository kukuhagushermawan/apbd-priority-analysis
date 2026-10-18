// Penjelasan singkat istilah. Ditampilkan sebagai popover di samping judul grafik,
// dan dikumpulkan juga di halaman Data dan Metodologi.

export const DEFINISI = {
  share: {
    judul: "Porsi anggaran (share)",
    rumus: "anggaran fungsi ÷ total belanja × 100%",
    isi: "Persentase belanja daerah yang dialokasikan untuk satu fungsi. Jumlah porsi sembilan fungsi selalu 100%. Untuk gabungan beberapa daerah, anggaran dijumlahkan terlebih dahulu, kemudian dibagi dengan total belanja.",
  },
  delta: {
    judul: "Perubahan porsi (pp)",
    rumus: "porsi tahun ini − porsi tahun sebelumnya",
    isi: "Dinyatakan dalam poin persentase (pp). Nilai +2 pp berarti porsi fungsi tersebut bertambah 2 poin dari 100. Sebagian perubahan tahun 2023 disebabkan oleh perubahan cara DJPK memetakan kegiatan ke fungsi.",
  },
  ips: {
    judul: "Indeks pergeseran (IPS)",
    rumus: "½ × Σ |perubahan porsi|",
    isi: "Besarnya anggaran yang berpindah antarfungsi dibandingkan dengan tahun sebelumnya. IPS 10 berarti 10% anggaran berpindah fungsi. Suatu daerah dikategorikan melonjak apabila nilainya jauh di atas daerah setingkat (z-score robust > 3).",
  },
  tren: {
    judul: "Kemiringan tren",
    rumus: "kemiringan garis regresi porsi terhadap tahun",
    isi: "Rata-rata kenaikan atau penurunan porsi per tahun. Suatu daerah dikategorikan stabil apabila perubahannya lebih kecil daripada separuh daerah lainnya.",
  },
  klaster: {
    judul: "Klaster (kelompok daerah)",
    rumus: "K-Means pada log-rasio porsi (CLR)",
    isi: "Daerah dikelompokkan berdasarkan kemiripan komposisi belanjanya. Jumlah kelompok ditentukan secara otomatis melalui skor silhouette, sedangkan fungsi dengan porsi kecil digabungkan menjadi “Fungsi lainnya”.",
  },
  proyeksi: {
    judul: "Proyeksi",
    rumus: "model dengan galat uji mundur (backtest) terkecil",
    isi: "Model dilatih dengan data hingga tahun sebelumnya, kemudian diuji terhadap data tahun berikutnya. Model dengan galat terkecil digunakan. Hasil proyeksi merupakan gambaran arah, bukan target.",
  },
  pendidikan: {
    judul: "Acuan 20% fungsi pendidikan",
    rumus: "porsi fungsi pendidikan dibandingkan dengan 20%",
    isi: "Acuan ini hanya pembanding kasar dan bukan hasil audit. Kewajiban 20% dihitung berdasarkan penandaan kegiatan, sedangkan angka ini berasal dari klasifikasi fungsi.",
  },
  validasi: {
    judul: "Validasi data",
    rumus: "Σ sembilan fungsi − belanja daerah pada Ringkasan APBD",
    isi: "Setiap daerah dan tahun dicocokkan dengan berkas Ringkasan APBD. Data dinyatakan lolos apabila selisihnya ≤ 0,01% atau ≤ Rp10.000.",
  },
} as const;

export type KunciDefinisi = keyof typeof DEFINISI;
