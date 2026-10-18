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

/** CSV unduhan. kode = satu pemda (semua tahun); semuaTahun = abaikan filter tahun. */
export async function getDataUnduh(filter: Filter, kode: string | null = null, semuaTahun = false) {
  "use cache";
  cacheLife("weeks");
  const where = kode ? Prisma.sql`WHERE p.kode_pemda = ${kode}` : wherePemda(filter);
  return prisma.$queryRaw<Record<string, string | number | null>[]>`
    SELECT f.tahun, f.kode_pemda, p.nama_pemda, p.tingkat, p.nama_provinsi, f.kode_fungsi, d.nama_fungsi,
           f.nilai_anggaran, f.total_belanja, s.share_pct, s.delta_pp
    FROM fakta_anggaran f
    JOIN dim_pemda p ON p.kode_pemda = f.kode_pemda
    JOIN dim_fungsi d ON d.kode_fungsi = f.kode_fungsi
    JOIN share_fungsi s ON s.tahun = f.tahun AND s.kode_pemda = f.kode_pemda AND s.kode_fungsi = f.kode_fungsi
    ${where}
    ${kode || semuaTahun ? Prisma.empty : Prisma.sql`AND f.tahun = ${filter.tahun}`}
    ${filter.fungsi && !kode ? Prisma.sql`AND f.kode_fungsi = ${filter.fungsi}` : Prisma.empty}
    ORDER BY f.tahun, f.kode_pemda, f.kode_fungsi`;
}

// ---------------------------------------------------------------------------
// Tren per Fungsi
// ---------------------------------------------------------------------------
export const PERIODE = ["2023-2026", "2022-2026"] as const;
export type Periode = (typeof PERIODE)[number];

export async function getTren(filter: Filter, fungsi: string, periode: Periode) {
  "use cache";
  cacheLife("weeks");
  const where = wherePemda(filter);
  const deret = await prisma.$queryRaw<{ tahun: number; p25: number; median: number; p75: number }[]>`
    SELECT s.tahun,
      percentile_cont(0.25) WITHIN GROUP (ORDER BY s.share_pct)::float8 AS p25,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY s.share_pct)::float8 AS median,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY s.share_pct)::float8 AS p75
    FROM share_fungsi s JOIN dim_pemda p ON p.kode_pemda = s.kode_pemda
    ${where} AND s.kode_fungsi = ${fungsi}
    GROUP BY s.tahun ORDER BY s.tahun`;
  const ranking = await prisma.$queryRaw<{ kode_fungsi: string; median: number; naik: number; stabil: number; turun: number }[]>`
    SELECT t.kode_fungsi,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY t.kemiringan_pp)::float8 AS median,
      COUNT(*) FILTER (WHERE t.kategori = 'naik')::int AS naik,
      COUNT(*) FILTER (WHERE t.kategori = 'stabil')::int AS stabil,
      COUNT(*) FILTER (WHERE t.kategori = 'turun')::int AS turun
    FROM tren_fungsi t JOIN dim_pemda p ON p.kode_pemda = t.kode_pemda
    ${where} AND t.periode = ${periode}
    GROUP BY t.kode_fungsi ORDER BY median DESC`;
  const pemdaEkstrem = (arah: Prisma.Sql) => prisma.$queryRaw<
    { kode_pemda: string; nama_pemda: string; nama_provinsi: string; kemiringan_pp: number }[]
  >`
    SELECT t.kode_pemda, p.nama_pemda, p.nama_provinsi, t.kemiringan_pp
    FROM tren_fungsi t JOIN dim_pemda p ON p.kode_pemda = t.kode_pemda
    ${where} AND t.periode = ${periode} AND t.kode_fungsi = ${fungsi}
    ORDER BY t.kemiringan_pp ${arah} LIMIT 5`;
  return {
    fungsi,
    namaFungsi: NAMA_FUNGSI[fungsi],
    periode,
    deret,
    ranking: ranking.map((r) => ({ ...r, nama: NAMA_FUNGSI[r.kode_fungsi] })),
    naik: await pemdaEkstrem(Prisma.sql`DESC`),
    turun: await pemdaEkstrem(Prisma.sql`ASC`),
  };
}

