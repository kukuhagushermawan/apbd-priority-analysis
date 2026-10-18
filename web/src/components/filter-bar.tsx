"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { bacaFilter, DAFTAR_TAHUN, DAFTAR_TINGKAT, keQuery, type Filter } from "@/lib/filter";
import { FUNGSI_AKTIF, NAMA_FUNGSI } from "@/lib/fungsi";
import { cn } from "@/lib/utils";

type Provinsi = { kode_pemda: string; nama_pemda: string };

/** Filter global (tahun, tingkat, provinsi, fungsi), disimpan di URL agar tampilan bisa dibagikan. */
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
        <option value="">Semua</option>
        {DAFTAR_TINGKAT.map((t) => (
          <option key={t} value={t}>
            {t[0].toUpperCase() + t.slice(1)}
          </option>
        ))}
      </Pilihan>
      <Pilihan label="Provinsi" value={filter.provinsi ?? ""} onChange={(v) => ubah({ provinsi: v || null })}>
        <option value="">Semua</option>
        {provinsi.map((p) => (
          <option key={p.kode_pemda} value={p.kode_pemda}>
            {p.nama_pemda.replace("Provinsi ", "")}
          </option>
        ))}
      </Pilihan>
      <Pilihan label="Fungsi" value={filter.fungsi ?? ""} onChange={(v) => ubah({ fungsi: v || null })}>
        <option value="">Semua</option>
        {FUNGSI_AKTIF.map((k) => (
          <option key={k} value={k}>
            {NAMA_FUNGSI[k]}
          </option>
        ))}
      </Pilihan>
      {aktif && (
        <button
          onClick={() => ubah({ tahun: 2026, tingkat: null, provinsi: null, fungsi: null })}
          className="col-span-2 justify-self-start rounded-full px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-white hover:text-foreground"
        >
          Atur ulang
        </button>
      )}
    </div>
  );
}

function Pilihan(props: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  const terpilih = Boolean(props.value) && props.label !== "Tahun";
  return (
    <label
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-full bg-card py-1 pr-1 pl-4 text-xs text-muted-foreground shadow-[0_1px_2px_rgba(11,45,91,0.06)]",
        terpilih && "ring-1 ring-primary/30",
      )}
    >
      {props.label}
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="h-8 min-w-0 flex-1 cursor-pointer rounded-full bg-secondary px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:max-w-44 sm:flex-none"
      >
        {props.children}
      </select>
    </label>
  );
}
