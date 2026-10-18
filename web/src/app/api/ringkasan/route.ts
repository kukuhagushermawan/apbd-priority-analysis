import { jsonTahunan } from "@/lib/api";
import { getRingkasan } from "@/lib/data";
import { bacaFilter } from "@/lib/filter";

// GET /api/ringkasan?tahun=2026&tingkat=kabupaten&provinsi=11.00
export async function GET(request: Request) {
  return jsonTahunan(await getRingkasan(bacaFilter(new URL(request.url).searchParams)));
}
