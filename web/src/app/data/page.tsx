import { JudulHalaman } from "@/components/kartu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    id: "proyeksi",
    judul: "Proyeksi eksploratif 2027–2028",
    rumus: "model terbaik dipilih lewat backtest bergulir (MAE, pp)",
    isi: "Dibandingkan empat model: naif (share tahun lalu), tren linear, tren diredam, dan tren kelompok. Proyeksi dapat patah bila batas belanja pegawai 30% dan infrastruktur 40% direlaksasi lewat UU APBN 2027.",
  },
];

export default function KualitasData() {
  return (
    <>
      <JudulHalaman
        judul="Kualitas Data & Unduh"
        keterangan="Sumber: DJPK Kemenkeu, APBD status Anggaran 2022–2026 (Belanja per Fungsi dan Ringkasan). Status validasi dan unduhan lengkap menyusul di milestone 5."
      />
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
