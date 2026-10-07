import logging
from datetime import date
from typing import Sequence
import numpy as np

from backend.contracts import OpportunityScore
from backend.strategist.forecast import forecast_campaign_7day, forecast_revenue
from backend.strategist.curves import HillCurve, fit_hill_curve

logger = logging.getLogger(__name__)

def fit_response_curve(campaign_id: str, db_conn=None) -> tuple[HillCurve, float, str]:
    """
    Fits response curve for a campaign from database.
    Returns: (fitted_hill_curve, current_spend, method)
    where method is 'hill' or 'linear_fallback'.
    """
    spends = []
    revenues = []
    current_spend = 500.0

    if db_conn is not None:
        try:
            rows = db_conn.execute(
                "SELECT spend, revenue FROM ad_performance WHERE campaign_id = ? ORDER BY date ASC",
                [campaign_id]
            ).fetchall()
            if rows:
                spends = [float(r[0]) for r in rows if r[0] is not None]
                revenues = [float(r[1]) for r in rows if r[1] is not None]
                if spends:
                    current_spend = spends[-1]
        except Exception as e:
            logger.warning(f"Error loading ad_performance for {campaign_id}: {e}")

    if len(spends) >= 3 and len(set(spends)) >= 2:
        curve = fit_hill_curve(spends, revenues)
        method = "hill"
    else:
        curve = fit_hill_curve(spends, revenues)
        method = "linear_fallback"

    return curve, current_spend, method

