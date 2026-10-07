from fastapi import APIRouter

from .routes_sim import router as sim_router
from .routes_incidents import router as incidents_router
from .routes_recommendations import router as recommendations_router
from .routes_optimizer import router as optimizer_router
from .routes_inventory import router as inventory_router
from .routes_actions import router as actions_router
from .routes_proof import router as proof_router
from .routes_stream import router as stream_router

api_router = APIRouter()
api_router.include_router(sim_router)
api_router.include_router(incidents_router)
api_router.include_router(recommendations_router)
api_router.include_router(optimizer_router)
api_router.include_router(inventory_router)
api_router.include_router(actions_router)
api_router.include_router(proof_router)
api_router.include_router(stream_router)
