from datetime import date
from backend.orchestrator.tick import tick
from backend.orchestrator.event_bus import event_bus

def test_orchestrator_tick():
    from backend.orchestrator.tick import GLOBAL_STATE
    GLOBAL_STATE["current_date"] = date(2024, 6, 15)
    result = tick(date(2024, 6, 16))
    assert result.sim_date == date(2024, 6, 16)
    assert result.incidents_detected > 0

    history = event_bus.get_history()
    assert len(history) >= 7
    types = [e["type"] for e in history]
    assert "tick.started" in types
    assert "incident.detected" in types
    assert "tick.completed" in types
