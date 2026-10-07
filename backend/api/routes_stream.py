import asyncio, json
from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse
from backend.orchestrator.event_bus import event_bus

router = APIRouter()

@router.get("/stream")
async def sse_stream():
    async def event_generator():
        for ev in event_bus.get_history():
            yield {"event": ev["type"], "data": json.dumps(ev)}
        async for ev in event_bus.subscribe():
            yield {"event": ev["type"], "data": json.dumps(ev)}

    return EventSourceResponse(event_generator())
