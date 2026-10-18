import { MapPinned } from "lucide-react";
import { Suspense } from "react";
import { JudulHalaman, KartuGrafik, KerangkaMemuat, Kosong, Peringatan, PilihanTautan, TautanPemda } from "@/components/kartu";
import { GrafikCentroid, GrafikSankey } from "@/components/klaster-grafik";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getKlaster } from "@/lib/data";
import { bacaFilter, keQuery, tautan } from "@/lib/filter";

export default function PetaKlaster({ searchParams }: PageProps<"/klaster">) {
  return (
    <>
      <JudulHalaman
        judul="Peta & Klaster"
        keterangan="Pemda dengan struktur belanja Anggaran yang mirip dikelompokkan (CLR + K-Means), terpisah untuk provinsi dan kabupaten/kota. Apakah pemda berpindah kelompok dari tahun ke tahun?"
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

  if (!data.anggota2026.length) return <Kosong pesan="Tidak ada pemda yang cocok dengan filter ini." />;

  return (
    <>
      <div className="flex flex-wrap gap-4">
        <PilihanTautan
          label="Kelompok"
          pilihan={[
            { teks: "Kabupaten/kota", href: link({ kelompok: "kabkota" }), aktif: kelompok === "kabkota" },
            { teks: "Provinsi", href: link({ kelompok: "provinsi" }), aktif: kelompok === "provinsi" },
          ]}
        />
        <PilihanTautan
          label="Migrasi dari"
          pilihan={[
            { teks: "2023", href: link({ dari: "2023" }), aktif: dari === 2023 },
            { teks: "2022 ⚑", href: link({ dari: "2022" }), aktif: dari === 2022 },
          ]}
        />
      </div>
      {dari === 2022 && (
        <Peringatan>Klaster 2022 dipengaruhi patahan klasifikasi; perpindahan 2022→2026 sebagian berasal dari perubahan cara DJPK memetakan fungsi.</Peringatan>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <KartuGrafik
          judul="Profil centroid klaster (share Anggaran)"
          keterangan={`k = ${data.k} dipilih otomatis lewat skor silhouette (${data.silhouette.toFixed(2).replace(".", ",")}). Nama klaster = komponen yang paling menonjol.`}
          definisi="klaster"
        >
          <GrafikCentroid klaster={data.klaster} centroid={data.centroid} />
        </KartuGrafik>
        <KartuGrafik
          judul={`Migrasi klaster ${dari} → 2026`}
          keterangan="Lebar aliran = jumlah pemda. Aliran lurus = tetap di klaster yang sama."
          definisi="klaster"
        >
          <GrafikSankey klaster={data.klaster} tahunAwal={dari} migrasi={data.migrasi} />
        </KartuGrafik>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <KartuGrafik judul="Jumlah pemda per klaster" keterangan="Anggota klaster tiap tahun (model dilatih 2023–2026)." definisi="klaster">
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
                    {r.tahun === 2022 ? " ⚑" : ""}
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
          judul={`Pemda yang berpindah klaster ${dari} → 2026 (${data.pindah.length})`}
          keterangan="Klik nama untuk melihat profil dan posisinya terhadap centroid."
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

      <KartuGrafik judul="Peta choropleth klaster 2026" keterangan="Warna wilayah = klaster pemda." definisi="klaster">
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          <MapPinned className="size-6" aria-hidden />
          Peta menunggu berkas GeoJSON batas wilayah kabupaten/kota yang dipetakan ke kode DJPK lewat tabel crosswalk.
        </div>
      </KartuGrafik>
    </>
  );
}
