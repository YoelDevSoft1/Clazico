import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/../drizzle/schema";

/**
 * Drizzle client singleton.
 *
 * In development Next.js hot-reloads frequently, so we cache the client on
 * `globalThis` to avoid creating a new connection pool on every reload.
 */

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle> | undefined;
};

function createDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Please check your environment variables."
    );
  }

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  // Prevent unexpected errors on idle clients from crashing the entire Node process
  pool.on("error", (err) => {
    console.error("Unexpected error on idle database client", err);
  });

  return drizzle(pool, {
    schema,
    logger: process.env.NODE_ENV === "development",
  });
}

export const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}

export type Database = typeof db;

