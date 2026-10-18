import { jsonTahunan } from "@/lib/api";
import { getPergeseran } from "@/lib/data";
import { bacaFilter } from "@/lib/filter";

// GET /api/pergeseran?tahun=2025&fungsi=07&tingkat=...&provinsi=...
export async function GET(request: Request) {
  const filter = bacaFilter(new URL(request.url).searchParams);
  return jsonTahunan(await getPergeseran(filter, filter.fungsi ?? "01"));
}
