import { Download } from "lucide-react";
import { Suspense } from "react";
import { JudulHalaman, KartuGrafik } from "@/components/kartu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getValidasi } from "@/lib/data";
import { bacaFilter, keQuery } from "@/lib/filter";
import { bilangan } from "@/lib/format";

// Catatan definisi rumus. Setiap grafik menautkan ke anchor di halaman ini.
const DEFINISI = [
  {
    id: "share",
    judul: "Share Anggaran",
    rumus: "share = nilai anggaran fungsi ÷ total belanja (jumlah 9 fungsi)",
    isi: "Porsi anggaran satu fungsi terhadap seluruh belanja pemda. Di Ringkasan Nasional dipakai share agregat: Σ anggaran fungsi semua pemda terpilih ÷ Σ total belanjanya. Pertahanan dan Agama tidak muncul di data DJPK 2022–2026 sehingga analisis memakai 9 fungsi.",
  },
  {
    id: "delta",
    judul: "Δshare (poin persentase)",
    rumus: "Δshare(t) = share(t) − share(t−1)",
    isi: "Selisih share dibanding tahun sebelumnya dalam poin persentase (pp). Nilai 2023 dipengaruhi patahan klasifikasi: cara DJPK memetakan kegiatan ke fungsi berubah mulai 2023 (Kepmendagri 050), sehingga sebagian pergeseran 2022→2023 bukan keputusan kebijakan daerah.",
  },
  {
    id: "ips",
    judul: "Indeks Pergeseran Struktur (IPS)",
    rumus: "IPS(t) = ½ × Σ |Δshare|",
    isi: "Porsi anggaran yang berpindah antarfungsi. IPS 10 pp berarti 10% anggaran bergeser ke fungsi lain. Lonjakan ditandai bila z robust = (IPS − median) ÷ (1,4826 × MAD) > 3, dibandingkan dengan pemda setingkat pada tahun yang sama.",
  },
  {
    id: "tren",
    judul: "Kemiringan tren",
    rumus: "kemiringan = koefisien regresi linear share terhadap tahun (pp/tahun)",
    isi: "Dihitung untuk periode 2022–2026 dan 2023–2026. Stabil bila |kemiringan| di bawah median |kemiringan| seluruh pemda-fungsi; di atasnya naik atau turun.",
  },
  {
    id: "klaster",
    judul: "Klaster (CLR + K-Means)",
    rumus: "CLR(x) = ln(x_f ÷ rata-rata geometrik x)",
    isi: "Share diubah ke ruang log-rasio lalu dikelompokkan dengan K-Means, terpisah untuk provinsi dan kab/kota. Jumlah klaster dipilih dengan skor silhouette. Fungsi bershare kecil digabung menjadi “Lainnya”.",
  },
  {
    id: "validasi",
    judul: "Validasi data",
    rumus: "selisih = Σ 9 fungsi − Belanja Daerah (Ringkasan)",
    isi: "Setiap pemda-tahun dicek terhadap berkas Ringkasan APBD. Toleransi dikalibrasi dari sebaran selisih nyata: semua 2.726 pemda-tahun selisihnya 0,0000% (maksimal Rp1.252 akibat pembulatan sen).",
  },
  {
    id: "proyeksi",
    judul: "Proyeksi eksploratif 2027–2028",
    rumus: "model terbaik dipilih lewat backtest bergulir (MAE, pp)",
    isi: "Dibandingkan empat model: naif (share tahun lalu), tren linear, tren diredam, dan tren kelompok. Proyeksi dapat patah bila batas belanja pegawai 30% dan infrastruktur 40% direlaksasi lewat UU APBN 2027.",
  },
];

const CATATAN = [
  "Format 2022 berbeda dari 2023–2026 (label fungsi, kode akun 3 digit, satu sheet saja); semua tahun disamakan ke satu skema baku. Satuan seluruh berkas Rupiah penuh.",
  "Pemekaran Papua (APBD 2023): 26 kabupaten/kota berganti kode dan dipetakan ke kode baru agar tetap satu deret waktu. Papua, Papua Barat, dan 4 provinsi baru ditandai panel tidak seimbang.",
  "Fungsi Pertahanan dan Agama tidak muncul di data 2022–2026 (urusan pemerintah pusat), sehingga analisis memakai 9 fungsi.",
  "Patahan klasifikasi 2022→2023: 88% pemda serempak menurunkan share Pelayanan Umum. Δshare/IPS 2023 ditandai ⚑; klaster dilatih pada 2023–2026; tren dan proyeksi dihitung juga untuk periode 2023–2026.",
  "Pada 7 pemda tahun 2025, pembagian belanja pegawai dan barang/jasa antara berkas Fungsi dan Ringkasan berbeda, tetapi totalnya sama sehingga share fungsi tidak terdampak.",
];

