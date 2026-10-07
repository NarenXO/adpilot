from backend.contracts import load_fixture

class MemoryStore:
    def __init__(self):
        self._memories: list[dict] = []

    def add_memory(self, incident_id: str, cause: str, summary: str, success: bool) -> None:
        self._memories.append({
            "id": f"MEM-{len(self._memories)+1:03d}",
            "incident_id": incident_id,
            "cause": cause,
            "summary": summary,
            "outcome_success": success
        })

    def recall_similar(self, cause: str) -> list[dict]:
        return [m for m in self._memories if m["cause"] == cause]

memory_store = MemoryStore()
