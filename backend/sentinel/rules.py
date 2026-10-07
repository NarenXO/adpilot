from datetime import date, timedelta
from typing import List, Dict, Optional, Any
import pandas as pd

from backend.contracts import Scope

def _to_date(val: Any) -> Optional[date]:
    if val is None or pd.isna(val):
        return None
    if isinstance(val, date):
        return val
    try:
        return pd.to_datetime(val).date()
    except Exception:
        return None

def check_creative_fatigue(
    df: pd.DataFrame,
    sim_date: Optional[date] = None,
    threshold_pct: float = 25.0,
    **kwargs
) -> List[Dict]:
    """
    Flag if CTR drops > 25% over 3 days on active creative.
    """
    if df is None or df.empty or "ctr" not in df.columns:
        return []

    data = df.copy()
    has_date = "date" in data.columns
    if has_date:
        data["_dt"] = pd.to_datetime(data["date"]).dt.date

    # Determine target sim_date
    target_d = _to_date(sim_date)
    if target_d is None and has_date:
        target_d = data["_dt"].max()

    # Identify creative column
    creative_col = "creative_id" if "creative_id" in data.columns else None
    if not creative_col:
        return []

    alerts: List[Dict] = []
    
    # Group by creative and relevant scope dimensions
    group_cols = [c for c in ["platform", "campaign_id", "sku", "creative_id"] if c in data.columns]
    
    for _, group in data.groupby(group_cols, as_index=False):
        if group.empty:
            continue

        if has_date:
            group = group.sort_values("_dt")
            # Find current record
            curr_mask = group["_dt"] == target_d if target_d is not None else group.index == group.index[-1]
            curr_rows = group[curr_mask]
            if curr_rows.empty:
                continue
            curr_row = curr_rows.iloc[-1]
            curr_date = curr_row["_dt"]

            # Active creative check: spend > 0 or impressions > 0 or active flag
            spend = float(curr_row.get("spend", 0.0) or 0.0)
            impressions = int(curr_row.get("impressions", 0) or 0)
            if spend <= 0 and impressions <= 0 and "active" in curr_row and not curr_row["active"]:
                continue

            curr_ctr = float(curr_row["ctr"])

            # Find 3-day baseline: record 3 days prior or the earliest within [curr_date - 3, curr_date - 1]
            prior_date = curr_date - timedelta(days=3)
            prior_rows = group[group["_dt"] <= prior_date]
            if prior_rows.empty:
                # If exact 3-day prior not found, check earliest within 3-day window
                prior_rows = group[group["_dt"] < curr_date]
                if prior_rows.empty:
                    continue
            baseline_row = prior_rows.iloc[-1]
            baseline_ctr = float(baseline_row["ctr"])
        else:
            # Without explicit dates, compare last row to row 3 steps earlier
            if len(group) < 2:
                continue
            curr_row = group.iloc[-1]
            baseline_idx = max(0, len(group) - 4)
            baseline_row = group.iloc[baseline_idx]
            curr_ctr = float(curr_row["ctr"])
            baseline_ctr = float(baseline_row["ctr"])
            spend = float(curr_row.get("spend", 0.0) or 0.0)
            curr_date = target_d

        if baseline_ctr <= 0:
            continue

        drop_pct = ((baseline_ctr - curr_ctr) / baseline_ctr) * 100.0

        if drop_pct > threshold_pct:
            scope = Scope(
                platform=str(curr_row["platform"]) if "platform" in curr_row and pd.notna(curr_row["platform"]) else None,
                campaign_id=str(curr_row["campaign_id"]) if "campaign_id" in curr_row and pd.notna(curr_row["campaign_id"]) else None,
                sku=str(curr_row["sku"]) if "sku" in curr_row and pd.notna(curr_row["sku"]) else None,
                creative_id=str(curr_row["creative_id"]) if "creative_id" in curr_row and pd.notna(curr_row["creative_id"]) else None,
            )
            alerts.append({
                "metric": "ctr",
                "scope": scope,
                "magnitude_pct": round(drop_pct, 2),
                "direction": "down",
                "detector": "creative_fatigue",
                "confidence": 0.92,
                "spend": spend,
                "sim_date": curr_date,
            })

    return alerts

