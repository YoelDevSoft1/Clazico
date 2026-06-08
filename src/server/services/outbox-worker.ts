import 'server-only';
import { and, eq, lt, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import * as schema from '@/../drizzle/schema';
import {
  veloxPosService,
  VeloxAPIError,
  type VeloxWebOrderPayload,
} from './velox-pos.service';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OutboxProcessResult {
  processed: number;
  failed: number;
  skipped: number;
}

export interface EnqueueWebOrderParams {
  orderId: string;
  idempotencyKey: string;
}

// ─── Outbox helpers (DB-level) ────────────────────────────────────────────────

/**
 * Enqueue a `web_order.upsert` event for the outbox worker.
 *
 * The outbox row stores the full Velox payload (already shaped by
 * `WebOrderSyncService`), so the worker is decoupled from the order
 * lifecycle. The `idempotencyKey` is propagated to Velox as the
 * `Idempotency-Key` header.
 */
export async function enqueueWebOrderUpsert(
  params: EnqueueWebOrderParams,
): Promise<void> {
  // Build the payload from the current order state.
  const { webOrderSyncService } = await import('./web-order-sync.service');
  const payload = await webOrderSyncService.buildPayload(params.orderId, 'PENDING_PAYMENT');

  await db.transaction(async (tx) => {
    await tx.insert(schema.outbox).values({
      type: 'web_order.upsert',
      aggregateId: params.orderId,
      payload: payload as unknown as Record<string, unknown>,
      idempotencyKey: params.idempotencyKey,
      status: 'pending',
      attempts: 0,
      maxAttempts: 10,
      nextAttemptAt: new Date(),
    });

    await tx
      .insert(schema.ordersSync)
      .values({
        orderId: params.orderId,
        syncStatus: 'pending',
      })
      .onConflictDoNothing({ target: schema.ordersSync.orderId });
  });
}

// ─── Outbox worker ───────────────────────────────────────────────────────────

const BATCH_SIZE = 5;
const WORKER_ID = `outbox-worker-${process.pid}-${Date.now()}`;

/**
 * Compute the backoff delay for an attempt count, capped at 60 minutes.
 * Formula: min(60, 2^attempts) minutes.
 */
export function computeBackoffMinutes(attempts: number): number {
  return Math.min(60, Math.pow(2, attempts));
}

export class OutboxWorker {
  /**
   * Process up to `BATCH_SIZE` pending outbox events. Uses `FOR UPDATE
   * SKIP LOCKED` so multiple workers can run in parallel without
   * stepping on each other.
   */
  async processPending(): Promise<OutboxProcessResult> {
    const result: OutboxProcessResult = { processed: 0, failed: 0, skipped: 0 };

    // Acquire a small batch of due rows under row-level locks.
    const pending = await db
      .select()
      .from(schema.outbox)
      .where(
        and(
          eq(schema.outbox.status, 'pending'),
          lt(schema.outbox.nextAttemptAt, new Date()),
        ),
      )
      .orderBy(schema.outbox.nextAttemptAt)
      .limit(BATCH_SIZE)
      .for('update', { skipLocked: true });

    if (pending.length === 0) {
      return result;
    }

    for (const row of pending) {
      try {
        const success = await this.processOne(row.id, row.type, row.payload as VeloxWebOrderPayload, row.idempotencyKey, row.aggregateId);
        if (success) {
          result.processed++;
        } else {
          result.failed++;
        }
      } catch (error) {
        // Defensive: processOne handles its own errors, but a thrown
        // exception here is treated as a transient failure.
        await this.markFailed(
          row.id,
          row.attempts,
          row.maxAttempts,
          error instanceof Error ? error.message : String(error),
        );
        result.failed++;
      }
    }

    return result;
  }

  private async processOne(
    outboxId: string,
    type: string,
    payload: VeloxWebOrderPayload,
    idempotencyKey: string,
    aggregateId: string,
  ): Promise<boolean> {
    // Mark the row in_flight so other workers skip it.
    await db
      .update(schema.outbox)
      .set({
        status: 'in_flight',
        lockedAt: new Date(),
        lockedBy: WORKER_ID,
        updatedAt: new Date(),
      })
      .where(eq(schema.outbox.id, outboxId));

    try {
      if (type !== 'web_order.upsert') {
        // Unknown type — mark failed permanently.
        await db
          .update(schema.outbox)
          .set({
            status: 'failed',
            lastError: `Unknown outbox type: ${type}`,
            updatedAt: new Date(),
          })
          .where(eq(schema.outbox.id, outboxId));
        return false;
      }

      const response = await veloxPosService.upsertWebOrder(
        payload,
        idempotencyKey,
      );
      const veloxSaleId = extractVeloxSaleId(response);

      await db.transaction(async (tx) => {
        await tx
          .update(schema.outbox)
          .set({
            status: 'done',
            lastError: null,
            updatedAt: new Date(),
          })
          .where(eq(schema.outbox.id, outboxId));

        await tx
          .update(schema.ordersSync)
          .set({
            syncStatus: 'synced',
            veloxSaleId,
            lastSyncAttemptAt: new Date(),
            lastSyncError: null,
          })
          .where(eq(schema.ordersSync.orderId, aggregateId));

        if (veloxSaleId) {
          await tx
            .update(schema.orders)
            .set({ veloxSaleId, updatedAt: new Date() })
            .where(eq(schema.orders.id, aggregateId));
        }
      });
      return true;
    } catch (error) {
      const status = error instanceof VeloxAPIError ? error.statusCode : 0;
      const message = error instanceof Error ? error.message : String(error);
      // Read attempts again from the row, since it may have changed
      // (defensive — only one worker touches this row at a time).
      const [row] = await db
        .select({ attempts: schema.outbox.attempts, maxAttempts: schema.outbox.maxAttempts })
        .from(schema.outbox)
        .where(eq(schema.outbox.id, outboxId))
        .limit(1);
      if (!row) return false;

      // 4xx errors are client errors — mark as failed permanently.
      if (status >= 400 && status < 500) {
        await db
          .update(schema.outbox)
          .set({
            status: 'failed',
            lastError: `HTTP ${status}: ${message}`,
            updatedAt: new Date(),
          })
          .where(eq(schema.outbox.id, outboxId));
        await db
          .update(schema.ordersSync)
          .set({
            syncStatus: 'failed',
            lastSyncAttemptAt: new Date(),
            lastSyncError: message,
          })
          .where(eq(schema.ordersSync.orderId, aggregateId));
        return false;
      }

      await this.markFailed(
        outboxId,
        row.attempts,
        row.maxAttempts,
        message,
      );
      return false;
    }
  }

  private async markFailed(
    outboxId: string,
    currentAttempts: number,
    maxAttempts: number,
    message: string,
  ): Promise<void> {
    const nextAttempts = currentAttempts + 1;
    const exhausted = nextAttempts >= maxAttempts;
    const status = exhausted ? 'failed' : 'pending';
    const nextAttemptAt = exhausted
      ? new Date()
      : new Date(Date.now() + computeBackoffMinutes(nextAttempts) * 60 * 1000);

    await db.transaction(async (tx) => {
      await tx
        .update(schema.outbox)
        .set({
          status,
          attempts: nextAttempts,
          nextAttemptAt,
          lastError: message,
          updatedAt: new Date(),
          lockedAt: null,
          lockedBy: null,
        })
        .where(eq(schema.outbox.id, outboxId));

      // Update the order sync state for the admin UI.
      const [row] = await tx
        .select({ aggregateId: schema.outbox.aggregateId })
        .from(schema.outbox)
        .where(eq(schema.outbox.id, outboxId))
        .limit(1);
      if (row) {
        await tx
          .update(schema.ordersSync)
          .set({
            syncStatus: exhausted ? 'failed' : 'pending',
            lastSyncAttemptAt: new Date(),
            lastSyncError: message,
          })
          .where(eq(schema.ordersSync.orderId, row.aggregateId));
      }
    });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractVeloxSaleId(response: unknown): string | null {
  if (typeof response !== 'object' || response === null) return null;
  const obj = response as Record<string, unknown>;
  if (typeof obj.sale_id === 'string') return obj.sale_id;
  if (typeof obj.id === 'string') return obj.id;
  if (typeof obj.web_order_id === 'string') return obj.web_order_id;
  if (typeof obj.order === 'object' && obj.order !== null) {
    const order = obj.order as Record<string, unknown>;
    if (typeof order.sale_id === 'string') return order.sale_id;
  }
  return null;
}

export const outboxWorker = new OutboxWorker();
export default OutboxWorker;

// Avoid unused import warnings
void sql;
