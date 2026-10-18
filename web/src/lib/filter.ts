// Filter global yang disimpan di URL: ?tahun=2026&tingkat=kabupaten&provinsi=11.00&fungsi=10
// Dipakai bersama oleh server (halaman, API) dan client (filter bar).

export const DAFTAR_TAHUN = [2022, 2023, 2024, 2025, 2026] as const;
export const TAHUN_TERAKHIR = 2026;
export const DAFTAR_TINGKAT = ["provinsi", "kabupaten", "kota"] as const;

export type Tingkat = (typeof DAFTAR_TINGKAT)[number];

export type Filter = {
  tahun: number;
  tingkat: Tingkat | null; // null = semua tingkat
  provinsi: string | null; // kode "NN.00", null = semua provinsi
  fungsi: string | null; // kode "01".."11", null = semua fungsi
};

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

function ambil(params: Params, kunci: string): string | undefined {
  const v = params instanceof URLSearchParams ? params.get(kunci) : params[kunci];
  return (Array.isArray(v) ? v[0] : v) ?? undefined;
}

export function bacaFilter(params: Params): Filter {
  const tahun = Number(ambil(params, "tahun"));
  const tingkat = ambil(params, "tingkat");
  const provinsi = ambil(params, "provinsi");
  const fungsi = ambil(params, "fungsi");
  return {
    tahun: (DAFTAR_TAHUN as readonly number[]).includes(tahun) ? tahun : TAHUN_TERAKHIR,
    tingkat: (DAFTAR_TINGKAT as readonly string[]).includes(tingkat ?? "") ? (tingkat as Tingkat) : null,
    provinsi: provinsi && /^\d{2}\.00$/.test(provinsi) ? provinsi : null,
    fungsi: fungsi && /^\d{2}$/.test(fungsi) ? fungsi : null,
  };
}

/** Query string untuk tautan, supaya filter ikut terbawa antarhalaman. */
export function keQuery(filter: Partial<Filter>): string {
  const q = new URLSearchParams();
  if (filter.tahun && filter.tahun !== TAHUN_TERAKHIR) q.set("tahun", String(filter.tahun));
  if (filter.tingkat) q.set("tingkat", filter.tingkat);
  if (filter.provinsi) q.set("provinsi", filter.provinsi);
  if (filter.fungsi) q.set("fungsi", filter.fungsi);
  const s = q.toString();
  return s ? `?${s}` : "";
}
