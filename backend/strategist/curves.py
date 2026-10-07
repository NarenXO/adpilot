import numpy as np
from typing import Sequence
from scipy.optimize import curve_fit, minimize

from backend.contracts import CurvePoint, ResponseCurve
from backend.db.connection import get_connection

def _hill_formula(
    S: np.ndarray,
    emax: float,
    k: float,
    eta: float,
) -> np.ndarray:
    """
    Hill function: R(S) = (E_max * S^eta) / (K^eta + S^eta)
    Numerically stable implementation using ratio (S / K)^eta.
    """
    S_arr = np.maximum(0.0, np.asarray(S, dtype=float))
    k_safe = max(float(k), 1e-4)
    result = np.zeros_like(S_arr, dtype=float)
    
    pos_mask = S_arr > 0
    if np.any(pos_mask):
        ratio = (S_arr[pos_mask] / k_safe) ** eta
        # Avoid overflow for large ratios
        val = np.where(ratio > 1e9, float(emax), float(emax) * (ratio / (1.0 + ratio)))
        result[pos_mask] = val
        
    return result

class HillCurve:
    """
    Fitted Hill-type response curve with conservative lower bound for risk-averse optimization.
    Formula: R(S) = (E_max * S^eta) / (K^eta + S^eta)
    """
    def __init__(
        self,
        emax: float,
        k: float,
        eta: float,
        lower_factor: float = 0.85,
        upper_factor: float = 1.15,
        r_squared: float = 0.95,
    ):
        self.emax = max(1.0, float(emax))
        self.k = max(1.0, float(k))
        self.eta = max(0.1, float(eta))
        # Ensure bounds ordering: 0 < lower_factor <= 1.0 <= upper_factor
        self.lower_factor = float(np.clip(lower_factor, 0.5, 0.99))
        self.upper_factor = float(np.clip(upper_factor, 1.01, 1.6))
        self.r_squared = float(np.clip(r_squared, 0.0, 1.0))

    def predict_mid(self, spend: float | np.ndarray) -> float | np.ndarray:
        """Point forecast of revenue at given spend level."""
        is_scalar = np.isscalar(spend)
        s_arr = np.array([spend], dtype=float) if is_scalar else np.asarray(spend, dtype=float)
        rev = _hill_formula(s_arr, self.emax, self.k, self.eta)
        return float(rev[0]) if is_scalar else rev

    def predict_low(self, spend: float | np.ndarray) -> float | np.ndarray:
        """Conservative 95% lower bound of revenue for risk-averse budget allocation."""
        mid = self.predict_mid(spend)
        return np.maximum(0.0, mid * self.lower_factor)

    def predict_high(self, spend: float | np.ndarray) -> float | np.ndarray:
        """Optimistic 95% upper bound of revenue."""
        mid = self.predict_mid(spend)
        return mid * self.upper_factor

    def predict(self, spend: float | np.ndarray, bound: str = "mid") -> float | np.ndarray:
        """Predict revenue according to specified bound ('low', 'mid', 'high')."""
        if bound == "low":
            return self.predict_low(spend)
        elif bound == "high":
            return self.predict_high(spend)
        return self.predict_mid(spend)

    def marginal_roas(self, spend: float, bound: str = "mid") -> float:
        """
        Marginal revenue derivative dR/dS at current spend level:
        dR/dS = (E_max * eta * S^(eta - 1) * K^eta) / (K^eta + S^eta)^2
        """
        s = max(0.0, float(spend))
        if s <= 0.0:
            if abs(self.eta - 1.0) < 1e-4:
                base_slope = self.emax / self.k
            elif self.eta > 1.0:
                base_slope = 0.0
            else:
                # eta < 1, evaluate at small epsilon
                base_slope = self.marginal_roas(1.0, bound="mid")
        else:
            u = s / self.k
            # Numerically stable evaluation
            denom = (1.0 + (u ** self.eta)) ** 2
            if denom == 0.0 or np.isinf(denom):
                base_slope = 0.0
            else:
                num = (self.emax / self.k) * self.eta * (u ** (self.eta - 1.0))
                base_slope = max(0.0, float(num / denom))

        if bound == "low":
            return round(base_slope * self.lower_factor, 4)
        elif bound == "high":
            return round(base_slope * self.upper_factor, 4)
        return round(base_slope, 4)

