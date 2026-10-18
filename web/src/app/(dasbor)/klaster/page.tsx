import type { Metadata } from "next";
import { Suspense } from "react";
import { JudulHalaman, KartuGrafik, KerangkaMemuat, Kosong, Peringatan, PilihanTautan, TautanPemda } from "@/components/kartu";
import { GrafikCentroid, GrafikSankey } from "@/components/klaster-grafik";
import { PetaKlaster } from "@/components/peta-klaster";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getKlaster } from "@/lib/data";
import { bacaFilter, keQuery, tautan } from "@/lib/filter";

export const metadata: Metadata = { title: "Klaster & peta" };

export default function HalamanKlaster({ searchParams }: PageProps<"/klaster">) {
  return (
    <>
      <JudulHalaman
        judul="Klaster & peta"
        keterangan="Daerah dengan pola belanja mirip dikelompokkan bersama. Provinsi dan kabupaten/kota dihitung terpisah."
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
  const link = (ekstra: Record<string, string>) => tautan("/klaster", filter, { kelompok, dari: String(dari), ...ekstra });

  if (!data.anggota2026.length) return <Kosong pesan="Tidak ada daerah yang cocok dengan filter ini." />;

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
        <Peringatan>Data 2022 memakai klasifikasi fungsi yang lama, jadi sebagian perpindahan sejak 2022 bukan perubahan sungguhan.</Peringatan>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <KartuGrafik
          judul="Ciri tiap kelompok"
          keterangan="Rata-rata porsi belanja anggota kelompok. Abu-abu: rata-rata semua daerah."
          definisi="klaster"
        >
          <GrafikCentroid klaster={data.klaster} centroid={data.centroid} />
        </KartuGrafik>
        <KartuGrafik
          judul={`Perpindahan kelompok, ${dari}–2026`}
          keterangan="Makin lebar alirannya, makin banyak daerah."
          definisi="klaster"
        >
          <GrafikSankey klaster={data.klaster} tahunAwal={dari} migrasi={data.migrasi} />
        </KartuGrafik>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <KartuGrafik judul="Jumlah anggota" definisi="klaster">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tahun</TableHead>
                {data.klaster.map((k) => (
                  <TableHead key={k.klaster} className="text-right">
                    K{k.klaster}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.jumlahPerTahun.map((r) => (
                <TableRow key={r.tahun}>
                  <TableCell>
                    {r.tahun}
                    {r.tahun === 2022 ? "" : ""}
                  </TableCell>
                  {r.jumlah.map((j, i) => (
                    <TableCell key={i} className="text-right tabular-nums">
                      {j}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {data.klaster.map((k) => (
              <li key={k.klaster}>{k.nama}</li>
            ))}
          </ul>
        </KartuGrafik>

        <KartuGrafik
          className="xl:col-span-2"
          judul={`${data.pindah.length} daerah pindah kelompok`}
          keterangan={`Sejak ${dari}.`}
          definisi="klaster"
        >
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <TableBody>
                {data.pindah.map((p) => (
                  <TableRow key={p.kode_pemda}>
                    <TableCell>
                      <TautanPemda kode={p.kode_pemda} nama={p.nama_pemda} query={q} />
                      <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">{p.nama_provinsi}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      K{p.dari} → K{p.ke}
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
        keterangan={kelompok === "provinsi" ? "Kabupaten/kota diberi warna kelompok provinsinya." : undefined}
        definisi="klaster"
      >
        <PetaKlaster klaster={data.klaster} anggota={data.anggota2026} modeProvinsi={kelompok === "provinsi"} query={q} />
      </KartuGrafik>
    </>
  );
}
