import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

// SQLite (Cloudflare D1). Timestamps are stored as unix seconds and read back as Date;
// spent_on is a 'YYYY-MM-DD' string, matching what the Postgres date column returned.
const id = () => integer("id").primaryKey({ autoIncrement: true });
const createdAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

export const trips = sqliteTable("trips", {
  id: id(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("USD"),
  createdAt: createdAt(),
});

// A shared wallet: members pay and settle as one (couple, family, ...).
export const paymentGroups = sqliteTable("payment_groups", {
  id: id(),
  tripId: integer("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

export const participants = sqliteTable(
  "participants",
  {
    id: id(),
    tripId: integer("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    paymentGroupId: integer("payment_group_id").references(() => paymentGroups.id, {
      onDelete: "set null",
    }),
  },
  (t) => [unique().on(t.tripId, t.name)],
);

export const expenses = sqliteTable("expenses", {
  id: id(),
  tripId: integer("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  payerId: integer("payer_id")
    .notNull()
    .references(() => participants.id),
  description: text("description").notNull(),
  amountCents: integer("amount_cents").notNull(),
  spentOn: text("spent_on").notNull(),
  createdBy: integer("created_by").references(() => participants.id),
  createdAt: createdAt(),
});

export const expenseShares = sqliteTable(
  "expense_shares",
  {
    expenseId: integer("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    participantId: integer("participant_id")
      .notNull()
      .references(() => participants.id),
  },
  (t) => [primaryKey({ columns: [t.expenseId, t.participantId] })],
);

export const settlements = sqliteTable("settlements", {
  id: id(),
  tripId: integer("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  fromId: integer("from_id")
    .notNull()
    .references(() => participants.id),
  toId: integer("to_id")
    .notNull()
    .references(() => participants.id),
  amountCents: integer("amount_cents").notNull(),
  createdAt: createdAt(),
});

export type Trip = typeof trips.$inferSelect;
export type PaymentGroup = typeof paymentGroups.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Settlement = typeof settlements.$inferSelect;
