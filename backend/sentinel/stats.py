from datetime import date
from typing import List, Dict, Optional
import numpy as np
import pandas as pd

from backend.contracts import Scope

def compute_seasonal_ewma(
    df: pd.DataFrame,
    metric: str,
    span: int = 7,
    z_threshold: float = 2.5,
    target_date: Optional[date] = None,
) -> List[Dict]:
    """
    Remove day-of-week seasonality (7-day cyclical baseline), detrend via EWMA,
    and flag metrics where |Z| > z_threshold.

    Returns structured anomaly dicts with:
    metric, scope, magnitude_pct, direction, confidence, spend.
    """
    if df is None or df.empty or metric not in df.columns:
        return []

    data = df.copy()

    # Normalize date column if present
    has_date = "date" in data.columns
    if has_date:
        data["_dt"] = pd.to_datetime(data["date"])
        data = data.sort_values("_dt")
        data["_dow"] = data["_dt"].dt.dayofweek

    # Identify scope columns present in dataframe
    scope_fields = ["platform", "campaign_id", "sku", "creative_id"]
    group_cols = [c for c in scope_fields if c in data.columns]

    anomalies: List[Dict] = []

    # If group columns exist, group by them; otherwise analyze as single series
    groups = data.groupby(group_cols, as_index=False) if group_cols else [((), data)]

    for _, group in groups:
        if len(group) == 0:
            continue

        series = group[metric].astype(float)

        # 1. Remove day-of-week seasonality (7-day cyclical baseline)
        if has_date and len(group) >= 7:
            dow_means = group.groupby("_dow")[metric].transform("mean").astype(float)
            overall_mean = float(series.mean())
            seasonal_baseline = dow_means - overall_mean
            deseasonalized = series - seasonal_baseline
        else:
            seasonal_baseline = pd.Series(0.0, index=group.index)
            deseasonalized = series.copy()

        # 2. Detrend via EWMA
        ewma_trend = deseasonalized.ewm(span=span, adjust=False).mean()
        residuals = deseasonalized - ewma_trend

        # Baseline volatility prior to current point (avoiding self-contamination by the anomaly)
        ewma_std = residuals.ewm(span=span, adjust=False).std()
        shifted_std = ewma_std.shift(1)

        res_std = float(residuals.std()) if len(residuals) > 1 else 1.0
        fallback_std = res_std if res_std > 1e-6 else 1e-6
        eval_std = shifted_std.bfill().fillna(fallback_std).replace(0.0, fallback_std)

        # 3. Z-scores
        z_scores = residuals / eval_std

        # Determine points to evaluate
        if target_date is not None and has_date:
            target_d = target_date if isinstance(target_date, date) else pd.to_datetime(target_date).date()
            eval_indices = group[group["_dt"].dt.date == target_d].index
        elif has_date:
            latest_d = group["_dt"].max()
            eval_indices = group[group["_dt"] == latest_d].index
        else:
            # If no date column, evaluate the last row
            eval_indices = group.index[-1:]

        for idx in eval_indices:
            z = float(z_scores.loc[idx])
            if np.isnan(z) or abs(z) <= z_threshold:
                continue

            row = group.loc[idx]
            actual = float(series.loc[idx])
            expected = float(ewma_trend.loc[idx] + seasonal_baseline.loc[idx])

            # Calculate magnitude percentage
            if abs(expected) > 1e-6:
                mag_pct = abs((actual - expected) / expected) * 100.0
            else:
                mag_pct = abs(actual) * 100.0

            direction = "up" if actual >= expected else "down"

            # Confidence scaled between 0.70 and 0.99 according to Z-score excess
            conf = min(0.99, max(0.70, round(0.80 + 0.08 * (abs(z) - z_threshold), 2)))

            # Daily spend
            daily_spend = 0.0
            if "spend" in row and pd.notna(row["spend"]):
                daily_spend = float(row["spend"])
            elif "daily_spend" in row and pd.notna(row["daily_spend"]):
                daily_spend = float(row["daily_spend"])

            # Scope
            scope = Scope(
                platform=str(row["platform"]) if "platform" in row and pd.notna(row["platform"]) else None,
                campaign_id=str(row["campaign_id"]) if "campaign_id" in row and pd.notna(row["campaign_id"]) else None,
                sku=str(row["sku"]) if "sku" in row and pd.notna(row["sku"]) else None,
                creative_id=str(row["creative_id"]) if "creative_id" in row and pd.notna(row["creative_id"]) else None,
            )

            row_sim_date = row["_dt"].date() if has_date and pd.notna(row["_dt"]) else None

            anomalies.append({
                "metric": metric,
                "scope": scope,
                "magnitude_pct": round(mag_pct, 2),
                "direction": direction,
                "detector": "ewma",
                "confidence": conf,
                "spend": daily_spend,
                "sim_date": row_sim_date,
                "z_score": round(z, 2),
            })

    return anomalies
