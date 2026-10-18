// Kueri database. Data APBD berubah setahun sekali, jadi hasil kueri di-cache
// selama seminggu ('use cache' + cacheLife) dan dipakai bersama oleh halaman & API.
import { cacheLife } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { DAFTAR_TAHUN, type Filter } from "@/lib/filter";
import { FUNGSI_AKTIF, GRUP_GRAFIK, grupGrafik, NAMA_FUNGSI } from "@/lib/fungsi";

/** WHERE untuk filter tingkat & provinsi (p = dim_pemda). Provinsi memakai induk terkini. */
function wherePemda(f: Pick<Filter, "tingkat" | "provinsi">) {
  return Prisma.sql`WHERE TRUE
    ${f.tingkat ? Prisma.sql`AND p.tingkat = ${f.tingkat}` : Prisma.empty}
    ${f.provinsi ? Prisma.sql`AND p.provinsi_induk = ${f.provinsi}` : Prisma.empty}`;
}

export async function getDaftarProvinsi() {
  "use cache";
  cacheLife("weeks");
  return prisma.dim_pemda.findMany({
    where: { tingkat: "provinsi" },
    select: { kode_pemda: true, nama_pemda: true },
    orderBy: { nama_pemda: "asc" },
  });
}

export type Ringkasan = Awaited<ReturnType<typeof getRingkasan>>;

export async function getRingkasan(filter: Filter) {
  "use cache";
  cacheLife("weeks");
  const where = wherePemda(filter);

  // 1. Nilai anggaran per tahun x fungsi -> share agregat (Σ fungsi / Σ total belanja)
  const baris = await prisma.$queryRaw<{ tahun: number; kode_fungsi: string; nilai: number; n_pemda: number }[]>`
    SELECT f.tahun, f.kode_fungsi, SUM(f.nilai_anggaran)::float8 AS nilai, COUNT(DISTINCT f.kode_pemda)::int AS n_pemda
    FROM fakta_anggaran f JOIN dim_pemda p ON p.kode_pemda = f.kode_pemda
    ${where}
    GROUP BY f.tahun, f.kode_fungsi`;

  const share: Record<number, Record<string, number>> = {};
  const totalBelanja: Record<number, number> = {};
  const jumlahPemda: Record<number, number> = {};
  for (const tahun of DAFTAR_TAHUN) {
    const b = baris.filter((r) => r.tahun === tahun);
    const total = b.reduce((s, r) => s + r.nilai, 0);
    totalBelanja[tahun] = total;
    jumlahPemda[tahun] = Math.max(0, ...b.map((r) => r.n_pemda));
    share[tahun] = Object.fromEntries(FUNGSI_AKTIF.map((k) => [k, total ? ((b.find((r) => r.kode_fungsi === k)?.nilai ?? 0) / total) * 100 : 0]));
  }

  const komposisi = GRUP_GRAFIK.map((g) => ({
    ...g,
    nilai: DAFTAR_TAHUN.map((t) => FUNGSI_AKTIF.filter((k) => grupGrafik(k) === g.kode).reduce((s, k) => s + share[t][k], 0)),
  }));

  // Δshare agregat (pp) per fungsi untuk 2023-2026
  const tahunDelta = DAFTAR_TAHUN.slice(1);
  const delta = FUNGSI_AKTIF.map((k) => ({
    kode: k,
    nama: NAMA_FUNGSI[k],
    nilai: tahunDelta.map((t) => share[t][k] - share[t - 1][k]),
  }));

  // 2. KPI tahun terpilih
  const t = filter.tahun;
  const urutShare = FUNGSI_AKTIF.map((k) => ({ kode: k, nama: NAMA_FUNGSI[k], share: share[t][k] })).sort((a, b) => b.share - a.share);
  const kenaikan =
    t > DAFTAR_TAHUN[0]
      ? FUNGSI_AKTIF.map((k) => ({ kode: k, nama: NAMA_FUNGSI[k], delta: share[t][k] - share[t - 1][k] })).sort((a, b) => b.delta - a.delta)[0]
      : null;

  // 3. IPS tahun terpilih: median & 5 pemda tertinggi
  const [ips] = await prisma.$queryRaw<{ median: number | null; lonjakan: number }[]>`
    SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY i.ips_pp)::float8 AS median, COUNT(*) FILTER (WHERE i.lonjakan)::int AS lonjakan
    FROM ips_pergeseran i JOIN dim_pemda p ON p.kode_pemda = i.kode_pemda
    ${where} AND i.tahun = ${t}`;
  const ipsTertinggi = await prisma.$queryRaw<
    { kode_pemda: string; nama_pemda: string; tingkat: string; nama_provinsi: string; ips_pp: number; z_robust: number; lonjakan: boolean }[]
  >`
    SELECT i.kode_pemda, p.nama_pemda, p.tingkat, p.nama_provinsi, i.ips_pp, i.z_robust, i.lonjakan
    FROM ips_pergeseran i JOIN dim_pemda p ON p.kode_pemda = i.kode_pemda
    ${where} AND i.tahun = ${t}
    ORDER BY i.ips_pp DESC LIMIT 5`;

  return {
    filter,
    tahun: [...DAFTAR_TAHUN],
    jumlahPemda: jumlahPemda[t],
    totalBelanja: totalBelanja[t],
    fungsiTerbesar: urutShare[0],
    kenaikanTerbesar: kenaikan,
    medianIps: ips?.median ?? null,
    jumlahLonjakan: ips?.lonjakan ?? 0,
    komposisi,
    delta: { tahun: [...tahunDelta], baris: delta },
    ipsTertinggi,
  };
}

export async function getDataUnduh(filter: Filter) {
  "use cache";
  cacheLife("weeks");
  return prisma.$queryRaw<Record<string, string | number | null>[]>`
    SELECT f.tahun, f.kode_pemda, p.nama_pemda, p.tingkat, p.nama_provinsi, f.kode_fungsi, d.nama_fungsi,
           f.nilai_anggaran, f.total_belanja, s.share_pct, s.delta_pp
    FROM fakta_anggaran f
    JOIN dim_pemda p ON p.kode_pemda = f.kode_pemda
    JOIN dim_fungsi d ON d.kode_fungsi = f.kode_fungsi
    JOIN share_fungsi s ON s.tahun = f.tahun AND s.kode_pemda = f.kode_pemda AND s.kode_fungsi = f.kode_fungsi
    ${wherePemda(filter)} AND f.tahun = ${filter.tahun}
    ${filter.fungsi ? Prisma.sql`AND f.kode_fungsi = ${filter.fungsi}` : Prisma.empty}
    ORDER BY f.kode_pemda, f.kode_fungsi`;
}
