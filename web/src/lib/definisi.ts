// Penjelasan singkat istilah. Ditampilkan sebagai popover di samping judul grafik,
// dan dikumpulkan juga di halaman Data & Metodologi.

export const DEFINISI = {
  share: {
    judul: "Share anggaran",
    rumus: "anggaran fungsi ÷ total belanja",
    isi: "Porsi belanja daerah untuk satu fungsi. Jumlah 9 fungsi selalu 100%. Untuk gabungan banyak daerah, anggarannya dijumlah dulu baru dibagi.",
  },
  delta: {
    judul: "Perubahan share (pp)",
    rumus: "share tahun ini − share tahun lalu",
    isi: "Dalam poin persen. +2 pp artinya porsinya bertambah 2 dari 100. Angka 2023 sebagian karena DJPK mengubah cara memetakan kegiatan ke fungsi.",
  },
  ips: {
    judul: "Indeks pergeseran (IPS)",
    rumus: "½ × Σ |perubahan share|",
    isi: "Seberapa banyak anggaran pindah antarfungsi dibanding tahun lalu. IPS 10 berarti 10% anggaran berpindah. Disebut lonjakan kalau jauh di atas daerah setingkat (z robust > 3).",
  },
  tren: {
    judul: "Kemiringan tren",
    rumus: "kemiringan garis regresi share terhadap tahun",
    isi: "Rata-rata naik atau turunnya share per tahun. Disebut stabil kalau geraknya lebih kecil dari separuh daerah lain.",
  },
  klaster: {
    judul: "Klaster",
    rumus: "K-Means pada log-rasio share (CLR)",
    isi: "Daerah dikelompokkan menurut kemiripan komposisi belanjanya. Jumlah kelompok dipilih otomatis lewat skor silhouette; fungsi yang porsinya kecil digabung jadi “Lainnya”.",
  },
  proyeksi: {
    judul: "Proyeksi",
    rumus: "model dengan galat backtest terkecil",
    isi: "Model dilatih dengan data sampai tahun sebelumnya lalu dicocokkan dengan tahun berikutnya. Yang paling tepat dipakai. Gambaran arah, bukan target.",
  },
  pendidikan: {
    judul: "Acuan 20% pendidikan",
    rumus: "share fungsi pendidikan vs 20%",
    isi: "Pembanding kasar saja, bukan audit. Kewajiban 20% dihitung dari penandaan kegiatan, sedangkan angka ini dari klasifikasi fungsi.",
  },
  validasi: {
    judul: "Validasi",
    rumus: "Σ 9 fungsi − belanja daerah di Ringkasan",
    isi: "Tiap daerah dan tahun dicek ke berkas Ringkasan APBD. Lolos kalau selisihnya ≤ 0,01% atau ≤ Rp10.000.",
  },
} as const;

export type KunciDefinisi = keyof typeof DEFINISI;
