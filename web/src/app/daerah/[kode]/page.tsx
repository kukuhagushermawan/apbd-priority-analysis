import { Columns3, Download } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CariPemda } from "@/components/cari-pemda";
import { GrafikPita } from "@/components/grafik";
import { JudulHalaman, KartuGrafik, KartuKpi, KerangkaMemuat, Peringatan } from "@/components/kartu";
import { GrafikPosisi } from "@/components/profil-grafik";
import { GrafikKomposisi } from "@/components/ringkasan-grafik";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDaftarPemda, getProfil } from "@/lib/data";
import { bacaFilter, keQuery, tautan } from "@/lib/filter";
import { persen, pp, rupiahTriliun } from "@/lib/format";

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
  const klaster = profil.klaster.find((k) => k.tahun === tahun);
  const pendidikan = profil.fungsi.find((f) => f.kode === "10")!;
  const sumbuX = profil.tahun.map(String);

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <JudulHalaman
          judul={pemda.nama_pemda}
          keterangan={`${pemda.tingkat[0].toUpperCase() + pemda.tingkat.slice(1)} · ${pemda.nama_provinsi} · kode DJPK ${pemda.kode_pemda}${
            pemda.kode_2022 && pemda.kode_2022 !== pemda.kode_pemda ? ` (2022: ${pemda.kode_2022})` : ""
          }`}
        />
        <div className="flex flex-wrap gap-2">
          <Link
            href={tautan("/bandingkan", filter, { kode: pemda.kode_pemda })}
            className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-medium text-primary hover:bg-secondary"
          >
            <Columns3 className="size-4" aria-hidden /> Bandingkan
          </Link>
          <a
            href={`/api/unduh?kode=${pemda.kode_pemda}`}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Download className="size-4" aria-hidden /> Unduh CSV
          </a>
        </div>
      </div>
      <Suspense>
        <CariPemda daftar={daftar} tujuan="profil" placeholder="Cari pemda lain…" />
      </Suspense>
      {!pemda.panel_seimbang && (
        <Peringatan>
          Wilayah pemda ini berubah karena pemekaran Papua 2022, sehingga data antartahun tidak sepenuhnya sebanding.
        </Peringatan>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KartuKpi label={`Total belanja Anggaran ${tahun}`} nilai={rupiahTriliun(total)} catatan="Jumlah 9 fungsi" definisi="share" />
        <KartuKpi
          label={`Share Pendidikan ${tahun}`}
          nilai={persen(pendidikan.share[i])}
          catatan={`Median ${pemda.tingkat}: ${persen(pendidikan.median[i])}`}
          definisi="share"
        />
        <KartuKpi
          label={`IPS ${tahun}`}
          nilai={ips ? `${ips.ips_pp.toFixed(1).replace(".", ",")} pp` : "–"}
          catatan={ips ? (ips.lonjakan ? "Lonjakan (z > 3)" : `z robust ${ips.z_robust.toFixed(1).replace(".", ",")}`) : "Belum ada tahun pembanding"}
          definisi="ips"
        />
        <KartuKpi label={`Klaster ${tahun}`} nilai={klaster ? `K${klaster.klaster}` : "–"} catatan={klaster?.nama_klaster.split("· ")[1]} definisi="klaster" />
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <KartuGrafik judul="Komposisi share Anggaran per tahun" keterangan="Klik segmen untuk melihat tren fungsi tersebut di semua pemda." definisi="share">
          <GrafikKomposisi tahun={profil.tahun} komposisi={profil.komposisi} />
        </KartuGrafik>
        <KartuGrafik
          judul={`Posisi terhadap median ${pemda.tingkat}, ${tahun}`}
          keterangan="Share Anggaran pemda ini (biru) dibanding median seluruh pemda setingkat (abu-abu)."
          definisi="share"
        >
          <GrafikPosisi nama={pemda.nama_pemda} fungsi={profil.fungsi.map((f) => ({ nama: f.nama, pemda: f.share[i], median: f.median[i] }))} />
        </KartuGrafik>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <KartuGrafik
          judul="Indikator pendidikan terhadap acuan 20%"
          keterangan="Share Anggaran fungsi Pendidikan per tahun. Indikatif, bukan audit: mandatory spending 20% dihitung dari tagging subkegiatan, bukan dari klasifikasi fungsi."
          definisi="share"
        >
          <GrafikPita
            sumbuX={sumbuX}
            garis={pendidikan.share}
            namaGaris="Share Pendidikan"
            acuan={{ nilai: 20, label: "Acuan 20% (indikatif)" }}
            label="Share anggaran pendidikan dibanding acuan 20 persen"
            tinggi={300}
          />
        </KartuGrafik>
        <KartuGrafik
          judul="Posisi terhadap centroid klaster 2026"
          keterangan={klaster ? `Klaster ${profil.klaster.at(-1)?.nama_klaster}. Fungsi kecil digabung menjadi “Lainnya”.` : "Belum ada data klaster."}
          definisi="klaster"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Komponen</TableHead>
                <TableHead className="text-right">Pemda 2026</TableHead>
                <TableHead className="text-right">Centroid</TableHead>
                <TableHead className="text-right">Selisih</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profil.centroid.map((c) => (
                <TableRow key={c.kode}>
                  <TableCell>{c.nama}</TableCell>
                  <TableCell className="text-right">{persen(c.pemda)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{persen(c.pusat)}</TableCell>
                  <TableCell className="text-right font-medium">{pp(c.pemda - c.pusat)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {profil.klaster.map((k) => (
              <Badge key={k.tahun} variant={k.tahun === tahun ? "default" : "outline"}>
                {k.tahun}: K{k.klaster}
                {k.patahan_klasifikasi ? " ⚑" : ""}
              </Badge>
            ))}
          </div>
        </KartuGrafik>
      </div>

      <p className="text-xs text-muted-foreground">
        Lihat juga:{" "}
        <Link href={tautan("/proyeksi", filter, { kode: pemda.kode_pemda })} className="text-primary hover:underline">
          proyeksi 2027–2028 pemda ini
        </Link>{" "}
        ·{" "}
        <Link href={`/pergeseran${keQuery({ ...filter, provinsi: pemda.provinsi_induk })}`} className="text-primary hover:underline">
          pergeseran di provinsi yang sama
        </Link>
      </p>
    </>
  );
}
