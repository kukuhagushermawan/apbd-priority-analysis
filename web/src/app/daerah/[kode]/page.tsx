import { Suspense } from "react";
import { Menyusul } from "@/components/kartu";

export default function ProfilDaerah({ params }: PageProps<"/daerah/[kode]">) {
  return (
    <Suspense>
      <Isi params={params} />
    </Suspense>
  );
}

async function Isi({ params }: { params: PageProps<"/daerah/[kode]">["params"] }) {
  const { kode } = await params;
  return <Menyusul judul={`Profil Daerah ${kode}`} isi="Komposisi Anggaran per tahun, posisi terhadap median tingkat dan centroid klaster." />;
}
