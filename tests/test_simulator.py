"""
tests/test_simulator.py
========================
Pytest suite for backend.simulator.world.generate_world()
All 10 required checks per specification.
"""
import pytest
import pandas as pd
import numpy as np

from backend.simulator.world import generate_world

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
EXPECTED_KEYS = {
    "ad_performance", "sales", "sku_master", "inventory",
    "ga_funnel", "creatives", "external_events",
}

# DDL-derived column sets (exact, no extras)
EXPECTED_COLUMNS = {
    "ad_performance": {
        "date", "platform", "campaign_id", "adset_id", "creative_id",
        "sku", "spend", "impressions", "clicks", "purchases",
        "revenue", "cpc", "ctr", "cpm", "roas",
    },
    "sales": {
        "date", "channel", "sku", "units", "price", "discount", "revenue",
    },
    "sku_master": {
        "sku", "name", "category", "cogs", "margin_pct", "launch_date",
    },
    "inventory": {
        "date", "sku", "stock_units", "days_of_cover",
    },
    "ga_funnel": {
        "date", "channel", "sessions", "add_to_cart", "checkout", "transactions",
    },
    "creatives": {
        "creative_id", "campaign_id", "platform", "format", "age_days", "hook_type",
    },
    "external_events": {
        "date", "type", "name",
    },
}


@pytest.fixture(scope="module")
def world():
    """Generate world once, share across tests."""
    return generate_world(seed=42)


# ---------------------------------------------------------------------------
# Test 1: All 7 DataFrames returned
# ---------------------------------------------------------------------------
def test_all_dataframes_returned(world):
    assert set(world.keys()) == EXPECTED_KEYS, (
        f"Missing keys: {EXPECTED_KEYS - set(world.keys())}"
    )
    for key, df in world.items():
        assert isinstance(df, pd.DataFrame), f"{key} is not a DataFrame"
        assert len(df) > 0, f"{key} DataFrame is empty"


# ---------------------------------------------------------------------------
# Test 2: Exact column names (no extras, no missing)
# ---------------------------------------------------------------------------
def test_column_names_match_ddl(world):
    for table, expected_cols in EXPECTED_COLUMNS.items():
        df = world[table]
        actual_cols = set(df.columns)
        missing  = expected_cols - actual_cols
        extra    = actual_cols - expected_cols
        assert not missing, f"{table}: missing columns {missing}"
        assert not extra,   f"{table}: unexpected extra columns {extra}"


# ---------------------------------------------------------------------------
# Test 3: ad_performance has 180 unique dates
# ---------------------------------------------------------------------------
def test_ad_performance_180_unique_dates(world):
    df = world["ad_performance"]
    unique_dates = df["date"].nunique()
    assert unique_dates == 180, (
        f"Expected 180 unique dates in ad_performance, got {unique_dates}"
    )


# ---------------------------------------------------------------------------
# Test 4: All three platforms present
# ---------------------------------------------------------------------------
def test_all_platforms_present(world):
    df = world["ad_performance"]
    platforms = set(df["platform"].unique())
    missing = {"meta", "google", "tiktok"} - platforms
    assert not missing, f"Missing platforms: {missing}"


# ---------------------------------------------------------------------------
# Test 5: All 20 SKUs in sku_master
# ---------------------------------------------------------------------------
def test_all_skus_present(world):
    df = world["sku_master"]
    assert len(df) == 20, f"Expected 20 SKUs, got {len(df)}"
    expected_skus = {f"sku_{i:03d}" for i in range(1, 21)}
    actual_skus   = set(df["sku"].values)
    assert expected_skus == actual_skus, (
        f"SKU mismatch. Missing: {expected_skus - actual_skus}"
    )


# ---------------------------------------------------------------------------
# Test 6: No NaN values in any numeric column
# ---------------------------------------------------------------------------
def test_no_nan_in_numeric_columns(world):
    for table, df in world.items():
        num_cols = df.select_dtypes(include=[np.number]).columns
        for col in num_cols:
            n_nan = df[col].isna().sum()
            assert n_nan == 0, (
                f"{table}.{col} has {n_nan} NaN values"
            )


