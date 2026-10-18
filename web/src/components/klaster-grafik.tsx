"use client";

import { useMemo } from "react";
import { ABU, Grafik, SUMBU, TEKS, warnaKlaster } from "@/components/grafik";
import { persen } from "@/lib/format";
import { namaKlaster as namaPendek } from "@/lib/fungsi";

type Klaster = { klaster: number; nama: string };

export { namaKlaster as namaPendek } from "@/lib/fungsi";

/** Profil centroid: share Anggaran rata-rata tiap klaster per komponen, dibanding rata-rata kelompok. */
export function GrafikCentroid({ klaster, centroid }: { klaster: Klaster[]; centroid: { nama: string; rata: number; nilai: number[] }[] }) {
  const opsi = useMemo(
    () => ({
      grid: { left: 8, right: 24, top: 8, bottom: 40 },
      legend: { bottom: 0, left: "center", icon: "roundRect", itemWidth: 12, itemHeight: 12, itemGap: 20, textStyle: { color: TEKS } },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => persen(v) },
      xAxis: { type: "value", ...SUMBU, axisLabel: { color: TEKS, formatter: "{value}%" } },
      yAxis: { type: "category", inverse: true, data: centroid.map((c) => c.nama), ...SUMBU, axisLabel: { color: TEKS, interval: 0 } },
      series: [
        ...klaster.map((k, i) => ({
          name: namaPendek(k.nama),
          type: "bar",
          barGap: "10%",
          barMaxWidth: 12,
          data: centroid.map((c) => Number(c.nilai[i].toFixed(2))),
          itemStyle: { color: warnaKlaster(k.nama, i), borderRadius: [0, 4, 4, 0] },
        })),
        { name: "Rata-rata seluruh daerah", type: "bar", data: centroid.map((c) => Number(c.rata.toFixed(2))), barMaxWidth: 12, itemStyle: { color: ABU, borderRadius: [0, 4, 4, 0] } },
      ],
    }),
    [klaster, centroid],
  );
  return <Grafik opsi={opsi} tinggi={420} label="Rata-rata porsi belanja setiap klaster per fungsi" />;
}

/** Sankey migrasi klaster dari tahun awal ke 2026. */
export function GrafikSankey({ klaster, tahunAwal, migrasi }: { klaster: Klaster[]; tahunAwal: number; migrasi: { dari: number; ke: number; jumlah: number }[] }) {
  const opsi = useMemo(() => {
    const simpul = (tahun: number, k: Klaster, i: number) => ({
      name: `${tahun} · ${namaPendek(k.nama)}`,
      itemStyle: { color: warnaKlaster(k.nama, i), borderColor: warnaKlaster(k.nama, i) },
    });
    const nama = (k: number) => klaster.find((x) => x.klaster === k)!;
    return {
      tooltip: { trigger: "item", formatter: (p: { data: { source?: string; target?: string; value?: number }; name: string }) =>
        p.data.source ? `${p.data.source} → ${p.data.target}: <b>${p.data.value} daerah</b>` : p.name },
      series: [
        {
          type: "sankey",
          left: 8,
          right: 8,
          top: 16,
          bottom: 16,
          nodeWidth: 14,
          nodeGap: 16,
          draggable: false,
          // label berlatar putih agar tidak tenggelam di atas aliran
          label: {
            color: "#0f1b2d",
            fontSize: 12,
            backgroundColor: "rgba(255,255,255,0.9)",
            padding: [3, 6],
            borderRadius: 4,
            formatter: (p: { name: string; value: number }) => `${p.name}: ${p.value} daerah`,
          },
          lineStyle: { color: "gradient", opacity: 0.35, curveness: 0.5 },
          data: [...klaster.map((k, i) => simpul(tahunAwal, k, i)), ...klaster.map((k, i) => simpul(2026, k, i))],
          links: migrasi.map((m) => ({ source: `${tahunAwal} · ${namaPendek(nama(m.dari).nama)}`, target: `2026 · ${namaPendek(nama(m.ke).nama)}`, value: m.jumlah })),
          levels: [{ depth: 1, label: { position: "left" } }],
        },
      ],
    };
  }, [klaster, tahunAwal, migrasi]);
  return <Grafik opsi={opsi} tinggi={340} label={`Diagram Sankey perpindahan klaster dari ${tahunAwal} ke 2026`} />;
}
