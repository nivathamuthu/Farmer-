# Farmer Products Shopping Cart System

A full-stack e-commerce app where farmers' products are managed by an **Admin** and browsed/purchased by **Customers**.

- **Frontend:** React (Vite), React Router, Axios
- **Backend:** Python, FastAPI, SQLAlchemy
- **Database:** PostgreSQL
- **Auth:** JWT (admin only)
- **DevOps:** Docker + docker-compose

---

## 1. Project Overview

| Module | Features |
|---|---|
| Admin Portal | Login, add / edit / delete product, upload a product image, list products, activate/deactivate, update stock |
| Customer Portal | Browse active products, search by name, filter by category, product details, cart (add/update/remove), checkout |

### Business Rules
1. Only **Active** products are shown to customers.
2. Cart quantity can never exceed available stock.
3. Stock can never become negative.
4. Grand total is calculated automatically (on the server).
5. Stock is reduced after successful checkout.
6. All forms are validated (frontend + backend).

---

## 2. Folder Structure

```
farmer-cart/
├── docker-compose.yml
├── .env.example
├── README.md
├── database/
│   └── schema.sql
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── seed.py                  # creates default admin + sample products
│   ├── uploads/                 # admin product images
│   ├── tests/                   # stock and checkout rules
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── database.py
│       ├── security.py          # password hash + JWT
│       ├── uploads.py           # saved image files
│       ├── deps.py              # get_db, get_current_admin
│       ├── models/              # SQLAlchemy models
│       ├── schemas/             # Pydantic schemas
│       ├── routers/
│       │   ├── auth.py
│       │   ├── products.py
│       │   ├── cart.py
│       │   └── orders.py
│       └── services/
│           ├── cart_service.py
│           └── order_service.py # checkout transaction
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── api/axios.js
        ├── context/ (AuthContext, CartContext)
        ├── components/ (Navbar, ProductCard, ProtectedRoute, ...)
        └── pages/
            ├── admin/ (Login, ProductList, ProductForm)
            └── customer/ (ProductListing, ProductDetails, Cart, Checkout, OrderSuccess)
```

---

## 3. Database Schema

File: `database/schema.sql`

```sql
CREATE TABLE admins (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE products (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR(150) NOT NULL,
    category       VARCHAR(80)  NOT NULL,
    farmer_name    VARCHAR(120) NOT NULL,
    description    TEXT,
    price          NUMERIC(10,2) NOT NULL CHECK (price > 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    image_url      TEXT,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP DEFAULT NOW(),
    updated_at     TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_name ON products(name);

CREATE TABLE carts (
    id         SERIAL PRIMARY KEY,
    session_id VARCHAR(64) UNIQUE NOT NULL,   -- guest id from browser
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cart_items (
    id         SERIAL PRIMARY KEY,
    cart_id    INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity   INTEGER NOT NULL CHECK (quantity > 0),
    UNIQUE (cart_id, product_id)
);

CREATE TABLE orders (
    id             SERIAL PRIMARY KEY,
    session_id     VARCHAR(64) NOT NULL,
    customer_name  VARCHAR(120) NOT NULL,
    phone          VARCHAR(20)  NOT NULL,
    address        TEXT NOT NULL,
    total_amount   NUMERIC(12,2) NOT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'PLACED',
    created_at     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
    id           SERIAL PRIMARY KEY,
    order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id   INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(150) NOT NULL,       -- snapshot
    unit_price   NUMERIC(10,2) NOT NULL,      -- snapshot
    quantity     INTEGER NOT NULL CHECK (quantity > 0)
);
```

> Price and name are copied into `order_items` so old orders never change when a product is edited or deleted.

---

## 4. API Design

Base URL: `http://localhost:8000/api`
Interactive docs: `http://localhost:8000/docs`

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | Admin login, returns JWT |

### Products
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/products?search=&category=` | Public | Active products only |
| GET | `/products/{id}` | Public | Details (404 if inactive) |
| GET | `/admin/products` | Admin | All products incl. inactive |
| POST | `/admin/uploads` | Admin | Upload a product image (JPG, PNG, WEBP, or GIF, up to 5 MB) |
| POST | `/admin/products` | Admin | Create |
| PUT | `/admin/products/{id}` | Admin | Edit |
| PATCH | `/admin/products/{id}/status` | Admin | Activate / deactivate |
| PATCH | `/admin/products/{id}/stock` | Admin | Update stock |
| DELETE | `/admin/products/{id}` | Admin | Delete |

### Cart (header `X-Session-Id: <uuid>`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/cart` | View cart with line totals and grand total |
| POST | `/cart/items` | Add `{product_id, quantity}` |
| PUT | `/cart/items/{product_id}` | Update quantity |
| DELETE | `/cart/items/{product_id}` | Remove item |