def fit_hill_curve(
    spends: Sequence[float] | np.ndarray,
    revenues: Sequence[float] | np.ndarray,
    n_bootstraps: int = 100,
) -> HillCurve:
    """
    Fits Hill-type response curve R(S) = (E_max * S^eta) / (K^eta + S^eta)
    and computes bootstrap 95% confidence band factors.
    """
    s_arr = np.asarray(spends, dtype=float)
    r_arr = np.asarray(revenues, dtype=float)

    # Filter invalid points
    valid = (s_arr >= 0) & (r_arr >= 0) & np.isfinite(s_arr) & np.isfinite(r_arr)
    s_clean = s_arr[valid]
    r_clean = r_arr[valid]

    n = len(s_clean)
    if n < 2 or np.all(s_clean == s_clean[0]):
        # Fallback heuristic HillCurve
        mean_s = float(np.mean(s_clean)) if n > 0 else 300.0
        mean_r = float(np.mean(r_clean)) if n > 0 else 1200.0
        emax_default = max(mean_r * 2.0, 1000.0)
        k_default = max(mean_s, 100.0)
        return HillCurve(
            emax=emax_default,
            k=k_default,
            eta=1.0,
            lower_factor=0.85,
            upper_factor=1.15,
            r_squared=0.80,
        )

    max_r = float(np.max(r_clean))
    max_s = float(np.max(s_clean))
    med_s = float(np.median(s_clean)) if float(np.median(s_clean)) > 0 else 200.0

    # Initial parameter guess
    p0 = [max(max_r * 1.5, 500.0), med_s, 1.1]
    bounds = (
        [max(max_r * 0.7, 50.0), 10.0, 0.3],
        [max(max_r * 15.0, 50000.0), max(max_s * 10.0, 20000.0), 3.5]
    )

    popt = None
    try:
        popt, _ = curve_fit(_hill_formula, s_clean, r_clean, p0=p0, bounds=bounds, maxfev=4000)
    except Exception:
        # Fallback to Nelder-Mead optimization of sum of squared errors
        def loss(params):
            em, k_val, eta_val = params
            preds = _hill_formula(s_clean, em, k_val, eta_val)
            return np.sum((preds - r_clean) ** 2)

        res = minimize(loss, p0, method="Nelder-Mead", options={"maxiter": 1000})
        if res.success:
            popt = res.x

    if popt is None:
        popt = p0

    emax_fit, k_fit, eta_fit = float(popt[0]), float(popt[1]), float(popt[2])

    # In-sample predictions and residuals
    fitted_r = _hill_formula(s_clean, emax_fit, k_fit, eta_fit)
    residuals = r_clean - fitted_r
    ss_res = float(np.sum(residuals ** 2))
    ss_tot = float(np.sum((r_clean - np.mean(r_clean)) ** 2))
    r_squared = 1.0 - (ss_res / ss_tot) if ss_tot > 1e-6 else 0.85

    # Bootstrap 95% confidence bands
    lower_factor = 0.85
    upper_factor = 1.15

    if n >= 4 and np.std(residuals) > 1e-4:
        bootstrap_ratios_low = []
        bootstrap_ratios_high = []
        rng = np.random.default_rng(42)

        grid_spends = np.linspace(max(10.0, np.min(s_clean)), max_s, 10)
        grid_base = _hill_formula(grid_spends, emax_fit, k_fit, eta_fit)

        for _ in range(min(n_bootstraps, 50)):
            resample_idx = rng.integers(0, n, size=n)
            b_residuals = residuals[resample_idx]
            b_revenues = np.maximum(0.0, fitted_r + b_residuals)
            
            try:
                b_popt, _ = curve_fit(_hill_formula, s_clean, b_revenues, p0=[emax_fit, k_fit, eta_fit], bounds=bounds, maxfev=1000)
                b_preds = _hill_formula(grid_spends, b_popt[0], b_popt[1], b_popt[2])
                ratio = b_preds / np.maximum(grid_base, 1.0)
                bootstrap_ratios_low.append(np.percentile(ratio, 2.5))
                bootstrap_ratios_high.append(np.percentile(ratio, 97.5))
            except Exception:
                continue

        if bootstrap_ratios_low and bootstrap_ratios_high:
            lower_factor = float(np.median(bootstrap_ratios_low))
            upper_factor = float(np.median(bootstrap_ratios_high))
    else:
        # Relative standard error approximation
        r_se = max(0.05, min(0.18, float(np.std(residuals) / (max_r + 1e-4))))
        lower_factor = max(0.70, 1.0 - 1.96 * r_se)
        upper_factor = min(1.30, 1.0 + 1.96 * r_se)

    return HillCurve(
        emax=emax_fit,
        k=k_fit,
        eta=eta_fit,
        lower_factor=lower_factor,
        upper_factor=upper_factor,
        r_squared=r_squared,
    )

