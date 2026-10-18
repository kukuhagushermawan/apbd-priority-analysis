import type { Metadata } from "next";
import { Suspense } from "react";
import { JudulHalaman, KartuGrafik, KerangkaMemuat, Kosong, Peringatan, PilihanTautan, TautanPemda } from "@/components/kartu";
import { GrafikCentroid, GrafikSankey } from "@/components/klaster-grafik";
import { namaKlaster } from "@/lib/fungsi";
import { PetaKlaster } from "@/components/peta-klaster";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getKlaster } from "@/lib/data";
import { bacaFilter, keQuery, tautan } from "@/lib/filter";

export const metadata: Metadata = { title: "Klaster dan Peta" };

export default function HalamanKlaster({ searchParams }: PageProps<"/klaster">) {
  return (
    <>
      <JudulHalaman
        eyebrow="Klaster dan Peta"
        judul="Daerah dengan pola belanja serupa"
        keterangan="Daerah dikelompokkan berdasarkan komposisi belanjanya. Provinsi dan kabupaten/kota dihitung secara terpisah."
      />
      <Suspense fallback={<KerangkaMemuat />}>
        <Isi searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Isi({ searchParams }: { searchParams: PageProps<"/klaster">["searchParams"] }) {
  const sp = await searchParams;
  const filter = bacaFilter(sp);
  const kelompok = sp.kelompok === "provinsi" || filter.tingkat === "provinsi" ? "provinsi" : "kabkota";
  const dari = sp.dari === "2022" ? 2022 : 2023;
  const data = await getKlaster(kelompok, dari, { ...filter, tingkat: kelompok === "provinsi" ? "provinsi" : filter.tingkat });
  const q = keQuery(filter);
  const nama = (k: number) => namaKlaster(data.klaster.find((x) => x.klaster === k)?.nama ?? "");
  const link = (ekstra: Record<string, string>) => tautan("/klaster", filter, { kelompok, dari: String(dari), ...ekstra });

  if (!data.anggota2026.length) return <Kosong pesan="Tidak ada daerah yang sesuai dengan filter ini." />;

  return (
    <>
      <div className="flex flex-wrap gap-4">
        <PilihanTautan
          label="Tingkat"
          pilihan={[
            { teks: "Kabupaten/kota", href: link({ kelompok: "kabkota" }), aktif: kelompok === "kabkota" },
            { teks: "Provinsi", href: link({ kelompok: "provinsi" }), aktif: kelompok === "provinsi" },
          ]}
        />
        <PilihanTautan
          label="Bandingkan sejak"
          pilihan={[
            { teks: "2023", href: link({ dari: "2023" }), aktif: dari === 2023 },
            { teks: "2022", href: link({ dari: "2022" }), aktif: dari === 2022 },
          ]}
        />
      </div>
      {dari === 2022 && (
        <Peringatan>Data tahun 2022 menggunakan klasifikasi fungsi lama sehingga sebagian perpindahan sejak 2022 bukan merupakan perubahan sebenarnya.</Peringatan>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <KartuGrafik
          judul="Karakteristik setiap kelompok"
          keterangan="Rata-rata porsi belanja anggota kelompok. Warna abu-abu menunjukkan rata-rata seluruh daerah."
          definisi="klaster"
        >
          <GrafikCentroid klaster={data.klaster} centroid={data.centroid} />
        </KartuGrafik>
        <KartuGrafik
          judul={`Perpindahan kelompok, ${dari}–2026`}
          keterangan="Semakin lebar aliran, semakin banyak daerah yang berpindah."
          definisi="klaster"
        >
          <GrafikSankey klaster={data.klaster} tahunAwal={dari} migrasi={data.migrasi} />
        </KartuGrafik>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <KartuGrafik judul="Jumlah anggota" definisi="klaster">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tahun</TableHead>
                {data.klaster.map((k) => (
                  <TableHead key={k.klaster} className="text-right whitespace-normal">
                    {namaKlaster(k.nama)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.jumlahPerTahun.map((r) => (
                <TableRow key={r.tahun}>
                  <TableCell>{r.tahun}</TableCell>
                  {r.jumlah.map((j, i) => (
                    <TableCell key={i} className="text-right tabular-nums">
                      {j}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </KartuGrafik>

        <KartuGrafik
          className="xl:col-span-2"
          judul={`${data.pindah.length} daerah berpindah kelompok`}
          keterangan={`Sejak tahun ${dari}.`}
          definisi="klaster"
        >
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <TableBody>
                {data.pindah.map((p) => (
                  <TableRow key={p.kode_pemda}>
                    <TableCell className="whitespace-normal">
                      <TautanPemda kode={p.kode_pemda} nama={p.nama_pemda} query={q} />
                      <span className="block text-xs text-muted-foreground">{p.nama_provinsi}</span>
                    </TableCell>
                    <TableCell className="text-right text-[13px] whitespace-normal text-muted-foreground">
                      {nama(p.dari)} → <span className="font-medium text-foreground">{nama(p.ke)}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </KartuGrafik>
      </div>

      <KartuGrafik
        judul={`Peta kelompok ${kelompok === "provinsi" ? "provinsi" : "kabupaten/kota"}, 2026`}
        keterangan={kelompok === "provinsi" ? "Kabupaten/kota diberi warna sesuai kelompok provinsinya." : undefined}
        definisi="klaster"
      >
        <PetaKlaster klaster={data.klaster} anggota={data.anggota2026} modeProvinsi={kelompok === "provinsi"} query={q} />
      </KartuGrafik>
    </>
  );
}
