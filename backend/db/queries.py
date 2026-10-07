import duckdb
import pandas as pd
from typing import Optional
from datetime import date
from backend.db.connection import get_connection

def get_ad_performance(
    start_date: str,
    end_date: str,
    platform: Optional[str] = None,
    campaign_id: Optional[str] = None
) -> pd.DataFrame:
    conn = get_connection()
    query = "SELECT * FROM ad_performance WHERE date >= ? AND date <= ?"
    params = [start_date, end_date]
    if platform:
        query += " AND platform = ?"
        params.append(platform)
    if campaign_id:
        query += " AND campaign_id = ?"
        params.append(campaign_id)
    query += " ORDER BY date DESC"
    df = conn.execute(query, params).df()
    conn.close()
    return df

def get_sales(
    start_date: str,
    end_date: str,
    sku: Optional[str] = None,
    channel: Optional[str] = None
) -> pd.DataFrame:
    conn = get_connection()
    query = "SELECT * FROM sales WHERE date >= ? AND date <= ?"
    params = [start_date, end_date]
    if sku:
        query += " AND sku = ?"
        params.append(sku)
    if channel:
        query += " AND channel = ?"
        params.append(channel)
    query += " ORDER BY date DESC"
    df = conn.execute(query, params).df()
    conn.close()
    return df

def get_sku_master() -> pd.DataFrame:
    conn = get_connection()
    df = conn.execute("SELECT * FROM sku_master").df()
    conn.close()
    return df

def get_inventory(as_of_date: Optional[str] = None) -> pd.DataFrame:
    conn = get_connection()
    if as_of_date:
        query = "SELECT * FROM inventory WHERE date = CAST(? AS DATE)"
        df = conn.execute(query, [as_of_date]).df()
    else:
        # Latest date per sku
        query = """
        SELECT i.* 
        FROM inventory i
        JOIN (
            SELECT sku, MAX(date) as max_date 
            FROM inventory 
            GROUP BY sku
        ) latest ON i.sku = latest.sku AND i.date = latest.max_date
        """
        df = conn.execute(query).df()
    conn.close()
    return df

def get_ga_funnel(
    start_date: str,
    end_date: str,
    channel: Optional[str] = None
) -> pd.DataFrame:
    conn = get_connection()
    query = "SELECT * FROM ga_funnel WHERE date >= ? AND date <= ?"
    params = [start_date, end_date]
    if channel:
        query += " AND channel = ?"
        params.append(channel)
    query += " ORDER BY date DESC"
    df = conn.execute(query, params).df()
    conn.close()
    return df

def get_creatives(campaign_id: Optional[str] = None) -> pd.DataFrame:
    conn = get_connection()
    if campaign_id:
        query = "SELECT * FROM creatives WHERE campaign_id = ?"
        df = conn.execute(query, [campaign_id]).df()
    else:
        df = conn.execute("SELECT * FROM creatives").df()
    conn.close()
    return df

def get_external_events(start_date: str, end_date: str) -> pd.DataFrame:
    conn = get_connection()
    query = "SELECT * FROM external_events WHERE date >= ? AND date <= ? ORDER BY date DESC"
    df = conn.execute(query, [start_date, end_date]).df()
    conn.close()
    return df

