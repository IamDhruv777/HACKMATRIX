from fastapi import APIRouter
from app.services.network_service import get_network_elements

router = APIRouter()

@router.get("")
def get_network():
    return get_network_elements()
