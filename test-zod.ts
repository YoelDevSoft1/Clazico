import { CreateWebOrderDtoSchema } from '@yoeldevsoft25/store-contracts';

const mockOrder = {
  id: 'order_123',
  createdAt: new Date(),
  storefrontId: 'clazico',
  status: 'payment_reported',
  customerName: 'Yoel',
  customerEmail: 'yoel@example.com',
  customerPhone: '04141234567',
  customerDocumentId: 'V-12345678',
  subtotalUsd: '10.00',
  totalUsd: '10.00',
  totalBs: '360.00',
  exchangeRate: '36.00',
  deliveryMethod: 'DELIVERY',
  deliveryAddressText: 'Calle 1, Casa 2',
  deliveryLat: '10.6427',
  deliveryLng: '-71.6125',
  customerNotes: 'Envio a: Zulia, Maracaibo. Calle 1, Casa 2. GPS 10.6427, -71.6125',
  paymentMethod: 'pago_movil',
  paymentReference: '1234',
  paymentBank: '0134',
  paymentAmountUsd: '10.00',
  paymentAmountBs: '360.00',
  items: [
    {
      id: 'item_1',
      productId: 'prod_1',
      variantId: null,
      productName: 'Producto',
      sku: 'SKU1',
      quantity: 1,
      unitPriceUsd: '10.00',
      unitPriceBs: '360.00',
      size: null,
      color: null
    }
  ]
};

function extractDeliveryState(note: string | null): string | null {
  if (!note?.startsWith('Envio a:')) return null;
  return note.replace('Envio a:', '').split(',')[0]?.trim() || null;
}

function extractDeliveryCity(note: string | null): string | null {
  if (!note?.startsWith('Envio a:')) return null;
  return note.replace('Envio a:', '').split(',')[1]?.split('.')[0]?.trim() || null;
}

const payload = {
  source: 'clazico',
  external_order_id: mockOrder.id,
  external_order_number: 'WEB-1234',
  status: 'PAYMENT_REPORTED',
  customer: {
    name: mockOrder.customerName,
    email: mockOrder.customerEmail ?? null,
    phone: mockOrder.customerPhone ?? null,
    document_id: mockOrder.customerDocumentId ?? null,
  },
  items: mockOrder.items.map((item) => ({
    product_id: item.productId ?? undefined,
    variant_id: item.variantId ?? null,
    sku: item.sku ?? null,
    name: item.productName,
    quantity: item.quantity,
    unit_price_usd: Number(item.unitPriceUsd),
    unit_price_bs: Number(item.unitPriceBs),
    size: item.size ?? null,
    color: item.color ?? null,
  })),
  subtotal_usd: Number(mockOrder.subtotalUsd),
  total_usd: Number(mockOrder.totalUsd),
  total_bs: Number(mockOrder.totalBs),
  exchange_rate: Number(mockOrder.exchangeRate),
  delivery_method: mockOrder.deliveryMethod,
  delivery: {
    state: extractDeliveryState(mockOrder.customerNotes ?? null),
    city: extractDeliveryCity(mockOrder.customerNotes ?? null),
    address_line: mockOrder.deliveryAddressText ?? mockOrder.customerNotes ?? null,
    lat: mockOrder.deliveryLat === null ? null : Number(mockOrder.deliveryLat),
    lng: mockOrder.deliveryLng === null ? null : Number(mockOrder.deliveryLng),
    map_provider: mockOrder.deliveryLat && mockOrder.deliveryLng ? 'openstreetmap' : null,
    notes: mockOrder.customerNotes ?? null,
  },
  payment: {
    method: mockOrder.paymentMethod ?? null,
    reference: mockOrder.paymentReference ?? null,
    bank: mockOrder.paymentBank ?? null,
    currency: 'BS',
    amount_usd: mockOrder.paymentAmountUsd === null ? null : Number(mockOrder.paymentAmountUsd),
    amount_bs: mockOrder.paymentAmountBs === null ? null : Number(mockOrder.paymentAmountBs),
    reported_at: new Date().toISOString(),
  },
  notes: mockOrder.customerNotes ?? null,
};

const result = CreateWebOrderDtoSchema.safeParse(payload);
if (!result.success) {
  console.error("Zod Validation Failed:", JSON.stringify(result.error.issues, null, 2));
} else {
  console.log("Zod Validation Passed!", result.data);
}
