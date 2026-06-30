# Clazico Store

Tienda online Next.js conectada a Velox POS para catalogo, stock y registro de ventas web.

## Stack

- Next.js 16 App Router + React 19
- TypeScript
- Tailwind CSS 4
- tRPC 11 + TanStack Query
- Better Auth
- Drizzle ORM + Turso/libSQL
- Docker Compose: Postgres en `5435`, Redis en `6380`

## Variables locales

Copiar `.env.example` a `.env.local` y completar los secretos reales:

```env
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=replace-with-turso-token
REDIS_URL=redis://localhost:6380

BETTER_AUTH_SECRET=replace-with-32-plus-random-chars
BETTER_AUTH_URL=http://localhost:40932
NEXT_PUBLIC_APP_URL=http://localhost:40932

VELOX_POS_API_URL=http://localhost:3000
VELOX_STORE_ID=82fbfc57-8ec3-4f7d-a860-ff0ec378482a
VELOX_LOGIN_PIN=replace-with-clazico-store-pin
VELOX_WEBHOOK_SECRET=replace-with-secret-generated-in-velox
STOREFRONT_API_SECRET=replace-with-storefront-api-secret
CRON_SECRET=replace-with-random-cron-secret
```

Velox POS real usa `POST /auth/login` con `store_id + pin`, no `username/password`.
`STOREFRONT_API_SECRET` autentica pedidos web salientes. `VELOX_WEBHOOK_SECRET`
verifica webhooks entrantes. En produccion deben configurarse como secretos del
entorno y `CRON_SECRET` debe ser aleatorio.

## Desarrollo

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Abrir `http://localhost:40932`.

## Verificacion

```bash
npm run typecheck
npm run lint
npm run build
npm run integration:check
```

## Integracion Velox

- Menu publico y tasa: `GET /public/menu/store/:storeId`
- Catalogo autenticado: `GET /products`
- Stock: `GET /inventory/stock/:productId`
- Pedido web idempotente: `POST /web-orders/public/:storeId`
- Verificacion de pago: `POST /web-orders/external/:externalOrderId/verify-payment`
- Webhook receptor: `POST /api/webhooks/velox`
- Firma esperada: `x-velox-signature: sha256=<hmac>`

Eventos manejados en Clazico:

- `sale.created`: resincroniza el stock afectado desde Velox
- `stock.updated`: actualiza stock de producto o variante
- `product.updated`: resincroniza el producto desde Velox
- `product.variant_updated`: resincroniza producto y variantes
- `web_order.status_updated`: actualiza estado, venta y pago sin regresiones

Las funciones programadas de Netlify procesan el outbox cada 2 minutos, limpian
entregas antiguas diariamente y mantienen el catalogo sincronizado.

Registrar en Velox un webhook activo con URL publica
`https://<dominio>/api/webhooks/velox`, el mismo `VELOX_WEBHOOK_SECRET` y estos
eventos: `sale.created`, `web_order.status_updated`, `stock.updated`,
`product.updated`, `product.variant_updated`.
