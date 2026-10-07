"""
backend/simulator/world.py
==========================
Deterministic 180-day synthetic data generator for AdPilot.
Produces DataFrames whose columns match the DDL exactly for:
  ad_performance, sales, sku_master, inventory, ga_funnel, creatives, external_events
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from datetime import date, timedelta


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
PLATFORMS        = ["meta", "google", "tiktok"]
N_SKUS           = 20
N_CAMPAIGNS      = 12          # 4 per platform
N_ADSETS         = 24          # 2 per campaign
N_CREATIVES      = 40
CATEGORIES       = ["skincare", "haircare", "wellness", "apparel"]
FORMATS          = ["video", "image", "carousel"]
HOOK_TYPES       = ["ugc", "founder", "demo", "testimonial", "offer"]
CHANNELS         = ["direct", "meta", "google", "tiktok"]

# Adstock decay
ADSTOCK_CARRY    = 0.6
ADSTOCK_NEW      = 0.4

# Hill curve exponent
ETA              = 1.3

# Weekly seasonality multipliers (Mon=0 … Sun=6)
WEEK_MULTIPLIER  = {0: 1.0, 1: 1.0, 2: 1.0, 3: 1.0, 4: 1.1, 5: 1.3, 6: 1.25}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _hill(spend: np.ndarray, E_max: float, K: float, eta: float = ETA) -> np.ndarray:
    """Hill-type diminishing returns: R(S) = E_max * S^η / (K^η + S^η)"""
    s_eta = np.power(spend, eta)
    k_eta = K ** eta
    return E_max * s_eta / (k_eta + s_eta)


def _safe_div(a: np.ndarray | float, b: np.ndarray | float) -> np.ndarray:
    """Element-wise division, 0 when denominator is 0."""
    b_arr = np.asarray(b, dtype=float)
    a_arr = np.asarray(a, dtype=float)
    return np.where(b_arr == 0, 0.0, a_arr / b_arr)


# ---------------------------------------------------------------------------
# Entity catalogue builders
# ---------------------------------------------------------------------------

def _build_sku_master(rng: np.random.Generator, start_date: date) -> pd.DataFrame:
    rows = []
    two_years_ago = start_date - timedelta(days=730)
    for i in range(1, N_SKUS + 1):
        sku_id   = f"sku_{i:03d}"
        category = CATEGORIES[(i - 1) % len(CATEGORIES)]
        name     = f"{category.capitalize()} Product {i:02d}"
        cogs     = float(rng.uniform(5, 40))
        # margin between 20% and 75%
        margin   = float(rng.uniform(0.20, 0.75))
        price    = cogs / (1 - margin)
        days_since = int(rng.integers(0, 730))
        launch   = two_years_ago + timedelta(days=days_since)
        rows.append({
            "sku":         sku_id,
            "name":        name,
            "category":    category,
            "cogs":        round(cogs, 4),
            "margin_pct":  round(margin, 6),
            "launch_date": launch,
        })
    return pd.DataFrame(rows)


def _build_creatives(rng: np.random.Generator, campaigns: list[str]) -> pd.DataFrame:
    rows = []
    for i in range(1, N_CREATIVES + 1):
        cre_id   = f"cre_{i:03d}"
        camp     = campaigns[int(rng.integers(0, len(campaigns)))]
        platform = camp.split("_")[1]           # camp_meta_01 → meta
        fmt      = FORMATS[int(rng.integers(0, len(FORMATS)))]
        hook     = HOOK_TYPES[int(rng.integers(0, len(HOOK_TYPES)))]
        age      = int(rng.integers(0, 121))    # 0-120
        rows.append({
            "creative_id": cre_id,
            "campaign_id": camp,
            "platform":    platform,
            "format":      fmt,
            "age_days":    age,
            "hook_type":   hook,
        })
    return pd.DataFrame(rows)


def _build_external_events(rng: np.random.Generator,
                            start_date: date, days: int) -> pd.DataFrame:
    end_date = start_date + timedelta(days=days - 1)

    # Fixed holidays (names + rough dates within the window)
    holidays = [
        ("Black Friday",    date(2024, 11, 29)),
        ("Cyber Monday",    date(2024, 12,  2)),
        ("Christmas",       date(2024, 12, 25)),
        ("Diwali",          date(2024, 11,  1)),
        ("New Year",        date(2024, 12, 31)),
        ("Valentine Day",   date(2024,  2, 14)),
        ("Mothers Day",     date(2024,  5, 12)),
    ]

    promos = [
        ("Flash Sale Q3",   date(2024,  7, 15)),
        ("Summer Clearance",date(2024,  8, 10)),
        ("Back to School",  date(2024,  8, 25)),
        ("Brand Anniversary",date(2024, 9, 20)),
    ]

    rows = []
    for name, d in holidays:
        if start_date <= d <= end_date:
            rows.append({"date": d, "type": "holiday", "name": name})

    for name, d in promos:
        if start_date <= d <= end_date:
            rows.append({"date": d, "type": "promo",   "name": name})

    # Ensure at least 5-8 holidays & 3-4 promos by generating random ones
    # if window doesn't capture enough fixed ones
    existing_holiday_dates = {r["date"] for r in rows if r["type"] == "holiday"}
    existing_promo_dates   = {r["date"] for r in rows if r["type"] == "promo"}

    all_dates = [start_date + timedelta(days=d) for d in range(days)]
    rng_dates = rng.choice(len(all_dates), size=20, replace=False)

    h_count = len(existing_holiday_dates)
    p_count = len(existing_promo_dates)

    for idx in rng_dates:
        d = all_dates[int(idx)]
        if h_count < 5 and d not in existing_holiday_dates and d not in existing_promo_dates:
            rows.append({"date": d, "type": "holiday", "name": f"Holiday Event {h_count+1}"})
            existing_holiday_dates.add(d)
            h_count += 1
        elif p_count < 3 and d not in existing_promo_dates and d not in existing_holiday_dates:
            rows.append({"date": d, "type": "promo",   "name": f"Promo Event {p_count+1}"})
            existing_promo_dates.add(d)
            p_count += 1
        if h_count >= 8 and p_count >= 4:
            break

    return pd.DataFrame(rows, columns=["date", "type", "name"])


# ---------------------------------------------------------------------------
# Main generator
# ---------------------------------------------------------------------------

def generate_world(seed: int = 42, days: int = 180,
                   start_date: str = "2024-06-01") -> dict[str, pd.DataFrame]:
    """
    Returns a dict with keys:
      'ad_performance', 'sales', 'sku_master', 'inventory',
      'ga_funnel', 'creatives', 'external_events'
    Each value is a pandas DataFrame matching the DDL schema exactly.
    Same seed → identical output every time.
    """
    rng = np.random.default_rng(seed)
    start = date.fromisoformat(start_date)

    # -----------------------------------------------------------------------
    # 1. Static entities
    # -----------------------------------------------------------------------
    sku_master = _build_sku_master(rng, start)
    skus       = list(sku_master["sku"])
    sku_price  = dict(zip(sku_master["sku"], sku_master["cogs"] / (1 - sku_master["margin_pct"])))
    sku_margin = dict(zip(sku_master["sku"], sku_master["margin_pct"]))

    # Campaigns: 4 per platform, named camp_meta_01 … camp_tiktok_04
    campaigns: list[str] = []
    for plat in PLATFORMS:
        for j in range(1, 5):
            campaigns.append(f"camp_{plat}_{j:02d}")

    # Adsets: 2 per campaign
    adsets: dict[str, list[str]] = {}
    for camp in campaigns:
        adsets[camp] = [f"{camp}_as{k}" for k in range(1, 3)]

    # Map each campaign → platform
    camp_platform = {c: c.split("_")[1] for c in campaigns}

    # Each campaign → 1-3 SKUs (deterministic)
    camp_skus: dict[str, list[str]] = {}
    for camp in campaigns:
        n = int(rng.integers(1, 4))
        chosen = list(rng.choice(skus, size=n, replace=False))
        camp_skus[camp] = chosen

    # Per-campaign Hill curve parameters (deterministic)
    camp_K: dict[str, float]     = {}
    camp_Emax: dict[str, float]  = {}
    camp_base_spend: dict[str, float] = {}
    camp_cpc_base: dict[str, float]   = {}
    camp_cvr_base: dict[str, float]   = {}

    for camp in campaigns:
        camp_K[camp]          = float(rng.uniform(500, 2000))
        camp_Emax[camp]       = float(rng.uniform(3000, 15000))
        camp_base_spend[camp] = float(rng.uniform(200, 1200))
        camp_cpc_base[camp]   = float(rng.uniform(0.40, 2.50))
        camp_cvr_base[camp]   = float(rng.uniform(0.02, 0.05))

    # Creatives
    creatives_df = _build_creatives(rng, campaigns)
    # Map creative → campaign
    cre_to_camp: dict[str, str] = dict(zip(creatives_df["creative_id"],
                                           creatives_df["campaign_id"]))

    # External events
    external_events = _build_external_events(rng, start, days)
    # Build date→type lookup for fast access
    event_date_type: dict[date, str] = {}
    for _, row in external_events.iterrows():
        event_date_type[row["date"]] = row["type"]

    # -----------------------------------------------------------------------
    # 2. Day-loop: generate ad_performance, sales, inventory, ga_funnel
    # -----------------------------------------------------------------------
    # Initialise adstock per campaign
    adstock: dict[str, float] = {c: 0.0 for c in campaigns}

    # Initialise inventory per SKU
    stock: dict[str, int] = {
        s: int(rng.integers(1500, 4001)) for s in skus
    }
    # Per-SKU restock countdown (every 10-15 days)
    restock_in: dict[str, int] = {
        s: int(rng.integers(10, 16)) for s in skus
    }
    # Rolling 7-day sold units for days_of_cover
    sold_history: dict[str, list[int]] = {s: [] for s in skus}

    # Per-creative CTR baseline with slow drift
    cre_ids  = list(creatives_df["creative_id"])
    ctr_base = {c: float(rng.uniform(0.015, 0.035)) for c in cre_ids}

    ad_rows:  list[dict] = []
    sales_rows: list[dict] = []
    inv_rows:   list[dict] = []
    funnel_rows: list[dict] = []

    for day_idx in range(days):
        cur_date = start + timedelta(days=day_idx)
        weekday  = cur_date.weekday()          # 0=Mon … 6=Sun
        season   = WEEK_MULTIPLIER[weekday]

        event_type = event_date_type.get(cur_date)

        # -------------------------------------------------------------------
        # Per-campaign ad performance rows
        # -------------------------------------------------------------------
        # Track clicks per channel for ga_funnel
        channel_clicks: dict[str, float] = {p: 0.0 for p in PLATFORMS}

        for camp in campaigns:
            plat = camp_platform[camp]

            # Daily spend with small noise
            noise = float(rng.uniform(0.85, 1.15))
            spend = camp_base_spend[camp] * noise

            # Adstock
            adstock[camp] = ADSTOCK_CARRY * adstock[camp] + ADSTOCK_NEW * spend
            eff_spend = adstock[camp]

            # Revenue from Hill curve on effective spend
            camp_rev = float(_hill(np.array([eff_spend]), camp_Emax[camp], camp_K[camp])[0])

            # CPC with noise
            cpc_val = camp_cpc_base[camp] * float(rng.uniform(0.9, 1.1))
            clicks_raw = spend / cpc_val if cpc_val > 0 else 0.0

            # Seasonality
            clicks_raw *= season

            # Event lifts
            if event_type == "holiday":
                impressions_mult = 1.40
                clicks_raw *= 1.0       # holiday: +40% impressions, conversions
                conv_lift = 1.60
            elif event_type == "promo":
                impressions_mult = 1.0
                clicks_raw *= 1.50      # promo: +50% clicks
                conv_lift = 1.80        # +80% purchases
            else:
                impressions_mult = 1.0
                conv_lift = 1.0

            # CTR baseline: use a random creative from this campaign
            camp_cres = creatives_df[creatives_df["campaign_id"] == camp]["creative_id"].tolist()
            if camp_cres:
                chosen_cre = camp_cres[day_idx % len(camp_cres)]
                # Slow drift
                ctr_base[chosen_cre] += float(rng.uniform(-0.0002, 0.0002))
                ctr_base[chosen_cre] = max(0.005, min(0.06, ctr_base[chosen_cre]))
                ctr_val = ctr_base[chosen_cre]
            else:
                chosen_cre = "cre_001"
                ctr_val = 0.02

            clicks  = max(0, int(clicks_raw))
            if ctr_val > 0:
                impressions = max(clicks, int(clicks_raw / ctr_val * impressions_mult))
            else:
                impressions = max(clicks, int(clicks_raw * 50 * impressions_mult))

            # Conversion rate → purchases
            cvr = camp_cvr_base[camp] * conv_lift * float(rng.uniform(0.85, 1.15))
            cvr = min(cvr, 0.20)
            purchases = int(clicks * cvr)

            # Revenue split across campaign SKUs proportionally
            camp_sku_list = camp_skus[camp]
            sku_primary   = camp_sku_list[0]
            price_primary = sku_price[sku_primary]
            # AOV: price × 1-2 units
            aov = price_primary * float(rng.uniform(1.0, 2.0))
            revenue = min(camp_rev, purchases * aov + float(rng.uniform(0, 50)))
            revenue = max(0.0, revenue)

            # Derived metrics
            cpc_d  = float(_safe_div(spend, clicks))
            ctr_d  = float(_safe_div(clicks, impressions))
            cpm_d  = float(_safe_div(spend, impressions)) * 1000.0
            roas_d = float(_safe_div(revenue, spend))

            # Pick one adset per row
            adset_id = adsets[camp][day_idx % len(adsets[camp])]

            ad_rows.append({
                "date":        cur_date,
                "platform":    plat,
                "campaign_id": camp,
                "adset_id":    adset_id,
                "creative_id": chosen_cre,
                "sku":         sku_primary,
                "spend":       round(spend, 4),
                "impressions": impressions,
                "clicks":      clicks,
                "purchases":   purchases,
                "revenue":     round(revenue, 4),
                "cpc":         round(cpc_d, 6),
                "ctr":         round(ctr_d, 6),
                "cpm":         round(cpm_d, 6),
                "roas":        round(roas_d, 6),
            })

            channel_clicks[plat] += clicks_raw

        # -------------------------------------------------------------------
        # Sales: each SKU × each channel
        # -------------------------------------------------------------------
        daily_sku_sold: dict[str, int] = {s: 0 for s in skus}

        for sku in skus:
            price  = sku_price[sku]
            for ch in CHANNELS:
                units  = int(rng.integers(5, 81))
                # Occasional discount
                if float(rng.random()) < 0.10:
                    discount = float(rng.uniform(0.10, 0.30))
                else:
                    discount = 0.0
                rev = units * price * (1.0 - discount)
                sales_rows.append({
                    "date":     cur_date,
                    "channel":  ch,
                    "sku":      sku,
                    "units":    units,
                    "price":    round(price, 4),
                    "discount": round(discount, 4),
                    "revenue":  round(rev, 4),
                })
                daily_sku_sold[sku] += units

        # -------------------------------------------------------------------
        # Inventory
        # -------------------------------------------------------------------
        for sku in skus:
            sold_today = daily_sku_sold[sku]
            sold_history[sku].append(sold_today)
            if len(sold_history[sku]) > 7:
                sold_history[sku].pop(0)

            # Subtract sold units (floor at 0)
            stock[sku] = max(0, stock[sku] - sold_today)

            # Restock check
            restock_in[sku] -= 1
            if stock[sku] < 200:
                restock_in[sku] = 0
            if restock_in[sku] <= 0:
                restock_qty  = int(rng.integers(1500, 3001))
                stock[sku]  += restock_qty
                restock_in[sku] = int(rng.integers(10, 16))

            # Days of cover
            avg7 = np.mean(sold_history[sku]) if sold_history[sku] else 0
            doc  = float(stock[sku] / avg7) if avg7 > 0 else 999.0
            doc  = min(doc, 999.0)

            inv_rows.append({
                "date":          cur_date,
                "sku":           sku,
                "stock_units":   int(stock[sku]),
                "days_of_cover": round(doc, 4),
            })

        # -------------------------------------------------------------------
        # GA Funnel: per channel per day
        # -------------------------------------------------------------------
        for ch in CHANNELS:
            base_clicks = channel_clicks.get(ch, 0.0) if ch in PLATFORMS else sum(channel_clicks.values()) * 0.05
            sessions    = int(base_clicks * float(rng.uniform(1.1, 1.3)))
            add_to_cart = int(sessions * float(rng.uniform(0.25, 0.40)))
            checkout    = int(add_to_cart * float(rng.uniform(0.60, 0.75)))
            transactions= int(checkout * float(rng.uniform(0.70, 0.85)))
            funnel_rows.append({
                "date":         cur_date,
                "channel":      ch,
                "sessions":     sessions,
                "add_to_cart":  add_to_cart,
                "checkout":     checkout,
                "transactions": transactions,
            })

    # -----------------------------------------------------------------------
    # 3. Assemble DataFrames
    # -----------------------------------------------------------------------
    ad_performance = pd.DataFrame(ad_rows)
    sales          = pd.DataFrame(sales_rows)
    inventory      = pd.DataFrame(inv_rows)
    ga_funnel      = pd.DataFrame(funnel_rows)

    # Ensure correct dtypes
    ad_performance["date"] = pd.to_datetime(ad_performance["date"]).dt.date
    sales["date"]          = pd.to_datetime(sales["date"]).dt.date
    inventory["date"]      = pd.to_datetime(inventory["date"]).dt.date
    ga_funnel["date"]      = pd.to_datetime(ga_funnel["date"]).dt.date
    sku_master["launch_date"] = pd.to_datetime(sku_master["launch_date"]).dt.date
    external_events["date"]   = pd.to_datetime(external_events["date"]).dt.date

    # Enforce integer types
    ad_performance["impressions"] = ad_performance["impressions"].astype(int)
    ad_performance["clicks"]      = ad_performance["clicks"].astype(int)
    ad_performance["purchases"]   = ad_performance["purchases"].astype(int)
    sales["units"]                = sales["units"].astype(int)
    inventory["stock_units"]      = inventory["stock_units"].astype(int)
    ga_funnel["sessions"]         = ga_funnel["sessions"].astype(int)
    ga_funnel["add_to_cart"]      = ga_funnel["add_to_cart"].astype(int)
    ga_funnel["checkout"]         = ga_funnel["checkout"].astype(int)
    ga_funnel["transactions"]     = ga_funnel["transactions"].astype(int)

    return {
        "ad_performance":  ad_performance,
        "sales":           sales,
        "sku_master":      sku_master,
        "inventory":       inventory,
        "ga_funnel":       ga_funnel,
        "creatives":       creatives_df,
        "external_events": external_events,
    }
