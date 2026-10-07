import asyncio
import json
from typing import AsyncGenerator
from backend.contracts import SSEEvent

class EventBus:
    def __init__(self):
        self._history: list[dict] = []
        self._subscribers: list[asyncio.Queue] = []

    def publish(self, event: SSEEvent) -> None:
        event_dict = event.model_dump(mode="json")
        self._history.append(event_dict)
        for queue in list(self._subscribers):
            try:
                queue.put_nowait(event_dict)
            except Exception:
                pass

    async def subscribe(self) -> AsyncGenerator[dict, None]:
        queue = asyncio.Queue()
        self._subscribers.append(queue)
        try:
            while True:
                event_dict = await queue.get()
                yield event_dict
        finally:
            if queue in self._subscribers:
                self._subscribers.remove(queue)

    def get_history(self) -> list[dict]:
        return list(self._history)

event_bus = EventBus()
