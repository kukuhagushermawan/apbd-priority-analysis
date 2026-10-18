import { X } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { GrafikBandingkan } from "@/components/bandingkan-grafik";
import { CariPemda } from "@/components/cari-pemda";
import { WARNA_SERI } from "@/components/grafik";
import { JudulHalaman, KartuGrafik, KerangkaMemuat, Kosong, PilihanTautan, TautanPemda } from "@/components/kartu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bacaKode } from "@/lib/api";
import { getBandingkan, getDaftarPemda } from "@/lib/data";
import { bacaFilter, keQuery, tautan } from "@/lib/filter";
import { persen, pp, rupiahTriliun } from "@/lib/format";

export default function Perbandingan({ searchParams }: PageProps<"/bandingkan">) {
  return (
    <>
      <JudulHalaman
        judul="Perbandingan"
        keterangan="Bandingkan 2–4 pemda: berapa share atau nominal Anggaran tiap fungsi, dan selisihnya dalam poin persentase."
      />
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
            <span key={p.kode} className="inline-flex items-center gap-2 rounded-full border bg-card py-1 pl-3 pr-1 text-sm">
              <span className="size-2.5 rounded-full" style={{ background: WARNA_SERI[i] }} aria-hidden />
              {p.nama}
              <Link href={tanpa(p.kode)} scroll={false} aria-label={`Hapus ${p.nama}`} className="rounded-full p-1 hover:bg-secondary">
                <X className="size-3.5" />
              </Link>
            </span>
          ))}
        </div>
        {pemda.length < 4 && (
          <Suspense>
            <CariPemda daftar={daftar} tujuan="bandingkan" placeholder={pemda.length ? "Tambah pemda pembanding…" : "Pilih pemda pertama…"} />
          </Suspense>
        )}
      </div>

      {pemda.length < 2 ? (
        <Kosong pesan="Pilih minimal 2 pemda untuk dibandingkan (maksimal 4). Tombol “Bandingkan” di Profil Daerah juga menambahkan pemda ke sini." />
      ) : (
        <>
          <KartuGrafik
            judul={`${ukuran === "share" ? "Share" : "Nominal"} Anggaran per fungsi, ${filter.tahun}`}
            keterangan={ukuran === "share" ? "Porsi tiap fungsi terhadap total belanja masing-masing pemda." : "Nilai anggaran dalam triliun rupiah."}
            definisi="share"
          >
            <div className="mb-3">
              <PilihanTautan
                label="Ukuran"
                pilihan={[
                  { teks: "Share", href: tautan("/bandingkan", filter, { kode: kode.join(","), ukuran: "share" }), aktif: ukuran === "share" },
                  { teks: "Nominal", href: tautan("/bandingkan", filter, { kode: kode.join(","), ukuran: "nominal" }), aktif: ukuran === "nominal" },
                ]}
              />
            </div>
            <GrafikBandingkan pemda={pemda} ukuran={ukuran} />
          </KartuGrafik>

          <KartuGrafik
            judul={`Selisih share Anggaran terhadap ${pemda[0].nama} (pp)`}
            keterangan="Pemda pertama menjadi acuan. Total belanja ditampilkan di baris terakhir."
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
