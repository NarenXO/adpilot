import logging
from pathlib import Path
from typing import Any
import yaml

from backend.contracts import PolicyDecision, Recommendation, Verdict

logger = logging.getLogger(__name__)

class IterablePolicyDecision(PolicyDecision):
    """
    Subclass of PolicyDecision supporting both single instance access
    and single-element iteration (for orchestrator tick compatibility).
    """
    def __iter__(self):
        yield self

def _load_policy_yaml() -> dict[str, Any]:
    """Reads policy.yaml from project root. Falls back gracefully if missing or invalid."""
    policy_path = Path(__file__).resolve().parent.parent.parent / "policy.yaml"
    if policy_path.exists():
        try:
            with open(policy_path, "r", encoding="utf-8") as f:
                content = yaml.safe_load(f)
                if isinstance(content, dict):
                    return content
        except Exception as e:
            logger.warning(f"Error reading policy.yaml: {e}")
            
    # Default fallback policy settings
    return {
        "autonomy_level": "supervised",
        "daily_risk_budget_pct": 10.0,
        "max_budget_change_pct": 30.0,
        "min_campaign_spend": 50.0,
        "min_days_of_cover": 7.0,
        "verdicts": {
            "block_if_stockout": True,
            "block_if_margin_below": 15.0,
            "review_if_confidence_below": 0.6,
            "review_if_money_at_risk_above": 500.0,
        },
    }

def decide(
    recommendation: Recommendation,
    state: dict | Any = None,
) -> PolicyDecision:
    """
    Evaluates recommendation against policy rules in policy.yaml and state context.
    Produces a PolicyDecision contract ('AUTO' | 'REVIEW' | 'BLOCK').
    """
    try:
        policy = _load_policy_yaml()
        
        # 1. Determine autonomy level
        autonomy_level = None
        if state is not None:
            if isinstance(state, dict):
                autonomy_level = state.get("autonomy_level")
            elif hasattr(state, "autonomy_level"):
                autonomy_level = getattr(state, "autonomy_level")

        if not autonomy_level:
            autonomy_level = policy.get("autonomy_level", "supervised")

        rec_id = getattr(recommendation, "id", "REC-001")
        confidence = float(getattr(recommendation, "confidence", 0.0))
        changes = getattr(recommendation, "changes", [])

        # Money at risk evaluation
        money_at_risk = 0.0
        if state is not None:
            if isinstance(state, dict):
                money_at_risk = float(state.get("money_at_risk", 0.0))
            elif hasattr(state, "money_at_risk"):
                money_at_risk = float(getattr(state, "money_at_risk", 0.0))

        # Check stockout scale-up violations
        stockout_campaigns = set()
        if isinstance(state, dict):
            stockout_campaigns.update(state.get("stockout_campaigns", []))
            if state.get("stockout_sku"):
                stockout_campaigns.add(state.get("stockout_sku"))

        # Check from opportunity_scores if available
        opp_scores = getattr(recommendation, "opportunity_scores", [])
        for opp in opp_scores:
            if getattr(opp, "stock_component", 25.0) == 0.0:
                stockout_campaigns.add(getattr(opp, "campaign_id", ""))
                stockout_campaigns.add(getattr(opp, "sku", ""))

        scales_stockout = False
        for ch in changes:
            to_s = getattr(ch, "to_spend", 0.0)
            from_s = getattr(ch, "from_spend", 0.0)
            camp_id = getattr(ch, "campaign_id", "")
            
            # If scaling up a known stockout item or flag set
            if to_s > from_s:
                if (camp_id in stockout_campaigns or 
                    "stockout" in camp_id.lower() or 
                    (isinstance(state, dict) and state.get("stockout_scaling_detected"))):
                    scales_stockout = True
                    break

        # Spend shift calculation
        total_shift = 0.0
        total_current = 0.0
        for ch in changes:
            to_s = getattr(ch, "to_spend", 0.0)
            from_s = getattr(ch, "from_spend", 0.0)
            total_shift += abs(to_s - from_s)
            total_current += from_s

        shift_pct = (total_shift / max(total_current, 1.0)) * 100.0 if total_current > 0 else 0.0
        daily_risk_budget_pct = float(policy.get("daily_risk_budget_pct", 10.0))

        # --- RULE EVALUATION ---

        # Mode A: dry_run
        if autonomy_level == "dry_run":
            return IterablePolicyDecision(
                recommendation_id=rec_id,
                verdict="REVIEW",
                reasons=["dry_run_mode_advisory_only"],
                size_factor=1.0,
            )

        # Hard Safety Check across all active autonomy levels
        if scales_stockout:
            return IterablePolicyDecision(
                recommendation_id=rec_id,
                verdict="BLOCK",
                reasons=["stockout_sku_scaling_blocked"],
                size_factor=0.0,
            )

        # Mode B: full_autopilot
        if autonomy_level == "full_autopilot":
            if money_at_risk > 1000.0:
                return IterablePolicyDecision(
                    recommendation_id=rec_id,
                    verdict="REVIEW",
                    reasons=["high_money_at_risk_autopilot_review"],
                    size_factor=0.5,
                )
            return IterablePolicyDecision(
                recommendation_id=rec_id,
                verdict="AUTO",
                reasons=["full_autopilot_execution"],
                size_factor=1.0,
            )

        # Mode C: supervised (default)
        if shift_pct <= daily_risk_budget_pct and confidence >= 0.6 and money_at_risk <= 500.0:
            return IterablePolicyDecision(
                recommendation_id=rec_id,
                verdict="AUTO",
                reasons=["within_daily_risk_budget", "confidence_sufficient"],
                size_factor=1.0,
            )

        reasons = []
        if money_at_risk > 500.0:
            reasons.append("high_money_at_risk")
        if confidence < 0.6:
            reasons.append("low_confidence")
        if shift_pct > daily_risk_budget_pct:
            reasons.append("shift_exceeds_daily_risk_budget")
        if not reasons:
            reasons.append("supervised_default_review")

        return IterablePolicyDecision(
            recommendation_id=rec_id,
            verdict="REVIEW",
            reasons=reasons,
            size_factor=1.0,
        )

    except Exception as e:
        logger.warning(f"Error in policy decide engine: {e}")
        return IterablePolicyDecision(
            recommendation_id=getattr(recommendation, "id", "REC-001"),
            verdict="REVIEW",
            reasons=["error_fallback_to_review"],
            size_factor=1.0,
        )
