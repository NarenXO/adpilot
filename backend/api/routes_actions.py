from fastapi import APIRouter, HTTPException
from backend.contracts import load_fixture, KillSwitchRequest
from backend.executor.killswitch import killswitch
from backend.executor.rollback import trigger_rollback

router = APIRouter()

@router.get("/actions")
def get_actions():
    return load_fixture("actions")

@router.post("/actions/{id}/approve")
def approve_action(id: str):
    return {"action_id": id, "status": "rolling_out", "rollout_pct": 100.0}

@router.post("/actions/{id}/rollback")
def rollback_action(id: str):
    success = trigger_rollback(id)
    return {"action_id": id, "status": "rolled_back", "restored": success}

@router.post("/killswitch")
def toggle_killswitch(req: KillSwitchRequest):
    killswitch.set_active(req.active)
    return {"killswitch_active": killswitch.is_active(), "actions_halted": 2 if req.active else 0}
