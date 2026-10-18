import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { WARNA_KOMPONEN } from "@/lib/warna";
import { getRingkasan } from "@/lib/data";
import { TAHUN_TERAKHIR } from "@/lib/filter";
import { persen, pp, rupiahTriliun } from "@/lib/format";

const JELAJAH = [
  { href: "/ringkasan", judul: "Ringkasan", isi: "Komposisi belanja seluruh daerah dan perubahannya tiap tahun." },
  { href: "/tren", judul: "Tren", isi: "Fungsi yang porsinya naik atau turun terus sejak 2022." },
  { href: "/pergeseran", judul: "Pergeseran", isi: "Tahun dan daerah dengan perubahan prioritas paling tajam." },
  { href: "/daerah", judul: "Daerah", isi: "Profil satu daerah dibanding daerah setingkat." },
  { href: "/klaster", judul: "Klaster & peta", isi: "Kelompok daerah dengan pola belanja mirip, di atas peta." },
  { href: "/proyeksi", judul: "Proyeksi", isi: "Perkiraan arah 2027–2028 beserta tingkat kesalahannya." },
];

export default async function Beranda() {
  const data = await getRingkasan({ tahun: TAHUN_TERAKHIR, tingkat: null, provinsi: null, fungsi: null });
  const iAkhir = data.tahun.length - 1;

  return (
    <div className="mx-auto max-w-5xl px-6">
      <header className="flex items-center justify-between py-6 text-sm">
        <span className="flex items-center gap-2 font-semibold">
          <span className="size-2 rounded-full bg-accent" aria-hidden />
          Peta Belanja Daerah
        </span>
        <Link href="/ringkasan" className="text-muted-foreground hover:text-foreground">
          Buka dashboard
        </Link>
      </header>

      <section className="py-20 sm:py-28">
        <p className="text-sm text-muted-foreground">Capstone Project · Computer Science UGM 2026</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">Ke mana uang daerah dibelanjakan?</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Kami membaca APBD {data.jumlahPemda} pemerintah daerah dari 2022 sampai 2026, lalu melihat fungsi mana yang makin
          diprioritaskan, mana yang mengecil, dan ke mana arahnya.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-6">
          <Link
            href="/ringkasan"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Mulai menjelajah <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link href="/daerah" className="text-sm font-medium underline-offset-4 hover:underline">
            Cari daerah Anda
          </Link>
        </div>
      </section>

      <section className="border-t py-12">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-medium">Komposisi belanja daerah, Anggaran {TAHUN_TERAKHIR}</h2>
          <span className="text-xs text-muted-foreground">Total {rupiahTriliun(data.totalBelanja)}</span>
        </div>
        <div className="mt-4 flex h-10 gap-[2px] overflow-hidden rounded-lg" role="img" aria-label={`Komposisi belanja daerah ${TAHUN_TERAKHIR}`}>
          {data.komposisi.map((g) => (
            <div key={g.kode} style={{ width: `${g.nilai[iAkhir]}%`, background: WARNA_KOMPONEN[g.kode] }} title={`${g.nama}: ${persen(g.nilai[iAkhir])}`} />
          ))}
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          {data.komposisi.map((g) => (
            <li key={g.kode} className="flex items-center gap-2">
              <span className="size-2.5 rounded-sm" style={{ background: WARNA_KOMPONEN[g.kode] }} aria-hidden />
              <span className="text-muted-foreground">{g.nama}</span>
              <span className="ml-auto font-medium sm:ml-0">{persen(g.nilai[iAkhir])}</span>
            </li>
          ))}
        </ul>
        {data.kenaikanTerbesar && (
          <p className="mt-6 text-sm text-muted-foreground">
            Dibanding {TAHUN_TERAKHIR - 1}, porsi yang paling bertambah adalah{" "}
            <span className="font-medium text-foreground">{data.kenaikanTerbesar.nama.toLowerCase()}</span> ({pp(data.kenaikanTerbesar.delta)}).
          </p>
        )}
      </section>

      <section className="border-t py-12">
        <h2 className="text-sm font-medium">Yang bisa dilihat</h2>
        <ul className="mt-4 grid gap-x-10 sm:grid-cols-2">
          {JELAJAH.map((j) => (
            <li key={j.href} className="border-b last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0">
              <Link href={j.href} className="group flex items-start justify-between gap-4 py-4">
                <span>
                  <span className="block font-medium">{j.judul}</span>
                  <span className="block text-sm text-muted-foreground">{j.isi}</span>
                </span>
                <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t py-12 text-sm leading-relaxed text-muted-foreground">
        <h2 className="mb-2 font-medium text-foreground">Tentang data</h2>
        <p className="max-w-2xl">
          Sumbernya berkas APBD status Anggaran dari DJPK Kemenkeu, jadi yang terlihat adalah rencana belanja, belum realisasi. Format lima
          tahun kami samakan dulu, lalu totalnya dicocokkan dengan Ringkasan APBD.{" "}
          <Link href="/data" className="text-foreground underline underline-offset-4">
            Baca metodologinya
          </Link>
          .
        </p>
      </section>

      <footer className="flex flex-col gap-1 border-t py-8 text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <span>Computer Science UGM 2026 · Capstone Project</span>
        <span>Data: DJPK Kemenkeu · Batas wilayah: geoBoundaries</span>
      </footer>
    </div>
  );
}
