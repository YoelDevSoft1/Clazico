# Clazico Store

Tienda online Next.js conectada a Velox POS para catalogo, stock y registro de ventas web.

## Stack

- Next.js 16 App Router + React 19
- TypeScript
- Tailwind CSS 4
- tRPC 11 + TanStack Query
- Better Auth
- Drizzle ORM + PostgreSQL 17
- Docker Compose: Postgres en `5433`, Redis en `6380`

## Variables locales

Copiar `.env.example` a `.env.local` y completar los secretos reales:

```env
DATABASE_URL=postgresql://clazico:clazico_secret@localhost:5433/clazico_store
REDIS_URL=redis://localhost:6380

BETTER_AUTH_SECRET=replace-with-32-plus-random-chars
BETTER_AUTH_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3001

VELOX_POS_API_URL=http://localhost:3000
VELOX_STORE_ID=82fbfc57-8ec3-4f7d-a860-ff0ec378482a
VELOX_LOGIN_PIN=replace-with-clazico-store-pin
VELOX_WEBHOOK_SECRET=replace-with-secret-generated-in-velox
CRON_SECRET=replace-with-random-cron-secret
```

Velox POS real usa `POST /auth/login` con `store_id + pin`, no `username/password`.

## Desarrollo

```bash
npm install
docker compose up -d
npm run db:push
npm run db:seed
npm run dev -- --port 3001
```

Abrir `http://localhost:3001`.

## Verificacion

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Integracion Velox

- Catalogo: `GET /products`
- Stock: `GET /inventory/stock/:productId`
- Venta web: `POST /sales`
- Webhook receptor: `POST /api/webhooks/velox`
- Firma esperada: `x-velox-signature: sha256=<hmac>`

Eventos manejados en Clazico:

- `sale.created`: descuenta stock local si el payload trae `items`
- `stock.updated`: actualiza `currentStock`
- `product.updated`: resincroniza el producto desde Velox

Eventos disponibles hoy en Velox: `sale.created`, `license.updated`, `quota.threshold_reached`, `payment.approved`, `payment.rejected`.
`stock.updated` y `product.updated` requieren extender el modulo de webhooks en Velox POS.
