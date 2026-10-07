from typing import Tuple, List

from backend.contracts import Incident, Diagnosis, EvidenceItem
from backend.contracts.enums import Cause
from backend.investigator.tools import (
    compare_periods,
    funnel_breakdown,
    creative_breakdown,
    inventory_status,
    price_and_discount_changes,
    platform_split,
    tracking_health_check,
    recall_similar_incidents
)
from backend.db.connection import get_connection as get_db

def diagnose_from_playbook(incident: Incident, db_conn=None) -> Tuple[List[EvidenceItem], Diagnosis]:
    db = db_conn or get_db()
    all_evidence = []
    cause = Cause.UNKNOWN
    explanation = "No specific playbook rule matched. Cause is UNKNOWN."
    
    # 1. CREATIVE_FATIGUE
    if incident.metric == "ctr":
        evidence = creative_breakdown(incident.campaign_id or "default")
        all_evidence.extend(evidence)
        # also get spend to check active spend
        perf_evidence = compare_periods(incident.id)
        all_evidence.extend(perf_evidence)
        
        if evidence:
            v_agg = {}
            for e in all_evidence: v_agg.update(e.values)
            
            freq = v_agg.get("avg_frequency", v_agg.get("frequency", 0.0))
            age = v_agg.get("age_days", 0)
            spend = v_agg.get("spend", v_agg.get("total_spend", v_agg.get("current_spend", 0.0)))
            
            ctr_drop = 0.0
            if v_agg.get("past_ctr", 0) > 0:
                ctr_drop = (v_agg["past_ctr"] - v_agg.get("current_ctr", 0)) / v_agg["past_ctr"] * 100.0
            
            # Since playbook is an inference engine, it applies rules directly
            if ctr_drop > 15.0 and (freq > 5.0 or age > 30) and spend > 0:
                cause = Cause.CREATIVE_FATIGUE
                explanation = f"Creative fatigue detected on campaign {incident.campaign_id}. CTR dropped by {ctr_drop:.1f}% with creative age exceeding threshold and high frequency saturation."
                
    # 2. STOCKOUT
    elif incident.scope_sku:
        evidence = inventory_status(incident.scope_sku)
        all_evidence.extend(evidence)
        perf_evidence = compare_periods(incident.id)
        all_evidence.extend(perf_evidence)
        
        if evidence:
            v_agg = {}
            for e in all_evidence: v_agg.update(e.values)
            
            days = v_agg.get("days_of_cover", 999.0)
            stock = v_agg.get("stock_units", 999)
            spend = v_agg.get("spend", v_agg.get("total_spend", v_agg.get("current_spend", 0.0)))
            
            if (days < 1.5 or stock <= 0) and spend > 0:
                cause = Cause.STOCKOUT
                explanation = f"Stockout detected on SKU {incident.scope_sku}. Days of cover is {days} with {stock} units remaining while ad spend continues."

        # 4. MARGIN_SQUEEZE - if not stockout
        if cause == Cause.UNKNOWN:
            evidence = price_and_discount_changes(incident.scope_sku)
            all_evidence.extend(evidence)
            if evidence:
                v_agg = {}
                for e in evidence: v_agg.update(e.values)
                margin_pct = v_agg.get("margin", 999.0)
                cogs_inc = v_agg.get("cogs_increase", 0.0)
                discount = v_agg.get("discount", 0.0)
                
                if margin_pct < 20.0 or cogs_inc > 0 or discount > 25.0:
                    cause = Cause.MARGIN_SQUEEZE
                    explanation = f"Margin squeeze detected on SKU {incident.scope_sku}. Product margin dropped to {margin_pct}% due to COGS increase or aggressive promotional discount."

    # 3. TRACKING_BREAK
    elif incident.metric in ["purchases", "cvr"] and incident.platform:
        evidence = tracking_health_check(incident.platform)
        all_evidence.extend(evidence)
        
        if evidence:
            v_agg = {}
            for e in all_evidence: v_agg.update(e.values)
            
            pixel = v_agg.get("pixel_purchases", 0)
            actual = v_agg.get("actual_transactions", 0)
            conv_drop = v_agg.get("conversion_drop", 0.0)
            
            discrepancy = 0.0
            if actual > 0:
                discrepancy = abs(actual - pixel) / actual * 100.0
                
            if (conv_drop > 50.0 or discrepancy > 40.0) and actual > 0:
                cause = Cause.TRACKING_BREAK
                explanation = f"Tracking break detected on {incident.platform}. Pixel reported conversions dropped significantly, showing a {discrepancy:.1f}% discrepancy while GA funnel transactions remain stable."

    if cause == Cause.UNKNOWN:
        # Collect baseline evidence
        evidence = compare_periods(incident.id)
        all_evidence.extend(evidence)

    diagnosis = Diagnosis(
        cause=cause,
        source="playbook",
        evidence_ids=[e.id for e in all_evidence],
        explanation=explanation
    )
    
    return all_evidence, diagnosis
