import { ArrowRight } from "lucide-react";
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
  const jumlahDi = (kode: string) => daftar.filter((p) => p.tingkat !== "provinsi" && p.kode_pemda.slice(0, 2) === kode.slice(0, 2)).length;
  return (
    <>
      <JudulHalaman
        eyebrow="Daerah"
        judul="Cari daerah Anda"
        keterangan="Ketik nama provinsi, kabupaten, atau kota untuk membuka profil belanjanya, meliputi komposisi belanja, posisi terhadap daerah setingkat, dan kelompoknya."
      >
        <div className="col-span-full max-w-xl">
          <Suspense fallback={<Skeleton className="h-11 rounded-full bg-white/20" />}>
            <CariPemda daftar={daftar} tujuan="profil" besar />
          </Suspense>
        </div>
      </JudulHalaman>
      <section className="rounded-3xl bg-card p-6 sm:p-7">
        <h2 className="text-base font-bold">Telusuri berdasarkan provinsi</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">Sebanyak 38 provinsi, termasuk empat provinsi baru hasil pemekaran Papua tahun 2022.</p>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {provinsi.map((p) => (
            <li key={p.kode_pemda}>
              <Link
                href={`/daerah/${p.kode_pemda}`}
                className="group flex items-center justify-between gap-3 rounded-2xl bg-secondary px-4 py-3 text-sm transition-colors hover:bg-[#dfe7f3]"
              >
                <span>
                  <span className="block font-semibold">{p.nama_pemda.replace("Provinsi ", "")}</span>
                  <span className="block text-xs text-muted-foreground">{jumlahDi(p.kode_pemda)} kabupaten/kota</span>
                </span>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
