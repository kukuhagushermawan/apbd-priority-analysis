// Palet: biru tua UGM bertingkat + kuning emas sebagai sorotan.
// Kategori dibedakan oleh terang-gelapnya, bukan hanya rona, agar tetap terbaca bagi buta warna.
export const NAVY = "#0b2d5b";
export const EMAS = "#f5b800";
export const ORANYE = "#d9622b";

export const WARNA_KOMPONEN: Record<string, string> = {
  "01": NAVY, // Pelayanan umum
  "10": EMAS, // Pendidikan
  "07": "#3e6aa8", // Kesehatan
  "04": "#8fa8cf", // Ekonomi
  LN: "#c9d6ea", // Lainnya
  "06": "#e1e8f2", // Perumahan & fasum
};

// Untuk 2-4 seri (Bandingkan): gelap, emas, oranye, biru muda
export const WARNA_SERI = [NAVY, EMAS, ORANYE, "#8fa8cf", "#3e6aa8", "#c9d6ea"];

/** Warna klaster mengikuti maknanya, sama di semua halaman dan di peta. */
export function warnaKlaster(nama: string, i = 0): string {
  if (nama.includes("Pendidikan")) return NAVY;
  if (nama.includes("Ekonomi")) return EMAS;
  return WARNA_SERI[(i + 2) % WARNA_SERI.length];
}

export const ABU = "#c9d6ea";
export const TEKS = "#5f6573";
export const GRID = "#edf0f5";
