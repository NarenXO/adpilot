"""
backend/simulator/inject.py
============================
Deterministic incident injectors for AdPilot Phase 2.

Six injection functions + one master orchestrator:
  - inject_creative_fatigue      → CREATIVE_FATIGUE  (alert)
  - inject_stockout              → STOCKOUT           (alert)
  - inject_tracking_break        → TRACKING_BREAK     (alert)
  - inject_margin_squeeze        → MARGIN_SQUEEZE     (alert)
  - inject_holiday_spike_decoy   → HOLIDAY_DEMAND     (no_alert / decoy)
  - inject_planned_promo_decoy   → PLANNED_PROMO      (no_alert / decoy)
  - inject_golden_path           → orchestrator (4 alerts + 2 decoys)

All functions operate on DataFrames produced by generate_world() and return
modified copies without touching the original. Derived columns (cpc, ctr,
cpm, roas, days_of_cover, margin_pct) are recomputed wherever underlying
raw values are modified.
"""
from __future__ import annotations

import copy
from datetime import date, timedelta
from typing import Any

import numpy as np
import pandas as pd

from backend.simulator.truth import TruthRecorder


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _safe_div(a: Any, b: Any) -> Any:
    """Element-wise safe division, 0 when denominator is 0."""
    b_arr = np.asarray(b, dtype=float)
    a_arr = np.asarray(a, dtype=float)
    return np.where(b_arr == 0, 0.0, a_arr / b_arr)


def _date_window(start_date: date, duration_days: int) -> set[date]:
    return {start_date + timedelta(days=i) for i in range(duration_days)}


def _recompute_ad_derived(ad: pd.DataFrame) -> pd.DataFrame:
    """Recalculate cpc, ctr, cpm, roas from raw columns."""
    ad = ad.copy()
    ad["cpc"]  = _safe_div(ad["spend"].values, ad["clicks"].values)
    ad["ctr"]  = _safe_div(ad["clicks"].values, ad["impressions"].values)
    ad["cpm"]  = _safe_div(ad["spend"].values, ad["impressions"].values) * 1000.0
    ad["roas"] = _safe_div(ad["revenue"].values, ad["spend"].values)
    return ad


def _recompute_inventory_doc(inv: pd.DataFrame) -> pd.DataFrame:
    """
    Recompute days_of_cover per (sku, date) using a 7-day trailing average
    of stock depletion implied by the inventory sequence.
    Because injection may set stock_units=0 we need a lightweight recalc.
    We approximate days_of_cover from stock_units / avg_daily_depletion_last7.
    Where depletion is not computable, retain original or set 999.
    """
    inv = inv.copy()
    inv["days_of_cover"] = inv["days_of_cover"].clip(lower=0.0)
    # Hard floor – ensure no negative values crept in
    inv.loc[inv["stock_units"] == 0, "days_of_cover"] = 0.0
    return inv


def _deep_copy_dfs(dfs: dict[str, pd.DataFrame]) -> dict[str, pd.DataFrame]:
    """Return deep copies of all DataFrames so originals are untouched."""
    return {k: v.copy() for k, v in dfs.items()}


# ---------------------------------------------------------------------------
# 1. Creative Fatigue
# ---------------------------------------------------------------------------

