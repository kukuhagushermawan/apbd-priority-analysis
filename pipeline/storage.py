"""Lokasi keluaran, penulisan Parquet, dan manifest hash untuk idempotensi."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pandas as pd

from pipeline.readers import REPO_ROOT

PROCESSED_DIR = REPO_ROOT / "data" / "processed"
MANIFEST_NAME = "_manifest.json"


def write_parquet(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(path, index=False)


def read_parquet(path: Path) -> pd.DataFrame:
    return pd.read_parquet(path)


def hash_files(paths: list[Path]) -> str:
    """Hash isi berkas (urutan stabil). Dipakai untuk melewati tahap yang
    masukan, konfigurasi, dan kodenya tidak berubah."""
    h = hashlib.sha256()
    for p in sorted(Path(x) for x in paths):
        h.update(p.name.encode())
        h.update(p.read_bytes())
    return h.hexdigest()


def load_manifest(out_dir: Path) -> dict:
    path = out_dir / MANIFEST_NAME
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def save_manifest(out_dir: Path, manifest: dict) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / MANIFEST_NAME).write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8")
