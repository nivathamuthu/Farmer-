from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient

from tests.conftest import auth_header, create_product, session_header


def test_deactivate_hides_product_from_customers(client: TestClient, admin_token: str):
    product = create_product(client, admin_token)
    response = client.patch(
        f"/api/admin/products/{product['id']}/status",
        json={"is_active": False},
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200

    listing = client.get("/api/products")
    assert listing.status_code == 200
    assert all(item["id"] != product["id"] for item in listing.json())

    details = client.get(f"/api/products/{product['id']}")
    assert details.status_code == 404


def test_add_quantity_greater_than_stock(client: TestClient, admin_token: str):
    product = create_product(client, admin_token, stock_quantity=2)
    response = client.post(
        "/api/cart/items",
        json={"product_id": product["id"], "quantity": 3},
        headers=session_header(),
    )
    assert response.status_code == 400
    assert "Only 2 left in stock" in response.json()["detail"]


def test_adding_same_product_twice_merges_quantity(client: TestClient, admin_token: str):
    product = create_product(client, admin_token, stock_quantity=5)
    headers = session_header()
    first = client.post("/api/cart/items", json={"product_id": product["id"], "quantity": 2}, headers=headers)
    second = client.post("/api/cart/items", json={"product_id": product["id"], "quantity": 2}, headers=headers)
    assert first.status_code == 200
    assert second.status_code == 200
    items = second.json()["items"]
    assert len(items) == 1
    assert items[0]["quantity"] == 4

    over = client.post("/api/cart/items", json={"product_id": product["id"], "quantity": 2}, headers=headers)
    assert over.status_code == 400


def test_update_cart_quantity_zero_or_negative_is_rejected(client: TestClient, admin_token: str):
    product = create_product(client, admin_token)
    headers = session_header()
    created = client.post(
        "/api/cart/items",
        json={"product_id": product["id"], "quantity": 1},
        headers=headers,
    )
    assert created.status_code == 200

    zero = client.put(f"/api/cart/items/{product['id']}", json={"quantity": 0}, headers=headers)
    negative = client.put(f"/api/cart/items/{product['id']}", json={"quantity": -1}, headers=headers)
    assert zero.status_code == 422
    assert negative.status_code == 422


def test_checkout_empty_cart(client: TestClient):
    response = client.post(
        "/api/orders/checkout",
        json={"customer_name": "Asha", "phone": "9876543210", "address": "12 Farm Road"},
        headers=session_header("empty-session"),
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Cart is empty"


def test_checkout_revalidates_stock(client: TestClient, admin_token: str):
    product = create_product(client, admin_token, stock_quantity=3, price=10)
    headers = session_header()
    added = client.post("/api/cart/items", json={"product_id": product["id"], "quantity": 3}, headers=headers)
    assert added.status_code == 200

    stock = client.patch(
        f"/api/admin/products/{product['id']}/stock",
        json={"stock_quantity": 1},
        headers=auth_header(admin_token),
    )
    assert stock.status_code == 200

    checkout = client.post(
        "/api/orders/checkout",
        json={"customer_name": "Asha", "phone": "9876543210", "address": "12 Farm Road"},
        headers=headers,
    )
    assert checkout.status_code == 400
    assert "Insufficient stock" in checkout.json()["detail"]

    listing = client.get("/api/products")
    current = next(item for item in listing.json() if item["id"] == product["id"])
    assert current["stock_quantity"] == 1


def test_successful_checkout_reduces_stock_and_clears_cart(client: TestClient, admin_token: str):
    product = create_product(client, admin_token, stock_quantity=5, price=20)
    headers = session_header()
    client.post("/api/cart/items", json={"product_id": product["id"], "quantity": 2}, headers=headers)

    checkout = client.post(
        "/api/orders/checkout",
        json={"customer_name": "Asha", "phone": "9876543210", "address": "12 Farm Road"},
        headers=headers,
    )
    assert checkout.status_code == 201
    body = checkout.json()
    assert body["total_amount"] == 40
    assert body["items"][0]["product_name"] == "Tomatoes"
    assert body["items"][0]["unit_price"] == 20

    cart = client.get("/api/cart", headers=headers)
    assert cart.json()["items"] == []
    assert cart.json()["grand_total"] == 0

    listing = client.get("/api/products")
    current = next(item for item in listing.json() if item["id"] == product["id"])
    assert current["stock_quantity"] == 3

    orders = client.get("/api/orders", headers=headers)
    assert orders.status_code == 200
    assert len(orders.json()) == 1


def test_two_checkouts_cannot_oversell_last_unit(client: TestClient, admin_token: str):
    product = create_product(client, admin_token, stock_quantity=1, price=15)
    for session_id in ("buyer-a", "buyer-b"):
        added = client.post(
            "/api/cart/items",
            json={"product_id": product["id"], "quantity": 1},
            headers=session_header(session_id),
        )
        assert added.status_code == 200

    payload = {"customer_name": "Buyer", "phone": "9876543210", "address": "Market Lane"}

    def place(session_id: str) -> int:
        response = client.post(
            "/api/orders/checkout",
            json=payload,
            headers=session_header(session_id),
        )
        return response.status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        statuses = list(pool.map(place, ("buyer-a", "buyer-b")))

    assert sorted(statuses) == [201, 400]
    listing = client.get("/api/products")
    current = next(item for item in listing.json() if item["id"] == product["id"])
    assert current["stock_quantity"] == 0


def test_negative_stock_or_price_is_rejected(client: TestClient, admin_token: str):
    negative_price = client.post(
        "/api/admin/products",
        json={
            "name": "Bad Price",
            "category": "Vegetables",
            "farmer_name": "Farm",
            "price": -1,
            "stock_quantity": 1,
        },
        headers=auth_header(admin_token),
    )
    negative_stock = client.post(
        "/api/admin/products",
        json={
            "name": "Bad Stock",
            "category": "Vegetables",
            "farmer_name": "Farm",
            "price": 10,
            "stock_quantity": -5,
        },
        headers=auth_header(admin_token),
    )
    assert negative_price.status_code == 422
    assert negative_stock.status_code == 422


def test_admin_uploads_an_image_instead_of_a_url(client: TestClient, admin_token: str, tmp_path, monkeypatch):
    from app import uploads

    monkeypatch.setattr(uploads, "UPLOAD_DIR", tmp_path)
    png = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0\x00\x00\x00\x03\x00\x01\x00\x05\xfe\xd4\xef\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    uploaded = client.post(
        "/api/admin/uploads",
        files={"file": ("tomato.png", png, "image/png")},
        headers=auth_header(admin_token),
    )
    assert uploaded.status_code == 200, uploaded.text
    image_url = uploaded.json()["image_url"]
    assert image_url.startswith("/uploads/")
    assert image_url.endswith(".png")

    product = create_product(client, admin_token, image_url=image_url)
    assert product["image_url"] == image_url

    rejected = client.post(
        "/api/admin/uploads",
        files={"file": ("notes.txt", b"hello", "text/plain")},
        headers=auth_header(admin_token),
    )
    assert rejected.status_code == 400


def test_admin_api_without_token_is_unauthorized(client: TestClient):
    response = client.get("/api/admin/products")
    assert response.status_code == 401


def test_search_and_category_filter_only_active_products(client: TestClient, admin_token: str):
    create_product(client, admin_token, name="Alphonso Mangoes", category="Fruits")
    hidden = create_product(client, admin_token, name="Hidden Mangoes", category="Fruits", is_active=False)
    create_product(client, admin_token, name="Spinach", category="Vegetables")

    by_name = client.get("/api/products", params={"search": "mango"})
    assert by_name.status_code == 200
    names = [item["name"] for item in by_name.json()]
    assert names == ["Alphonso Mangoes"]
    assert hidden["name"] not in names

    by_category = client.get("/api/products", params={"category": "Vegetables"})
    assert [item["name"] for item in by_category.json()] == ["Spinach"]


def test_grand_total_is_calculated_by_server(client: TestClient, admin_token: str):
    first = create_product(client, admin_token, name="Milk", price=68, stock_quantity=10)
    second = create_product(client, admin_token, name="Ghee", price=100, stock_quantity=10)
    headers = session_header("totals")
    client.post("/api/cart/items", json={"product_id": first["id"], "quantity": 2}, headers=headers)
    cart = client.post("/api/cart/items", json={"product_id": second["id"], "quantity": 1}, headers=headers)
    assert cart.status_code == 200
    assert cart.json()["grand_total"] == 236


def test_checkout_one_cart_item_leaves_the_rest(client: TestClient, admin_token: str):
    first = create_product(client, admin_token, name="Milk", price=20, stock_quantity=5)
    second = create_product(client, admin_token, name="Ghee", price=30, stock_quantity=5)
    headers = session_header("one-item")
    client.post("/api/cart/items", json={"product_id": first["id"], "quantity": 1}, headers=headers)
    client.post("/api/cart/items", json={"product_id": second["id"], "quantity": 2}, headers=headers)

    checkout = client.post(
        "/api/orders/checkout",
        json={
            "customer_name": "Asha",
            "phone": "9876543210",
            "address": "12 Farm Road",
            "product_id": first["id"],
        },
        headers=headers,
    )
    assert checkout.status_code == 201
    assert [item["product_name"] for item in checkout.json()["items"]] == ["Milk"]
    assert checkout.json()["total_amount"] == 20

    cart = client.get("/api/cart", headers=headers)
    assert [item["name"] for item in cart.json()["items"]] == ["Ghee"]
    assert cart.json()["grand_total"] == 60


def test_admin_can_mark_an_order_on_progress_or_delivered(client: TestClient, admin_token: str):
    product = create_product(client, admin_token, stock_quantity=4, price=10)
    headers = session_header("status-buyer")
    client.post("/api/cart/items", json={"product_id": product["id"], "quantity": 1}, headers=headers)
    checkout = client.post(
        "/api/orders/checkout",
        json={"customer_name": "Meera", "phone": "9876543210", "address": "Farm lane"},
        headers=headers,
    )
    assert checkout.status_code == 201
    order_id = checkout.json()["id"]
    assert checkout.json()["status"] == "PLACED"

    progress = client.patch(
        f"/api/admin/orders/{order_id}/status",
        json={"status": "ON_PROGRESS"},
        headers=auth_header(admin_token),
    )
    assert progress.status_code == 200
    assert progress.json()["status"] == "ON_PROGRESS"

    delivered = client.patch(
        f"/api/admin/orders/{order_id}/status",
        json={"status": "DELIVERED"},
        headers=auth_header(admin_token),
    )
    assert delivered.status_code == 200
    assert delivered.json()["status"] == "DELIVERED"
