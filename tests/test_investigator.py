import pytest
from unittest.mock import patch, MagicMock
from backend.contracts import Incident, EvidenceItem
from backend.contracts.enums import Cause
from backend.investigator.playbook import diagnose_from_playbook
from backend.investigator.tools import (
    compare_periods, funnel_breakdown, creative_breakdown,
    inventory_status, price_and_discount_changes, platform_split,
    tracking_health_check, recall_similar_incidents
)

from datetime import date
from backend.db.connection import get_connection as get_db

from backend.contracts.schemas import Scope

def make_test_incident(id="inc1", metric="ctr", scope_campaign_id="camp1", scope_sku=None, platform="meta", **kwargs):
    defaults = {
        "id": id,
        "sim_date": date(2024, 6, 16),
        "metric": metric,
        "scope": Scope(platform=platform, campaign_id=scope_campaign_id, sku=scope_sku, creative_id=None),
        "direction": "down",
        "magnitude_pct": 35.0,
        "detector": "sentinel",
        "confidence": 0.9,
        "money_at_risk": 250.0,
        "severity": 0.8,
        "status": "open"
    }
    defaults.update(kwargs)
    return Incident(**defaults)

def setup_module():
    conn = get_db()
    conn.execute("DELETE FROM ad_performance")
    conn.execute("DELETE FROM ga_funnel")
    conn.execute("DELETE FROM creatives")
    conn.execute("DELETE FROM inventory")
    conn.execute("DELETE FROM sku_master")
    conn.execute("DELETE FROM sales")
    conn.execute("DELETE FROM memory")
    
    conn.execute("INSERT INTO ad_performance (date, platform, campaign_id, creative_id, spend, impressions, clicks, purchases, revenue, ctr) VALUES (CURRENT_DATE - INTERVAL 10 DAY, 'meta', 'camp1', 'c1', 100, 1000, 50, 5, 200.0, 2.0)")
    conn.execute("INSERT INTO ga_funnel (date, channel, sessions, add_to_cart, checkout, transactions) VALUES ('2026-10-01', 'meta', 100, 20, 10, 5)")
    conn.execute("INSERT INTO creatives (creative_id, campaign_id, format, age_days, hook_type) VALUES ('c1', 'camp1', 'video', 10, 'hook1')")
    conn.execute("INSERT INTO inventory (sku, stock_units, days_of_cover) VALUES ('SKU1', 100, 10.5)")
    conn.execute("INSERT INTO sku_master (sku, cogs) VALUES ('SKU1', 40.0)")
    conn.execute("INSERT INTO sales (date, sku, price, discount, revenue) VALUES ('2026-10-01', 'SKU1', 100.0, 10.0, 90.0)")
    conn.execute("INSERT INTO memory (id, incident_id, cause, summary, outcome_success) VALUES ('m1', 'inc_old', 'fatigue', 'old summary', true)")

def test_tools_return_evidence_items():
    res = compare_periods("inc1")
    assert all(isinstance(r, EvidenceItem) for r in res)
    
    res = funnel_breakdown("meta", "2026-10-01")
    assert all(isinstance(r, EvidenceItem) for r in res)
    
    res = creative_breakdown("camp1")
    assert all(isinstance(r, EvidenceItem) for r in res)
    
    res = inventory_status("SKU1")
    assert all(isinstance(r, EvidenceItem) for r in res)
    
    res = price_and_discount_changes("SKU1")
    assert all(isinstance(r, EvidenceItem) for r in res)
    
    res = platform_split("2026-10-01")
    assert all(isinstance(r, EvidenceItem) for r in res)
    
    res = tracking_health_check("meta", "2026-10-01")
    assert all(isinstance(r, EvidenceItem) for r in res)
    
    res = recall_similar_incidents("fatigue")
    assert all(isinstance(r, EvidenceItem) for r in res)


@patch("backend.investigator.playbook.compare_periods")
@patch("backend.investigator.playbook.creative_breakdown")
def test_creative_fatigue(mock_tool, mock_compare):
    # Setup mock to trigger the condition
    mock_tool.return_value = [EvidenceItem(id="1", tool="t", description="d", values={"avg_frequency": 6.0}, provenance="measured")]
    mock_compare.return_value = [EvidenceItem(id="2", tool="t", description="d", values={"current_ctr": 1.0, "past_ctr": 2.0, "spend": 100}, provenance="measured")]
    inc = make_test_incident(id="inc1", metric="ctr", scope_campaign_id="camp1")
    
    evidence, diagnosis = diagnose_from_playbook(inc)
    
    assert diagnosis.cause == Cause.CREATIVE_FATIGUE
    assert diagnosis.source == "playbook"
    assert "1" in diagnosis.evidence_ids

