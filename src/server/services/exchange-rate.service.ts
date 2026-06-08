import 'server-only';
import { db } from '@/server/db';
import * as schema from '@/../drizzle/schema';
import { desc, eq } from 'drizzle-orm';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExchangeRateInfo {
  id: string;
  rate: number;
  source: string;
  effectiveDate: Date;
  createdAt: Date;
}

// ─── Service ─────────────────────────────────────────────────────────────────

class ExchangeRateService {
  private static instance: ExchangeRateService | null = null;

  private cachedRate: ExchangeRateInfo | null = null;
  private cacheExpiresAt: number = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): ExchangeRateService {
    if (!ExchangeRateService.instance) {
      ExchangeRateService.instance = new ExchangeRateService();
    }
    return ExchangeRateService.instance;
  }

  /**
   * Get the current (most recent) exchange rate. Uses in-memory cache.
   */
  async getCurrentRate(): Promise<ExchangeRateInfo> {
    if (this.cachedRate && Date.now() < this.cacheExpiresAt) {
      return this.cachedRate;
    }

    const [row] = await db
      .select()
      .from(schema.exchangeRates)
      .where(eq(schema.exchangeRates.isActive, true))
      .orderBy(desc(schema.exchangeRates.effectiveDate))
      .limit(1);

    if (!row) {
      throw new Error('No active exchange rate found in the database');
    }

    const rate: ExchangeRateInfo = {
      id: row.id,
      rate: parseFloat(String(row.rateBssPerUsd)),
      source: row.source,
      effectiveDate: new Date(row.effectiveDate),
      createdAt: row.createdAt,
    };

    this.cachedRate = rate;
    this.cacheExpiresAt = Date.now() + this.CACHE_TTL_MS;

    return rate;
  }

  /**
   * Get exchange rate history, optionally limited.
   */
  async getHistory(limit: number = 30): Promise<ExchangeRateInfo[]> {
    const rows = await db
      .select()
      .from(schema.exchangeRates)
      .orderBy(desc(schema.exchangeRates.effectiveDate))
      .limit(limit);

    return rows.map((row) => ({
      id: row.id,
      rate: parseFloat(String(row.rateBssPerUsd)),
      source: row.source,
      effectiveDate: new Date(row.effectiveDate),
      createdAt: row.createdAt,
    }));
  }

  /**
   * Invalidate the in-memory cache (e.g., after rate update).
   */
  invalidateCache(): void {
    this.cachedRate = null;
    this.cacheExpiresAt = 0;
  }

  /**
   * Convert USD to Bolívares using the current rate.
   */
  async convertUsdToBs(amountUsd: number): Promise<number> {
    const { rate } = await this.getCurrentRate();
    return Math.round(amountUsd * rate * 100) / 100;
  }

  /**
   * Convert Bolívares to USD using the current rate.
   */
  async convertBsToUsd(amountBs: number): Promise<number> {
    const { rate } = await this.getCurrentRate();
    return Math.round((amountBs / rate) * 100) / 100;
  }
}

export const exchangeRateService = ExchangeRateService.getInstance();
export default ExchangeRateService;
