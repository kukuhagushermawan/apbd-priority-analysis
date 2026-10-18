"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const HALAMAN = [
  { href: "/ringkasan", label: "Ringkasan" },
  { href: "/tren", label: "Tren" },
  { href: "/pergeseran", label: "Pergeseran" },
  { href: "/daerah", label: "Daerah" },
  { href: "/bandingkan", label: "Bandingkan" },
  { href: "/klaster", label: "Klaster & peta" },
  { href: "/proyeksi", label: "Proyeksi" },
  { href: "/data", label: "Data & metodologi" },
];

function DaftarMenu({ onPilih }: { onPilih?: () => void }) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  return (
    <nav className="flex flex-col gap-0.5 px-3" aria-label="Navigasi utama">
      {HALAMAN.map(({ href, label }) => {
        const aktif = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={`${href}${query ? `?${query}` : ""}`} // filter ikut terbawa
            onClick={onPilih}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors hover:text-foreground",
              aktif ? "bg-sidebar-accent font-medium text-foreground" : "text-sidebar-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Merek() {
  return (
    <Link href="/" className="flex items-center gap-2 px-6 py-5 text-sm font-semibold">
      <span className="size-2 rounded-full bg-accent" aria-hidden />
      Peta Belanja Daerah
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r bg-sidebar lg:flex">
      <Merek />
      <DaftarMenu />
      <p className="mt-auto px-6 py-5 text-xs leading-relaxed text-muted-foreground">
        Computer Science UGM 2026
        <br />
        Capstone Project
      </p>
    </aside>
  );
}

export function NavigasiMobile() {
  const [buka, setBuka] = useState(false);
  return (
    <Sheet open={buka} onOpenChange={setBuka}>
      <SheetTrigger className="-ml-1 rounded-md p-1.5 hover:bg-muted lg:hidden" aria-label="Buka menu">
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-64 bg-sidebar p-0">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <Merek />
        <DaftarMenu onPilih={() => setBuka(false)} />
      </SheetContent>
    </Sheet>
  );
}
