"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { bacaFilter, DAFTAR_TAHUN, DAFTAR_TINGKAT, keQuery, type Filter } from "@/lib/filter";
import { FUNGSI_AKTIF, NAMA_FUNGSI } from "@/lib/fungsi";
import { cn } from "@/lib/utils";

type Provinsi = { kode_pemda: string; nama_pemda: string };

/** Filter global (tahun, tingkat, provinsi, fungsi), disimpan di URL agar bisa dibagikan. */
export function FilterBar({ provinsi }: { provinsi: Provinsi[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filter = bacaFilter(params);
  const [memuat, mulai] = useTransition();
  const aktif = Boolean(filter.tingkat || filter.provinsi || filter.fungsi || params.get("tahun"));

  const ubah = (perubahan: Partial<Filter>) => {
    // parameter khusus halaman (kode, periode, dst.) tetap dipertahankan
    const baru = new URLSearchParams(params);
    for (const k of ["tahun", "tingkat", "provinsi", "fungsi"]) baru.delete(k);
    for (const [k, v] of new URLSearchParams(keQuery({ ...filter, ...perubahan }).slice(1))) baru.set(k, v);
    mulai(() => router.replace(`${pathname}${baru.size ? `?${baru}` : ""}`, { scroll: false }));
  };

  return (
    <div className={cn("grid grid-cols-2 gap-2 transition-opacity sm:flex sm:flex-wrap sm:items-center", memuat && "opacity-50")} aria-busy={memuat}>
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
      {aktif && (
        <button
          onClick={() => ubah({ tahun: 2026, tingkat: null, provinsi: null, fungsi: null })}
          className="col-span-2 justify-self-start px-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Atur ulang
        </button>
      )}
    </div>
  );
}

function Pilihan(props: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      aria-label={props.label}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      className={cn(
        "h-8 w-full min-w-0 rounded-md border bg-card px-2 text-sm outline-none transition-colors hover:border-zinc-300 focus-visible:ring-2 focus-visible:ring-ring/30 sm:w-auto sm:max-w-44",
        props.value && props.label !== "Tahun" ? "border-zinc-400 font-medium" : "text-foreground",
      )}
    >
      {props.children}
    </select>
  );
}