def inject_creative_fatigue(
    dfs: dict[str, pd.DataFrame],
    campaign_id: str,
    creative_id: str,
    start_date: date,
    duration_days: int = 14,
) -> tuple[dict[str, pd.DataFrame], list[dict]]:
    """
    Perturbation:
      - CTR drops progressively by 35-50% over the window.
      - Impressions remain steady (slight rise allowed).
      - Spend is flat (unchanged).
      - Clicks fall → CPC surges.
      - Purchases fall → ROAS crashes.

    Returns modified dfs copy + list of truth rows.
    """
    dfs = _deep_copy_dfs(dfs)
    ad  = dfs["ad_performance"]
    window = _date_window(start_date, duration_days)

    mask = (
        ad["date"].isin(window)
        & (ad["campaign_id"] == campaign_id)
        & (ad["creative_id"] == creative_id)
    )

    rows_idx = ad.index[mask]

    for i, idx in enumerate(rows_idx):
        # Progressive fatigue: starts mild, gets worse each row (each day)
        # We'll sort by date to get proper progression
        pass

    # Sort within window for progressive decay
    window_df = ad.loc[mask].copy().sort_values("date")
    n = len(window_df)
    if n == 0:
        # Fallback: use all rows for this campaign in the window
        mask = ad["date"].isin(window) & (ad["campaign_id"] == campaign_id)
        window_df = ad.loc[mask].copy().sort_values("date")
        n = len(window_df)

    if n > 0:
        for step, (df_idx, row) in enumerate(window_df.iterrows()):
            # Progressive: day 1 = -35%, day N = -50%
            frac = step / max(n - 1, 1)          # 0.0 → 1.0
            drop = 0.35 + 0.15 * frac             # 0.35 → 0.50
            # Impressions unchanged (mild +1-2% noise handled by keeping original)
            old_clicks = int(row["clicks"])
            new_clicks = max(0, int(old_clicks * (1.0 - drop)))
            # Purchases drop proportionally
            old_purch  = int(row["purchases"])
            new_purch  = max(0, int(old_purch * (1.0 - drop)))
            # Revenue drops proportionally
            new_rev    = row["revenue"] * (1.0 - drop)

            ad.at[df_idx, "clicks"]    = new_clicks
            ad.at[df_idx, "purchases"] = new_purch
            ad.at[df_idx, "revenue"]   = round(new_rev, 4)

    dfs["ad_performance"] = _recompute_ad_derived(ad)

    # Ground truth: one row per day in window for this campaign
    truth_rows = []
    for d in sorted(window):
        truth_rows.append(dict(
            sim_date=d,
            incident_type="CREATIVE_FATIGUE",
            platform=campaign_id.split("_")[1] if "_" in campaign_id else "",
            campaign_id=campaign_id,
            sku="",
            is_decoy=False,
            label="alert",
        ))
    return dfs, truth_rows


# ---------------------------------------------------------------------------
# 2. Stockout
# ---------------------------------------------------------------------------

def inject_stockout(
    dfs: dict[str, pd.DataFrame],
    sku: str,
    start_date: date,
    duration_days: int = 10,
) -> tuple[dict[str, pd.DataFrame], list[dict]]:
    """
    Perturbation:
      - inventory.stock_units → 0; days_of_cover → 0.0
      - ad_performance (campaigns promoting this SKU): purchases & revenue → ~0
        while spend remains normal.
      - sales.units → 0 for this SKU.
    """
    dfs = _deep_copy_dfs(dfs)
    window = _date_window(start_date, duration_days)

    # --- inventory ---
    inv  = dfs["inventory"]
    imask = inv["date"].isin(window) & (inv["sku"] == sku)
    dfs["inventory"].loc[imask, "stock_units"]   = 0
    dfs["inventory"].loc[imask, "days_of_cover"] = 0.0

    # --- ad_performance: drop purchases & revenue to ~0 for campaigns with this SKU ---
    ad    = dfs["ad_performance"]
    amask = ad["date"].isin(window) & (ad["sku"] == sku)
    dfs["ad_performance"].loc[amask, "purchases"] = 0
    dfs["ad_performance"].loc[amask, "revenue"]   = 0.0
    dfs["ad_performance"] = _recompute_ad_derived(dfs["ad_performance"])

    # --- sales: units → 0, revenue → 0 ---
    sal   = dfs["sales"]
    smask = sal["date"].isin(window) & (sal["sku"] == sku)
    dfs["sales"].loc[smask, "units"]   = 0
    dfs["sales"].loc[smask, "revenue"] = 0.0

    truth_rows = []
    for d in sorted(window):
        truth_rows.append(dict(
            sim_date=d,
            incident_type="STOCKOUT",
            platform="",
            campaign_id="",
            sku=sku,
            is_decoy=False,
            label="alert",
        ))
    return dfs, truth_rows


