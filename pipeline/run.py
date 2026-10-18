"""Jalankan seluruh pipeline: python -m pipeline.run

  Langkah 1  bersihkan  xlsx DJPK -> tabel baku + share + validasi
  Langkah 2  analisis   Δshare, tren, IPS, klaster
  Langkah 3  prediksi   proyeksi 2027-2028 + backtest

Setiap langkah menimpa hasil sebelumnya di data/processed/, jadi aman
dijalankan ulang kapan saja.
"""

import sys

from pipeline import langkah1_bersihkan, langkah2_analisis, langkah3_prediksi


def main() -> int:
    for nama, langkah in [("1 bersihkan", langkah1_bersihkan), ("2 analisis", langkah2_analisis), ("3 prediksi", langkah3_prediksi)]:
        print(f"\n=== Langkah {nama} ===")
        if langkah.main() != 0:
            print(f"Berhenti: langkah {nama} gagal.")
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
