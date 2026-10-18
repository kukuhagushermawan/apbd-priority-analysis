import { SearchX } from "lucide-react";
import Link from "next/link";
import { Info } from "@/components/info";
import { Skeleton } from "@/components/ui/skeleton";
import type { KunciDefinisi } from "@/lib/definisi";
import { cn } from "@/lib/utils";

export function JudulHalaman({ judul, keterangan, aksi }: { judul: string; keterangan?: string; aksi?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{judul}</h1>
        {keterangan && <p className="max-w-2xl text-sm text-muted-foreground">{keterangan}</p>}
      </div>
      {aksi}
    </div>
  );
}

/** Panel grafik/tabel. definisi = kunci istilah yang bisa dibuka lewat ikon ⓘ. */
export function KartuGrafik(props: {
  judul: string;
  keterangan?: string;
  definisi?: KunciDefinisi;
  aksi?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-card p-5", props.className)}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold">{props.judul}</h2>
          {props.keterangan && <p className="text-xs text-muted-foreground">{props.keterangan}</p>}
        </div>
        <div className="flex items-center gap-2">
          {props.aksi}
          {props.definisi && <Info id={props.definisi} />}
        </div>
      </header>
      {props.children}
    </section>
  );
}

/** Deret angka kunci dalam satu bingkai, dipisah garis tipis. */
export function BarisStatistik({ children }: { children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border lg:grid-cols-4">
      {children}
    </section>
  );
}

export function KartuKpi(props: { label: string; nilai: string; catatan?: React.ReactNode; definisi?: KunciDefinisi }) {
  return (
    <div className="space-y-1 bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{props.label}</p>
        {props.definisi && <Info id={props.definisi} />}
      </div>
      <p className="text-2xl font-semibold tracking-tight">{props.nilai}</p>
      {props.catatan && <div className="text-xs text-muted-foreground">{props.catatan}</div>}
    </div>
  );
}

export function Kosong({ pesan }: { pesan: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
      <SearchX className="size-5" aria-hidden />
      {pesan}
    </div>
  );
}

export function KerangkaMemuat() {
  return (
    <div className="space-y-4" aria-busy aria-label="Memuat data">
      <Skeleton className="h-28 rounded-xl" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}

/** Pilihan berupa tautan (periode, Share/Nominal, dst.); nilainya tersimpan di URL. */
export function PilihanTautan({ label, pilihan }: { label: string; pilihan: { teks: string; href: string; aktif: boolean }[] }) {
  return (
    <div className="flex items-center gap-2 text-xs" role="group" aria-label={label}>
      <span className="text-muted-foreground">{label}</span>
      <div className="inline-flex rounded-lg bg-muted p-0.5">
        {pilihan.map((p) => (
          <Link
            key={p.teks}
            href={p.href}
            scroll={false}
            aria-current={p.aktif ? "true" : undefined}
            className={cn("rounded-md px-2.5 py-1 transition-colors", p.aktif ? "bg-card font-medium shadow-xs" : "text-muted-foreground hover:text-foreground")}
          >
            {p.teks}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Peringatan({ children }: { children: React.ReactNode }) {
  return <p className="border-l-2 border-amber-400 py-1 pl-3 text-xs leading-relaxed text-muted-foreground">{children}</p>;
}

/** Nama daerah selalu menaut ke Profil Daerah. */
export function TautanPemda({ kode, nama, query = "" }: { kode: string; nama: string; query?: string }) {
  return (
    <Link href={`/daerah/${kode}${query}`} className="font-medium underline-offset-4 hover:underline">
      {nama}
    </Link>
  );
}
