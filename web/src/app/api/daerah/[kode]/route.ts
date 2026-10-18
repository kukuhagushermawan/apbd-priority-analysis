import { jsonTahunan } from "@/lib/api";
import { getProfil } from "@/lib/data";

// GET /api/daerah/11.01  -> profil satu pemda (komposisi, median tingkat, klaster, IPS)
export async function GET(_request: Request, { params }: RouteContext<"/api/daerah/[kode]">) {
  const profil = await getProfil((await params).kode);
  return profil ? jsonTahunan(profil) : jsonTahunan({ galat: "Pemda tidak ditemukan" }, 404);
}
