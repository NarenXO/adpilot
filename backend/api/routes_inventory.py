from fastapi import APIRouter
from backend.contracts import load_fixture

router = APIRouter()

@router.get("/inventory-margin")
def get_inventory_margin():
    return load_fixture("inventory_margin")