def check_stockout_risk(
    inventory_df: pd.DataFrame,
    ad_df: Optional[pd.DataFrame] = None,
    sim_date: Optional[date] = None,
    threshold_doc: float = 2.0,
    **kwargs
) -> List[Dict]:
    """
    Flag if Days of Cover < 2.0 on actively promoted SKU.
    """
    if inventory_df is None or inventory_df.empty or "days_of_cover" not in inventory_df.columns:
        return []

    inv = inventory_df.copy()
    has_date = "date" in inv.columns
    if has_date:
        inv["_dt"] = pd.to_datetime(inv["date"]).dt.date

    target_d = _to_date(sim_date)
    if target_d is None and has_date:
        target_d = inv["_dt"].max()

    # Filter inventory on target date if date present
    if has_date and target_d is not None:
        inv_eval = inv[inv["_dt"] == target_d]
        if inv_eval.empty:
            inv_eval = inv[inv["_dt"] == inv["_dt"].max()]
    else:
        inv_eval = inv

    # Map active promotion and spend from ad_performance if provided
    active_skus = set()
    sku_ad_info: Dict[str, Dict[str, Any]] = {}

    if ad_df is not None and not ad_df.empty and "sku" in ad_df.columns:
        ad = ad_df.copy()
        if "date" in ad.columns:
            ad["_dt"] = pd.to_datetime(ad["date"]).dt.date
            if target_d is not None:
                ad_target = ad[ad["_dt"] == target_d]
                if not ad_target.empty:
                    ad = ad_target
        
        # Check active spend
        spend_col = "spend" if "spend" in ad.columns else None
        for sku, group in ad.groupby("sku"):
            sku_str = str(sku)
            sku_spend = float(group[spend_col].sum()) if spend_col else 0.0
            if sku_spend > 0 or len(group) > 0:
                active_skus.add(sku_str)
                first_row = group.iloc[0]
                sku_ad_info[sku_str] = {
                    "spend": sku_spend,
                    "platform": str(first_row["platform"]) if "platform" in first_row and pd.notna(first_row["platform"]) else None,
                    "campaign_id": str(first_row["campaign_id"]) if "campaign_id" in first_row and pd.notna(first_row["campaign_id"]) else None,
                }
    else:
        # If ad_df is not provided, consider all SKUs in inventory
        active_skus = {str(s) for s in inv_eval["sku"].dropna().unique()}

    alerts: List[Dict] = []

    for _, row in inv_eval.iterrows():
        sku = str(row.get("sku", ""))
        if not sku or (active_skus and sku not in active_skus):
            continue

        doc = float(row["days_of_cover"])
        if doc < threshold_doc:
            # Drop from threshold baseline
            mag_pct = round(((threshold_doc - doc) / threshold_doc) * 100.0, 2) if threshold_doc > 0 else 100.0

            ad_info = sku_ad_info.get(sku, {})
            spend = float(ad_info.get("spend", row.get("spend", 0.0) or 0.0))
            platform = ad_info.get("platform") or (str(row["platform"]) if "platform" in row and pd.notna(row["platform"]) else None)
            campaign_id = ad_info.get("campaign_id") or (str(row["campaign_id"]) if "campaign_id" in row and pd.notna(row["campaign_id"]) else None)

            scope = Scope(
                platform=platform,
                campaign_id=campaign_id,
                sku=sku,
            )
            row_date = row["_dt"] if has_date and "_dt" in row and pd.notna(row["_dt"]) else target_d

            alerts.append({
                "metric": "days_of_cover",
                "scope": scope,
                "magnitude_pct": mag_pct,
                "direction": "down",
                "detector": "stockout_risk",
                "confidence": 0.95,
                "spend": spend,
                "sim_date": row_date,
            })

    return alerts

