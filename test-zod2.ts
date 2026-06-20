import { CreateWebOrderDtoSchema } from '@yoeldevsoft25/store-contracts';
import { randomUUID } from 'crypto';

const payload = {
  source: 'clazico',
  external_order_id: randomUUID(),
  external_order_number: 'TEST-' + Date.now(),
  status: 'PENDING_PAYMENT',
  customer: {
    name: 'Test Delivery User',
  },
  items: [
    {
      product_id: randomUUID(),
      name: 'Test Product',
      quantity: 1,
      unit_price_usd: 2,
      unit_price_bs: 1334
    }
  ],
  subtotal_usd: 2,
  total_usd: 2,
  total_bs: 1334,
  exchange_rate: 667,
  delivery_method: 'DELIVERY',
  delivery: {
    lat: 10.6427,
    lng: -71.6247,
    address_line: 'Some Address',
    city: 'Maracaibo',
    state: 'Zulia',
    map_provider: 'openstreetmap'
  },
  payment: null,
};

try {
  const result = CreateWebOrderDtoSchema.parse(payload);
  console.log("Success!", result.delivery);
} catch (e: any) {
  console.error("Failed:", JSON.stringify(e.errors, null, 2));
}
