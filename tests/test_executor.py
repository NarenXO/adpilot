from backend.contracts import PolicyDecision, Recommendation, BudgetChange, Interval
from backend.executor.mock_adapter import MockAdAdapter
from backend.executor.killswitch import killswitch
from backend.executor.rollback import trigger_rollback
from backend.executor.executor import apply

def test_executor_auto_rollout_and_rollback():
    ad = MockAdAdapter({"camp_meta_03": 500.0, "camp_meta_05": 300.0})
    rec = Recommendation(
        id="REC-001",
        incident_id="INC-001",
        mode="profit",
        changes=[
            BudgetChange(campaign_id="camp_meta_03", from_spend=500.0, to_spend=325.0),
            BudgetChange(campaign_id="camp_meta_05", from_spend=300.0, to_spend=475.0)
        ],
        expected_profit_delta=Interval(low=45, mid=120, high=210),
        constraints_binding=["max_change_30pct"],
        confidence=0.8
    )
    dec = PolicyDecision(recommendation_id="REC-001", verdict="AUTO", reasons=["safe"], size_factor=1.0)

    act = apply(dec, rec, adapter=ad)
    assert act.status == "rolling_out"
    assert act.rollout_pct == 50.0

    # Verify staged spend changes (50% of -175 = -87.5 => 412.5)
    assert ad.get_spend("camp_meta_03") == 412.5

    # Test Rollback
    restored = trigger_rollback(act.id, adapter=ad)
    assert restored is True
    assert ad.get_spend("camp_meta_03") == 500.0

def test_executor_killswitch():
    ad = MockAdAdapter()
    rec = Recommendation(
        id="REC-002",
        incident_id="INC-001",
        mode="profit",
        changes=[],
        expected_profit_delta=Interval(low=10, mid=20, high=30),
        constraints_binding=[],
        confidence=0.9
    )
    dec = PolicyDecision(recommendation_id="REC-002", verdict="AUTO", reasons=[], size_factor=1.0)

    killswitch.set_active(True)
    act = apply(dec, rec, adapter=ad)
    assert act.status == "blocked"
    killswitch.set_active(False)
