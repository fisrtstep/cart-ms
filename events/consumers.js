import { subscribe } from '../lib/events.js';
import { refreshProduct } from '../carts/repository.js';

export async function startConsumers() {
    await subscribe('cart-ms.events', {
        // { id, sku, name, price, currency }
        'product.updated': (data) =>
            refreshProduct({
                productId: data.id,
                name: data.name,
                unitPriceCents: Math.round(data.price * 100),
                currency: data.currency,
            }),
    });
}
