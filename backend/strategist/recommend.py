import logging
from datetime import date
from typing import Literal

from backend.contracts import (
    Recommendation,
    BudgetChange,
    Interval,
    OpportunityScore,
    Incident,
)
from backend.strategist.forecast import forecast_revenue, forecast_campaign_7day
from backend.strategist.curves import fit_hill_curve
from backend.strategist.opportunity import (
    compute_opportunity_score,
    fit_response_curve,
)
from backend.strategist.optimizer import optimize_budget

logger = logging.getLogger(__name__)

class IterableRecommendation(Recommendation):
    """
    Subclass of Recommendation that supports both single instance usage
    and single-element iteration (for orchestrator tick loop compatibility).
    """
    def __iter__(self):
        yield self

def recommend(
    incident: Incident,
    mode: Literal["growth", "profit", "efficiency"] = "profit",
    db_conn = None,
) -> Recommendation:
    """
    High-level entry point that wires forecast + curves + opportunity score +
    SLSQP optimizer into a validated Recommendation contract.
    """
    rec_mode = mode if mode in ("growth", "profit", "efficiency") else "profit"
    incident_id = getattr(incident, "id", "INC-001")

    # If db_conn is None, return a deterministic stub Recommendation
    if db_conn is None:
        return IterableRecommendation(
            id=f"REC-{incident_id}",
            incident_id=incident_id,
            mode=rec_mode,
            changes=[],
            expected_profit_delta=Interval(low=0.0, mid=0.0, high=0.0),
            constraints_binding=[],
            confidence=0.0,
            opportunity_scores=[],
        )

    try:
        # 1. Query distinct active campaigns and skus
        rows = []
        try:
            rows = db_conn.execute(
                "SELECT DISTINCT campaign_id, sku FROM ad_performance WHERE campaign_id IS NOT NULL"
            ).fetchall()
        except Exception as e:
            logger.warning(f"Error querying active campaigns from ad_performance: {e}")

        campaign_sku_map: dict[str, str | None] = {}
        for r in rows:
            c_id = str(r[0])
            sku_val = str(r[1]) if r[1] is not None else None
            campaign_sku_map[c_id] = sku_val

        # Ensure affected campaign from incident scope is included
        affected_camp = getattr(getattr(incident, "scope", None), "campaign_id", None)
        affected_sku = getattr(getattr(incident, "scope", None), "sku", None)
        if affected_camp:
            if affected_camp not in campaign_sku_map:
                campaign_sku_map[affected_camp] = affected_sku
            elif affected_sku and not campaign_sku_map[affected_camp]:
                campaign_sku_map[affected_camp] = affected_sku

        if not campaign_sku_map:
            # Fallback default campaigns if table is unseeded
            campaign_sku_map = {
                "camp_meta_03": "SKU-007",
                "camp_meta_05": "SKU-012",
            }

        # 2. For each campaign, extract inputs and compute scores
        campaign_inputs = []
        opp_scores: list[OpportunityScore] = []

        for camp_id, sku_val in campaign_sku_map.items():
            # Query current spend
            current_spend = 500.0
            try:
                s_row = db_conn.execute(
                    "SELECT spend FROM ad_performance WHERE campaign_id = ? ORDER BY date DESC LIMIT 1",
                    [camp_id]
                ).fetchone()
                if s_row and s_row[0] is not None:
                    current_spend = max(50.0, float(s_row[0]))
            except Exception:
                pass

            # Query margin_pct from sku_master
            margin_pct = 0.50
            if sku_val:
                try:
                    m_row = db_conn.execute(
                        "SELECT margin_pct FROM sku_master WHERE sku = ?",
                        [sku_val]
                    ).fetchone()
                    if m_row and m_row[0] is not None:
                        raw_m = float(m_row[0])
                        margin_pct = raw_m / 100.0 if raw_m > 1.0 else raw_m
                except Exception:
                    pass

            # Query days_of_cover from inventory
            days_of_cover = 14.0
            if sku_val:
                try:
                    i_row = db_conn.execute(
                        "SELECT days_of_cover FROM inventory WHERE sku = ? ORDER BY date DESC LIMIT 1",
                        [sku_val]
                    ).fetchone()
                    if i_row and i_row[0] is not None:
                        days_of_cover = float(i_row[0])
                except Exception:
                    pass

            # Compute opportunity score
            opp_score = compute_opportunity_score(camp_id, sku_val, db_conn)
            opp_scores.append(opp_score)

            # Fit curve params
            curve, _, _ = fit_response_curve(camp_id, db_conn)
            curve_params = {
                "E_max": curve.emax,
                "K": curve.k,
                "eta": curve.eta,
                "lower_factor": curve.lower_factor,
                "upper_factor": curve.upper_factor,
            }

            campaign_inputs.append({
                "campaign_id": camp_id,
                "sku": sku_val,
                "current_spend": current_spend,
                "margin_pct": margin_pct,
                "days_of_cover": days_of_cover,
                "curve_params": curve_params,
                "opportunity_score": opp_score.total_score,
            })

        # 3. Call optimizer
        opt_res = optimize_budget(
            campaigns=campaign_inputs,
            mode=rec_mode,
            db_conn=db_conn,
        )

        budget_changes = [
            BudgetChange(
                campaign_id=ch["campaign_id"],
                from_spend=ch["from_spend"],
                to_spend=ch["to_spend"],
            )
            for ch in opt_res.get("changes", [])
        ]

        exp_delta = Interval(
            low=opt_res["expected_profit_delta"]["low"],
            mid=opt_res["expected_profit_delta"]["mid"],
            high=opt_res["expected_profit_delta"]["high"],
        )

        return IterableRecommendation(
            id=f"REC-{incident_id}",
            incident_id=incident_id,
            mode=rec_mode,
            changes=budget_changes,
            expected_profit_delta=exp_delta,
            constraints_binding=opt_res.get("constraints_binding", []),
            confidence=float(opt_res.get("confidence", 0.85)),
            opportunity_scores=opp_scores,
        )

    except Exception as e:
        logger.warning(f"Error running recommendation pipeline for incident {incident_id}: {e}")
        return IterableRecommendation(
            id=f"REC-{incident_id}",
            incident_id=incident_id,
            mode=rec_mode,
            changes=[],
            expected_profit_delta=Interval(low=0.0, mid=0.0, high=0.0),
            constraints_binding=[],
            confidence=0.0,
            opportunity_scores=[],
        )
