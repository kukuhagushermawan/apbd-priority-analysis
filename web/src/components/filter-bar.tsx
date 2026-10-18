"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { bacaFilter, DAFTAR_TAHUN, DAFTAR_TINGKAT, keQuery, type Filter } from "@/lib/filter";
import { FUNGSI_AKTIF, NAMA_FUNGSI } from "@/lib/fungsi";
import { cn } from "@/lib/utils";

type Provinsi = { kode_pemda: string; nama_pemda: string };

/** Filter global (tahun, tingkat, provinsi, fungsi) yang disimpan di URL. */
export function FilterBar({ provinsi }: { provinsi: Provinsi[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const filter = bacaFilter(useSearchParams());
  const [memuat, mulai] = useTransition();

  const ubah = (perubahan: Partial<Filter>) =>
    mulai(() => router.replace(`${pathname}${keQuery({ ...filter, ...perubahan })}`, { scroll: false }));

  return (
    <div className={cn("grid grid-cols-2 gap-3 transition-opacity sm:flex sm:flex-wrap sm:items-end", memuat && "opacity-60")} aria-busy={memuat}>
      <Pilihan label="Tahun" value={String(filter.tahun)} onChange={(v) => ubah({ tahun: Number(v) })}>
        {DAFTAR_TAHUN.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </Pilihan>
      <Pilihan label="Tingkat" value={filter.tingkat ?? ""} onChange={(v) => ubah({ tingkat: (v || null) as Filter["tingkat"] })}>
        <option value="">Semua tingkat</option>
        {DAFTAR_TINGKAT.map((t) => (
          <option key={t} value={t}>
            {t[0].toUpperCase() + t.slice(1)}
          </option>
        ))}
      </Pilihan>
      <Pilihan label="Provinsi" value={filter.provinsi ?? ""} onChange={(v) => ubah({ provinsi: v || null })}>
        <option value="">Semua provinsi</option>
        {provinsi.map((p) => (
          <option key={p.kode_pemda} value={p.kode_pemda}>
            {p.nama_pemda.replace("Provinsi ", "")}
          </option>
        ))}
      </Pilihan>
      <Pilihan label="Fungsi" value={filter.fungsi ?? ""} onChange={(v) => ubah({ fungsi: v || null })}>
        <option value="">Semua fungsi</option>
        {FUNGSI_AKTIF.map((k) => (
          <option key={k} value={k}>
            {NAMA_FUNGSI[k]}
          </option>
        ))}
      </Pilihan>
    </div>
  );
}

function Pilihan(props: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground sm:min-w-40">
      {props.label}
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {props.children}
      </select>
    </label>
  );
}
