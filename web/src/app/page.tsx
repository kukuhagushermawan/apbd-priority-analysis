import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { getBeranda } from "@/lib/data";
import { bilangan, persen, pp } from "@/lib/format";
import titik from "@/lib/peta-titik.json";
import { WARNA_KOMPONEN } from "@/lib/warna";

const NAMA_PENDEK: Record<string, string> = {
  "01": "Pelayanan umum",
  "04": "Ekonomi",
  "06": "Perumahan dan fasilitas umum",
  "07": "Kesehatan",
  "10": "Pendidikan",
  LN: "Fungsi lainnya",
};

const JELAJAH = [
  { href: "/ringkasan", tanya: "Bagaimana komposisi belanja berubah?", isi: "Ringkasan seluruh pemerintah daerah tahun 2022–2026.", ikon: IkonRingkasan },
  { href: "/tren", tanya: "Fungsi apa yang porsinya terus meningkat?", isi: "Tren porsi belanja setiap fungsi.", ikon: IkonTren },
  { href: "/pergeseran", tanya: "Kapan prioritas belanja bergeser tajam?", isi: "Deteksi pergeseran beserta daerah penyebabnya.", ikon: IkonPergeseran },
  { href: "/daerah", tanya: "Bagaimana profil daerah saya?", isi: "Profil dan perbandingan antardaerah.", ikon: IkonDaerah },
  { href: "/klaster", tanya: "Daerah mana yang polanya serupa?", isi: "Pengelompokan daerah beserta petanya.", ikon: IkonKlaster },
  { href: "/proyeksi", tanya: "Bagaimana arah belanja tahun 2027?", isi: "Proyeksi porsi belanja tahun 2027–2028.", ikon: IkonProyeksi },
];

const judulSeksi = "font-display text-[clamp(26px,2.6vw,36px)] leading-tight font-semibold tracking-tight";
const labelSeksi = "text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase";