def check_tracking_break(
    funnel_df: pd.DataFrame,
    baseline_df: Optional[pd.DataFrame] = None,
    sim_date: Optional[date] = None,
    ad_df: Optional[pd.DataFrame] = None,
    **kwargs
) -> List[Dict]:
    """
    Flag if Purchases drop > 75% with normal session volume (0.7x - 1.4x baseline).
    """
    if funnel_df is None or funnel_df.empty or "sessions" not in funnel_df.columns:
        return []

    fn = funnel_df.copy()
    has_date = "date" in fn.columns
    if has_date:
        fn["_dt"] = pd.to_datetime(fn["date"]).dt.date

    target_d = _to_date(sim_date)
    if target_d is None and has_date:
        target_d = fn["_dt"].max()

    purchases_col = "transactions" if "transactions" in fn.columns else ("purchases" if "purchases" in fn.columns else None)
    if not purchases_col:
        return []

    channel_col = "channel" if "channel" in fn.columns else ("platform" if "platform" in fn.columns else None)
    group_cols = [channel_col] if channel_col else []

    groups = fn.groupby(group_cols, as_index=False) if group_cols else [((), fn)]

    alerts: List[Dict] = []

    for _, group in groups:
        if group.empty:
            continue

        if has_date:
            group = group.sort_values("_dt")
            curr_mask = group["_dt"] == target_d if target_d is not None else group.index == group.index[-1]
            curr_rows = group[curr_mask]
            if curr_rows.empty:
                continue
            curr_row = curr_rows.iloc[-1]
            curr_date = curr_row["_dt"]

            # Baseline calculation
            if baseline_df is not None and not baseline_df.empty:
                base_fn = baseline_df
                if channel_col and channel_col in base_fn.columns and channel_col in curr_row:
                    base_fn = base_fn[base_fn[channel_col] == curr_row[channel_col]]
                baseline_sessions = float(base_fn["sessions"].mean())
                baseline_purchases = float(base_fn[purchases_col].mean())
            else:
                # Prior historical rows in funnel_df
                prior_rows = group[group["_dt"] < curr_date]
                if not prior_rows.empty:
                    baseline_sessions = float(prior_rows["sessions"].mean())
                    baseline_purchases = float(prior_rows[purchases_col].mean())
                elif "baseline_sessions" in curr_row and "baseline_purchases" in curr_row:
                    baseline_sessions = float(curr_row["baseline_sessions"])
                    baseline_purchases = float(curr_row["baseline_purchases"])
                else:
                    continue
        else:
            if len(group) < 2 and baseline_df is None and "baseline_sessions" not in group.columns:
                continue
            curr_row = group.iloc[-1]
            curr_date = target_d
            if baseline_df is not None:
                baseline_sessions = float(baseline_df["sessions"].mean())
                baseline_purchases = float(baseline_df[purchases_col].mean())
            elif "baseline_sessions" in curr_row:
                baseline_sessions = float(curr_row["baseline_sessions"])
                baseline_purchases = float(curr_row["baseline_purchases"])
            else:
                prior_rows = group.iloc[:-1]
                baseline_sessions = float(prior_rows["sessions"].mean())
                baseline_purchases = float(prior_rows[purchases_col].mean())

        curr_sessions = float(curr_row["sessions"])
        curr_purchases = float(curr_row[purchases_col])

        if baseline_sessions <= 0 or baseline_purchases <= 0:
            continue

        # Normal session volume condition: 0.7x - 1.4x baseline
        session_ratio = curr_sessions / baseline_sessions
        is_normal_volume = 0.70 <= session_ratio <= 1.40

        # Purchase drop > 75%
        purchase_drop_pct = ((baseline_purchases - curr_purchases) / baseline_purchases) * 100.0

        if is_normal_volume and purchase_drop_pct > 75.0:
            channel_val = str(curr_row[channel_col]) if channel_col and pd.notna(curr_row.get(channel_col)) else None
            
            # Extract daily spend from ad_df if available
            daily_spend = 0.0
            if ad_df is not None and not ad_df.empty and "spend" in ad_df.columns:
                ad_filtered = ad_df
                if "platform" in ad_df.columns and channel_val:
                    ad_filtered = ad_df[ad_df["platform"] == channel_val]
                if "date" in ad_filtered.columns and curr_date is not None:
                    ad_d_filtered = ad_filtered[pd.to_datetime(ad_filtered["date"]).dt.date == curr_date]
                    if not ad_d_filtered.empty:
                        ad_filtered = ad_d_filtered
                daily_spend = float(ad_filtered["spend"].sum())

            scope = Scope(platform=channel_val)
            alerts.append({
                "metric": "purchases",
                "scope": scope,
                "magnitude_pct": round(purchase_drop_pct, 2),
                "direction": "down",
                "detector": "tracking_break",
                "confidence": 0.95,
                "spend": daily_spend,
                "sim_date": curr_date,
            })

    return alerts

