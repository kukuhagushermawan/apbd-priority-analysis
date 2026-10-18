"""Cocokkan wilayah peta geoBoundaries ke kode pemda DJPK.

Jalankan: python -m pipeline.cocokkan_peta
Masukan : data/peta/geoBoundaries-IDN-ADM2_simplified.topojson (sumber: data/peta/SUMBER.md)
Keluaran: web/public/peta/kabkota.topo.json, berisi properti kode_pemda dan nama_pemda tiap wilayah
          (null bila wilayah tidak punya APBD sendiri, mis. kota administrasi DKI Jakarta dan danau).
"""

import json
import re
import sys

import pandas as pd

from pipeline.langkah1_bersihkan import CROSSWALK, FOLDER

SUMBER = FOLDER.parent / "data" / "peta" / "geoBoundaries-IDN-ADM2_simplified.topojson"
KELUARAN = FOLDER.parent / "web" / "public" / "peta" / "kabkota.topo.json"

# Nama di peta (kondisi 2020) yang berbeda dari nama DJPK: ganti nama atau ejaan lain
KHUSUS = {
    "Kota Baru": "Kab. Kotabaru",  # Kalimantan Selatan, sebuah kabupaten
    "Kota Padangsidimpuan": "Kota Padang Sidempuan",
    "Mahakam Hulu": "Kab. Mahakam Ulu",
    "Maluku Tenggara Barat": "Kab. Kepulauan Tanimbar",  # berganti nama 2019
    "Mamuju Utara": "Kab. Pasangkayu",  # berganti nama 2017
    "Ogan Komering Ulu Selatan": "Kab. OKU Selatan",
    "Ogan Komering Ulu Timur": "Kab. OKU Timur",
    "Pangkajene Dan Kepulauan": "Kab. Pangkajene Kepulauan",
    "Siau Tagulandang Biaro": "Kab. Kep. Siau Tagulandang Biaro",
    "Toba Samosir": "Kab. Toba",  # berganti nama 2020
}
# Wilayah peta yang bukan pemda ber-APBD (kota/kab administrasi DKI, danau, waduk, hutan)
TANPA_APBD = {
    "Danau",
    "Danau Toba",
    "Waduk Cirata",
    "Wadung Kedungombo",
    "Hutan",
    "Kepulauan Seribu",
    "Kota Jakarta Barat",
    "Kota Jakarta Pusat",
    "Kota Jakarta Selatan",
    "Kota Jakarta Timur",
    "Kota Jakarta Utara",
}


def kunci(nama: str) -> str:
    """'Kab. Lima Puluh Kota' & 'Limapuluh Kota' -> 'limapuluhkota'; awalan Kota dipertahankan."""
    nama = re.sub(r"^Kab(upaten)?\.?\s+", "", nama.strip())
    return re.sub(r"[^a-z]", "", nama.lower())


def main() -> int:
    topo = json.loads(SUMBER.read_text(encoding="utf-8"))
    cw = pd.read_csv(CROSSWALK, dtype=str, keep_default_na=False)
    kabkota = cw[cw["tingkat"] != "provinsi"]
    indeks = {kunci(r.nama_pemda): r.kode_pemda for r in kabkota.itertuples()}

    cocok, gagal = {}, []
    for geo in topo["objects"]["IDNADM2gbOpen"]["geometries"]:
        nama = geo["properties"]["shapeName"]
        kode = None if nama in TANPA_APBD else indeks.get(kunci(KHUSUS.get(nama, nama)))
        if kode is None and nama not in TANPA_APBD:
            gagal.append(nama)
        geo["properties"] = {"kode_pemda": kode, "nama_peta": nama}
        if kode:
            cocok.setdefault(kode, []).append(nama)

    ganda = {k: v for k, v in cocok.items() if len(v) > 1}
    tanpa_peta = sorted(set(kabkota["kode_pemda"]) - set(cocok))
    print(f"Wilayah peta: {len(topo['objects']['IDNADM2gbOpen']['geometries'])}, cocok: {len(cocok)} dari {len(kabkota)} kab/kota DJPK")
    print("Nama peta tak cocok:", gagal)
    print("Satu kode untuk >1 wilayah:", ganda)
    print("Kab/kota DJPK tanpa wilayah peta:", kabkota.set_index("kode_pemda").loc[tanpa_peta, "nama_pemda"].tolist())
    if gagal or ganda or tanpa_peta:
        return 1

    topo["objects"] = {"kabkota": topo["objects"]["IDNADM2gbOpen"]}
    KELUARAN.parent.mkdir(parents=True, exist_ok=True)
    KELUARAN.write_text(json.dumps(topo, separators=(",", ":")), encoding="utf-8")
    print(f"Ditulis: {KELUARAN} ({KELUARAN.stat().st_size / 1e6:.1f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