// ---------------------------------------------------------------------------
// Deteksi Pergeseran
// ---------------------------------------------------------------------------
export async function getPergeseran(filter: Filter, fungsi: string) {
  "use cache";
  cacheLife("weeks");
  const where = wherePemda(filter);
  const ipsTahunan = await prisma.$queryRaw<{ tahun: number; p25: number; median: number; p75: number; lonjakan: number }[]>`
    SELECT i.tahun,
      percentile_cont(0.25) WITHIN GROUP (ORDER BY i.ips_pp)::float8 AS p25,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY i.ips_pp)::float8 AS median,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY i.ips_pp)::float8 AS p75,
      COUNT(*) FILTER (WHERE i.lonjakan)::int AS lonjakan
    FROM ips_pergeseran i JOIN dim_pemda p ON p.kode_pemda = i.kode_pemda
    ${where} GROUP BY i.tahun ORDER BY i.tahun`;
  const penyumbang = (arah: Prisma.Sql) => prisma.$queryRaw<
    { kode_pemda: string; nama_pemda: string; nama_provinsi: string; share_pct: number; delta_pp: number }[]
  >`
    SELECT s.kode_pemda, p.nama_pemda, p.nama_provinsi, s.share_pct, s.delta_pp
    FROM share_fungsi s JOIN dim_pemda p ON p.kode_pemda = s.kode_pemda
    ${where} AND s.tahun = ${filter.tahun} AND s.kode_fungsi = ${fungsi} AND s.delta_pp IS NOT NULL
    ORDER BY s.delta_pp ${arah} LIMIT 8`;
  const lonjakan = await prisma.$queryRaw<
    { kode_pemda: string; nama_pemda: string; tingkat: string; nama_provinsi: string; ips_pp: number; z_robust: number }[]
  >`
    SELECT i.kode_pemda, p.nama_pemda, p.tingkat, p.nama_provinsi, i.ips_pp, i.z_robust
    FROM ips_pergeseran i JOIN dim_pemda p ON p.kode_pemda = i.kode_pemda
    ${where} AND i.tahun = ${filter.tahun} AND i.lonjakan
    ORDER BY i.z_robust DESC LIMIT 30`;
  return {
    fungsi,
    namaFungsi: NAMA_FUNGSI[fungsi],
    ipsTahunan,
    penyumbangNaik: (await penyumbang(Prisma.sql`DESC`)).filter((r) => r.delta_pp > 0),
    penyumbangTurun: (await penyumbang(Prisma.sql`ASC`)).filter((r) => r.delta_pp < 0),
    lonjakan,
  };
}

// ---------------------------------------------------------------------------
// Profil Daerah
// ---------------------------------------------------------------------------
export async function getDaftarPemda() {
  "use cache";
  cacheLife("weeks");
  return prisma.dim_pemda.findMany({
    select: { kode_pemda: true, nama_pemda: true, tingkat: true, nama_provinsi: true },
    orderBy: { kode_pemda: "asc" },
  });
}

export type Profil = NonNullable<Awaited<ReturnType<typeof getProfil>>>;

