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
