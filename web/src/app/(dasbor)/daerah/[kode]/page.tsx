import { Download, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CariPemda } from "@/components/cari-pemda";
import { GrafikPita } from "@/components/grafik";
import { BarisStatistik, KartuGrafik, KartuKpi, KerangkaMemuat, Peringatan } from "@/components/kartu";
import { GrafikPosisi } from "@/components/profil-grafik";
import { GrafikKomposisi } from "@/components/ringkasan-grafik";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDaftarPemda, getProfil } from "@/lib/data";
import { bacaFilter, keQuery, tautan } from "@/lib/filter";
import { persen, pp, rupiahTriliun } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/daerah/[kode]">) {
  const profil = await getProfil((await params).kode);
  return { title: profil?.pemda.nama_pemda ?? "Daerah" };
}

export default function ProfilDaerah({ params, searchParams }: PageProps<"/daerah/[kode]">) {
  return (
    <Suspense fallback={<KerangkaMemuat />}>
      <Isi params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Isi({ params, searchParams }: { params: PageProps<"/daerah/[kode]">["params"]; searchParams: PageProps<"/daerah/[kode]">["searchParams"] }) {
  const { kode } = await params;
  const filter = bacaFilter(await searchParams);
  const [profil, daftar] = await Promise.all([getProfil(kode), getDaftarPemda()]);
  if (!profil) notFound();

  const { pemda } = profil;
  const i = Math.max(0, profil.tahun.indexOf(filter.tahun));
  const tahun = profil.tahun[i];
  const total = profil.total.find((t) => t.tahun === tahun)?.total_belanja ?? 0;
  const ips = profil.ips.find((x) => x.tahun === tahun);
  const klasterAkhir = profil.klaster.at(-1);
  const pendidikan = profil.fungsi.find((f) => f.kode === "10")!;
  const tingkat = pemda.tingkat === "provinsi" ? "provinsi" : pemda.tingkat;
  const tombol = "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted";

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {pemda.tingkat === "provinsi" ? "Provinsi" : pemda.nama_provinsi.replace("Provinsi ", "")}
            {pemda.kode_2022 && pemda.kode_2022 !== pemda.kode_pemda && " · berpindah provinsi sejak 2023"}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{pemda.nama_pemda}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={tautan("/bandingkan", filter, { kode: pemda.kode_pemda })} className={tombol}>
            <Plus className="size-4" aria-hidden /> Bandingkan
          </Link>
          <a href={`/api/unduh?kode=${pemda.kode_pemda}`} className={tombol}>
            <Download className="size-4" aria-hidden /> CSV
          </a>
        </div>
      </div>
      <Suspense>
        <CariPemda daftar={daftar} tujuan="profil" placeholder="Cari daerah lain" />
      </Suspense>
      {!pemda.panel_seimbang && <Peringatan>Wilayah provinsi ini berubah karena pemekaran Papua 2022, jadi angka antartahun tidak sepenuhnya sebanding.</Peringatan>}

      <BarisStatistik>
        <KartuKpi label={`Belanja ${tahun}`} nilai={rupiahTriliun(total)} catatan="APBD Anggaran" />
        <KartuKpi label="Porsi pendidikan" nilai={persen(pendidikan.share[i])} catatan={`Median ${tingkat}: ${persen(pendidikan.median[i])}`} definisi="share" />
        <KartuKpi
          label={`Pergeseran ${tahun}`}
          nilai={ips ? `${ips.ips_pp.toFixed(1).replace(".", ",")} pp` : "–"}
          catatan={ips ? (ips.lonjakan ? "Melonjak dibanding daerah setingkat" : "Dalam batas wajar") : "Belum ada tahun pembanding"}
          definisi="ips"
        />
        <KartuKpi label="Kelompok (2026)" nilai={klasterAkhir?.nama_klaster.split("· ")[1] ?? "–"} definisi="klaster" />
      </BarisStatistik>

      <div className="grid gap-4 xl:grid-cols-2">
        <KartuGrafik judul="Komposisi belanja" keterangan="Dari tahun ke tahun." definisi="share">
          <GrafikKomposisi tahun={profil.tahun} komposisi={profil.komposisi} />
        </KartuGrafik>
        <KartuGrafik judul={`Dibanding ${tingkat} lain, ${tahun}`} keterangan="Biru: daerah ini. Abu-abu: median daerah setingkat." definisi="share">
          <GrafikPosisi nama={pemda.nama_pemda} fungsi={profil.fungsi.map((f) => ({ nama: f.nama, pemda: f.share[i], median: f.median[i] }))} />
        </KartuGrafik>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <KartuGrafik judul="Porsi pendidikan" keterangan="Garis putus-putus: acuan 20% (perkiraan kasar, bukan audit)." definisi="pendidikan">
          <GrafikPita
            sumbuX={profil.tahun.map(String)}
            garis={pendidikan.share}
            namaGaris="Pendidikan"
            acuan={{ nilai: 20, label: "20%" }}
            label="Porsi anggaran pendidikan dibanding acuan 20 persen"
            tinggi={300}
          />
        </KartuGrafik>
        <KartuGrafik
          judul="Dibanding rata-rata kelompoknya"
          keterangan={klasterAkhir ? `Kelompok “${klasterAkhir.nama_klaster.split("· ")[1]}”, 2026.` : undefined}
          definisi="klaster"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fungsi</TableHead>
                <TableHead className="text-right">Daerah ini</TableHead>
                <TableHead className="text-right">Kelompok</TableHead>
                <TableHead className="text-right">Selisih</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profil.centroid.map((c) => (
                <TableRow key={c.kode}>
                  <TableCell>{c.nama}</TableCell>
                  <TableCell className="text-right">{persen(c.pemda)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{persen(c.pusat)}</TableCell>
                  <TableCell className="text-right">{pp(c.pemda - c.pusat)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </KartuGrafik>
      </div>

      <p className="text-sm text-muted-foreground">
        Lanjut:{" "}
        <Link href={tautan("/proyeksi", filter, { kode: pemda.kode_pemda })} className="text-foreground underline-offset-4 hover:underline">
          proyeksi daerah ini
        </Link>
        {" · "}
        <Link href={`/pergeseran${keQuery({ ...filter, provinsi: pemda.provinsi_induk })}`} className="text-foreground underline-offset-4 hover:underline">
          pergeseran di provinsinya
        </Link>
      </p>
    </>
  );
}
