import { PERIODE, type Periode } from "@/lib/data";

// Data anggaran berubah setahun sekali: boleh di-cache CDN sehari, disajikan basi s.d. seminggu.
export const CACHE_TAHUNAN = { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" };

export function jsonTahunan(data: unknown, status = 200) {
  return Response.json(data, { status, headers: CACHE_TAHUNAN });
}

/** Parameter khusus halaman (di luar filter global). */
export function bacaPeriode(v: string | null | undefined): Periode {
  return (PERIODE as readonly string[]).includes(v ?? "") ? (v as Periode) : "2023-2026";
}

export function bacaKode(v: string | null | undefined): string | null {
  return v && /^\d{2}\.\d{2}$/.test(v) ? v : null;
}
