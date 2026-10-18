import Link from "next/link";
import { Suspense } from "react";
import { GrafikPita } from "@/components/grafik";
import { JudulHalaman, KartuGrafik, KerangkaMemuat, Kosong, PilihanTautan, TautanPemda } from "@/components/kartu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bacaPeriode } from "@/lib/api";
import { getTren, PERIODE } from "@/lib/data";
import { bacaFilter, keQuery, tautan } from "@/lib/filter";
import { pp } from "@/lib/format";

export default function TrenPerFungsi({ searchParams }: PageProps<"/tren">) {
  return (
    <>
      <JudulHalaman
        judul="Tren per Fungsi"
        keterangan="Fungsi apa yang porsinya naik atau turun secara konsisten? Garis = median share Anggaran pemda, pita = rentang antarkuartil (25%–75%)."
      />
      <Suspense fallback={<KerangkaMemuat />}>
        <Isi searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Isi({ searchParams }: { searchParams: PageProps<"/tren">["searchParams"] }) {
  const sp = await searchParams;
  const filter = bacaFilter(sp);
  const periode = bacaPeriode(typeof sp.periode === "string" ? sp.periode : null);
  const fungsi = filter.fungsi ?? "10";
  const data = await getTren(filter, fungsi, periode);
  if (!data.deret.length) return <Kosong pesan="Tidak ada pemda yang cocok dengan filter ini." />;

  const sumbuX = ["2022", "2023", "2024", "2025", "2026", "2027"];
  const ambil = (k: "p25" | "median" | "p75") => sumbuX.map((t) => data.deret.find((d) => String(d.tahun) === t)?.[k] ?? null);

  return (
    <>
      <KartuGrafik
        judul={`Share Anggaran ${data.namaFungsi}: median dan rentang antarkuartil`}
        keterangan="Pilih fungsi lain lewat filter Fungsi di atas atau dari tabel ranking. Garis putus-putus menandai peristiwa kebijakan."
        definisi="share"
      >
        <GrafikPita
          sumbuX={sumbuX}
          garis={ambil("median")}
          namaGaris="Median"
          bawah={ambil("p25")}
          atas={ambil("p75")}
          namaPita="Rentang antarkuartil"
          anotasi={[
            { x: "2022", teks: "UU HKPD (Jan 2022)" },
            { x: "2023", teks: "Patahan klasifikasi" },
            { x: "2027", teks: "Relaksasi batas belanja?" },
          ]}
          label={`Tren median share anggaran ${data.namaFungsi} 2022-2026`}
        />
      </KartuGrafik>

      <div className="grid gap-4 xl:grid-cols-3">
        <KartuGrafik
          className="xl:col-span-2"
          judul="Ranking kemiringan tren share Anggaran"
          keterangan="Median kemiringan regresi linear (pp/tahun) dan jumlah pemda per kategori. Klik nama fungsi untuk melihat trennya."
          definisi="tren"
        >
          <div className="mb-3">
            <PilihanTautan
              label="Periode"
              pilihan={PERIODE.map((p) => ({ teks: p, href: tautan("/tren", filter, { periode: p }), aktif: p === periode }))}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fungsi</TableHead>
                <TableHead className="text-right">Median kemiringan</TableHead>
                <TableHead className="text-right">Naik</TableHead>
                <TableHead className="text-right">Stabil</TableHead>
                <TableHead className="text-right">Turun</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.ranking.map((r) => (
                <TableRow key={r.kode_fungsi} className={r.kode_fungsi === fungsi ? "bg-secondary" : undefined}>
                  <TableCell>
                    <Link href={tautan("/tren", { ...filter, fungsi: r.kode_fungsi }, { periode })} scroll={false} className="text-primary hover:underline">
                      {r.nama}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-medium">{pp(r.median)}/thn</TableCell>
                  <TableCell className="text-right">{r.naik}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{r.stabil}</TableCell>
                  <TableCell className="text-right">{r.turun}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </KartuGrafik>

        <KartuGrafik judul={`Pemda dengan tren ${data.namaFungsi} paling tajam`} keterangan={`Kemiringan share Anggaran ${periode}.`} definisi="tren">
          <DaftarEkstrem judul="Naik paling cepat" baris={data.naik} query={keQuery(filter)} />
          <DaftarEkstrem judul="Turun paling cepat" baris={data.turun} query={keQuery(filter)} />
        </KartuGrafik>
      </div>
    </>
  );
}

function DaftarEkstrem({ judul, baris, query }: { judul: string; baris: { kode_pemda: string; nama_pemda: string; kemiringan_pp: number }[]; query: string }) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{judul}</p>
      <ul className="divide-y text-sm">
        {baris.map((b) => (
          <li key={b.kode_pemda} className="flex justify-between gap-2 py-1.5">
            <TautanPemda kode={b.kode_pemda} nama={b.nama_pemda} query={query} />
            <span className="shrink-0 tabular-nums">{pp(b.kemiringan_pp)}/thn</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
