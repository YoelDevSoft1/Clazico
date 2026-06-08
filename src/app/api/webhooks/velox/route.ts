import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { verifyWebhookFromRequest } from '@yoeldevsoft25/storefront-sdk';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const payloadText = await req.text();
    const secret = process.env.VELOX_WEBHOOK_SECRET || '';
    if (!secret) {
      return NextResponse.json({ error: 'Webhook secret is not configured' }, { status: 500 });
    }

    const requestHeaders = Object.fromEntries(req.headers.entries());
    let verified;
    try {
      verified = verifyWebhookFromRequest(payloadText, requestHeaders, { secret });
    } catch (e) {
      const isSigError = e instanceof Error && e.name.includes('Signature');
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Invalid webhook request' },
        { status: isSigError ? 401 : 400 },
      );
    }

    const { envelope, payload } = verified;
    const eventType = payload.type;
    const { data } = payload;
    const eventId = envelope.delivery_id;
    const signature = requestHeaders['x-velox-signature'] as string;
    const body = envelope;

    // ── Dedup: every delivery has a unique event id (Velox sets
    //    `x-velox-delivery-id`). We persist it in `webhook_deliveries`
    //    keyed by `event_id` UNIQUE; a hit short-circuits before any
    //    side effects fire.
    const [{ db }, schema] = await Promise.all([
      import('@/server/db'),
      import('@/../drizzle/schema'),
    ]);

    const existing = await db
      .select({ id: schema.webhookDeliveries.id })
      .from(schema.webhookDeliveries)
      .where(eq(schema.webhookDeliveries.eventId, eventId))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({
        received: true,
        result: 'skipped_duplicate',
        eventId,
      });
    }

    let result: 'success' | 'failed' = 'success';
    let errorMessage: string | null = null;

    try {
    if (eventType === 'sale.created') {
      const { sql } = await import('drizzle-orm');
      const items = (data as Extract<typeof payload, { type: 'sale.created' }>['data']).items || [];
      for (const item of items) {
        const { product_id, quantity } = item;
        const qty = quantity;
        if (product_id && qty !== undefined) {
          // Decrement local cache stock passively
          await db
            .update(schema.productCache)
            .set({
              currentStock: sql`GREATEST(0, ${schema.productCache.currentStock} - ${qty})`,
              syncedAt: new Date(),
            })
            .where(eq(schema.productCache.veloxId, product_id));
        }
      }
    }

    if (eventType === 'stock.updated') {
      const stockData = data as Extract<typeof payload, { type: 'stock.updated' }>['data'];
      const productId = stockData.product_id;
      const currentStock = stockData.new_stock;
      if (productId && typeof currentStock === 'number') {
        await db
          .update(schema.productCache)
          .set({ currentStock, syncedAt: new Date() })
          .where(eq(schema.productCache.veloxId, productId));
      }
    }

    if (eventType === 'product.updated' && (data as Extract<typeof payload, { type: 'product.updated' }>['data']).product_id) {
      const { productSyncService } = await import('@/server/services/product-sync.service');
      await productSyncService.syncProduct(String((data as Extract<typeof payload, { type: 'product.updated' }>['data']).product_id));
    }

    if (eventType === 'web_order.status_updated') {
      const statusPayload = data as Extract<typeof payload, { type: 'web_order.status_updated' }>['data'];
      const externalOrderId = statusPayload.external_order_id;
      if (!externalOrderId) {
        throw new Error('Missing external_order_id in web_order.status_updated');
      }

      const mappedStatus = mapVeloxOrderStatus(statusPayload.status);
      const { and } = await import('drizzle-orm');

      const [order] = await db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, String(externalOrderId)))
        .limit(1);

      if (order) {
        const nextSaleId = statusPayload.velox_sale_id ? String(statusPayload.velox_sale_id) : order.veloxSaleId;
        const changed = order.status !== mappedStatus || order.veloxSaleId !== nextSaleId;

        await db
          .update(schema.orders)
          .set({
            status: mappedStatus,
            veloxSaleId: nextSaleId,
            adminNotes: order.adminNotes,
            updatedAt: new Date(),
          })
          .where(eq(schema.orders.id, order.id));

        if (changed) {
          await db.insert(schema.orderStatusHistory).values({
            orderId: order.id,
            status: mappedStatus,
            notes: `Velox POS: ${statusPayload.status}`,
          });
        }

        if (statusPayload.status === 'PAYMENT_VERIFIED') {
          await db
            .update(schema.payments)
            .set({
              status: 'VERIFIED',
              verifiedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(schema.payments.orderId, order.id),
                eq(schema.payments.status, 'PENDING'),
              ),
            );
        }
      }
    }
    } catch (e) {
      result = 'failed';
      errorMessage = e instanceof Error ? e.message : String(e);
    }

    // Persist delivery receipt (onConflictDoNothing guards against
    // a race where two workers see the same `x-velox-delivery-id`
    // after the dedup check above but before this insert).
    await db
      .insert(schema.webhookDeliveries)
      .values({
        eventId,
        eventType: String(eventType ?? 'unknown'),
        source: 'velox',
        payload: body as Record<string, unknown>,
        signature,
        processedAt: new Date(),
        result,
        error: errorMessage ?? undefined,
      })
      .onConflictDoNothing({ target: schema.webhookDeliveries.eventId });

    if (result === 'failed') {
      return NextResponse.json(
        { error: errorMessage ?? 'Webhook processing failed' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, eventId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function mapVeloxOrderStatus(
  status: string,
): 'PENDING' | 'PAYMENT_UPLOADED' | 'PAYMENT_VERIFIED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED' {
  const statusMap: Record<string, 'PENDING' | 'PAYMENT_UPLOADED' | 'PAYMENT_VERIFIED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED'> = {
    PENDING_PAYMENT: 'PENDING',
    PAYMENT_REPORTED: 'PAYMENT_UPLOADED',
    PAYMENT_VERIFIED: 'PAYMENT_VERIFIED',
    PREPARING: 'PROCESSING',
    READY_FOR_PICKUP: 'PROCESSING',
    SHIPPED: 'SHIPPED',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED',
    REJECTED: 'CANCELLED',
  };

  return statusMap[status] ?? 'PENDING';
}