@patch("backend.investigator.playbook.compare_periods")
@patch("backend.investigator.playbook.inventory_status")
def test_stockout(mock_tool, mock_compare):
    mock_tool.return_value = [EvidenceItem(id="2", tool="t", description="d", values={"days_of_cover": 1.0, "stock_units": 0}, provenance="measured")]
    mock_compare.return_value = [EvidenceItem(id="3", tool="t", description="d", values={"spend": 100}, provenance="measured")]
    inc = make_test_incident(id="inc2", metric="sales", scope_sku="SKU1")
    
    evidence, diagnosis = diagnose_from_playbook(inc)
    
    assert diagnosis.cause == Cause.STOCKOUT
    assert diagnosis.source == "playbook"
    assert "2" in diagnosis.evidence_ids

@patch("backend.investigator.playbook.compare_periods")
@patch("backend.investigator.playbook.inventory_status")
@patch("backend.investigator.playbook.price_and_discount_changes")
def test_margin_squeeze(mock_price, mock_inv, mock_compare):
    # Pass stockout check by making it not trigger
    mock_inv.return_value = [EvidenceItem(id="3", tool="t", description="d", values={"days_of_cover": 10.0, "stock_units": 100}, provenance="measured")]
    mock_compare.return_value = [EvidenceItem(id="5", tool="t", description="d", values={"spend": 100}, provenance="measured")]
    mock_price.return_value = [EvidenceItem(id="4", tool="t", description="d", values={"margin": 15.0}, provenance="measured")]
    
    inc = make_test_incident(id="inc3", metric="profit", scope_sku="SKU2")
    
    evidence, diagnosis = diagnose_from_playbook(inc)
    
    assert diagnosis.cause == Cause.MARGIN_SQUEEZE
    assert diagnosis.source == "playbook"
    assert "4" in diagnosis.evidence_ids

@patch("backend.investigator.playbook.tracking_health_check")
def test_tracking_break(mock_tool):
    mock_tool.return_value = [EvidenceItem(id="5", tool="t", description="d", values={"conversion_drop": 80.0, "actual_transactions": 100}, provenance="measured")]
    inc = make_test_incident(id="inc4", metric="purchases", platform="meta")
    
    evidence, diagnosis = diagnose_from_playbook(inc)
    
    assert diagnosis.cause == Cause.TRACKING_BREAK
    assert diagnosis.source == "playbook"
    assert "5" in diagnosis.evidence_ids

def test_default_unknown():
    inc = make_test_incident(id="inc5", metric="unknown")
    evidence, diagnosis = diagnose_from_playbook(inc)
    
    assert diagnosis.source == "playbook"

def test_trace_recorder():
    from backend.investigator.trace import AgentTrace, AgentStep
    
    trace = AgentTrace()
    trace.add_step(1, "test_tool", {"arg1": "val1"}, "Success")
    steps = trace.to_list()
    
    assert len(steps) == 1
    assert steps[0].step == 1
    assert steps[0].tool == "test_tool"
    assert steps[0].args == {"arg1": "val1"}
    
    summary = trace.summary()
    assert "1 steps" in summary

@patch("backend.investigator.agent.requests.post")
def test_investigate_fallback_on_llm_offline(mock_post):
    from backend.investigator.agent import investigate
    
    # Mock requests to raise a ConnectionError
    mock_post.side_effect = Exception("Connection refused")
    
    inc = make_test_incident(id="inc_llm_1", metric="ctr")
    
    evidence, diagnosis, trace_steps = investigate(inc)
    
    # Verify fallback to playbook
    assert diagnosis.source == "playbook"
    assert len(trace_steps) == 1
    assert trace_steps[0].step == 0
    assert trace_steps[0].tool == "playbook_fallback"
    assert "Connection refused" in trace_steps[0].result_summary

