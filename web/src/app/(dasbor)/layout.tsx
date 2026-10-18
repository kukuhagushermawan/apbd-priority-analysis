import { Suspense } from "react";
import { FilterBar } from "@/components/filter-bar";
import { Logo } from "@/components/logo";
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
        <header className="z-30 bg-background/90 px-4 pt-4 pb-3 backdrop-blur sm:px-8 lg:sticky lg:top-0 lg:pt-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-3 flex items-center gap-2 lg:hidden">
              <Suspense>
                <NavigasiMobile />
              </Suspense>
              <span className="flex items-center gap-2 text-sm font-bold text-primary">
                <Logo /> Peta Belanja Daerah
              </span>
            </div>
            <Suspense fallback={<div className="h-10" />}>
              <FilterBar provinsi={provinsi} />
            </Suspense>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-5 px-4 pt-3 pb-10 sm:px-8">{children}</main>
        <footer className="mx-auto w-full max-w-7xl px-4 pb-8 text-xs text-muted-foreground sm:px-8">
          Capstone Project
        </footer>
      </div>
    </div>
  );
}
