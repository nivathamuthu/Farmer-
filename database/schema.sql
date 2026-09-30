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
    session_id VARCHAR(64) UNIQUE NOT NULL,
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

CREATE TABLE deleted_products (
    id                  SERIAL PRIMARY KEY,
    original_product_id INTEGER NOT NULL,
    name                VARCHAR(150) NOT NULL,
    category            VARCHAR(80)  NOT NULL,
    farmer_name         VARCHAR(120) NOT NULL,
    description         TEXT,
    price               NUMERIC(10,2) NOT NULL,
    stock_quantity      INTEGER NOT NULL,
    image_url           TEXT,
    is_active           BOOLEAN NOT NULL,
    created_at          TIMESTAMP,
    deleted_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
    id           SERIAL PRIMARY KEY,
    order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id   INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(150) NOT NULL,
    unit_price   NUMERIC(10,2) NOT NULL,
    quantity     INTEGER NOT NULL CHECK (quantity > 0)
);
