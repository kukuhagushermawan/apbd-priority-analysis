"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

type Pemda = { kode_pemda: string; nama_pemda: string; tingkat: string; nama_provinsi: string };

/**
 * Pencarian pemda. tujuan menentukan ke mana hasil diklik:
 * profil -> /daerah/[kode], bandingkan -> tambah ke ?kode=, proyeksi -> set ?kode=
 */
export function CariPemda({ daftar, tujuan, placeholder = "Cari provinsi, kabupaten, atau kota…" }: {
  daftar: Pemda[];
  tujuan: "profil" | "bandingkan" | "proyeksi";
  placeholder?: string;
}) {
  const params = useSearchParams();
  const [kata, setKata] = useState("");
  const q = kata.trim().toLowerCase();
  const hasil = q.length < 2 ? [] : daftar.filter((p) => `${p.nama_pemda} ${p.nama_provinsi}`.toLowerCase().includes(q)).slice(0, 8);

  const href = (kode: string) => {
    const baru = new URLSearchParams(params);
    if (tujuan === "profil") {
      baru.delete("kode");
      return `/daerah/${kode}${baru.size ? `?${baru}` : ""}`;
    }
    if (tujuan === "bandingkan") {
      const ada = (baru.get("kode") ?? "").split(",").filter(Boolean);
      baru.set("kode", [...new Set([...ada, kode])].slice(0, 4).join(","));
      return `/bandingkan?${baru}`;
    }
    baru.set("kode", kode);
    return `/proyeksi?${baru}`;
  };

  return (
    <div className="relative w-full max-w-md">
      <label className="flex items-center gap-2 rounded-md border border-input bg-card px-3 shadow-xs focus-within:ring-2 focus-within:ring-ring/40">
        <Search className="size-4 text-muted-foreground" aria-hidden />
        <input
          value={kata}
          onChange={(e) => setKata(e.target.value)}
          placeholder={placeholder}
          aria-label="Cari pemda"
          className="h-9 w-full bg-transparent text-sm outline-none"
        />
      </label>
      {q.length >= 2 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-lg">
          {hasil.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">Tidak ada pemda yang cocok.</li>}
          {hasil.map((p) => (
            <li key={p.kode_pemda}>
              <Link href={href(p.kode_pemda)} onClick={() => setKata("")} className="block px-3 py-2 text-sm hover:bg-secondary">
                <span className="font-medium text-foreground">{p.nama_pemda}</span>
                <span className="ml-2 text-xs text-muted-foreground">{p.tingkat === "provinsi" ? "Provinsi" : p.nama_provinsi}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
