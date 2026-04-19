"""
Run once before the hackathon to build the CMS rates CSV.

Usage:
  python scripts/download_cms.py

Takes the Medicare Physician Fee Schedule national rates and formats them
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
    df = df.rename(columns={
        "Unnamed: 0": "cpt_code",
        "Unnamed: 2": "description",
        "FACILITY.1": "facility_total_rvu",
        "CONV": "conversion_factor"
    })

    df["cpt_code"] = df["cpt_code"].astype(str).str.strip()
    df["facility_total_rvu"] = pd.to_numeric(df["facility_total_rvu"], errors="coerce")
    df["conversion_factor"] = pd.to_numeric(df["conversion_factor"], errors="coerce")
    df["facility_rate"] = df["facility_total_rvu"] * df["conversion_factor"]

    out = df[["cpt_code", "description", "facility_rate"]].copy()
    out = out.dropna(subset=["facility_rate"])
    out = out[out["facility_rate"] > 0]
    out = out[out["cpt_code"].str.match(r'^[0-9A-Z]{4,5}$', na=False)]  # filter out header junk
    out = out.drop_duplicates(subset=["cpt_code"])
    return out


def main():
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

    # Check for a locally supplied CSV first
    local_csv = os.path.join(os.path.dirname(__file__), "cms_rates_raw.csv")
    if os.path.exists(local_csv):
        print(f"Using local file: {local_csv}")
        df = pd.read_csv(local_csv, dtype=str, skiprows=8) #may need to change this line depending on the format of the CSV      
        out = process(df)
        out.to_csv(OUTPUT_PATH, index=False)
        print(f"Saved {len(out)} CPT codes → {OUTPUT_PATH}")
        return

    #need to create a way to reliably fetch this CSV. Doesn't seem like it's under a unified link.
    # print(f"Downloading from CMS... (this may take a minute)")
    # try:
    #     with tempfile.TemporaryDirectory() as tmp:
    #         zip_path = os.path.join(tmp, "pfs.zip")
    #         urllib.request.urlretrieve(CMS_URL, zip_path)
    #         with zipfile.ZipFile(zip_path) as z:
    #             csv_names = [n for n in z.namelist() if n.lower().endswith(".csv")]
    #             if not csv_names:
    #                 raise ValueError("No CSV found in zip")
    #             z.extract(csv_names[0], tmp)
    #             df = pd.read_csv(os.path.join(tmp, csv_names[0]), dtype=str, low_memory=False)
    #     out = process(df)
    #     out.to_csv(OUTPUT_PATH, index=False)
    #     print(f"Saved {len(out)} CPT codes → {OUTPUT_PATH}")
    # except Exception as e:
    #     print(f"\nDownload failed: {e}")
    #     print("\nManual fallback:")
    #     print("  1. Download from https://www.cms.gov/medicare/physician-fee-schedule/search")
    #     print(f"  2. Save as: {local_csv}")
    #     print("  3. Re-run this script")
    #     sys.exit(1)


if __name__ == "__main__":
    main()
