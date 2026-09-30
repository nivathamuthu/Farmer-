from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models import Cart, CartItem, Product
from app.schemas.cart import CartOut


def _money(value: Decimal) -> Decimal:
    return Decimal(value).quantize(Decimal("0.01"))


def get_or_create_cart(db: Session, session_id: str) -> Cart:
    cart = db.query(Cart).filter(Cart.session_id == session_id).first()
    if cart is None:
        cart = Cart(session_id=session_id)
        db.add(cart)
        db.flush()
    return cart


def _active_product(db: Session, product_id: int) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


def _ensure_stock(product: Product, quantity: int) -> None:
    if quantity > product.stock_quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Only {product.stock_quantity} left in stock",
        )


def build_cart(db: Session, session_id: str) -> CartOut:
    cart = (
        db.query(Cart)
        .options(joinedload(Cart.items).joinedload(CartItem.product))
        .filter(Cart.session_id == session_id)
        .first()
    )
    items = []
    grand_total = Decimal("0.00")
    if cart is not None:
        for item in cart.items:
            product = item.product
            if product is None:
                continue
            line_total = _money(product.price * item.quantity)
            grand_total += line_total
            items.append(
                {
                    "product_id": product.id,
                    "name": product.name,
                    "category": product.category,
                    "farmer_name": product.farmer_name,
                    "image_url": product.image_url,
                    "price": _money(product.price),
                    "quantity": item.quantity,
                    "stock_quantity": product.stock_quantity,
                    "line_total": line_total,
                }
            )
    return CartOut(items=items, grand_total=_money(grand_total))


def add_item(db: Session, session_id: str, product_id: int, quantity: int) -> CartOut:
    product = _active_product(db, product_id)
    cart = get_or_create_cart(db, session_id)
    item = (
        db.query(CartItem)
        .filter(CartItem.cart_id == cart.id, CartItem.product_id == product.id)
        .first()
    )
    new_qty = (item.quantity if item else 0) + quantity
    _ensure_stock(product, new_qty)
    if item is None:
        db.add(CartItem(cart_id=cart.id, product_id=product.id, quantity=new_qty))
    else:
        item.quantity = new_qty
    db.flush()
    return build_cart(db, session_id)


def update_item(db: Session, session_id: str, product_id: int, quantity: int) -> CartOut:
    product = _active_product(db, product_id)
    cart = db.query(Cart).filter(Cart.session_id == session_id).first()
    if cart is None:
        raise HTTPException(status_code=404, detail="Cart item not found")
    item = (
        db.query(CartItem)
        .filter(CartItem.cart_id == cart.id, CartItem.product_id == product.id)
        .first()
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Cart item not found")
    _ensure_stock(product, quantity)
    item.quantity = quantity
    db.flush()
    return build_cart(db, session_id)


def remove_item(db: Session, session_id: str, product_id: int) -> CartOut:
    cart = db.query(Cart).filter(Cart.session_id == session_id).first()
    if cart is not None:
        item = (
            db.query(CartItem)
            .filter(CartItem.cart_id == cart.id, CartItem.product_id == product_id)
            .first()
        )
        if item is not None:
            db.delete(item)
            db.flush()
    return build_cart(db, session_id)
