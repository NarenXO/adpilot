import logging
from typing import Sequence
import numpy as np
from scipy.optimize import minimize

logger = logging.getLogger(__name__)

def _eval_hill(spend: float, emax: float, k: float, eta: float) -> float:
    """Calculates Hill curve revenue R(S) = (E_max * S^eta) / (K^eta + S^eta)."""
    s = max(0.0, float(spend))
    k_safe = max(float(k), 1e-4)
    if s <= 0.0 or emax <= 0.0:
        return 0.0
    ratio = (s / k_safe) ** max(0.1, float(eta))
    if ratio > 1e9:
        return float(emax)
    return float(emax * (ratio / (1.0 + ratio)))

def optimize_budget(
    campaigns: list[dict],
    mode: str = "profit",
    total_budget: float | None = None,
    db_conn = None,
) -> dict:
    """
    Constrained budget optimization using SciPy SLSQP.
    
    Args:
        campaigns: list of dicts with campaign_id, current_spend, margin_pct, days_of_cover,
                   curve_params, opportunity_score.
        mode: 'profit' | 'growth' | 'efficiency'
        total_budget: spend ceiling (defaults to sum of current_spend)
        db_conn: DuckDB connection for queries if needed
        
    Returns:
        dict with changes, expected_profit_delta, constraints_binding, confidence, method.
    """
    if not campaigns:
        return {
            "changes": [],
            "expected_profit_delta": {"low": 0.0, "mid": 0.0, "high": 0.0},
            "constraints_binding": [],
            "confidence": 0.0,
            "method": "slsqp",
        }

    n = len(campaigns)
    current_spends = np.array([max(50.0, float(c.get("current_spend", 100.0))) for c in campaigns])
    margins = np.array([float(c.get("margin_pct", 0.5)) for c in campaigns])
    scores = np.array([float(c.get("opportunity_score", 50.0)) for c in campaigns])
    
    # Target total budget (default budget-neutral)
    actual_total_current = float(np.sum(current_spends))
    budget_cap = float(total_budget) if total_budget is not None else actual_total_current

    # Extract curve parameters and safety factor
    emax_list = []
    k_list = []
    eta_list = []
    lower_factors = []
    upper_factors = []

    has_invalid_params = False
    for c in campaigns:
        params = c.get("curve_params", {})
        em = float(params.get("E_max", params.get("emax", 2000.0)))
        k_val = float(params.get("K", params.get("k", 300.0)))
        eta_val = float(params.get("eta", 1.1))
        low_f = float(params.get("lower_factor", 0.85))
        high_f = float(params.get("upper_factor", 1.15))

        if em <= 0.0 or k_val <= 0.0 or eta_val <= 0.0:
            has_invalid_params = True

        emax_list.append(em)
        k_list.append(k_val)
        eta_list.append(eta_val)
        lower_factors.append(low_f)
        upper_factors.append(high_f)

    # Compute baseline current revenues
    current_rev_mid = np.array([
        _eval_hill(current_spends[i], emax_list[i], k_list[i], eta_list[i])
        for i in range(n)
    ])
    baseline_total_revenue = float(np.sum(current_rev_mid))

    # Helper functions for candidate spend vector S
    def get_rev_low(S: np.ndarray) -> np.ndarray:
        return np.array([
            _eval_hill(S[i], emax_list[i], k_list[i], eta_list[i]) * lower_factors[i]
            for i in range(n)
        ])

    def get_rev_mid(S: np.ndarray) -> np.ndarray:
        return np.array([
            _eval_hill(S[i], emax_list[i], k_list[i], eta_list[i])
            for i in range(n)
        ])

    def get_rev_high(S: np.ndarray) -> np.ndarray:
        return np.array([
            _eval_hill(S[i], emax_list[i], k_list[i], eta_list[i]) * upper_factors[i]
            for i in range(n)
        ])

    # Attempt SLSQP Optimization if parameters are valid
    slsqp_success = False
    opt_spend = None

    if not has_invalid_params:
        try:
            # 1. Bounds per campaign: S_i in [50, 2.0 * max(S_old, 100)]
            # Also per-campaign 30% shift limits and stockout upper limit
            bounds = []
            for i in range(n):
                s_old = current_spends[i]
                lower_b = max(50.0, 0.70 * s_old)
                doc = campaigns[i].get("days_of_cover")
                if doc is not None and doc < 7.0:
                    upper_b = s_old  # Stock-cover rule: no scale up if days_of_cover < 7
                else:
                    upper_b = 1.30 * s_old
                # Ensure feasible interval
                if lower_b > upper_b:
                    lower_b = upper_b
                bounds.append((lower_b, upper_b))

            # 2. Objective functions by mode
            if mode == "growth":
                # Maximize revenue: minimize -sum(R_mid(S))
                def objective(S):
                    return -float(np.sum(get_rev_mid(S)))
            elif mode == "efficiency":
                # Minimize spend: minimize sum(S)
                def objective(S):
                    return float(np.sum(S))
            else:
                # Mode: 'profit'
                # Maximize conservative net profit: minimize -sum(R_low(S) * margin - S)
                def objective(S):
                    r_low = get_rev_low(S)
                    profit = np.sum(r_low * margins - S)
                    return -float(profit)

            # 3. Constraints (g(S) >= 0)
            constraints = []
            
            # Constraint 1: Total budget cap sum(S) <= budget_cap
            constraints.append({
                "type": "ineq",
                "fun": lambda S: budget_cap - float(np.sum(S))
            })

            # Additional mode constraints
            if mode == "growth":
                # Break-even ROAS: R_mid(S_i) / S_i >= 2.0 -> R_mid(S_i) - 2.0 * S_i >= 0
                for i in range(n):
                    def roas_con(S, idx=i):
                        return _eval_hill(S[idx], emax_list[idx], k_list[idx], eta_list[idx]) - 2.0 * S[idx]
                    constraints.append({"type": "ineq", "fun": roas_con})
            elif mode == "efficiency":
                # Meet current total revenue: sum(R_mid(S)) >= baseline_total_revenue
                constraints.append({
                    "type": "ineq",
                    "fun": lambda S: float(np.sum(get_rev_mid(S))) - baseline_total_revenue
                })

            # Initial guess: start within bounds
            x0 = np.array([
                np.clip(current_spends[i], bounds[i][0], bounds[i][1])
                for i in range(n)
            ])

            res = minimize(
                objective,
                x0,
                method="SLSQP",
                bounds=bounds,
                constraints=constraints,
                options={"maxiter": 500, "ftol": 1e-8}
            )

            if res.success and np.all(np.isfinite(res.x)):
                opt_spend = res.x
                slsqp_success = True
        except Exception as e:
            logger.warning(f"SLSQP optimization failed: {e}")
            slsqp_success = False

    # Heuristic Fallback if SLSQP failed
    if not slsqp_success or opt_spend is None:
        method = "heuristic_fallback"
        confidence = 0.5
        opt_spend = np.copy(current_spends)

        if n >= 2:
            # Sort campaigns by opportunity_score
            sorted_indices = np.argsort(scores)
            lowest_idx = int(sorted_indices[0])
            highest_idx = int(sorted_indices[-1])

            # Take 15% from lowest-scored campaign
            s_low_old = current_spends[lowest_idx]
            shift_desired = 0.15 * s_low_old
            s_low_new = max(50.0, s_low_old - shift_desired)
            actual_shift = s_low_old - s_low_new

            # Give to highest-scored campaign (respecting 30% cap and stock-cover)
            s_high_old = current_spends[highest_idx]
            doc_high = campaigns[highest_idx].get("days_of_cover")
            if doc_high is None or doc_high >= 7.0:
                max_increase = 0.30 * s_high_old
                allowed_increase = min(actual_shift, max_increase)
                s_high_new = s_high_old + allowed_increase
            else:
                s_high_new = s_high_old

            opt_spend[lowest_idx] = s_low_new
            opt_spend[highest_idx] = s_high_new
    else:
        method = "slsqp"
        confidence = 0.85

    # Compute expected profit delta
    rev_new_low = get_rev_low(opt_spend)
    rev_new_mid = get_rev_mid(opt_spend)
    rev_new_high = get_rev_high(opt_spend)

    rev_old_low = get_rev_low(current_spends)
    rev_old_mid = get_rev_mid(current_spends)
    rev_old_high = get_rev_high(current_spends)

    delta_low_arr = (rev_new_low * margins - opt_spend) - (rev_old_low * margins - current_spends)
    delta_mid_arr = (rev_new_mid * margins - opt_spend) - (rev_old_mid * margins - current_spends)
    delta_high_arr = (rev_new_high * margins - opt_spend) - (rev_old_high * margins - current_spends)

    total_delta_low = float(np.sum(delta_low_arr))
    total_delta_mid = float(np.sum(delta_mid_arr))
    total_delta_high = float(np.sum(delta_high_arr))

    # Enforce delta low <= mid <= high ordering
    total_delta_low = min(total_delta_low, total_delta_mid)
    total_delta_high = max(total_delta_high, total_delta_mid)

    # Detect binding constraints within 1% tolerance
    binding = []
    total_new_spend = float(np.sum(opt_spend))
    if abs(total_new_spend - budget_cap) / max(budget_cap, 1.0) <= 0.01:
        binding.append("total_budget_cap")

    for i in range(n):
        s_old = current_spends[i]
        s_new = opt_spend[i]
        rel_change = abs(s_new - s_old) / max(s_old, 1.0)
        if abs(rel_change - 0.30) <= 0.01:
            if "max_change_30pct" not in binding:
                binding.append("max_change_30pct")
        if abs(s_new - 50.0) <= 0.5:
            if "min_spend_50" not in binding:
                binding.append("min_spend_50")
        doc = campaigns[i].get("days_of_cover")
        if doc is not None and doc < 7.0 and abs(s_new - s_old) <= 0.01:
            if "stock_cover_limit" not in binding:
                binding.append("stock_cover_limit")

    # Build changes list
    changes = []
    for i, c in enumerate(campaigns):
        changes.append({
            "campaign_id": c["campaign_id"],
            "from_spend": round(float(current_spends[i]), 2),
            "to_spend": round(float(opt_spend[i]), 2),
        })

    return {
        "changes": changes,
        "expected_profit_delta": {
            "low": round(total_delta_low, 2),
            "mid": round(total_delta_mid, 2),
            "high": round(total_delta_high, 2),
        },
        "constraints_binding": binding,
        "confidence": confidence,
        "method": method,
    }
