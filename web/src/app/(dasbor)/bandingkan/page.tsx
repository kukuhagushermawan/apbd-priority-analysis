import type { Metadata } from "next";
import { X } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { GrafikBandingkan } from "@/components/bandingkan-grafik";
import { CariPemda } from "@/components/cari-pemda";
import { WARNA_SERI } from "@/lib/warna";
import { JudulHalaman, KartuGrafik, KerangkaMemuat, Kosong, PilihanTautan, TautanPemda } from "@/components/kartu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bacaKode } from "@/lib/api";
import { getBandingkan, getDaftarPemda } from "@/lib/data";
import { bacaFilter, keQuery, tautan } from "@/lib/filter";
import { persen, pp, rupiahTriliun } from "@/lib/format";

export const metadata: Metadata = { title: "Bandingkan" };

export default function Perbandingan({ searchParams }: PageProps<"/bandingkan">) {
  return (
    <>
      <JudulHalaman judul="Bandingkan" keterangan="Letakkan dua sampai empat daerah berdampingan." />
      <Suspense fallback={<KerangkaMemuat />}>
        <Isi searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Isi({ searchParams }: { searchParams: PageProps<"/bandingkan">["searchParams"] }) {
  const sp = await searchParams;
  const filter = bacaFilter(sp);
  const kode = String(sp.kode ?? "")
    .split(",")
    .map(bacaKode)
    .filter((k): k is string => k !== null)
    .slice(0, 4);
  const ukuran = sp.ukuran === "nominal" ? "nominal" : "share";
  const [pemda, daftar] = await Promise.all([getBandingkan(kode, filter.tahun), getDaftarPemda()]);
  const q = keQuery(filter);
  const tanpa = (k: string) => tautan("/bandingkan", filter, { kode: kode.filter((x) => x !== k).join(",") || null, ukuran });

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {pemda.map((p, i) => (
            <span key={p.kode} className="inline-flex items-center gap-2 rounded-full border py-1 pl-3 pr-1 text-sm">
              <span className="size-2.5 rounded-full" style={{ background: WARNA_SERI[i] }} aria-hidden />
              {p.nama}
              <Link href={tanpa(p.kode)} scroll={false} aria-label={`Hapus ${p.nama}`} className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="size-3.5" />
              </Link>
            </span>
          ))}
        </div>
        {pemda.length < 4 && (
          <Suspense>
            <CariPemda daftar={daftar} tujuan="bandingkan" placeholder={pemda.length ? "Tambah daerah" : "Cari daerah pertama"} />
          </Suspense>
        )}
      </div>

      {pemda.length < 2 ? (
        <Kosong pesan="Pilih setidaknya dua daerah. Bisa juga lewat tombol Bandingkan di halaman profil daerah." />
      ) : (
        <>
          <KartuGrafik
            judul={`${ukuran === "share" ? "Porsi" : "Nilai"} belanja per fungsi, ${filter.tahun}`}
            keterangan={ukuran === "share" ? "Persen dari total belanja masing-masing daerah." : "Dalam triliun rupiah (APBD Anggaran)."}
            definisi="share"
          >
            <div className="mb-3">
              <PilihanTautan
                label="Tampilkan"
                pilihan={[
                  { teks: "Porsi", href: tautan("/bandingkan", filter, { kode: kode.join(","), ukuran: "share" }), aktif: ukuran === "share" },
                  { teks: "Rupiah", href: tautan("/bandingkan", filter, { kode: kode.join(","), ukuran: "nominal" }), aktif: ukuran === "nominal" },
                ]}
              />
            </div>
            <GrafikBandingkan pemda={pemda} ukuran={ukuran} />
          </KartuGrafik>

          <KartuGrafik
            judul="Selisihnya"
            keterangan={`Angka kecil di samping: selisih dengan ${pemda[0].nama}.`}
            definisi="delta"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fungsi</TableHead>
                  {pemda.map((p) => (
                    <TableHead key={p.kode} className="text-right">
                      <TautanPemda kode={p.kode} nama={p.nama} query={q} />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pemda[0].fungsi.map((f, j) => (
                  <TableRow key={f.kode}>
                    <TableCell>{f.nama}</TableCell>
                    {pemda.map((p, i) => (
                      <TableCell key={p.kode} className="text-right tabular-nums">
                        {persen(p.fungsi[j].share)}
                        {i > 0 && <span className="ml-2 text-xs text-muted-foreground">{pp(p.fungsi[j].share - pemda[0].fungsi[j].share)}</span>}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                <TableRow className="font-medium">
                  <TableCell>Total belanja</TableCell>
                  {pemda.map((p) => (
                    <TableCell key={p.kode} className="text-right">
                      {rupiahTriliun(p.total)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </KartuGrafik>
        </>
      )}
    </>
  );
}
