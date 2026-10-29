import express from 'express';
import { randomUUID } from 'node:crypto';
import { requireAuth } from '../middleware/requireAuth.js';
import { getUser } from '../lib/iamClient.js';
import { getProduct, reserveStock } from '../lib/catalogClient.js';
import { createInvoice } from '../lib/invoicesClient.js';
import { getItems, addItem, removeItem, clear } from './repository.js';
import { publish } from '../lib/events.js';

const cartsRouter = express.Router();
cartsRouter.use(requireAuth);

async function buildCart(userId) {
    const rows = await getItems(userId);
    const items = rows.map((r) => ({
        productId: r.product_id,
        sku: r.sku,
        name: r.name,
        unitPrice: r.unit_price_cents / 100,
        quantity: r.quantity,
    }));
    const totalCents = rows.reduce((sum, r) => sum + r.unit_price_cents * r.quantity, 0);
    const user = await getUser(userId).catch(() => null);
    return {
        userId,
        owner: user ? { name: user.fullName, email: user.email } : null,
        items,
        total: totalCents / 100,
        currency: rows[0]?.currency ?? 'USD',
    };
}

// GET /carts/me -> { userId, owner, items, total, currency }
cartsRouter.get('/me', async (req, res, next) => {
    try {
        res.json(await buildCart(req.userId));
    } catch (err) {
        next(err);
    }
});

// POST /carts/me/items { productId, quantity? } -> Cart
cartsRouter.post('/me/items', async (req, res, next) => {
    try {
        const { productId, quantity = 1 } = req.body ?? {};
        if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({ error: 'productId and a positive integer quantity are required' });
        }
        const product = await getProduct(productId);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        await addItem({
            userId: req.userId,
            productId: product.id,
            sku: product.sku,
            name: product.name,
            unitPriceCents: Math.round(product.price * 100),
            currency: product.currency,
            quantity,
        });
        res.status(201).json(await buildCart(req.userId));
    } catch (err) {
        next(err);
    }
});

// DELETE /carts/me/items/:productId -> Cart
cartsRouter.delete('/me/items/:productId', async (req, res, next) => {
    try {
        const productId = Number(req.params.productId);
        if (!Number.isInteger(productId)) return res.status(400).json({ error: 'invalid productId' });
        if (!(await removeItem(req.userId, productId))) return res.status(404).json({ error: 'Item not in cart' });
        res.json(await buildCart(req.userId));
    } catch (err) {
        next(err);
    }
});

// POST /carts/me/checkout -> { invoiceId, total }
// Reserves stock for every line, then issues the invoice and empties the cart.
// Publishes `cart.checked_out` on success. If anything fails after a reservation,
// publishes `checkout.failed` with the reserved lines so catalog-ms puts the stock back.
cartsRouter.post('/me/checkout', async (req, res, next) => {
    const reserved = [];
    const fail = (reason) =>
        reserved.length === 0
            ? Promise.resolve()
            : publish('checkout.failed', { userId: req.userId, reason, reserved }).catch((err) =>
                  console.error('could not publish checkout.failed', err),
              );
    try {
        const rows = await getItems(req.userId);
        if (rows.length === 0) return res.status(400).json({ error: 'Cart is empty' });

        for (const row of rows) {
            const result = await reserveStock(row.product_id, row.quantity);
            if (!result.ok) {
                await fail('OUT_OF_STOCK');
                return res.status(409).json({ error: 'OUT_OF_STOCK', productId: row.product_id });
            }
            reserved.push({ productId: row.product_id, quantity: row.quantity });
        }

        const lines = rows.map((r) => ({
            productId: r.product_id,
            sku: r.sku,
            description: r.name,
            quantity: r.quantity,
            unitPrice: r.unit_price_cents / 100,
        }));
        const invoice = await createInvoice({
            userId: req.userId,
            currency: rows[0].currency,
            lines: lines.map(({ productId: _productId, ...line }) => line),
        });
        reserved.length = 0;
        await publish('cart.checked_out', {
            checkoutId: randomUUID(),
            userId: req.userId,
            invoiceId: invoice.id,
            total: invoice.total,
            currency: rows[0].currency,
            lines,
        });
        await clear(req.userId);
        res.status(201).json({ invoiceId: invoice.id, total: invoice.total });
    } catch (err) {
        await fail('ERROR');
        next(err);
    }
});

export default cartsRouter;
