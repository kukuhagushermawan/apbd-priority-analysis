import { jsonTahunan } from "@/lib/api";
import { getKlaster } from "@/lib/data";
import { bacaFilter } from "@/lib/filter";

// GET /api/klaster?kelompok=kabkota&dari=2023&provinsi=...
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kelompok = params.get("kelompok") === "provinsi" ? "provinsi" : "kabkota";
  const dari = params.get("dari") === "2022" ? 2022 : 2023;
  return jsonTahunan(await getKlaster(kelompok, dari, { ...bacaFilter(params), tingkat: null }));
}