def check_margin_squeeze(
    sales_df: pd.DataFrame,
    sku_master_df: Optional[pd.DataFrame] = None,
    sim_date: Optional[date] = None,
    ad_df: Optional[pd.DataFrame] = None,
    threshold_margin_pct: float = 20.0,
    **kwargs
) -> List[Dict]:
    """
    Flag if effective margin % drops below 20% due to discounting or cost shifts.
    """
    if sales_df is None or sales_df.empty:
        return []

    sales = sales_df.copy()
    has_date = "date" in sales.columns
    if has_date:
        sales["_dt"] = pd.to_datetime(sales["date"]).dt.date

    target_d = _to_date(sim_date)
    if target_d is None and has_date:
        target_d = sales["_dt"].max()

    if has_date and target_d is not None:
        sales_eval = sales[sales["_dt"] == target_d]
        if sales_eval.empty:
            sales_eval = sales[sales["_dt"] == sales["_dt"].max()]
    else:
        sales_eval = sales

    # Build sku_master lookup
    cogs_map: Dict[str, float] = {}
    baseline_margin_map: Dict[str, float] = {}
    if sku_master_df is not None and not sku_master_df.empty:
        for _, sm_row in sku_master_df.iterrows():
            s = str(sm_row["sku"])
            cogs_map[s] = float(sm_row.get("cogs", 0.0) or 0.0)
            baseline_margin_map[s] = float(sm_row.get("margin_pct", 40.0) or 40.0)

    alerts: List[Dict] = []

    for _, row in sales_eval.iterrows():
        sku = str(row.get("sku", ""))
        channel = str(row["channel"]) if "channel" in row and pd.notna(row["channel"]) else (str(row["platform"]) if "platform" in row and pd.notna(row["platform"]) else None)

        # Calculate effective margin %
        if "effective_margin_pct" in row and pd.notna(row["effective_margin_pct"]):
            eff_margin = float(row["effective_margin_pct"])
        elif "margin_pct" in row and pd.notna(row["margin_pct"]) and "price" not in row:
            eff_margin = float(row["margin_pct"])
        else:
            price = float(row.get("price", 0.0) or 0.0)
            discount = float(row.get("discount", 0.0) or 0.0)
            net_price = price - discount
            cogs = cogs_map.get(sku, float(row.get("cogs", 0.0) or 0.0))

            if net_price > 0:
                eff_margin = ((net_price - cogs) / net_price) * 100.0
            else:
                eff_margin = 0.0

        if eff_margin < threshold_margin_pct:
            baseline_margin = baseline_margin_map.get(sku, 40.0)
            if baseline_margin > 0:
                drop_pct = ((baseline_margin - eff_margin) / baseline_margin) * 100.0
            else:
                drop_pct = threshold_margin_pct - eff_margin

            # Daily spend for SKU
            daily_spend = 0.0
            if ad_df is not None and not ad_df.empty and "spend" in ad_df.columns:
                ad_sku = ad_df[ad_df["sku"] == sku] if "sku" in ad_df.columns else ad_df
                if "date" in ad_sku.columns and target_d is not None:
                    ad_sku_d = ad_sku[pd.to_datetime(ad_sku["date"]).dt.date == target_d]
                    if not ad_sku_d.empty:
                        ad_sku = ad_sku_d
                daily_spend = float(ad_sku["spend"].sum())

            scope = Scope(platform=channel, sku=sku if sku else None)
            row_date = row["_dt"] if has_date and "_dt" in row and pd.notna(row["_dt"]) else target_d

            alerts.append({
                "metric": "margin_pct",
                "scope": scope,
                "magnitude_pct": max(0.0, round(drop_pct, 2)),
                "direction": "down",
                "detector": "margin_squeeze",
                "confidence": 0.90,
                "spend": daily_spend,
                "sim_date": row_date,
            })

    return alerts
