import { CreateWebOrderDtoSchema } from '@yoeldevsoft25/store-contracts';

const payload = {
  source: 'clazico',
  external_order_id: 'test-123',
  external_order_number: '123',
  status: 'PENDING_PAYMENT',
  customer: {
    name: 'Yoel',
    email: 'test@example.com',
    phone: null,
    document_id: null,
  },
  items: [
    {
      product_id: 'a5712e0e-9273-455b-abf9-c6e0c6551b8d',
      name: 'Item 1',
      quantity: 1,
      unit_price_usd: 10,
      unit_price_bs: 10,
      sku: 'SKU-1'
    }
  ],
  subtotal_usd: 10,
  total_usd: 10,
  total_bs: 10,
  exchange_rate: 1,
  delivery_method: 'DELIVERY',
  delivery: {
    state: null,
    city: null,
    address_line: null,
    lat: 10.123,
    lng: -66.123,
    map_provider: 'openstreetmap',
    notes: null,
  },
  payment: {
    method: 'CASH_BS',
    reference: null,
    bank: null,
    currency: 'BS',
    amount_usd: 10,
    amount_bs: 10,
    reported_at: null,
  },
  notes: null
};

try {
  const result = CreateWebOrderDtoSchema.parse(payload);
  console.log(JSON.stringify(result.delivery, null, 2));
} catch (e) {
  console.error(e);
}
