import { Client } from 'pg';

async function main() {
  console.log("Connecting to Local DB...");
  const client = new Client({
    connectionString: "postgresql://clazico:clazico_secret@localhost:5435/clazico_store",
  });
  
  await client.connect();
  console.log("Connected!");
  
  const res = await client.query("SELECT * FROM outbox WHERE type = 'web_order.upsert' AND status = 'failed' ORDER BY created_at DESC LIMIT 5");
  console.log("Failed outbox rows:", JSON.stringify(res.rows, null, 2));

  const res2 = await client.query("SELECT * FROM outbox WHERE type = 'web_order.upsert' ORDER BY created_at DESC LIMIT 5");
  console.log("Recent outbox rows:", JSON.stringify(res2.rows, null, 2));
  
  await client.end();
}

main().catch(err => console.error(err));
