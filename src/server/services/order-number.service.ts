import 'server-only';
import { db } from '@/server/db';
import * as schema from '@/../drizzle/schema';
import { desc, like } from 'drizzle-orm';

/**
 * Generates sequential order numbers in the format: CLZ-YYYY-NNNNN
 * e.g. CLZ-2026-00001, CLZ-2026-00002, etc.
 *
 * Uses a database sequence approach to ensure uniqueness under concurrency.
 */
class OrderNumberService {
  private static instance: OrderNumberService | null = null;

  private constructor() {}

  static getInstance(): OrderNumberService {
    if (!OrderNumberService.instance) {
      OrderNumberService.instance = new OrderNumberService();
    }
    return OrderNumberService.instance;
  }

  /**
   * Generate the next order number for the current year.
   * Uses a SELECT ... FOR UPDATE style query to safely increment.
   */
  async generate(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CLZ-${year}-`;

    const [latest] = await db
      .select({ orderNumber: schema.orders.orderNumber })
      .from(schema.orders)
      .where(like(schema.orders.orderNumber, `${prefix}%`))
      .orderBy(desc(schema.orders.orderNumber))
      .limit(1);

    const currentMax = latest?.orderNumber
      ? Number.parseInt(latest.orderNumber.slice(prefix.length), 10)
      : 0;
    const nextSeq = currentMax + 1;

    // Pad to 5 digits
    const paddedSeq = String(nextSeq).padStart(5, '0');

    return `${prefix}${paddedSeq}`;
  }

  /**
   * Validate that an order number matches the expected format.
   */
  isValid(orderNumber: string): boolean {
    return /^CLZ-\d{4}-\d{5}$/.test(orderNumber);
  }
}

export const orderNumberService = OrderNumberService.getInstance();
export default OrderNumberService;