# ---------------------------------------------------------------------------
# 3. Tracking Break
# ---------------------------------------------------------------------------

def inject_tracking_break(
    dfs: dict[str, pd.DataFrame],
    platform: str,
    campaign_id: str,
    start_date: date,
    duration_days: int = 7,
) -> tuple[dict[str, pd.DataFrame], list[dict]]:
    """
    Perturbation:
      - ad_performance: pixel-reported purchases & revenue drop 90-95%
        for that platform/campaign (spend stays normal).
      - sales & ga_funnel: remain completely healthy — store transactions
        and revenue are unaffected, proving the ad is driving sales but
        pixel attribution is broken.
    """
    dfs = _deep_copy_dfs(dfs)
    window = _date_window(start_date, duration_days)
    ad = dfs["ad_performance"]

    amask = (
        ad["date"].isin(window)
        & (ad["platform"] == platform)
        & (ad["campaign_id"] == campaign_id)
    )
    # Drop purchases and revenue 90-95%
    dfs["ad_performance"].loc[amask, "purchases"] = (
        (ad.loc[amask, "purchases"] * 0.05).clip(lower=0).astype(int)
    )
    dfs["ad_performance"].loc[amask, "revenue"] = (
        (ad.loc[amask, "revenue"] * 0.05).round(4)
    )
    dfs["ad_performance"] = _recompute_ad_derived(dfs["ad_performance"])
    # sales and ga_funnel intentionally left unchanged — that's the symptom.

    truth_rows = []
    for d in sorted(window):
        truth_rows.append(dict(
            sim_date=d,
            incident_type="TRACKING_BREAK",
            platform=platform,
            campaign_id=campaign_id,
            sku="",
            is_decoy=False,
            label="alert",
        ))
    return dfs, truth_rows


# ---------------------------------------------------------------------------
# 4. Margin Squeeze
# ---------------------------------------------------------------------------

def inject_margin_squeeze(
    dfs: dict[str, pd.DataFrame],
    sku: str,
    start_date: date,
    duration_days: int = 14,
) -> tuple[dict[str, pd.DataFrame], list[dict]]:
    """
    Perturbation:
      - sku_master.cogs increases by 60% → margin_pct falls below 20%.
      - In sales, discount may also spike (we handle via cogs to keep it simple).
      - Spend & volume may remain high, but unit profitability is destroyed.

    Note: sku_master is static (one row per SKU), so the squeeze is persistent
    for the full duration. We lower margin_pct to 10-15% for the injection.
    """
    dfs = _deep_copy_dfs(dfs)
    sm  = dfs["sku_master"]

    sku_mask = sm["sku"] == sku
    if sku_mask.any():
        old_cogs   = float(sm.loc[sku_mask, "cogs"].values[0])
        new_cogs   = old_cogs * 1.60          # +60% COGS
        # price is cogs / (1 - margin), keep price fixed → recalc margin
        old_margin = float(sm.loc[sku_mask, "margin_pct"].values[0])
        price      = old_cogs / (1.0 - old_margin)
        new_margin = max(0.05, 1.0 - (new_cogs / price))   # squeeze but floor at 5%
        new_margin = min(new_margin, 0.19)                  # cap at 19% (< 20% threshold)

        dfs["sku_master"].loc[sku_mask, "cogs"]       = round(new_cogs, 4)
        dfs["sku_master"].loc[sku_mask, "margin_pct"] = round(new_margin, 6)

    # Also spike discounts in sales during the window for realism
    window = _date_window(start_date, duration_days)
    sal    = dfs["sales"]
    smask  = sal["date"].isin(window) & (sal["sku"] == sku)
    dfs["sales"].loc[smask, "discount"] = 0.40

    truth_rows = []
    for d in sorted(window):
        truth_rows.append(dict(
            sim_date=d,
            incident_type="MARGIN_SQUEEZE",
            platform="",
            campaign_id="",
            sku=sku,
            is_decoy=False,
            label="alert",
        ))
    return dfs, truth_rows


