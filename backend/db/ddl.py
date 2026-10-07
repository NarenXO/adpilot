import duckdb

DDL_STATEMENTS = """
CREATE TABLE IF NOT EXISTS ad_performance(
    date DATE, platform VARCHAR, campaign_id VARCHAR, adset_id VARCHAR,
    creative_id VARCHAR, sku VARCHAR, spend DOUBLE, impressions INTEGER,
    clicks INTEGER, purchases INTEGER, revenue DOUBLE, cpc DOUBLE,
    ctr DOUBLE, cpm DOUBLE, roas DOUBLE
);
CREATE TABLE IF NOT EXISTS sales(
    date DATE, channel VARCHAR, sku VARCHAR, units INTEGER,
    price DOUBLE, discount DOUBLE, revenue DOUBLE
);
CREATE TABLE IF NOT EXISTS sku_master(
    sku VARCHAR PRIMARY KEY, name VARCHAR, category VARCHAR,
    cogs DOUBLE, margin_pct DOUBLE, launch_date DATE
);
CREATE TABLE IF NOT EXISTS inventory(
    date DATE, sku VARCHAR, stock_units INTEGER, days_of_cover DOUBLE
);
CREATE TABLE IF NOT EXISTS ga_funnel(
    date DATE, channel VARCHAR, sessions INTEGER, add_to_cart INTEGER,
    checkout INTEGER, transactions INTEGER
);
CREATE TABLE IF NOT EXISTS creatives(
    creative_id VARCHAR PRIMARY KEY, campaign_id VARCHAR, platform VARCHAR,
    format VARCHAR, age_days INTEGER, hook_type VARCHAR
);
CREATE TABLE IF NOT EXISTS external_events(
    date DATE, type VARCHAR, name VARCHAR
);
CREATE TABLE IF NOT EXISTS truth(
    sim_date DATE, incident_type VARCHAR, scope_platform VARCHAR,
    scope_campaign_id VARCHAR, scope_sku VARCHAR, is_decoy BOOLEAN, label VARCHAR
);
CREATE TABLE IF NOT EXISTS incidents(
    id VARCHAR PRIMARY KEY, sim_date DATE, metric VARCHAR, scope_platform VARCHAR,
    scope_campaign_id VARCHAR, scope_sku VARCHAR, scope_creative_id VARCHAR,
    direction VARCHAR, magnitude_pct DOUBLE, detector VARCHAR, confidence DOUBLE,
    money_at_risk DOUBLE, severity DOUBLE, status VARCHAR, created_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS evidence(
    id VARCHAR PRIMARY KEY, incident_id VARCHAR, tool VARCHAR,
    description VARCHAR, values_json VARCHAR, provenance VARCHAR
);
CREATE TABLE IF NOT EXISTS diagnoses(
    incident_id VARCHAR PRIMARY KEY, cause VARCHAR, evidence_ids_json VARCHAR,
    explanation VARCHAR, source VARCHAR, guardian VARCHAR, created_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS recommendations(
    id VARCHAR PRIMARY KEY, incident_id VARCHAR, mode VARCHAR,
    changes_json VARCHAR, expected_profit_delta_json VARCHAR,
    constraints_binding_json VARCHAR, confidence DOUBLE,
    opportunity_score DOUBLE, created_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS policy_decisions(
    recommendation_id VARCHAR PRIMARY KEY, verdict VARCHAR,
    reasons_json VARCHAR, size_factor DOUBLE, created_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS actions(
    id VARCHAR PRIMARY KEY, recommendation_id VARCHAR, status VARCHAR,
    rollout_pct DOUBLE, rollback_guard_json VARCHAR, created_at TIMESTAMP, updated_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS outcomes(
    action_id VARCHAR PRIMARY KEY, observed_profit_delta DOUBLE,
    counterfactual_low DOUBLE, counterfactual_mid DOUBLE, counterfactual_high DOUBLE,
    success BOOLEAN, created_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS memory(
    id VARCHAR PRIMARY KEY, incident_id VARCHAR, cause VARCHAR,
    summary VARCHAR, embedding_json VARCHAR, outcome_success BOOLEAN, created_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS audit_log(
    id VARCHAR PRIMARY KEY, sim_date DATE, event_type VARCHAR,
    module VARCHAR, payload_json VARCHAR, created_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS opportunity_scores(
    sim_date DATE, campaign_id VARCHAR, sku VARCHAR,
    forecast_component DOUBLE, curve_component DOUBLE, margin_component DOUBLE,
    stock_component DOUBLE, total_score DOUBLE
);
"""

def init_db(conn: duckdb.DuckDBPyConnection) -> None:
    for stmt in DDL_STATEMENTS.strip().split(";"):
        if stmt.strip():
            conn.execute(stmt)
