import { bacaKode, CACHE_TAHUNAN } from "@/lib/api";
import { getDataUnduh } from "@/lib/data";
import { bacaFilter } from "@/lib/filter";

// GET /api/unduh?tahun=2026&tingkat=...&provinsi=...&fungsi=...  -> CSV sesuai filter aktif
//     /api/unduh?kode=11.01   -> semua tahun untuk satu pemda
//     /api/unduh?semua=1      -> semua tahun sesuai filter tingkat/provinsi/fungsi
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const filter = bacaFilter(params);
  const kode = bacaKode(params.get("kode"));
  const semua = params.get("semua") === "1";
  const baris = await getDataUnduh(filter, kode, semua);

  const kolom = baris.length ? Object.keys(baris[0]) : ["tahun"];
  const sel = (v: unknown) => (v === null || v === undefined ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const csv = [kolom.join(","), ...baris.map((b) => kolom.map((k) => sel(b[k])).join(","))].join("\n");
  const nama = kode ? `pemda_${kode}` : semua ? "semua_tahun" : String(filter.tahun);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="anggaran_apbd_${nama}.csv"`,
      ...CACHE_TAHUNAN,
    },
  });
}
