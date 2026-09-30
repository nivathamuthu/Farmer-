from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_admin
from app.models import Admin, CartItem, DeletedProduct, Product
from app import uploads
from app.schemas.product import (
    ProductCreate,
    ProductOut,
    ProductStatusUpdate,
    ProductUpdate,
    StockUpdate,
)

router = APIRouter(tags=["products"])


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@router.get("/products", response_model=list[ProductOut])
def list_products(
    search: str | None = Query(default=None),
    category: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[Product]:
    query = db.query(Product).filter(Product.is_active.is_(True))
    if search and search.strip():
        query = query.filter(Product.name.ilike(f"%{_escape_like(search.strip())}%", escape="\\"))
    if category and category.strip():
        query = query.filter(Product.category.ilike(category.strip()))
    return query.order_by(Product.name).all()


@router.get("/products/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)) -> Product:
    product = db.query(Product).filter(Product.id == product_id, Product.is_active.is_(True)).first()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.get("/admin/products", response_model=list[ProductOut])
def admin_list_products(
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
) -> list[Product]:
    return db.query(Product).order_by(Product.id.desc()).all()


@router.post("/admin/uploads")
async def upload_product_image(
    file: UploadFile = File(...),
    _: Admin = Depends(get_current_admin),
) -> dict[str, str]:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in uploads.ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Upload a JPG, PNG, WEBP, or GIF image")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Image file is empty")
    if len(content) > uploads.MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image must be 5 MB or smaller")
    uploads.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{suffix}"
    (uploads.UPLOAD_DIR / filename).write_bytes(content)
    return {"image_url": f"/uploads/{filename}"}


@router.post("/admin/products", response_model=ProductOut, status_code=201)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
) -> Product:
    product = Product(**payload.model_dump())
    db.add(product)
    db.flush()
    db.refresh(product)
    return product


@router.put("/admin/products/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    for key, value in payload.model_dump().items():
        setattr(product, key, value)
    product.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.flush()
    db.refresh(product)
    return product


@router.patch("/admin/products/{product_id}/status", response_model=ProductOut)
def update_status(
    product_id: int,
    payload: ProductStatusUpdate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_active = payload.is_active
    product.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.flush()
    db.refresh(product)
    return product


@router.patch("/admin/products/{product_id}/stock", response_model=ProductOut)
def update_stock(
    product_id: int,
    payload: StockUpdate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    product.stock_quantity = payload.stock_quantity
    product.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.flush()
    db.refresh(product)
    return product


@router.delete("/admin/products/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
) -> None:
    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    db.add(
        DeletedProduct(
            original_product_id=product.id,
            name=product.name,
            category=product.category,
            farmer_name=product.farmer_name,
            description=product.description,
            price=product.price,
            stock_quantity=product.stock_quantity,
            image_url=product.image_url,
            is_active=product.is_active,
            created_at=product.created_at,
        )
    )
    db.query(CartItem).filter(CartItem.product_id == product.id).delete(synchronize_session=False)
    db.delete(product)
    db.flush()
