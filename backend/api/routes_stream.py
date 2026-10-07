import asyncio, json
from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse
from backend.orchestrator.event_bus import event_bus

router = APIRouter()

@router.get("/stream")
async def sse_stream():
    async def event_generator():
        # Live subscription with a simulated AI "thinking" delay for presentation effect
        async for ev in event_bus.subscribe():
            await asyncio.sleep(0.6) # Creates a visual typing/processing effect
            yield {"event": ev["type"], "data": json.dumps(ev)}
    return EventSourceResponse(event_generator())
