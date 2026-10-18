"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const HALAMAN = [
  { href: "/ringkasan", label: "Ringkasan" },
  { href: "/tren", label: "Tren" },
  { href: "/pergeseran", label: "Pergeseran" },
  { href: "/daerah", label: "Daerah" },
  { href: "/bandingkan", label: "Bandingkan" },
  { href: "/klaster", label: "Klaster dan Peta" },
  { href: "/proyeksi", label: "Proyeksi" },
  { href: "/data", label: "Data dan Metodologi" },
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
            aria-current={aktif ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-white",
              aktif ? "bg-sidebar-accent font-semibold text-white" : "text-sidebar-foreground",
            )}
          >
            <span className={cn("size-1.5 rounded-full", aktif ? "bg-accent" : "bg-transparent")} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Merek() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-6 py-7 text-[15px] font-bold text-white">
      <Logo terang />
      Peta Belanja Daerah
    </Link>
  );
}

function Kaki() {
  return (
    <div className="mt-auto p-6">
      <p className="mt-4 text-xs leading-relaxed text-[#8ea3c6]">
        Computer Science 2026
      </p>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar lg:flex">
      <Merek />
      <DaftarMenu />
      <Kaki />
    </aside>
  );
}

export function NavigasiMobile() {
  const [buka, setBuka] = useState(false);
  return (
    <Sheet open={buka} onOpenChange={setBuka}>
      <SheetTrigger className="-ml-1 rounded-lg p-2 text-primary hover:bg-white lg:hidden" aria-label="Buka menu">
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="flex w-64 flex-col border-0 bg-sidebar p-0">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <Merek />
        <DaftarMenu onPilih={() => setBuka(false)} />
        <Kaki />
      </SheetContent>
    </Sheet>
  );
}
