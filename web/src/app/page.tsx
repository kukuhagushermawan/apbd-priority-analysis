import { AlertTriangle, Download } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { JudulHalaman, KartuGrafik, KartuKpi, KerangkaMemuat, Kosong } from "@/components/kartu";
import { GrafikKomposisi, HeatmapDelta } from "@/components/ringkasan-grafik";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRingkasan } from "@/lib/data";
import { bacaFilter, keQuery } from "@/lib/filter";
import { bilangan, persen, pp, rupiahTriliun } from "@/lib/format";

export default function RingkasanNasional({ searchParams }: PageProps<"/">) {
  return (
    <>
      <JudulHalaman
        judul="Ringkasan Nasional"
        keterangan="Bagaimana komposisi belanja APBD (Anggaran) pemerintah daerah bergeser antarfungsi selama 2022–2026. Klik grafik untuk menelusuri lebih dalam."
      />
      <Suspense fallback={<KerangkaMemuat />}>
        <Isi searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Isi({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const filter = bacaFilter(await searchParams);
  const data = await getRingkasan(filter);
  const q = keQuery(filter);

  if (!data.jumlahPemda) return <Kosong pesan="Tidak ada pemda yang cocok dengan filter ini. Coba longgarkan filter tingkat atau provinsi." />;

  return (
    <>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indikator utama">
        <KartuKpi
          label={`Jumlah pemda ${filter.tahun}`}
          nilai={bilangan(data.jumlahPemda)}
          catatan={`Total belanja Anggaran ${rupiahTriliun(data.totalBelanja)}`}
        />
        <KartuKpi
          label="Share Anggaran terbesar"
          nilai={persen(data.fungsiTerbesar.share)}
          catatan={data.fungsiTerbesar.nama}
          definisi="share"
        />
        <KartuKpi
          label={`Kenaikan terbesar ${filter.tahun}`}
          nilai={data.kenaikanTerbesar ? pp(data.kenaikanTerbesar.delta) : "–"}
          catatan={data.kenaikanTerbesar ? `${data.kenaikanTerbesar.nama} vs ${filter.tahun - 1}` : "Tidak ada tahun pembanding sebelum 2022"}
          definisi="delta"
        />
        <KartuKpi
          label={`Median IPS ${filter.tahun}`}
          nilai={data.medianIps !== null ? `${data.medianIps.toFixed(1).replace(".", ",")} pp` : "–"}
          catatan={
            filter.tahun === 2023 ? (
              <span className="inline-flex items-center gap-1 text-amber-700">
                <AlertTriangle className="size-3.5" aria-hidden /> Dipengaruhi patahan klasifikasi
              </span>
            ) : data.medianIps !== null ? (
              `${data.jumlahLonjakan} pemda dengan lonjakan (z > 3)`
            ) : (
              "IPS dimulai 2023"
            )
          }
          definisi="ips"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <KartuGrafik
          judul="Komposisi share Anggaran per fungsi"
          keterangan="Σ anggaran fungsi ÷ Σ total belanja pemda terpilih, 2022–2026. Klik segmen untuk melihat trennya."
          definisi="share"
        >
          <GrafikKomposisi data={data} />
        </KartuGrafik>
        <KartuGrafik
          judul="Perubahan share Anggaran (Δshare, pp)"
          keterangan="Biru = naik, merah = turun dibanding tahun sebelumnya. ⚑ 2023 dipengaruhi patahan klasifikasi. Klik sel untuk melihat pemda penyumbang."
          definisi="delta"
        >
          <HeatmapDelta data={data} />
        </KartuGrafik>
      </section>

      <KartuGrafik
        judul={`Lima pemda dengan IPS Anggaran tertinggi, ${filter.tahun}`}
        keterangan="Indeks Pergeseran Struktur: porsi anggaran yang berpindah antarfungsi dibanding tahun sebelumnya."
        definisi="ips"
      >
        {data.ipsTertinggi.length === 0 ? (
          <Kosong pesan="IPS baru tersedia mulai 2023 (butuh tahun pembanding)." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pemda</TableHead>
                <TableHead className="hidden sm:table-cell">Provinsi</TableHead>
                <TableHead className="text-right">IPS</TableHead>
                <TableHead className="hidden text-right sm:table-cell">z robust</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.ipsTertinggi.map((r) => (
                <TableRow key={r.kode_pemda}>
                  <TableCell>
                    <Link href={`/daerah/${r.kode_pemda}${q}`} className="font-medium text-primary hover:underline">
                      {r.nama_pemda}
                    </Link>
                    {r.lonjakan && (
                      <Badge variant="outline" className="ml-2 border-amber-500 text-amber-800">
                        Lonjakan
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{r.nama_provinsi}</TableCell>
                  <TableCell className="text-right font-medium">{r.ips_pp.toFixed(1).replace(".", ",")} pp</TableCell>
                  <TableCell className="hidden text-right text-muted-foreground sm:table-cell">{r.z_robust.toFixed(1).replace(".", ",")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </KartuGrafik>

      <div className="flex justify-end">
        <a
          href={`/api/unduh${q}`}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Download className="size-4" aria-hidden /> Unduh CSV Anggaran ({filter.tahun}, sesuai filter)
        </a>
      </div>
    </>
  );
}
