"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Grafik } from "@/components/grafik";
import type { Ringkasan } from "@/lib/data";
import { bacaFilter, keQuery } from "@/lib/filter";
import { persen, pp } from "@/lib/format";
import { grupGrafik } from "@/lib/fungsi";

// Palet kategori tervalidasi (aman buta warna untuk seri bersebelahan); "Lainnya" abu-abu netral.
const WARNA: Record<string, string> = { "01": "#2a78d6", "04": "#eb6834", "06": "#1baf7a", "07": "#eda100", "10": "#e87ba4", LN: "#a3a7ae" };
const TEKS = "#556074";
const GRID = "#e6eaf0";

/** Stacked bar 100%: komposisi share Anggaran per tahun. Klik segmen -> Tren per Fungsi. */
export function GrafikKomposisi({ data }: { data: Ringkasan }) {
  const router = useRouter();
  const filter = bacaFilter(useSearchParams());
  const sorot = filter.fungsi ? grupGrafik(filter.fungsi) : null;

  const opsi = useMemo(
    () => ({
      grid: { left: 8, right: 8, top: 56, bottom: 8 },
      legend: { top: 0, left: 0, icon: "roundRect", itemWidth: 12, itemHeight: 12, textStyle: { color: TEKS } },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        valueFormatter: (v: number) => persen(v),
      },
      xAxis: { type: "category", data: data.tahun.map(String), axisTick: { show: false }, axisLabel: { color: TEKS } },
      yAxis: { type: "value", max: 100, axisLabel: { color: TEKS, formatter: "{value}%" }, splitLine: { lineStyle: { color: GRID } } },
      series: data.komposisi.map((g) => ({
        id: g.kode,
        name: g.nama,
        type: "bar",
        stack: "total",
        barMaxWidth: 64,
        data: g.nilai.map((v) => Number(v.toFixed(2))),
        itemStyle: { color: WARNA[g.kode], borderColor: "#ffffff", borderWidth: 2, opacity: sorot && sorot !== g.kode ? 0.25 : 1 },
        label: {
          show: true,
          color: "#0f1b2d",
          fontSize: 11,
          formatter: (p: { value: number }) => (p.value >= 5 ? `${p.value.toFixed(0)}%` : ""),
        },
        emphasis: { focus: "series" },
        cursor: "pointer",
      })),
    }),
    [data, sorot],
  );

  return (
    <Grafik
      opsi={opsi}
      tinggi={360}
      label="Grafik batang bertumpuk komposisi share anggaran per fungsi 2022-2026"
      onKlik={(p) => {
        const fungsi = p.seriesId && p.seriesId !== "LN" ? p.seriesId : null;
        router.push(`/tren${keQuery({ ...filter, fungsi })}`);
      }}
    />
  );
}

/** Heatmap divergen Δshare (pp) fungsi x tahun. Klik sel -> Deteksi Pergeseran. */
export function HeatmapDelta({ data }: { data: Ringkasan }) {
  const router = useRouter();
  const filter = bacaFilter(useSearchParams());
  const { tahun, baris } = data.delta;

  const opsi = useMemo(() => {
    const nilai = baris.flatMap((b, y) => b.nilai.map((v, x) => [x, y, Number(v.toFixed(2))]));
    const batas = Math.max(0.5, ...nilai.map((n) => Math.abs(n[2])));
    return {
      grid: { left: 8, right: 8, top: 8, bottom: 56 },
      tooltip: {
        formatter: (p: { value: number[] }) =>
          `${baris[p.value[1]].nama}<br/>${tahun[p.value[0]]}: <b>${pp(p.value[2])}</b>${tahun[p.value[0]] === 2023 ? "<br/><i>patahan klasifikasi 2022→2023</i>" : ""}`,
      },
      xAxis: { type: "category", data: tahun.map((t) => (t === 2023 ? "2023 ⚑" : String(t))), axisTick: { show: false }, axisLabel: { color: TEKS } },
      yAxis: { type: "category", data: baris.map((b) => b.nama), inverse: true, axisTick: { show: false }, axisLabel: { color: TEKS } },
      visualMap: {
        min: -batas,
        max: batas,
        calculable: false,
        orient: "horizontal",
        left: "center",
        bottom: 0,
        itemWidth: 12,
        itemHeight: 160,
        text: ["Naik", "Turun"],
        textStyle: { color: TEKS },
        // divergen: merah (turun) - abu netral - biru (naik)
        inRange: { color: ["#b3261e", "#e34948", "#f4b4b2", "#f0efec", "#9ec5f4", "#2a78d6", "#184f95"] },
      },
      series: [
        {
          type: "heatmap",
          data: nilai,
          label: { show: true, fontSize: 11, color: "#0f1b2d", formatter: (p: { value: number[] }) => p.value[2].toFixed(1) },
          itemStyle: { borderColor: "#ffffff", borderWidth: 2, borderRadius: 4 },
          cursor: "pointer",
        },
      ],
    };
  }, [tahun, baris]);

  return (
    <Grafik
      opsi={opsi}
      tinggi={380}
      label="Heatmap perubahan share anggaran per fungsi dan tahun"
      onKlik={(p) => {
        const [x, y] = p.value as number[];
        router.push(`/pergeseran${keQuery({ ...filter, tahun: tahun[x], fungsi: baris[y].kode })}`);
      }}
    />
  );
}
