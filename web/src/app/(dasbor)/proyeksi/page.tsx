import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CariPemda } from "@/components/cari-pemda";
import { GrafikPita } from "@/components/grafik";
import { JudulHalaman, KartuGrafik, KerangkaMemuat, Kosong, Peringatan, TautanPemda } from "@/components/kartu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bacaKode } from "@/lib/api";
import { getDaftarPemda, getProyeksi } from "@/lib/data";
import { bacaFilter, keQuery, tautan } from "@/lib/filter";
import { persen } from "@/lib/format";

const NAMA_MODEL: Record<string, string> = {
  naif: "Sama seperti tahun lalu",
  tren_linear: "Garis tren tiap daerah",
  tren_diredam: "Garis tren yang melambat",
  tren_kelompok: "Tren daerah setingkat",
};
const mae = (v: number) => `${v.toFixed(2).replace(".", ",")} pp`;

export const metadata: Metadata = { title: "Proyeksi" };

export default function Proyeksi({ searchParams }: PageProps<"/proyeksi">) {
  return (
    <>
      <JudulHalaman
        eyebrow="Proyeksi · eksploratif"
        judul="Arah belanja 2027–2028"
        keterangan="Perkiraan porsi tiap fungsi kalau pola 2022–2026 berlanjut, beserta seberapa mungkin meleset."
      />
      <Peringatan>
        Perkiraan ini bisa meleset jauh kalau batas belanja pegawai 30% dan infrastruktur 40% (UU HKPD) dilonggarkan lewat UU APBN 2027. Model
        hanya meneruskan pola lama dan tidak tahu ada perubahan aturan.
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
  const subjek = data.pemda ? data.pemda.nama_pemda : `median ${filter.tingkat ?? "daerah"}`;

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
      <div className="flex flex-col gap-2 rounded-3xl bg-card p-5">
        <Suspense>
          <CariPemda daftar={daftar} tujuan="proyeksi" placeholder="Pilih daerah (kosongkan untuk median)" />
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
        judul={`${data.namaFungsi}, ${subjek}`}
        keterangan="Garis putus-putus: perkiraan. Area: kemungkinan meleset. Fungsi bisa diganti lewat filter di atas."
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
          namaPita="Kemungkinan meleset"
          anotasi={[{ x: "2027", teks: "Batas belanja dilonggarkan?" }]}
          label={`Proyeksi share anggaran ${data.namaFungsi} 2027-2028`}
          tinggi={380}
        />
        {p2027 && (
          <p className="mt-2 text-sm">
            Perkiraan 2027: <span className="font-semibold">{persen(p2027.nilai)}</span>, kemungkinan antara {persen(p2027.bawah)} dan {persen(p2027.atas)}
            {modelSaatIni && <span className="text-muted-foreground"> · model: {NAMA_MODEL[modelSaatIni.pilihan.model]}</span>}
          </p>
        )}
      </KartuGrafik>

      <div className="grid gap-5 xl:grid-cols-2">
        <KartuGrafik
          judul="Seberapa tepat modelnya?"
          keterangan="Rata-rata meleset (pp) saat menebak 2025 dan 2026. Makin kecil makin baik."
          definisi="proyeksi"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tingkat</TableHead>
                <TableHead>Model terpilih</TableHead>
                <TableHead className="text-right">MAE</TableHead>
                <TableHead className="text-right">Tahun lalu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {terpilih.map((t) => (
                <TableRow key={t.tingkat}>
                  <TableCell className="capitalize">{t.tingkat}</TableCell>
                  <TableCell>
                    {t.pilihan.model === "naif" ? (
                      <span className="text-muted-foreground">Sama seperti tahun lalu</span>
                    ) : (
                      <>
                        {NAMA_MODEL[t.pilihan.model].split(" (")[0]}
                        <span className="block text-xs text-muted-foreground">data {t.pilihan.periode.replace("-", "–")}</span>
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
            Lima tahun data terlalu sedikit untuk membaca pola tiap daerah. Pola bersama daerah setingkat sedikit lebih tepat untuk kabupaten.
            Untuk kota dan provinsi belum ada model yang lebih baik dari “sama seperti tahun lalu”, jadi itu yang dipakai.
          </p>
        </KartuGrafik>

        <KartuGrafik judul="Semua model yang dicoba" keterangan="Rata-rata meleset per tingkat daerah (pp)." definisi="proyeksi">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
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
                    {NAMA_MODEL[m.model].split(" (")[0]} <span className="text-xs text-muted-foreground">{m.periode === "-" ? "" : `data ${m.periode.replace("-", "–")}`}</span>
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
