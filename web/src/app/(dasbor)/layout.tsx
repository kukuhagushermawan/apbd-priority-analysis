import { Suspense } from "react";
import { FilterBar } from "@/components/filter-bar";
import { NavigasiMobile, Sidebar } from "@/components/navigasi";
import { getDaftarProvinsi } from "@/lib/data";

export default async function LayoutDasbor({ children }: LayoutProps<"/">) {
  const provinsi = await getDaftarProvinsi();
  return (
    <div className="flex min-h-screen">
      <Suspense>
        <Sidebar />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-30 border-b bg-background/90 px-4 py-3 backdrop-blur sm:px-8 lg:sticky lg:top-0">
          <div className="mb-3 flex items-center gap-2 lg:hidden">
            <Suspense>
              <NavigasiMobile />
            </Suspense>
            <span className="text-sm font-semibold">Peta Belanja Daerah</span>
          </div>
          <Suspense fallback={<div className="h-8" />}>
            <FilterBar provinsi={provinsi} />
          </Suspense>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-8 sm:px-8">{children}</main>
        <footer className="mx-auto w-full max-w-7xl px-4 pb-8 text-xs text-muted-foreground sm:px-8">
          Data APBD status Anggaran, DJPK Kemenkeu · Computer Science UGM 2026 · Capstone Project
        </footer>
      </div>
    </div>
  );
}
