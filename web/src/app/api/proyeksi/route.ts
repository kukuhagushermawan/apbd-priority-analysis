import { bacaKode, jsonTahunan } from "@/lib/api";
import { getProyeksi } from "@/lib/data";
import { bacaFilter } from "@/lib/filter";

// GET /api/proyeksi?fungsi=10&kode=11.01   (tanpa kode: median pemda sesuai filter)
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const filter = bacaFilter(params);
  return jsonTahunan(await getProyeksi(filter, filter.fungsi ?? "10", bacaKode(params.get("kode"))));
}
