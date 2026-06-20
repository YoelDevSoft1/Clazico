import { randomUUID } from 'crypto';

async function main() {
  const storeId = "82fbfc57-8ec3-4f7d-a860-ff0ec378482a";
  const secret = "a31ef5718d9e8e89a773602e6213c03c2023ab5b26c11910262021a55f549d26";
  const apiUrl = "http://localhost:3000/web-orders/public/" + storeId;

  const payload = {
    source: "clazico",
    external_order_id: randomUUID(),
    external_order_number: "TEST-" + Date.now(),
    status: "PENDING_PAYMENT",
    customer: {
      name: "Test Delivery User",
    },
    items: [
      {
        product_id: "b1301066-e1e3-482c-8bcc-860cf14717ce",
        name: "Test Product",
        quantity: 1,
        unit_price_usd: 2,
        unit_price_bs: 1334
      }
    ],
    subtotal_usd: 2,
    total_usd: 2,
    total_bs: 1334,
    exchange_rate: 667,
    delivery_method: "DELIVERY",
    delivery: {
      lat: 10.6427,
      lng: -71.6247,
      address_line: "Some Address",
      city: "Maracaibo",
      state: "Zulia",
      map_provider: "openstreetmap"
    }
  };

  console.log("Sending payload to Velox POS...");
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-velox-api-version": "2.0.0",
      "x-storefront-store-id": storeId,
      "x-storefront-secret": secret,
      "Idempotency-Key": randomUUID()
    },
    body: JSON.stringify(payload)
  });

  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text);
}

main().catch(console.error);
