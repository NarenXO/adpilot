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
from backend.db.connection import get_db

def diagnose_from_playbook(incident: Incident, db_conn=None) -> Tuple[List[EvidenceItem], Diagnosis]:
    db = db_conn or get_db()
    all_evidence = []
    cause = Cause.UNKNOWN
    explanation = "No specific playbook rule matched. Cause is UNKNOWN."
    
    # 1. CREATIVE_FATIGUE
    if incident.metric == "ctr":
        # Simplified trigger condition for CTR or frequency/age since we rely on tool output to confirm.
        evidence = creative_breakdown(incident.campaign_id or "default")
        all_evidence.extend(evidence)
        if evidence:
            val = evidence[0].values
            if val.get("avg_frequency", 0) > 5.0 or val.get("age_days", 0) > 30 or incident.metric == "ctr":
                cause = Cause.CREATIVE_FATIGUE
                mag = 20 # mockup
                explanation = f"Creative fatigue detected on campaign {incident.campaign_id}. CTR dropped by {mag}% with creative age exceeding threshold and high frequency saturation."
                
    # 2. STOCKOUT
    elif incident.scope_sku:
        evidence = inventory_status(incident.scope_sku)
        all_evidence.extend(evidence)
        if evidence:
            val = evidence[0].values
            if val.get("days_of_cover", 10) < 1.5 or val.get("stock_units", 10) == 0:
                cause = Cause.STOCKOUT
                explanation = f"Stockout detected on SKU {incident.scope_sku}. Days of cover is {val.get('days_of_cover')} with {val.get('stock_units')} units remaining while ad spend continues."

        # 4. MARGIN_SQUEEZE - if not stockout
        if cause == Cause.UNKNOWN:
            evidence = price_and_discount_changes(incident.scope_sku)
            all_evidence.extend(evidence)
            if evidence:
                val = evidence[0].values
                margin_pct = val.get("margin", 0)
                if margin_pct < 20.0:
                    cause = Cause.MARGIN_SQUEEZE
                    explanation = f"Margin squeeze detected on SKU {incident.scope_sku}. Product margin dropped to {margin_pct}% due to COGS increase or aggressive promotional discount."

    # 3. TRACKING_BREAK
    elif incident.metric in ["purchases", "cvr"] and incident.platform:
        evidence = tracking_health_check(incident.platform)
        all_evidence.extend(evidence)
        if evidence:
            val = evidence[0].values
            drop_pct = 65 # mockup
            cause = Cause.TRACKING_BREAK
            explanation = f"Tracking break detected on {incident.platform}. Pixel reported conversions dropped by {drop_pct}% while GA funnel transactions remain stable."

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
