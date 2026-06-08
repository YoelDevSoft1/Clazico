import { NextResponse } from 'next/server';
import { lt } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RETENTION_DAYS = 7;

/**
 * Cron-driven retention job for `webhook_deliveries`.
 *
 * Velox replays webhooks on a backoff schedule. The dedup table only
 * needs to remember an event id for as long as Velox might retry
 * (default 24h, but we keep a 7-day window for safety / forensics).
 *
 * Returns the number of rows removed.
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
    const [{ db }, schema] = await Promise.all([
      import('@/server/db'),
      import('@/../drizzle/schema'),
    ]);

    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const deleted = await db
      .delete(schema.webhookDeliveries)
      .where(lt(schema.webhookDeliveries.receivedAt, cutoff))
      .returning({ id: schema.webhookDeliveries.id });

    return NextResponse.json({
      success: true,
      deleted: deleted.length,
      cutoff: cutoff.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
