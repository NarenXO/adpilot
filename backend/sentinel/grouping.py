import uuid
from datetime import date
from typing import List, Dict, Optional, Any
import pandas as pd

from backend.contracts import Incident, Scope

DECOY_TYPES = {"HOLIDAY", "PLANNED_PROMO", "HOLIDAY_DEMAND"}

def _to_date(val: Any) -> Optional[date]:
    if val is None or pd.isna(val):
        return None
    if isinstance(val, date):
        return val
    try:
        return pd.to_datetime(val).date()
    except Exception:
        return None

def is_decoy_event(
    sim_date: date,
    events_df: Optional[pd.DataFrame],
    alert: Optional[Dict] = None,
) -> bool:
    """
    Check external_events table for HOLIDAY or PLANNED_PROMO.
    Decoys MUST NOT trigger alerts.
    """
    if alert is not None and alert.get("is_decoy") is True:
        return True

    if events_df is None or events_df.empty:
        return False

    events = events_df.copy()
    if "date" not in events.columns:
        return False

    events["_dt"] = pd.to_datetime(events["date"]).dt.date
    target_d = _to_date(sim_date)
    if target_d is None:
        target_d = events["_dt"].max()

    sim_events = events[events["_dt"] == target_d]
    if sim_events.empty:
        return False

    type_col = "type" if "type" in sim_events.columns else ("event_type" if "event_type" in sim_events.columns else None)
    if not type_col:
        return False

    for _, row in sim_events.iterrows():
        t = str(row[type_col]).strip().upper()
        if t in DECOY_TYPES or "HOLIDAY" in t or "PROMO" in t:
            return True

    return False

def group_and_rank_incidents(
    raw_alerts: List[Dict],
    sim_date: date,
    events_df: Optional[pd.DataFrame] = None,
) -> List[Incident]:
    """
    1. Filter out decoy events.
    2. Deduplicate alerts targeting the same entity.
    3. Calculate money_at_risk and severity = money_at_risk * confidence.
    4. Return a list of validated Incident objects sorted descending by severity.
    """
    target_d = _to_date(sim_date) or date.today()
    
    # 1. Check if the date itself is an active decoy event (holiday / promo)
    if events_df is not None and is_decoy_event(target_d, events_df):
        return []

    # Filter individual alerts against decoys
    surviving_alerts: List[Dict] = []
    for alert in raw_alerts:
        alert_d = _to_date(alert.get("sim_date")) or target_d
        if is_decoy_event(alert_d, events_df, alert):
            continue
        surviving_alerts.append(alert)

    if not surviving_alerts:
        return []

    # 2 & 3. Deduplicate alerts targeting the same entity & calculate severity
    entity_map: Dict[tuple, Dict[str, Any]] = {}

    for alert in surviving_alerts:
        raw_scope = alert.get("scope")
        if isinstance(raw_scope, Scope):
            scope = raw_scope
        elif isinstance(raw_scope, dict):
            scope = Scope(**raw_scope)
        else:
            scope = Scope()

        # Entity identification
        if any([scope.platform, scope.campaign_id, scope.sku, scope.creative_id]):
            entity_key = (scope.platform, scope.campaign_id, scope.sku, scope.creative_id)
        else:
            entity_key = (alert.get("metric", "unknown"),)

        daily_spend = float(alert.get("spend") or alert.get("daily_spend") or 0.0)
        magnitude_pct = float(alert.get("magnitude_pct", 0.0))
        confidence = float(alert.get("confidence", 0.0))

        # Severity formula strictly:
        # money_at_risk = daily_spend * (magnitude_pct / 100)
        # severity = money_at_risk * confidence
        money_at_risk = round(daily_spend * (magnitude_pct / 100.0), 2)
        severity = round(money_at_risk * confidence, 2)

        prepared = {
            "id": alert.get("id"),
            "sim_date": target_d,
            "metric": str(alert.get("metric", "unknown")),
            "scope": scope,
            "direction": alert.get("direction", "down"),
            "magnitude_pct": magnitude_pct,
            "detector": str(alert.get("detector", "sentinel")),
            "confidence": confidence,
            "money_at_risk": money_at_risk,
            "severity": severity,
            "status": alert.get("status", "open"),
        }

        if entity_key not in entity_map:
            entity_map[entity_key] = prepared
        else:
            # Keep higher severity alert for the entity
            if severity > entity_map[entity_key]["severity"]:
                entity_map[entity_key] = prepared
            elif severity == entity_map[entity_key]["severity"] and confidence > entity_map[entity_key]["confidence"]:
                entity_map[entity_key] = prepared

    # 4. Create Incident objects
    incidents: List[Incident] = []
    for idx, item in enumerate(entity_map.values(), 1):
        inc_id = item["id"] or f"INC-{idx:03d}"
        inc = Incident(
            id=inc_id,
            sim_date=item["sim_date"],
            metric=item["metric"],
            scope=item["scope"],
            direction=item["direction"],
            magnitude_pct=item["magnitude_pct"],
            detector=item["detector"],
            confidence=item["confidence"],
            money_at_risk=item["money_at_risk"],
            severity=item["severity"],
            status=item["status"],
        )
        incidents.append(inc)

    # Sort descending by severity
    incidents.sort(key=lambda inc: (inc.severity, inc.money_at_risk, inc.confidence), reverse=True)

    return incidents
