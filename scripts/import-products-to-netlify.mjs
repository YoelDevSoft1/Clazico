const veloxBaseUrl = process.env.VELOX_POS_API_URL?.replace(/\/+$/, '');
const storeId = process.env.VELOX_STORE_ID;
const pin = process.env.VELOX_LOGIN_PIN;
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '');
const cronSecret = process.env.CRON_SECRET;

if (!veloxBaseUrl) throw new Error('VELOX_POS_API_URL is required');
if (!storeId) throw new Error('VELOX_STORE_ID is required');
if (!pin) throw new Error('VELOX_LOGIN_PIN is required');
if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL is required');
if (!cronSecret) throw new Error('CRON_SECRET is required');

const authResponse = await fetch(`${veloxBaseUrl}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ store_id: storeId, pin }),
});

if (!authResponse.ok) {
  throw new Error(`Velox auth failed: ${authResponse.status} ${await authResponse.text()}`);
}

const authData = await authResponse.json();
const token = authData.access_token;

const productsResponse = await fetch(`${veloxBaseUrl}/products?limit=10000`, {
  headers: { Authorization: `Bearer ${token}` },
});

if (!productsResponse.ok) {
  throw new Error(`Velox products failed: ${productsResponse.status} ${await productsResponse.text()}`);
}

const productsBody = await productsResponse.json();
const products = Array.isArray(productsBody)
  ? productsBody
  : productsBody.products ?? productsBody.items ?? productsBody.data ?? [];

const productsWithStock = [];

for (const product of products) {
  let currentStock = 0;
  try {
    const stockResponse = await fetch(`${veloxBaseUrl}/inventory/stock/${product.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (stockResponse.ok) {
      const stockBody = await stockResponse.json();
      currentStock = Number(stockBody.current_stock ?? 0);
    }
  } catch {
    currentStock = 0;
  }

  productsWithStock.push({
    ...product,
    current_stock: currentStock,
  });
}

const importResponse = await fetch(`${appUrl}/api/cron/import-products`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${cronSecret}`,
  },
  body: JSON.stringify({ products: productsWithStock }),
});

const importBodyText = await importResponse.text();
if (!importResponse.ok) {
  throw new Error(`Netlify import failed: ${importResponse.status} ${importBodyText}`);
}

console.log(importBodyText);
