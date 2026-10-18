import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CariPemda } from "@/components/cari-pemda";
import { JudulHalaman } from "@/components/kartu";
import { Skeleton } from "@/components/ui/skeleton";
import { getDaftarPemda } from "@/lib/data";

export const metadata: Metadata = { title: "Daerah" };

export default async function CariDaerah() {
  const daftar = await getDaftarPemda();
  const provinsi = daftar.filter((p) => p.tingkat === "provinsi").sort((a, b) => a.nama_pemda.localeCompare(b.nama_pemda));
  return (
    <>
      <JudulHalaman judul="Daerah" keterangan="Cari provinsi, kabupaten, atau kota untuk melihat profil belanjanya." />
      <Suspense fallback={<Skeleton className="h-9 max-w-md" />}>
        <CariPemda daftar={daftar} tujuan="profil" />
      </Suspense>
      <section className="pt-4">
        <h2 className="mb-3 text-sm font-medium">Atau pilih provinsi</h2>
        <ul className="grid grid-cols-1 gap-x-8 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {provinsi.map((p) => (
            <li key={p.kode_pemda} className="border-b">
              <Link href={`/daerah/${p.kode_pemda}`} className="block py-2 text-muted-foreground hover:text-foreground">
                {p.nama_pemda.replace("Provinsi ", "")}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
