import pytest
from datetime import date
from backend.contracts import (
    Recommendation,
    BudgetChange,
    Interval,
    PolicyDecision,
    OpportunityScore,
    Verdict,
)
from backend.policy.engine import decide

def _sample_rec(
    changes=None,
    confidence=0.85,
    rec_id="REC-TEST-001",
    opportunity_scores=None,
) -> Recommendation:
    if changes is None:
        changes = [
            BudgetChange(campaign_id="camp_01", from_spend=500.0, to_spend=520.0),
            BudgetChange(campaign_id="camp_02", from_spend=500.0, to_spend=480.0),
        ]
    return Recommendation(
        id=rec_id,
        incident_id="INC-001",
        mode="profit",
        changes=changes,
        expected_profit_delta=Interval(low=50.0, mid=100.0, high=150.0),
        constraints_binding=["total_budget_cap"],
        confidence=confidence,
        opportunity_scores=opportunity_scores or [],
    )

def test_dry_run_always_review():
    rec = _sample_rec()
    decision = decide(rec, state={"autonomy_level": "dry_run"})
    assert isinstance(decision, PolicyDecision)
    assert decision.verdict == "REVIEW"
    assert decision.size_factor == 1.0
    assert "dry_run_mode_advisory_only" in decision.reasons

def test_supervised_auto_within_budget():
    # Total shift: |520-500| + |480-500| = 40. Total spend: 1000. Shift pct: 4% <= 10% daily risk budget.
    rec = _sample_rec(confidence=0.80)
    decision = decide(rec, state={"autonomy_level": "supervised", "money_at_risk": 200.0})
    assert isinstance(decision, PolicyDecision)
    assert decision.verdict == "AUTO"
    assert decision.size_factor == 1.0
    assert "within_daily_risk_budget" in decision.reasons

def test_supervised_block_stockout():
    # Recommendation scaling up a stockout campaign
    opp_stockout = OpportunityScore(
        sim_date=date(2024, 6, 16),
        campaign_id="camp_stockout",
        sku="SKU-STOCKOUT",
        forecast_component=10.0,
        curve_component=10.0,
        margin_component=10.0,
        stock_component=0.0,  # Stockout risk (0 stock cover)
        total_score=30.0,
    )
    changes = [
        BudgetChange(campaign_id="camp_stockout", from_spend=200.0, to_spend=250.0),  # Scale up!
    ]
    rec = _sample_rec(changes=changes, confidence=0.85, opportunity_scores=[opp_stockout])
    decision = decide(rec, state={"autonomy_level": "supervised"})
    assert isinstance(decision, PolicyDecision)
    assert decision.verdict == "BLOCK"
    assert decision.size_factor == 0.0
    assert "stockout_sku_scaling_blocked" in decision.reasons

def test_supervised_review_low_confidence():
    rec = _sample_rec(confidence=0.30)
    decision = decide(rec, state={"autonomy_level": "supervised"})
    assert isinstance(decision, PolicyDecision)
    assert decision.verdict == "REVIEW"
    assert "low_confidence" in decision.reasons

def test_full_autopilot_auto():
    rec = _sample_rec(confidence=0.85)
    decision = decide(rec, state={"autonomy_level": "full_autopilot", "money_at_risk": 300.0})
    assert isinstance(decision, PolicyDecision)
    assert decision.verdict == "AUTO"
    assert decision.size_factor == 1.0

def test_policy_returns_valid_contract():
    rec = _sample_rec()
    for level in ["dry_run", "supervised", "full_autopilot"]:
        res = decide(rec, state={"autonomy_level": level})
        assert isinstance(res, PolicyDecision)
        assert res.verdict in ["AUTO", "REVIEW", "BLOCK"]
        assert 0.0 <= res.size_factor <= 1.0
        assert isinstance(res.reasons, list)
        assert len(res.reasons) > 0
