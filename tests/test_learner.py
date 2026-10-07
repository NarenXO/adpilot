from backend.contracts import Action, BudgetChange
from backend.learner.measurer import measure
from backend.learner.memory import memory_store

def test_learner_measure_and_memory():
    act = Action(
        id="ACT-001",
        recommendation_id="REC-001",
        status="rolling_out",
        rollout_pct=50.0,
        rollback_guard={}
    )
    outcome = measure(act)
    assert outcome.action_id == "ACT-001"
    assert outcome.success is True

    memory_store.add_memory("INC-001", "CREATIVE_FATIGUE", "Reallocated spend to high CTR creative", True)
    recalled = memory_store.recall_similar("CREATIVE_FATIGUE")
    assert len(recalled) == 1
