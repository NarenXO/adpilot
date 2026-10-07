from fastapi import FastAPI
from backend.api.router import api_router

app = FastAPI(title="AdPilot API", version="10.0.0")

# Include all API routes under the /api prefix
app.include_router(api_router, prefix="/api")
