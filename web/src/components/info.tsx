"use client";

import { Info as IkonInfo } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DEFINISI, type KunciDefinisi } from "@/lib/definisi";

/** Ikon kecil di samping judul; klik untuk melihat arti istilah tanpa pindah halaman. */
export function Info({ id }: { id: KunciDefinisi }) {
  const d = DEFINISI[id];
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Apa itu ${d.judul}?`}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <IkonInfo className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-2 text-sm">
        <p className="font-medium">{d.judul}</p>
        <p className="rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">{d.rumus}</p>
        <p className="leading-relaxed text-muted-foreground">{d.isi}</p>
      </PopoverContent>
    </Popover>
  );
}