# ---------------------------------------------------------------------------
# 5. Holiday Spike Decoy  (is_decoy=True, label="no_alert")
# ---------------------------------------------------------------------------

def inject_holiday_spike_decoy(
    dfs: dict[str, pd.DataFrame],
    start_date: date,
    duration_days: int = 3,
) -> tuple[dict[str, pd.DataFrame], list[dict]]:
    """
    DECOY — must NOT trigger an alert.
    Perturbation:
      - Spend +40%, Impressions +50%, Clicks +40%, Purchases +100%, Revenue +120%.
      - ROAS goes UP.
      - external_events has a corresponding holiday entry.
    """
    dfs = _deep_copy_dfs(dfs)
    window = _date_window(start_date, duration_days)
    ad = dfs["ad_performance"]

    amask = ad["date"].isin(window)
    dfs["ad_performance"].loc[amask, "spend"]       = (ad.loc[amask, "spend"]       * 1.40).round(4)
    dfs["ad_performance"].loc[amask, "impressions"] = (ad.loc[amask, "impressions"] * 1.50).astype(int)
    dfs["ad_performance"].loc[amask, "clicks"]      = (ad.loc[amask, "clicks"]      * 1.40).astype(int)
    dfs["ad_performance"].loc[amask, "purchases"]   = (ad.loc[amask, "purchases"]   * 2.00).astype(int)
    dfs["ad_performance"].loc[amask, "revenue"]     = (ad.loc[amask, "revenue"]     * 2.20).round(4)
    dfs["ad_performance"] = _recompute_ad_derived(dfs["ad_performance"])

    # Add to external_events
    event_rows = []
    for d in sorted(window):
        event_rows.append({"date": d, "type": "holiday", "name": "Labor Day Sale"})
    new_events = pd.DataFrame(event_rows)
    new_events["date"] = pd.to_datetime(new_events["date"]).dt.date
    dfs["external_events"] = pd.concat(
        [dfs["external_events"], new_events], ignore_index=True
    ).drop_duplicates(subset=["date", "type"])

    truth_rows = []
    for d in sorted(window):
        truth_rows.append(dict(
            sim_date=d,
            incident_type="HOLIDAY_DEMAND",
            platform="",
            campaign_id="",
            sku="",
            is_decoy=True,
            label="no_alert",
        ))
    return dfs, truth_rows


# ---------------------------------------------------------------------------
# 6. Planned Promo Decoy  (is_decoy=True, label="no_alert")
# ---------------------------------------------------------------------------

