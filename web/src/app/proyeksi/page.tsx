import Link from "next/link";
import { Suspense } from "react";
import { CariPemda } from "@/components/cari-pemda";
import { GrafikPita } from "@/components/grafik";
import { JudulHalaman, KartuGrafik, KerangkaMemuat, Kosong, Peringatan, TautanPemda } from "@/components/kartu";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bacaKode } from "@/lib/api";
import { getDaftarPemda, getProyeksi } from "@/lib/data";
import { bacaFilter, keQuery, tautan } from "@/lib/filter";
import { persen } from "@/lib/format";

const NAMA_MODEL: Record<string, string> = {
  naif: "Baseline naif (share tahun lalu)",
  tren_linear: "Tren linear per pemda",
  tren_diredam: "Tren diredam",
  tren_kelompok: "Tren kelompok (pola pemda setingkat)",
};
const mae = (v: number) => `${v.toFixed(2).replace(".", ",")} pp`;

export default function Proyeksi({ searchParams }: PageProps<"/proyeksi">) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <JudulHalaman
          judul="Proyeksi 2027–2028"
          keterangan="Ke mana arah share Anggaran bila pola 2022–2026 berlanjut? Model dipilih otomatis lewat backtest, hasilnya selalu berjumlah 100%."
        />
        <Badge className="bg-accent text-accent-foreground">Eksploratif</Badge>
      </div>
      <Peringatan>
        Baca dengan hati-hati: proyeksi dapat <b>patah</b> bila batas belanja pegawai 30% dan belanja infrastruktur 40% (UU 1/2022 HKPD) direlaksasi lewat
        UU APBN 2027. Model hanya meneruskan pola masa lalu dan tidak mengetahui perubahan kebijakan.
      </Peringatan>
      <Suspense fallback={<KerangkaMemuat />}>
        <Isi searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Isi({ searchParams }: { searchParams: PageProps<"/proyeksi">["searchParams"] }) {
  const sp = await searchParams;
  const filter = bacaFilter(sp);
  const kode = bacaKode(typeof sp.kode === "string" ? sp.kode : null);
  const fungsi = filter.fungsi ?? "10";
  const [data, daftar] = await Promise.all([getProyeksi(filter, fungsi, kode), getDaftarPemda()]);
  if (!data.historis.length) return <Kosong pesan="Tidak ada pemda yang cocok dengan filter ini." />;

  const sumbuX = ["2022", "2023", "2024", "2025", "2026", "2027", "2028"];
  const hist = sumbuX.map((t) => data.historis.find((h) => String(h.tahun) === t)?.nilai ?? null);
  const proy = (k: "nilai" | "bawah" | "atas") => sumbuX.map((t) => data.proyeksi.find((p) => String(p.tahun) === t)?.[k] ?? (t === "2026" ? hist[4] : null));
  const subjek = data.pemda ? data.pemda.nama_pemda : `median pemda${filter.tingkat ? ` ${filter.tingkat}` : ""}`;

  const tingkat = ["kabupaten", "kota", "provinsi"];
  const terpilih = tingkat.map((t) => ({
    tingkat: t,
    pilihan: data.metrik.find((m) => m.tingkat === t && m.terpilih)!,
    naif: data.metrik.find((m) => m.tingkat === t && m.model === "naif")!,
  }));
  const modelSaatIni = terpilih.find((t) => t.tingkat === (data.pemda?.tingkat ?? filter.tingkat));
  const urutModel = [...new Map(data.metrik.map((m) => [`${m.model}|${m.periode}`, m])).values()].sort((a, b) => a.mae - b.mae);
  const p2027 = data.proyeksi.find((p) => p.tahun === 2027);

  return (
    <>
      <div className="flex flex-col gap-2">
        <Suspense>
          <CariPemda daftar={daftar} tujuan="proyeksi" placeholder="Pilih pemda tertentu… (kosong = median)" />
        </Suspense>
        {data.pemda && (
          <p className="text-sm text-muted-foreground">
            Menampilkan <TautanPemda kode={data.pemda.kode_pemda} nama={data.pemda.nama_pemda} query={keQuery(filter)} /> ·{" "}
            <Link href={tautan("/proyeksi", filter)} className="text-primary hover:underline">
              kembali ke median
            </Link>
          </p>
        )}
      </div>

      <KartuGrafik
        judul={`Share Anggaran ${data.namaFungsi}: ${subjek}`}
        keterangan="Garis penuh = historis 2022–2026, garis putus-putus = proyeksi, pita = rentang ketidakpastian (80% galat backtest, melebar per tahun). Ganti fungsi lewat filter di atas."
        definisi="proyeksi"
      >
        <GrafikPita
          sumbuX={sumbuX}
          garis={hist}
          namaGaris="Historis"
          garisLanjutan={proy("nilai")}
          namaLanjutan="Proyeksi"
          bawah={proy("bawah")}
          atas={proy("atas")}
          namaPita="Rentang ketidakpastian"
          anotasi={[{ x: "2027", teks: "Relaksasi batas belanja?" }]}
          label={`Proyeksi share anggaran ${data.namaFungsi} 2027-2028`}
          tinggi={380}
        />
        {p2027 && (
          <p className="mt-2 text-sm">
            Proyeksi 2027: <b>{persen(p2027.nilai)}</b> (rentang {persen(p2027.bawah)}–{persen(p2027.atas)})
            {modelSaatIni && <span className="text-muted-foreground"> · model: {NAMA_MODEL[modelSaatIni.pilihan.model]}</span>}
          </p>
        )}
      </KartuGrafik>

      <div className="grid gap-4 xl:grid-cols-2">
        <KartuGrafik
          judul="Model terpilih vs baseline (backtest 2025–2026)"
          keterangan="MAE = rata-rata selisih mutlak tebakan vs Anggaran sebenarnya, dalam poin persentase. Semakin kecil semakin akurat."
          definisi="proyeksi"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tingkat</TableHead>
                <TableHead>Model terpilih</TableHead>
                <TableHead className="text-right">MAE</TableHead>
                <TableHead className="text-right">Baseline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {terpilih.map((t) => (
                <TableRow key={t.tingkat}>
                  <TableCell className="capitalize">{t.tingkat}</TableCell>
                  <TableCell>
                    {t.pilihan.model === "naif" ? (
                      <span className="text-amber-800">Baseline (belum terkalahkan)</span>
                    ) : (
                      <>
                        {NAMA_MODEL[t.pilihan.model].split(" (")[0]}
                        <span className="block text-xs text-muted-foreground">latih {t.pilihan.periode}</span>
                      </>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">{mae(t.pilihan.mae)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{mae(t.naif.mae)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            Dengan hanya 5 titik tahunan, pola masing-masing pemda terlalu berisik; pola bersama pemda setingkat sedikit lebih baik dari baseline untuk
            kabupaten. Untuk kota dan provinsi, proyeksi = share 2026 (baseline), dan itu dinyatakan apa adanya.
          </p>
        </KartuGrafik>

        <KartuGrafik judul="Semua model yang diuji" keterangan="Rata-rata MAE (pp) backtest 2025 dan 2026 per tingkat pemda." definisi="proyeksi">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model · periode latih</TableHead>
                {tingkat.map((t) => (
                  <TableHead key={t} className="text-right capitalize">
                    {t}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {urutModel.map((m) => (
                <TableRow key={`${m.model}|${m.periode}`}>
                  <TableCell>
                    {NAMA_MODEL[m.model].split(" (")[0]} <span className="text-xs text-muted-foreground">{m.periode === "-" ? "" : m.periode}</span>
                  </TableCell>
                  {tingkat.map((t) => {
                    const sel = data.metrik.find((x) => x.tingkat === t && x.model === m.model && x.periode === m.periode);
                    return (
                      <TableCell key={t} className={`text-right tabular-nums ${sel?.terpilih ? "font-semibold text-primary" : ""}`}>
                        {sel ? mae(sel.mae) : "–"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </KartuGrafik>
      </div>
    </>
  );
}
