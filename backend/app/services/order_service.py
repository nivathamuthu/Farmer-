from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import update
from sqlalchemy.orm import Session, joinedload

from app.models import Cart, CartItem, Order, OrderItem, Product
from app.schemas.order import CheckoutRequest, OrderOut


def _money(value: Decimal) -> Decimal:
    return Decimal(value).quantize(Decimal("0.01"))


def serialize_order(order: Order) -> OrderOut:
    items = []
    for item in order.items:
        unit_price = _money(item.unit_price)
        items.append(
            {
                "id": item.id,
                "product_id": item.product_id,
                "product_name": item.product_name,
                "unit_price": unit_price,
                "quantity": item.quantity,
                "line_total": _money(unit_price * item.quantity),
            }
        )
    return OrderOut(
        id=order.id,
        session_id=order.session_id,
        customer_name=order.customer_name,
        phone=order.phone,
        address=order.address,
        total_amount=_money(order.total_amount),
        status=order.status,
        created_at=order.created_at,
        items=items,
    )


def checkout(db: Session, session_id: str, payload: CheckoutRequest) -> OrderOut:
    cart = db.query(Cart).filter(Cart.session_id == session_id).first()
    if cart is None:
        raise HTTPException(status_code=400, detail="Cart is empty")

    items = (
        db.query(CartItem)
        .filter(CartItem.cart_id == cart.id)
        .order_by(CartItem.product_id)
        .all()
    )
    if payload.product_id is not None:
        items = [item for item in items if item.product_id == payload.product_id]
        if not items:
            raise HTTPException(status_code=400, detail="That item is not in the cart")
    if not items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    order = Order(
        session_id=session_id,
        customer_name=payload.customer_name,
        phone=payload.phone,
        address=payload.address,
        total_amount=Decimal("0.00"),
        status="PLACED",
    )
    db.add(order)
    db.flush()

    total = Decimal("0.00")
    for item in items:
        product = (
            db.query(Product)
            .filter(Product.id == item.product_id)
            .with_for_update()
            .one()
        )
        if not product.is_active:
            raise HTTPException(status_code=400, detail=f"{product.name} is no longer available")
        if item.quantity > product.stock_quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name}")

        product_name = product.name
        unit_price = _money(product.price)
        # Row lock above waits on PostgreSQL. The conditional update is the
        # actual stock change, so a second checkout cannot oversell.
        result = db.execute(
            update(Product)
            .where(
                Product.id == product.id,
                Product.is_active.is_(True),
                Product.stock_quantity >= item.quantity,
            )
            .values(stock_quantity=Product.stock_quantity - item.quantity)
        )
        if result.rowcount != 1:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product_name}")
        db.expire(product)

        line_total = _money(unit_price * item.quantity)
        total += line_total
        order.items.append(
            OrderItem(
                product_id=product.id,
                product_name=product_name,
                unit_price=unit_price,
                quantity=item.quantity,
            )
        )

    order.total_amount = _money(total)
    for item in list(items):
        db.delete(item)
    db.flush()
    db.refresh(order)
    return serialize_order(order)


def list_orders_for_session(db: Session, session_id: str) -> list[OrderOut]:
    orders = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.session_id == session_id)
        .order_by(Order.created_at.desc(), Order.id.desc())
        .all()
    )
    return [serialize_order(order) for order in orders]


def update_order_status(db: Session, order_id: int, status: str) -> OrderOut:
    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order_id).first()
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = status
    db.flush()
    db.refresh(order)
    return serialize_order(order)


def list_all_orders(db: Session) -> list[OrderOut]:
    orders = (
        db.query(Order)
        .options(joinedload(Order.items))
        .order_by(Order.created_at.desc(), Order.id.desc())
        .all()
    )
    return [serialize_order(order) for order in orders]
