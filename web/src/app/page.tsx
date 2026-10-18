import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Kawung, Logo } from "@/components/kawung";
import { getBeranda } from "@/lib/data";
import { bilangan, persen, pp } from "@/lib/format";
import titik from "@/lib/peta-titik.json";
import { WARNA_KOMPONEN } from "@/lib/warna";

const NAMA_PENDEK: Record<string, string> = {
  "01": "Pelayanan umum",
  "04": "Ekonomi",
  "06": "Perumahan & fasum",
  "07": "Kesehatan",
  "10": "Pendidikan",
  LN: "Lainnya",
};

const JELAJAH = [
  { href: "/ringkasan", tanya: "Bagaimana komposisi belanja berubah?", isi: "Ringkasan seluruh daerah, 2022–2026.", ikon: IkonRingkasan },
  { href: "/tren", tanya: "Urusan apa yang terus naik?", isi: "Tren tiap fungsi.", ikon: IkonTren },
  { href: "/pergeseran", tanya: "Kapan prioritas bergeser tajam?", isi: "Deteksi pergeseran dan daerah penyebabnya.", ikon: IkonPergeseran },
  { href: "/daerah", tanya: "Bagaimana daerah saya?", isi: "Profil dan perbandingan antardaerah.", ikon: IkonDaerah },
  { href: "/klaster", tanya: "Daerah mana yang mirip?", isi: "Klaster dan peta.", ikon: IkonKlaster },
  { href: "/proyeksi", tanya: "Ke mana arahnya 2027?", isi: "Proyeksi 2027–2028.", ikon: IkonProyeksi },
];

const judulSeksi = "font-display text-[clamp(32px,4vw,44px)] font-bold tracking-tight";
const labelSeksi = "text-[13px] font-semibold tracking-[0.06em] text-muted-foreground uppercase";

