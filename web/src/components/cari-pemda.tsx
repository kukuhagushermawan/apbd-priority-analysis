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
export function CariPemda({ daftar, tujuan, placeholder = "Cari provinsi, kabupaten, atau kota", besar = false }: {
  daftar: Pemda[];
  tujuan: "profil" | "bandingkan" | "proyeksi";
  placeholder?: string;
  besar?: boolean;
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
    <div className="relative w-full max-w-xl">
      <label
        className={`flex items-center gap-2.5 rounded-full bg-secondary px-4 focus-within:ring-2 focus-within:ring-accent/60 ${besar ? "bg-white" : ""}`}
      >
        <Search className="size-4 text-muted-foreground" aria-hidden />
        <input
          value={kata}
          onChange={(e) => setKata(e.target.value)}
          placeholder={placeholder}
          aria-label="Cari daerah"
          className={`w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground ${besar ? "h-12 text-base" : "h-10 text-sm"}`}
        />
      </label>
      {q.length >= 2 && (
        <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl bg-popover py-1 text-foreground shadow-[0_16px_40px_-12px_rgba(11,45,91,0.35)]">
          {hasil.length === 0 && <li className="px-4 py-2.5 text-sm text-muted-foreground">Tidak ada daerah dengan nama itu.</li>}
          {hasil.map((p) => (
            <li key={p.kode_pemda}>
              <Link href={href(p.kode_pemda)} onClick={() => setKata("")} className="block px-4 py-2.5 text-sm hover:bg-secondary">
                <span className="font-semibold">{p.nama_pemda}</span>
                <span className="ml-2 text-xs text-muted-foreground">{p.tingkat === "provinsi" ? "Provinsi" : p.nama_provinsi.replace("Provinsi ", "")}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
