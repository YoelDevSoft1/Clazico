import { z } from 'zod';
import { StorefrontSourceSchema } from './sources';

/**
 * Web-orders: órdenes creadas desde un storefront externo hacia Velox POS.
 * Kind discriminator: 'product' (e-commerce) o 'menu_item' (delivery).
 *
 * Single source of truth para el shape del DTO. Velox valida con class-validator
 * en el controller; clazico genera con Zod. Ambos lados hablan el mismo idioma.
 */

export const WebOrderItemSchema = z.object({
  product_id: z.string().uuid().optional(),
  variant_id: z.string().uuid().optional(),
  menu_item_id: z.string().uuid().optional(),
  sku: z.string().nullable().optional(),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  unit_price_usd: z.number().nonnegative(),
  unit_price_bs: z.number().nonnegative().nullable().optional(),
  size: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
}).refine(
  (item) => {
    // Exactly one of product_id, menu_item_id, or variant_id must be present
    const ids = [item.product_id, item.variant_id, item.menu_item_id].filter(Boolean);
    return ids.length === 1;
  },
  { message: 'Exactly one of product_id, variant_id, or menu_item_id must be present' }
);
export type WebOrderItem = z.infer<typeof WebOrderItemSchema>;

export const WebOrderCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().nullable().optional(),
  phone: z.string().min(7).max(20),
  document_id: z.string().nullable().optional(),  // V-/E-/J- RIF
});
export type WebOrderCustomer = z.infer<typeof WebOrderCustomerSchema>;

export const WebOrderDeliverySchema = z.object({
  method: z.enum(['PICKUP', 'DELIVERY', 'TAKEAWAY']),
  state: z.string().optional(),
  city: z.string().optional(),
  address_line: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  map_provider: z.string().optional(),
  notes: z.string().optional(),
});
export type WebOrderDelivery = z.infer<typeof WebOrderDeliverySchema>;

export const WebOrderPaymentSchema = z.object({
  method: z.enum([
    'PAGO_MOVIL',
    'TRANSFER',
    'ZELLE',
    'BINANCE',
    'CASH_USD',
    'CASH_BS',
    'CARD',
    'OTHER',
  ]),
  reference: z.string().optional(),
  bank: z.string().optional(),
  currency: z.enum(['USD', 'BS']),
  amount_usd: z.number().nonnegative(),
  amount_bs: z.number().nonnegative().optional(),
  reported_at: z.string().datetime().optional(),
});
export type WebOrderPayment = z.infer<typeof WebOrderPaymentSchema>;

export const WebOrderKindSchema = z.enum(['product', 'menu_item']);

export const CreateWebOrderDtoSchema = z.object({
  kind: WebOrderKindSchema.default('product'),
  source: StorefrontSourceSchema,
  external_order_id: z.string().min(1).max(100),
  external_order_number: z.string().min(1).max(50).optional(),
  status: z
    .enum(['PENDING_PAYMENT', 'PAYMENT_REPORTED', 'PAYMENT_VERIFIED', 'CANCELLED'])
    .default('PENDING_PAYMENT'),
  customer: WebOrderCustomerSchema,
  items: z.array(WebOrderItemSchema).min(1),
  subtotal_usd: z.number().nonnegative(),
  total_usd: z.number().nonnegative(),
  total_bs: z.number().nonnegative().optional(),
  exchange_rate: z.number().positive().optional(),
  delivery: WebOrderDeliverySchema.optional(),
  payment: WebOrderPaymentSchema.optional(),
  notes: z.string().max(1000).optional(),
});
export type CreateWebOrderDto = z.infer<typeof CreateWebOrderDtoSchema>;

/**
 * Webhook payload: status_updated. Status canónico de Velox.
 */
export const WebOrderStatusSchema = z.enum([
  'PENDING_PAYMENT',
  'PAYMENT_REPORTED',
  'PAYMENT_VERIFIED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REJECTED',
]);
export type WebOrderStatus = z.infer<typeof WebOrderStatusSchema>;

export const WebOrderStatusUpdatedPayloadSchema = z.object({
  type: z.literal('web_order.status_updated'),
  data: z.object({
    web_order_id: z.string().uuid(),
    external_order_id: z.string(),
    status: WebOrderStatusSchema,
    velox_sale_id: z.string().uuid().nullable().optional(),
    occurred_at: z.string().datetime(),
  }),
});
export type WebOrderStatusUpdatedPayload = z.infer<typeof WebOrderStatusUpdatedPayloadSchema>;

export const SaleCreatedPayloadSchema = z.object({
  type: z.literal('sale.created'),
  data: z.object({
    sale_id: z.string().uuid(),
    sale_number: z.string(),
    store_id: z.string().uuid(),
    total_usd: z.number(),
    total_bs: z.number().optional(),
    items: z.array(
      z.object({
        product_id: z.string().uuid(),
        variant_id: z.string().uuid().nullable(),
        quantity: z.number().int(),
        unit_price_usd: z.number(),
      })
    ),
    customer_id: z.string().uuid().nullable(),
    occurred_at: z.string().datetime(),
  }),
});
export type SaleCreatedPayload = z.infer<typeof SaleCreatedPayloadSchema>;