export async function getProfil(kode: string) {
  "use cache";
  cacheLife("weeks");
  const pemda = await prisma.dim_pemda.findUnique({ where: { kode_pemda: kode } });
  if (!pemda) return null;

  const share = await prisma.share_fungsi.findMany({ where: { kode_pemda: kode }, orderBy: [{ tahun: "asc" }, { kode_fungsi: "asc" }] });
  const tahun = [...new Set(share.map((s) => s.tahun))];
  const nilai = (t: number, k: string) => share.find((s) => s.tahun === t && s.kode_fungsi === k)?.share_pct ?? 0;
  const komposisi = GRUP_GRAFIK.map((g) => ({
    ...g,
    nilai: tahun.map((t) => FUNGSI_AKTIF.filter((k) => grupGrafik(k) === g.kode).reduce((s, k) => s + nilai(t, k), 0)),
  }));

  const total = await prisma.fakta_anggaran.findMany({
    where: { kode_pemda: kode, kode_fungsi: "01" },
    select: { tahun: true, total_belanja: true },
    orderBy: { tahun: "asc" },
  });
  const median = await prisma.$queryRaw<{ tahun: number; kode_fungsi: string; median: number }[]>`
    SELECT s.tahun, s.kode_fungsi, percentile_cont(0.5) WITHIN GROUP (ORDER BY s.share_pct)::float8 AS median
    FROM share_fungsi s JOIN dim_pemda p ON p.kode_pemda = s.kode_pemda
    WHERE p.tingkat = ${pemda.tingkat} GROUP BY s.tahun, s.kode_fungsi`;
  const klaster = await prisma.klaster.findMany({ where: { kode_pemda: kode }, orderBy: { tahun: "asc" } });
  const klasterAkhir = klaster.at(-1);
  const centroid = klasterAkhir
    ? await prisma.klaster_centroid.findMany({ where: { kelompok: klasterAkhir.kelompok, klaster: klasterAkhir.klaster } })
    : [];
  const ips = await prisma.ips_pergeseran.findMany({ where: { kode_pemda: kode }, orderBy: { tahun: "asc" } });

  return {
    pemda,
    tahun,
    komposisi,
    total,
    fungsi: FUNGSI_AKTIF.map((k) => ({
      kode: k,
      nama: NAMA_FUNGSI[k],
      share: tahun.map((t) => nilai(t, k)),
      median: tahun.map((t) => median.find((m) => m.tahun === t && m.kode_fungsi === k)?.median ?? 0),
    })),
    klaster,
    centroid: GRUP_GRAFIK.map((g) => ({
      ...g,
      pusat: centroid.find((c) => c.komponen === g.kode)?.share_pct ?? 0,
      pemda: komposisi.find((k) => k.kode === g.kode)?.nilai.at(-1) ?? 0,
    })),
    ips,
  };
}

// ---------------------------------------------------------------------------
// Perbandingan
// ---------------------------------------------------------------------------
export async function getBandingkan(kode: string[], tahun: number) {
  "use cache";
  cacheLife("weeks");
  const pemda = await prisma.dim_pemda.findMany({ where: { kode_pemda: { in: kode } } });
  const fakta = await prisma.fakta_anggaran.findMany({ where: { kode_pemda: { in: kode }, tahun } });
  return kode.flatMap((k) => {
    const p = pemda.find((x) => x.kode_pemda === k);
    if (!p) return [];
    const baris = fakta.filter((f) => f.kode_pemda === k);
    const total = baris[0]?.total_belanja ?? 0;
    return [
      {
        kode: k,
        nama: p.nama_pemda,
        total,
        fungsi: FUNGSI_AKTIF.map((f) => {
          const nominal = baris.find((b) => b.kode_fungsi === f)?.nilai_anggaran ?? 0;
          return { kode: f, nama: NAMA_FUNGSI[f], nominal, share: total ? (nominal / total) * 100 : 0 };
        }),
      },
    ];
  });
}

// ---------------------------------------------------------------------------
// Peta & Klaster
// ---------------------------------------------------------------------------
export type Kelompok = "kabkota" | "provinsi";

