import type { Metadata } from "next";
import { Suspense } from "react";
import { GrafikPita } from "@/components/grafik";
import { JudulHalaman, KartuGrafik, KerangkaMemuat, Kosong, Peringatan, TautanPemda } from "@/components/kartu";
import { HeatmapDelta } from "@/components/ringkasan-grafik";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPergeseran, getRingkasan } from "@/lib/data";
import { bacaFilter, keQuery } from "@/lib/filter";
import { persen, pp } from "@/lib/format";

export const metadata: Metadata = { title: "Pergeseran" };

export default function Pergeseran({ searchParams }: PageProps<"/pergeseran">) {
  return (
    <>
      <JudulHalaman judul="Pergeseran" keterangan="Kapan prioritas belanja berubah tajam, dan daerah mana yang paling banyak berubah." />
      <Suspense fallback={<KerangkaMemuat />}>
        <Isi searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Isi({ searchParams }: { searchParams: PageProps<"/pergeseran">["searchParams"] }) {
  const filter = bacaFilter(await searchParams);
  const ringkasan = await getRingkasan(filter);
  if (!ringkasan.jumlahPemda) return <Kosong pesan="Tidak ada daerah yang cocok dengan filter ini." />;

  // tanpa pilihan fungsi: tampilkan fungsi yang porsinya paling banyak berubah di tahun itu
  const iTahun = (ringkasan.delta.tahun as number[]).indexOf(filter.tahun);
  const fungsi =
    filter.fungsi ?? (iTahun >= 0 ? [...ringkasan.delta.baris].sort((a, b) => Math.abs(b.nilai[iTahun]) - Math.abs(a.nilai[iTahun]))[0].kode : "01");
  const data = await getPergeseran(filter, fungsi);
  const q = keQuery(filter);
  const tahunIps = ["2023", "2024", "2025", "2026"];
  const ips = (k: "p25" | "median" | "p75") => tahunIps.map((t) => data.ipsTahunan.find((d) => String(d.tahun) === t)?.[k] ?? null);

  return (
    <>
      {filter.tahun === 2023 && (
        <Peringatan>
          Sebagian perubahan 2022→2023 terjadi karena DJPK mulai memetakan kegiatan ke fungsi dengan cara baru, bukan karena keputusan daerah.
        </Peringatan>
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        <KartuGrafik judul="Perubahan porsi per fungsi" keterangan="Kotak bergaris tebal sedang dipilih. Klik kotak lain untuk mengganti." definisi="delta">
          <HeatmapDelta delta={ringkasan.delta} fungsiDipilih={fungsi} />
        </KartuGrafik>
        <KartuGrafik judul="Besarnya pergeseran tiap tahun" keterangan="Garis: daerah di tengah-tengah. Area: separuh daerah." definisi="ips">
          <GrafikPita
            sumbuX={tahunIps}
            garis={ips("median")}
            namaGaris="Median"
            bawah={ips("p25")}
            atas={ips("p75")}
            namaPita="Separuh daerah"
            satuan="pp"
            anotasi={[{ x: "2023", teks: "Klasifikasi berubah" }]}
            label="Median pergeseran komposisi belanja per tahun"
          />
        </KartuGrafik>
      </div>

      {filter.tahun === 2022 ? (
        <Kosong pesan="Pergeseran baru bisa dihitung mulai 2023. Pilih tahun lain di atas." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <KartuGrafik judul={`${data.namaFungsi}, ${filter.tahun}: siapa yang berubah?`} keterangan="Daerah dengan kenaikan dan penurunan porsi terbesar." definisi="delta">
            <TabelPenyumbang judul="Naik" baris={data.penyumbangNaik} query={q} />
            <TabelPenyumbang judul="Turun" baris={data.penyumbangTurun} query={q} />
          </KartuGrafik>
          <KartuGrafik
            judul={`Daerah yang melonjak, ${filter.tahun}`}
            keterangan={`${data.lonjakan.length} daerah berubah jauh lebih banyak dari daerah setingkat.`}
            definisi="ips"
          >
            {data.lonjakan.length === 0 ? (
              <Kosong pesan="Tidak ada lonjakan untuk filter ini." />
            ) : (
              <div className="max-h-[28rem] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Daerah</TableHead>
                      <TableHead className="text-right">Pergeseran</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.lonjakan.map((r) => (
                      <TableRow key={r.kode_pemda}>
                        <TableCell>
                          <TautanPemda kode={r.kode_pemda} nama={r.nama_pemda} query={q} />
                          <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">{r.nama_provinsi.replace("Provinsi ", "")}</span>
                        </TableCell>
                        <TableCell className="text-right">{r.ips_pp.toFixed(1).replace(".", ",")} pp</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </KartuGrafik>
        </div>
      )}
    </>
  );
}

function TabelPenyumbang(props: {
  judul: string;
  baris: { kode_pemda: string; nama_pemda: string; share_pct: number; delta_pp: number }[];
  query: string;
}) {
  if (!props.baris.length) return null;
  return (
    <div className="mb-5 last:mb-0">
      <p className="mb-1 text-xs text-muted-foreground">{props.judul}</p>
      <ul className="text-sm">
        {props.baris.map((r) => (
          <li key={r.kode_pemda} className="flex items-center justify-between gap-3 border-b py-2 last:border-b-0">
            <TautanPemda kode={r.kode_pemda} nama={r.nama_pemda} query={props.query} />
            <span className="flex shrink-0 gap-4">
              <span className="text-muted-foreground">{persen(r.share_pct)}</span>
              <span className="w-16 text-right font-medium">{pp(r.delta_pp)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
