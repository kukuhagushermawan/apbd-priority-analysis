"""Tahap 5 — validasi; hasil ditulis ke log_validasi (Parquet, lalu PostgreSQL).

Status: LULUS (selisih <= 0,01% atau <= Rp10.000), PERINGATAN (<= 0,5%),
GAGAL (lebih besar), LEWATI (data pembanding tidak tersedia). Ambang dibaca
dari schema_map.yaml -> validasi.
"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import pandas as pd

from pipeline.storage import write_parquet

OUTPUT = "05_validasi/log_validasi.parquet"
KOLOM_LOG = [
    "tahun",
    "kode_pemda",
    "pemeriksaan",
    "nilai_harapan",
    "nilai_aktual",
    "selisih_rp",
    "selisih_pct",
    "status",
    "penyebab_dugaan",
]
DTYPES_LOG = {
    "tahun": "Int16",
    "kode_pemda": "string",
    "pemeriksaan": "string",
    "nilai_harapan": "float64",
    "nilai_aktual": "float64",
    "selisih_rp": "float64",
    "selisih_pct": "float64",
    "status": "string",
    "penyebab_dugaan": "string",
}


def _frame(rows: list) -> pd.DataFrame:
    return pd.DataFrame(rows, columns=KOLOM_LOG).astype(DTYPES_LOG)


def status_selisih(selisih_rp: float, selisih_pct: float, v: dict) -> str:
    a, p = abs(selisih_rp), abs(selisih_pct)
    if p <= v["toleransi_selisih_pct_usulan"] or a <= v["toleransi_selisih_abs_rp"]:
        return "LULUS"
    if p <= v["toleransi_selisih_pct_awal"]:
        return "PERINGATAN"
    return "GAGAL"


def _pct(selisih: float, harapan: float) -> float:
    if harapan == 0:
        return 0.0 if selisih == 0 else float("inf")
    return selisih / harapan * 100


def penyebab_total(aktual: float, harapan: float, nilai_fungsi: pd.Series, status: str) -> str:
    """Dugaan penyebab selisih total fungsi vs Ringkasan untuk satu pemda-tahun."""
    if np.isnan(harapan):
        return "pemda tidak ada di Ringkasan"
    if np.isnan(aktual):
        return "pemda tidak ada di berkas Fungsi"
    if aktual == 0:
        return "seluruh nilai fungsi kosong"
    selisih = aktual - harapan
    if status == "LULUS":
        return "pembulatan sen" if selisih != 0 else ""
    if (harapan and 900 <= abs(aktual / harapan) <= 1100) or (aktual and 900 <= abs(harapan / aktual) <= 1100):
        return "dugaan beda satuan (ribuan vs rupiah)"
    cocok = nilai_fungsi[(nilai_fungsi - abs(selisih)).abs() <= 0.01 * abs(selisih)]
    if len(cocok):
        arah = "terhitung ganda" if selisih > 0 else "hilang"
        return f"fungsi {', '.join(cocok.index)} kemungkinan {arah}"
    return "selisih tidak terjelaskan; periksa berkas sumber"


def cek_total_vs_ringkas(fakta: pd.DataFrame, ringkas: pd.DataFrame, sm: dict) -> pd.DataFrame:
    v = sm["validasi"]
    total = fakta.groupby(["tahun", "kode_pemda"])["nilai_anggaran"].sum().rename("aktual")
    bel = (
        ringkas[ringkas["kode_akun"] == sm["akun_ringkas"]["total_belanja"]]
        .set_index(["tahun", "kode_pemda"])["nilai_anggaran"]
        .rename("harapan")
    )
    per_fungsi = fakta.set_index(["tahun", "kode_pemda", "kode_fungsi"])["nilai_anggaran"]
    j = pd.concat([total, bel], axis=1)
    rows = []
    for (tahun, kode), r in j.iterrows():
        aktual, harapan = r["aktual"], r["harapan"]
        if np.isnan(aktual) or np.isnan(harapan):
            selisih, pct, status = np.nan, np.nan, "GAGAL"
        else:
            selisih = aktual - harapan
            pct = _pct(selisih, harapan)
            status = status_selisih(selisih, pct, v) if np.isfinite(pct) else "GAGAL"
        nf = per_fungsi.loc[(tahun, kode)] if (tahun, kode) in total.index else pd.Series(dtype=float)
        rows.append(
            [tahun, kode, "total_fungsi_vs_ringkas", harapan, aktual, selisih, pct, status, penyebab_total(aktual, harapan, nf, status)]
        )
    return _frame(rows)


def cek_jenis_vs_ringkas(fungsi_standar: pd.DataFrame, ringkas: pd.DataFrame, sm: dict) -> pd.DataFrame:
    """Total per jenis (51-54) di berkas Fungsi vs akun padanan di Ringkasan.
    Hanya baris yang tidak LULUS dicatat per pemda, plus satu ringkasan per tahun."""
    v, padanan = sm["validasi"], sm["validasi"]["padanan_jenis_ringkas"]
    aktual = fungsi_standar.pivot_table(index=["tahun", "kode_pemda"], columns="kode_jenis", values="nilai_anggaran", aggfunc="sum")
    akun = ringkas.pivot_table(index=["tahun", "kode_pemda"], columns="kode_akun", values="nilai_anggaran", aggfunc="sum").fillna(0.0)
    harapan = pd.DataFrame(index=akun.index)
    for jenis, aturan in padanan.items():
        if isinstance(aturan, dict):
            harapan[jenis] = akun[aturan["sisa_dari"]] - akun[aturan["dikurangi"]].sum(axis=1)
        else:
            harapan[jenis] = akun[aturan].sum(axis=1)
    aktual = aktual.reindex(index=harapan.index, columns=harapan.columns).fillna(0.0)
    selisih = aktual - harapan

    rows = []
    for (tahun, kode), s in selisih.iterrows():
        status = {j: status_selisih(s[j], _pct(s[j], harapan.at[(tahun, kode), j]), v) for j in s.index}
        if all(x == "LULUS" for x in status.values()):
            continue
        total_ok = status_selisih(s.sum(), _pct(s.sum(), harapan.loc[(tahun, kode)].sum()), v) == "LULUS"
        for j, st in status.items():
            if st == "LULUS":
                continue
            lawan = [k for k in s.index if k != j and status[k] != "LULUS" and np.sign(s[k]) == -np.sign(s[j])]
            penyebab = (
                f"realokasi antarjenis {j}<->{','.join(lawan)} (total belanja tetap); beda pemetaan jenis Fungsi vs Ringkasan"
                if total_ok and lawan
                else "selisih jenis tidak terjelaskan; periksa berkas sumber"
            )
            # Total tetap cocok -> share fungsi tidak terdampak, cukup PERINGATAN
            st_final = "PERINGATAN" if total_ok else st
            rows.append(
                [
                    tahun,
                    kode,
                    f"jenis_{j}_vs_ringkas",
                    harapan.at[(tahun, kode), j],
                    aktual.at[(tahun, kode), j],
                    s[j],
                    _pct(s[j], harapan.at[(tahun, kode), j]),
                    st_final,
                    penyebab,
                ]
            )
    detail = _frame(rows)
    ringkas_tahun = []
    for t in selisih.index.get_level_values(0).unique():
        n = len(selisih.loc[t])
        n_bad = detail.loc[detail["tahun"] == t, "kode_pemda"].nunique()
        st_t = set(detail.loc[detail["tahun"] == t, "status"])
        status = "GAGAL" if "GAGAL" in st_t else ("PERINGATAN" if st_t else "LULUS")
        ringkas_tahun.append(
            [
                t,
                None,
                "jenis_vs_ringkas_per_tahun",
                float(n),
                float(n - n_bad),
                float(n_bad),
                None,
                status,
                f"{n_bad} pemda dengan selisih jenis" if n_bad else "",
            ]
        )
    return pd.concat([detail, _frame(ringkas_tahun)], ignore_index=True)


def cek_dataset(fakta, share, fungsi_standar, fungsi_long, metadata, crosswalk, sm) -> pd.DataFrame:
    rows = []
    n_aktif = sum(1 for f in sm["fungsi_baku"].values() if f["aktif"])
    for tahun in sorted(fakta["tahun"].unique()):
        f = fakta[fakta["tahun"] == tahun]
        meta = metadata.set_index("tahun").loc[tahun]
        n = f["kode_pemda"].nunique()
        rows.append(
            [
                tahun,
                None,
                "jumlah_pemda_vs_judul",
                meta["jumlah_daerah_tertulis"],
                n,
                n - meta["jumlah_daerah_tertulis"],
                None,
                "LULUS" if n == meta["jumlah_daerah_tertulis"] else "GAGAL",
                meta["tanggal_data"],
            ]
        )

        kurang = (f.groupby("kode_pemda")["kode_fungsi"].nunique() != n_aktif).sum()
        rows.append(
            [tahun, None, "kelengkapan_9_fungsi", float(n), float(n - kurang), float(kurang), None, "LULUS" if kurang == 0 else "GAGAL", ""]
        )

        s = share[share["tahun"] == tahun].groupby("kode_pemda")["share_belanja"].sum()
        dev = float((s - 1).abs().max())
        rows.append([tahun, None, "jumlah_share_sama_dengan_1", 1.0, float(s.min()), dev, None, "LULUS" if dev < 1e-9 else "GAGAL", ""])

        neg = int((fungsi_standar.loc[fungsi_standar["tahun"] == tahun, "nilai_anggaran"] < 0).sum())
        rows.append([tahun, None, "nilai_negatif", 0.0, float(neg), float(neg), None, "LULUS" if neg == 0 else "GAGAL", ""])

        lg = fungsi_long[fungsi_long["tahun"] == tahun]
        if len(lg) == 0:
            rows.append([tahun, None, "wide_vs_long", None, None, None, None, "LEWATI", "sheet Datarow tidak tersedia"])
        else:
            d = (f.groupby("kode_pemda")["nilai_anggaran"].sum() - lg.groupby("kode_pemda")["nilai_anggaran"].sum()).abs()
            maks = float(d.max()) if d.notna().all() else float("inf")
            rows.append(
                [
                    tahun,
                    None,
                    "wide_vs_long",
                    0.0,
                    maks,
                    maks,
                    None,
                    "LULUS" if maks <= 1 else "GAGAL",
                    "" if maks <= 1 else "sheet wide dan Datarow berbeda",
                ]
            )

        harus_ada = crosswalk[(crosswalk["tahun_pertama"] <= tahun) & (crosswalk["tahun_terakhir"] >= tahun)]["kode_pemda"]
        hilang = sorted(set(harus_ada) - set(f["kode_pemda"]))
        rows.append(
            [
                tahun,
                None,
                "cakupan_crosswalk",
                float(len(harus_ada)),
                float(n),
                float(len(hilang)),
                None,
                "LULUS" if not hilang else "GAGAL",
                ",".join(hilang),
            ]
        )

    dup = int(fakta.duplicated(["tahun", "kode_pemda", "kode_fungsi"]).sum())
    rows.append([None, None, "kunci_unik_fakta", 0.0, float(dup), float(dup), None, "LULUS" if dup == 0 else "GAGAL", ""])

    ambang = sm["validasi"]["ambang_nilai_janggal_rp"]
    jg = fungsi_standar[(fungsi_standar["nilai_anggaran"] > 0) & (fungsi_standar["nilai_anggaran"] < ambang)]
    for r in jg.itertuples():
        rows.append(
            [
                r.tahun,
                r.kode_pemda,
                f"nilai_janggal_f{r.kode_fungsi}_j{r.kode_jenis}",
                None,
                r.nilai_anggaran,
                None,
                None,
                "PERINGATAN",
                f"nilai > 0 tetapi < Rp{ambang:,}; dipertahankan (dampak ke share dapat diabaikan)",
            ]
        )
    return _frame(rows)


def validasi(fakta, share, fungsi_standar, ringkas, fungsi_long, metadata, crosswalk, sm) -> pd.DataFrame:
    log = pd.concat(
        [
            cek_dataset(fakta, share, fungsi_standar, fungsi_long, metadata, crosswalk, sm),
            cek_total_vs_ringkas(fakta, ringkas, sm),
            cek_jenis_vs_ringkas(fungsi_standar, ringkas, sm),
        ],
        ignore_index=True,
    )
    log.insert(0, "id", range(1, len(log) + 1))
    log["dijalankan_pada"] = datetime.now(UTC).replace(microsecond=0)
    return log


def ringkasan_log(log: pd.DataFrame) -> str:
    tot = log[log["pemeriksaan"] == "total_fungsi_vs_ringkas"]
    pct = tot["selisih_pct"].abs()
    baris = [
        "Status per pemeriksaan:",
        log.assign(
            grup=log["pemeriksaan"]
            .str.replace(r"^nilai_janggal_.*$", "nilai_janggal", regex=True)
            .str.replace(r"^jenis_\d+_vs_ringkas$", "jenis_vs_ringkas_detail", regex=True)
        )
        .pivot_table(index="grup", columns="status", values="id", aggfunc="count", fill_value=0)
        .to_string(),
        f"\nSebaran |selisih| total fungsi vs Ringkasan (%): median {pct.median():.6f}, p99 {pct.quantile(0.99):.6f}, maks {pct.max():.6f}",
        f"Selisih absolut maks: Rp{tot['selisih_rp'].abs().max():,.2f}",
    ]
    bermasalah = log[log["status"].isin(["GAGAL", "PERINGATAN"]) & log["kode_pemda"].notna()]
    if len(bermasalah):
        baris.append("\nPemda bermasalah (maks 20):")
        baris.append(
            bermasalah[["tahun", "kode_pemda", "pemeriksaan", "selisih_rp", "status", "penyebab_dugaan"]].head(20).to_string(index=False)
        )
    return "\n".join(baris)


def run(fakta, share, fungsi_standar, ringkas, fungsi_long, metadata, crosswalk, sm, out_dir: Path) -> pd.DataFrame:
    log = validasi(fakta, share, fungsi_standar, ringkas, fungsi_long, metadata, crosswalk, sm)
    write_parquet(log, out_dir / OUTPUT)
    return log
