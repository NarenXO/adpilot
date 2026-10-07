import uuid
from typing import List

from backend.contracts import EvidenceItem
from backend.db.connection import get_db

def _generate_id() -> str:
    return "E_" + uuid.uuid4().hex[:6]

def compare_periods(incident_id: str, days: int = 14) -> List[EvidenceItem]:
    conn = get_db()
    # Mocking logic, since we don't have the exact schema, we assume typical DuckDB sql
    query = """
        SELECT 
            SUM(spend) as total_spend,
            SUM(impressions) as total_impressions,
            SUM(clicks) as total_clicks,
            SUM(purchases) as total_purchases,
            SUM(revenue) / NULLIF(SUM(spend), 0) as roas
        FROM ad_performance
        WHERE date >= CURRENT_DATE - CAST(? AS INTEGER) * INTERVAL 1 DAY
    """
    
    current_metrics = conn.execute(query, [days]).fetchone()
    past_metrics = conn.execute(query, [days * 2]).fetchone()
    
    evidence = []
    if current_metrics and current_metrics[0] is not None and past_metrics and past_metrics[0] is not None:
        evidence.append(
            EvidenceItem(
                id=_generate_id(),
                tool="compare_periods",
                description=f"Compared metrics for the last {days} days against the prior period.",
                values={
                    "current_spend": current_metrics[0],
                    "past_spend": past_metrics[0],
                    "current_impressions": current_metrics[1],
                    "past_impressions": past_metrics[1],
                    "current_clicks": current_metrics[2],
                    "past_clicks": past_metrics[2],
                    "current_purchases": current_metrics[3],
                    "past_purchases": past_metrics[3],
                    "current_roas": current_metrics[4],
                    "past_roas": past_metrics[4]
                },
                provenance="derived"
            )
        )
    return evidence

def funnel_breakdown(channel: str, date: str) -> List[EvidenceItem]:
    conn = get_db()
    query = """
        SELECT 
            SUM(sessions) as total_sessions,
            SUM(add_to_cart) as total_atc,
            SUM(checkout) as total_checkouts,
            SUM(transactions) as total_transactions
        FROM ga_funnel
        WHERE channel = ? AND date = ?
    """
    result = conn.execute(query, [channel, date]).fetchone()
    
    evidence = []
    if result and result[0] is not None:
        sessions, atc, checkouts, transactions = result
        sessions = sessions or 0
        atc = atc or 0
        checkouts = checkouts or 0
        transactions = transactions or 0
        
        atc_rate = (atc / sessions) if sessions else 0
        checkout_rate = (checkouts / atc) if atc else 0
        conversion_rate = (transactions / sessions) if sessions else 0
        
        evidence.append(
            EvidenceItem(
                id=_generate_id(),
                tool="funnel_breakdown",
                description=f"Funnel breakdown for {channel} on {date}",
                values={
                    "sessions": sessions,
                    "add_to_cart": atc,
                    "checkouts": checkouts,
                    "transactions": transactions,
                    "atc_rate": atc_rate,
                    "checkout_rate": checkout_rate,
                    "conversion_rate": conversion_rate
                },
                provenance="derived"
            )
        )
    return evidence

def creative_breakdown(campaign_id: str) -> List[EvidenceItem]:
    conn = get_db()
    query = """
        SELECT 
            c.creative_id,
            c.format,
            c.age_days,
            c.hook_type,
            SUM(a.clicks) * 1.0 / NULLIF(SUM(a.impressions), 0) as ctr,
            SUM(a.spend) * 1000.0 / NULLIF(SUM(a.impressions), 0) as cpm,
            AVG(a.frequency) as avg_frequency
        FROM creatives c
        JOIN ad_performance a ON c.creative_id = a.creative_id
        WHERE c.campaign_id = ?
        GROUP BY c.creative_id, c.format, c.age_days, c.hook_type
    """
    results = conn.execute(query, [campaign_id]).fetchall()
    
    evidence = []
    for row in results:
        creative_id, format_, age_days, hook_type, ctr, cpm, frequency = row
        evidence.append(
            EvidenceItem(
                id=_generate_id(),
                tool="creative_breakdown",
                description=f"Creative metrics for {creative_id}",
                values={
                    "creative_id": creative_id,
                    "format": format_,
                    "age_days": age_days,
                    "hook_type": hook_type,
                    "ctr": ctr,
                    "cpm": cpm,
                    "frequency": frequency
                },
                provenance="measured"
            )
        )
    return evidence

