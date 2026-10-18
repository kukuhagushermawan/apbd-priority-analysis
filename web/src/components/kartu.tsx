import { AlertTriangle, Info, SearchX } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function JudulHalaman({ judul, keterangan }: { judul: string; keterangan: string }) {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight text-primary">{judul}</h1>
      <p className="max-w-3xl text-sm text-muted-foreground">{keterangan}</p>
    </div>
  );
}

/** Tautan ke catatan definisi rumus di halaman Kualitas Data. */
export function TautanDefinisi({ id }: { id: string }) {
  return (
    <Link href={`/data#${id}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
      <Info className="size-3.5" aria-hidden /> Definisi
    </Link>
  );
}

export function KartuGrafik(props: { judul: string; keterangan: string; definisi: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={props.className}>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="text-base">{props.judul}</CardTitle>
          <CardDescription>{props.keterangan}</CardDescription>
        </div>
        <TautanDefinisi id={props.definisi} />
      </CardHeader>
      <CardContent>{props.children}</CardContent>
    </Card>
  );
}

export function KartuKpi(props: { label: string; nilai: string; catatan?: React.ReactNode; definisi?: string }) {
  return (
    <Card className="gap-2 border-t-4 border-t-accent py-4">
      <CardContent className="space-y-1 px-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{props.label}</p>
          {props.definisi && <TautanDefinisi id={props.definisi} />}
        </div>
        <p className="text-2xl font-semibold text-primary">{props.nilai}</p>
        {props.catatan && <div className="text-xs text-muted-foreground">{props.catatan}</div>}
      </CardContent>
    </Card>
  );
}

export function Kosong({ pesan }: { pesan: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
      <SearchX className="size-6" aria-hidden />
      {pesan}
    </div>
  );
}

export function KerangkaMemuat() {
  return (
    <div className="space-y-4" aria-busy aria-label="Memuat data">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

/** Tombol pilihan berupa tautan (mis. periode, Nominal ↔ Share), nilai tersimpan di URL. */
export function PilihanTautan({ label, pilihan }: { label: string; pilihan: { teks: string; href: string; aktif: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-medium text-muted-foreground">{label}</span>
      <div className="inline-flex rounded-md border bg-card p-0.5">
        {pilihan.map((p) => (
          <Link
            key={p.teks}
            href={p.href}
            scroll={false}
            aria-current={p.aktif ? "true" : undefined}
            className={`rounded px-3 py-1 ${p.aktif ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"}`}
          >
            {p.teks}
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Peringatan berlatar kuning (patahan klasifikasi, sifat eksploratif). */
export function Peringatan({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

/** Tautan nama pemda: semua jalur bermuara ke Profil Daerah. */
export function TautanPemda({ kode, nama, query = "" }: { kode: string; nama: string; query?: string }) {
  return (
    <Link href={`/daerah/${kode}${query}`} className="font-medium text-primary hover:underline">
      {nama}
    </Link>
  );
}
