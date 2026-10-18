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
    buat_peta_titik(topo)
    return 0


TITIK = FOLDER.parent / "web" / "src" / "lib" / "peta-titik.json"


def buat_peta_titik(topo: dict, jarak: float = 0.38, skala: int = 20) -> None:
    """Peta titik untuk ilustrasi beranda: grid titik di daratan Indonesia, tiap titik
    diwarnai klaster 2026 kab/kota di bawahnya (butuh hasil langkah 2)."""
    sk, tr = topo["transform"]["scale"], topo["transform"]["translate"]
    busur = []
    for a in topo["arcs"]:
        x = y = 0
        titik = []
        for dx, dy in a:
            x, y = x + dx, y + dy
            titik.append((x * sk[0] + tr[0], y * sk[1] + tr[1]))
        busur.append(titik)

    def cincin(idx):
        hasil = []
        for i in idx:
            seg = busur[i] if i >= 0 else busur[~i][::-1]
            hasil.extend(seg if not hasil else seg[1:])
        return hasil

    def di_dalam(x, y, r):
        dalam = False
        for (x1, y1), (x2, y2) in zip(r, r[1:] + r[:1], strict=True):
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                dalam = not dalam
        return dalam

    klaster = pd.read_parquet(FOLDER.parent / "data" / "processed" / "klaster.parquet")
    klaster = klaster[(klaster["tahun"] == 2026) & (klaster["kelompok"] == "kabkota")].set_index("kode_pemda")["nama_klaster"]
    poligon = []
    for g in topo["objects"]["kabkota"]["geometries"]:
        kode = g["properties"]["kode_pemda"]
        jenis = "pendidikan" if "Pendidikan" in klaster.get(kode, "") else "ekonomi" if kode else None
        for bagian in [g["arcs"]] if g["type"] == "Polygon" else g["arcs"]:
            cincin_ = [cincin(r) for r in bagian]
            xs, ys = zip(*cincin_[0], strict=True)
            poligon.append(((min(xs), min(ys), max(xs), max(ys)), cincin_, jenis))

    lon0, lat0, lon1, lat1 = 95.0, 6.2, 141.4, -11.2
    jalur = {"pendidikan": [], "ekonomi": []}
    lat, baris = lat0, 0
    while lat > lat1:
        lon = lon0 + (jarak / 2 if baris % 2 else 0)  # baris berselang agar rapat
        while lon < lon1:
            for (x0, y0, x1, y1), cincin_, jenis in poligon:
                if (
                    x0 <= lon <= x1
                    and y0 <= lat <= y1
                    and di_dalam(lon, lat, cincin_[0])
                    and not any(di_dalam(lon, lat, h) for h in cincin_[1:])
                ):
                    if jenis:
                        jalur[jenis].append(f"M{round((lon - lon0) * skala)} {round((lat0 - lat) * skala)}h0")
                    break
            lon += jarak
        lat -= jarak
        baris += 1
    data = {"lebar": round((lon1 - lon0) * skala), "tinggi": round((lat0 - lat1) * skala)}
    data |= {k: "".join(v) for k, v in jalur.items()}
    TITIK.write_text(json.dumps(data), encoding="utf-8")
    print(f"Peta titik: {len(jalur['pendidikan'])} titik pendidikan, {len(jalur['ekonomi'])} ekonomi -> {TITIK}")


if __name__ == "__main__":
    sys.exit(main())