def get_sku_inventory_margin() -> list[dict]:
    # Combine data from sku_master, inventory, ad_performance
    conn = get_connection()
    
    # 1. SKU master
    sku_master_df = conn.execute("SELECT * FROM sku_master").df()
    
    # 2. Inventory (latest)
    inv_df = get_inventory()
    
    # 3. Ad performance (last 7 days)
    # Find max date first
    max_date_row = conn.execute("SELECT MAX(date) FROM ad_performance").fetchone()
    if not max_date_row or not max_date_row[0]:
        conn.close()
        return []
    
    max_date = pd.to_datetime(max_date_row[0])
    start_date = (max_date - pd.Timedelta(days=6)).strftime("%Y-%m-%d")
    end_date = max_date.strftime("%Y-%m-%d")
    
    ad_df = conn.execute(
        "SELECT sku, spend, revenue FROM ad_performance WHERE date >= ? AND date <= ?",
        [start_date, end_date]
    ).df()
    conn.close()
    
    # Group ad_performance by sku
    ad_grouped = ad_df.groupby("sku")[["spend", "revenue"]].sum().reset_index()
    
    # Merge them all
    res_df = pd.merge(sku_master_df, inv_df, on="sku", how="left")
    res_df = pd.merge(res_df, ad_grouped, on="sku", how="left")
    
    # Fill NAs
    res_df["spend"] = res_df["spend"].fillna(0.0)
    res_df["revenue"] = res_df["revenue"].fillna(0.0)
    res_df["days_of_cover"] = res_df["days_of_cover"].fillna(0.0)
    
    bubbles = []
    for _, row in res_df.iterrows():
        sku = row["sku"]
        name = row["name"]
        category = row["category"]
        margin_pct = row["margin_pct"]
        days_of_cover = row["days_of_cover"]
        spend = row["spend"]
        revenue = row["revenue"]
        
        # Quadrant Logic
        roas = (revenue / spend) if spend > 0 else 0.0
        
        if margin_pct > 0.50 and days_of_cover > 14:
            quadrant = "scale"
        elif margin_pct > 0.50 and days_of_cover <= 7:
            quadrant = "protect"
        elif margin_pct < 0.20 and roas < 2.0:
            quadrant = "pause"
        elif margin_pct > 0.40 and days_of_cover < 5:
            quadrant = "fix"
        else:
            quadrant = "scale"
            
        # Opportunity Score
        margin_component = margin_pct * 100.0
        cover_component = min(days_of_cover / 30.0, 1.0) * 100.0
        roas_component = min(roas / 5.0, 1.0) * 100.0
        
        score = 0.4 * margin_component + 0.3 * cover_component + 0.3 * roas_component
        score = max(0.0, min(100.0, score))
        
        bubbles.append({
            "sku": sku,
            "name": name,
            "category": category,
            "margin_pct": float(margin_pct),
            "days_of_cover": float(days_of_cover),
            "spend": float(spend),
            "revenue": float(revenue),
            "quadrant": quadrant,
            "opportunity_score": float(score),
            "provenance": "measured"
        })
        
    return bubbles

def get_campaign_summary(days: int = 7) -> pd.DataFrame:
    conn = get_connection()
    max_date_row = conn.execute("SELECT MAX(date) FROM ad_performance").fetchone()
    if not max_date_row or not max_date_row[0]:
        conn.close()
        return pd.DataFrame()
        
    max_date = pd.to_datetime(max_date_row[0])
    start_date = (max_date - pd.Timedelta(days=days-1)).strftime("%Y-%m-%d")
    end_date = max_date.strftime("%Y-%m-%d")
    
    query = """
    SELECT 
        campaign_id,
        MAX(platform) as platform,
        SUM(spend) as total_spend,
        SUM(revenue) as total_revenue,
        SUM(revenue) / NULLIF(SUM(spend), 0) as avg_roas,
        SUM(clicks) * 1.0 / NULLIF(SUM(impressions), 0) as avg_ctr,
        SUM(spend) / NULLIF(SUM(clicks), 0) as avg_cpc,
        SUM(purchases) as total_purchases
    FROM ad_performance
    WHERE date >= ? AND date <= ?
    GROUP BY campaign_id
    """
    df = conn.execute(query, [start_date, end_date]).df()
    conn.close()
    return df

def get_incident_history(status: Optional[str] = None, limit: int = 50) -> pd.DataFrame:
    conn = get_connection()
    query = "SELECT * FROM incidents"
    params = []
    if status:
        query += " WHERE status = ?"
        params.append(status)
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    df = conn.execute(query, params).df()
    conn.close()
    return df
