import dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';

dotenv.config({ path: '.env.local' });
dotenv.config();

const baseUrl = required('VELOX_POS_API_URL').replace(/\/+$/, '');
const storeId = required('VELOX_STORE_ID');
const pin = required('VELOX_LOGIN_PIN');
const storefrontSecret =
  process.env.STOREFRONT_API_SECRET || required('VELOX_WEBHOOK_SECRET');

const health = await request('/health');
assertOk(health, 'Velox health');

const login = await request('/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ store_id: storeId, pin }),
});
assertOk(login, 'Velox login');
const auth = await login.json();
if (!auth.access_token) throw new Error('Velox login did not return access_token');

const headers = { authorization: `Bearer ${auth.access_token}` };
const productsResponse = await request('/products?limit=1', { headers });
assertOk(productsResponse, 'Velox products');
const productsBody = await productsResponse.json();
const products = Array.isArray(productsBody)
  ? productsBody
  : productsBody.items ?? productsBody.products ?? productsBody.data ?? [];

const menuResponse = await request(`/public/menu/store/${storeId}`);
assertOk(menuResponse, 'Velox public menu');
const menu = await menuResponse.json();

let stock = 'not checked: no products';
if (products[0]?.id) {
  const stockResponse = await request(`/inventory/stock/${products[0].id}`, { headers });
  assertOk(stockResponse, 'Velox stock');
  const stockBody = await stockResponse.json();
  stock = stockBody.current_stock;
}

const webhooksResponse = await request('/licenses/webhooks', { headers });
assertOk(webhooksResponse, 'Velox webhooks');
const webhooks = await webhooksResponse.json();

const stockStatusResponse = await request('/inventory/stock/status?limit=5000', {
  headers,
});
assertOk(stockStatusResponse, 'Velox stock status');
const stockStatusBody = await stockStatusResponse.json();
const stockItems = Array.isArray(stockStatusBody)
  ? stockStatusBody
  : stockStatusBody.items ?? [];

const authProbe = await request(`/web-orders/public/${storeId}`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'idempotency-key': randomUUID(),
    'x-storefront-store-id': storeId,
    'x-storefront-secret': storefrontSecret,
    'x-velox-api-version': '2.0.0',
  },
  body: '{}',
});
if (authProbe.status !== 400) {
  throw new Error(
    `Velox storefront auth probe expected HTTP 400 validation response, got ${authProbe.status}`,
  );
}

console.log(JSON.stringify({
  ok: true,
  velox: baseUrl,
  storefront_authenticated: true,
  product_probe_count: products.length,
  menu_category_count: menu?.menu?.categories?.length ?? 0,
  exchange_rate: menu?.exchange_rate ?? null,
  stock_probe: stock,
  products_with_positive_stock: stockItems.filter(
    (item) => Number(item.current_stock) > 0,
  ).length,
  active_webhooks: Array.isArray(webhooks)
    ? webhooks.filter((webhook) => webhook.is_active).length
    : 0,
}, null, 2));

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function request(path, options) {
  return fetch(`${baseUrl}${path}`, options);
}

function assertOk(response, label) {
  if (!response.ok) {
    throw new Error(`${label} failed with HTTP ${response.status}`);
  }
}
