import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BATCH_SIZE = 50;

/**
 * Cron-driven outbox worker trigger.
 *
 * Hard requirement: CRON_SECRET must be configured. Unlike the legacy
 * sync/import crons, this one is non-optional — silently no-oping
 * without auth would mean orders pile up in the outbox forever.
 *
 * Returns `{ processed, failed, skipped }` plus the timestamp so the
 * Netlify Scheduled Function (or external scheduler) can chart
 * throughput.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured' },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { outboxWorker } = await import('@/server/services/outbox-worker');
    // Run up to BATCH_SIZE batches sequentially. The worker claims rows
    // inside a transaction before sending them to Velox.
    const total: { processed: number; failed: number; skipped: number } = { processed: 0, failed: 0, skipped: 0 };
    for (let i = 0; i < BATCH_SIZE; i++) {
      const result = await outboxWorker.processPending();
      total.processed += result.processed;
      total.failed += result.failed;
      total.skipped += result.skipped;
      // If the batch returned nothing pending, stop early.
      if (result.processed === 0 && result.failed === 0 && result.skipped === 0) {
        break;
      }
    }
    return NextResponse.json({ success: true, ranAt: new Date().toISOString(), ...total });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
