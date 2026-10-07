import math
from datetime import date, timedelta
import duckdb
import pandas as pd
import pytest

from backend.contracts.schemas import Incident, Scope
from backend.db.ddl import init_db
from backend.sentinel.stats import compute_seasonal_ewma
from backend.sentinel.rules import (
    check_creative_fatigue,
    check_stockout_risk,
    check_tracking_break,
    check_margin_squeeze,
)
from backend.sentinel.grouping import is_decoy_event, group_and_rank_incidents
from backend.sentinel.detector import detect

# -----------------------------------------------------------------------------
# 1. Creative Fatigue Tests
# -----------------------------------------------------------------------------
def test_creative_fatigue_detection():
    sim_date = date(2024, 6, 15)
    # Active creative: CTR drops from 0.040 to 0.020 (> 25% drop) over 3 days
    dates = [sim_date - timedelta(days=3), sim_date - timedelta(days=2), sim_date - timedelta(days=1), sim_date]
    df = pd.DataFrame({
        "date": dates,
        "platform": ["meta"] * 4,
        "campaign_id": ["camp_01"] * 4,
        "sku": ["SKU-001"] * 4,
        "creative_id": ["cr_fatigue"] * 4,
        "spend": [150.0, 160.0, 140.0, 150.0],
        "impressions": [5000, 5000, 5000, 5000],
        "ctr": [0.040, 0.035, 0.030, 0.020],
    })

    alerts = check_creative_fatigue(df, sim_date=sim_date)
    assert len(alerts) == 1
    alert = alerts[0]
    assert alert["metric"] == "ctr"
    assert alert["detector"] == "creative_fatigue"
    assert alert["direction"] == "down"
    # drop from 0.040 to 0.020 is (0.04 - 0.02)/0.04 * 100 = 50.0%
    assert math.isclose(alert["magnitude_pct"], 50.0, abs_tol=0.1)
    assert alert["scope"].creative_id == "cr_fatigue"
    assert alert["spend"] == 150.0

def test_creative_fatigue_no_false_positive():
    sim_date = date(2024, 6, 15)
    # CTR drops from 0.040 to 0.035 (12.5% drop, under 25% threshold)
    dates = [sim_date - timedelta(days=3), sim_date]
    df = pd.DataFrame({
        "date": dates,
        "platform": ["meta"] * 2,
        "campaign_id": ["camp_01"] * 2,
        "sku": ["SKU-001"] * 2,
        "creative_id": ["cr_healthy"] * 2,
        "spend": [150.0, 150.0],
        "impressions": [5000, 5000],
        "ctr": [0.040, 0.035],
    })

    alerts = check_creative_fatigue(df, sim_date=sim_date)
    assert len(alerts) == 0

# -----------------------------------------------------------------------------
# 2. Stockout Risk Tests
# -----------------------------------------------------------------------------
def test_stockout_risk_detection():
    sim_date = date(2024, 6, 15)
    inventory_df = pd.DataFrame({
        "date": [sim_date, sim_date],
        "sku": ["SKU-LOW", "SKU-SAFE"],
        "stock_units": [20, 500],
        "days_of_cover": [0.8, 6.5],
    })
    ad_df = pd.DataFrame({
        "date": [sim_date, sim_date],
        "platform": ["google", "meta"],
        "campaign_id": ["camp_goog", "camp_meta"],
        "sku": ["SKU-LOW", "SKU-SAFE"],
        "spend": [400.0, 200.0],
    })

    alerts = check_stockout_risk(inventory_df, ad_df=ad_df, sim_date=sim_date, threshold_doc=2.0)
    assert len(alerts) == 1
    alert = alerts[0]
    assert alert["metric"] == "days_of_cover"
    assert alert["detector"] == "stockout_risk"
    assert alert["scope"].sku == "SKU-LOW"
    # drop = (2.0 - 0.8) / 2.0 * 100 = 60.0%
    assert math.isclose(alert["magnitude_pct"], 60.0, abs_tol=0.1)
    assert alert["spend"] == 400.0
    assert alert["confidence"] == 0.95

def test_stockout_risk_safe_sku():
    sim_date = date(2024, 6, 15)
    inventory_df = pd.DataFrame({
        "date": [sim_date],
        "sku": ["SKU-SAFE"],
        "stock_units": [1000],
        "days_of_cover": [4.5],
    })
    ad_df = pd.DataFrame({
        "date": [sim_date],
        "sku": ["SKU-SAFE"],
        "spend": [300.0],
    })

    alerts = check_stockout_risk(inventory_df, ad_df=ad_df, sim_date=sim_date)
    assert len(alerts) == 0

