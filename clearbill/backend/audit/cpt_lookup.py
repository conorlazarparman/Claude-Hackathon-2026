import pandas as pd
import os

_cms_df: pd.DataFrame | None = None
_cms_index: dict | None = None


def _load_cms():
    global _cms_df, _cms_index
    if _cms_df is None:
        data_path = os.path.join(os.path.dirname(__file__), "data", "cms_rates.csv")
        if not os.path.exists(data_path):
            _cms_df = pd.DataFrame(columns=["cpt_code", "description", "facility_rate"])
            _cms_index = {}
            return
        _cms_df = pd.read_csv(data_path, dtype={"cpt_code": str})
        _cms_df["cpt_code"] = _cms_df["cpt_code"].str.strip()
        _cms_df["description_lower"] = _cms_df["description"].str.lower()
        _cms_index = dict(zip(_cms_df["cpt_code"], _cms_df.index))


async def lookup_cpt_codes(line_items: list) -> list:
    """
    Enrich each line item with Medicare rate via CPT code lookup.
    Tries exact match first, then keyword search on description.
    """
    _load_cms()
    enriched = []

    for item in line_items:
        cpt_raw = str(item.get("cpt_code_raw") or "").strip()
        matched_row = None
        match_confidence = 0.0

        # Exact match on CPT code
        if cpt_raw and cpt_raw in _cms_index:
            matched_row = _cms_df.iloc[_cms_index[cpt_raw]]
            match_confidence = 1.0
        else:
            # Keyword fallback: search description column
            desc_lower = item.get("description", "").lower()
            if desc_lower and _cms_df is not None and len(_cms_df) > 0:
                mask = _cms_df["description_lower"].str.contains(
                    desc_lower[:30], regex=False, na=False
                )
                hits = _cms_df[mask]
                if not hits.empty:
                    matched_row = hits.iloc[0]
                    match_confidence = 0.7

        if matched_row is not None:
            item["cpt_code_matched"] = str(matched_row["cpt_code"])
            item["cpt_description"] = matched_row["description"]
            item["medicare_rate"] = float(matched_row["facility_rate"])
            item["match_confidence"] = match_confidence
        else:
            item["cpt_code_matched"] = cpt_raw or None
            item["cpt_description"] = None
            item["medicare_rate"] = None
            item["match_confidence"] = 0.0

        enriched.append(item)

    return enriched
