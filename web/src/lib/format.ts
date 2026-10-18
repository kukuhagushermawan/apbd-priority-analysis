const angka = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

/** 31.38 -> "31,4%" */
export const persen = (v: number) => `${angka.format(v)}%`;

/** 1.234 -> "+1,2 pp" */
export const pp = (v: number) => {
  const r = Math.round(v * 10) / 10; // -0,04 ditulis 0,0 pp, bukan −0,0 pp
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${angka.format(Math.abs(r))} pp`;
};

/** 1.25e12 -> "Rp1,3 triliun" */
export const rupiahTriliun = (v: number) => `Rp${angka.format(v / 1e12)} triliun`;

export const bilangan = (v: number) => new Intl.NumberFormat("id-ID").format(v);