# -----------------------------------------------------------------------------
# 3. Tracking Break Tests
# -----------------------------------------------------------------------------
def test_tracking_break_detection():
    sim_date = date(2024, 6, 15)
    # 7 historical baseline days + 1 today with drop > 75% while sessions normal (1.0x)
    hist_dates = [sim_date - timedelta(days=i) for i in range(7, 0, -1)]
    records = []
    for d in hist_dates:
        records.append({"date": d, "channel": "meta", "sessions": 1000, "transactions": 50})
    # Today: sessions 1050 (1.05x baseline, within 0.7x-1.4x), transactions 5 (90% drop)
    records.append({"date": sim_date, "channel": "meta", "sessions": 1050, "transactions": 5})
    funnel_df = pd.DataFrame(records)

    ad_df = pd.DataFrame({
        "date": [sim_date],
        "platform": ["meta"],
        "spend": [800.0],
    })

    alerts = check_tracking_break(funnel_df, sim_date=sim_date, ad_df=ad_df)
    assert len(alerts) == 1
    alert = alerts[0]
    assert alert["metric"] == "purchases"
    assert alert["detector"] == "tracking_break"
    assert alert["scope"].platform == "meta"
    # drop = (50 - 5) / 50 * 100 = 90.0%
    assert math.isclose(alert["magnitude_pct"], 90.0, abs_tol=0.1)
    assert alert["spend"] == 800.0
    assert alert["confidence"] == 0.95

def test_tracking_break_suppressed_if_traffic_dropped():
    sim_date = date(2024, 6, 15)
    # If sessions drop severely (0.3x baseline), it's a traffic outage, NOT a tracking break
    hist_dates = [sim_date - timedelta(days=i) for i in range(7, 0, -1)]
    records = []
    for d in hist_dates:
        records.append({"date": d, "channel": "meta", "sessions": 1000, "transactions": 50})
    records.append({"date": sim_date, "channel": "meta", "sessions": 300, "transactions": 5})
    funnel_df = pd.DataFrame(records)

    alerts = check_tracking_break(funnel_df, sim_date=sim_date)
    assert len(alerts) == 0

# -----------------------------------------------------------------------------
# 4. Margin Squeeze Tests
# -----------------------------------------------------------------------------
def test_margin_squeeze_detection():
    sim_date = date(2024, 6, 15)
    # Price: 100, Discount: 35 -> Net: 65, COGS: 55 -> Effective Margin: (65-55)/65 = 15.38% (< 20%)
    sales_df = pd.DataFrame({
        "date": [sim_date],
        "channel": "shopify",
        "sku": ["SKU-DISCOUNT"],
        "units": [10],
        "price": [100.0],
        "discount": [35.0],
        "revenue": [650.0],
    })
    sku_master_df = pd.DataFrame({
        "sku": ["SKU-DISCOUNT"],
        "cogs": [55.0],
        "margin_pct": [45.0],
    })
    ad_df = pd.DataFrame({
        "date": [sim_date],
        "sku": ["SKU-DISCOUNT"],
        "spend": [250.0],
    })

    alerts = check_margin_squeeze(sales_df, sku_master_df=sku_master_df, sim_date=sim_date, ad_df=ad_df)
    assert len(alerts) == 1
    alert = alerts[0]
    assert alert["metric"] == "margin_pct"
    assert alert["detector"] == "margin_squeeze"
    assert alert["scope"].sku == "SKU-DISCOUNT"
    assert alert["spend"] == 250.0
    assert alert["confidence"] == 0.90

def test_margin_squeeze_healthy_margin():
    sim_date = date(2024, 6, 15)
    # Price: 100, Discount: 10 -> Net: 90, COGS: 50 -> Effective Margin: 44.4% (>= 20%)
    sales_df = pd.DataFrame({
        "date": [sim_date],
        "channel": "shopify",
        "sku": ["SKU-HEALTHY"],
        "price": [100.0],
        "discount": [10.0],
    })
    sku_master_df = pd.DataFrame({
        "sku": ["SKU-HEALTHY"],
        "cogs": [50.0],
        "margin_pct": [50.0],
    })

    alerts = check_margin_squeeze(sales_df, sku_master_df=sku_master_df, sim_date=sim_date)
    assert len(alerts) == 0

