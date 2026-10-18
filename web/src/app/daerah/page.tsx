import Link from "next/link";
import { Suspense } from "react";
import { CariPemda } from "@/components/cari-pemda";
import { JudulHalaman, KartuGrafik } from "@/components/kartu";
import { Skeleton } from "@/components/ui/skeleton";
import { getDaftarPemda } from "@/lib/data";

export default async function CariDaerah() {
  const daftar = await getDaftarPemda();
  const provinsi = daftar.filter((p) => p.tingkat === "provinsi").sort((a, b) => a.nama_pemda.localeCompare(b.nama_pemda));
  return (
    <>
      <JudulHalaman
        judul="Profil Daerah"
        keterangan="Cari salah satu dari 546 pemda untuk melihat komposisi Anggaran per tahun, posisinya terhadap median dan klaster, serta indikator pendidikan."
      />
      <Suspense fallback={<Skeleton className="h-9 max-w-md" />}>
        <CariPemda daftar={daftar} tujuan="profil" />
      </Suspense>
      <KartuGrafik judul="Atau mulai dari provinsi" keterangan="38 pemerintah provinsi (termasuk 4 provinsi hasil pemekaran Papua 2022)." definisi="share">
        <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {provinsi.map((p) => (
            <li key={p.kode_pemda}>
              <Link href={`/daerah/${p.kode_pemda}`} className="text-primary hover:underline">
                {p.nama_pemda}
              </Link>
            </li>
          ))}
        </ul>
      </KartuGrafik>
    </>
  );
}
