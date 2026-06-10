import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import * as schema from '@/../drizzle/schema';
import { veloxPosService, type VeloxWebOrderPayload } from './velox-pos.service';

type WebOrderSyncStatus = NonNullable<VeloxWebOrderPayload['status']>;

class WebOrderSyncService {
  private static instance: WebOrderSyncService | null = null;

  private constructor() { }

  static getInstance(): WebOrderSyncService {
    if (!WebOrderSyncService.instance) {
      WebOrderSyncService.instance = new WebOrderSyncService();
    }
    return WebOrderSyncService.instance;
  }

  /**
   * Build the Velox payload for an order. Used by both syncOrder
   * (fire-and-forget compat) and by the outbox worker (durable).
   */
  async buildPayload(
    orderId: string,
    status: WebOrderSyncStatus,
  ): Promise<VeloxWebOrderPayload> {
    const [order] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId))
      .limit(1);

    if (!order) {
      throw new Error(`Order ${orderId} not found when building Velox payload`);
    }

    const [customer, items, payments] = await Promise.all([
      db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, order.customerId))
        .limit(1),
      db
        .select()
        .from(schema.orderItems)
        .where(eq(schema.orderItems.orderId, order.id)),
      db
        .select()
        .from(schema.payments)
        .where(eq(schema.payments.orderId, order.id)),
    ]);

    const latestPayment = payments[payments.length - 1] ?? null;
    const deliveryMethod = order.deliveryMethod === 'DELIVERY' ? 'DELIVERY' : 'PICKUP';

    return {
      source: 'clazico',
      external_order_id: order.id,
      external_order_number: order.orderNumber,
      status,
      customer: {
        name: customer[0]?.name ?? 'Cliente web',
        email: customer[0]?.email ?? null,
        phone: customer[0]?.phone ?? null,
        document_id: customer[0]?.cedula ?? null,
      },
      items: items.map((item) => ({
        product_id: item.veloxProductId,
        variant_id: item.variantId ?? undefined,
        sku: item.variantSku ?? item.productSku,
        name: item.productName,
        quantity: item.quantity,
        unit_price_usd: Number(item.unitPriceUsd),
        unit_price_bs: Number(item.unitPriceBs ?? 0),
      })),
      subtotal_usd: Number(order.subtotalUsd),
      total_usd: Number(order.totalUsd),
      total_bs: Number(order.totalBss ?? 0),
      exchange_rate: Number(order.exchangeRateUsed ?? 0),
      delivery_method: deliveryMethod,
      delivery: {
        state: extractDeliveryState(order.customerNotes ?? null),
        city: extractDeliveryCity(order.customerNotes ?? null),
        address_line: order.deliveryAddressText ?? order.customerNotes ?? null,
        lat: order.deliveryLat === null ? null : Number(order.deliveryLat),
        lng: order.deliveryLng === null ? null : Number(order.deliveryLng),
        map_provider: order.deliveryLat && order.deliveryLng ? 'openstreetmap' : null,
        notes: order.customerNotes ?? null,
      },
      payment: latestPayment
        ? {
          method: latestPayment.method === 'CASH_BSS' ? 'CASH_BS' : latestPayment.method,
          reference: latestPayment.referenceNumber,
          bank: latestPayment.bank,
          currency: latestPayment.currency === 'BSS' ? 'BS' : latestPayment.currency,
          amount_usd: latestPayment.currency === 'USD' ? Number(latestPayment.amount) : Number(order.totalUsd),
          amount_bs: latestPayment.currency === 'BSS' ? Number(latestPayment.amount) : Number(order.totalBss ?? 0),
          reported_at: latestPayment.createdAt?.toISOString?.() ?? null,
        }
        : null,
      notes: order.adminNotes ?? order.customerNotes ?? null,
    };
  }

  async syncOrder(orderId: string, status: WebOrderSyncStatus): Promise<void> {
    const payload = await this.buildPayload(orderId, status);
    await veloxPosService.upsertWebOrder(payload, `${orderId}:${status}`);
  }
}

export const webOrderSyncService = WebOrderSyncService.getInstance();

function extractDeliveryState(note: string | null): string | null {
  if (!note?.startsWith('Envio a:')) return null;
  return note.replace('Envio a:', '').split(',')[0]?.trim() || null;
}

function extractDeliveryCity(note: string | null): string | null {
  if (!note?.startsWith('Envio a:')) return null;
  return note.replace('Envio a:', '').split(',')[1]?.split('.')[0]?.trim() || null;
}
