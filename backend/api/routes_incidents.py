from fastapi import APIRouter
from backend.contracts import load_fixture

router = APIRouter()

@router.get('/')
def get_incidents():
    return load_fixture('incidents')