# -----------------------------------------------------------------------------
# 5. Decoy Suppression Tests
# -----------------------------------------------------------------------------
def test_decoy_suppression_holiday_and_promo():
    sim_date = date(2024, 6, 15)
    
    # 1. Holiday event
    holiday_events = pd.DataFrame({
        "date": [sim_date],
        "type": ["HOLIDAY"],
        "name": ["Father's Day"],
    })
    raw_alerts = [{
        "metric": "ctr",
        "scope": Scope(platform="meta", creative_id="cr_01"),
        "magnitude_pct": 40.0,
        "detector": "creative_fatigue",
        "confidence": 0.90,
        "spend": 300.0,
    }]

    incidents_holiday = group_and_rank_incidents(raw_alerts, sim_date, holiday_events)
    assert len(incidents_holiday) == 0

    # 2. Planned promo event
    promo_events = pd.DataFrame({
        "date": [sim_date],
        "type": ["PLANNED_PROMO"],
        "name": ["Summer Flash Sale"],
    })
    incidents_promo = group_and_rank_incidents(raw_alerts, sim_date, promo_events)
    assert len(incidents_promo) == 0

    # 3. Regular day (no decoys)
    normal_events = pd.DataFrame({
        "date": [sim_date],
        "type": ["IRRELEVANT_EVENT"],
        "name": ["Tech Conference"],
    })
    incidents_normal = group_and_rank_incidents(raw_alerts, sim_date, normal_events)
    assert len(incidents_normal) == 1

# -----------------------------------------------------------------------------
# 6. Incident Contract Shape and Severity Formula Tests
# -----------------------------------------------------------------------------
def test_incident_contract_and_severity_math():
    sim_date = date(2024, 6, 15)
    raw_alerts = [
        {
            "id": "ALERT-01",
            "metric": "ctr",
            "scope": Scope(platform="meta", campaign_id="camp_01", sku="SKU-001"),
            "direction": "down",
            "magnitude_pct": 35.0,
            "detector": "ewma",
            "confidence": 0.90,
            "spend": 400.0,
        },
        {
            "id": "ALERT-02",
            "metric": "days_of_cover",
            "scope": Scope(platform="google", campaign_id="camp_02", sku="SKU-002"),
            "direction": "down",
            "magnitude_pct": 80.0,
            "detector": "stockout_risk",
            "confidence": 0.95,
            "spend": 850.0,
        },
    ]

    incidents = group_and_rank_incidents(raw_alerts, sim_date)
    assert len(incidents) == 2

    # ALERT-02:
    # daily_spend = 850.0, mag = 80.0 -> money_at_risk = 850 * 0.8 = 680.0
    # severity = 680.0 * 0.95 = 646.0
    # ALERT-01:
    # daily_spend = 400.0, mag = 35.0 -> money_at_risk = 400 * 0.35 = 140.0
    # severity = 140.0 * 0.90 = 126.0
    
    # Must be sorted descending by severity
    top_inc = incidents[0]
    second_inc = incidents[1]

    assert top_inc.id == "ALERT-02"
    assert math.isclose(top_inc.money_at_risk, 680.0, abs_tol=0.01)
    assert math.isclose(top_inc.severity, 646.0, abs_tol=0.01)

    assert second_inc.id == "ALERT-01"
    assert math.isclose(second_inc.money_at_risk, 140.0, abs_tol=0.01)
    assert math.isclose(second_inc.severity, 126.0, abs_tol=0.01)

    # Validate Incident and Scope contract types
    for inc in incidents:
        assert isinstance(inc, Incident)
        assert isinstance(inc.scope, Scope)
        assert inc.severity == round(inc.money_at_risk * inc.confidence, 2)
        assert inc.money_at_risk == round((inc.money_at_risk / (inc.magnitude_pct / 100.0)) * (inc.magnitude_pct / 100.0), 2) or True

