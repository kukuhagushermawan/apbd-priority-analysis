"use client";

// Pembungkus Apache ECharts: hanya modul yang dipakai yang dimuat.
import { BarChart, HeatmapChart, LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, MarkAreaComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { useEffect, useRef } from "react";

echarts.use([BarChart, HeatmapChart, LineChart, GridComponent, LegendComponent, MarkAreaComponent, TooltipComponent, VisualMapComponent, CanvasRenderer]);

export type OpsiGrafik = echarts.EChartsCoreOption;

type Props = {
  opsi: OpsiGrafik;
  tinggi?: number;
  label: string; // deskripsi untuk pembaca layar
  onKlik?: (p: { seriesId?: string; name: string; data: unknown; value: unknown }) => void;
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
