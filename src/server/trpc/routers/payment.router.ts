import { z } from 'zod';
import { eq, and, desc, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import * as schema from '@/../drizzle/schema';
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
} from '@/server/trpc/init';
import { veloxPosService } from '@/server/services/velox-pos.service';
import {
  submitPaymentSchema,
  verifyPaymentSchema,
  rejectPaymentSchema,
  listPaymentsSchema,
} from '@/schemas/payment.schema';

export const paymentRouter = createTRPCRouter({
  /**
   * Submit a payment proof for an order.
   */
  submit: publicProcedure
    .input(submitPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify the order exists. If the customer is logged in, enforce ownership.
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

      if (ctx.session?.user?.id && order.customerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No tienes acceso a este pedido',
        });
      }

      if (order.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Este pedido no acepta pagos en su estado actual',
        });
      }

      // Map Zod method to DB enum
      const methodMap: Record<string, 'PAGO_MOVIL' | 'TRANSFER' | 'ZELLE' | 'CASH_USD' | 'CASH_BSS' | 'BINANCE'> = {
        pago_movil: 'PAGO_MOVIL',
        transferencia: 'TRANSFER',
        zelle: 'ZELLE',
        efectivo_usd: 'CASH_USD',
        punto_venta: 'CASH_BSS',
      };
      const dbMethod = methodMap[input.method] ?? 'CASH_USD';

      // Decide database currency and amount based on method
      const isUSD = input.method === 'zelle' || input.method === 'efectivo_usd';
      const dbAmount = isUSD ? input.amountUsd : input.amountBs;
      const dbCurrency = isUSD ? 'USD' as const : 'BSS' as const;

      const paymentData = {
        method: dbMethod,
        amount: String(dbAmount),
        currency: dbCurrency,
        referenceNumber: input.reference,
        bank: input.bankName ?? null,
        phoneLast4: input.accountLastFour ?? null,
        proofImageUrl: input.proofImageUrl ?? null,
        status: 'PENDING' as const,
        updatedAt: new Date(),
      };

      const [existingPayment] = await ctx.db
        .select({ id: schema.payments.id })
        .from(schema.payments)
        .where(
          and(
            eq(schema.payments.orderId, input.orderId),
            eq(schema.payments.status, 'PENDING'),
          ),
        )
        .limit(1);

      const [payment] = existingPayment
        ? await ctx.db
            .update(schema.payments)
            .set(paymentData)
            .where(eq(schema.payments.id, existingPayment.id))
            .returning()
        : await ctx.db
            .insert(schema.payments)
            .values({
              orderId: input.orderId,
              ...paymentData,
            })
            .returning();

      // Update order status to PAYMENT_UPLOADED
      await ctx.db
        .update(schema.orders)
        .set({ status: 'PAYMENT_UPLOADED', updatedAt: new Date() })
        .where(eq(schema.orders.id, input.orderId));

      // Log status history
      await ctx.db.insert(schema.orderStatusHistory).values({
        orderId: input.orderId,
        status: 'PAYMENT_UPLOADED',
        notes: 'Comprobante de pago subido por el cliente',
      });

      const { enqueueWebOrderUpsert, flushOutboxBestEffort } = await import('@/server/services/outbox-worker');
      await enqueueWebOrderUpsert({
        orderId: input.orderId,
        idempotencyKey: `${input.orderId}:PAYMENT_REPORTED`,
        status: 'PAYMENT_REPORTED',
      });
      await flushOutboxBestEffort('payment.submit', input.orderId);

      return payment;
    }),

  /**
   * Verify a payment (admin only).
   */
  verify: adminProcedure
    .input(verifyPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      const [payment] = await ctx.db
        .select()
        .from(schema.payments)
        .where(eq(schema.payments.id, input.paymentId))
        .limit(1);

      if (!payment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Pago no encontrado',
        });
      }

      if (payment.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Este pago ya fue procesado',
        });
      }

      const [order] = await ctx.db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, payment.orderId))
        .limit(1);

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Pedido no encontrado',
        });
      }

      if (!order.veloxSaleId) {
        try {
          const { webOrderSyncService } = await import('@/server/services/web-order-sync.service');
          await webOrderSyncService.syncOrder(order.id, 'PAYMENT_REPORTED');
          const veloxResult = await veloxPosService.verifyWebOrderPayment(order.id);
          const saleId = extractVeloxSaleId(veloxResult);
          if (!saleId) {
            throw new Error('Velox no devolvio el ID de la venta');
          }

          await ctx.db
            .update(schema.orders)
            .set({ veloxSaleId: saleId, updatedAt: new Date() })
            .where(eq(schema.orders.id, order.id));
        } catch (error) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Pago no verificado: Velox no pudo crear la venta (${error instanceof Error ? error.message : String(error)})`,
          });
        }
      }

      const [updated] = await ctx.db
        .update(schema.payments)
        .set({
          status: 'VERIFIED',
          verifiedAt: new Date(),
          verifiedBy: ctx.session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(schema.payments.id, input.paymentId))
        .returning();

      // Update order status to PAYMENT_VERIFIED
      await ctx.db
        .update(schema.orders)
        .set({ status: 'PROCESSING', updatedAt: new Date() })
        .where(eq(schema.orders.id, payment.orderId));

      // Log status history
      await ctx.db.insert(schema.orderStatusHistory).values({
        orderId: payment.orderId,
        status: 'PROCESSING',
        notes: input.adminNotes ?? 'Pago verificado por el administrador',
      });

      return updated;
    }),

  /**
   * Reject a payment (admin only).
   */
  reject: adminProcedure
    .input(rejectPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      const [payment] = await ctx.db
        .select()
        .from(schema.payments)
        .where(eq(schema.payments.id, input.paymentId))
        .limit(1);

      if (!payment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Pago no encontrado',
        });
      }

      if (payment.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Este pago ya fue procesado',
        });
      }

      const [updated] = await ctx.db
        .update(schema.payments)
        .set({
          status: 'REJECTED',
          rejectionReason: input.reason,
          updatedAt: new Date(),
        })
        .where(eq(schema.payments.id, input.paymentId))
        .returning();

      // Revert order status to PENDING
      await ctx.db
        .update(schema.orders)
        .set({ status: 'PENDING', updatedAt: new Date() })
        .where(eq(schema.orders.id, payment.orderId));

      // Log status history
      await ctx.db.insert(schema.orderStatusHistory).values({
        orderId: payment.orderId,
        status: 'PENDING',
        notes: `Pago rechazado: ${input.reason}`,
      });

      return updated;
    }),

  /**
   * List payments (admin only).
   */
  list: adminProcedure
    .input(listPaymentsSchema)
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input.status) {
        conditions.push(eq(schema.payments.status, input.status.toUpperCase() as 'PENDING' | 'VERIFIED' | 'REJECTED'));
      }
      if (input.orderId) {
        conditions.push(eq(schema.payments.orderId, input.orderId));
      }
      if (input.method) {
        const methodMap: Record<string, 'PAGO_MOVIL' | 'TRANSFER' | 'ZELLE' | 'CASH_USD' | 'CASH_BSS' | 'BINANCE'> = {
          pago_movil: 'PAGO_MOVIL',
          transferencia: 'TRANSFER',
          zelle: 'ZELLE',
          efectivo_usd: 'CASH_USD',
          punto_venta: 'CASH_BSS',
        };
        conditions.push(eq(schema.payments.method, methodMap[input.method]));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await ctx.db
        .select()
        .from(schema.payments)
        .where(whereClause)
        .orderBy(desc(schema.payments.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [countResult] = await ctx.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(schema.payments)
        .where(whereClause);

      return {
        items,
        total: countResult?.count ?? 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Get payments for the current user's order.
   */
  getByOrder: protectedProcedure
    .input(z.object({ orderId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      // Verify user owns the order
      const [order] = await ctx.db
        .select()
        .from(schema.orders)
        .where(
          and(
            eq(schema.orders.id, input.orderId),
            eq(schema.orders.customerId, ctx.session.user.id),
          ),
        )
        .limit(1);

      const isAdmin = ctx.session.user.role === 'admin';

      if (!order && !isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No tienes acceso a los pagos de este pedido',
        });
      }

      const items = await ctx.db
        .select()
        .from(schema.payments)
        .where(eq(schema.payments.orderId, input.orderId))
        .orderBy(desc(schema.payments.createdAt));

      return items;
    }),
});

function extractVeloxSaleId(response: unknown): string | null {
  if (typeof response !== 'object' || response === null) return null;

  if ('sale_id' in response && response.sale_id) {
    return String(response.sale_id);
  }

  if ('velox_sale_id' in response && response.velox_sale_id) {
    return String(response.velox_sale_id);
  }

  if ('order' in response && typeof response.order === 'object' && response.order !== null) {
    const order = response.order as { sale_id?: unknown };
    return order.sale_id ? String(order.sale_id) : null;
  }

  return null;
}
