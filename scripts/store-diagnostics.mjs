import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import pg from "pg";

const { Client } = pg;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set.");

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  console.log("📊 DIAGNÓSTICO Y EVALUACIÓN DE LA TIENDA\n");
  console.log("Recopilando estadísticas...\n");

  try {
    const products = await client.query("SELECT COUNT(*) FROM product_cache");
    const variants = await client.query("SELECT COUNT(*) FROM product_variants");
    const orders = await client.query("SELECT COUNT(*) FROM orders");
    const users = await client.query('SELECT COUNT(*) FROM "user"');
    const payments = await client.query("SELECT COUNT(*) FROM payments");

    console.log("📈 RESUMEN DE DATOS:");
    console.log(`  - Productos: ${products.rows[0].count}`);
    console.log(`  - Variantes: ${variants.rows[0].count}`);
    console.log(`  - Usuarios:  ${users.rows[0].count}`);
    console.log(`  - Órdenes:   ${orders.rows[0].count}`);
    console.log(`  - Pagos:     ${payments.rows[0].count}`);
    
    console.log("\n🔍 ANÁLISIS DE ANOMALÍAS:");

    // Check for products without variants
    const noVariants = await client.query(`
      SELECT COUNT(pc.id) 
      FROM product_cache pc 
      LEFT JOIN product_variants pv ON pc.id = pv.product_cache_id 
      WHERE pv.id IS NULL
    `);
    console.log(`  - Productos sin variantes (huérfanos o mal sincronizados): ${noVariants.rows[0].count}`);
    
    // Check for products with 0 stock
    const outOfStock = await client.query(`
      SELECT COUNT(*) FROM product_cache WHERE current_stock <= 0
    `);
    console.log(`  - Productos sin stock (agotados): ${outOfStock.rows[0].count}`);

    // Check sync errors in orders
    const syncErrors = await client.query(`
      SELECT COUNT(*) FROM orders_sync WHERE sync_status = 'failed' OR last_sync_error IS NOT NULL
    `);
    console.log(`  - Órdenes con errores de sincronización (Velox): ${syncErrors.rows[0].count}`);

    // Check pending payments
    const pendingPayments = await client.query(`
      SELECT COUNT(*) FROM payments WHERE status = 'PENDING'
    `);
    console.log(`  - Pagos pendientes por verificar: ${pendingPayments.rows[0].count}`);

  } catch (err) {
    console.error("❌ Error ejecutando diagnóstico:", err);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
