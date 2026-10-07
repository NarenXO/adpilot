from typing import Protocol

class AdAdapter(Protocol):
    def get_spend(self, campaign_id: str) -> float: ...
    def set_spend(self, campaign_id: str, spend: float) -> None: ...
    def snapshot(self) -> dict[str, float]: ...
    def restore(self, snapshot_dict: dict[str, float]) -> None: ...

class MockAdAdapter:
    def __init__(self, initial_spends: dict[str, float] | None = None):
        self._spends: dict[str, float] = initial_spends or {
            "camp_meta_01": 1000.0,
            "camp_meta_03": 500.0,
            "camp_meta_05": 300.0,
            "camp_goog_01": 800.0,
        }

    def get_spend(self, campaign_id: str) -> float:
        return self._spends.get(campaign_id, 0.0)

    def set_spend(self, campaign_id: str, spend: float) -> None:
        self._spends[campaign_id] = spend

    def snapshot(self) -> dict[str, float]:
        return dict(self._spends)

    def restore(self, snapshot_dict: dict[str, float]) -> None:
        self._spends = dict(snapshot_dict)

default_adapter = MockAdAdapter()