const NAMA_PEMERIKSAAN: Record<string, string> = {
  total_fungsi_vs_ringkas: "Total fungsi = Ringkasan (pemda-tahun)",
  jumlah_pemda: "Jumlah pemda sesuai berkas (tahun)",
  sembilan_fungsi_lengkap: "9 fungsi lengkap (tahun)",
  share_berjumlah_100: "Share berjumlah 100% (tahun)",
};

async function StatusDanUnduh({ searchParams }: { searchParams: PageProps<"/data">["searchParams"] }) {
  const filter = bacaFilter(await searchParams);
  const validasi = await getValidasi();
  const q = keQuery(filter).slice(1);
  const tombol = "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium";
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <KartuGrafik
        className="xl:col-span-2"
        judul="Status validasi data Anggaran"
        keterangan={`LULUS bila selisih ≤ 0,01% atau ≤ Rp10.000; PERINGATAN bila ≤ 0,5%; selain itu GAGAL. Selisih terbesar total fungsi vs Ringkasan: Rp${bilangan(
          Math.round(validasi.find((v) => v.pemeriksaan === "total_fungsi_vs_ringkas")?.maks_rp ?? 0),
        )}.`}
        definisi="validasi"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pemeriksaan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {validasi.map((v) => (
              <TableRow key={`${v.pemeriksaan}${v.status}`}>
                <TableCell>{NAMA_PEMERIKSAAN[v.pemeriksaan] ?? v.pemeriksaan}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={v.status === "LULUS" ? "border-green-600 text-green-800" : "border-red-600 text-red-800"}>
                    {v.status === "LULUS" ? "✓ " : "✕ "}
                    {v.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{bilangan(v.jumlah)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </KartuGrafik>
      <KartuGrafik judul="Unduh CSV Anggaran" keterangan="Kolom: tahun, pemda, fungsi, nilai anggaran, total belanja, share (%), Δshare (pp)." definisi="share">
        <div className="flex flex-col gap-2">
          <a href={`/api/unduh${q ? `?${q}` : ""}`} className={`${tombol} bg-primary text-primary-foreground hover:bg-primary/90`}>
            <Download className="size-4" aria-hidden /> Tahun {filter.tahun}, sesuai filter
          </a>
          <a href={`/api/unduh?semua=1${q ? `&${q}` : ""}`} className={`${tombol} border bg-card text-primary hover:bg-secondary`}>
            <Download className="size-4" aria-hidden /> Semua tahun 2022–2026, sesuai filter
          </a>
          <p className="text-xs text-muted-foreground">CSV satu pemda tersedia lewat tombol “Unduh CSV” di Profil Daerah.</p>
        </div>
      </KartuGrafik>
    </div>
  );
}

export default function KualitasData({ searchParams }: PageProps<"/data">) {
  return (
    <>
      <JudulHalaman
        judul="Kualitas Data & Unduh"
        keterangan="Sumber: DJPK Kemenkeu, APBD status Anggaran 2022–2026 (Belanja per Fungsi dan Ringkasan). Angka adalah anggaran yang direncanakan, bukan realisasi."
      />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <StatusDanUnduh searchParams={searchParams} />
      </Suspense>
      <KartuGrafik judul="Catatan metodologi" keterangan="Keputusan pengolahan data yang memengaruhi cara membaca angka." definisi="share">
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {CATATAN.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </KartuGrafik>
      <section className="space-y-4" aria-labelledby="judul-definisi">
        <h2 id="judul-definisi" className="text-lg font-semibold text-primary">
          Catatan definisi
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {DEFINISI.map((d) => (
            <Card key={d.id} id={d.id} className="scroll-mt-28 target:ring-2 target:ring-accent">
              <CardHeader>
                <CardTitle className="text-base">{d.judul}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="rounded-md bg-secondary px-3 py-2 font-mono text-xs text-secondary-foreground">{d.rumus}</p>
                <p className="text-muted-foreground">{d.isi}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