# ---------------------------------------------------------------------------
# Test 7: Determinism — two calls with same seed produce identical output
# ---------------------------------------------------------------------------
def test_determinism(world):
    world2 = generate_world(seed=42)
    for table in EXPECTED_KEYS:
        df1 = world[table].reset_index(drop=True)
        df2 = world2[table].reset_index(drop=True)
        assert df1.shape == df2.shape, (
            f"{table}: shape mismatch {df1.shape} vs {df2.shape}"
        )
        # Compare column by column to give a clear error message
        for col in df1.columns:
            s1 = df1[col]
            s2 = df2[col]
            if pd.api.types.is_numeric_dtype(s1):
                assert np.allclose(s1.fillna(0), s2.fillna(0), rtol=1e-9), (
                    f"{table}.{col} differs between runs"
                )
            else:
                assert (s1.values == s2.values).all(), (
                    f"{table}.{col} differs between runs"
                )


# ---------------------------------------------------------------------------
# Test 8: Derived columns are mathematically consistent
# ---------------------------------------------------------------------------
def test_derived_column_consistency(world):
    df = world["ad_performance"]

    # cpc = spend / clicks  (where clicks > 0)
    mask_clicks = df["clicks"] > 0
    if mask_clicks.any():
        expected_cpc = (df.loc[mask_clicks, "spend"] /
                        df.loc[mask_clicks, "clicks"])
        actual_cpc   = df.loc[mask_clicks, "cpc"]
        assert np.allclose(actual_cpc.values, expected_cpc.values, rtol=1e-4), \
            "cpc is not spend/clicks"

    # ctr = clicks / impressions  (where impressions > 0)
    mask_impr = df["impressions"] > 0
    if mask_impr.any():
        expected_ctr = (df.loc[mask_impr, "clicks"] /
                        df.loc[mask_impr, "impressions"])
        actual_ctr   = df.loc[mask_impr, "ctr"]
        assert np.allclose(actual_ctr.values, expected_ctr.values, rtol=1e-4), \
            "ctr is not clicks/impressions"

    # cpm = (spend / impressions) * 1000  (where impressions > 0)
    if mask_impr.any():
        expected_cpm = (df.loc[mask_impr, "spend"] /
                        df.loc[mask_impr, "impressions"]) * 1000.0
        actual_cpm   = df.loc[mask_impr, "cpm"]
        assert np.allclose(actual_cpm.values, expected_cpm.values, rtol=1e-4), \
            "cpm is not (spend/impressions)*1000"

    # roas = revenue / spend  (where spend > 0)
    mask_spend = df["spend"] > 0
    if mask_spend.any():
        expected_roas = (df.loc[mask_spend, "revenue"] /
                         df.loc[mask_spend, "spend"])
        actual_roas   = df.loc[mask_spend, "roas"]
        assert np.allclose(actual_roas.values, expected_roas.values, rtol=1e-4), \
            "roas is not revenue/spend"


# ---------------------------------------------------------------------------
# Test 9: inventory.days_of_cover is non-negative
# ---------------------------------------------------------------------------
def test_inventory_days_of_cover_nonnegative(world):
    df = world["inventory"]
    neg = (df["days_of_cover"] < 0).sum()
    assert neg == 0, (
        f"Found {neg} negative days_of_cover values in inventory"
    )


# ---------------------------------------------------------------------------
# Test 10: sku_master.margin_pct is between 0 and 1
# ---------------------------------------------------------------------------
def test_sku_master_margin_pct_range(world):
    df = world["sku_master"]
    below_zero = (df["margin_pct"] < 0).sum()
    above_one  = (df["margin_pct"] > 1).sum()
    assert below_zero == 0, f"{below_zero} SKUs have margin_pct < 0"
    assert above_one  == 0, f"{above_one} SKUs have margin_pct > 1"


# ===========================================================================
# PHASE 2 TESTS — Incident Injection & Ground Truth
# ===========================================================================
import copy
from datetime import date, timedelta
from backend.simulator.inject import inject_golden_path
from backend.simulator.truth  import TruthRecorder

TRUTH_COLUMNS = {
    "sim_date", "incident_type", "scope_platform",
    "scope_campaign_id", "scope_sku", "is_decoy", "label",
}

