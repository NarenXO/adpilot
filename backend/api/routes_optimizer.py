from fastapi import APIRouter
from backend.contracts import load_fixture, WhatIfRequest

router = APIRouter()

@router.get("/optimizer/curves")
def get_optimizer_curves():
    return load_fixture("optimizer_curves")

@router.post("/optimizer/whatif")
def post_whatif(req: WhatIfRequest):
    rec = load_fixture("recommendations")["recommendations"][0]
    return {"recommendation": rec, "total_profit_delta": {"low": 30.0, "mid": 95.0, "high": 170.0}}
