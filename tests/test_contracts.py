from datetime import date
from backend.contracts.schemas import Incident, Scope, AppState, RiskBudget, KPIs
from backend.contracts.enums import Cause

def test_contracts_sample():
    inc = Incident(
        id="INC-001",
        sim_date=date(2024, 6, 15),
        metric="ctr",
        scope=Scope(platform="meta", sku="SKU-001"),
        direction="down",
        magnitude_pct=35.2,
        detector="ewma",
        confidence=0.9,
        money_at_risk=300.0,
        severity=270.0,
        status="open"
    )
    assert inc.id == "INC-001"
    assert Cause.CREATIVE_FATIGUE == "CREATIVE_FATIGUE"
