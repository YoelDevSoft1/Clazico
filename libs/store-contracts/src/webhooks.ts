import { z } from 'zod';
import { StockUpdatedPayloadSchema, ProductUpdatedPayloadSchema, ProductVariantUpdatedPayloadSchema } from './products';
import { WebOrderStatusUpdatedPayloadSchema, SaleCreatedPayloadSchema } from './web-orders';

/**
 * Whitelist canónico de eventos de webhook. Single source of truth
 * compartido entre Velox (whitelist en SaasWebhooksService) y clazico
 * (handlers en route.ts). Cambios aquí rompen compatibilidad — bumpear
 * STOREFRONT_API_VERSION.
 */
export const WEBHOOK_EVENTS = [
  'sale.created',
  'web_order.status_updated',
  'stock.updated',
  'product.updated',
  'product.variant_updated',
] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const WebhookEventSchema = z.enum(WEBHOOK_EVENTS);

/**
 * Discriminated union de TODOS los payloads de webhook.
 * Use z.parse() con el schema apropiado según `event` header.
 */
export const WebhookPayloadSchema = z.discriminatedUnion('type', [
  StockUpdatedPayloadSchema,
  ProductUpdatedPayloadSchema,
  ProductVariantUpdatedPayloadSchema,
  WebOrderStatusUpdatedPayloadSchema,
  SaleCreatedPayloadSchema,
]);
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

/**
 * Helper: parsea un webhook payload según su tipo.
 */
export function parseWebhookPayload<T extends WebhookEvent>(
  type: T,
  raw: unknown
): Extract<WebhookPayload, { type: T }> | null {
  const schema = WebhookPayloadSchema.options.find(
    (s) => (s.shape.type as { value: string }).value === type
  );
  if (!schema) return null;
  return schema.parse(raw) as Extract<WebhookPayload, { type: T }>;
}

/**
 * Webhook envelope (lo que viaja en el body HTTP).
 * La firma HMAC-SHA256 se calcula sobre `JSON.stringify(envelope)`.
 */
export const WebhookEnvelopeSchema = z.object({
  schema_version: z.literal('2.0'),
  type: WebhookEventSchema,
  data: z.unknown(),  // Validar con WebhookPayloadSchema según `type`
  occurred_at: z.string().datetime(),
  delivery_id: z.string().uuid(),  // Para dedup
  store_id: z.string().uuid(),
});
export type WebhookEnvelope = z.infer<typeof WebhookEnvelopeSchema>;

/**
 * Headers estándar de webhook.
 */
export const WEBHOOK_HEADERS = {
  SIGNATURE: 'x-velox-signature',
  EVENT: 'x-velox-event',
  DELIVERY_ID: 'x-velox-delivery-id',
  API_VERSION: 'x-velox-api-version',
  TIMESTAMP: 'x-velox-timestamp',
} as const;
