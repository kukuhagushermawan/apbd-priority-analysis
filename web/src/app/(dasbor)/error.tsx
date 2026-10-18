"use client";

export default function Galat({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center">
      <p className="font-medium">Data belum dapat dimuat.</p>
      <p className="text-sm text-muted-foreground">Silakan coba kembali. Apabila masih gagal, kemungkinan server data sedang tidak aktif.</p>
      <button onClick={reset} className="mt-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted">
        Coba kembali
      </button>
    </div>
  );
}
