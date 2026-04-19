async def score_anomalies(line_items: list) -> list:
    """
    Score each line item against Medicare rates.
    CRITICAL: billed > 5x Medicare
    ELEVATED: billed > 2x Medicare
    """
    scored = []
    for item in line_items:
        billed = float(item.get("billed_amount") or 0)
        medicare = item.get("medicare_rate")

        flags = []
        potential_savings = 0.0

        if medicare and medicare > 0:
            ratio = billed / medicare

            if ratio > 5:
                flags.append({
                    "type": "CRITICAL",
                    "label": f"{ratio:.1f}× Medicare rate",
                    "law": "CMS Medicare Physician Fee Schedule",
                    "billed": billed,
                    "benchmark": medicare,
                    "delta": round(billed - medicare, 2),
                })
                potential_savings = round(billed - medicare, 2)
            elif ratio > 2:
                flags.append({
                    "type": "ELEVATED",
                    "label": f"{ratio:.1f}× Medicare rate",
                    "law": "CMS Medicare Physician Fee Schedule",
                    "billed": billed,
                    "benchmark": medicare,
                    "delta": round(billed - medicare, 2),
                })
                potential_savings = round(billed - medicare, 2)

        item["flags"] = flags
        item["potential_savings"] = potential_savings
        item["is_flagged"] = len(flags) > 0
        scored.append(item)

    return scored
