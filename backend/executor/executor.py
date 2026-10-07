from datetime import datetime
from backend.contracts import PolicyDecision, Recommendation, Action, BudgetChange
from backend.executor.killswitch import killswitch
from backend.executor.mock_adapter import default_adapter
from backend.executor.rollback import record_snapshot

def apply(decision: PolicyDecision, recommendation: Recommendation, adapter=None) -> Action:
    ad = adapter or default_adapter
    action_id = f"ACT-{recommendation.id.split('-')[-1]}"

    if killswitch.is_active():
        return Action(
            id=action_id,
            recommendation_id=recommendation.id,
            status="blocked",
            rollout_pct=0.0,
            rollback_guard={"reason": "killswitch_active"},
            changes=[],
            created_at=datetime.utcnow()
        )

    verdict = decision.verdict
    changes = recommendation.changes

    if verdict == "BLOCK":
        return Action(
            id=action_id,
            recommendation_id=recommendation.id,
            status="blocked",
            rollout_pct=0.0,
            rollback_guard={"reasons": decision.reasons},
            changes=changes,
            created_at=datetime.utcnow()
        )

    if verdict == "REVIEW":
        return Action(
            id=action_id,
            recommendation_id=recommendation.id,
            status="pending",
            rollout_pct=0.0,
            rollback_guard={"reasons": decision.reasons},
            changes=changes,
            created_at=datetime.utcnow()
        )

    # AUTO verdict -> 50% staged rollout
    record_snapshot(action_id, ad)
    applied_changes = []
    size = decision.size_factor or 1.0

    for chg in changes:
        old_spend = ad.get_spend(chg.campaign_id)
        delta = (chg.to_spend - chg.from_spend) * size * 0.5  # 50% staged rollout
        new_spend = old_spend + delta
        ad.set_spend(chg.campaign_id, new_spend)
        applied_changes.append(BudgetChange(
            campaign_id=chg.campaign_id,
            from_spend=old_spend,
            to_spend=new_spend
        ))

    return Action(
        id=action_id,
        recommendation_id=recommendation.id,
        status="rolling_out",
        rollout_pct=50.0 * size,
        rollback_guard={"metric": "roas", "threshold": 3.0, "window_days": 2},
        changes=applied_changes,
        created_at=datetime.utcnow()
    )
