import { Check, Download, X } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { JudulHalaman, KartuGrafik } from "@/components/kartu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getValidasi } from "@/lib/data";
import { DEFINISI } from "@/lib/definisi";
import { bacaFilter, keQuery } from "@/lib/filter";
import { bilangan } from "@/lib/format";

export const metadata: Metadata = { title: "Data & metodologi" };

const CATATAN = [
  {
    judul: "Format 2022 berbeda",
    isi: "Berkas 2022 hanya punya satu sheet, kode akunnya tiga digit, dan nama beberapa fungsi berbeda. Semua tahun disamakan dulu ke satu format. Satuannya rupiah penuh.",
  },
  {
    judul: "Pemekaran Papua",
    isi: "Sejak APBD 2023 ada empat provinsi baru, dan 26 kabupaten/kota pindah kode. Kode lamanya kami ubah ke kode baru supaya tiap daerah tetap satu baris dari tahun ke tahun.",
  },
  {
    judul: "Sembilan fungsi",
    isi: "Fungsi pertahanan dan agama tidak muncul di data daerah karena keduanya urusan pemerintah pusat.",
  },
  {
    judul: "Perubahan klasifikasi 2023",
    isi: "Dari 2022 ke 2023, hampir 9 dari 10 daerah serentak mengurangi porsi pelayanan umum. Ini lebih mungkin akibat cara DJPK memetakan kegiatan ke fungsi. Angka 2023 diberi tanda, dan tren serta proyeksi juga dihitung tanpa 2022.",
  },
  {
    judul: "Anggaran, bukan realisasi",
    isi: "Semua angka adalah rencana belanja di APBD. Realisasi 2022–2026 belum tersedia di portal DJPK.",
  },
];

const NAMA_PEMERIKSAAN: Record<string, string> = {
  total_fungsi_vs_ringkas: "Total fungsi sama dengan Ringkasan APBD",
  jumlah_pemda: "Jumlah daerah sesuai berkas",
  sembilan_fungsi_lengkap: "Sembilan fungsi lengkap",
  share_berjumlah_100: "Porsi berjumlah 100%",
};

export default function DataMetodologi({ searchParams }: PageProps<"/data">) {
  return (
    <>
      <JudulHalaman eyebrow="Data & metodologi" judul="Dari mana angkanya" keterangan="Sumber data, cara mengolah, hasil pemeriksaan, dan unduhan CSV." />
      <Suspense fallback={<Skeleton className="h-64 rounded-3xl bg-white/70" />}>
        <StatusDanUnduh searchParams={searchParams} />
      </Suspense>

      <section className="grid gap-x-10 gap-y-6 rounded-3xl bg-card p-7 md:grid-cols-2">
        <h2 className="text-base font-bold md:col-span-2">Catatan pengolahan</h2>
        {CATATAN.map((c) => (
          <div key={c.judul} className="space-y-1 text-sm">
            <p className="font-medium">{c.judul}</p>
            <p className="leading-relaxed text-muted-foreground">{c.isi}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl bg-card p-7">
        <h2 className="mb-5 text-base font-bold">Istilah yang dipakai</h2>
        <dl className="grid gap-x-10 gap-y-5 text-sm md:grid-cols-2">
          {Object.entries(DEFINISI).map(([id, d]) => (
            <div key={id} className="space-y-1">
              <dt className="font-medium">{d.judul}</dt>
              <dd className="inline-block rounded-lg bg-secondary px-2.5 py-1 font-mono text-xs text-[#3e5478]">{d.rumus}</dd>
              <dd className="leading-relaxed text-muted-foreground">{d.isi}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}

async function StatusDanUnduh({ searchParams }: { searchParams: PageProps<"/data">["searchParams"] }) {
  const filter = bacaFilter(await searchParams);
  const validasi = await getValidasi();
  const q = keQuery(filter).slice(1);
  const maksRp = validasi.find((v) => v.pemeriksaan === "total_fungsi_vs_ringkas")?.maks_rp ?? 0;
  const tombol = "inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-[#dfe7f3]";
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <KartuGrafik
        className="xl:col-span-2"
        judul="Pemeriksaan data"
        keterangan={`Selisih terbesar dengan Ringkasan APBD hanya Rp${bilangan(Math.round(maksRp))}, dari pembulatan sen.`}
        definisi="validasi"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pemeriksaan</TableHead>
              <TableHead className="text-right">Diperiksa</TableHead>
              <TableHead className="text-right">Hasil</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {validasi.map((v) => (
              <TableRow key={`${v.pemeriksaan}${v.status}`}>
                <TableCell>{NAMA_PEMERIKSAAN[v.pemeriksaan] ?? v.pemeriksaan}</TableCell>
                <TableCell className="text-right text-muted-foreground">{bilangan(v.jumlah)}</TableCell>
                <TableCell className="text-right">
                  {v.status === "LULUS" ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <Check className="size-3.5" aria-hidden /> Lolos
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-700">
                      <X className="size-3.5" aria-hidden /> {v.status === "PERINGATAN" ? "Perlu dicek" : "Gagal"}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </KartuGrafik>
      <KartuGrafik judul="Unduh" keterangan="CSV berisi anggaran, total belanja, porsi, dan perubahannya per daerah dan fungsi.">
        <div className="flex flex-col gap-2">
          <a href={`/api/unduh${q ? `?${q}` : ""}`} className={tombol}>
            <Download className="size-4" aria-hidden /> Tahun {filter.tahun}, sesuai filter
          </a>
          <a href={`/api/unduh?semua=1${q ? `&${q}` : ""}`} className={tombol}>
            <Download className="size-4" aria-hidden /> 2022–2026, sesuai filter
          </a>
          <p className="pt-1 text-xs text-muted-foreground">CSV satu daerah ada di halaman profilnya.</p>
        </div>
      </KartuGrafik>
    </div>
  );
}
