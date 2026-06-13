import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import pg from "pg";

const { Client } = pg;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set.");

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  console.log("🔧 HERRAMIENTA DE REPARACIÓN DE LA TIENDA\n");
  try {
    // 1. Mark products without variants as inactive to avoid storefront crashes
    console.log("1️⃣  Verificando productos sin variantes...");
    const noVariantRes = await client.query(`
      UPDATE product_cache
      SET is_active = false
      WHERE id IN (
        SELECT pc.id 
        FROM product_cache pc 
        LEFT JOIN product_variants pv ON pc.id = pv.product_cache_id 
        WHERE pv.id IS NULL
      ) AND is_active = true
      RETURNING id;
    `);
    console.log(`   ✅ Desactivados ${noVariantRes.rowCount} productos sin variantes.`);

    // 2. Fix negative stock
    console.log("\n2️⃣  Corrigiendo stock negativo...");
    const stockRes1 = await client.query(`
      UPDATE product_cache SET current_stock = 0 WHERE current_stock < 0 RETURNING id;
    `);
    const stockRes2 = await client.query(`
      UPDATE product_variants SET current_stock = 0 WHERE current_stock < 0 RETURNING id;
    `);
    console.log(`   ✅ Stock corregido en ${stockRes1.rowCount} productos y ${stockRes2.rowCount} variantes.`);

    // 3. Reset sync status for stuck orders
    console.log("\n3️⃣  Restableciendo sincronización de órdenes trabadas...");
    const syncRes = await client.query(`
      UPDATE orders_sync 
      SET sync_status = 'pending', last_sync_error = NULL
      WHERE sync_status = 'failed' 
      RETURNING order_id;
    `);
    console.log(`   ✅ Se restablecieron ${syncRes.rowCount} órdenes para reintentar sincronización.`);

    console.log("\n🎉 Reparación completada con éxito.");
  } catch (err) {
    console.error("❌ Error en la reparación:", err);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
