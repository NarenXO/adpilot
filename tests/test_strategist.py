import numpy as np
import pytest
from backend.contracts import ResponseCurve, CurvePoint
from backend.strategist.forecast import (
    holt_winters_forecast,
    ridge_forecast,
    forecast_revenue,
    forecast_campaign_7day,
    get_predicted_growth_rate,
)
from backend.strategist.curves import (
    HillCurve,
    fit_hill_curve,
    compute_confidence_bands,
    generate_response_curve,
)

def test_holt_winters_forecast_seasonal():
    # 21 days of data with weekly seasonality (7-day pattern)
    base_pattern = [100.0, 120.0, 110.0, 150.0, 200.0, 220.0, 130.0]
    series = (base_pattern * 3)
    forecast = holt_winters_forecast(series, horizon=7)
    
    assert len(forecast) == 7
    assert all(f >= 0.0 for f in forecast)
    # Peak day in weekly pattern should be higher than lowest day
    assert max(forecast) > min(forecast)

def test_holt_winters_edge_cases():
    # Empty series
    assert holt_winters_forecast([], horizon=7) == [0.0] * 7
    
    # Single element
    assert holt_winters_forecast([50.0], horizon=7) == [50.0] * 7
    
    # Short series (< 7 elements) should fallback to double exponential smoothing
    short_series = [100.0, 110.0, 120.0, 130.0]
    short_forecast = holt_winters_forecast(short_series, horizon=7)
    assert len(short_forecast) == 7
    assert all(f > 0.0 for f in short_forecast)

def test_ridge_forecast():
    series = [100.0, 105.0, 110.0, 115.0, 120.0, 125.0, 130.0, 135.0, 140.0, 145.0]
    forecast = ridge_forecast(series, horizon=7, lags=5)
    assert len(forecast) == 7
    assert all(f > 0.0 for f in forecast)

def test_forecast_revenue_dispatch_and_growth_rate():
    series = [300.0, 320.0, 310.0, 350.0, 400.0, 420.0, 330.0] * 2
    f_auto = forecast_revenue(series, horizon=7, method="auto")
    f_ridge = forecast_revenue(series, horizon=7, method="ridge")
    assert len(f_auto) == 7
    assert len(f_ridge) == 7

    growth = get_predicted_growth_rate(series, f_auto)
    assert isinstance(growth, float)
    assert -1.0 <= growth <= 3.0

def test_forecast_campaign_7day():
    # Calling on campaign with fallback
    f_camp = forecast_campaign_7day("camp_meta_01")
    assert len(f_camp) == 7
    assert all(v > 0 for v in f_camp)

def test_hill_curve_properties():
    emax = 2000.0
    k = 400.0
    eta = 1.0
    curve = HillCurve(emax=emax, k=k, eta=eta, lower_factor=0.85, upper_factor=1.15)

    # Spend 0 -> Revenue 0
    assert curve.predict(0.0) == 0.0
    assert curve.predict_low(0.0) == 0.0
    assert curve.predict_high(0.0) == 0.0

    # At S = K, Revenue = Emax / 2
    r_k = curve.predict(k)
    assert pytest.approx(r_k, abs=1.0) == emax / 2.0

    # Asymptotic behavior for large S
    r_large = curve.predict(100000.0)
    assert pytest.approx(r_large, abs=10.0) == emax

    # Monotonicity
    assert curve.predict(200.0) < curve.predict(400.0) < curve.predict(800.0)

    # Risk-averse lower bound ordering: low <= mid <= high
    low = curve.predict(300.0, bound="low")
    mid = curve.predict(300.0, bound="mid")
    high = curve.predict(300.0, bound="high")
    assert 0.0 <= low <= mid <= high

    # Marginal ROAS checks
    m_mid = curve.marginal_roas(300.0, bound="mid")
    m_low = curve.marginal_roas(300.0, bound="low")
    assert m_mid > 0.0
    assert m_low <= m_mid  # Conservative marginal ROAS

def test_fit_hill_curve_with_synthetic_data():
    spends = np.array([50.0, 100.0, 200.0, 300.0, 500.0, 750.0, 1000.0])
    # Exact Hill: Emax=3000, K=350, eta=1.2
    emax_true = 3000.0
    k_true = 350.0
    eta_true = 1.2
    u = spends / k_true
    revenues = emax_true * (u ** eta_true) / (1.0 + (u ** eta_true))

    fitted_curve = fit_hill_curve(spends, revenues)
    assert fitted_curve.emax > 1000.0
    assert fitted_curve.k > 50.0
    assert fitted_curve.r_squared > 0.90
    assert 0.5 <= fitted_curve.lower_factor <= 1.0
    assert 1.0 <= fitted_curve.upper_factor <= 1.6

def test_compute_confidence_bands():
    spends = [100.0, 200.0, 300.0, 400.0, 500.0]
    revenues = [400.0, 750.0, 1050.0, 1300.0, 1500.0]
    eval_spends = [50.0, 150.0, 250.0, 350.0, 450.0, 550.0]

    band_points = compute_confidence_bands(spends, revenues, eval_spends)
    assert len(band_points) == len(eval_spends)

    for pt in band_points:
        assert isinstance(pt, CurvePoint)
        assert pt.spend > 0
        assert 0.0 <= pt.revenue_low <= pt.revenue_mid <= pt.revenue_high

def test_generate_response_curve_validates_schema():
    curve_obj = generate_response_curve(
        campaign_id="camp_meta_03",
        sku="SKU-007",
        current_spend=500.0,
        recommended_spend=325.0,
        opportunity_score=32.0,
        num_points=15,
    )

    # Must be valid ResponseCurve
    assert isinstance(curve_obj, ResponseCurve)
    # Check strict schema validation
    validated = ResponseCurve.model_validate(curve_obj.model_dump())
    assert validated.campaign_id == "camp_meta_03"
    assert validated.sku == "SKU-007"
    assert validated.current_spend == 500.0
    assert validated.recommended_spend == 325.0
    assert validated.opportunity_score == 32.0
    assert len(validated.data_points) == 15
    for dp in validated.data_points:
        assert dp.revenue_low <= dp.revenue_mid <= dp.revenue_high
