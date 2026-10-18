import { Download } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { BarisStatistik, JudulHalaman, KartuGrafik, KartuKpi, KerangkaMemuat, Kosong, TautanPemda } from "@/components/kartu";
import { GrafikKomposisi, HeatmapDelta } from "@/components/ringkasan-grafik";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRingkasan } from "@/lib/data";
import { bacaFilter, keQuery } from "@/lib/filter";
import { bilangan, persen, pp, rupiahTriliun } from "@/lib/format";

export const metadata: Metadata = { title: "Ringkasan" };

export default function Ringkasan({ searchParams }: PageProps<"/ringkasan">) {
  return (
    <>
      <JudulHalaman judul="Ringkasan" keterangan="Porsi belanja tiap fungsi di seluruh daerah, 2022–2026 (APBD Anggaran)." />
      <Suspense fallback={<KerangkaMemuat />}>
        <Isi searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Isi({ searchParams }: { searchParams: PageProps<"/ringkasan">["searchParams"] }) {
  const filter = bacaFilter(await searchParams);
  const data = await getRingkasan(filter);
  const q = keQuery(filter);

  if (!data.jumlahPemda) return <Kosong pesan="Tidak ada daerah yang cocok dengan filter ini." />;

  return (
    <>
      <BarisStatistik>
        <KartuKpi label={`Daerah, ${filter.tahun}`} nilai={bilangan(data.jumlahPemda)} catatan={`Belanja ${rupiahTriliun(data.totalBelanja)}`} />
        <KartuKpi label="Porsi terbesar" nilai={persen(data.fungsiTerbesar.share)} catatan={data.fungsiTerbesar.nama} definisi="share" />
        <KartuKpi
          label="Paling bertambah"
          nilai={data.kenaikanTerbesar ? pp(data.kenaikanTerbesar.delta) : "–"}
          catatan={data.kenaikanTerbesar ? `${data.kenaikanTerbesar.nama}, dari ${filter.tahun - 1}` : "Belum ada tahun pembanding"}
          definisi="delta"
        />
        <KartuKpi
          label="Median pergeseran"
          nilai={data.medianIps !== null ? `${data.medianIps.toFixed(1).replace(".", ",")} pp` : "–"}
          catatan={
            filter.tahun === 2023
              ? "Terpengaruh perubahan klasifikasi 2023"
              : data.medianIps !== null
                ? `${data.jumlahLonjakan} daerah melonjak`
                : "Mulai dihitung 2023"
          }
          definisi="ips"
        />
      </BarisStatistik>

      <div className="grid gap-4 xl:grid-cols-2">
        <KartuGrafik judul="Komposisi belanja" keterangan="Klik salah satu warna untuk melihat trennya." definisi="share">
          <GrafikKomposisi tahun={data.tahun} komposisi={data.komposisi} />
        </KartuGrafik>
        <KartuGrafik judul="Perubahan porsi dari tahun sebelumnya" keterangan="Biru naik, merah turun. Klik kotak untuk melihat daerah penyebabnya." definisi="delta">
          <HeatmapDelta delta={data.delta} />
        </KartuGrafik>
      </div>

      <KartuGrafik
        judul={`Pergeseran terbesar, ${filter.tahun}`}
        keterangan="Lima daerah yang komposisi belanjanya paling banyak berubah."
        definisi="ips"
        aksi={
          <a href={`/api/unduh${q}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <Download className="size-3.5" aria-hidden /> CSV
          </a>
        }
      >
        {data.ipsTertinggi.length === 0 ? (
          <Kosong pesan="Pergeseran baru bisa dihitung mulai 2023." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Daerah</TableHead>
                <TableHead className="hidden sm:table-cell">Provinsi</TableHead>
                <TableHead className="text-right">Pergeseran</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.ipsTertinggi.map((r) => (
                <TableRow key={r.kode_pemda}>
                  <TableCell>
                    <TautanPemda kode={r.kode_pemda} nama={r.nama_pemda} query={q} />
                    {r.lonjakan && <span className="ml-2 text-xs text-amber-700">melonjak</span>}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{r.nama_provinsi.replace("Provinsi ", "")}</TableCell>
                  <TableCell className="text-right">{r.ips_pp.toFixed(1).replace(".", ",")} pp</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </KartuGrafik>
    </>
  );
}