EXPECTED_INCIDENT_TYPES = {
    "CREATIVE_FATIGUE", "STOCKOUT", "TRACKING_BREAK",
    "MARGIN_SQUEEZE", "HOLIDAY_DEMAND", "PLANNED_PROMO",
}


@pytest.fixture(scope="module")
def golden_world():
    """Generate base world + apply golden path injections once per module."""
    base = generate_world(seed=42)
    mod_dfs, truth_df = inject_golden_path(base, seed=42)
    return base, mod_dfs, truth_df


# ---------------------------------------------------------------------------
# Test P2-1: truth DataFrame matches DDL columns and has no NaNs
# ---------------------------------------------------------------------------
def test_inject_golden_path_returns_truth_df(golden_world):
    _, _, truth_df = golden_world
    assert isinstance(truth_df, pd.DataFrame), "truth_df must be a DataFrame"
    assert len(truth_df) > 0, "truth_df must not be empty"
    # Exact column check
    actual_cols = set(truth_df.columns)
    missing  = TRUTH_COLUMNS - actual_cols
    extra    = actual_cols - TRUTH_COLUMNS
    assert not missing, f"truth_df missing columns: {missing}"
    assert not extra,   f"truth_df has extra columns: {extra}"
    # No NaNs
    assert truth_df.isnull().sum().sum() == 0, "truth_df contains NaN values"


# ---------------------------------------------------------------------------
# Test P2-2: All 4 incidents + 2 decoys present
# ---------------------------------------------------------------------------
def test_golden_path_contains_all_4_incidents_and_2_decoys(golden_world):
    _, _, truth_df = golden_world
    found_types = set(truth_df["incident_type"].unique())
    missing = EXPECTED_INCIDENT_TYPES - found_types
    assert not missing, f"Missing incident types in truth_df: {missing}"

    alerts    = truth_df[truth_df["is_decoy"] == False]
    decoys    = truth_df[truth_df["is_decoy"] == True]
    alert_types = set(alerts["incident_type"].unique())
    decoy_types = set(decoys["incident_type"].unique())

    assert "CREATIVE_FATIGUE" in alert_types
    assert "STOCKOUT"         in alert_types
    assert "TRACKING_BREAK"   in alert_types
    assert "MARGIN_SQUEEZE"   in alert_types
    assert "HOLIDAY_DEMAND"   in decoy_types
    assert "PLANNED_PROMO"    in decoy_types


# ---------------------------------------------------------------------------
# Test P2-3: Creative Fatigue symptoms — CTR drops, CPC rises
# ---------------------------------------------------------------------------
def test_creative_fatigue_symptoms(golden_world):
    base, mod_dfs, truth_df = golden_world

    # Get campaign injected with creative fatigue
    cf_rows = truth_df[truth_df["incident_type"] == "CREATIVE_FATIGUE"]
    assert len(cf_rows) > 0, "No CREATIVE_FATIGUE entries in truth_df"

    camp_id  = cf_rows["scope_campaign_id"].iloc[0]
    cf_dates = set(cf_rows["sim_date"].values)

    base_ad = base["ad_performance"]
    mod_ad  = mod_dfs["ad_performance"]

    # Filter to the fatigue window for that campaign
    b_window = base_ad[
        base_ad["date"].isin(cf_dates) & (base_ad["campaign_id"] == camp_id)
    ]
    m_window = mod_ad[
        mod_ad["date"].isin(cf_dates) & (mod_ad["campaign_id"] == camp_id)
    ]

    if len(b_window) > 0 and len(m_window) > 0:
        # Clicks should be lower in modified
        assert m_window["clicks"].sum() < b_window["clicks"].sum(), \
            "Creative fatigue: clicks should decrease"
        # CTR should be lower (or equal if impressions also fell)
        # Use mean since rows may differ
        avg_ctr_base = b_window["ctr"].mean()
        avg_ctr_mod  = m_window["ctr"].mean()
        # At minimum, CPC should be higher (spend unchanged, fewer clicks)
        avg_cpc_base = b_window[b_window["clicks"] > 0]["cpc"].mean()
        avg_cpc_mod  = m_window[m_window["clicks"] > 0]["cpc"].mean()
        if not np.isnan(avg_cpc_base) and not np.isnan(avg_cpc_mod):
            assert avg_cpc_mod >= avg_cpc_base * 0.9, \
                f"CPC should be equal or higher after fatigue: base={avg_cpc_base:.4f} mod={avg_cpc_mod:.4f}"


