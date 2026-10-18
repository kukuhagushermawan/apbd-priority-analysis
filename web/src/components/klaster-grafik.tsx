"use client";

import { useMemo } from "react";
import { ABU, Grafik, SUMBU, TEKS, WARNA_SERI } from "@/components/grafik";
import { persen } from "@/lib/format";

type Klaster = { klaster: number; nama: string };

/** Profil centroid: share Anggaran rata-rata tiap klaster per komponen, dibanding rata-rata kelompok. */
export function GrafikCentroid({ klaster, centroid }: { klaster: Klaster[]; centroid: { nama: string; rata: number; nilai: number[] }[] }) {
  const opsi = useMemo(
    () => ({
      grid: { left: 8, right: 8, top: 40, bottom: 8 },
      legend: { top: 0, left: 0, textStyle: { color: TEKS } },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => persen(v) },
      xAxis: { type: "category", data: centroid.map((c) => c.nama), ...SUMBU, axisLabel: { color: TEKS, interval: 0, fontSize: 11 } },
      yAxis: { type: "value", ...SUMBU, axisLabel: { color: TEKS, formatter: "{value}%" } },
      series: [
        ...klaster.map((k, i) => ({
          name: k.nama,
          type: "bar",
          barGap: "10%",
          data: centroid.map((c) => Number(c.nilai[i].toFixed(2))),
          itemStyle: { color: WARNA_SERI[i], borderRadius: [4, 4, 0, 0] },
        })),
        { name: "Rata-rata kelompok", type: "bar", data: centroid.map((c) => Number(c.rata.toFixed(2))), itemStyle: { color: ABU, borderRadius: [4, 4, 0, 0] } },
      ],
    }),
    [klaster, centroid],
  );
  return <Grafik opsi={opsi} tinggi={360} label="Profil centroid klaster per komponen belanja" />;
}

/** Sankey migrasi klaster dari tahun awal ke 2026. */
export function GrafikSankey({ klaster, tahunAwal, migrasi }: { klaster: Klaster[]; tahunAwal: number; migrasi: { dari: number; ke: number; jumlah: number }[] }) {
  const opsi = useMemo(() => {
    const simpul = (tahun: number, k: Klaster, i: number) => ({ name: `${tahun} · ${k.nama}`, itemStyle: { color: WARNA_SERI[i], borderColor: WARNA_SERI[i] } });
    const nama = (k: number) => klaster.find((x) => x.klaster === k)!;
    return {
      tooltip: { trigger: "item", formatter: (p: { data: { source?: string; target?: string; value?: number }; name: string }) =>
        p.data.source ? `${p.data.source} → ${p.data.target}: <b>${p.data.value} pemda</b>` : p.name },
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
          label: { color: "#0f1b2d", fontSize: 12 },
          lineStyle: { color: "gradient", opacity: 0.35, curveness: 0.5 },
          data: [...klaster.map((k, i) => simpul(tahunAwal, k, i)), ...klaster.map((k, i) => simpul(2026, k, i))],
          links: migrasi.map((m) => ({ source: `${tahunAwal} · ${nama(m.dari).nama}`, target: `2026 · ${nama(m.ke).nama}`, value: m.jumlah })),
          levels: [{ depth: 1, label: { position: "left" } }],
        },
      ],
    };
  }, [klaster, tahunAwal, migrasi]);
  return <Grafik opsi={opsi} tinggi={340} label={`Diagram Sankey migrasi klaster ${tahunAwal} ke 2026`} />;
}
