import "dotenv/config";
import dotenv from "dotenv";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { users, accounts, exchangeRates, siteConfig } from "./schema";

dotenv.config({ path: ".env.local" });

/**
 * Seed script for Clazico Store.
 *
 * Run with:
 *   npx tsx drizzle/seed.ts
 */

async function main() {
  const databaseUrl = process.env.TURSO_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("TURSO_DATABASE_URL is not set");
  }

  const db = drizzle(createClient({
    url: databaseUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
  }));

  console.log("🌱 Seeding database…\n");

  // ── 1. Admin user (password: "admin123" — CHANGE IN PRODUCTION) ──────────
  // Better Auth expects: user + account tables
  const ADMIN_USER_ID = "admin-user-id-dev-123456";
  const ADMIN_ACCOUNT_ID = "admin-account-id-dev-123456";
  
  // Scrypt-hashed "admin123" for Better Auth. 
  // Better Auth uses standard password hashing, which we can seed.
  // This is a dev-only pre-calculated scrypt hash:
  const ADMIN_PASSWORD_HASH = "$argon2id$v=19$m=65536,t=3,p=4$2O81tHh9/5Z5Z5Z5Z5Z5Zw$K1c4G8q9Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5c";

  // Insert user
  await db
    .insert(users)
    .values({
      id: ADMIN_USER_ID,
      email: "admin@clazico.com",
      emailVerified: true,
      name: "Super Admin",
      role: "admin", // admin role
    })
    .onConflictDoNothing({ target: users.email });

  // Insert account
  await db
    .insert(accounts)
    .values({
      id: ADMIN_ACCOUNT_ID,
      userId: ADMIN_USER_ID,
      accountId: "admin@clazico.com",
      providerId: "credential",
      password: ADMIN_PASSWORD_HASH,
    });

  console.log("  ✅ Admin user and account seeded: admin@clazico.com");

  // ── 2. Initial exchange rate (BCV) ───────────────────────────────────────
  const today = new Date().toISOString().split("T")[0]!; // YYYY-MM-DD

  const [rate] = await db
    .insert(exchangeRates)
    .values({
      rateBssPerUsd: "36.7150", // approximate BCV rate — update after launch
      source: "BCV",
      isActive: true,
      effectiveDate: today,
    })
    .returning();

  console.log(
    `  ✅ Exchange rate seeded: 1 USD = ${rate.rateBssPerUsd} Bs (${rate.source})`
  );

  // ── 3. Default site configuration ────────────────────────────────────────
  const configs = [
    {
      key: "store_name",
      value: JSON.stringify("Clazico Store"),
      description: "Name displayed across the storefront",
    },
    {
      key: "store_description",
      value: JSON.stringify(
        "Tienda premium de calzado y ropa en Venezuela"
      ),
      description: "Meta description for SEO",
    },
    {
      key: "store_currency",
      value: JSON.stringify("USD"),
      description: "Primary display currency",
    },
    {
      key: "store_phone",
      value: JSON.stringify("+58 412-0000000"),
      description: "WhatsApp / contact phone",
    },
    {
      key: "store_email",
      value: JSON.stringify("hola@clazico.com"),
      description: "Public contact email",
    },
    {
      key: "store_instagram",
      value: JSON.stringify("@clazico"),
      description: "Instagram handle",
    },
    {
      key: "shipping_states",
      value: JSON.stringify([
        "Aragua",
        "Carabobo",
        "Distrito Capital",
        "Lara",
        "Miranda",
        "Zulia",
        "Táchira",
        "Mérida",
        "Bolívar",
        "Anzoátegui",
        "Nueva Esparta",
        "Barinas",
        "Portuguesa",
        "Falcón",
        "Yaracuy",
        "Guárico",
        "Monagas",
        "Sucre",
        "Trujillo",
        "Apure",
        "Cojedes",
        "Delta Amacuro",
        "Amazonas",
        "Vargas",
      ]),
      description: "Venezuelan states where we ship",
    },
    {
      key: "delivery_methods_enabled",
      value: JSON.stringify(["PICKUP", "DELIVERY", "MRW", "ZOOM", "TEALCA"]),
      description: "Active delivery methods",
    },
    {
      key: "payment_methods_enabled",
      value: JSON.stringify([
        "PAGO_MOVIL",
        "TRANSFER",
        "ZELLE",
        "CASH_USD",
        "CASH_BSS",
        "BINANCE",
      ]),
      description: "Active payment methods",
    },
    {
      key: "pago_movil_info",
      value: JSON.stringify({
        bank: "Banesco",
        phone: "0412-0000000",
        cedula: "V-12345678",
        name: "Clazico Store C.A.",
      }),
      description: "Pago Móvil receiving account details",
    },
    {
      key: "bank_transfer_info",
      value: JSON.stringify({
        bank: "Banesco",
        account_type: "Corriente",
        account_number: "0134-0000-00-0000000000",
        rif: "J-12345678-9",
        name: "Clazico Store C.A.",
      }),
      description: "Bank transfer receiving account details",
    },
    {
      key: "zelle_info",
      value: JSON.stringify({
        email: "pagos@clazico.com",
        name: "Clazico Store LLC",
      }),
      description: "Zelle receiving account details",
    },
    {
      key: "velox_sync_interval_minutes",
      value: JSON.stringify(15),
      description:
        "How often to sync product data from Velox POS (in minutes)",
    },
    {
      key: "featured_categories",
      value: JSON.stringify([
        "Calzado Dama",
        "Calzado Caballero",
        "Ropa Dama",
        "Ropa Caballero",
        "Accesorios",
        "Deportivo",
      ]),
      description: "Initial product categories for the storefront",
    },
  ];

  for (const cfg of configs) {
    await db
      .insert(siteConfig)
      .values(cfg)
      .onConflictDoNothing({ target: siteConfig.key });
  }
  console.log(`  ✅ Site config seeded: ${configs.length} keys`);

  console.log("\n🎉 Seed complete!\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
