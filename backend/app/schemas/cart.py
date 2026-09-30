from decimal import Decimal

from pydantic import BaseModel, Field, field_serializer


class CartItemCreate(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(ge=1)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1)


class CartItemOut(BaseModel):
    product_id: int
    name: str
    category: str
    farmer_name: str
    image_url: str | None
    price: Decimal
    quantity: int
    stock_quantity: int
    line_total: Decimal

    @field_serializer("price", "line_total")
    def serialize_money(self, value: Decimal) -> float:
        return float(value)


class CartOut(BaseModel):
    items: list[CartItemOut]
    grand_total: Decimal

    @field_serializer("grand_total")
    def serialize_total(self, value: Decimal) -> float:
        return float(value)
