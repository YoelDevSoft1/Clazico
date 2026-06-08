import { z } from 'zod';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import * as schema from '@/../drizzle/schema';
import {
  createTRPCRouter,
  adminProcedure,
} from '@/server/trpc/init';
import { productSyncService } from '@/server/services/product-sync.service';
import { exchangeRateService } from '@/server/services/exchange-rate.service';

export const adminRouter = createTRPCRouter({
  /**
   * Dashboard statistics.
   */
  dashboardStats: adminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total orders
    const [totalOrders] = await ctx.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.orders);

    // Orders today
    const [ordersToday] = await ctx.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.orders)
      .where(gte(schema.orders.createdAt, startOfDay));

    // Revenue this month (USD)
    const [monthlyRevenue] = await ctx.db
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${schema.orders.totalUsd} AS DECIMAL)), 0)`,
      })
      .from(schema.orders)
      .where(
        and(
          gte(schema.orders.createdAt, startOfMonth),
          eq(schema.orders.status, 'DELIVERED'),
        ),
      );

    // Pending payments count
    const [pendingPayments] = await ctx.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.payments)
      .where(eq(schema.payments.status, 'PENDING'));

    // Active products count
    const [activeProducts] = await ctx.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.productCache)
      .where(eq(schema.productCache.isActive, true));

    // Total customers (users with customer role)
    const [totalCustomers] = await ctx.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.users)
      .where(eq(schema.users.role, 'customer'));

    // Current exchange rate
    const currentRate = await exchangeRateService.getCurrentRate();

    return {
      totalOrders: totalOrders?.count ?? 0,
      ordersToday: ordersToday?.count ?? 0,
      monthlyRevenueUsd: parseFloat(monthlyRevenue?.total ?? '0'),
      pendingPayments: pendingPayments?.count ?? 0,
      activeProducts: activeProducts?.count ?? 0,
      totalCustomers: totalCustomers?.count ?? 0,
      currentExchangeRate: currentRate.rate,
    };
  }),

  /**
   * Recent orders for admin dashboard.
   */
  recentOrders: adminProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(10),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 10;

      const items = await ctx.db
        .select()
        .from(schema.orders)
        .orderBy(desc(schema.orders.createdAt))
        .limit(limit);

      return items;
    }),

  /**
   * Pending payments that need admin attention.
   */
  pendingPayments: adminProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(20),
        offset: z.number().int().min(0).default(0),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const { limit = 20, offset = 0 } = input ?? {};

      const items = await ctx.db
        .select()
        .from(schema.payments)
        .where(eq(schema.payments.status, 'PENDING'))
        .orderBy(desc(schema.payments.createdAt))
        .limit(limit)
        .offset(offset);

      return items;
    }),

  /**
   * Trigger product sync from Velox POS.
   */
  syncProducts: adminProcedure.mutation(async () => {
    const result = await productSyncService.syncAll();
    return result;
  }),

  /**
   * Update exchange rate (admin only).
   */
  updateExchangeRate: adminProcedure
    .input(
      z.object({
        rate: z.number().positive('La tasa debe ser positiva'),
        source: z.string().min(1).max(100).default('manual'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Deactivate current rate
      await ctx.db
        .update(schema.exchangeRates)
        .set({ isActive: false })
        .where(eq(schema.exchangeRates.isActive, true));

      const sourceMap: Record<string, 'BCV' | 'PARALLEL' | 'MANUAL'> = {
        bcv: 'BCV',
        parallel: 'PARALLEL',
        manual: 'MANUAL',
      };
      const dbSource = sourceMap[input.source.toLowerCase()] ?? 'MANUAL';

      // Insert new rate
      const [newRate] = await ctx.db
        .insert(schema.exchangeRates)
        .values({
          rateBssPerUsd: String(input.rate),
          source: dbSource,
          isActive: true,
          effectiveDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        })
        .returning();

      // Invalidate cache
      exchangeRateService.invalidateCache();

      return newRate;
    }),

  /**
   * Order status breakdown for charts.
   */
  orderStatusBreakdown: adminProcedure.query(async ({ ctx }) => {
    const breakdown = await ctx.db
      .select({
        status: schema.orders.status,
        count: sql<number>`COUNT(*)`,
      })
      .from(schema.orders)
      .groupBy(schema.orders.status);

    return breakdown;
  }),
});
