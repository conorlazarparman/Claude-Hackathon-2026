"""
Run once before the hackathon to build the CMS rates CSV.

Usage:
  python scripts/download_cms.py

Downloads the Medicare Physician Fee Schedule national rates and formats them
into backend/audit/data/cms_rates.csv with columns: cpt_code, description, facility_rate.

Manual download alternative:
  1. Go to https://www.cms.gov/medicare/physician-fee-schedule/search
  2. Download the "National Payment Amount" file (PFS_national_*.zip)
  3. Place the CSV inside this script's expected path, or edit INPUT_PATH below.

The CMS file typically has columns like:
  HCPCS_CD, MOD, DESCRIPTION, FACILITY_FEE, ...
Adjust column names below if the format changes.
"""

import os
import sys
import zipfile
import tempfile
import urllib.request
import pandas as pd

OUTPUT_PATH = os.path.join(
    os.path.dirname(__file__), "..", "backend", "audit", "data", "cms_rates.csv"
)

# 2024 PFS national rates — update URL if a newer file is available
CMS_URL = (
    "https://www.cms.gov/files/zip/cy2024-medicare-pfs-january-2024-national-payment.zip"
)

COLUMN_ALIASES = {
    "hcpcs_cd": "cpt_code",
    "hcpcs_code": "cpt_code",
    "description": "description",
    "long_description": "description",
    "facility_fee": "facility_rate",
    "facility_payment_amount": "facility_rate",
    "work_rvu": None,  # ignored
}


def find_column(df: pd.DataFrame, aliases: list[str]) -> str | None:
    cols_lower = {c.lower(): c for c in df.columns}
    for a in aliases:
        if a.lower() in cols_lower:
            return cols_lower[a.lower()]
    return None


def process(df: pd.DataFrame) -> pd.DataFrame:
    cpt_col = find_column(df, ["hcpcs_cd", "hcpcs_code", "cpt_code", "code"])
    desc_col = find_column(df, ["description", "long_description", "hcpcs_description"])
    rate_col = find_column(
        df, ["facility_fee", "facility_payment_amount", "fac_fee", "facility_rate"]
    )

    if not cpt_col or not rate_col:
        print(f"Columns found: {list(df.columns)}")
        raise ValueError("Could not identify required columns. Check column names above.")

    if not desc_col:
        df["description"] = df[cpt_col]
        desc_col = "description"

    out = df[[cpt_col, desc_col, rate_col]].copy()
    out.columns = ["cpt_code", "description", "facility_rate"]
    out["cpt_code"] = out["cpt_code"].astype(str).str.strip()
    out["facility_rate"] = pd.to_numeric(out["facility_rate"], errors="coerce")
    out = out.dropna(subset=["facility_rate"])
    out = out[out["facility_rate"] > 0]
    out = out.drop_duplicates(subset=["cpt_code"])
    return out


def main():
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

    # Check for a locally supplied CSV first
    local_csv = os.path.join(os.path.dirname(__file__), "cms_rates_raw.csv")
    if os.path.exists(local_csv):
        print(f"Using local file: {local_csv}")
        df = pd.read_csv(local_csv, dtype=str)
        out = process(df)
        out.to_csv(OUTPUT_PATH, index=False)
        print(f"Saved {len(out)} CPT codes → {OUTPUT_PATH}")
        return

    print(f"Downloading from CMS... (this may take a minute)")
    try:
        with tempfile.TemporaryDirectory() as tmp:
            zip_path = os.path.join(tmp, "pfs.zip")
            urllib.request.urlretrieve(CMS_URL, zip_path)
            with zipfile.ZipFile(zip_path) as z:
                csv_names = [n for n in z.namelist() if n.lower().endswith(".csv")]
                if not csv_names:
                    raise ValueError("No CSV found in zip")
                z.extract(csv_names[0], tmp)
                df = pd.read_csv(os.path.join(tmp, csv_names[0]), dtype=str, low_memory=False)
        out = process(df)
        out.to_csv(OUTPUT_PATH, index=False)
        print(f"Saved {len(out)} CPT codes → {OUTPUT_PATH}")
    except Exception as e:
        print(f"\nDownload failed: {e}")
        print("\nManual fallback:")
        print("  1. Download from https://www.cms.gov/medicare/physician-fee-schedule/search")
        print(f"  2. Save as: {local_csv}")
        print("  3. Re-run this script")
        sys.exit(1)


if __name__ == "__main__":
    main()
