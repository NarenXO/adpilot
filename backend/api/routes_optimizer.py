from fastapi import APIRouter
from backend.contracts import load_fixture

router = APIRouter()

@router.get('/')
def get_optimizer():
    return load_fixture('optimizer_curves')
