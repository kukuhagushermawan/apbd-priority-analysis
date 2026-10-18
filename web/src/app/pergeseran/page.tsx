import { Suspense } from "react";
import { GrafikPita } from "@/components/grafik";
import { JudulHalaman, KartuGrafik, KerangkaMemuat, Kosong, Peringatan, TautanPemda } from "@/components/kartu";
import { HeatmapDelta } from "@/components/ringkasan-grafik";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPergeseran, getRingkasan } from "@/lib/data";
import { bacaFilter, keQuery } from "@/lib/filter";
import { persen, pp } from "@/lib/format";

export default function DeteksiPergeseran({ searchParams }: PageProps<"/pergeseran">) {
  return (
    <>
      <JudulHalaman
        judul="Deteksi Pergeseran"
        keterangan="Kapan dan di mana prioritas belanja bergeser tajam? Klik sel heatmap untuk melihat pemda penyumbang perubahan Anggaran."
      />
      <Suspense fallback={<KerangkaMemuat />}>
        <Isi searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Isi({ searchParams }: { searchParams: PageProps<"/pergeseran">["searchParams"] }) {
  const filter = bacaFilter(await searchParams);
  const ringkasan = await getRingkasan(filter);
  if (!ringkasan.jumlahPemda) return <Kosong pesan="Tidak ada pemda yang cocok dengan filter ini." />;

  // fungsi default: yang Δshare agregatnya paling besar pada tahun terpilih
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
          Perubahan 2022→2023 dipengaruhi <b>patahan klasifikasi</b> (pemetaan kegiatan ke fungsi berubah mengikuti Kepmendagri 050), bukan
          semata keputusan daerah.
        </Peringatan>
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        <KartuGrafik
          judul="Perubahan share Anggaran (Δshare, pp)"
          keterangan="Sel bergaris tebal = pilihan saat ini. Klik sel lain untuk mengganti tahun dan fungsi."
          definisi="delta"
        >
          <HeatmapDelta delta={ringkasan.delta} fungsiDipilih={fungsi} />
        </KartuGrafik>
        <KartuGrafik
          judul="Indeks Pergeseran Struktur (IPS) Anggaran"
          keterangan="Median IPS pemda per tahun dengan rentang antarkuartil. Semakin tinggi, semakin banyak anggaran berpindah fungsi."
          definisi="ips"
        >
          <GrafikPita
            sumbuX={tahunIps}
            garis={ips("median")}
            namaGaris="Median IPS"
            bawah={ips("p25")}
            atas={ips("p75")}
            namaPita="Rentang antarkuartil"
            satuan="pp"
            anotasi={[{ x: "2023", teks: "Patahan klasifikasi" }]}
            label="Median indeks pergeseran struktur per tahun"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Pemda dengan lonjakan (z robust &gt; 3): {data.ipsTahunan.map((d) => `${d.tahun}: ${d.lonjakan}`).join(" · ")}
          </p>
        </KartuGrafik>
      </div>

      {filter.tahun === 2022 ? (
        <Kosong pesan="Δshare dan IPS baru tersedia mulai 2023. Pilih tahun 2023–2026." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <KartuGrafik
            judul={`Pemda penyumbang: ${data.namaFungsi}, ${filter.tahun}`}
            keterangan="Pemda dengan kenaikan dan penurunan share Anggaran terbesar untuk fungsi dan tahun terpilih."
            definisi="delta"
          >
            <TabelPenyumbang judul="Naik paling besar" baris={data.penyumbangNaik} query={q} />
            <TabelPenyumbang judul="Turun paling besar" baris={data.penyumbangTurun} query={q} />
          </KartuGrafik>
          <KartuGrafik
            judul={`Ranking lonjakan IPS Anggaran, ${filter.tahun}`}
            keterangan="Pemda dengan z robust > 3 dibanding pemda setingkat di tahun yang sama."
            definisi="ips"
          >
            {data.lonjakan.length === 0 ? (
              <Kosong pesan="Tidak ada lonjakan untuk filter ini." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pemda</TableHead>
                    <TableHead className="text-right">IPS</TableHead>
                    <TableHead className="text-right">z robust</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lonjakan.map((r) => (
                    <TableRow key={r.kode_pemda}>
                      <TableCell>
                        <TautanPemda kode={r.kode_pemda} nama={r.nama_pemda} query={q} />
                        <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">{r.nama_provinsi}</span>
                      </TableCell>
                      <TableCell className="text-right">{r.ips_pp.toFixed(1).replace(".", ",")} pp</TableCell>
                      <TableCell className="text-right font-medium">{r.z_robust.toFixed(1).replace(".", ",")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </KartuGrafik>
        </div>
      )}
    </>
  );
}

function TabelPenyumbang(props: {
  judul: string;
  baris: { kode_pemda: string; nama_pemda: string; nama_provinsi: string; share_pct: number; delta_pp: number }[];
  query: string;
}) {
  if (!props.baris.length) return null;
  return (
    <div className="mb-4 last:mb-0">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{props.judul}</p>
      <Table>
        <TableBody>
          {props.baris.map((r) => (
            <TableRow key={r.kode_pemda}>
              <TableCell>
                <TautanPemda kode={r.kode_pemda} nama={r.nama_pemda} query={props.query} />
              </TableCell>
              <TableCell className="text-right text-muted-foreground">{persen(r.share_pct)}</TableCell>
              <TableCell className="text-right font-medium">{pp(r.delta_pp)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
