import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import pg from "pg";

const { Client } = pg;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. Please check your .env.local file.");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  console.log("⚠️ ATENCIÓN: Iniciando script de limpieza de productos...");
  
  try {
    // Eliminamos todo de product_cache.
    // Drizzle se encargará de hacer cascade a product_variants y product_image_cache 
    // gracias a la configuración: { onDelete: "cascade" }
    
    console.log("⏳ Borrando productos de la base de datos...");
    const result = await client.query("DELETE FROM product_cache");
    
    console.log(`✅ ¡Éxito! Se han borrado ${result.rowCount} productos.`);
    console.log("✅ Sus variantes e imágenes asociadas también fueron eliminadas por la restricción de cascada.");
  } catch (err) {
    console.error("❌ Error al intentar borrar los productos:", err);
  } finally {
    await client.end();
    console.log("🔌 Desconectado de la base de datos.");
  }
}

main().catch(console.error);
