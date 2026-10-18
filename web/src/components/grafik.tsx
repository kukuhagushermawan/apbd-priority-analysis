"use client";

// Pembungkus Apache ECharts: hanya modul yang dipakai yang dimuat.
import { BarChart, HeatmapChart, LineChart, SankeyChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { useEffect, useMemo, useRef } from "react";

echarts.use([
  BarChart,
  HeatmapChart,
  LineChart,
  SankeyChart,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

export type OpsiGrafik = echarts.EChartsCoreOption;

// Palet kategori tervalidasi (aman buta warna untuk seri bersebelahan); "Lainnya"/pembanding abu-abu netral.
export const WARNA_SERI = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"];
export const WARNA_KOMPONEN: Record<string, string> = {
  "01": WARNA_SERI[0],
  "04": WARNA_SERI[1],
  "06": WARNA_SERI[2],
  "07": WARNA_SERI[3],
  "10": WARNA_SERI[4],
  LN: "#a3a7ae",
};
export const ABU = "#a3a7ae";
export const TEKS = "#556074";
export const GRID = "#e6eaf0";
export const SUMBU = {
  axisTick: { show: false },
  axisLabel: { color: TEKS },
  axisLine: { lineStyle: { color: "#cfd7e3" } },
  splitLine: { lineStyle: { color: GRID } },
};

type Props = {
  opsi: OpsiGrafik;
  tinggi?: number;
  label: string; // deskripsi untuk pembaca layar
  onKlik?: (p: { seriesId?: string; seriesIndex?: number; name: string; data: unknown; value: unknown; dataType?: string }) => void;
};

export function Grafik({ opsi, tinggi = 320, label, onKlik }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const klik = useRef(onKlik);
  useEffect(() => {
    klik.current = onKlik;
  });

  useEffect(() => {
    const el = ref.current!;
    const c = echarts.init(el, undefined, { renderer: "canvas" });
    chart.current = c;
    c.on("click", (p) => klik.current?.(p as never));
    const amati = new ResizeObserver(() => c.resize());
    amati.observe(el);
    return () => {
      amati.disconnect();
      c.dispose();
    };
  }, []);

  useEffect(() => {
    chart.current?.setOption({ textStyle: { fontFamily: "inherit" }, ...opsi }, true);
  }, [opsi]);

  return <div ref={ref} role="img" aria-label={label} style={{ height: tinggi }} className="w-full" />;
}

/**
 * Garis + pita: dipakai Tren (median & rentang antarkuartil), IPS, dan Proyeksi
 * (garis putus-putus + rentang ketidakpastian). Nilai null = tidak digambar.
 */
export function GrafikPita(props: {
  sumbuX: string[];
  garis: (number | null)[];
  namaGaris: string;
  bawah?: (number | null)[];
  atas?: (number | null)[];
  namaPita?: string;
  garisLanjutan?: (number | null)[]; // mis. proyeksi
  namaLanjutan?: string;
  acuan?: { nilai: number; label: string }; // garis horizontal, mis. 20%
  anotasi?: { x: string; teks: string }[]; // garis vertikal peristiwa
  satuan?: string;
  tinggi?: number;
  label: string;
}) {
  const { sumbuX, garis, bawah, atas, garisLanjutan, acuan, anotasi, satuan = "%" } = props;
  const opsi = useMemo(() => {
    const f = (v: number | null) => (v === null || v === undefined ? "–" : `${v.toFixed(1).replace(".", ",")}${satuan === "%" ? "%" : ` ${satuan}`}`);
    const pita =
      bawah && atas
        ? [
            { name: props.namaPita, type: "line", stack: "pita", data: bawah, lineStyle: { opacity: 0 }, symbol: "none", tooltip: { show: false } },
            {
              name: props.namaPita,
              type: "line",
              stack: "pita",
              data: atas.map((a, i) => (a === null || bawah[i] === null ? null : a - (bawah[i] as number))),
              lineStyle: { opacity: 0 },
              symbol: "none",
              areaStyle: { color: "#2a78d6", opacity: 0.15 },
              tooltip: { show: false },
            },
          ]
        : [];
    return {
      grid: { left: 8, right: 16, top: 40, bottom: 8 },
      legend: { top: 0, left: 0, textStyle: { color: TEKS }, data: [props.namaGaris, props.namaLanjutan, props.namaPita].filter(Boolean) },
      tooltip: {
        trigger: "axis",
        formatter: (ps: { axisValue: string; dataIndex: number }[]) => {
          const i = ps[0].dataIndex;
          const baris = [`<b>${ps[0].axisValue}</b>`];
          if (garis[i] !== null && garis[i] !== undefined) baris.push(`${props.namaGaris}: ${f(garis[i])}`);
          if (garisLanjutan?.[i] !== null && garisLanjutan?.[i] !== undefined && garis[i] === null) baris.push(`${props.namaLanjutan}: ${f(garisLanjutan[i])}`);
          if (bawah?.[i] !== null && bawah?.[i] !== undefined) baris.push(`${props.namaPita}: ${f(bawah[i])} – ${f(atas![i])}`);
          return baris.join("<br/>");
        },
      },
      xAxis: { type: "category", data: sumbuX, boundaryGap: false, ...SUMBU, splitLine: { show: false } },
      yAxis: { type: "value", scale: true, ...SUMBU, axisLabel: { color: TEKS, formatter: satuan === "%" ? "{value}%" : `{value}` } },
      series: [
        ...pita,
        {
          name: props.namaGaris,
          type: "line",
          data: garis,
          lineStyle: { width: 2, color: WARNA_SERI[0] },
          itemStyle: { color: WARNA_SERI[0] },
          symbolSize: 8,
          markLine: {
            symbol: "none",
            silent: true,
            label: { color: TEKS, fontSize: 11 },
            lineStyle: { color: "#8a94a6", type: "dashed" },
            data: [
              ...(anotasi ?? []).map((a) => ({ xAxis: a.x, label: { formatter: a.teks, position: "insideEndTop" } })),
              ...(acuan ? [{ yAxis: acuan.nilai, label: { formatter: acuan.label, position: "insideEndTop" }, lineStyle: { color: "#c98500" } }] : []),
            ],
          },
        },
        ...(garisLanjutan
          ? [
              {
                name: props.namaLanjutan,
                type: "line",
                data: garisLanjutan,
                lineStyle: { width: 2, type: "dashed", color: WARNA_SERI[0] },
                itemStyle: { color: "#ffffff", borderColor: WARNA_SERI[0], borderWidth: 2 },
                symbolSize: 8,
              },
            ]
          : []),
      ],
    };
  }, [sumbuX, garis, bawah, atas, garisLanjutan, acuan, anotasi, satuan, props.namaGaris, props.namaLanjutan, props.namaPita]);

  return <Grafik opsi={opsi} tinggi={props.tinggi ?? 340} label={props.label} />;
}
