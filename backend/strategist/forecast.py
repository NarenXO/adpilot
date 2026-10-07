import numpy as np
from datetime import date
from typing import Literal
from backend.db.connection import get_connection

def holt_winters_forecast(
    series: list[float] | np.ndarray,
    horizon: int = 7,
    season_length: int = 7,
    alpha: float | None = None,
    beta: float | None = None,
    gamma: float | None = None,
) -> list[float]:
    """
    Holt-Winters Exponential Smoothing (Triple Exponential Smoothing with Additive Seasonality).
    Predicts baseline revenue for the next `horizon` days.
    """
    y = np.maximum(0.0, np.asarray(series, dtype=float)).tolist()
    n = len(y)
    
    if n == 0:
        return [0.0] * horizon
    if n == 1:
        return [float(y[0])] * horizon

    m = season_length

    # If series is too short for seasonality, fallback to Holt's Linear Trend (Double Exponential)
    if n < m:
        a = alpha if alpha is not None else 0.3
        b = beta if beta is not None else 0.1
        
        level = y[0]
        trend = y[1] - y[0] if n > 1 else 0.0
        
        for t in range(1, n):
            prev_level = level
            level = a * y[t] + (1.0 - a) * (prev_level + trend)
            trend = b * (level - prev_level) + (1.0 - b) * trend
            
        predictions = []
        for h in range(1, horizon + 1):
            val = max(0.0, level + h * trend)
            predictions.append(round(float(val), 2))
        return predictions

    # Series has at least 1 season
    a = alpha if alpha is not None else 0.3
    b = beta if beta is not None else 0.1
    g = gamma if gamma is not None else 0.15

    # Initialization
    if n >= 2 * m:
        # Initial level as mean of first season
        level = float(np.mean(y[:m]))
        # Initial trend as average slope between first two seasons
        trend = float(np.mean([(y[i + m] - y[i]) / m for i in range(m)]))
        # Initial seasonal indices (centered)
        num_seasons = n // m
        season_averages = [np.mean(y[i * m : (i + 1) * m]) for i in range(num_seasons)]
        seasonals = [0.0] * m
        for i in range(m):
            seasonals[i] = float(np.mean([y[k * m + i] - season_averages[k] for k in range(num_seasons)]))
        # Normalize seasonal components to sum to 0
        mean_season = np.mean(seasonals)
        seasonals = [s - mean_season for s in seasonals]
    else:
        # 1 season <= n < 2 seasons
        level = float(np.mean(y[:m]))
        trend = float((y[-1] - y[0]) / (n - 1)) if n > 1 else 0.0
        seasonals = [y[i] - level for i in range(m)]

    # In-sample filtering
    levels = [level]
    trends = [trend]
    seasonal_factors = list(seasonals)

    for t in range(n):
        s_idx = t % m
        prev_level = levels[-1]
        prev_trend = trends[-1]
        s_prev = seasonal_factors[s_idx]
        
        curr_level = a * (y[t] - s_prev) + (1.0 - a) * (prev_level + prev_trend)
        curr_trend = b * (curr_level - prev_level) + (1.0 - b) * prev_trend
        curr_seasonal = g * (y[t] - curr_level) + (1.0 - g) * s_prev
        
        levels.append(curr_level)
        trends.append(curr_trend)
        seasonal_factors[s_idx] = curr_seasonal

    last_level = levels[-1]
    last_trend = trends[-1]

    # Out-of-sample forecast
    forecasts = []
    for h in range(1, horizon + 1):
        s_idx = (n + h - 1) % m
        pred = last_level + h * last_trend + seasonal_factors[s_idx]
        forecasts.append(round(max(0.0, float(pred)), 2))

    return forecasts