export async function getKlaster(kelompok: Kelompok, tahunAwal: number, filter: Filter) {
  "use cache";
  cacheLife("weeks");
  const centroid = await prisma.klaster_centroid.findMany({ where: { kelompok }, orderBy: [{ klaster: "asc" }] });
  const anggota = await prisma.$queryRaw<
    { tahun: number; kode_pemda: string; nama_pemda: string; nama_provinsi: string; klaster: number; k: number; silhouette: number }[]
  >`
    SELECT k.tahun, k.kode_pemda, p.nama_pemda, p.nama_provinsi, k.klaster, k.k, k.silhouette
    FROM klaster k JOIN dim_pemda p ON p.kode_pemda = k.kode_pemda
    ${wherePemda(filter)} AND k.kelompok = ${kelompok}`;
  const daftar = [...new Map(centroid.map((c) => [c.klaster, c.nama_klaster])).entries()].map(([klaster, nama]) => ({ klaster, nama }));
  const awal = new Map(anggota.filter((a) => a.tahun === tahunAwal).map((a) => [a.kode_pemda, a.klaster]));
  const migrasi = new Map<string, number>();
  for (const a of anggota.filter((x) => x.tahun === 2026)) {
    const dari = awal.get(a.kode_pemda);
    if (dari !== undefined) migrasi.set(`${dari}>${a.klaster}`, (migrasi.get(`${dari}>${a.klaster}`) ?? 0) + 1);
  }
  const akhir = anggota.filter((a) => a.tahun === 2026);
  return {
    kelompok,
    tahunAwal,
    k: daftar.length,
    silhouette: anggota[0]?.silhouette ?? 0,
    klaster: daftar,
    centroid: GRUP_GRAFIK.map((g) => ({
      ...g,
      rata: centroid.find((c) => c.komponen === g.kode)?.share_rata_kelompok_pct ?? 0,
      nilai: daftar.map((d) => centroid.find((c) => c.klaster === d.klaster && c.komponen === g.kode)?.share_pct ?? 0),
    })),
    jumlahPerTahun: DAFTAR_TAHUN.map((t) => ({ tahun: t, jumlah: daftar.map((d) => anggota.filter((a) => a.tahun === t && a.klaster === d.klaster).length) })),
    migrasi: [...migrasi.entries()].map(([kunci, jumlah]) => {
      const [dari, ke] = kunci.split(">").map(Number);
      return { dari, ke, jumlah };
    }),
    pindah: akhir
      .filter((a) => awal.has(a.kode_pemda) && awal.get(a.kode_pemda) !== a.klaster)
      .map((a) => ({ kode_pemda: a.kode_pemda, nama_pemda: a.nama_pemda, nama_provinsi: a.nama_provinsi, dari: awal.get(a.kode_pemda)!, ke: a.klaster })),
    anggota2026: akhir.map((a) => ({ kode_pemda: a.kode_pemda, nama_pemda: a.nama_pemda, klaster: a.klaster })),
  };
}

// ---------------------------------------------------------------------------
// Proyeksi 2027-2028
// ---------------------------------------------------------------------------
export async function getProyeksi(filter: Filter, fungsi: string, kode: string | null) {
  "use cache";
  cacheLife("weeks");
  const where = kode ? Prisma.sql`WHERE p.kode_pemda = ${kode}` : wherePemda(filter);
  const historis = await prisma.$queryRaw<{ tahun: number; nilai: number }[]>`
    SELECT s.tahun, percentile_cont(0.5) WITHIN GROUP (ORDER BY s.share_pct)::float8 AS nilai
    FROM share_fungsi s JOIN dim_pemda p ON p.kode_pemda = s.kode_pemda
    ${where} AND s.kode_fungsi = ${fungsi} GROUP BY s.tahun ORDER BY s.tahun`;
  const proyeksi = await prisma.$queryRaw<{ tahun: number; nilai: number; bawah: number; atas: number }[]>`
    SELECT r.tahun,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY r.share_pct)::float8 AS nilai,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY r.batas_bawah_pct)::float8 AS bawah,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY r.batas_atas_pct)::float8 AS atas
    FROM proyeksi r JOIN dim_pemda p ON p.kode_pemda = r.kode_pemda
    ${where} AND r.kode_fungsi = ${fungsi} GROUP BY r.tahun ORDER BY r.tahun`;
  const metrik = await prisma.$queryRaw<{ tingkat: string; periode: string; model: string; mae: number; terpilih: boolean }[]>`
    SELECT tingkat, periode, model, AVG(mae_pp)::float8 AS mae, bool_or(terpilih) AS terpilih
    FROM metrik_backtest WHERE kode_fungsi = 'SEMUA' AND tahun_uji IN (2025, 2026)
    GROUP BY tingkat, periode, model ORDER BY tingkat, mae`;
  const pemda = kode ? await prisma.dim_pemda.findUnique({ where: { kode_pemda: kode } }) : null;
  return { fungsi, namaFungsi: NAMA_FUNGSI[fungsi], pemda, historis, proyeksi, metrik };
}

// ---------------------------------------------------------------------------
// Kualitas Data
// ---------------------------------------------------------------------------
export async function getValidasi() {
  "use cache";
  cacheLife("weeks");
  return prisma.$queryRaw<{ pemeriksaan: string; status: string; jumlah: number; maks_rp: number | null; maks_pct: number | null }[]>`
    SELECT pemeriksaan, status, COUNT(*)::int AS jumlah, MAX(ABS(selisih_rp))::float8 AS maks_rp, MAX(ABS(selisih_pct))::float8 AS maks_pct
    FROM log_validasi GROUP BY pemeriksaan, status ORDER BY pemeriksaan, status`;
}
