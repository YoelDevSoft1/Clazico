import { createTRPCRouter } from './init';
import { productRouter } from './routers/product.router';
import { orderRouter } from './routers/order.router';
import { paymentRouter } from './routers/payment.router';
import { customerRouter } from './routers/customer.router';
import { exchangeRateRouter } from './routers/exchange-rate.router';
import { lookbookRouter } from './routers/lookbook.router';
import { adminRouter } from './routers/admin.router';

export const appRouter = createTRPCRouter({
  product: productRouter,
  order: orderRouter,
  payment: paymentRouter,
  customer: customerRouter,
  exchangeRate: exchangeRateRouter,
  lookbook: lookbookRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