@patch("backend.investigator.agent.requests.post")
def test_investigate_mocked_llm_loop(mock_post):
    from backend.investigator.agent import investigate
    
    # Mock LLM response to simulate tool call then finish
    class MockResponse:
        def __init__(self, json_data):
            self._json_data = json_data
        def json(self):
            return self._json_data
        def raise_for_status(self):
            pass
            
    # First response: tool_call, Second response: finish
    mock_post.side_effect = [
        MockResponse({
            "message": {
                "content": '{"action": "tool_call", "tool": "funnel_breakdown", "args": {"channel": "meta", "date": "2026-10-01"}}'
            }
        }),
        MockResponse({
            "message": {
                "content": '{"action": "finish", "cause": "TRACKING_BREAK", "explanation": "It broke", "evidence_ids": ["E_mocked"]}'
            }
        })
    ]
    
    inc = make_test_incident(id="inc_llm_2", metric="purchases")
    evidence, diagnosis, trace_steps = investigate(inc)
    
    assert diagnosis.source == "agent"
    assert diagnosis.cause == Cause.UNKNOWN
    assert diagnosis.guardian == "FAIL"
    assert "failed signature validation" in diagnosis.explanation
    
    assert len(trace_steps) == 1
    assert trace_steps[0].tool == "funnel_breakdown"
    assert trace_steps[0].args == {"channel": "meta", "date": "2026-10-01"}
    
    assert len(evidence) > 0

def test_investigate_cached_incident():
    from backend.investigator.agent import investigate
    
    # Test one of the cached golden path incidents
    inc = make_test_incident(id="incident_margin_squeeze", metric="margin")
    evidence, diagnosis, trace_steps = investigate(inc)
    
    assert diagnosis.source == "playbook"
    assert diagnosis.cause == Cause.MARGIN_SQUEEZE
    assert diagnosis.guardian == "PASS"
    assert len(evidence) == 1
    assert evidence[0].values["margin"] == 14.5
    assert len(trace_steps) == 1
    assert trace_steps[0].tool == "price_and_discount_changes"

def test_golden_path_inc_id_cache_aliases():
    from backend.investigator.agent import investigate
    
    inc = make_test_incident(id="INC-001", metric="ctr")
    evidence, diagnosis, trace_steps = investigate(inc)
    assert diagnosis.source == "playbook"
    assert diagnosis.cause == Cause.CREATIVE_FATIGUE
    
    inc = make_test_incident(id="INC-002", metric="sales", scope_sku="123")
    evidence, diagnosis, trace_steps = investigate(inc)
    assert diagnosis.source == "playbook"
    assert diagnosis.cause == Cause.STOCKOUT

def test_investigate_malformed_json_response():
    from backend.investigator.agent import investigate
    with patch("backend.investigator.agent.requests.post") as mock_post:
        class MockResponse:
            def __init__(self): pass
            def json(self): return {"message": {"content": "This is not JSON"}}
            def raise_for_status(self): pass
        mock_post.return_value = MockResponse()
        
        inc = make_test_incident(id="inc_malformed", metric="ctr")
        evidence, diagnosis, trace_steps = investigate(inc)
        assert diagnosis.source == "playbook"
        assert "Malformed JSON" in trace_steps[0].result_summary

def test_investigate_timeout_handling():
    from backend.investigator.agent import investigate
    import requests
    with patch("backend.investigator.agent.requests.post") as mock_post:
        mock_post.side_effect = requests.Timeout("Timed out")
        inc = make_test_incident(id="inc_timeout", metric="ctr")
        evidence, diagnosis, trace_steps = investigate(inc)
        assert diagnosis.source == "playbook"
        assert "Timed out" in trace_steps[0].result_summary

def test_tools_handle_empty_database_tables():
    from backend.db.connection import get_connection
    conn = get_connection()
    # Create empty db for this test using a fresh connection
    import duckdb
    from backend.db.ddl import init_db
    empty_conn = duckdb.connect(':memory:')
    init_db(empty_conn)
    
    with patch("backend.investigator.tools.get_db", return_value=empty_conn):
        assert compare_periods("inc_empty") == []
        assert funnel_breakdown("meta", "2026-10-01") == []
        assert creative_breakdown("camp") == []
        assert inventory_status("SKU") == []
        assert price_and_discount_changes("SKU") == []
        assert platform_split("2026-10-01") == []
        assert tracking_health_check("meta") == []
        assert recall_similar_incidents("fatigue") == []


