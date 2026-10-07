from typing import Tuple, List
from backend.contracts import EvidenceItem
from backend.contracts.enums import Cause

def check_cause_signature(cause: Cause, evidence: List[EvidenceItem]) -> Tuple[bool, str]:
    # Accumulate state from all evidence items
    v_agg = {}
    for e in evidence:
        v_agg.update(e.values)
        
    if cause == Cause.CREATIVE_FATIGUE:
        # CTR dropped (>15% drop) AND (frequency > 5.0 OR creative age > 30 days) AND spend remained active.
        ctr_drop = v_agg.get("ctr_drop_pct", 0.0)
        # Check current/past ctr if explicit drop pct not present
        if ctr_drop == 0.0 and v_agg.get("past_ctr", 0) > 0:
            ctr_drop = (v_agg["past_ctr"] - v_agg.get("current_ctr", 0)) / v_agg["past_ctr"] * 100.0
            
        freq = v_agg.get("avg_frequency", v_agg.get("frequency", 0.0))
        age = v_agg.get("age_days", 0)
        spend = v_agg.get("spend", v_agg.get("total_spend", v_agg.get("current_spend", 0.0)))
        
        if ctr_drop > 15.0 and (freq > 5.0 or age > 30) and spend > 0:
            return True, "Signature validated: CTR decay with elevated frequency/age"
        return False, "Failed signature: no CTR drop or high frequency in evidence"
        
    elif cause == Cause.STOCKOUT:
        # days_of_cover < 1.5 OR stock_units <= 0 while ad spend was active (>0)
        days = v_agg.get("days_of_cover", 999.0)
        stock = v_agg.get("stock_units", 999)
        spend = v_agg.get("spend", v_agg.get("total_spend", v_agg.get("current_spend", 0.0)))
        
        if (days < 1.5 or stock <= 0) and spend > 0:
            return True, "Signature validated: critically low stock/days of cover"
        return False, "Failed signature: inventory levels healthy or spend inactive"
        
    elif cause == Cause.TRACKING_BREAK:
        # Pixel conversions dropped (>50% drop or discrepancy > 40%) while store transactions remain normal.
        conv_drop = v_agg.get("conversion_drop", 0.0)
        pixel = v_agg.get("pixel_purchases", 0)
        actual = v_agg.get("actual_transactions", 0)
        
        discrepancy = 0.0
        if actual > 0:
            discrepancy = abs(actual - pixel) / actual * 100.0
            
        # "store transactions remain normal" means actual > 0
        if (conv_drop > 50.0 or discrepancy > 40.0) and actual > 0:
            return True, "Signature validated: severe tracking discrepancy"
        return False, "Failed signature: no tracking divergence detected"
        
    elif cause == Cause.MARGIN_SQUEEZE:
        # margin_pct < 20.0% OR COGS increased OR promotional discount spiked (>25%)
        margin = v_agg.get("margin", 999.0)
        cogs_increase = v_agg.get("cogs_increase", 0.0)
        discount = v_agg.get("discount", 0.0)
        
        if margin < 20.0 or cogs_increase > 0 or discount > 25.0:
            return True, "Signature validated: margin compression detected"
        return False, "Failed signature: margins remain within target"
        
    else:
        return True, "Baseline signature accepted"