def ridge_forecast(
    series: list[float] | np.ndarray,
    horizon: int = 7,
    lags: int = 7,
    alpha_ridge: float = 1.0,
) -> list[float]:
    """
    Autoregressive Ridge Regression fallback forecaster.
    Fits an autoregressive model y_t = w0 + sum(w_i * y_{t-i}) with L2 regularization.
    """
    y = np.maximum(0.0, np.asarray(series, dtype=float))
    n = len(y)
    
    if n == 0:
        return [0.0] * horizon
    if n <= lags:
        # Fallback to mean or linear trend if data is shorter than requested lags
        mean_val = float(np.mean(y))
        return [round(max(0.0, mean_val), 2)] * horizon

    # Build autoregressive feature matrix
    X_list = []
    y_target = []
    for i in range(lags, n):
        row = [1.0] + list(y[i - lags : i][::-1])  # lag 1 to lag k
        X_list.append(row)
        y_target.append(y[i])

    X = np.array(X_list)
    Y = np.array(y_target)

    # Ridge solution: (X^T X + alpha * I)^{-1} X^T Y
    num_features = X.shape[1]
    reg_matrix = alpha_ridge * np.eye(num_features)
    reg_matrix[0, 0] = 0.0  # Do not regularize intercept
    
    try:
        weights = np.linalg.solve(X.T @ X + reg_matrix, X.T @ Y)
    except np.linalg.LinAlgError:
        weights = np.linalg.lstsq(X, Y, rcond=None)[0]

    # Iterative multi-step forecasting
    current_window = list(y[-lags:])
    preds = []
    for _ in range(horizon):
        feats = np.array([1.0] + current_window[::-1])
        next_val = max(0.0, float(np.dot(feats, weights)))
        preds.append(round(next_val, 2))
        current_window.pop(0)
        current_window.append(next_val)

    return preds

def forecast_revenue(
    series: list[float] | np.ndarray,
    horizon: int = 7,
    method: Literal["holt_winters", "ridge", "auto"] = "auto",
    alpha: float | None = None,
    beta: float | None = None,
    gamma: float | None = None,
) -> list[float]:
    """
    Primary forecasting entry point. Defaults to Holt-Winters exponential smoothing,
    falling back to Ridge regression if stability issues occur.
    """
    if method == "ridge":
        return ridge_forecast(series, horizon=horizon)

    try:
        preds = holt_winters_forecast(series, horizon=horizon, alpha=alpha, beta=beta, gamma=gamma)
        if any(np.isnan(p) or np.isinf(p) for p in preds):
            raise ValueError("Non-finite values in Holt-Winters forecast")
        return preds
    except Exception:
        # Fallback to Ridge on any numerical or fitting anomaly
        return ridge_forecast(series, horizon=horizon)

def forecast_campaign_7day(
    campaign_id: str,
    historical_revenue: list[float] | None = None,
    conn = None,
) -> list[float]:
    """
    Forecasts 7-day baseline revenue for a specific campaign.
    If historical_revenue is provided, uses it. Otherwise, loads from DuckDB ad_performance.
    If database has no historical records for the campaign, provides a realistic fallback.
    """
    if historical_revenue is not None and len(historical_revenue) > 0:
        return forecast_revenue(historical_revenue, horizon=7)

    # Query DuckDB
    should_close = False
    if conn is None:
        try:
            conn = get_connection()
        except Exception:
            conn = None

    if conn is not None:
        try:
            res = conn.execute(
                "SELECT revenue FROM ad_performance WHERE campaign_id = ? ORDER BY date ASC",
                [campaign_id]
            ).fetchall()
            if res and len(res) >= 2:
                rev_series = [float(r[0]) for r in res]
                return forecast_revenue(rev_series, horizon=7)
        except Exception:
            pass

    # Fallback default historical baseline if database is unseeded
    # Provides realistic daily baseline ~450.0 with typical weekly seasonality
    synthetic_baseline = [420.0, 440.0, 460.0, 480.0, 520.0, 550.0, 430.0] * 2
    return forecast_revenue(synthetic_baseline, horizon=7)

def get_predicted_growth_rate(
    historical_revenue: list[float],
    forecast_revenue: list[float],
) -> float:
    """
    Computes 7-day predicted revenue growth potential versus previous 7-day historical revenue.
    Returns growth fraction e.g. 0.15 (+15%).
    """
    if not historical_revenue or not forecast_revenue:
        return 0.0
    recent_hist = historical_revenue[-7:] if len(historical_revenue) >= 7 else historical_revenue
    sum_hist = max(1.0, float(sum(recent_hist)))
    sum_fore = float(sum(forecast_revenue[:7]))
    growth = (sum_fore - sum_hist) / sum_hist
    return round(float(np.clip(growth, -1.0, 3.0)), 4)
