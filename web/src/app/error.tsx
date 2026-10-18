"use client";

import { AlertTriangle } from "lucide-react";

export default function Galat({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-card p-10 text-center">
      <AlertTriangle className="size-6 text-destructive" aria-hidden />
      <p className="font-medium">Data gagal dimuat.</p>
      <p className="max-w-md text-sm text-muted-foreground">Periksa koneksi database (DATABASE_URL) lalu coba lagi.</p>
      <button onClick={reset} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        Coba lagi
      </button>
    </div>
  );
}