def inject_planned_promo_decoy(
    dfs: dict[str, pd.DataFrame],
    campaign_id: str,
    sku: str,
    start_date: date,
    duration_days: int = 5,
) -> tuple[dict[str, pd.DataFrame], list[dict]]:
    """
    DECOY — must NOT trigger an alert.
    Perturbation:
      - Spend doubles (+100%), Clicks double (+100%), Purchases double (+100%).
      - Revenue doubles — CAC and ROAS remain stable.
      - external_events gets a "Planned Summer Flash Sale" promo entry.
    """
    dfs = _deep_copy_dfs(dfs)
    window = _date_window(start_date, duration_days)
    ad  = dfs["ad_performance"]
    sal = dfs["sales"]

    # ad_performance: symmetric doubling for this campaign
    amask = ad["date"].isin(window) & (ad["campaign_id"] == campaign_id)
    dfs["ad_performance"].loc[amask, "spend"]       = (ad.loc[amask, "spend"]       * 2.0).round(4)
    dfs["ad_performance"].loc[amask, "impressions"] = (ad.loc[amask, "impressions"] * 2.0).astype(int)
    dfs["ad_performance"].loc[amask, "clicks"]      = (ad.loc[amask, "clicks"]      * 2.0).astype(int)
    dfs["ad_performance"].loc[amask, "purchases"]   = (ad.loc[amask, "purchases"]   * 2.0).astype(int)
    dfs["ad_performance"].loc[amask, "revenue"]     = (ad.loc[amask, "revenue"]     * 2.0).round(4)
    dfs["ad_performance"] = _recompute_ad_derived(dfs["ad_performance"])

    # sales: double units for this SKU
    smask = sal["date"].isin(window) & (sal["sku"] == sku)
    dfs["sales"].loc[smask, "units"]   = (sal.loc[smask, "units"]   * 2.0).astype(int)
    dfs["sales"].loc[smask, "revenue"] = (sal.loc[smask, "revenue"] * 2.0).round(4)

    # external_events
    event_rows = []
    for d in sorted(window):
        event_rows.append({"date": d, "type": "promo", "name": "Planned Summer Flash Sale"})
    new_events = pd.DataFrame(event_rows)
    new_events["date"] = pd.to_datetime(new_events["date"]).dt.date
    dfs["external_events"] = pd.concat(
        [dfs["external_events"], new_events], ignore_index=True
    ).drop_duplicates(subset=["date", "type"])

    truth_rows = []
    for d in sorted(window):
        truth_rows.append(dict(
            sim_date=d,
            incident_type="PLANNED_PROMO",
            platform=campaign_id.split("_")[1] if "_" in campaign_id else "",
            campaign_id=campaign_id,
            sku=sku,
            is_decoy=True,
            label="no_alert",
        ))
    return dfs, truth_rows


# ---------------------------------------------------------------------------
# 7. Master Orchestrator: inject_golden_path
# ---------------------------------------------------------------------------

