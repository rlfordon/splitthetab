import {
  date,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("USD"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A shared wallet: members pay and settle as one (couple, family, ...).
export const paymentGroups = pgTable("payment_groups", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

export const participants = pgTable(
  "participants",
  {
    id: serial("id").primaryKey(),
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

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  payerId: integer("payer_id")
    .notNull()
    .references(() => participants.id),
  description: text("description").notNull(),
  amountCents: integer("amount_cents").notNull(),
  spentOn: date("spent_on").notNull(),
  createdBy: integer("created_by").references(() => participants.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const expenseShares = pgTable(
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

export const settlements = pgTable("settlements", {
  id: serial("id").primaryKey(),
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Trip = typeof trips.$inferSelect;
export type PaymentGroup = typeof paymentGroups.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Settlement = typeof settlements.$inferSelect;