export default async function Beranda() {
  const { ringkasan, klaster, klasterSemua, persenPatahan, validasiLolos } = await getBeranda();
  const akhir = ringkasan.tahun.length - 1;
  const triliun = `Rp${bilangan(Math.round(ringkasan.totalBelanja / 1e12))} T`;
  const komposisi = [...ringkasan.komposisi].sort((a, b) => b.nilai[akhir] - a.nilai[akhir]);
  const naik = ringkasan.kenaikanTerbesar;

  return (
    <div className="bg-background">
      <section className="relative overflow-hidden bg-primary text-white">
        <Kawung id="kawung-hero" className="pointer-events-none absolute -top-16 -right-20 size-[420px] rounded-full opacity-[0.12]" />
        <div className="relative mx-auto max-w-6xl px-6 sm:px-8">
          <nav className="flex flex-wrap items-center justify-between gap-4 py-6" aria-label="Utama">
            <Link href="/" className="flex items-center gap-2.5 text-[15px] font-bold">
              <Logo terang /> Peta Belanja Daerah
            </Link>
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <a href="#temuan" className="text-[#c3cee0] hover:text-white">Temuan</a>
              <a href="#cara" className="text-[#c3cee0] hover:text-white">Cara kerja</a>
              <a href="#jelajahi" className="text-[#c3cee0] hover:text-white">Jelajahi</a>
              <Link href="/ringkasan" className="rounded-full bg-accent px-4 py-2.5 font-semibold text-accent-foreground hover:brightness-105">
                Buka dashboard
              </Link>
            </div>
          </nav>

          <div className="grid items-end gap-x-16 gap-y-8 pt-16 pb-10 md:grid-cols-2">
            <div>
              <p className="inline-flex items-center gap-2.5 text-[13px] font-semibold tracking-[0.06em] text-[#c3cee0] uppercase">
                <span className="h-0.5 w-6 bg-accent" aria-hidden />
                Capstone Project · Computer Science UGM 2026
              </p>
              <h1 className="mt-6 font-display text-[clamp(44px,6vw,80px)] leading-none font-bold tracking-[-0.03em]">Ke mana uang daerah dibelanjakan?</h1>
            </div>
            <div>
              <p className="max-w-md text-lg leading-relaxed text-[#c3cee0]">
                Kami membaca APBD {ringkasan.jumlahPemda} pemerintah daerah dari 2022 sampai 2026 untuk melihat urusan mana yang makin diutamakan
                dan mana yang mengecil.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/ringkasan"
                  className="inline-flex min-h-12 items-center gap-2.5 rounded-full bg-accent px-6 text-[15px] font-semibold text-accent-foreground hover:brightness-105"
                >
                  Mulai menjelajah <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link href="/daerah" className="inline-flex min-h-12 items-center rounded-full border border-white/30 px-5 text-[15px] font-semibold hover:bg-white/10">
                  Cari daerah Anda
                </Link>
              </div>
            </div>
          </div>

          <figure className="pt-6 pb-40">
            <svg
              viewBox={`-12 -12 ${titik.lebar + 24} ${titik.tinggi + 24}`}
              className="block h-auto w-full"
              role="img"
              aria-label="Peta titik Indonesia. Titik putih: kabupaten/kota yang belanjanya condong ke pendidikan. Titik kuning: condong ke ekonomi. Kelompok 2026."
            >
              <path d={titik.pendidikan} fill="none" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="5.4" strokeLinecap="round" />
              <path d={titik.ekonomi} fill="none" stroke="#f5b800" strokeWidth="5.4" strokeLinecap="round" />
            </svg>
            <figcaption className="mt-6 flex flex-wrap gap-x-7 gap-y-2.5 text-[13px] text-[#c3cee0]">
              <span className="inline-flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-white" aria-hidden />
                Kabupaten/kota yang belanjanya condong ke pendidikan
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-accent" aria-hidden />
                Condong ke ekonomi
              </span>
              <span>Kelompok belanja 2026, dari data APBD</span>
            </figcaption>
          </figure>
        </div>
      </section>

      <div className="relative mx-auto -mt-24 max-w-6xl px-6 sm:px-8">
        <dl className="grid grid-cols-2 overflow-hidden rounded-3xl bg-card shadow-[0_24px_48px_-24px_rgba(11,45,91,0.35)] lg:grid-cols-4">
          {[
            [bilangan(ringkasan.jumlahPemda), "pemerintah daerah"],
            [triliun, `belanja daerah ${ringkasan.filter.tahun}`],
            ["9", "fungsi belanja"],
            ["2022–2026", "lima tahun anggaran"],
          ].map(([nilai, label], i) => (
            <div key={label} className={`px-7 py-7 ${i % 2 === 0 ? "border-r" : ""} ${i < 2 ? "border-b lg:border-b-0" : ""} lg:border-r lg:last:border-r-0`}>
              <dd className="font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">{nilai}</dd>
              <dt className="mt-1 text-sm text-muted-foreground">{label}</dt>
            </div>
          ))}
        </dl>
      </div>

      <section className="mx-auto max-w-6xl px-6 pt-28 sm:px-8">
        <div className="rounded-3xl bg-card p-7 sm:p-12">
          <div className="grid items-end gap-6 md:grid-cols-2">
            <h2 className={judulSeksi}>Ke mana {triliun.replace(" T", " triliun")} itu pergi?</h2>
            <p className="max-w-md leading-relaxed text-muted-foreground">
              Hampir enam dari sepuluh rupiah dipakai untuk dua urusan: {NAMA_PENDEK[komposisi[0].kode].toLowerCase()} dan{" "}
              {NAMA_PENDEK[komposisi[1].kode].toLowerCase()}.
            </p>
          </div>
          <div className="mt-10 flex h-20 gap-1 overflow-hidden rounded-2xl" role="img" aria-label={`Komposisi belanja daerah ${ringkasan.filter.tahun}`}>
            {komposisi.map((g) => (
              <div
                key={g.kode}
                className="flex min-w-0 items-end px-3.5 py-3"
                style={{ flex: `0 0 ${g.nilai[akhir]}%`, background: WARNA_KOMPONEN[g.kode] }}
                title={`${NAMA_PENDEK[g.kode]}: ${persen(g.nilai[akhir])}`}
              >
                {g.nilai[akhir] >= 8 && (
                  <span className={`text-[15px] font-bold ${["01", "07"].includes(g.kode) ? "text-white" : "text-foreground"}`}>
                    {Math.round(g.nilai[akhir])}%
                  </span>
                )}
              </div>
            ))}
          </div>
          <ul className="mt-7 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
            {komposisi.map((g) => (
              <li key={g.kode} className="flex items-start gap-2.5">
                <span className="mt-1 size-3 shrink-0 rounded-[3px]" style={{ background: WARNA_KOMPONEN[g.kode] }} aria-hidden />
                <span>
                  <span className="block text-sm text-muted-foreground">{NAMA_PENDEK[g.kode]}</span>
                  <span className="block text-xl font-bold">{persen(g.nilai[akhir])}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="temuan" className="mx-auto max-w-6xl scroll-mt-8 px-6 pt-28 sm:px-8">
        <p className={labelSeksi}>Temuan</p>
        <h2 className={`mt-3 ${judulSeksi}`}>Tiga hal yang kami temukan</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <Temuan
            ilustrasi={<IlustrasiNaik />}
            angka={naik ? pp(naik.delta) : "–"}
            href={`/tren?fungsi=${naik?.kode ?? "10"}`}
            tautan="Lihat trennya"
          >
            Porsi {naik?.nama.toLowerCase()} naik paling banyak dari {ringkasan.filter.tahun - 1} ke {ringkasan.filter.tahun}, menjadi{" "}
            {naik ? persen(ringkasan.shareTahunIni[naik.kode]) : ""}.
          </Temuan>
          <Temuan
            ilustrasi={<IlustrasiKlaster awal={klaster.awal} akhir={klaster.akhir} total={klaster.total} />}
            angka={`${klaster.awal} → ${klaster.akhir}`}
            href="/klaster"
            tautan="Lihat di peta"
          >
            Jumlah kabupaten/kota yang pola belanjanya condong ke pendidikan, dari 2023 ke 2026.
          </Temuan>
          <Temuan ilustrasi={<IlustrasiBerkas />} angka={`${Math.round(persenPatahan)}%`} href="/data" tautan="Baca metodologi">
            Daerah yang serentak mengurangi porsi pelayanan umum di 2023. Penyebabnya perubahan klasifikasi DJPK, jadi angka tahun itu kami tandai.
          </Temuan>
        </div>
      </section>

      <section id="cara" className="mx-auto max-w-6xl scroll-mt-8 px-6 pt-28 sm:px-8">
        <div className="rounded-3xl bg-[#dfe7f3] p-7 sm:p-12">
          <p className="text-[13px] font-semibold tracking-[0.06em] text-[#3e5478] uppercase">Cara kerja</p>
          <h2 className={`mt-3 max-w-2xl ${judulSeksi}`}>Dari sepuluh berkas Excel jadi satu peta</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <Langkah no={1} judul="Kumpulkan" ilustrasi={<IlustrasiExcel />}>
              Berkas Belanja per Fungsi dan Ringkasan APBD 2022–2026 dari DJPK Kemenkeu.
            </Langkah>
            <Langkah no={2} judul="Samakan dan cek" ilustrasi={<IlustrasiCek />}>
              Format tiap tahun disamakan, kode wilayah Papua disesuaikan, lalu totalnya dicocokkan. Semua {bilangan(validasiLolos)} data lolos.
            </Langkah>
            <Langkah no={3} judul="Analisis dan perkirakan" ilustrasi={<IlustrasiAnalisis />}>
              Porsi, perubahan, kelompok daerah, sampai perkiraan 2027–2028 beserta tingkat melesetnya.
            </Langkah>
          </div>
        </div>
      </section>

      <section id="jelajahi" className="mx-auto max-w-6xl scroll-mt-8 px-6 py-28 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={labelSeksi}>Jelajahi</p>
            <h2 className={`mt-3 ${judulSeksi}`}>Mulai dari pertanyaan Anda</h2>
          </div>
          <p className="max-w-sm text-[15px] text-muted-foreground">Semua tampilan bisa disaring per tahun, tingkat daerah, provinsi, dan fungsi.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {JELAJAH.map(({ href, tanya, isi, ikon: Ikon }) => (
            <Link key={href} href={href} className="group flex items-start gap-5 rounded-3xl bg-card p-7 transition-shadow hover:shadow-[0_16px_32px_-20px_rgba(11,45,91,0.4)]">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-secondary" aria-hidden>
                <Ikon />
              </span>
              <span>
                <span className="block text-[17px] font-bold group-hover:text-primary">{tanya}</span>
                <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">{isi}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <footer className="relative overflow-hidden bg-primary text-white">
        <Kawung id="kawung-kaki" className="block h-14 w-full opacity-[0.22]" />
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-6 pt-10 pb-12 sm:px-8">
          <div>
            <p className="font-display text-2xl font-bold">Peta Belanja Daerah</p>
            <p className="mt-2 text-sm text-[#c3cee0]">Computer Science UGM 2026 · Capstone Project</p>
          </div>
          <p className="text-[13px] text-[#8ea3c6]">
            Data: DJPK Kemenkeu, APBD status anggaran · Batas wilayah: geoBoundaries · {klasterSemua.pendidikan + klasterSemua.ekonomi} daerah dikelompokkan
          </p>
        </div>
      </footer>
    </div>
  );
}

function Temuan(props: { ilustrasi: React.ReactNode; angka: string; href: string; tautan: string; children: React.ReactNode }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-3xl bg-card">
      <div className="bg-primary px-7 pt-7 pb-5">{props.ilustrasi}</div>
      <div className="flex flex-1 flex-col gap-3 p-7">
        <p className="font-display text-5xl leading-none font-bold tracking-[-0.03em] text-primary">{props.angka}</p>
        <p className="leading-relaxed">{props.children}</p>
        <Link href={props.href} className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-primary hover:underline">
          {props.tautan} <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </article>
  );
}

function Langkah(props: { no: number; judul: string; ilustrasi: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-card p-7">
      {props.ilustrasi}
      <p className="mt-5 text-[13px] text-muted-foreground">Langkah {props.no}</p>
      <p className="mt-1 text-lg font-bold">{props.judul}</p>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{props.children}</p>
    </div>
  );
}

/* --- ilustrasi (dekoratif, aria-hidden) ---------------------------------- */
const teksIlustrasi = { fill: "#8ea3c6", fontSize: 12, fontFamily: "var(--font-sans)" };

function IlustrasiNaik() {
  return (
    <svg viewBox="0 0 280 110" className="block h-auto w-full" aria-hidden>
      <path d="M10 70 L72 72 L134 72 L196 64 L258 34" fill="none" stroke="#5f7fb0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M196 64 L258 34" fill="none" stroke="#f5b800" strokeWidth="4" strokeLinecap="round" />
      <circle cx="258" cy="34" r="7" fill="#f5b800" />
      <circle cx="196" cy="64" r="5" fill="#ffffff" />
      <text x="10" y="100" {...teksIlustrasi}>2022</text>
      <text x="236" y="100" {...teksIlustrasi}>2026</text>
    </svg>
  );
}

function IlustrasiKlaster({ awal, akhir, total }: { awal: number; akhir: number; total: number }) {
  return (
    <svg viewBox="0 0 280 110" className="block h-auto w-full" aria-hidden>
      <rect x="10" y="20" width="120" height="16" rx="8" fill="#5f7fb0" />
      <rect x="10" y="20" width={(120 * awal) / total} height="16" rx="8" fill="#ffffff" />
      <text x="10" y="56" {...teksIlustrasi}>2023: {awal}</text>
      <rect x="150" y="20" width="120" height="16" rx="8" fill="#5f7fb0" />
      <rect x="150" y="20" width={(120 * akhir) / total} height="16" rx="8" fill="#f5b800" />
      <text x="150" y="56" {...teksIlustrasi}>2026: {akhir}</text>
    </svg>
  );
}

function IlustrasiBerkas() {
  return (
    <svg viewBox="0 0 280 110" className="block h-auto w-full" aria-hidden>
      <rect x="10" y="8" width="70" height="88" rx="8" fill="none" stroke="#8ea3c6" strokeWidth="2" />
      <path d="M24 30h42M24 46h42M24 62h28" stroke="#5f7fb0" strokeWidth="4" strokeLinecap="round" />
      <path d="M98 52 h70" stroke="#f5b800" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 8" />
      <path d="M160 44 l10 8 -10 8" fill="none" stroke="#f5b800" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="188" y="8" width="70" height="88" rx="8" fill="none" stroke="#ffffff" strokeWidth="2" />
      <path d="M202 30h42M202 46h20M202 62h36" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function IlustrasiExcel() {
  return (
    <svg width="120" height="88" viewBox="0 0 120 88" aria-hidden>
      <rect x="22" y="4" width="66" height="80" rx="8" fill="#e6ecf5" />
      <rect x="12" y="10" width="66" height="76" rx="8" fill="#ffffff" stroke="#0b2d5b" strokeWidth="2" />
      <path d="M12 30h66M12 48h66M12 66h66M36 10v76M58 10v76" stroke="#c9d6ea" strokeWidth="1.5" />
      <rect x="12" y="10" width="66" height="20" rx="8" fill="#0b2d5b" />
      <circle cx="94" cy="66" r="16" fill="#f5b800" />
      <text x="94" y="71" textAnchor="middle" fill="#15171c" fontSize="14" fontWeight="700">10</text>
    </svg>
  );
}

function IlustrasiCek() {
  return (
    <svg width="120" height="88" viewBox="0 0 120 88" aria-hidden>
      <rect x="8" y="12" width="44" height="12" rx="6" fill="#c9d6ea" />
      <rect x="8" y="32" width="58" height="12" rx="6" fill="#c9d6ea" />
      <rect x="8" y="52" width="36" height="12" rx="6" fill="#c9d6ea" />
      <path d="M72 44 h8" stroke="#0b2d5b" strokeWidth="2" strokeLinecap="round" />
      <circle cx="96" cy="44" r="20" fill="#0b2d5b" />
      <path d="M87 44 l6 6 12 -13" fill="none" stroke="#f5b800" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IlustrasiAnalisis() {
  return (
    <svg width="120" height="88" viewBox="0 0 120 88" aria-hidden>
      <rect x="6" y="56" width="16" height="28" rx="3" fill="#c9d6ea" />
      <rect x="28" y="40" width="16" height="44" rx="3" fill="#8fa8cf" />
      <rect x="50" y="26" width="16" height="58" rx="3" fill="#0b2d5b" />
      <path d="M78 70 C86 62, 90 52, 98 50 S110 36, 114 20" fill="none" stroke="#f5b800" strokeWidth="3" strokeLinecap="round" strokeDasharray="4 6" />
      <circle cx="114" cy="20" r="5" fill="#f5b800" />
    </svg>
  );
}

function IkonRingkasan() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28">
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
    <svg width="28" height="28" viewBox="0 0 28 28">
      <path d="M3 22 L10 19 L16 18 L25 6" fill="none" stroke="#0b2d5b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="25" cy="6" r="3" fill="#f5b800" />
    </svg>
  );
}
function IkonPergeseran() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28">
      <rect x="3" y="3" width="10" height="10" rx="2" fill="#0b2d5b" />
      <rect x="15" y="3" width="10" height="10" rx="2" fill="#c9d6ea" />
      <rect x="3" y="15" width="10" height="10" rx="2" fill="#c9d6ea" />
      <rect x="15" y="15" width="10" height="10" rx="2" fill="#f5b800" />
    </svg>
  );
}
function IkonDaerah() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28">
      <circle cx="12" cy="12" r="7" fill="none" stroke="#0b2d5b" strokeWidth="2.4" />
      <path d="M17 17 L24 24" stroke="#f5b800" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
function IkonKlaster() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28">
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
    <svg width="28" height="28" viewBox="0 0 28 28">
      <path d="M14 14 L25 6 L25 22 Z" fill="#c9d6ea" />
      <path d="M3 20 L9 17 L14 14" fill="none" stroke="#0b2d5b" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M14 14 L25 12" fill="none" stroke="#f5b800" strokeWidth="2.4" strokeDasharray="3 3" strokeLinecap="round" />
    </svg>
  );
}
