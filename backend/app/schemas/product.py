from datetime import datetime
from decimal import Decimal
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_serializer, field_validator


def _clean_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("must not be blank")
    return cleaned


def _validate_image_url(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    if cleaned.startswith("/uploads/") and ".." not in cleaned:
        return cleaned
    parsed = urlparse(cleaned)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("image_url must be an uploaded image or a valid http or https URL")
    return cleaned


class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    category: str = Field(min_length=1, max_length=80)
    farmer_name: str = Field(min_length=1, max_length=120)
    description: str | None = None
    price: Decimal = Field(gt=0, le=Decimal("99999999.99"))
    stock_quantity: int = Field(ge=0)
    image_url: str | None = None
    is_active: bool = True

    @field_validator("name", "category", "farmer_name")
    @classmethod
    def strip_required(cls, value: str) -> str:
        return _clean_text(value)

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @field_validator("image_url")
    @classmethod
    def check_image_url(cls, value: str | None) -> str | None:
        return _validate_image_url(value)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(ProductBase):
    pass


class ProductStatusUpdate(BaseModel):
    is_active: bool


class StockUpdate(BaseModel):
    stock_quantity: int = Field(ge=0)


class ProductOut(BaseModel):
    id: int
    name: str
    category: str
    farmer_name: str
    description: str | None
    price: Decimal
    stock_quantity: int
    image_url: str | None
    is_active: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}

    @field_serializer("price")
    def serialize_price(self, value: Decimal) -> float:
        return float(value)
