CREATE TABLE cart_items (
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    unit_price_cents INTEGER NOT NULL,
    currency TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    PRIMARY KEY (user_id, product_id)
);
