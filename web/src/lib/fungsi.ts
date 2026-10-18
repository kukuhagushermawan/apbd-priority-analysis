// Nama fungsi dan pengelompokan untuk grafik komposisi.
// Grafik komposisi memakai 5 fungsi utama + "Lainnya" (03, 05, 08, 11 digabung)
// karena warna kategori dibatasi agar tetap terbaca (termasuk buta warna).

export const NAMA_FUNGSI: Record<string, string> = {
  "01": "Pelayanan Umum",
  "03": "Ketertiban dan Keamanan",
  "04": "Ekonomi",
  "05": "Perlindungan Lingkungan Hidup",
  "06": "Perumahan dan Fasilitas Umum",
  "07": "Kesehatan",
  "08": "Pariwisata",
  "10": "Pendidikan",
  "11": "Perlindungan Sosial",
};

// Urutan eksplisit: Object.keys menaruh "10"/"11" di depan karena dianggap angka
export const FUNGSI_AKTIF = ["01", "03", "04", "05", "06", "07", "08", "10", "11"];

export const GRUP_GRAFIK = [
  { kode: "01", nama: "Pelayanan Umum" },
  { kode: "04", nama: "Ekonomi" },
  { kode: "06", nama: "Perumahan dan Fasilitas Umum" },
  { kode: "07", nama: "Kesehatan" },
  { kode: "10", nama: "Pendidikan" },
  { kode: "LN", nama: "Fungsi lainnya" },
] as const;

export function grupGrafik(kodeFungsi: string): string {
  return ["01", "04", "06", "07", "10"].includes(kodeFungsi) ? kodeFungsi : "LN";
}

/** "K1 · Pendidikan tinggi" -> "Porsi pendidikan tinggi" */
export function namaKlaster(nama: string): string {
  const inti = nama.split("· ")[1] ?? nama;
  return `Porsi ${inti.toLowerCase()}`;
}
