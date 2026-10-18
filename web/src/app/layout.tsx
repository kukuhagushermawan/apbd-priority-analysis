import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const font = Plus_Jakarta_Sans({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Peta Belanja Daerah", template: "%s · Peta Belanja Daerah" },
  description: "Ke mana anggaran 546 pemerintah daerah dibelanjakan, 2022–2026. Capstone Project Computer Science UGM 2026.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${font.variable} antialiased`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