### Orders
| Method | Endpoint | Description |
|---|---|---|
| POST | `/orders/checkout` | Body: `{customer_name, phone, address}` |
| GET | `/orders` | Customer's orders (by session id) |
| GET | `/admin/orders` | All orders (admin) |

### Error codes
`400` bad request / insufficient stock, `401` unauthorized, `404` not found, `422` validation error.

---

## 5. Key Backend Logic

### Add / update cart item
```
1. Load product -> must exist AND is_active
2. new_qty = existing_qty + requested (or requested for update)
3. if new_qty > product.stock_quantity -> 400 "Only N left in stock"
4. Save
```

### Checkout (must be atomic)
```python
with db.begin():
    items = get_cart_items(session_id)
    if not items: raise HTTPException(400, "Cart is empty")

    total = 0
    for item in items:
        product = (db.query(Product)
                     .filter(Product.id == item.product_id)
                     .with_for_update()          # row lock, prevents overselling
                     .one())
        if not product.is_active:
            raise HTTPException(400, f"{product.name} is no longer available")
        if item.quantity > product.stock_quantity:
            raise HTTPException(400, f"Insufficient stock for {product.name}")
        product.stock_quantity -= item.quantity
        total += product.price * item.quantity
        # create OrderItem snapshot (name, unit_price, quantity)

    # create Order with total, then clear cart items
```
If anything fails, the whole transaction rolls back.

### Validation rules (Pydantic)
- name, category, farmer_name: required, length limits
- price: `> 0`
- stock_quantity: `>= 0`
- image_url: optional uploaded path (`/uploads/...`) or an http(s) URL
- checkout phone: 10 digits; name and address required
- cart quantity: `>= 1`

---

## 6. Frontend Pages & Routes

| Route | Page | Access |
|---|---|---|
| `/` | Product Listing (search + category filter) | Customer |
| `/products/:id` | Product Details + Add to Cart | Customer |
| `/cart` | Shopping Cart (qty +/-, remove, grand total) | Customer |
| `/checkout` | Checkout form + order summary | Customer |
| `/order-success` | Order confirmation | Customer |
| `/admin/login` | Admin Login | Public |
| `/admin/products` | Product List (status toggle, stock, edit, delete) | Admin |
| `/admin/products/new` | Add Product | Admin |
| `/admin/products/:id/edit` | Edit Product | Admin |

Frontend notes:
- Generate `session_id` with `crypto.randomUUID()` on first visit, store in `localStorage`, add to every request via an Axios interceptor.
- Store admin JWT in `localStorage`; a `ProtectedRoute` redirects to `/admin/login` if missing.
- Show cart count in Navbar (CartContext).
- The add/edit product form uploads an image file; the saved `image_url` is `/uploads/...`.
- Disable "+" when quantity equals stock; show loading, empty and error states.
- Responsive layout using CSS grid / Tailwind.

---

## 7. Environment Configuration

File: `.env.example`

```env
# Database
POSTGRES_USER=farmer
POSTGRES_PASSWORD=farmer123
POSTGRES_DB=farmer_cart
POSTGRES_HOST=db
POSTGRES_PORT=5432
DATABASE_URL=postgresql+psycopg2://farmer:farmer123@db:5432/farmer_cart

# Backend
SECRET_KEY=change_this_to_a_long_random_string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Default admin (created by seed.py)
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=admin

# Frontend
VITE_API_URL=http://localhost:8000/api
```

---

## 8. Docker Setup

### `docker-compose.yml`
```yaml
services:
  db:
    image: postgres:16
    env_file: .env
    ports: ["5432:5432"]
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER}"]
      interval: 5s
      retries: 10

  backend:
    build: ./backend
    env_file: .env
    ports: ["8000:8000"]
    volumes:
      - uploads:/app/uploads
    depends_on:
      db:
        condition: service_healthy
    command: >
      sh -c "python seed.py &&
             uvicorn app.main:app --host 0.0.0.0 --port 8000"

  frontend:
    build: ./frontend
    env_file: .env
    ports: ["5173:5173"]
    depends_on: [backend]

volumes:
  pgdata:
  uploads:
```

### `backend/Dockerfile`
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
```

### `frontend/Dockerfile`
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev", "--", "--host"]
```