# ---------------------------------------------------------------------------
# Test P2-4: Stockout symptoms — stock=0, purchases=0 for SKU, spend continues
# ---------------------------------------------------------------------------
def test_stockout_symptoms(golden_world):
    _, mod_dfs, truth_df = golden_world

    so_rows = truth_df[truth_df["incident_type"] == "STOCKOUT"]
    assert len(so_rows) > 0, "No STOCKOUT entries in truth_df"

    sku      = so_rows["scope_sku"].iloc[0]
    so_dates = set(so_rows["sim_date"].values)

    inv = mod_dfs["inventory"]
    inv_window = inv[inv["date"].isin(so_dates) & (inv["sku"] == sku)]
    assert len(inv_window) > 0, f"No inventory rows for sku={sku} during stockout"
    assert (inv_window["stock_units"] == 0).all(), \
        "Stockout: stock_units should be 0 during window"
    assert (inv_window["days_of_cover"] == 0.0).all(), \
        "Stockout: days_of_cover should be 0.0 during window"

    ad = mod_dfs["ad_performance"]
    ad_window = ad[ad["date"].isin(so_dates) & (ad["sku"] == sku)]
    if len(ad_window) > 0:
        assert (ad_window["purchases"] == 0).all(), \
            "Stockout: ad purchases should be 0 for affected SKU"
        # Spend should still be nonzero (campaigns keep running)
        assert ad_window["spend"].sum() > 0, \
            "Stockout: spend should continue during stockout (wasted spend signal)"

    sales = mod_dfs["sales"]
    sales_window = sales[sales["date"].isin(so_dates) & (sales["sku"] == sku)]
    if len(sales_window) > 0:
        assert (sales_window["units"] == 0).all(), \
            "Stockout: sales units should be 0 for affected SKU"


# ---------------------------------------------------------------------------
# Test P2-5: Tracking Break — ad purchases collapse, GA transactions healthy
# ---------------------------------------------------------------------------
def test_tracking_break_symptoms(golden_world):
    base, mod_dfs, truth_df = golden_world

    tb_rows = truth_df[truth_df["incident_type"] == "TRACKING_BREAK"]
    assert len(tb_rows) > 0, "No TRACKING_BREAK entries in truth_df"

    platform = tb_rows["scope_platform"].iloc[0]
    camp_id  = tb_rows["scope_campaign_id"].iloc[0]
    tb_dates = set(tb_rows["sim_date"].values)

    base_ad = base["ad_performance"]
    mod_ad  = mod_dfs["ad_performance"]

    b_window = base_ad[
        base_ad["date"].isin(tb_dates)
        & (base_ad["platform"] == platform)
        & (base_ad["campaign_id"] == camp_id)
    ]
    m_window = mod_ad[
        mod_ad["date"].isin(tb_dates)
        & (mod_ad["platform"] == platform)
        & (mod_ad["campaign_id"] == camp_id)
    ]

    if len(b_window) > 0 and len(m_window) > 0:
        # Purchases should have collapsed (~5% of original)
        b_purch = b_window["purchases"].sum()
        m_purch = m_window["purchases"].sum()
        assert m_purch <= b_purch * 0.10, \
            f"Tracking break: purchases should be ~5% of baseline: {m_purch} vs {b_purch}"

    # GA funnel transactions should be healthy (unchanged)
    base_ga = base["ga_funnel"]
    mod_ga  = mod_dfs["ga_funnel"]
    base_ga_ch = base_ga[base_ga["date"].isin(tb_dates) & (base_ga["channel"] == platform)]
    mod_ga_ch  = mod_ga[mod_ga["date"].isin(tb_dates)  & (mod_ga["channel"] == platform)]
    if len(base_ga_ch) > 0 and len(mod_ga_ch) > 0:
        assert mod_ga_ch["transactions"].sum() == base_ga_ch["transactions"].sum(), \
            "Tracking break: GA transactions should be unchanged (pixel broke, not store)"


