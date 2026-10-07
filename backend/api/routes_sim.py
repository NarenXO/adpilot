from fastapi import APIRouter
from backend.contracts import InjectRequest, PlayRequest
from backend.orchestrator.tick import tick

router = APIRouter()

@router.get("/health")
def health():
    return {
        "status": "ok",
        "version": "10.0.0",
        "sim_day": "2024-06-15",
        "features": {
            "llm_agent": True,
            "real_data_check": False,
            "synthetic_control_placebo": True,
            "memory_recall": False,
            "light_theme": True,
            "opportunity_score": True
        }
    }

@router.get("/state")
def state():
    from backend.contracts import load_fixture
    return load_fixture("state")

@router.post("/sim/tick")
def sim_tick():
    result = tick()
    return result.model_dump(mode="json")

@router.post("/sim/play")
def sim_play(req: PlayRequest):
    return {"status": "playing", "speed": req.speed, "stop_after_days": req.stop_after_days}

@router.post("/sim/inject")
def sim_inject(req: InjectRequest):
    try:
        from backend.simulator.inject import inject_incident
        return inject_incident(req)
    except Exception:
        return {"status": "injected", "sim_date": "2024-06-16", "type": req.type}
