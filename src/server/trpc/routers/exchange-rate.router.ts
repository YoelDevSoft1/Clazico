import { z } from 'zod';
import {
  createTRPCRouter,
  publicProcedure,
} from '@/server/trpc/init';
import { exchangeRateService } from '@/server/services/exchange-rate.service';

export const exchangeRateRouter = createTRPCRouter({
  /**
   * Get the current active exchange rate (USD → BS).
   */
  current: publicProcedure.query(async () => {
    const rate = await exchangeRateService.getCurrentRate();
    return rate;
  }),

  /**
   * Get exchange rate history.
   */
  history: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(365).default(30),
      }).optional(),
    )
    .query(async ({ input }) => {
      const limit = input?.limit ?? 30;
      const history = await exchangeRateService.getHistory(limit);
      return history;
    }),

  /**
   * Convert an amount between USD and BS.
   */
  convert: publicProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        from: z.enum(['USD', 'BS']),
      }),
    )
    .query(async ({ input }) => {
      if (input.from === 'USD') {
        const converted = await exchangeRateService.convertUsdToBs(input.amount);
        return { from: 'USD', to: 'BS', amount: input.amount, converted };
      } else {
        const converted = await exchangeRateService.convertBsToUsd(input.amount);
        return { from: 'BS', to: 'USD', amount: input.amount, converted };
      }
    }),
});
