const angka = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

/** 31.38 -> "31,4%" */
export const persen = (v: number) => `${angka.format(v)}%`;

/** 1.234 -> "+1,2 pp" */
export const pp = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${angka.format(Math.abs(v))} pp`;

/** 1.25e12 -> "Rp1,3 T" */
export const rupiahTriliun = (v: number) => `Rp${angka.format(v / 1e12)} T`;

export const bilangan = (v: number) => new Intl.NumberFormat("id-ID").format(v);
