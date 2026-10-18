"use client";

export default function Galat({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center">
      <p className="font-medium">Datanya belum bisa dimuat.</p>
      <p className="text-sm text-muted-foreground">Coba sekali lagi. Kalau masih gagal, kemungkinan server datanya sedang tidak aktif.</p>
      <button onClick={reset} className="mt-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted">
        Coba lagi
      </button>
    </div>
  );
}
