import { Info, SearchX } from "lucide-react";
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

/** Penanda halaman yang dibangun pada milestone 5. */
export function Menyusul({ judul, isi }: { judul: string; isi: string }) {
  return (
    <>
      <JudulHalaman judul={judul} keterangan={isi} />
      <Kosong pesan="Halaman ini sedang dibangun (milestone 5)." />
    </>
  );
}
