import { Download } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { JudulHalaman, KartuGrafik, KerangkaMemuat, Kosong, Lencana, StatJudul, TautanPemda } from "@/components/kartu";
import { GrafikKomposisi, HeatmapDelta } from "@/components/ringkasan-grafik";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRingkasan } from "@/lib/data";
import { bacaFilter, keQuery } from "@/lib/filter";
import { bilangan, persen, pp, rupiahTriliun } from "@/lib/format";

export const metadata: Metadata = { title: "Ringkasan" };

export default function Ringkasan({ searchParams }: PageProps<"/ringkasan">) {
  return (
    <Suspense fallback={<KerangkaMemuat />}>
      <Isi searchParams={searchParams} />
    </Suspense>
  );
}

async function Isi({ searchParams }: { searchParams: PageProps<"/ringkasan">["searchParams"] }) {
  const filter = bacaFilter(await searchParams);
  const data = await getRingkasan(filter);
  const q = keQuery(filter);

  if (!data.jumlahPemda) return <Kosong pesan="Tidak ada daerah yang cocok dengan filter ini. Coba atur ulang filter di atas." />;

  return (
    <>
      <JudulHalaman
        eyebrow={`Ringkasan · APBD Anggaran ${filter.tahun}`}
        judul="Komposisi belanja seluruh daerah"
        keterangan="Berapa persen anggaran daerah dipakai untuk tiap urusan, dan bagaimana berubah dari tahun ke tahun."
      >
        <StatJudul label="Daerah" nilai={bilangan(data.jumlahPemda)} catatan={`Belanja ${rupiahTriliun(data.totalBelanja)}`} />
        <StatJudul label="Porsi terbesar" nilai={persen(data.fungsiTerbesar.share)} catatan={data.fungsiTerbesar.nama} definisi="share" />
        <StatJudul
          label="Paling bertambah"
          nilai={data.kenaikanTerbesar ? pp(data.kenaikanTerbesar.delta) : "–"}
          catatan={data.kenaikanTerbesar ? `${data.kenaikanTerbesar.nama}, dari ${filter.tahun - 1}` : "Belum ada tahun pembanding"}
          definisi="delta"
          sorot
        />
        <StatJudul
          label="Median pergeseran"
          nilai={data.medianIps !== null ? `${data.medianIps.toFixed(1).replace(".", ",")} pp` : "–"}
          catatan={
            filter.tahun === 2023 ? "Terpengaruh perubahan klasifikasi" : data.medianIps !== null ? `${data.jumlahLonjakan} daerah melonjak` : "Mulai dihitung 2023"
          }
          definisi="ips"
        />
      </JudulHalaman>

      <div className="grid gap-5 xl:grid-cols-2">
        <KartuGrafik judul="Komposisi belanja" keterangan="Klik salah satu warna untuk melihat trennya." definisi="share">
          <GrafikKomposisi tahun={data.tahun} komposisi={data.komposisi} />
        </KartuGrafik>
        <KartuGrafik judul="Perubahan porsi dari tahun sebelumnya" keterangan="Biru naik, oranye turun. Klik kotak untuk melihat daerahnya." definisi="delta">
          <HeatmapDelta delta={data.delta} />
          <p className="mt-2 text-xs text-muted-foreground">* 2023 terpengaruh perubahan klasifikasi DJPK.</p>
        </KartuGrafik>
      </div>

      <KartuGrafik
        judul={`Pergeseran terbesar, ${filter.tahun}`}
        keterangan="Lima daerah yang komposisi belanjanya paling banyak berubah."
        definisi="ips"
        aksi={
          <a href={`/api/unduh${q}`} className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-2 text-xs font-semibold text-primary hover:bg-[#dfe7f3]">
            <Download className="size-3.5" aria-hidden /> Unduh CSV
          </a>
        }
      >
        {data.ipsTertinggi.length === 0 ? (
          <p className="text-sm text-muted-foreground">Pergeseran baru bisa dihitung mulai 2023. Pilih tahun lain di atas.</p>
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
                  <TableCell className="py-3.5">
                    <TautanPemda kode={r.kode_pemda} nama={r.nama_pemda} query={q} />
                    {r.lonjakan && <Lencana>melonjak</Lencana>}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{r.nama_provinsi.replace("Provinsi ", "")}</TableCell>
                  <TableCell className="text-right font-semibold">{r.ips_pp.toFixed(1).replace(".", ",")} pp</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </KartuGrafik>
    </>
  );
}