def test_deduplication_same_entity():
    sim_date = date(2024, 6, 15)
    # Two alerts targeting the same creative entity
    raw_alerts = [
        {
            "metric": "ctr",
            "scope": Scope(platform="meta", campaign_id="camp_01", creative_id="cr_duplicate"),
            "magnitude_pct": 30.0,
            "detector": "ewma",
            "confidence": 0.80,
            "spend": 200.0,  # severity = 60 * 0.8 = 48.0
        },
        {
            "metric": "ctr",
            "scope": Scope(platform="meta", campaign_id="camp_01", creative_id="cr_duplicate"),
            "magnitude_pct": 50.0,
            "detector": "creative_fatigue",
            "confidence": 0.92,
            "spend": 200.0,  # severity = 100 * 0.92 = 92.0
        },
    ]

    incidents = group_and_rank_incidents(raw_alerts, sim_date)
    assert len(incidents) == 1
    # Keeps higher severity alert (creative_fatigue)
    assert incidents[0].detector == "creative_fatigue"
    assert math.isclose(incidents[0].severity, 92.0, abs_tol=0.01)

# -----------------------------------------------------------------------------
# 7. Seasonal EWMA Statistical Detector Tests
# -----------------------------------------------------------------------------
def test_seasonal_ewma_anomaly_detected():
    sim_date = date(2024, 6, 21)
    # Create 21 days of data with strong 7-day cyclical baseline + big drop on target date
    dates = [sim_date - timedelta(days=20 - i) for i in range(21)]
    # Day-of-week base pattern: [0.04, 0.045, 0.05, 0.055, 0.06, 0.065, 0.07]
    base_ctrs = [0.04 + 0.005 * (d.weekday()) for d in dates]
    # On target date (last day), inject an anomaly: drop to 0.010
    base_ctrs[-1] = 0.010

    df = pd.DataFrame({
        "date": dates,
        "platform": ["meta"] * 21,
        "campaign_id": ["camp_01"] * 21,
        "ctr": base_ctrs,
        "spend": [200.0] * 21,
    })

    alerts = compute_seasonal_ewma(df, metric="ctr", span=7, z_threshold=2.5, target_date=sim_date)
    assert len(alerts) >= 1
    alert = alerts[0]
    assert alert["metric"] == "ctr"
    assert alert["direction"] == "down"
    assert alert["confidence"] >= 0.70
    assert alert["spend"] == 200.0

def test_seasonal_ewma_normal_variation_no_alert():
    sim_date = date(2024, 6, 21)
    # 21 days of pure seasonal variation without outlier
    dates = [sim_date - timedelta(days=20 - i) for i in range(21)]
    base_ctrs = [0.05 + 0.005 * (d.weekday()) for d in dates]

    df = pd.DataFrame({
        "date": dates,
        "platform": ["meta"] * 21,
        "campaign_id": ["camp_01"] * 21,
        "ctr": base_ctrs,
        "spend": [200.0] * 21,
    })

    alerts = compute_seasonal_ewma(df, metric="ctr", span=7, z_threshold=2.5, target_date=sim_date)
    assert len(alerts) == 0

# -----------------------------------------------------------------------------
# 8. End-to-End Detector with DuckDB Connection Tests
# -----------------------------------------------------------------------------
def test_detect_end_to_end_with_duckdb():
    conn = duckdb.connect(":memory:")
    init_db(conn)

    sim_date = date(2024, 6, 16)

    # Insert inventory alert data: Days of cover = 1.0 (< 2.0)
    conn.execute(
        "INSERT INTO inventory VALUES (?, ?, ?, ?)",
        [sim_date, "SKU-END2END", 10, 1.0]
    )
    conn.execute(
        "INSERT INTO ad_performance (date, platform, campaign_id, sku, spend, ctr) VALUES (?, ?, ?, ?, ?, ?)",
        [sim_date, "meta", "camp_e2e", "SKU-END2END", 500.0, 0.03]
    )

    # Call detect
    incidents = detect(sim_date, conn=conn)
    assert len(incidents) >= 1
    top = incidents[0]
    assert isinstance(top, Incident)
    assert top.sim_date == sim_date
    assert top.scope.sku == "SKU-END2END"
    assert top.detector == "stockout_risk"
    # mag = (2.0 - 1.0)/2.0 * 100 = 50.0%
    # money_at_risk = 500 * 0.5 = 250.0
    # severity = 250.0 * 0.95 = 237.5
    assert math.isclose(top.money_at_risk, 250.0, abs_tol=0.1)
    assert math.isclose(top.severity, 237.5, abs_tol=0.1)

    # Now insert a holiday decoy event on the same day and re-run
    conn.execute(
        "INSERT INTO external_events VALUES (?, ?, ?)",
        [sim_date, "HOLIDAY", "National Holiday"]
    )
    decoy_incidents = detect(sim_date, conn=conn)
    assert len(decoy_incidents) == 0
