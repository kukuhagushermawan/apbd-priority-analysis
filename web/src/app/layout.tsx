import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import { FilterBar } from "@/components/filter-bar";
import { NavigasiMobile, Sidebar } from "@/components/navigasi";
import { getDaftarProvinsi } from "@/lib/data";
import "./globals.css";

const geist = Geist({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Peta Prioritas Belanja Daerah",
  description: "Pergeseran prioritas belanja APBD pemerintah daerah Indonesia 2022–2026 (status Anggaran, DJPK).",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const provinsi = await getDaftarProvinsi();
  return (
    <html lang="id" className={`${geist.variable} antialiased`}>
      <body className="flex min-h-screen">
        <Suspense>
          <Sidebar />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="z-30 border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-6 lg:sticky lg:top-0">
            <div className="mb-3 flex items-center gap-2 lg:hidden">
              <Suspense>
                <NavigasiMobile />
              </Suspense>
              <span className="font-semibold text-primary">Peta Prioritas Belanja Daerah</span>
            </div>
            <Suspense fallback={<div className="h-14" />}>
              <FilterBar provinsi={provinsi} />
            </Suspense>
          </header>
          <main className="flex-1 space-y-6 px-4 py-6 sm:px-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
