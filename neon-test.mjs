import { neon } from '@neondatabase/serverless';

async function check() {
  console.log("Connecting using neon-http...");
  const sql = neon("postgresql://neondb_owner:npg_kDdBiLhYH1R9@ep-raspy-sunset-aqlbw52t-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require");
  
  try {
    const failed = await sql`SELECT id, type, payload, last_error, status, attempts FROM outbox WHERE status = 'failed' ORDER BY created_at DESC LIMIT 5`;
    console.log("FAILED ROWS:", JSON.stringify(failed, null, 2));

    const recent = await sql`SELECT id, type, payload, last_error, status, attempts FROM outbox ORDER BY created_at DESC LIMIT 2`;
    console.log("RECENT ROWS:", JSON.stringify(recent, null, 2));
  } catch (err) {
    console.error("Neon HTTP error:", err);
  }
}

check();
