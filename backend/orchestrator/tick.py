import time, random, asyncio
from datetime import date, timedelta
from backend.contracts import load_fixture, TickResult, SSEEvent
from backend.orchestrator.event_bus import event_bus

# Global state to simulate time passing and metrics fluctuating
GLOBAL_STATE = {
    "current_date": date(2024, 6, 15),
    "kpis": {"total_spend": 12450.0, "total_revenue": 58200.0, "blended_roas": 4.67, "total_profit": 18340.0}
}

def get_current_state():
    return {
        "sim_date": str(GLOBAL_STATE["current_date"]),
        "autonomy_level": "supervised",
        "risk_budget": {"used_pct": round(random.uniform(3.0, 8.5), 1), "limit_pct": 10.0},
        "kpis": GLOBAL_STATE["kpis"],
        "killswitch_active": False
    }

def tick(sim_date: date | None = None) -> TickResult:
    start_time = time.time()
    
    # Advance time by 1 day or set to provided sim_date
    if sim_date is not None:
        GLOBAL_STATE["current_date"] = sim_date
    else:
        GLOBAL_STATE["current_date"] += timedelta(days=1)
    current_date = GLOBAL_STATE["current_date"]
    
    # Fluctuate KPIs slightly to make the dashboard look "alive"
    GLOBAL_STATE["kpis"]["total_spend"] += random.uniform(500, 1200)
    GLOBAL_STATE["kpis"]["total_revenue"] += random.uniform(2000, 4500)
    GLOBAL_STATE["kpis"]["blended_roas"] = round(GLOBAL_STATE["kpis"]["total_revenue"] / GLOBAL_STATE["kpis"]["total_spend"], 2)
    GLOBAL_STATE["kpis"]["total_profit"] = GLOBAL_STATE["kpis"]["total_revenue"] - GLOBAL_STATE["kpis"]["total_spend"] - 15000 # mock COGS

    # 1. Tick Started
    event_bus.publish(SSEEvent(type="tick.started", sim_date=current_date, payload={"action": "orchestrator_cycle_start"}))

    # 2. Detections
    incidents = load_fixture("incidents")["incidents"]
    for inc in incidents:
        event_bus.publish(SSEEvent(type="incident.detected", sim_date=current_date, payload={"id": inc["id"], "metric": inc["metric"]}))

    # 3. Agent Trace
    diag_data = load_fixture("diagnosis")
    for step in diag_data.get("agent_trace", []):
        event_bus.publish(SSEEvent(type="agent.step", sim_date=current_date, payload={"tool": step["tool"], "summary": step["result_summary"]}))
    
    event_bus.publish(SSEEvent(type="diagnosis.ready", sim_date=current_date, payload={"cause": diag_data["diagnosis"]["cause"]}))
    event_bus.publish(SSEEvent(type="guardian.result", sim_date=current_date, payload={"guardian": "PASS"}))

    # 4. Actions
    recs = load_fixture("recommendations")["recommendations"]
    event_bus.publish(SSEEvent(type="recommendation.ready", sim_date=current_date, payload={"id": recs[0]["id"], "mode": "profit"}))
    event_bus.publish(SSEEvent(type="policy.decision", sim_date=current_date, payload={"verdict": "AUTO"}))
    event_bus.publish(SSEEvent(type="action.executed", sim_date=current_date, payload={"status": "rolling_out"}))

    duration_ms = int((time.time() - start_time) * 1000) + random.randint(120, 450)
    event_bus.publish(SSEEvent(type="tick.completed", sim_date=current_date, payload={"duration_ms": duration_ms}))

    return TickResult(sim_date=current_date, incidents_detected=len(incidents), actions_taken=1, tick_duration_ms=duration_ms)
