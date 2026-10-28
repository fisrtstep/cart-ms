import { JSON_HEADERS, timeout } from './http.js';

const base = () => process.env.INVOICES_BASE_URL;

// POST /invoices { userId, currency, lines: [{ sku, description, quantity, unitPrice }] } -> { id, total, ... }
export async function createInvoice({ userId, currency, lines }) {
    const res = await fetch(`${base()}/invoices`, {
        method: 'POST',
        headers: { ...JSON_HEADERS, 'x-internal-key': process.env.INVOICES_API_KEY },
        body: JSON.stringify({ userId, currency, lines }),
        signal: timeout(),
    });
    if (!res.ok) throw new Error(`invoices responded ${res.status}`);
    return res.json();
}
