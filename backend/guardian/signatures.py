from typing import Tuple, List
from backend.contracts import EvidenceItem
from backend.contracts.enums import Cause

def check_cause_signature(cause: Cause, evidence: List[EvidenceItem]) -> Tuple[bool, str]:
    if cause == Cause.CREATIVE_FATIGUE:
        # CTR decay, OR frequency > 5.0, OR creative age > 30
        for e in evidence:
            v = e.values
            if v.get("ctr") is not None and v.get("ctr") < 0.05: # Mock threshold or if there's a drop
                return True, "Signature validated: CTR decay with elevated frequency/age"
            # In compare_periods, we might have current_ctr, past_ctr
            if v.get("current_ctr", 1) < v.get("past_ctr", 0):
                return True, "Signature validated: CTR decay with elevated frequency/age"
            if v.get("avg_frequency", 0) > 5.0 or v.get("age_days", 0) > 30:
                return True, "Signature validated: CTR decay with elevated frequency/age"
        return False, "Failed signature: no CTR drop or high frequency in evidence"
        
    elif cause == Cause.STOCKOUT:
        # days_of_cover < 2.0 OR stock_units <= 0
        for e in evidence:
            v = e.values
            if "days_of_cover" in v and v["days_of_cover"] < 2.0:
                return True, "Signature validated: critically low stock/days of cover"
            if "stock_units" in v and v["stock_units"] <= 0:
                return True, "Signature validated: critically low stock/days of cover"
        return False, "Failed signature: inventory levels healthy"
        
    elif cause == Cause.TRACKING_BREAK:
        # pixel/ad conversions drop > 50% while store transactions steady
        for e in evidence:
            v = e.values
            # From tracking_health_check discrepancy
            pixel = v.get("pixel_purchases")
            actual = v.get("actual_transactions")
            if pixel is not None and actual is not None and actual > 0:
                if pixel / actual < 0.5:
                    return True, "Signature validated: severe tracking discrepancy"
        return False, "Failed signature: no tracking divergence detected"
        
    elif cause == Cause.MARGIN_SQUEEZE:
        # margin_pct < 20.0% OR COGS increase OR discount rate > 25%
        for e in evidence:
            v = e.values
            if "margin" in v and v["margin"] < 20.0:
                return True, "Signature validated: margin compression detected"
            if "discount" in v and v["discount"] > 25.0:
                return True, "Signature validated: margin compression detected"
        return False, "Failed signature: margins remain within target"
        
    else:
        return True, "Baseline signature accepted"
