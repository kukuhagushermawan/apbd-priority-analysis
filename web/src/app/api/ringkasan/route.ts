import { getRingkasan } from "@/lib/data";
import { bacaFilter } from "@/lib/filter";

// GET /api/ringkasan?tahun=2026&tingkat=kabupaten&provinsi=11.00
// Data anggaran tahunan -> boleh di-cache CDN sehari, disajikan basi s.d. seminggu.
export async function GET(request: Request) {
  const filter = bacaFilter(new URL(request.url).searchParams);
  const data = await getRingkasan(filter);
  return Response.json(data, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
}
