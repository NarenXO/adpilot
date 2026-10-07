from backend.executor.mock_adapter import MockAdAdapter, default_adapter

_snapshots: dict[str, dict[str, float]] = {}

def record_snapshot(action_id: str, adapter: MockAdAdapter) -> None:
    _snapshots[action_id] = adapter.snapshot()

def trigger_rollback(action_id: str, adapter: MockAdAdapter | None = None) -> bool:
    ad = adapter or default_adapter
    if action_id in _snapshots:
        ad.restore(_snapshots[action_id])
        return True
    return False
