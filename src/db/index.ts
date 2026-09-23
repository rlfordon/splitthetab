import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

export type Db = DrizzleD1Database<typeof schema>;

// The D1 binding lives on the per-request Cloudflare env, so build the client on demand.
// It's a thin wrapper around the binding; creating one per call is cheap.
export function getDb(): Db {
  const { env } = getCloudflareContext();
  return drizzle(env.DB, { schema });
}
