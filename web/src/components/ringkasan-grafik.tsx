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
      grid: { left: 8, right: 40, top: 16, bottom: 72 },
      legend: { bottom: 0, left: "center", icon: "roundRect", itemWidth: 12, itemHeight: 12, itemGap: 16, textStyle: { color: TEKS } },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => persen(v) },
      xAxis: { type: "category", data: tahun.map(String), ...SUMBU },
      yAxis: { type: "value", max: 100, ...SUMBU, axisLabel: { color: TEKS, formatter: "{value}%" }, splitLine: { lineStyle: { color: GRID } } },
      series: komposisi.map((g) => ({
        id: g.kode,
        name: g.nama,
        type: "bar",
        stack: "total",
        barMaxWidth: 52,
        // segmen tipis (< 4%) labelnya ditaruh di samping batang agar angkanya tetap terbaca
        data: g.nilai.map((v) => {
          const value = Number(v.toFixed(2));
          return value < 4 ? { value, label: { position: "right", color: TEKS, fontWeight: 600 } } : value;
        }),
        itemStyle: { color: WARNA_KOMPONEN[g.kode], borderColor: "#ffffff", borderWidth: 1, opacity: sorot && sorot !== g.kode ? 0.25 : 1 },
        label: {
          show: true,
          color: ["01", "07"].includes(g.kode) ? "#ffffff" : "#15171c",
          fontSize: 11,
          fontWeight: 600,
          formatter: (p: { value: number }) => (p.value >= 0.5 ? `${Math.round(p.value)}%` : ""),
        },
        emphasis: { focus: "series" },
        cursor: tautan ? "pointer" : "default",
      })),
    }),
    [tahun, komposisi, sorot, tautan],
  );

  return (
    <Grafik
      opsi={opsi}
      tinggi={400}
      label="Grafik batang bertumpuk komposisi porsi anggaran per fungsi"
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
          `${baris[p.value[1]].nama}<br/>${tahun[p.value[0]]}: <b>${pp(p.value[2])}</b>${tahun[p.value[0]] === 2023 ? "<br/><i>Terpengaruh perubahan klasifikasi 2022→2023</i>" : ""}`,
      },
      xAxis: { type: "category", data: tahun.map((t) => (t === 2023 ? "2023*" : String(t))), ...SUMBU },
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
        text: ["Meningkat", "Menurun"],
        itemGap: 8,
        textStyle: { color: TEKS },
        // divergen: oranye (turun) - abu netral - biru tua (naik)
        inRange: { color: ["#a8461a", "#d9622b", "#f3c3a8", "#f1f3f7", "#b9c9e2", "#3e6aa8", "#0b2d5b"] },
      },
      series: [
        {
          type: "heatmap",
          data: nilai.map(([x, y, v]) => ({
            value: [x, y, v],
            label: { color: Math.abs(v) / batas > 0.5 ? "#ffffff" : "#15171c" },
            itemStyle: dipilih(x, y) ? { borderColor: "#f5b800", borderWidth: 3 } : undefined,
          })),
          label: { show: true, fontSize: 11, fontWeight: 600, color: "#15171c", formatter: (p: { value: number[] }) => (Math.abs(p.value[2]) < 0.05 ? "0,0" : p.value[2].toFixed(1).replace(".", ",")) },
          itemStyle: { borderColor: "#ffffff", borderWidth: 3, borderRadius: 8 },
          cursor: "pointer",
        },
      ],
    };
  }, [tahun, baris, filter.tahun, filter.fungsi, fungsiDipilih]);

  return (
    <Grafik
      opsi={opsi}
      tinggi={380}
      label="Peta panas perubahan porsi anggaran per fungsi dan tahun"
      onKlik={(p) => {
        const [x, y] = p.value as number[];
        router.push(`/pergeseran${keQuery({ ...filter, tahun: tahun[x], fungsi: baris[y].kode })}`, { scroll: false });
      }}
    />
  );
}
