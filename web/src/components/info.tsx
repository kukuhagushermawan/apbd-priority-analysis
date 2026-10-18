"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DEFINISI, type KunciDefinisi } from "@/lib/definisi";
import { cn } from "@/lib/utils";

/** Tombol bulat "i"; klik untuk membaca arti istilah tanpa pindah halaman. */
export function Info({ id, gelap = false }: { id: KunciDefinisi; gelap?: boolean }) {
  const d = DEFINISI[id];
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Apa itu ${d.judul}?`}
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
          gelap ? "size-5 bg-white/15 text-[11px] text-white hover:bg-white/25" : "bg-secondary text-[#3e5478] hover:bg-[#dfe7f3]",
        )}
      >
        i
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-2 rounded-2xl p-4 text-sm">
        <p className="font-semibold">{d.judul}</p>
        <p className="rounded-lg bg-secondary px-2.5 py-1.5 font-mono text-xs text-[#3e5478]">{d.rumus}</p>
        <p className="leading-relaxed text-muted-foreground">{d.isi}</p>
      </PopoverContent>
    </Popover>
  );
}
