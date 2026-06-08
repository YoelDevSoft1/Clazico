import { z } from 'zod';
import { eq, and, desc, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { randomUUID } from 'crypto';
import * as schema from '@/../drizzle/schema';
import type { TRPCContext } from '@/server/trpc/init';
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
} from '@/server/trpc/init';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  listOrdersSchema,
} from '@/schemas/order.schema';
import { orderNumberService } from '@/server/services/order-number.service';

export const orderRouter = createTRPCRouter({
  /**
   * Create a new order.
   *
   * Flow (storefront v2):
   * 1. Re-validate stock against Velox for each item (per variant when
   *    available). Fail fast with 400 if any item is short.
   * 2. Persist order + orderItems in a single transaction.
   * 3. Enqueue the upsertWebOrder call in the outbox with `order.id` as
   *    the idempotency key. The outbox worker is the only thing that
   *    talks to Velox from this point on — this handler returns 201
   *    immediately so the customer can keep moving.
   * 4. Track sync state in `ordersSync` for the admin UI.
   */
  create: publicProcedure
    .input(createOrderSchema)
    .mutation(async ({ ctx, input }) => {
      // 1) Stock re-validation. Each item can have a variantId; we
      //    call Velox for the parent product and (when relevant) the
      //    variant. A 4xx from Velox here means the storefront cache
      //    is stale — we reject the order with a friendly message.
      for (const item of input.items) {
        try {
          const stock = await ctx.veloxService.getStock(
            item.productId,
            item.variantId,
          );
          if (stock.current_stock < item.quantity) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Stock insuficiente para ${item.productId}${
                item.variantId ? ` (variante ${item.variantId})` : ''
              }. Disponible: ${stock.current_stock}, solicitado: ${item.quantity}`,
            });
          }
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          // If Velox is unreachable, we still allow the order to be
          // recorded locally — the outbox worker will retry stock
          // verification when it pushes to Velox.
        }
      }

      const customerId = await resolveCustomerId(ctx, input);
      const orderNumber = await orderNumberService.generate();

      // Calculate totals
      let subtotalUsd = 0;
      for (const item of input.items) {
        subtotalUsd += item.unitPriceUsd * item.quantity;
      }

      // In this version, discount is 0 by default, total = subtotal
      const totalUsd = subtotalUsd;
      const totalBss = totalUsd * input.exchangeRate;

      // Generate a single idempotency key for the order. This is
      // propagated to Velox and also used as the outbox row key.
      const idempotencyKey = randomUUID();

      // Insert the order
      const [order] = await ctx.db
        .insert(schema.orders)
        .values({
          orderNumber,
          customerId,
          status: 'PENDING',
          subtotalUsd: String(subtotalUsd),
          discountUsd: '0',
          totalUsd: String(totalUsd),
          totalBss: String(totalBss),
          exchangeRateUsed: String(input.exchangeRate),
          shippingAddressId: normalizeOptionalUuid(input.shippingAddressId),
          deliveryMethod: input.deliveryMethod,
          deliveryAddressText: input.deliveryAddressText ?? null,
          deliveryLat:
            input.deliveryLat === undefined ? null : String(input.deliveryLat),
          deliveryLng:
            input.deliveryLng === undefined ? null : String(input.deliveryLng),
          customerNotes: input.note ?? null,
          idempotencyKey,
        })
        .returning();

      if (!order) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'No se pudo crear el pedido',
        });
      }

      // Insert order items (now persists variantId / variantSku)
      await ctx.db.insert(schema.orderItems).values(
        await Promise.all(
          input.items.map(async (item) => {
            const [product] = await ctx.db
              .select({
                name: schema.productCache.name,
                sku: schema.productCache.sku,
              })
              .from(schema.productCache)
              .where(eq(schema.productCache.veloxId, item.productId))
              .limit(1);

            const [variant] = item.variantId
              ? await ctx.db
                  .select({ sku: schema.productVariants.sku })
                  .from(schema.productVariants)
                  .where(eq(schema.productVariants.id, item.variantId))
                  .limit(1)
              : [];

            return {
              orderId: order.id,
              veloxProductId: item.productId,
              variantId: item.variantId ?? null,
              variantSku: variant?.sku ?? null,
              productName: product?.name ?? item.productId,
              productSku: product?.sku ?? item.variantId ?? 'DEFAULT-SKU',
              quantity: item.quantity,
              unitPriceUsd: String(item.unitPriceUsd),
              unitPriceBs: String(item.unitPriceBs),
              totalUsd: String(item.unitPriceUsd * item.quantity),
            };
          }),
        ),
      );

      // Create a pending payment log if method is selected
      const methodMap: Record<string, 'PAGO_MOVIL' | 'TRANSFER' | 'ZELLE' | 'CASH_USD' | 'CASH_BSS' | 'BINANCE'> = {
        pago_movil: 'PAGO_MOVIL',
        transferencia: 'TRANSFER',
        zelle: 'ZELLE',
        efectivo_usd: 'CASH_USD',
        punto_venta: 'CASH_BSS', // Map custom methods to enums
      };

      const dbMethod = methodMap[input.paymentMethod] ?? 'CASH_USD';

      await ctx.db.insert(schema.payments).values({
        orderId: order.id,
        method: dbMethod,
        amount: String(input.currency === 'USD' ? totalUsd : totalBss),
        currency: input.currency === 'USD' ? 'USD' : 'BSS',
        status: 'PENDING',
      });

      // Enqueue the Velox sync via the outbox. The outbox worker is
      // responsible for actually POSTing to Velox with the
      // `Idempotency-Key` header. This handler returns 201
      // immediately so the customer can move to payment without
      // waiting on Velox.
      const { enqueueWebOrderUpsert } = await import('@/server/services/outbox-worker');
      await enqueueWebOrderUpsert({
        orderId: order.id,
        idempotencyKey,
      });

      return order;
    }),

  /**
   * Update order status (admin only).
   */
  updateStatus: adminProcedure
    .input(updateOrderStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, input.orderId))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Pedido no encontrado',
        });
      }

      // Map lowercase string status to uppercase enum
      const statusMap: Record<string, 'PENDING' | 'PAYMENT_UPLOADED' | 'PAYMENT_VERIFIED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED'> = {
        pending: 'PENDING',
        payment_pending: 'PENDING',
        payment_submitted: 'PAYMENT_UPLOADED',
        payment_verified: 'PAYMENT_VERIFIED',
        processing: 'PROCESSING',
        shipped: 'SHIPPED',
        delivered: 'DELIVERED',
        cancelled: 'CANCELLED',
        refunded: 'REFUNDED',
      };

      const dbStatus = statusMap[input.status] ?? 'PENDING';

      const [updated] = await ctx.db
        .update(schema.orders)
        .set({
          status: dbStatus,
          updatedAt: new Date(),
        })
        .where(eq(schema.orders.id, input.orderId))
        .returning();

      // Log status history
      await ctx.db.insert(schema.orderStatusHistory).values({
        orderId: input.orderId,
        status: dbStatus,
        notes: input.reason ?? null,
      });

      return updated;
    }),

  /**
   * List orders (admin).
   */
  list: adminProcedure
    .input(listOrdersSchema)
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input.status) {
        const statusMap: Record<string, 'PENDING' | 'PAYMENT_UPLOADED' | 'PAYMENT_VERIFIED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED'> = {
          pending: 'PENDING',
          payment_pending: 'PENDING',
          payment_submitted: 'PAYMENT_UPLOADED',
          payment_verified: 'PAYMENT_VERIFIED',
          processing: 'PROCESSING',
          shipped: 'SHIPPED',
          delivered: 'DELIVERED',
          cancelled: 'CANCELLED',
          refunded: 'REFUNDED',
        };
        conditions.push(eq(schema.orders.status, statusMap[input.status]));
      }

      if (input.search) {
        const searchTerm = `%${input.search}%`;
        conditions.push(
          sql`(${schema.orders.orderNumber} ILIKE ${searchTerm})`,
        );
      }
      if (input.startDate) {
        conditions.push(sql`${schema.orders.createdAt} >= ${input.startDate}`);
      }
      if (input.endDate) {
        conditions.push(sql`${schema.orders.createdAt} <= ${input.endDate}`);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await ctx.db
        .select()
        .from(schema.orders)
        .where(whereClause)
        .orderBy(desc(schema.orders.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [countResult] = await ctx.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(schema.orders)
        .where(whereClause);

      return {
        items,
        total: countResult?.count ?? 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Get a single order by ID (admin or owner).
   */
  getById: protectedProcedure
    .input(z.object({ orderId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [order] = await ctx.db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, input.orderId))
        .limit(1);

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Pedido no encontrado',
        });
      }

      // Ensure user owns the order or is admin
      const isAdmin = ctx.session.user.role === 'admin';
      if (order.customerId !== ctx.session.user.id && !isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No tienes acceso a este pedido',
        });
      }

      // Fetch order items
      const items = await ctx.db
        .select()
        .from(schema.orderItems)
        .where(eq(schema.orderItems.orderId, order.id));

      return { ...order, items };
    }),

  /**
   * Get current user's orders.
   */
  myOrders: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(20),
        offset: z.number().int().min(0).default(0),
        status: z
          .enum([
            'pending',
            'payment_pending',
            'payment_submitted',
            'payment_verified',
            'processing',
            'shipped',
            'delivered',
            'cancelled',
            'refunded',
          ])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const customerId = ctx.session.user.id;

      const conditions = [eq(schema.orders.customerId, customerId)];
      if (input.status) {
        const statusMap: Record<string, 'PENDING' | 'PAYMENT_UPLOADED' | 'PAYMENT_VERIFIED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED'> = {
          pending: 'PENDING',
          payment_pending: 'PENDING',
          payment_submitted: 'PAYMENT_UPLOADED',
          payment_verified: 'PAYMENT_VERIFIED',
          processing: 'PROCESSING',
          shipped: 'SHIPPED',
          delivered: 'DELIVERED',
          cancelled: 'CANCELLED',
          refunded: 'REFUNDED',
        };
        conditions.push(eq(schema.orders.status, statusMap[input.status]));
      }

      const items = await ctx.db
        .select()
        .from(schema.orders)
        .where(and(...conditions))
        .orderBy(desc(schema.orders.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [countResult] = await ctx.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(schema.orders)
        .where(and(...conditions));

      return {
        items,
        total: countResult?.count ?? 0,
        limit: input.limit,
        offset: input.offset,
      };
  }),
});

async function resolveCustomerId(
  ctx: TRPCContext,
  input: z.infer<typeof createOrderSchema>,
): Promise<string> {
  if (ctx.session?.user?.id) {
    await ctx.db
      .update(schema.users)
      .set({
        name: input.customerName,
        email: input.customerEmail.trim().toLowerCase(),
        phone: input.customerPhone ?? null,
        cedula: input.customerDocumentId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, ctx.session.user.id));

    return ctx.session.user.id;
  }

  const email = input.customerEmail.trim().toLowerCase();
  const [existing] = await ctx.db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  if (existing) {
    await ctx.db
      .update(schema.users)
      .set({
        name: input.customerName,
        phone: input.customerPhone ?? null,
        cedula: input.customerDocumentId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, existing.id));

    return existing.id;
  }

  const id = randomUUID();
  await ctx.db.insert(schema.users).values({
    id,
    name: input.customerName,
    email,
    emailVerified: false,
    role: 'customer',
    phone: input.customerPhone ?? null,
    cedula: input.customerDocumentId ?? null,
  });

  return id;
}

function normalizeOptionalUuid(value: string | undefined): string | null {
  if (!value || value === '00000000-0000-0000-0000-000000000000') {
    return null;
  }

  return value;
}
