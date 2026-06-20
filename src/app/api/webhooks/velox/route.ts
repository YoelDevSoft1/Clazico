import { NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { verifyWebhookFromRequest } from '@yoeldevsoft25/storefront-sdk';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const payloadText = await req.text();
  const secret = process.env.VELOX_WEBHOOK_SECRET || '';
  if (!secret) {
    return NextResponse.json(
      { error: 'Webhook secret is not configured' },
      { status: 500 },
    );
  }

  const requestHeaders = Object.fromEntries(req.headers.entries());
  let verified;
  try {
    verified = verifyWebhookFromRequest(payloadText, requestHeaders, { secret });
  } catch (error) {
    const isSignatureError =
      error instanceof Error && error.name.includes('Signature');
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Invalid webhook request',
      },
      { status: isSignatureError ? 401 : 400 },
    );
  }

  const { envelope, payload } = verified;
  if (process.env.VELOX_STORE_ID && envelope.store_id !== process.env.VELOX_STORE_ID) {
    return NextResponse.json({ error: 'Webhook store mismatch' }, { status: 403 });
  }

  const [{ db }, schema] = await Promise.all([
    import('@/server/db'),
    import('@/../drizzle/schema'),
  ]);

  const eventId = envelope.delivery_id;
  const signature = requestHeaders['x-velox-signature'] ?? '';
  const body = envelope as Record<string, unknown>;

  const inserted = await db
    .insert(schema.webhookDeliveries)
    .values({
      eventId,
      eventType: envelope.type,
      source: 'velox',
      payload: body,
      signature,
      result: 'processing',
    })
    .onConflictDoNothing({ target: schema.webhookDeliveries.eventId })
    .returning({ id: schema.webhookDeliveries.id });

  if (inserted.length === 0) {
    const reclaimed = await db
      .update(schema.webhookDeliveries)
      .set({
        result: 'processing',
        error: null,
        processedAt: null,
        signature,
        payload: body,
      })
      .where(
        and(
          eq(schema.webhookDeliveries.eventId, eventId),
          eq(schema.webhookDeliveries.result, 'failed'),
        ),
      )
      .returning({ id: schema.webhookDeliveries.id });

    if (reclaimed.length === 0) {
      return NextResponse.json({
        received: true,
        result: 'skipped_duplicate',
        eventId,
      });
    }
  }

  try {
    await processWebhook(envelope as any, db, schema);

    await db
      .update(schema.webhookDeliveries)
      .set({
        result: 'success',
        error: null,
        processedAt: new Date(),
      })
      .where(eq(schema.webhookDeliveries.eventId, eventId));

    return NextResponse.json({ success: true, eventId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(schema.webhookDeliveries)
      .set({
        result: 'failed',
        error: message,
        processedAt: new Date(),
      })
      .where(eq(schema.webhookDeliveries.eventId, eventId));

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function processWebhook(
  payload: ReturnType<typeof verifyWebhookFromRequest>['payload'],
  db: typeof import('@/server/db').db,
  schema: typeof import('@/../drizzle/schema'),
): Promise<void> {
  if (payload.type === 'sale.created') {
    const { data } = payload;
    const productIds = new Set(data.items.map((item) => item.product_id));
    const { productSyncService } = await import('@/server/services/product-sync.service');
    for (const productId of productIds) {
      await productSyncService.syncProduct(productId);
    }
    return;
  }

  if (payload.type === 'stock.updated') {
    const { data } = payload;
    const productId = data.product_id;
    if (!data.variant_id) {
      await db
        .update(schema.productCache)
        .set({ currentStock: data.new_stock, syncedAt: new Date() })
        .where(eq(schema.productCache.veloxId, productId));
      return;
    }

    const [product] = await db
      .select({ id: schema.productCache.id })
      .from(schema.productCache)
      .where(eq(schema.productCache.veloxId, productId))
      .limit(1);

    if (!product) {
      const { productSyncService } = await import('@/server/services/product-sync.service');
      await productSyncService.syncProduct(productId);
      return;
    }

    const updated = await db
      .update(schema.productVariants)
      .set({ currentStock: data.new_stock, syncedAt: new Date() })
      .where(eq(schema.productVariants.veloxVariantId, data.variant_id))
      .returning({ id: schema.productVariants.id });

    if (updated.length === 0) {
      const { productSyncService } = await import('@/server/services/product-sync.service');
      await productSyncService.syncProduct(productId);
      return;
    }

    const [stock] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${schema.productVariants.currentStock}), 0)`,
      })
      .from(schema.productVariants)
      .where(
        and(
          eq(schema.productVariants.productCacheId, product.id),
          eq(schema.productVariants.isActive, true),
        ),
      );

    await db
      .update(schema.productCache)
      .set({ currentStock: Number(stock?.total ?? 0), syncedAt: new Date() })
      .where(eq(schema.productCache.id, product.id));
    return;
  }

  if (payload.type === 'product.updated' || payload.type === 'product.variant_updated') {
    const { data } = payload;
    const { productSyncService } = await import('@/server/services/product-sync.service');
    await productSyncService.syncProduct(data.product_id);
    return;
  }

  if (payload.type === 'web_order.status_updated') {
    const { data } = payload;
    const [order] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, data.external_order_id))
      .limit(1);

    if (!order) return;

    const mappedStatus = mapVeloxOrderStatus(data.status);
    const nextSaleId = data.velox_sale_id ?? order.veloxSaleId;
    const shouldUpdateStatus = shouldApplyOrderStatus(order.status, mappedStatus);
    const nextStatus = shouldUpdateStatus ? mappedStatus : order.status;
    const changed =
      order.status !== nextStatus || order.veloxSaleId !== nextSaleId;

    await db
      .update(schema.orders)
      .set({
        status: nextStatus,
        veloxSaleId: nextSaleId,
        updatedAt: new Date(),
      })
      .where(eq(schema.orders.id, order.id));

    if (changed) {
      await db.insert(schema.orderStatusHistory).values({
        orderId: order.id,
        status: nextStatus,
        notes: `Velox POS: ${data.status}`,
      });
    }

    if (data.status === 'PAYMENT_VERIFIED') {
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

  const mapped = statusMap[status];
  if (!mapped) {
    throw new Error(`Unsupported Velox web order status: ${status}`);
  }
  return mapped;
}

type LocalOrderStatus =
  | 'PENDING'
  | 'PAYMENT_UPLOADED'
  | 'PAYMENT_VERIFIED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

const ORDER_STATUS_RANK: Record<
  Exclude<LocalOrderStatus, 'CANCELLED' | 'REFUNDED'>,
  number
> = {
  PENDING: 0,
  PAYMENT_UPLOADED: 1,
  PAYMENT_VERIFIED: 2,
  PROCESSING: 3,
  SHIPPED: 4,
  DELIVERED: 5,
};

function shouldApplyOrderStatus(
  current: LocalOrderStatus,
  incoming: LocalOrderStatus,
): boolean {
  if (current === 'CANCELLED' || current === 'REFUNDED') {
    return current === incoming;
  }
  if (incoming === 'CANCELLED' || incoming === 'REFUNDED') {
    return true;
  }
  return ORDER_STATUS_RANK[incoming] >= ORDER_STATUS_RANK[current];
}