def inventory_status(sku: str) -> List[EvidenceItem]:
    conn = get_db()
    query = "SELECT stock_units, days_of_cover FROM inventory WHERE sku = ?"
    result = conn.execute(query, [sku]).fetchone()
    
    evidence = []
    if result:
        stock_units, days_of_cover = result
        evidence.append(
            EvidenceItem(
                id=_generate_id(),
                tool="inventory_status",
                description=f"Inventory status for SKU {sku}",
                values={
                    "sku": sku,
                    "stock_units": stock_units,
                    "days_of_cover": days_of_cover
                },
                provenance="measured"
            )
        )
    return evidence

def price_and_discount_changes(sku: str) -> List[EvidenceItem]:
    conn = get_db()
    query = """
        SELECT s.price, s.discount, s.revenue, sm.cogs, 
               (s.revenue - sm.cogs) as margin
        FROM sales s
        JOIN sku_master sm ON s.sku = sm.sku
        WHERE s.sku = ?
    """
    result = conn.execute(query, [sku]).fetchone()
    
    evidence = []
    if result:
        price, discount, revenue, cogs, margin = result
        evidence.append(
            EvidenceItem(
                id=_generate_id(),
                tool="price_and_discount_changes",
                description=f"Price, discount, and margins for SKU {sku}",
                values={
                    "sku": sku,
                    "price": price,
                    "discount": discount,
                    "revenue": revenue,
                    "cogs": cogs,
                    "margin": margin
                },
                provenance="derived"
            )
        )
    return evidence

def platform_split(date: str) -> List[EvidenceItem]:
    conn = get_db()
    query = """
        SELECT platform, SUM(spend) as total_spend, SUM(revenue) as total_revenue
        FROM ad_performance
        WHERE date = ?
        GROUP BY platform
    """
    results = conn.execute(query, [date]).fetchall()
    
    evidence = []
    for row in results:
        platform, spend, revenue = row
        evidence.append(
            EvidenceItem(
                id=_generate_id(),
                tool="platform_split",
                description=f"Spend and revenue split for platform {platform} on {date}",
                values={
                    "platform": platform,
                    "spend": spend,
                    "revenue": revenue
                },
                provenance="measured"
            )
        )
    return evidence

def tracking_health_check(platform: str, date: str = None) -> List[EvidenceItem]:
    conn = get_db()
    
    if date:
        query = """
            SELECT 
                (SELECT SUM(purchases) FROM ad_performance WHERE platform = ? AND date = ?) as pixel_purchases,
                (SELECT SUM(transactions) FROM ga_funnel WHERE channel = ? AND date = ?) as actual_transactions
        """
        result = conn.execute(query, [platform, date, platform, date]).fetchone()
    else:
        query = """
            SELECT 
                (SELECT SUM(purchases) FROM ad_performance WHERE platform = ?) as pixel_purchases,
                (SELECT SUM(transactions) FROM ga_funnel WHERE channel = ?) as actual_transactions
        """
        result = conn.execute(query, [platform, platform]).fetchone()

    evidence = []
    if result and (result[0] is not None or result[1] is not None):
        pixel_purchases, actual_transactions = result
        discrepancy = (pixel_purchases - actual_transactions) if (pixel_purchases is not None and actual_transactions is not None) else None
        
        evidence.append(
            EvidenceItem(
                id=_generate_id(),
                tool="tracking_health_check",
                description=f"Tracking health check for {platform}" + (f" on {date}" if date else ""),
                values={
                    "platform": platform,
                    "pixel_purchases": pixel_purchases,
                    "actual_transactions": actual_transactions,
                    "discrepancy": discrepancy
                },
                provenance="derived"
            )
        )
    return evidence

def recall_similar_incidents(cause: str) -> List[EvidenceItem]:
    conn = get_db()
    # Extremely basic text matching for cause, typical for this mock
    query = "SELECT incident_id, summary, outcome_success FROM memory WHERE cause LIKE ?"
    results = conn.execute(query, [f"%{cause}%"]).fetchall()
    
    evidence = []
    for row in results:
        incident_id, summary, outcome = row
        evidence.append(
            EvidenceItem(
                id=_generate_id(),
                tool="recall_similar_incidents",
                description=f"Similar incident found: {incident_id}",
                values={
                    "incident_id": incident_id,
                    "summary": summary,
                    "outcome_success": outcome
                },
                provenance="scenario"
            )
        )
    return evidence
