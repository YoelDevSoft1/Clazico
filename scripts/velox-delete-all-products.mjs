import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const veloxBaseUrl = process.env.VELOX_POS_API_URL?.replace(/\/+$/, '');
const storeId = process.env.VELOX_STORE_ID;
const pin = process.env.VELOX_LOGIN_PIN;

if (!veloxBaseUrl) throw new Error('VELOX_POS_API_URL is required');
if (!storeId) throw new Error('VELOX_STORE_ID is required');
if (!pin) throw new Error('VELOX_LOGIN_PIN is required');

async function main() {
  console.log("⚠️ ATENCIÓN: Conectando a Velox POS para eliminar TODOS los productos...");

  // 1. Iniciar sesión en Velox
  const authResponse = await fetch(`${veloxBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ store_id: storeId, pin }),
  });

  if (!authResponse.ok) {
    throw new Error(`Fallo autenticación en Velox: ${authResponse.status} ${await authResponse.text()}`);
  }

  const authData = await authResponse.json();
  const token = authData.access_token;
  console.log("✅ Autenticado en Velox POS exitosamente.");

  // 2. Obtener todos los productos
  console.log("⏳ Obteniendo lista de productos de Velox...");
  const productsResponse = await fetch(`${veloxBaseUrl}/products?limit=10000`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!productsResponse.ok) {
    throw new Error(`Fallo al obtener productos de Velox: ${productsResponse.status} ${await productsResponse.text()}`);
  }

  const productsBody = await productsResponse.json();
  const products = Array.isArray(productsBody)
    ? productsBody
    : productsBody.products ?? productsBody.items ?? productsBody.data ?? [];

  console.log(`📦 Se encontraron ${products.length} productos en Velox POS.`);

  if (products.length === 0) {
    console.log("✅ No hay productos para borrar en Velox POS.");
    return;
  }

  // 3. Borrar uno por uno
  console.log("⏳ Iniciando el borrado de productos en Velox POS...");
  let deletedCount = 0;
  let errorCount = 0;

  for (const product of products) {
    try {
      const deleteResponse = await fetch(`${veloxBaseUrl}/products/${product.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (deleteResponse.ok) {
        deletedCount++;
        process.stdout.write(`\r✅ Borrados: ${deletedCount}/${products.length}`);
      } else {
        errorCount++;
        console.error(`\n❌ Error al borrar el producto ${product.id} (${product.name}): Status ${deleteResponse.status}`);
      }
    } catch (err) {
      errorCount++;
      console.error(`\n❌ Excepción al borrar el producto ${product.id}:`, err.message);
    }
  }

  console.log("\n\n🎉 Proceso finalizado en Velox POS.");
  console.log(`📊 Total borrados: ${deletedCount}`);
  if (errorCount > 0) {
    console.log(`⚠️ Hubo errores al intentar borrar ${errorCount} productos.`);
  }
}

main().catch(err => {
  console.error("❌ Error inesperado:", err);
});