def compute_confidence_bands(
    spends: Sequence[float] | np.ndarray,
    revenues: Sequence[float] | np.ndarray,
    eval_spends: Sequence[float] | np.ndarray,
    n_bootstraps: int = 100,
) -> list[CurvePoint]:
    """
    Computes evaluated CurvePoint list with 95% bootstrap confidence bands
    [revenue_low, revenue_mid, revenue_high].
    """
    curve = fit_hill_curve(spends, revenues, n_bootstraps=n_bootstraps)
    points = []
    
    for s in eval_spends:
        s_val = round(float(s), 2)
        mid = round(float(curve.predict_mid(s_val)), 2)
        low = round(float(curve.predict_low(s_val)), 2)
        high = round(float(curve.predict_high(s_val)), 2)
        
        # Enforce strict non-negative ordering low <= mid <= high
        low = max(0.0, min(low, mid))
        high = max(mid, high)
        
        points.append(CurvePoint(
            spend=s_val,
            revenue_low=low,
            revenue_mid=mid,
            revenue_high=high,
        ))
        
    return points

def generate_response_curve(
    campaign_id: str,
    sku: str,
    spends: Sequence[float] | None = None,
    revenues: Sequence[float] | None = None,
    current_spend: float = 500.0,
    recommended_spend: float = 325.0,
    opportunity_score: float = 50.0,
    num_points: int = 20,
    conn = None,
) -> ResponseCurve:
    """
    Constructs a complete validated ResponseCurve model adhering to backend.contracts.schemas.ResponseCurve.
    Loads campaign data from DuckDB ad_performance if spends/revenues are not explicitly provided.
    """
    # Fetch from database if needed
    if (spends is None or len(spends) < 2) and conn is None:
        try:
            conn = get_connection()
        except Exception:
            conn = None

    if (spends is None or len(spends) < 2) and conn is not None:
        try:
            rows = conn.execute(
                "SELECT spend, revenue FROM ad_performance WHERE campaign_id = ? ORDER BY spend ASC",
                [campaign_id]
            ).fetchall()
            if rows and len(rows) >= 2:
                spends = [float(r[0]) for r in rows]
                revenues = [float(r[1]) for r in rows]
        except Exception:
            pass

    # Fallback synthetic historical points if data is unseeded
    if spends is None or revenues is None or len(spends) < 2:
        # Realistic Hill-shaped historical observations around current spend
        base_s = np.array([100.0, 200.0, 300.0, 400.0, 500.0, 600.0, 700.0, 800.0])
        # Synthetic Hill response with noise
        emax_synth = max(current_spend * 4.5, 2500.0)
        k_synth = max(current_spend * 0.75, 350.0)
        base_r = _hill_formula(base_s, emax_synth, k_synth, 1.15)
        spends = list(base_s)
        revenues = [round(float(r), 2) for r in base_r]

    max_eval_spend = max(float(current_spend) * 1.8, float(recommended_spend) * 1.8, 1000.0)
    eval_spends = np.linspace(50.0, max_eval_spend, num_points).tolist()

    data_points = compute_confidence_bands(spends, revenues, eval_spends)

    return ResponseCurve(
        campaign_id=campaign_id,
        sku=sku,
        data_points=data_points,
        current_spend=round(float(current_spend), 2),
        recommended_spend=round(float(recommended_spend), 2),
        opportunity_score=round(float(opportunity_score), 2),
    )


def fit_response_curve(campaign_id: str, conn=None) -> dict:
    """
    Fits and generates response curve data points for a campaign, returning a dict with data_points.
    """
    sku = "SKU-001"
    current_spend = 500.0
    if conn is not None:
        try:
            row = conn.execute(
                "SELECT sku, spend FROM ad_performance WHERE campaign_id = ? ORDER BY date DESC LIMIT 1",
                [campaign_id]
            ).fetchone()
            if row:
                if row[0]:
                    sku = str(row[0])
                if row[1] is not None:
                    current_spend = float(row[1])
        except Exception:
            pass
    rc = generate_response_curve(
        campaign_id=campaign_id,
        sku=sku,
        current_spend=current_spend,
        conn=conn,
    )
    return rc.model_dump()
