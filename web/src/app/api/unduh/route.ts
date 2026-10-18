import { getDataUnduh } from "@/lib/data";
import { bacaFilter } from "@/lib/filter";

// GET /api/unduh?tahun=2026&tingkat=...&provinsi=...&fungsi=...  -> CSV sesuai filter aktif
export async function GET(request: Request) {
  const filter = bacaFilter(new URL(request.url).searchParams);
  const baris = await getDataUnduh(filter);
  const kolom = baris.length ? Object.keys(baris[0]) : ["tahun"];
  const sel = (v: unknown) => (v === null || v === undefined ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const csv = [kolom.join(","), ...baris.map((b) => kolom.map((k) => sel(b[k])).join(","))].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="anggaran_apbd_${filter.tahun}.csv"`,
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
