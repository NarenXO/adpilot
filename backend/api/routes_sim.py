from fastapi import APIRouter
from backend.contracts import InjectRequest, PlayRequest
from backend.orchestrator.tick import tick, get_current_state

router = APIRouter()

@router.get("/health")
def health():
    return {"status": "ok", "version": "production"}

@router.get("/state")
def state():
    return get_current_state()

@router.post("/sim/tick")
def sim_tick():
    result = tick()
    return result.model_dump(mode="json")

@router.post("/sim/killswitch")
def killswitch():
    return {"status": "halted"}