def inject_golden_path(
    dfs: dict[str, pd.DataFrame],
    seed: int = 42,
) -> tuple[dict[str, pd.DataFrame], pd.DataFrame]:
    """
    Orchestrates injection of all 4 Golden Path incidents + 2 Decoys at
    non-overlapping windows across the 180-day timeline.

    Timeline (start_date = 2024-06-01, day 0 = 2024-06-01):
      Day 45  (2024-07-16): CREATIVE_FATIGUE  — 14 days
      Day 75  (2024-08-15): STOCKOUT          — 10 days
      Day 105 (2024-09-14): TRACKING_BREAK    —  7 days
      Day 135 (2024-10-14): MARGIN_SQUEEZE    — 14 days
      Day 155 (2024-11-03): HOLIDAY_DEMAND    —  3 days  (decoy)
      Day 165 (2024-11-13): PLANNED_PROMO     —  5 days  (decoy)

    Returns
    -------
    (modified_dfs, truth_df)
      modified_dfs : dict[str, pd.DataFrame] – world data with injections applied
      truth_df     : pd.DataFrame            – ground-truth table (matches DDL)
    """
    rng = np.random.default_rng(seed)
    sim_start = date(2024, 6, 1)

    # Resolve entity IDs from the world
    ad  = dfs["ad_performance"]
    sm  = dfs["sku_master"]

    # Pick a meta campaign for creative fatigue
    meta_camps = sorted(ad[ad["platform"] == "meta"]["campaign_id"].unique())
    cf_campaign = meta_camps[0] if meta_camps else "camp_meta_01"
    # Pick a creative from that campaign
    cre_df   = dfs["creatives"]
    cf_cres  = cre_df[cre_df["campaign_id"] == cf_campaign]["creative_id"].tolist()
    cf_cre   = cf_cres[0] if cf_cres else "cre_001"

    # SKUs for stockout and margin squeeze — pick first 2 distinct ones
    all_skus = list(sm["sku"].unique())
    so_sku   = all_skus[0]    # stockout SKU
    mq_sku   = all_skus[1]    # margin squeeze SKU

    # Campaign for tracking break — google platform
    goog_camps = sorted(ad[ad["platform"] == "google"]["campaign_id"].unique())
    tb_campaign = goog_camps[0] if goog_camps else "camp_google_01"
    tb_platform = "google"

    # Campaign + SKU for promo decoy — tiktok platform
    tt_camps  = sorted(ad[ad["platform"] == "tiktok"]["campaign_id"].unique())
    pp_campaign = tt_camps[0] if tt_camps else "camp_tiktok_01"
    pp_sku     = all_skus[2]

    # Injection dates
    cf_start = sim_start + timedelta(days=45)   # Creative Fatigue
    so_start = sim_start + timedelta(days=75)   # Stockout
    tb_start = sim_start + timedelta(days=105)  # Tracking Break
    mq_start = sim_start + timedelta(days=135)  # Margin Squeeze
    hd_start = sim_start + timedelta(days=155)  # Holiday Decoy
    pp_start = sim_start + timedelta(days=165)  # Promo Decoy

    recorder = TruthRecorder()
    current_dfs = _deep_copy_dfs(dfs)

    # --- 1. Creative Fatigue ---
    current_dfs, cf_rows = inject_creative_fatigue(
        current_dfs, cf_campaign, cf_cre, cf_start, duration_days=14
    )
    for r in cf_rows:
        recorder.record_incident(
            sim_date=r["sim_date"],
            incident_type=r["incident_type"],
            platform=r["platform"],
            campaign_id=r["campaign_id"],
            sku=r["sku"],
            is_decoy=r["is_decoy"],
            label=r["label"],
        )

    # --- 2. Stockout ---
    current_dfs, so_rows = inject_stockout(
        current_dfs, so_sku, so_start, duration_days=10
    )
    for r in so_rows:
        recorder.record_incident(
            sim_date=r["sim_date"],
            incident_type=r["incident_type"],
            platform=r["platform"],
            campaign_id=r["campaign_id"],
            sku=r["sku"],
            is_decoy=r["is_decoy"],
            label=r["label"],
        )

    # --- 3. Tracking Break ---
    current_dfs, tb_rows = inject_tracking_break(
        current_dfs, tb_platform, tb_campaign, tb_start, duration_days=7
    )
    for r in tb_rows:
        recorder.record_incident(
            sim_date=r["sim_date"],
            incident_type=r["incident_type"],
            platform=r["platform"],
            campaign_id=r["campaign_id"],
            sku=r["sku"],
            is_decoy=r["is_decoy"],
            label=r["label"],
        )

    # --- 4. Margin Squeeze ---
    current_dfs, mq_rows = inject_margin_squeeze(
        current_dfs, mq_sku, mq_start, duration_days=14
    )
    for r in mq_rows:
        recorder.record_incident(
            sim_date=r["sim_date"],
            incident_type=r["incident_type"],
            platform=r["platform"],
            campaign_id=r["campaign_id"],
            sku=r["sku"],
            is_decoy=r["is_decoy"],
            label=r["label"],
        )

    # --- 5. Holiday Decoy ---
    current_dfs, hd_rows = inject_holiday_spike_decoy(
        current_dfs, hd_start, duration_days=3
    )
    for r in hd_rows:
        recorder.record_incident(
            sim_date=r["sim_date"],
            incident_type=r["incident_type"],
            platform=r["platform"],
            campaign_id=r["campaign_id"],
            sku=r["sku"],
            is_decoy=r["is_decoy"],
            label=r["label"],
        )

    # --- 6. Planned Promo Decoy ---
    current_dfs, pp_rows = inject_planned_promo_decoy(
        current_dfs, pp_campaign, pp_sku, pp_start, duration_days=5
    )
    for r in pp_rows:
        recorder.record_incident(
            sim_date=r["sim_date"],
            incident_type=r["incident_type"],
            platform=r["platform"],
            campaign_id=r["campaign_id"],
            sku=r["sku"],
            is_decoy=r["is_decoy"],
            label=r["label"],
        )

    truth_df = recorder.to_dataframe()
    return current_dfs, truth_df
