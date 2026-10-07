import time
from datetime import date
from backend.contracts import load_fixture, TickResult, SSEEvent
from backend.orchestrator.event_bus import event_bus

def tick(sim_date: date | None = None) -> TickResult:
    start_time = time.time()
    current_date = sim_date or date(2024, 6, 16)

    # 1. Tick Started
    event_bus.publish(SSEEvent(type="tick.started", sim_date=current_date, payload={"sim_date": str(current_date)}))

    # 2. Sentinel Detect (Fallback to Fixture)
    try:
        from backend.sentinel import detect
        incidents = [inc.model_dump(mode="json") for inc in detect(current_date)]
    except Exception:
        incidents = load_fixture("incidents")["incidents"]

    for inc in incidents:
        event_bus.publish(SSEEvent(type="incident.detected", sim_date=current_date, payload=inc))

    # 3. Agent Trace & Diagnosis
    try:
        from backend.investigator import investigate
        # attempt module call
    except Exception:
        diag_data = load_fixture("diagnosis")
        for step in diag_data.get("agent_trace", []):
            event_bus.publish(SSEEvent(type="agent.step", sim_date=current_date, payload=step))
        event_bus.publish(SSEEvent(type="diagnosis.ready", sim_date=current_date, payload=diag_data["diagnosis"]))

    # 4. Guardian Result
    event_bus.publish(SSEEvent(type="guardian.result", sim_date=current_date, payload={"guardian": "PASS", "issues": []}))

    # 5. Strategist Recommendation
    try:
        from backend.strategist import recommend
        recs = [r.model_dump(mode="json") for r in recommend(incidents[0], "profit")]
    except Exception:
        recs = load_fixture("recommendations")["recommendations"]

    for rec in recs:
        event_bus.publish(SSEEvent(type="recommendation.ready", sim_date=current_date, payload=rec))

    # 6. Policy Decision
    try:
        from backend.policy import decide
        decisions = [d.model_dump(mode="json") for d in decide(recs[0], None)]
    except Exception:
        decisions = load_fixture("policy_decisions")["decisions"]

    for dec in decisions:
        event_bus.publish(SSEEvent(type="policy.decision", sim_date=current_date, payload=dec))

    # 7. Executor Apply
    try:
        from backend.executor import apply
        actions = [a.model_dump(mode="json") for a in apply(decisions[0], recs[0])]
    except Exception:
        actions = load_fixture("actions")["actions"]

    for act in actions:
        event_bus.publish(SSEEvent(type="action.executed", sim_date=current_date, payload=act))

    # 8. Learner Measure
    try:
        from backend.learner import measure
        outcomes = [o.model_dump(mode="json") for o in measure(actions[0])]
    except Exception:
        outcomes = load_fixture("outcomes")["outcomes"]

    for out in outcomes:
        event_bus.publish(SSEEvent(type="outcome.measured", sim_date=current_date, payload=out))

    # 9. Tick Completed
    duration_ms = int((time.time() - start_time) * 1000)
    event_bus.publish(SSEEvent(type="tick.completed", sim_date=current_date, payload={"sim_date": str(current_date), "duration_ms": duration_ms}))

    return TickResult(
        sim_date=current_date,
        incidents_detected=len(incidents),
        actions_taken=len(actions),
        tick_duration_ms=duration_ms
    )
