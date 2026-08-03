import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Reuse the pool across Next.js dev-server hot reloads.
const globalForDb = globalThis as unknown as {
  pool?: Pool;
};

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });
globalForDb.pool = pool;

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });
