# cart-ms

Shopping cart and checkout. Part of the Cross-Repo Review test system (iam-ms, catalog-ms, cart-ms, invoices).

## Provides

| Contract | Kind | Used by |
| --- | --- | --- |
| `GET /carts/me` → `{ userId, owner, items, total, currency }` | HTTP | clients |
| `POST /carts/me/items`, `DELETE /carts/me/items/:productId` | HTTP | clients |
| `POST /carts/me/checkout` → `{ invoiceId, total }` | HTTP | clients |

## Consumes

| Contract | From | Where |
| --- | --- | --- |
| `POST /auth/verify` | iam-ms | `lib/iamClient.js`, `middleware/requireAuth.js` |
| `GET /users/:id` (`fullName`, `email`) | iam-ms | `lib/iamClient.js`, `carts/index.js` |
| `GET /products/:id` (`id`, `sku`, `name`, `price`, `currency`) | catalog-ms | `lib/catalogClient.js`, `carts/index.js` |
| `POST /products/:id/reserve` (expects `409` when out of stock) | catalog-ms | `lib/catalogClient.js` |
| `POST /invoices` (`lines[].unitPrice`) with header `x-internal-key` | invoices | `lib/invoicesClient.js` |
| Env vars `IAM_BASE_URL`, `CATALOG_BASE_URL`, `INVOICES_BASE_URL`, `INVOICES_API_KEY` | deployment | `lib/*Client.js` |

## Run

```bash
cp .env.example .env
npm install
npm run migrate
npm start
```
