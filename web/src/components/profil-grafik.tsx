"use client";

import { useMemo } from "react";
import { ABU, Grafik, SUMBU, TEKS, WARNA_SERI } from "@/components/grafik";
import { persen } from "@/lib/format";

/** Batang horizontal: share Anggaran pemda vs median pemda setingkat, per fungsi. */
export function GrafikPosisi({ nama, fungsi }: { nama: string; fungsi: { nama: string; pemda: number; median: number }[] }) {
  const opsi = useMemo(
    () => ({
      grid: { left: 8, right: 48, top: 8, bottom: 40 },
      legend: { bottom: 0, left: "center", icon: "roundRect", itemWidth: 12, itemHeight: 12, itemGap: 20, textStyle: { color: TEKS } },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => persen(v) },
      xAxis: { type: "value", ...SUMBU, axisLabel: { color: TEKS, formatter: "{value}%" } },
      yAxis: { type: "category", data: fungsi.map((f) => f.nama), inverse: true, ...SUMBU },
      series: [
        {
          name: nama,
          type: "bar",
          data: fungsi.map((f) => Number(f.pemda.toFixed(2))),
          itemStyle: { color: WARNA_SERI[0], borderRadius: [0, 4, 4, 0] },
          barGap: "15%",
          label: { show: true, position: "right", color: TEKS, fontSize: 11, formatter: (p: { value: number }) => persen(p.value) },
        },
        {
          name: "Median daerah setingkat",
          type: "bar",
          data: fungsi.map((f) => Number(f.median.toFixed(2))),
          itemStyle: { color: ABU, borderRadius: [0, 4, 4, 0] },
        },
      ],
    }),
    [nama, fungsi],
  );
  return <Grafik opsi={opsi} tinggi={420} label={`Porsi anggaran ${nama} dibandingkan dengan median daerah setingkat`} />;
}
