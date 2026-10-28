import pool from '../db/pool.js';

export async function getItems(userId) {
    const { rows } = await pool.query(
        'SELECT product_id, sku, name, unit_price_cents, currency, quantity FROM cart_items WHERE user_id = $1 ORDER BY product_id',
        [userId],
    );
    return rows;
}

export async function addItem({ userId, productId, sku, name, unitPriceCents, currency, quantity }) {
    await pool.query(
        `INSERT INTO cart_items (user_id, product_id, sku, name, unit_price_cents, currency, quantity)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id, product_id)
         DO UPDATE SET quantity = cart_items.quantity + $7, unit_price_cents = $5, name = $4`,
        [userId, productId, sku, name, unitPriceCents, currency, quantity],
    );
}

export async function removeItem(userId, productId) {
    const { rows } = await pool.query(
        'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2 RETURNING product_id',
        [userId, productId],
    );
    return rows.length > 0;
}

export async function clear(userId) {
    await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
}
