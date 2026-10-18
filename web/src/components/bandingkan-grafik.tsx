"use client";

import { useMemo } from "react";
import { Grafik, SUMBU, TEKS, WARNA_SERI } from "@/components/grafik";
import { persen, rupiahTriliun } from "@/lib/format";

type Pemda = { kode: string; nama: string; fungsi: { nama: string; nominal: number; share: number }[] };

/** Batang mendatar per fungsi (nama fungsi panjang lebih terbaca); 2-4 daerah memakai 4 slot pertama palet. */
export function GrafikBandingkan({ pemda, ukuran }: { pemda: Pemda[]; ukuran: "share" | "nominal" }) {
  const opsi = useMemo(() => {
    const share = ukuran === "share";
    const format = (v: number) => (share ? persen(v) : rupiahTriliun(v * 1e12));
    return {
      grid: { left: 8, right: 24, top: 8, bottom: 40 },
      legend: { bottom: 0, left: "center", icon: "roundRect", itemWidth: 12, itemHeight: 12, itemGap: 20, textStyle: { color: TEKS } },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => format(v) },
      xAxis: { type: "value", ...SUMBU, axisLabel: { color: TEKS, formatter: share ? "{value}%" : "{value}" } },
      yAxis: { type: "category", inverse: true, data: pemda[0]?.fungsi.map((f) => f.nama) ?? [], ...SUMBU, axisLabel: { color: TEKS, interval: 0 } },
      series: pemda.map((p, i) => ({
        name: p.nama,
        type: "bar",
        barGap: "10%",
        barMaxWidth: 14,
        data: p.fungsi.map((f) => Number((share ? f.share : f.nominal / 1e12).toFixed(3))),
        itemStyle: { color: WARNA_SERI[i], borderRadius: [0, 4, 4, 0] },
      })),
    };
  }, [pemda, ukuran]);
  return <Grafik opsi={opsi} tinggi={120 + pemda.length * 90} label={`Perbandingan ${ukuran === "share" ? "porsi" : "nilai"} anggaran per fungsi antardaerah`} />;
}