export default async function Beranda() {
  const { ringkasan, klaster, persenPatahan, pulau } = await getBeranda();
  const akhir = ringkasan.tahun.length - 1;
  const triliun = `Rp${bilangan(Math.round(ringkasan.totalBelanja / 1e12))} triliun`;
  const komposisi = [...ringkasan.komposisi].sort((a, b) => b.nilai[akhir] - a.nilai[akhir]);
  const naik = ringkasan.kenaikanTerbesar;

  return (
    <div className="bg-background">
      {/* Hero: pas satu layar (judul, peta, angka kunci); peta mengisi sisa tinggi */}
      <section className="relative flex flex-col overflow-hidden bg-primary text-white lg:h-[100svh] lg:max-h-[960px] lg:min-h-[640px]">
        <nav className="relative" aria-label="Utama">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4 sm:px-8">
            <Link href="/" className="flex items-center gap-2.5 text-sm font-bold">
              <Logo terang /> Peta Belanja Daerah
            </Link>
            <div className="flex items-center gap-1 text-sm">
              <a href="#temuan" className="hidden rounded-full px-3 py-2 text-[#c3cee0] hover:text-white sm:inline">Temuan</a>
              <a href="#jelajahi" className="hidden rounded-full px-3 py-2 text-[#c3cee0] hover:text-white sm:inline">Jelajahi</a>
              <Link href="/data" className="hidden rounded-full px-3 py-2 text-[#c3cee0] hover:text-white sm:inline">Metodologi</Link>
              <Link href="/ringkasan" className="ml-2 rounded-full bg-white px-4 py-2 font-semibold text-primary hover:bg-[#eef2f8]">
                <span className="sm:hidden">Dasbor</span>
                <span className="hidden sm:inline">Buka dasbor</span>
              </Link>
            </div>
          </div>
        </nav>

        <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 sm:px-8 lg:min-h-0">
          <div className="grid items-end gap-x-14 gap-y-6 pt-6 md:grid-cols-[1.15fr_1fr] lg:pt-8">
            <div>
              <h1 className="font-display text-[clamp(32px,3.6vw,52px)] leading-[1.05] font-semibold tracking-[-0.025em]">
                Ke mana anggaran daerah dibelanjakan?
              </h1>
            </div>
            <div>
              <p className="max-w-md text-[15px] leading-relaxed text-[#c3cee0]">
                Platform ini menganalisis APBD {ringkasan.jumlahPemda} pemerintah daerah tahun 2022–2026 untuk mengetahui fungsi belanja yang
                semakin diprioritaskan dan fungsi yang porsinya menurun.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link
                  href="/ringkasan"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground hover:brightness-105"
                >
                  Mulai menjelajah <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link href="/daerah" className="inline-flex h-11 items-center rounded-full border border-white/25 px-5 text-sm font-semibold hover:bg-white/10">
                  Cari daerah
                </Link>
              </div>
            </div>
          </div>

          <figure className="flex min-h-[220px] flex-1 flex-col pt-4 lg:min-h-0">
            <div className="relative min-h-0 flex-1">
              <svg
                viewBox={`-12 -12 ${titik.lebar + 24} ${titik.tinggi + 24}`}
                preserveAspectRatio="xMidYMid meet"
                className="block h-full max-h-[420px] w-full"
                role="img"
                aria-label="Peta titik Indonesia. Titik putih menunjukkan kabupaten/kota dengan porsi belanja pendidikan tinggi, titik kuning menunjukkan porsi belanja ekonomi tinggi, berdasarkan APBD 2026."
              >
                <path d={titik.pendidikan} fill="none" stroke="#ffffff" strokeOpacity="0.88" strokeWidth="5.2" strokeLinecap="round" />
                <path d={titik.ekonomi} fill="none" stroke="#f5b800" strokeWidth="5.2" strokeLinecap="round" />
                <Anotasi
                  x={150}
                  y={6}
                  ke={[392, 70]}
                  judul="Kalimantan"
                  isi={`${pulau.kalimantan.total - pulau.kalimantan.pendidikan} dari ${pulau.kalimantan.total} kabupaten/kota berporsi ekonomi tinggi`}
                />
                <Anotasi
                  x={628}
                  y={24}
                  ke={[560, 118]}
                  judul="Sulawesi"
                  isi={`${pulau.sulawesi.pendidikan} dari ${pulau.sulawesi.total} kabupaten/kota berporsi pendidikan tinggi`}
                />
              </svg>
            </div>
            <figcaption className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#c3cee0]">
              <span className="inline-flex items-center gap-2">
                <span className="size-2 rounded-full bg-white" aria-hidden />
                Porsi belanja pendidikan tinggi
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="size-2 rounded-full bg-accent" aria-hidden />
                Porsi belanja ekonomi tinggi
              </span>
              <span className="text-[#8ea3c6]">Setiap titik mewakili area sekitar 40 km. Pengelompokan kabupaten/kota berdasarkan APBD 2026.</span>
            </figcaption>
          </figure>

          {/* Angka kunci: bagian dari hero agar langsung terlihat di layar pertama */}
          <dl className="mt-5 mb-6 grid grid-cols-2 overflow-hidden rounded-2xl bg-card text-foreground lg:mb-8 lg:grid-cols-4">
            {[
              [bilangan(ringkasan.jumlahPemda), "pemerintah daerah"],
              [triliun, `total belanja daerah tahun ${ringkasan.filter.tahun}`],
              ["9", "fungsi belanja yang dianalisis"],
              ["2022–2026", "periode tahun anggaran"],
            ].map(([nilai, label], i) => (
              <div key={label} className={`px-6 py-4 ${i % 2 === 0 ? "border-r" : ""} ${i < 2 ? "border-b lg:border-b-0" : ""} lg:border-r lg:last:border-r-0`}>
                <dd className="font-display text-xl font-semibold tracking-tight text-primary sm:text-2xl">{nilai}</dd>
                <dt className="mt-0.5 text-[13px] text-muted-foreground">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <p className="mx-auto max-w-6xl px-6 pt-6 text-center text-xs text-muted-foreground sm:px-8">
        Sumber data: <span className="font-medium text-foreground">DJPK Kementerian Keuangan</span> · Batas wilayah:{" "}
        <span className="font-medium text-foreground">geoBoundaries (BPS)</span>
      </p>

      <section className="mx-auto max-w-6xl px-6 pt-14 sm:px-8">
        <div className="rounded-3xl bg-card p-6 sm:p-10">
          <div className="grid items-end gap-4 md:grid-cols-2">
            <div>
              <p className={labelSeksi}>APBD {ringkasan.filter.tahun}</p>
              <h2 className={`mt-2 ${judulSeksi}`}>Ke mana {triliun} itu dialokasikan?</h2>
            </div>
            <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground md:justify-self-end">
              Hampir enam dari sepuluh rupiah dialokasikan untuk dua fungsi, yaitu {NAMA_PENDEK[komposisi[0].kode].toLowerCase()} dan{" "}
              {NAMA_PENDEK[komposisi[1].kode].toLowerCase()}.
            </p>
          </div>
          <div className="mt-8 flex h-14 gap-1 overflow-hidden rounded-xl" role="img" aria-label={`Komposisi belanja daerah ${ringkasan.filter.tahun}`}>
            {komposisi.map((g) => (
              <div
                key={g.kode}
                className="flex min-w-0 items-center px-3"
                style={{ flex: `0 0 ${g.nilai[akhir]}%`, background: WARNA_KOMPONEN[g.kode] }}
                title={`${NAMA_PENDEK[g.kode]}: ${persen(g.nilai[akhir])}`}
              >
                {g.nilai[akhir] >= 8 && (
                  <span className={`text-sm font-semibold ${["01", "07"].includes(g.kode) ? "text-white" : "text-foreground"}`}>
                    {Math.round(g.nilai[akhir])}%
                  </span>
                )}
              </div>
            ))}
          </div>
          <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
            {komposisi.map((g) => (
              <li key={g.kode} className="flex items-start gap-2.5">
                <span className="mt-1 size-2.5 shrink-0 rounded-[3px]" style={{ background: WARNA_KOMPONEN[g.kode] }} aria-hidden />
                <span>
                  <span className="block text-[13px] text-muted-foreground">{NAMA_PENDEK[g.kode]}</span>
                  <span className="block text-lg font-semibold">{persen(g.nilai[akhir])}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="temuan" className="mx-auto max-w-6xl scroll-mt-8 px-6 pt-20 sm:px-8">
        <p className={labelSeksi}>Temuan</p>
        <h2 className={`mt-2 ${judulSeksi}`}>Temuan utama</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <Temuan ilustrasi={<IlustrasiNaik />} angka={naik ? pp(naik.delta) : "–"} href={`/tren?fungsi=${naik?.kode ?? "10"}`} tautan="Lihat tren">
            Porsi belanja {naik?.nama.toLowerCase()} mengalami kenaikan terbesar dari tahun {ringkasan.filter.tahun - 1} ke tahun{" "}
            {ringkasan.filter.tahun}, yaitu menjadi {naik ? persen(ringkasan.shareTahunIni[naik.kode]) : ""}.
          </Temuan>
          <Temuan
            ilustrasi={<IlustrasiKlaster awal={klaster.awal} akhir={klaster.akhir} total={klaster.total} />}
            angka={`${klaster.awal} → ${klaster.akhir}`}
            href="/klaster"
            tautan="Lihat di peta"
          >
            Jumlah kabupaten/kota dengan porsi belanja pendidikan tinggi meningkat dari tahun 2023 ke tahun 2026.
          </Temuan>
          <Temuan ilustrasi={<IlustrasiBerkas />} angka={`${Math.round(persenPatahan)}%`} href="/data" tautan="Baca metodologi">
            Daerah secara serentak menurunkan porsi pelayanan umum pada tahun 2023 akibat perubahan klasifikasi DJPK sehingga data tahun tersebut diberi
            tanda khusus.
          </Temuan>
        </div>
      </section>

      <section id="jelajahi" className="mx-auto max-w-6xl scroll-mt-8 px-6 py-20 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={labelSeksi}>Jelajahi</p>
            <h2 className={`mt-2 ${judulSeksi}`}>Mulai dari pertanyaan Anda</h2>
          </div>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {JELAJAH.map(({ href, tanya, isi, ikon: Ikon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-start gap-4 rounded-2xl bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-20px_rgba(11,45,91,0.4)]"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary" aria-hidden>
                <Ikon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold group-hover:text-primary">{tanya}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{isi}</span>
              </span>
              <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
            </Link>
          ))}
        </div>
      </section>

      <footer className="relative overflow-hidden bg-primary text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-6 pt-8 pb-10 sm:px-8">
          <div>
            <p className="flex items-center gap-2.5 font-display text-xl font-semibold">
              <Logo terang /> Peta Belanja Daerah
            </p>
            <p className="mt-2 text-sm text-[#c3cee0]">Computer Science UGM 2026 · Capstone Project</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Keterangan di atas peta: judul + kalimat, dengan garis penunjuk ke wilayahnya. */
function Anotasi({ x, y, ke, judul, isi }: { x: number; y: number; ke: [number, number]; judul: string; isi: string }) {
  return (
    <g className="hidden sm:block" aria-hidden>
      <path d={`M${x + 4} ${y + 34} L${ke[0]} ${ke[1]}`} stroke="#8ea3c6" strokeWidth="1" strokeDasharray="3 3" fill="none" />
      <circle cx={ke[0]} cy={ke[1]} r="3.5" fill="none" stroke="#ffffff" strokeWidth="1.2" />
      <text x={x} y={y + 10} fill="#ffffff" fontSize="13" fontWeight="700" fontFamily="var(--font-sans)">
        {judul}
      </text>
      <text x={x} y={y + 27} fill="#c3cee0" fontSize="11.5" fontFamily="var(--font-sans)">
        {isi}
      </text>
    </g>
  );
}

function Temuan(props: { ilustrasi: React.ReactNode; angka: string; href: string; tautan: string; children: React.ReactNode }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl bg-card">
      <div className="bg-primary px-6 pt-6 pb-4">{props.ilustrasi}</div>
      <div className="flex flex-1 flex-col gap-2.5 p-6">
        <p className="font-display text-4xl leading-none font-semibold tracking-[-0.02em] text-primary">{props.angka}</p>
        <p className="text-[15px] leading-relaxed">{props.children}</p>
        <Link href={props.href} className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-primary hover:underline">
          {props.tautan} <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </article>
  );
}

/* --- ilustrasi & ikon (dekoratif) ------------------------------------------ */
const teksIlustrasi = { fill: "#8ea3c6", fontSize: 12, fontFamily: "var(--font-sans)" };

function IlustrasiNaik() {
  return (
    <svg viewBox="0 0 280 100" className="block h-auto w-full" aria-hidden>
      <path d="M10 64 L72 66 L134 66 L196 58 L258 28" fill="none" stroke="#5f7fb0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M196 58 L258 28" fill="none" stroke="#f5b800" strokeWidth="4" strokeLinecap="round" />
      <circle cx="258" cy="28" r="7" fill="#f5b800" />
      <circle cx="196" cy="58" r="5" fill="#ffffff" />
      <text x="10" y="94" {...teksIlustrasi}>2022</text>
      <text x="236" y="94" {...teksIlustrasi}>2026</text>
    </svg>
  );
}

function IlustrasiKlaster({ awal, akhir, total }: { awal: number; akhir: number; total: number }) {
  return (
    <svg viewBox="0 0 280 100" className="block h-auto w-full" aria-hidden>
      <rect x="10" y="20" width="120" height="16" rx="8" fill="#5f7fb0" />
      <rect x="10" y="20" width={(120 * awal) / total} height="16" rx="8" fill="#ffffff" />
      <text x="10" y="58" {...teksIlustrasi}>2023: {awal}</text>
      <rect x="150" y="20" width="120" height="16" rx="8" fill="#5f7fb0" />
      <rect x="150" y="20" width={(120 * akhir) / total} height="16" rx="8" fill="#f5b800" />
      <text x="150" y="58" {...teksIlustrasi}>2026: {akhir}</text>
    </svg>
  );
}

function IlustrasiBerkas() {
  return (
    <svg viewBox="0 0 280 100" className="block h-auto w-full" aria-hidden>
      <rect x="10" y="6" width="70" height="84" rx="8" fill="none" stroke="#8ea3c6" strokeWidth="2" />
      <path d="M24 28h42M24 44h42M24 60h28" stroke="#5f7fb0" strokeWidth="4" strokeLinecap="round" />
      <path d="M98 48 h70" stroke="#f5b800" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 8" />
      <path d="M160 40 l10 8 -10 8" fill="none" stroke="#f5b800" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="188" y="6" width="70" height="84" rx="8" fill="none" stroke="#ffffff" strokeWidth="2" />
      <path d="M202 28h42M202 44h20M202 60h36" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function IkonRingkasan() {
  return (
    <svg width="24" height="24" viewBox="0 0 28 28">
      <rect x="3" y="6" width="6" height="18" rx="1.5" fill="#0b2d5b" />
      <rect x="11" y="6" width="6" height="18" rx="1.5" fill="#0b2d5b" />
      <rect x="19" y="6" width="6" height="18" rx="1.5" fill="#0b2d5b" />
      <rect x="3" y="3" width="6" height="6" rx="1.5" fill="#f5b800" />
      <rect x="11" y="3" width="6" height="8" rx="1.5" fill="#f5b800" />
      <rect x="19" y="3" width="6" height="10" rx="1.5" fill="#f5b800" />
    </svg>
  );
}
function IkonTren() {
  return (
    <svg width="24" height="24" viewBox="0 0 28 28">
      <path d="M3 22 L10 19 L16 18 L25 6" fill="none" stroke="#0b2d5b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="25" cy="6" r="3" fill="#f5b800" />
    </svg>
  );
}
function IkonPergeseran() {
  return (
    <svg width="24" height="24" viewBox="0 0 28 28">
      <rect x="3" y="3" width="10" height="10" rx="2" fill="#0b2d5b" />
      <rect x="15" y="3" width="10" height="10" rx="2" fill="#c9d6ea" />
      <rect x="3" y="15" width="10" height="10" rx="2" fill="#c9d6ea" />
      <rect x="15" y="15" width="10" height="10" rx="2" fill="#f5b800" />
    </svg>
  );
}
function IkonDaerah() {
  return (
    <svg width="24" height="24" viewBox="0 0 28 28">
      <circle cx="12" cy="12" r="7" fill="none" stroke="#0b2d5b" strokeWidth="2.4" />
      <path d="M17 17 L24 24" stroke="#f5b800" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
function IkonKlaster() {
  return (
    <svg width="24" height="24" viewBox="0 0 28 28">
      <circle cx="7" cy="9" r="3" fill="#0b2d5b" />
      <circle cx="12" cy="6" r="2.5" fill="#0b2d5b" />
      <circle cx="10" cy="14" r="3" fill="#0b2d5b" />
      <circle cx="20" cy="16" r="3" fill="#f5b800" />
      <circle cx="23" cy="22" r="2.5" fill="#f5b800" />
      <circle cx="17" cy="22" r="2" fill="#f5b800" />
    </svg>
  );
}
function IkonProyeksi() {
  return (
    <svg width="24" height="24" viewBox="0 0 28 28">
      <path d="M14 14 L25 6 L25 22 Z" fill="#c9d6ea" />
      <path d="M3 20 L9 17 L14 14" fill="none" stroke="#0b2d5b" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M14 14 L25 12" fill="none" stroke="#f5b800" strokeWidth="2.4" strokeDasharray="3 3" strokeLinecap="round" />
    </svg>
  );
}
