import { defineConfig } from "drizzle-kit";

// Generates SQL migrations for Cloudflare D1. Apply them with
// `npx wrangler d1 migrations apply splitthetab --remote` (or --local for dev).
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
});
