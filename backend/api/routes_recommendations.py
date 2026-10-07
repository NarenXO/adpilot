from fastapi import APIRouter
from backend.contracts import load_fixture

router = APIRouter()

@router.get("/recommendations")
def get_recommendations():
    return load_fixture("recommendations")
