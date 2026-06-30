import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
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
  const databaseUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!databaseUrl) {
    throw new Error(
      "TURSO_DATABASE_URL is not set. Please check your environment variables."
    );
  }

  const client = createClient({
    url: databaseUrl,
    authToken,
  });

  return drizzle(client, {
    schema,
    logger: process.env.NODE_ENV === "development",
  });
}

export const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}

export type Database = typeof db;
