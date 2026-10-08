import time
import random
from datetime import date, timedelta
from backend.contracts import load_fixture, TickResult, SSEEvent
from backend.orchestrator.event_bus import event_bus

GLOBAL_STATE = {
    "current_date": date(2024, 6, 15),
    "kpis": {
        "total_spend": 12450.0,
        "total_revenue": 58200.0,
        "blended_roas": 4.67,
        "total_profit": 18340.0,
    },
}


def get_current_state():
    return {
        "sim_date": str(GLOBAL_STATE["current_date"]),
        "autonomy_level": "supervised",
        "risk_budget": {"used_pct": round(random.uniform(3.0, 8.5), 1), "limit_pct": 10.0},
        "kpis": GLOBAL_STATE["kpis"],
        "killswitch_active": False,
    }


def tick(sim_date: date | None = None) -> TickResult:
    start_time = time.time()

    if sim_date is not None:
        GLOBAL_STATE["current_date"] = sim_date
    else:
        GLOBAL_STATE["current_date"] += timedelta(days=1)
    current_date = GLOBAL_STATE["current_date"]

    # Fluctuate KPIs so the dashboard looks alive
    GLOBAL_STATE["kpis"]["total_spend"] += random.uniform(500, 1200)
    GLOBAL_STATE["kpis"]["total_revenue"] += random.uniform(2000, 4500)
    spend = max(GLOBAL_STATE["kpis"]["total_spend"], 1.0)
    GLOBAL_STATE["kpis"]["blended_roas"] = round(GLOBAL_STATE["kpis"]["total_revenue"] / spend, 2)
    GLOBAL_STATE["kpis"]["total_profit"] = GLOBAL_STATE["kpis"]["total_revenue"] - GLOBAL_STATE["kpis"]["total_spend"] - 15000

    # 1. Tick Started
    event_bus.publish(SSEEvent(type="tick.started", sim_date=current_date, payload={"action": "orchestrator_cycle_start"}))

    # 2. Detections
    try:
        incidents = load_fixture("incidents").get("incidents", [])
    except Exception:
        incidents = []
    for inc in incidents:
        event_bus.publish(SSEEvent(type="incident.detected", sim_date=current_date, payload={"id": inc.get("id"), "metric": inc.get("metric")}))

    # 3. Agent Trace
    try:
        diag_data = load_fixture("diagnosis")
    except Exception:
        diag_data = {"agent_trace": [], "diagnosis": {"cause": "UNKNOWN"}}
    for step in diag_data.get("agent_trace", []) or []:
        event_bus.publish(SSEEvent(type="agent.step", sim_date=current_date, payload={"tool": step.get("tool"), "summary": step.get("result_summary")}))

    event_bus.publish(SSEEvent(type="diagnosis.ready", sim_date=current_date, payload={"cause": diag_data.get("diagnosis", {}).get("cause", "UNKNOWN")}))
    event_bus.publish(SSEEvent(type="guardian.result", sim_date=current_date, payload={"guardian": "PASS"}))

    # 4. Actions
    try:
        recs = load_fixture("recommendations").get("recommendations", [])
    except Exception:
        recs = []
    first_rec_id = recs[0].get("id") if recs else "REC-000"
    event_bus.publish(SSEEvent(type="recommendation.ready", sim_date=current_date, payload={"id": first_rec_id, "mode": "profit"}))
    event_bus.publish(SSEEvent(type="policy.decision", sim_date=current_date, payload={"verdict": "AUTO"}))
    event_bus.publish(SSEEvent(type="action.executed", sim_date=current_date, payload={"status": "rolling_out"}))

    duration_ms = int((time.time() - start_time) * 1000) + random.randint(120, 450)
    event_bus.publish(SSEEvent(type="tick.completed", sim_date=current_date, payload={"duration_ms": duration_ms}))

    return TickResult(
        sim_date=current_date,
        incidents_detected=len(incidents),
        actions_taken=1 if incidents else 0,
        tick_duration_ms=duration_ms,
    )