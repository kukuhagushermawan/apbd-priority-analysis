import { AlertTriangle, SearchX } from "lucide-react";
import Link from "next/link";
import { Info } from "@/components/info";
import { Skeleton } from "@/components/ui/skeleton";
import type { KunciDefinisi } from "@/lib/definisi";
import { cn } from "@/lib/utils";

/** Panel judul biru tua di atas tiap halaman; children = angka kunci (StatJudul). */
export function JudulHalaman(props: {
  judul: string;
  keterangan?: string;
  eyebrow?: string;
  aksi?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-primary px-6 py-7 text-white sm:px-8">
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          {props.eyebrow && <p className="text-sm text-[#c3cee0]">{props.eyebrow}</p>}
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">{props.judul}</h1>
          {props.keterangan && <p className="mt-2 text-[15px] leading-relaxed text-[#c3cee0]">{props.keterangan}</p>}
        </div>
        {props.aksi && <div className="flex shrink-0 flex-wrap gap-2">{props.aksi}</div>}
      </div>
      {props.children && <div className="relative mt-7 grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">{props.children}</div>}
    </section>
  );
}

export function StatJudul(props: { label: string; nilai: string; catatan?: React.ReactNode; definisi?: KunciDefinisi; sorot?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <p className="text-[13px] text-[#c3cee0]">{props.label}</p>
        {props.definisi && <Info id={props.definisi} gelap />}
      </div>
      <p className={cn("mt-1 text-2xl font-bold tracking-tight sm:text-3xl", props.sorot && "text-accent")}>{props.nilai}</p>
      {props.catatan && <div className="mt-0.5 text-[13px] text-[#8ea3c6]">{props.catatan}</div>}
    </div>
  );
}

/** Tombol di panel judul (Bandingkan, CSV, dst.). */
export const kelasTombolGelap =
  "inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20";

/** Kartu putih untuk grafik/tabel. definisi = istilah yang bisa dibuka lewat ikon ⓘ. */
export function KartuGrafik(props: {
  judul: string;
  keterangan?: string;
  definisi?: KunciDefinisi;
  aksi?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 rounded-3xl bg-card p-6 sm:p-7", props.className)}>
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-bold">{props.judul}</h2>
          {props.keterangan && <p className="text-[13px] leading-relaxed text-muted-foreground">{props.keterangan}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {props.aksi}
          {props.definisi && <Info id={props.definisi} />}
        </div>
      </header>
      {props.children}
    </section>
  );
}

export function Kosong({ pesan }: { pesan: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl bg-card p-12 text-center text-sm text-muted-foreground">
      <SearchX className="size-5" aria-hidden />
      {pesan}
    </div>
  );
}

export function KerangkaMemuat() {
  return (
    <div className="space-y-5" aria-busy aria-label="Memuat data">
      <Skeleton className="h-40 rounded-3xl bg-white/70" />
      <div className="grid gap-5 xl:grid-cols-2">
        <Skeleton className="h-96 rounded-3xl bg-white/70" />
        <Skeleton className="h-96 rounded-3xl bg-white/70" />
      </div>
    </div>
  );
}

/** Pilihan berbentuk pill; nilainya tersimpan di URL. */
export function PilihanTautan({ label, pilihan }: { label: string; pilihan: { teks: string; href: string; aktif: boolean }[] }) {
  return (
    <div className="flex items-center gap-2 text-xs" role="group" aria-label={label}>
      <span className="text-muted-foreground">{label}</span>
      <div className="inline-flex rounded-full bg-secondary p-1">
        {pilihan.map((p) => (
          <Link
            key={p.teks}
            href={p.href}
            scroll={false}
            aria-current={p.aktif ? "true" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 font-medium transition-colors",
              p.aktif ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p.teks}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Peringatan({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-[#fff4cf] px-5 py-3.5 text-sm leading-relaxed text-[#6b4a00]">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

/** Nama daerah selalu menaut ke profilnya. */
export function TautanPemda({ kode, nama, query = "" }: { kode: string; nama: string; query?: string }) {
  return (
    <Link href={`/daerah/${kode}${query}`} className="font-semibold text-primary underline-offset-4 hover:underline">
      {nama}
    </Link>
  );
}

/** Label kecil "melonjak" dan sejenisnya. */
export function Lencana({ children }: { children: React.ReactNode }) {
  return <span className="ml-2 rounded-full bg-[#fff4cf] px-2 py-0.5 text-[11px] font-semibold text-[#8a5a00]">{children}</span>;
}