def compute_opportunity_score(
    campaign_id: str,
    sku: str | None,
    db_conn,
    sim_date: str | None = None
) -> OpportunityScore:
    """
    Returns a validated OpportunityScore Pydantic instance from backend.contracts.schemas.
    
    Formula:
        total_score = forecast_component + curve_component + margin_component + stock_component
        Each component in [0, 25], total in [0, 100]

    sim_date: ISO date string ('YYYY-MM-DD'). If None, uses the latest date in ad_performance.
    """
    # 0. Determine and parse sim_date
    try:
        if sim_date is None:
            target_date = None
            if db_conn is not None:
                try:
                    res = db_conn.execute("SELECT MAX(date) FROM ad_performance").fetchone()
                    if res and res[0] is not None:
                        target_date = res[0]
                except Exception as e:
                    logger.warning(f"Error querying MAX(date) from ad_performance: {e}")
            if target_date is None:
                target_date = date(2024, 6, 15)
            elif isinstance(target_date, str):
                target_date = date.fromisoformat(target_date)
        else:
            target_date = date.fromisoformat(sim_date) if isinstance(sim_date, str) else sim_date
    except Exception as e:
        logger.warning(f"Error parsing sim_date {sim_date}: {e}")
        target_date = date(2024, 6, 15)

    sku_str = str(sku).strip() if sku is not None else ""

    # (a) forecast_component (0-25): Normalized 7-day forecasted revenue growth
    try:
        hist_revenues = []
        if db_conn is not None:
            try:
                rows = db_conn.execute(
                    "SELECT revenue FROM ad_performance WHERE campaign_id = ? ORDER BY date ASC",
                    [campaign_id]
                ).fetchall()
                if rows:
                    hist_revenues = [float(r[0]) for r in rows if r[0] is not None]
            except Exception as e:
                logger.warning(f"Error fetching historical revenue for {campaign_id}: {e}")

        if hist_revenues and len(hist_revenues) >= 2:
            baseline_revenue = float(np.mean(hist_revenues[-7:] if len(hist_revenues) >= 7 else hist_revenues))
            forecast = forecast_revenue(hist_revenues, horizon=7)
        else:
            baseline_revenue = 450.0
            forecast = forecast_campaign_7day(campaign_id, conn=db_conn)

        mean_forecast = float(np.mean(forecast))
        growth_rate = (mean_forecast - baseline_revenue) / max(baseline_revenue, 1.0)

        # growth >= +50% -> 25; growth <= -20% -> 0; linear in between
        f_comp = 25.0 * (growth_rate - (-0.20)) / (0.50 - (-0.20))
        forecast_component = round(float(np.clip(f_comp, 0.0, 25.0)), 2)
    except Exception as e:
        logger.warning(f"Error computing forecast_component for {campaign_id}: {e}")
        forecast_component = 10.0

    # (b) curve_component (0-25): Marginal ROAS at current spend
    try:
        curve, current_spend, method = fit_response_curve(campaign_id, db_conn)
        marginal_roas = curve.marginal_roas(current_spend, bound="mid")

        # marginal_roas >= 3.0 -> 25; marginal_roas <= 0.5 -> 0; linear in between
        c_comp = 25.0 * (marginal_roas - 0.50) / (3.0 - 0.50)
        c_comp = float(np.clip(c_comp, 0.0, 25.0))

        # Uncertainty penalty if linear fallback was used
        if method == "linear_fallback":
            c_comp = min(c_comp, 12.0)

        curve_component = round(c_comp, 2)
    except Exception as e:
        logger.warning(f"Error computing curve_component for {campaign_id}: {e}")
        curve_component = 10.0

    # (c) margin_component (0-25): SKU gross margin
    try:
        if not sku_str:
            margin_component = 10.0
        else:
            margin_pct = None
            if db_conn is not None:
                try:
                    row = db_conn.execute(
                        "SELECT margin_pct FROM sku_master WHERE sku = ?",
                        [sku_str]
                    ).fetchone()
                    if row and row[0] is not None:
                        margin_pct = float(row[0])
                except Exception as e:
                    logger.warning(f"Error querying sku_master for {sku_str}: {e}")

            if margin_pct is None:
                margin_component = 10.0
            else:
                m_norm = margin_pct / 100.0 if margin_pct > 1.0 else margin_pct
                # margin >= 0.60 -> 25; margin <= 0.20 -> 0; linear in between
                m_comp = 25.0 * (m_norm - 0.20) / (0.60 - 0.20)
                margin_component = round(float(np.clip(m_comp, 0.0, 25.0)), 2)
    except Exception as e:
        logger.warning(f"Error computing margin_component for {sku_str}: {e}")
        margin_component = 10.0

    # (d) stock_component (0-25): Inventory safety / days of cover
    try:
        if not sku_str:
            stock_component = 10.0
        else:
            days_of_cover = None
            if db_conn is not None:
                try:
                    row = db_conn.execute(
                        "SELECT days_of_cover FROM inventory WHERE sku = ? ORDER BY date DESC LIMIT 1",
                        [sku_str]
                    ).fetchone()
                    if row and row[0] is not None:
                        days_of_cover = float(row[0])
                except Exception as e:
                    logger.warning(f"Error querying inventory for {sku_str}: {e}")

            if days_of_cover is None:
                stock_component = 10.0
            else:
                if days_of_cover < 3.0:
                    logger.warning(f"Stockout risk detected for SKU {sku_str}: days_of_cover={days_of_cover:.2f} < 3 (stockout_risk=True)")
                    stock_component = 0.0
                elif days_of_cover >= 14.0:
                    stock_component = 25.0
                else:
                    s_comp = 25.0 * (days_of_cover - 3.0) / (14.0 - 3.0)
                    stock_component = round(float(np.clip(s_comp, 0.0, 25.0)), 2)
    except Exception as e:
        logger.warning(f"Error computing stock_component for {sku_str}: {e}")
        stock_component = 10.0

    # Total score sum
    total_score = round(float(np.clip(
        forecast_component + curve_component + margin_component + stock_component,
        0.0,
        100.0
    )), 2)

    return OpportunityScore(
        sim_date=target_date,
        campaign_id=campaign_id,
        sku=sku_str,
        forecast_component=forecast_component,
        curve_component=curve_component,
        margin_component=margin_component,
        stock_component=stock_component,
        total_score=total_score,
    )

def compute_scores_for_campaigns(
    campaign_sku_pairs: Sequence[tuple[str, str | None]],
    db_conn,
    sim_date: str | None = None
) -> list[OpportunityScore]:
    """
    Computes opportunity scores for multiple (campaign_id, sku) pairs in deterministic order.
    """
    scores = []
    for camp_id, sku_val in campaign_sku_pairs:
        score = compute_opportunity_score(
            campaign_id=camp_id,
            sku=sku_val,
            db_conn=db_conn,
            sim_date=sim_date,
        )
        scores.append(score)
    return scores