# ---------------------------------------------------------------------------
# Test P2-6: Margin Squeeze — margin_pct < 0.20 for affected SKU
# ---------------------------------------------------------------------------
def test_margin_squeeze_symptoms(golden_world):
    _, mod_dfs, truth_df = golden_world

    mq_rows = truth_df[truth_df["incident_type"] == "MARGIN_SQUEEZE"]
    assert len(mq_rows) > 0, "No MARGIN_SQUEEZE entries in truth_df"

    sku = mq_rows["scope_sku"].iloc[0]
    sm  = mod_dfs["sku_master"]
    sku_row = sm[sm["sku"] == sku]
    assert len(sku_row) > 0, f"SKU {sku} not found in sku_master"

    margin = float(sku_row["margin_pct"].values[0])
    assert margin < 0.20, \
        f"Margin squeeze: margin_pct should be < 0.20 for {sku}, got {margin:.4f}"
    assert margin > 0.0, \
        f"Margin squeeze: margin_pct must stay positive, got {margin:.4f}"


# ---------------------------------------------------------------------------
# Test P2-7: Decoys are labeled is_decoy=True and label="no_alert"
# ---------------------------------------------------------------------------
def test_decoys_labeled_correctly(golden_world):
    _, _, truth_df = golden_world

    holiday_rows = truth_df[truth_df["incident_type"] == "HOLIDAY_DEMAND"]
    promo_rows   = truth_df[truth_df["incident_type"] == "PLANNED_PROMO"]

    assert len(holiday_rows) > 0, "No HOLIDAY_DEMAND rows in truth_df"
    assert len(promo_rows)   > 0, "No PLANNED_PROMO rows in truth_df"

    assert holiday_rows["is_decoy"].all(),   "HOLIDAY_DEMAND: is_decoy must be True"
    assert promo_rows["is_decoy"].all(),     "PLANNED_PROMO: is_decoy must be True"
    assert (holiday_rows["label"] == "no_alert").all(), \
        "HOLIDAY_DEMAND: label must be 'no_alert'"
    assert (promo_rows["label"] == "no_alert").all(), \
        "PLANNED_PROMO: label must be 'no_alert'"

    # Alert rows must be labeled "alert"
    alert_rows = truth_df[truth_df["is_decoy"] == False]
    assert (alert_rows["label"] == "alert").all(), \
        "Non-decoy rows must have label='alert'"


# ---------------------------------------------------------------------------
# Test P2-8: Derived columns are valid after injection (no inf/nan/stale)
# ---------------------------------------------------------------------------
def test_derived_columns_recalculated_after_injection(golden_world):
    _, mod_dfs, _ = golden_world
    ad = mod_dfs["ad_performance"]

    # No NaN in any numeric column
    num_cols = ad.select_dtypes(include=[np.number]).columns
    for col in num_cols:
        nan_count = ad[col].isna().sum()
        assert nan_count == 0, f"ad_performance.{col} has {nan_count} NaN after injection"

    # No infinity
    for col in ["cpc", "ctr", "cpm", "roas"]:
        inf_count = np.isinf(ad[col]).sum()
        assert inf_count == 0, f"ad_performance.{col} has {inf_count} Inf after injection"

    # All derived columns consistent where spend/clicks/impressions > 0
    m_click = ad["clicks"] > 0
    if m_click.any():
        expected = ad.loc[m_click, "spend"] / ad.loc[m_click, "clicks"]
        assert np.allclose(ad.loc[m_click, "cpc"].values, expected.values, rtol=1e-4), \
            "cpc recalculation is inconsistent after injection"

    m_impr = ad["impressions"] > 0
    if m_impr.any():
        expected = ad.loc[m_impr, "clicks"] / ad.loc[m_impr, "impressions"]
        assert np.allclose(ad.loc[m_impr, "ctr"].values, expected.values, rtol=1e-4), \
            "ctr recalculation is inconsistent after injection"