### `backend/requirements.txt`
```
fastapi
uvicorn[standard]
sqlalchemy
psycopg2-binary
alembic
pydantic[email]
pydantic-settings
python-jose[cryptography]
passlib[bcrypt]
bcrypt==4.0.1
python-multipart
pytest
httpx
```

---

## 9. How to Run

### Option A: Docker (recommended)
```bash
git clone <your-repo-url>
cd farmer-cart
cp .env.example .env
docker compose up --build
```
- Customer site: http://localhost:5173
- Admin login: http://localhost:5173/admin/login (`admin@gmail.com` / `admin`)
- API docs: http://localhost:8000/docs

### Option B: Manual (without Docker)

**Database**
```bash
psql -U postgres -c "CREATE DATABASE farmer_cart;"
psql -U postgres -d farmer_cart -f database/schema.sql
```

**Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env         # set POSTGRES_HOST=localhost and DATABASE_URL host to localhost
python seed.py
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

---

## 10. Build Checklist (step-by-step to do)

### Phase 1: Setup (30 min)
- [ ] Create GitHub repo and folder structure
- [ ] Write `docker-compose.yml`, `.env.example`, Dockerfiles
- [ ] Write `database/schema.sql` and confirm the DB starts

### Phase 2: Backend core (2-3 hrs)
- [ ] `config.py`, `database.py`, SQLAlchemy models
- [ ] Keep `database/schema.sql` as the source of truth (no Alembic migrations)
- [ ] `security.py` (bcrypt + JWT), `deps.py` (`get_current_admin`)
- [ ] `POST /auth/login`
- [ ] `seed.py` (admin + 8-10 sample products across categories)
- [ ] Product CRUD, status toggle, stock update
- [ ] Public product list with search + category filter (active only)

### Phase 3: Cart & orders (2 hrs)
- [ ] Session-based cart (`X-Session-Id` header dependency)
- [ ] Add / update / remove / view cart with stock checks
- [ ] Grand total calculated server-side
- [ ] Checkout in one transaction with `with_for_update()`
- [ ] View orders (customer and admin)
- [ ] Test all business rules in `/docs`

### Phase 4: Frontend (4-5 hrs)
- [ ] Vite + React + Router + Axios setup, interceptors
- [ ] AuthContext, ProtectedRoute, CartContext
- [ ] Admin: Login, Product List, Add/Edit form with image upload and validation
- [ ] Customer: Listing (search, filter), Details, Cart, Checkout, Order success
- [ ] Responsive styling, loading/empty/error states, toasts

### Phase 5: Polish & submit (1 hr)
- [ ] Test the full flow from a clean clone with `docker compose up`
- [ ] Add screenshots to `/screenshots` (optional)
- [ ] Backend tests (pytest) for stock and checkout rules in `backend/tests`
- [ ] Final README review, push to GitHub, share the link

---

## 11. Test Scenarios (verify before submitting)

| # | Scenario | Expected |
|---|---|---|
| 1 | Admin deactivates a product | Disappears from the customer list; details return 404 |
| 2 | Add quantity greater than stock | 400 error with message |
| 3 | Add same product twice | Quantity merges, still capped by stock |
| 4 | Update cart quantity to 0 or negative | Rejected (422) |
| 5 | Checkout with an empty cart | 400 error |
| 6 | Stock changes after item was added to cart | Checkout re-validates and fails cleanly |
| 7 | Successful checkout | Stock reduced, cart cleared, order saved with totals |
| 8 | Two simultaneous checkouts for the last unit | Only one succeeds |
| 9 | Admin sets a negative stock or price | 422 validation error |
| 10 | Open admin API without a token | 401 |

---

## 12. Assumptions

1. Only the admin has an account; customers are **guests** identified by a UUID (`session_id`) stored in the browser's localStorage.
2. A single admin role is enough; the default admin is created by `seed.py`.
3. Checkout collects name, phone and address; payment is out of scope (treated as Cash on Delivery).
4. Admins upload product images (JPG, PNG, WEBP, or GIF, up to 5 MB). Files are stored under `backend/uploads` and served at `/uploads`. An http(s) URL is still accepted.
5. Prices are in INR, stored as `NUMERIC(10,2)`.
6. Deleting a product keeps historical orders intact because order items store a snapshot of name and price.
7. The grand total is always computed by the backend; the frontend only displays it.

---

## 13. Future Improvements
- Customer registration and login
- Pagination and sorting
- Payment gateway integration
- Order status management for the admin
- A CI pipeline for the existing pytest suite
