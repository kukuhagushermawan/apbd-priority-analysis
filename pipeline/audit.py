"""Audit format berkas mentah terhadap schema_map.yaml.

Jalankan dari akar repo:  python -m pipeline.audit
Keluar dengan kode 1 bila ada pemeriksaan yang gagal, sehingga perubahan format
DJPK di masa depan langsung ketahuan sebelum pipeline berjalan.
"""

from __future__ import annotations

import sys

import pandas as pd

from pipeline.readers import (
    RAW_DIR,
    baca_fungsi_long,
    baca_fungsi_wide,
    baca_metadata_fungsi,
    baca_ringkas_wide,
    load_schema_map,
    petakan_label,
)


def audit(raw_dir=RAW_DIR) -> bool:
    sm = load_schema_map()
    ok = True
    ringkasan, kode_per_tahun = [], {}

    def gagal(msg):
        nonlocal ok
        ok = False
        print(f"  [GAGAL] {msg}")

    for year, ycfg in sm["tahun"].items():
        print(f"== {year}")
        fcfg = ycfg["fungsi"]
        meta = baca_metadata_fungsi(year, fcfg, raw_dir)
        wide = baca_fungsi_wide(year, fcfg, raw_dir)

        wide["kode_fungsi"] = wide["label_fungsi"].map(lambda v: petakan_label(v, sm["fungsi_baku"]))
        wide["kode_jenis"] = wide["label_jenis"].map(lambda v: petakan_label(v, sm["jenis_belanja_fungsi"]))
        fungsi_aktif = sorted(wide["kode_fungsi"].unique())
        n_pemda = wide["kode_pemda"].nunique()
        kode_per_tahun[year] = set(wide["kode_pemda"])
        if n_pemda != meta["jumlah_daerah_tertulis"]:
            gagal(f"jumlah pemda {n_pemda} != judul '{meta['jumlah_daerah_tertulis']} daerah'")

        nilai = wide["nilai_anggaran"]
        janggal = wide[(nilai > 0) & (nilai < sm["validasi"]["ambang_nilai_janggal_rp"])]
        if (nilai < 0).any():
            gagal(f"{int((nilai < 0).sum())} nilai negatif")

        tot_wide = wide.groupby("kode_pemda")["nilai_anggaran"].sum()
        long = baca_fungsi_long(year, fcfg, raw_dir)
        selisih_long = None
        if long is not None:
            selisih_long = (tot_wide - long.groupby("kode_pemda")["nilai_anggaran"].sum()).abs()
            if selisih_long.isna().any() or selisih_long.max() > 1:
                gagal(f"wide vs long berbeda (maks {selisih_long.max():,.2f})")

        ring = baca_ringkas_wide(year, ycfg["ringkas"], raw_dir)
        bel = ring[ring["kode_akun"] == sm["akun_ringkas"]["total_belanja"]].set_index("kode_pemda")["nilai_anggaran"]
        if set(bel.index) != set(tot_wide.index):
            gagal("himpunan pemda Fungsi != Ringkasan")
        pct = ((tot_wide - bel) / bel * 100).abs()
        n_lewat = int((pct > sm["validasi"]["toleransi_selisih_pct_awal"]).sum())
        if n_lewat:
            gagal(f"{n_lewat} pemda selisih > {sm['validasi']['toleransi_selisih_pct_awal']}%")

        ringkasan.append(
            {
                "tahun": year,
                "tanggal_data": meta["tanggal_data"],
                "pemda": n_pemda,
                "provinsi": int(wide.drop_duplicates("kode_pemda")["kode_pemda"].str.endswith(".00").sum()),
                "fungsi_aktif": len(fungsi_aktif),
                "sel_kosong": int(nilai.isna().sum()),
                "nilai_<Rp1rb": len(janggal),
                "non_bulat": int((nilai.dropna() % 1 != 0).sum()),
                "maks_wide_vs_long_rp": None if selisih_long is None else round(float(selisih_long.max()), 4),
                "maks_selisih_ringkas_pct": round(float(pct.max()), 6),
                "maks_selisih_ringkas_rp": round(float((tot_wide - bel).abs().max()), 4),
                "total_belanja_triliun": round(float(bel.sum()) / 1e12, 2),
            }
        )
        print(f"  fungsi aktif: {fungsi_aktif}")
        if len(janggal):
            print(f"  nilai janggal (<Rp1.000): {janggal[['kode_pemda', 'kode_fungsi', 'kode_jenis', 'nilai_anggaran']].values.tolist()}")

    print("\n== Perubahan himpunan kode pemda antartahun")
    tahun = sorted(kode_per_tahun)
    for a, b in zip(tahun, tahun[1:], strict=False):
        hilang, baru = sorted(kode_per_tahun[a] - kode_per_tahun[b]), sorted(kode_per_tahun[b] - kode_per_tahun[a])
        print(f"  {a}->{b}: hilang {len(hilang)}, baru {len(baru)}")
        if hilang or baru:
            peta = sm["pemekaran_papua"]["kode_lama_ke_baru"]
            if set(hilang) != set(peta) or set(baru) - set(peta.values()) != set(sm["pemekaran_papua"]["provinsi_baru"]):
                gagal(f"perubahan kode {a}->{b} tidak sesuai pemekaran_papua di schema_map")

    print("\n== Ringkasan")
    with pd.option_context("display.width", 200, "display.max_columns", 20):
        print(pd.DataFrame(ringkasan).to_string(index=False))
    print("\nSTATUS:", "LULUS" if ok else "GAGAL")
    return ok


if __name__ == "__main__":
    sys.exit(0 if audit() else 1)
