import json
from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse
from backend.orchestrator.event_bus import event_bus

router = APIRouter()

@router.get("/stream")
async def sse_stream():
    async def event_generator():
        # Stream live events as standard data payloads
        async for ev in event_bus.subscribe():
            yield {"data": json.dumps(ev)}

    return EventSourceResponse(event_generator())
