import { Download, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CariPemda } from "@/components/cari-pemda";
import { GrafikPita } from "@/components/grafik";
import { JudulHalaman, KartuGrafik, KerangkaMemuat, kelasTombolGelap, Peringatan, StatJudul } from "@/components/kartu";
import { GrafikPosisi } from "@/components/profil-grafik";
import { GrafikKomposisi } from "@/components/ringkasan-grafik";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDaftarPemda, getProfil } from "@/lib/data";
import { bacaFilter, keQuery, tautan } from "@/lib/filter";
import { namaKlaster } from "@/lib/fungsi";
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

  return (
    <>
      <JudulHalaman
        eyebrow={`${pemda.tingkat === "provinsi" ? "Provinsi" : `${pemda.tingkat[0].toUpperCase()}${pemda.tingkat.slice(1)} · ${pemda.nama_provinsi.replace("Provinsi ", "")}`}${
          pemda.kode_2022 && pemda.kode_2022 !== pemda.kode_pemda ? " · berpindah provinsi sejak 2023" : ""
        }`}
        judul={pemda.nama_pemda}
        aksi={
          <>
            <Link href={tautan("/bandingkan", filter, { kode: pemda.kode_pemda })} className={kelasTombolGelap}>
              <Plus className="size-4" aria-hidden /> Bandingkan
            </Link>
            <a href={`/api/unduh?kode=${pemda.kode_pemda}`} className={kelasTombolGelap}>
              <Download className="size-4" aria-hidden /> Unduh CSV
            </a>
          </>
        }
      >
        <StatJudul label={`Total belanja ${tahun}`} nilai={rupiahTriliun(total)} catatan="APBD status anggaran" />
        <StatJudul label="Porsi fungsi pendidikan" nilai={persen(pendidikan.share[i])} catatan={`Median ${tingkat}: ${persen(pendidikan.median[i])}`} definisi="share" sorot />
        <StatJudul
          label={`Pergeseran ${tahun}`}
          nilai={ips ? `${ips.ips_pp.toFixed(1).replace(".", ",")} pp` : "–"}
          catatan={ips ? (ips.lonjakan ? "Melonjak dibandingkan dengan daerah setingkat" : "Masih dalam batas wajar") : "Belum ada tahun pembanding"}
          definisi="ips"
        />
        <StatJudul label="Kelompok (2026)" nilai={klasterAkhir ? namaKlaster(klasterAkhir.nama_klaster) : "–"} definisi="klaster" />
      </JudulHalaman>
      <div className="rounded-3xl bg-card p-4">
        <Suspense>
          <CariPemda daftar={daftar} tujuan="profil" placeholder="Cari daerah lain" />
        </Suspense>
      </div>
      {!pemda.panel_seimbang && <Peringatan>Wilayah provinsi ini berubah akibat pemekaran Papua tahun 2022 sehingga angka antartahun tidak sepenuhnya sebanding.</Peringatan>}

      <div className="grid gap-5 xl:grid-cols-2">
        <KartuGrafik judul="Komposisi belanja" keterangan="Komposisi belanja daerah ini dari tahun ke tahun." definisi="share">
          <GrafikKomposisi tahun={profil.tahun} komposisi={profil.komposisi} />
        </KartuGrafik>
        <KartuGrafik judul={`Dibandingkan dengan ${tingkat} lain, ${tahun}`} keterangan="Biru menunjukkan daerah ini, abu-abu menunjukkan median daerah setingkat." definisi="share">
          <GrafikPosisi nama={pemda.nama_pemda} fungsi={profil.fungsi.map((f) => ({ nama: f.nama, pemda: f.share[i], median: f.median[i] }))} />
        </KartuGrafik>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <KartuGrafik judul="Porsi fungsi pendidikan" keterangan="Garis acuan menunjukkan batas 20% (pembanding kasar, bukan hasil audit)." definisi="pendidikan">
          <GrafikPita
            sumbuX={profil.tahun.map(String)}
            garis={pendidikan.share}
            namaGaris="Pendidikan"
            acuan={{ nilai: 20, label: "20%" }}
            label="Porsi anggaran pendidikan dibandingkan dengan acuan 20 persen"
            tinggi={300}
          />
        </KartuGrafik>
        <KartuGrafik
          judul="Dibandingkan dengan rata-rata kelompoknya"
          keterangan={klasterAkhir ? `Kelompok “${namaKlaster(klasterAkhir.nama_klaster)}”, tahun 2026.` : undefined}
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

      <p className="px-1 text-sm text-muted-foreground">
        Lihat juga:{" "}
        <Link href={tautan("/proyeksi", filter, { kode: pemda.kode_pemda })} className="font-semibold text-primary underline-offset-4 hover:underline">
          proyeksi belanja daerah ini
        </Link>
        {" · "}
        <Link href={`/pergeseran${keQuery({ ...filter, provinsi: pemda.provinsi_induk })}`} className="font-semibold text-primary underline-offset-4 hover:underline">
          pergeseran belanja di provinsinya
        </Link>
      </p>
    </>
  );
}
