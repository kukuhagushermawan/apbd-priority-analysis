"use client";

import { useMemo } from "react";
import { Grafik, SUMBU, TEKS, WARNA_SERI } from "@/components/grafik";
import { persen, rupiahTriliun } from "@/lib/format";

type Pemda = { kode: string; nama: string; fungsi: { nama: string; nominal: number; share: number }[] };

/** Grouped bar per fungsi; 2-4 pemda memakai 4 slot pertama palet kategori. */
export function GrafikBandingkan({ pemda, ukuran }: { pemda: Pemda[]; ukuran: "share" | "nominal" }) {
  const opsi = useMemo(() => {
    const share = ukuran === "share";
    const format = (v: number) => (share ? persen(v) : rupiahTriliun(v * 1e12));
    return {
      grid: { left: 8, right: 8, top: 40, bottom: 8 },
      legend: { top: 0, left: 0, textStyle: { color: TEKS } },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => format(v) },
      xAxis: { type: "category", data: pemda[0]?.fungsi.map((f) => f.nama) ?? [], ...SUMBU, axisLabel: { color: TEKS, interval: 0, rotate: 30, fontSize: 11 } },
      yAxis: { type: "value", ...SUMBU, axisLabel: { color: TEKS, formatter: share ? "{value}%" : "Rp{value} T" } },
      series: pemda.map((p, i) => ({
        name: p.nama,
        type: "bar",
        barGap: "10%",
        data: p.fungsi.map((f) => Number((share ? f.share : f.nominal / 1e12).toFixed(3))),
        itemStyle: { color: WARNA_SERI[i], borderRadius: [4, 4, 0, 0] },
      })),
    };
  }, [pemda, ukuran]);
  return <Grafik opsi={opsi} tinggi={400} label={`Perbandingan ${ukuran} anggaran per fungsi antar pemda`} />;
}
