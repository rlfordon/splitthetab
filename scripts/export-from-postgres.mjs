#!/usr/bin/env node
// One-time migration: dump the Railway Postgres data as SQLite INSERTs for Cloudflare D1.
//
//   DATABASE_URL='postgresql://…' node scripts/export-from-postgres.mjs > export.sql
//   npx wrangler d1 execute splitthetab --remote --file=export.sql
//
// Run it against a D1 database that has the migrations applied but no data yet.
// Ids are preserved, so links like /t/ABC123 and expense ids keep working.
// Timestamps become unix seconds and spent_on stays a 'YYYY-MM-DD' string,
// matching src/db/schema.ts.

// Tables in foreign-key order, with SQL that returns each column in its D1 format.
export const TABLES = [
  {
    name: "trips",
    select: `select id, code, name, currency,
      extract(epoch from created_at)::bigint as created_at from trips order by id`,
  },
  { name: "payment_groups", select: "select id, trip_id, name from payment_groups order by id" },
  {
    name: "participants",
    select: "select id, trip_id, name, payment_group_id from participants order by id",
  },
  {
    name: "expenses",
    select: `select id, trip_id, payer_id, description, amount_cents,
      to_char(spent_on, 'YYYY-MM-DD') as spent_on, created_by,
      extract(epoch from created_at)::bigint as created_at from expenses order by id`,
  },
  {
    name: "expense_shares",
    select: "select expense_id, participant_id from expense_shares order by expense_id, participant_id",
  },
  {
    name: "settlements",
    select: `select id, trip_id, from_id, to_id, amount_cents,
      extract(epoch from created_at)::bigint as created_at from settlements order by id`,
  },
];

export function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  // node-postgres returns bigint/numeric columns as strings; keep plain integers unquoted.
  if (typeof value === "string" && /^-?\d+$/.test(value)) return value;
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function insertStatements(table, rows) {
  return rows.map((row) => {
    const columns = Object.keys(row);
    const values = columns.map((c) => sqlValue(row[c]));
    return `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${values.join(", ")});`;
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL to the Railway Postgres connection string.");
    process.exit(1);
  }
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const out = [];
    for (const { name, select } of TABLES) {
      const { rows } = await client.query(select);
      out.push(`-- ${name}: ${rows.length} rows`, ...insertStatements(name, rows));
      console.error(`${name}: ${rows.length} rows`);
    }
    process.stdout.write(out.join("\n") + "\n");
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
