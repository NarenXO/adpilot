from datetime import date
from typing import Literal, Any
from pydantic import BaseModel

class SSEEvent(BaseModel):
    type: Literal[
        "tick.started",
        "incident.detected",
        "agent.step",
        "diagnosis.ready",
        "guardian.result",
        "recommendation.ready",
        "policy.decision",
        "action.executed",
        "action.rolled_back",
        "outcome.measured",
        "tick.completed",
    ]
    sim_date: date
    payload: dict[str, Any]
