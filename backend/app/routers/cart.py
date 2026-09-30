from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_session_id
from app.schemas.cart import CartItemCreate, CartItemUpdate, CartOut
from app.services import cart_service

router = APIRouter(tags=["cart"])


@router.get("/cart", response_model=CartOut)
def view_cart(session_id: str = Depends(get_session_id), db: Session = Depends(get_db)) -> CartOut:
    return cart_service.build_cart(db, session_id)


@router.post("/cart/items", response_model=CartOut)
def add_cart_item(
    payload: CartItemCreate,
    session_id: str = Depends(get_session_id),
    db: Session = Depends(get_db),
) -> CartOut:
    return cart_service.add_item(db, session_id, payload.product_id, payload.quantity)


@router.put("/cart/items/{product_id}", response_model=CartOut)
def update_cart_item(
    product_id: int,
    payload: CartItemUpdate,
    session_id: str = Depends(get_session_id),
    db: Session = Depends(get_db),
) -> CartOut:
    return cart_service.update_item(db, session_id, product_id, payload.quantity)


@router.delete("/cart/items/{product_id}", response_model=CartOut)
def remove_cart_item(
    product_id: int,
    session_id: str = Depends(get_session_id),
    db: Session = Depends(get_db),
) -> CartOut:
    return cart_service.remove_item(db, session_id, product_id)
