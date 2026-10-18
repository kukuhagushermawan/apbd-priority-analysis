"""Langkah 4 — muat hasil pipeline ke PostgreSQL untuk dashboard.

Jalankan: python -m pipeline.langkah4_muat_db
Butuh DATABASE_URL (variabel lingkungan atau web/.env) dan tabel yang sudah
dibuat oleh Prisma (cd web && npx prisma db push). Isi tabel lama diganti.
"""

import os
import re
import sys

import numpy as np
import pandas as pd
import psycopg

from pipeline.langkah1_bersihkan import CONFIG, CROSSWALK, FOLDER, OUT

GRUP_GRAFIK = {"01": "01", "04": "04", "06": "06", "07": "07", "10": "10"}  # sisanya -> LN (Lainnya)


def database_url() -> str:
    if os.environ.get("DATABASE_URL"):
        return os.environ["DATABASE_URL"]
    env = (FOLDER.parent / "web" / ".env").read_text(encoding="utf-8")
    return re.search(r'^DATABASE_URL="?([^"\n]+)"?', env, re.M).group(1)


def siapkan_tabel() -> dict[str, pd.DataFrame]:
    baca = lambda nama: pd.read_parquet(OUT / f"{nama}.parquet")  # noqa: E731
    cw = pd.read_csv(CROSSWALK, dtype=str, keep_default_na=False)
    nama = cw.set_index("kode_pemda")["nama_pemda"]
    dim_pemda = cw.assign(
        nama_provinsi=cw["provinsi_induk"].map(nama),
        kode_2022=cw["kode_2022"].replace("", None),
        panel_seimbang=cw["panel_seimbang"] == "True",
    )
    dim_fungsi = pd.DataFrame(
        [
            {"kode_fungsi": k, "nama_fungsi": v["nama"], "aktif": k not in ("02", "09"), "grup_grafik": GRUP_GRAFIK.get(k, "LN")}
            for k, v in CONFIG["fungsi"].items()
        ]
    )
    fakta = baca("fakta_anggaran")
    return {
        "dim_pemda": dim_pemda[["kode_pemda", "nama_pemda", "tingkat", "provinsi_induk", "nama_provinsi", "kode_2022", "panel_seimbang"]],
        "dim_fungsi": dim_fungsi,
        "fakta_anggaran": fakta[["tahun", "kode_pemda", "kode_fungsi", "provinsi_induk", "nilai_anggaran", "total_belanja"]],
        "share_fungsi": baca("share_fungsi").drop(columns="tingkat"),
        "tren_fungsi": baca("tren_fungsi"),
        "ips_pergeseran": baca("ips_pergeseran").drop(columns="tingkat"),
        "klaster": baca("klaster"),
        "klaster_centroid": baca("klaster_centroid"),
        "proyeksi": baca("proyeksi").drop(columns="tingkat"),
        "metrik_backtest": baca("metrik_backtest"),
        "log_validasi": baca("log_validasi"),
    }


def main() -> int:
    tabel = siapkan_tabel()
    with psycopg.connect(database_url()) as conn, conn.cursor() as cur:
        cur.execute("TRUNCATE " + ", ".join(tabel) + " RESTART IDENTITY CASCADE")
        for nama, df in tabel.items():  # dimensi lebih dulu (urutan dict)
            df = df.astype(object).where(df.notna(), None)
            sql = f"INSERT INTO {nama} ({', '.join(df.columns)}) VALUES ({', '.join(['%s'] * df.shape[1])})"
            cur.executemany(sql, [[v.item() if isinstance(v, np.generic) else v for v in baris] for baris in df.itertuples(index=False)])
            print(f"{nama:18s} {len(df):>7,} baris")
    return 0


if __name__ == "__main__":
    sys.exit(main())
