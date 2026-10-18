import { bacaPeriode, jsonTahunan } from "@/lib/api";
import { getTren } from "@/lib/data";
import { bacaFilter } from "@/lib/filter";

// GET /api/tren?fungsi=10&periode=2023-2026&tingkat=...&provinsi=...
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const filter = bacaFilter(params);
  return jsonTahunan(await getTren(filter, filter.fungsi ?? "10", bacaPeriode(params.get("periode"))));
}
