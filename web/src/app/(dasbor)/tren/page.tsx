import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GrafikPita } from "@/components/grafik";
import { JudulHalaman, KartuGrafik, KerangkaMemuat, Kosong, PilihanTautan, TautanPemda } from "@/components/kartu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bacaPeriode } from "@/lib/api";
import { getTren, PERIODE } from "@/lib/data";
import { bacaFilter, keQuery, tautan } from "@/lib/filter";
import { pp } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tren" };

export default function Tren({ searchParams }: PageProps<"/tren">) {
  return (
    <>
      <JudulHalaman
        eyebrow="Tren · 2022–2026"
        judul="Urusan yang terus naik atau turun"
        keterangan="Porsi tiap fungsi dari tahun ke tahun, dan fungsi mana yang bergerak paling konsisten."
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
  if (!data.deret.length) return <Kosong pesan="Tidak ada daerah yang cocok dengan filter ini." />;

  const sumbuX = ["2022", "2023", "2024", "2025", "2026", "2027"];
  const ambil = (k: "p25" | "median" | "p75") => sumbuX.map((t) => data.deret.find((d) => String(d.tahun) === t)?.[k] ?? null);
  const q = keQuery(filter);

  return (
    <>
      <KartuGrafik
        judul={`Porsi ${data.namaFungsi.toLowerCase()} di APBD daerah`}
        keterangan="Garis: daerah di tengah-tengah (median). Area: separuh daerah berada di rentang ini."
        definisi="share"
      >
        <GrafikPita
          sumbuX={sumbuX}
          garis={ambil("median")}
          namaGaris="Median"
          bawah={ambil("p25")}
          atas={ambil("p75")}
          namaPita="Separuh daerah"
          anotasi={[
            { x: "2022", teks: "UU HKPD" },
            { x: "2023", teks: "Klasifikasi berubah" },
            { x: "2027", teks: "Batas belanja dilonggarkan?" },
          ]}
          label={`Tren porsi anggaran ${data.namaFungsi} 2022-2026`}
        />
      </KartuGrafik>

      <div className="grid gap-5 xl:grid-cols-3">
        <KartuGrafik
          className="xl:col-span-2"
          judul="Naik atau turun per tahun"
          keterangan="Pilih fungsi untuk melihat grafiknya di atas."
          definisi="tren"
          aksi={
            <PilihanTautan
              label="Periode"
              pilihan={PERIODE.map((p) => ({ teks: p.replace("-", "–"), href: tautan("/tren", filter, { periode: p }), aktif: p === periode }))}
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fungsi</TableHead>
                <TableHead className="text-right">Per tahun</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Daerah naik</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Turun</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.ranking.map((r) => (
                <TableRow key={r.kode_fungsi} className={cn(r.kode_fungsi === fungsi && "bg-muted/60")}>
                  <TableCell>
                    <Link href={tautan("/tren", { ...filter, fungsi: r.kode_fungsi }, { periode })} scroll={false} className="hover:underline">
                      {r.nama}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-medium">{pp(r.median)}</TableCell>
                  <TableCell className="hidden text-right text-muted-foreground sm:table-cell">{r.naik}</TableCell>
                  <TableCell className="hidden text-right text-muted-foreground sm:table-cell">{r.turun}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </KartuGrafik>

        <KartuGrafik judul={`${data.namaFungsi}: paling cepat berubah`} keterangan={`Per tahun, ${periode.replace("-", "–")}.`} definisi="tren">
          <DaftarEkstrem judul="Naik" baris={data.naik} query={q} />
          <DaftarEkstrem judul="Turun" baris={data.turun} query={q} />
        </KartuGrafik>
      </div>
    </>
  );
}

function DaftarEkstrem({ judul, baris, query }: { judul: string; baris: { kode_pemda: string; nama_pemda: string; kemiringan_pp: number }[]; query: string }) {
  return (
    <div className="mb-5 last:mb-0">
      <p className="mb-1 text-xs text-muted-foreground">{judul}</p>
      <ul className="text-sm">
        {baris.map((b) => (
          <li key={b.kode_pemda} className="flex justify-between gap-2 border-b py-2 last:border-b-0">
            <TautanPemda kode={b.kode_pemda} nama={b.nama_pemda} query={query} />
            <span className="shrink-0 text-muted-foreground">{pp(b.kemiringan_pp)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
