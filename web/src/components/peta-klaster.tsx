"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { daftarkanPeta, Grafik, warnaKlaster } from "@/components/grafik";
import { namaPendek } from "@/components/klaster-grafik";
import { Skeleton } from "@/components/ui/skeleton";

const KOSONG = "#dfe5ee"; // wilayah tanpa data / di luar filter

type Klaster = { klaster: number; nama: string };
type Anggota = { kode_pemda: string; nama_pemda: string; klaster: number };

/**
 * Peta choropleth klaster 2026. Wilayah = kabupaten/kota (geoBoundaries), kode DJPK
 * disisipkan oleh pipeline/cocokkan_peta.py. Mode provinsi: setiap kab/kota diwarnai
 * menurut klaster provinsinya, sehingga 4 provinsi baru Papua tetap tergambar.
 */
export function PetaKlaster({ klaster, anggota, modeProvinsi, query }: { klaster: Klaster[]; anggota: Anggota[]; modeProvinsi: boolean; query: string }) {
  const router = useRouter();
  const [kodePeta, setKodePeta] = useState<string[] | null>(null);
  const [galat, setGalat] = useState(false);

  useEffect(() => {
    fetch("/peta/kabkota.topo.json")
      .then((r) => r.json())
      .then((topo: Topology<{ kabkota: GeometryCollection<{ kode_pemda: string | null; nama_peta: string }> }>) => {
        const geo = feature(topo, topo.objects.kabkota);
        daftarkanPeta("kabkota", geo);
        setKodePeta(geo.features.map((f) => f.properties.kode_pemda).filter((k): k is string => k !== null));
      })
      .catch(() => setGalat(true));
  }, []);

  const opsi = useMemo(() => {
    if (!kodePeta) return null;
    const per = new Map(anggota.map((a) => [a.kode_pemda, a]));
    const data = kodePeta.flatMap((kode) => {
      const a = per.get(modeProvinsi ? `${kode.slice(0, 2)}.00` : kode);
      return a ? [{ name: kode, value: a.klaster, pemda: a.nama_pemda, kode: a.kode_pemda, itemStyle: { areaColor: warnaKlaster(klaster.find((k) => k.klaster === a.klaster)?.nama ?? "", a.klaster - 1) } }] : [];
    });
    return {
      tooltip: {
        trigger: "item",
        formatter: (p: { data?: { pemda: string; value: number } }) =>
          p.data ? `${p.data.pemda}<br/>${namaPendek(klaster.find((k) => k.klaster === p.data!.value)?.nama ?? "")}` : "Tidak ada data / bukan pemda ber-APBD",
      },
      series: [
        {
          type: "map",
          map: "kabkota",
          nameProperty: "kode_pemda",
          roam: true,
          aspectScale: 1,
          left: 8,
          right: 8,
          top: 8,
          bottom: 8,
          itemStyle: { areaColor: KOSONG, borderColor: "#ffffff", borderWidth: 0.4 },
          emphasis: { label: { show: false }, itemStyle: { areaColor: "#d9622b" } },
          select: { disabled: true },
          data,
        },
      ],
    };
  }, [kodePeta, anggota, klaster, modeProvinsi]);

  if (galat) return <p className="text-sm text-destructive">Berkas peta gagal dimuat.</p>;
  if (!opsi) return <Skeleton className="h-[420px]" />;

  return (
    <div className="space-y-2">
      <Grafik
        opsi={opsi}
        tinggi={420}
        label="Peta choropleth klaster pemda 2026"
        onKlik={(p) => {
          const d = p.data as { kode?: string } | undefined;
          if (d?.kode) router.push(`/daerah/${d.kode}${query}`);
        }}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {klaster.map((k, i) => (
          <span key={k.klaster} className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-sm" style={{ background: warnaKlaster(k.nama, i) }} aria-hidden />
            {namaPendek(k.nama)}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm" style={{ background: KOSONG }} aria-hidden />
          Tidak ada data / di luar filter
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Batas wilayah: geoBoundaries (Runfola dkk., 2020), data BPS/WFP/OCHA ROAP kondisi 2020, lisensi{" "}
        <a href="https://creativecommons.org/licenses/by/3.0/igo/" className="underline" target="_blank" rel="noreferrer">
          CC BY 3.0 IGO
        </a>
        . Gulir untuk memperbesar, klik wilayah untuk membuka profilnya.
      </p>
    </div>
  );
}
