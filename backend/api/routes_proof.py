from fastapi import APIRouter
from backend.contracts import load_fixture

router = APIRouter()

@router.get("/proof/scorecard")
def get_scorecard():
    return load_fixture("scorecard")
