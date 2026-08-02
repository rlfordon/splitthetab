import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  expenses,
  expenseShares,
  participants,
  settlements,
  trips,
  type Expense,
  type Participant,
  type Settlement,
  type Trip,
} from "@/db/schema";

export interface ExpenseWithShares extends Expense {
  sharerIds: number[];
}

export interface TripData {
  trip: Trip;
  participants: Participant[];
  expenses: ExpenseWithShares[];
  settlements: Settlement[];
}

export async function getTripByCode(code: string): Promise<Trip | null> {
  const [trip] = await db
    .select()
    .from(trips)
    .where(eq(trips.code, code.toUpperCase()));
  return trip ?? null;
}

export async function getTripData(code: string): Promise<TripData | null> {
  const trip = await getTripByCode(code);
  if (!trip) return null;

  const [people, tripExpenses, tripSettlements] = await Promise.all([
    db
      .select()
      .from(participants)
      .where(eq(participants.tripId, trip.id))
      .orderBy(asc(participants.name)),
    db
      .select()
      .from(expenses)
      .where(eq(expenses.tripId, trip.id))
      .orderBy(desc(expenses.spentOn), desc(expenses.id)),
    db
      .select()
      .from(settlements)
      .where(eq(settlements.tripId, trip.id))
      .orderBy(desc(settlements.id)),
  ]);

  const shareRows =
    tripExpenses.length === 0
      ? []
      : await db
          .select()
          .from(expenseShares)
          .innerJoin(expenses, eq(expenseShares.expenseId, expenses.id))
          .where(eq(expenses.tripId, trip.id));

  const sharesByExpense = new Map<number, number[]>();
  for (const row of shareRows) {
    const list = sharesByExpense.get(row.expense_shares.expenseId) ?? [];
    list.push(row.expense_shares.participantId);
    sharesByExpense.set(row.expense_shares.expenseId, list);
  }

  return {
    trip,
    participants: people,
    expenses: tripExpenses.map((e) => ({
      ...e,
      sharerIds: sharesByExpense.get(e.id) ?? [],
    })),
    settlements: tripSettlements,
  };
}
