"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { GRID, Grafik, SUMBU, TEKS, WARNA_KOMPONEN } from "@/components/grafik";
import { bacaFilter, keQuery } from "@/lib/filter";
import { persen, pp } from "@/lib/format";
import { grupGrafik } from "@/lib/fungsi";

type Komposisi = { kode: string; nama: string; nilai: number[] }[];

/** Stacked bar 100%: komposisi share Anggaran per tahun. Klik segmen -> Tren per Fungsi. */
export function GrafikKomposisi({ tahun, komposisi, tautan = true }: { tahun: number[]; komposisi: Komposisi; tautan?: boolean }) {
  const router = useRouter();
  const filter = bacaFilter(useSearchParams());
  const sorot = filter.fungsi ? grupGrafik(filter.fungsi) : null;

  const opsi = useMemo(
    () => ({
      grid: { left: 8, right: 8, top: 56, bottom: 8 },
      legend: { top: 0, left: 0, icon: "roundRect", itemWidth: 12, itemHeight: 12, textStyle: { color: TEKS } },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => persen(v) },
      xAxis: { type: "category", data: tahun.map(String), ...SUMBU },
      yAxis: { type: "value", max: 100, ...SUMBU, axisLabel: { color: TEKS, formatter: "{value}%" }, splitLine: { lineStyle: { color: GRID } } },
      series: komposisi.map((g) => ({
        id: g.kode,
        name: g.nama,
        type: "bar",
        stack: "total",
        barMaxWidth: 64,
        data: g.nilai.map((v) => Number(v.toFixed(2))),
        itemStyle: { color: WARNA_KOMPONEN[g.kode], borderColor: "#ffffff", borderWidth: 2, opacity: sorot && sorot !== g.kode ? 0.25 : 1 },
        label: { show: true, color: "#0f1b2d", fontSize: 11, formatter: (p: { value: number }) => (p.value >= 5 ? `${p.value.toFixed(0)}%` : "") },
        emphasis: { focus: "series" },
        cursor: tautan ? "pointer" : "default",
      })),
    }),
    [tahun, komposisi, sorot, tautan],
  );

  return (
    <Grafik
      opsi={opsi}
      tinggi={360}
      label="Grafik batang bertumpuk komposisi share anggaran per fungsi"
      onKlik={
        tautan
          ? (p) => {
              const fungsi = p.seriesId && p.seriesId !== "LN" ? p.seriesId : null;
              router.push(`/tren${keQuery({ ...filter, fungsi })}`);
            }
          : undefined
      }
    />
  );
}

type Delta = { tahun: number[]; baris: { kode: string; nama: string; nilai: number[] }[] };

/** Heatmap divergen Δshare (pp) fungsi x tahun. Klik sel -> Deteksi Pergeseran (pemda penyumbang). */
export function HeatmapDelta({ delta, fungsiDipilih }: { delta: Delta; fungsiDipilih?: string }) {
  const router = useRouter();
  const filter = bacaFilter(useSearchParams());
  const { tahun, baris } = delta;

  const opsi = useMemo(() => {
    const nilai = baris.flatMap((b, y) => b.nilai.map((v, x) => [x, y, Number(v.toFixed(2))]));
    const batas = Math.max(0.5, ...nilai.map((n) => Math.abs(n[2])));
    const dipilih = (x: number, y: number) => tahun[x] === filter.tahun && baris[y].kode === (fungsiDipilih ?? filter.fungsi);
    return {
      grid: { left: 8, right: 8, top: 8, bottom: 56 },
      tooltip: {
        formatter: (p: { value: number[] }) =>
          `${baris[p.value[1]].nama}<br/>${tahun[p.value[0]]}: <b>${pp(p.value[2])}</b>${tahun[p.value[0]] === 2023 ? "<br/><i>patahan klasifikasi 2022→2023</i>" : ""}`,
      },
      xAxis: { type: "category", data: tahun.map((t) => (t === 2023 ? "2023 ⚑" : String(t))), ...SUMBU },
      yAxis: { type: "category", data: baris.map((b) => b.nama), inverse: true, ...SUMBU },
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
          data: nilai.map(([x, y, v]) => ({
            value: [x, y, v],
            itemStyle: dipilih(x, y) ? { borderColor: "#0b2d5b", borderWidth: 3 } : undefined,
          })),
          label: { show: true, fontSize: 11, color: "#0f1b2d", formatter: (p: { value: number[] }) => p.value[2].toFixed(1) },
          itemStyle: { borderColor: "#ffffff", borderWidth: 2, borderRadius: 4 },
          cursor: "pointer",
        },
      ],
    };
  }, [tahun, baris, filter.tahun, filter.fungsi, fungsiDipilih]);

  return (
    <Grafik
      opsi={opsi}
      tinggi={380}
      label="Heatmap perubahan share anggaran per fungsi dan tahun"
      onKlik={(p) => {
        const [x, y] = p.value as number[];
        router.push(`/pergeseran${keQuery({ ...filter, tahun: tahun[x], fungsi: baris[y].kode })}`, { scroll: false });
      }}
    />
  );
}
