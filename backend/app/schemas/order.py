from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, field_serializer, field_validator


class CheckoutRequest(BaseModel):
    customer_name: str = Field(min_length=1, max_length=120)
    phone: str = Field(pattern=r"^\d{10}$")
    address: str = Field(min_length=1)
    product_id: int | None = Field(default=None, ge=1)

    @field_validator("customer_name", "address")
    @classmethod
    def strip_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("must not be blank")
        return cleaned


class OrderStatusUpdate(BaseModel):
    status: Literal["ON_PROGRESS", "DELIVERED"]


class OrderItemOut(BaseModel):
    id: int
    product_id: int | None
    product_name: str
    unit_price: Decimal
    quantity: int
    line_total: Decimal

    @field_serializer("unit_price", "line_total")
    def serialize_money(self, value: Decimal) -> float:
        return float(value)


class OrderOut(BaseModel):
    id: int
    session_id: str
    customer_name: str
    phone: str
    address: str
    total_amount: Decimal
    status: str
    created_at: datetime | None = None
    items: list[OrderItemOut]

    @field_serializer("total_amount")
    def serialize_total(self, value: Decimal) -> float:
        return float(value)
