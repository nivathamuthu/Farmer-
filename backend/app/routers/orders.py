from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_admin, get_session_id
from app.models import Admin
from app.schemas.order import CheckoutRequest, OrderOut, OrderStatusUpdate
from app.services import order_service

router = APIRouter(tags=["orders"])


@router.post("/orders/checkout", response_model=OrderOut, status_code=201)
def checkout(
    payload: CheckoutRequest,
    session_id: str = Depends(get_session_id),
    db: Session = Depends(get_db),
) -> OrderOut:
    return order_service.checkout(db, session_id, payload)


@router.get("/orders", response_model=list[OrderOut])
def list_my_orders(
    session_id: str = Depends(get_session_id),
    db: Session = Depends(get_db),
) -> list[OrderOut]:
    return order_service.list_orders_for_session(db, session_id)


@router.patch("/admin/orders/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
) -> OrderOut:
    return order_service.update_order_status(db, order_id, payload.status)


@router.get("/admin/orders", response_model=list[OrderOut])
def list_admin_orders(
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
) -> list[OrderOut]:
    return order_service.list_all_orders(db)
