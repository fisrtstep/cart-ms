import { JSON_HEADERS, timeout } from './http.js';

const base = () => process.env.CATALOG_BASE_URL;

// GET /products/:id -> { id, sku, name, price, currency, stock, category }
export async function getProduct(id) {
    const res = await fetch(`${base()}/products/${id}`, { signal: timeout() });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`catalog-ms responded ${res.status}`);
    return res.json();
}

// POST /products/:id/reserve { quantity } -> 200 { reserved, remaining } | 409 INSUFFICIENT_STOCK
export async function reserveStock(id, quantity) {
    const res = await fetch(`${base()}/products/${id}/reserve`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ quantity }),
        signal: timeout(),
    });
    if (res.status === 409) return { ok: false, reason: 'INSUFFICIENT_STOCK' };
    if (!res.ok) throw new Error(`catalog-ms responded ${res.status}`);
    return { ok: true, ...(await res.json()) };
}
