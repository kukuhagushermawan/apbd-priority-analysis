from __future__ import annotations

import pytest

from pipeline.readers import RAW_DIR, load_schema_map


@pytest.fixture(scope="session")
def sm():
    return load_schema_map()


@pytest.fixture(scope="session")
def out_dir(tmp_path_factory):
    return tmp_path_factory.mktemp("processed")


@pytest.fixture(scope="session")
def hasil(out_dir):
    """Pipeline penuh atas data asli di data/raw (dilewati bila data tidak ada)."""
    if not any(RAW_DIR.glob("*/*.xlsx")):
        pytest.skip("data/raw kosong")
    from pipeline.run import jalankan

    return jalankan(out_dir=out_dir, force=True, verbose=False)
