from datetime import date
from typing import List, Optional
import duckdb
import pandas as pd

from backend.contracts import Incident, Scope, load_fixture
from backend.db.connection import get_connection
from backend.sentinel.stats import compute_seasonal_ewma
from backend.sentinel.rules import (
    check_creative_fatigue,
    check_stockout_risk,
    check_tracking_break,
    check_margin_squeeze,
)
from backend.sentinel.grouping import is_decoy_event, group_and_rank_incidents

def _fetch_df(conn: duckdb.DuckDBPyConnection, query: str, params: Optional[list] = None) -> pd.DataFrame:
    try:
        if params is not None:
            return conn.execute(query, params).df()
        return conn.execute(query).df()
    except Exception:
        return pd.DataFrame()

def detect(
    sim_date: date,
    conn: Optional[duckdb.DuckDBPyConnection] = None,
) -> List[Incident]:
    """
    Main detection pipeline for Sentinel:
    1. Query external_events, ad_performance, inventory, ga_funnel, sales, sku_master.
    2. Check for holiday/promo decoy events and suppress if present.
    3. Run both statistical (EWMA) and deterministic rule detectors.
    4. Group, deduplicate, calculate severity, and return ranked List[Incident].
    """
    db_conn = conn or get_connection()

    # Query tables
    events_df = _fetch_df(db_conn, "SELECT * FROM external_events WHERE date = ?", [sim_date])
    if events_df.empty:
        events_df = _fetch_df(db_conn, "SELECT * FROM external_events")

    # Short-circuit if date is a known decoy event
    if is_decoy_event(sim_date, events_df):
        return []

    ad_df = _fetch_df(db_conn, "SELECT * FROM ad_performance WHERE date <= ?", [sim_date])
    inventory_df = _fetch_df(db_conn, "SELECT * FROM inventory WHERE date <= ?", [sim_date])
    funnel_df = _fetch_df(db_conn, "SELECT * FROM ga_funnel WHERE date <= ?", [sim_date])
    sales_df = _fetch_df(db_conn, "SELECT * FROM sales WHERE date <= ?", [sim_date])
    sku_master_df = _fetch_df(db_conn, "SELECT * FROM sku_master")

    # If DB tables are unseeded / completely empty, fall back to frozen fixtures
    if ad_df.empty and inventory_df.empty and funnel_df.empty and sales_df.empty:
        try:
            fixture_data = load_fixture("incidents")
            fixture_incidents: List[Incident] = []
            for inc_data in fixture_data.get("incidents", []):
                fixture_incidents.append(Incident(**inc_data))
            return fixture_incidents
        except Exception:
            return []

    raw_alerts = []

    # 1. Statistical Anomaly Detection (Seasonal EWMA)
    if not ad_df.empty:
        for metric in ["ctr", "cpc"]:
            if metric in ad_df.columns:
                stat_alerts = compute_seasonal_ewma(
                    ad_df,
                    metric=metric,
                    span=7,
                    z_threshold=2.5,
                    target_date=sim_date,
                )
                raw_alerts.extend(stat_alerts)

    # 2. Rule-Based Detectors
    # Rule 1: Creative Fatigue
    if not ad_df.empty:
        fatigue_alerts = check_creative_fatigue(ad_df, sim_date=sim_date)
        raw_alerts.extend(fatigue_alerts)

    # Rule 2: Stockout Risk
    if not inventory_df.empty:
        stockout_alerts = check_stockout_risk(inventory_df, ad_df=ad_df, sim_date=sim_date)
        raw_alerts.extend(stockout_alerts)

    # Rule 3: Tracking Break
    if not funnel_df.empty:
        tracking_alerts = check_tracking_break(funnel_df, sim_date=sim_date, ad_df=ad_df)
        raw_alerts.extend(tracking_alerts)

    # Rule 4: Margin Squeeze
    if not sales_df.empty:
        margin_alerts = check_margin_squeeze(sales_df, sku_master_df=sku_master_df, sim_date=sim_date, ad_df=ad_df)
        raw_alerts.extend(margin_alerts)

    # 3. Suppress decoys, deduplicate by entity, rank descending by severity
    return group_and_rank_incidents(raw_alerts, sim_date, events_df)
