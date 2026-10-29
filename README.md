# cart-ms

Shopping cart and checkout. Part of the Cross-Repo Review test system (iam-ms, catalog-ms, cart-ms, orders-ms, invoices).

## Provides

| Contract | Kind | Used by |
| --- | --- | --- |
| `GET /carts/me` → `{ userId, owner, items, total, currency }` | HTTP | clients |
| `POST /carts/me/items`, `DELETE /carts/me/items/:productId` | HTTP | clients |
| `POST /carts/me/checkout` → `{ invoiceId, total }` | HTTP | clients |
| `cart.checked_out` `{ checkoutId, userId, invoiceId, total, currency, lines[{ productId, sku, description, quantity, unitPrice }] }` | Event (published) | orders-ms |
| `checkout.failed` `{ userId, reason, reserved[{ productId, quantity }] }` | Event (published) | catalog-ms |

## Consumes

| Contract | From | Where |
| --- | --- | --- |
| `POST /auth/verify` | iam-ms | `lib/iamClient.js`, `middleware/requireAuth.js` |
| `GET /users/:id` (`fullName`, `email`) | iam-ms | `lib/iamClient.js`, `carts/index.js` |
| `GET /products/:id` (`id`, `sku`, `name`, `price`, `currency`) | catalog-ms | `lib/catalogClient.js`, `carts/index.js` |
| `POST /products/:id/reserve` (expects `409` when out of stock) | catalog-ms | `lib/catalogClient.js` |
| `POST /invoices` (`lines[].unitPrice`) with header `x-internal-key` | invoices | `lib/invoicesClient.js` |
| `product.updated` `{ id, sku, name, price, currency }` → refresh cart lines | catalog-ms | `events/consumers.js` (queue `cart-ms.events`) |
| Env vars `IAM_BASE_URL`, `CATALOG_BASE_URL`, `INVOICES_BASE_URL`, `INVOICES_API_KEY`, `RABBITMQ_URL` | deployment | `lib/*Client.js`, `lib/events.js` |

## Events

Async events go over the RabbitMQ topic exchange `shop.events` (routing key = event type, envelope `{ id, type, source, occurredAt, data }`). See `lib/events.js`.

## Run

```bash
docker run -d --name rabbitmq -p 5672:5672 rabbitmq:3-alpine   # shared event broker
cp .env.example .env
npm install
npm run migrate
npm start
```
