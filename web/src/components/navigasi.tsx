"use client";

import { Activity, Columns3, Database, LayoutDashboard, LineChart, Map, MapPin, Menu, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const HALAMAN = [
  { href: "/", label: "Ringkasan Nasional", ikon: LayoutDashboard },
  { href: "/tren", label: "Tren per Fungsi", ikon: TrendingUp },
  { href: "/pergeseran", label: "Deteksi Pergeseran", ikon: Activity },
  { href: "/daerah", label: "Profil Daerah", ikon: MapPin },
  { href: "/bandingkan", label: "Perbandingan", ikon: Columns3 },
  { href: "/klaster", label: "Peta & Klaster", ikon: Map },
  { href: "/proyeksi", label: "Proyeksi 2027–2028", ikon: LineChart },
  { href: "/data", label: "Kualitas Data & Unduh", ikon: Database },
];

function DaftarMenu({ onPilih }: { onPilih?: () => void }) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  return (
    <nav className="flex flex-col gap-1 p-3" aria-label="Navigasi utama">
      {HALAMAN.map(({ href, label, ikon: Ikon }) => {
        const aktif = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={`${href}${query ? `?${query}` : ""}`} // filter ikut terbawa
            onClick={onPilih}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              aktif && "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-[inset_3px_0_0_var(--sidebar-primary)]",
            )}
          >
            <Ikon className="size-4 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Merek() {
  return (
    <div className="border-b border-sidebar-border px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wider text-sidebar-primary">APBD 2022–2026</p>
      <p className="text-base font-semibold leading-tight text-white">Peta Prioritas Belanja Daerah</p>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar lg:flex">
      <Merek />
      <DaftarMenu />
      <p className="mt-auto px-5 py-4 text-xs text-sidebar-foreground/60">Sumber: DJPK Kemenkeu · status Anggaran</p>
    </aside>
  );
}

export function NavigasiMobile() {
  const [buka, setBuka] = useState(false);
  return (
    <Sheet open={buka} onOpenChange={setBuka}>
      <SheetTrigger className="rounded-md p-2 text-primary hover:bg-secondary lg:hidden" aria-label="Buka menu">
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-sidebar p-0">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <Merek />
        <DaftarMenu onPilih={() => setBuka(false)} />
      </SheetContent>
    </Sheet>
  );
}
