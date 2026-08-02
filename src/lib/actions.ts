"use server";

import { and, eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  expenses,
  expenseShares,
  participants,
  settlements,
  trips,
} from "@/db/schema";
import { clearIdentity, getIdentity, setIdentity } from "./identity";
import { parseAmountToCents } from "./money";
import { getTripByCode } from "./queries";

// Unambiguous uppercase alphabet (no 0/O/1/I) for trip codes.
const generateCode = customAlphabet("23456789ABCDEFGHJKMNPQRSTUVWXYZ", 6);

function requireNames(raw: FormDataEntryValue | null): string[] {
  const names = String(raw ?? "")
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean);
  return [...new Set(names)];
}

export async function createTrip(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const names = requireNames(formData.get("participants"));
  if (!name || names.length < 2) {
    throw new Error("A trip needs a name and at least two people.");
  }

  const code = await db.transaction(async (tx) => {
    let tripCode = generateCode();
    // Retry on the (unlikely) chance of a code collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const [existing] = await tx.select().from(trips).where(eq(trips.code, tripCode));
      if (!existing) break;
      tripCode = generateCode();
    }
    const [trip] = await tx
      .insert(trips)
      .values({ code: tripCode, name })
      .returning();
    await tx
      .insert(participants)
      .values(names.map((n) => ({ tripId: trip.id, name: n })));
    return trip.code;
  });

  redirect(`/t/${code}`);
}

export async function joinTrip(formData: FormData) {
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
  const trip = await getTripByCode(code);
  if (!trip) redirect(`/?error=notfound&code=${encodeURIComponent(code)}`);
  redirect(`/t/${trip.code}`);
}

export async function pickName(code: string, formData: FormData) {
  const participantId = parseInt(String(formData.get("participantId") ?? ""), 10);
  const trip = await getTripByCode(code);
  if (!trip) redirect("/");
  const [person] = await db
    .select()
    .from(participants)
    .where(and(eq(participants.id, participantId), eq(participants.tripId, trip.id)));
  if (!person) throw new Error("Pick a name from the list.");
  await setIdentity(code, person.id);
  redirect(`/t/${trip.code}`);
}

export async function switchName(code: string) {
  await clearIdentity(code);
  revalidatePath(`/t/${code}`, "layout");
  redirect(`/t/${code}`);
}

export async function addParticipant(code: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const trip = await getTripByCode(code);
  if (!trip || !name) return;
  await db
    .insert(participants)
    .values({ tripId: trip.id, name })
    .onConflictDoNothing();
  revalidatePath(`/t/${code}`, "layout");
}

export async function renameParticipant(code: string, formData: FormData) {
  const id = parseInt(String(formData.get("participantId") ?? ""), 10);
  const name = String(formData.get("name") ?? "").trim();
  const trip = await getTripByCode(code);
  if (!trip || !name || !Number.isFinite(id)) return;
  await db
    .update(participants)
    .set({ name })
    .where(and(eq(participants.id, id), eq(participants.tripId, trip.id)));
  revalidatePath(`/t/${code}`, "layout");
}

interface ExpenseFields {
  payerId: number;
  description: string;
  amountCents: number;
  spentOn: string;
  sharerIds: number[];
}

async function parseExpenseForm(
  tripId: number,
  formData: FormData,
): Promise<ExpenseFields | string> {
  const description = String(formData.get("description") ?? "").trim();
  if (!description) return "Description is required.";

  const amountCents = parseAmountToCents(String(formData.get("amount") ?? ""));
  if (!amountCents) return "Enter a valid amount like 43.72.";

  const spentOn = String(formData.get("spentOn") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(spentOn)) return "Enter a valid date.";

  const payerId = parseInt(String(formData.get("payerId") ?? ""), 10);
  const sharerIds = formData
    .getAll("sharerIds")
    .map((v) => parseInt(String(v), 10))
    .filter(Number.isFinite);
  if (sharerIds.length === 0) return "Pick at least one person to chip in.";

  const tripPeople = await db
    .select({ id: participants.id })
    .from(participants)
    .where(eq(participants.tripId, tripId));
  const validIds = new Set(tripPeople.map((p) => p.id));
  if (!validIds.has(payerId)) return "Pick who paid.";
  if (sharerIds.some((id) => !validIds.has(id))) return "Invalid sharer.";

  return { payerId, description, amountCents, spentOn, sharerIds };
}

export async function createExpense(code: string, formData: FormData) {
  const trip = await getTripByCode(code);
  if (!trip) redirect("/");
  const fields = await parseExpenseForm(trip.id, formData);
  if (typeof fields === "string") {
    redirect(`/t/${code}/expense/new?error=${encodeURIComponent(fields)}`);
  }

  const createdBy = await getIdentity(code);
  await db.transaction(async (tx) => {
    const [expense] = await tx
      .insert(expenses)
      .values({
        tripId: trip.id,
        payerId: fields.payerId,
        description: fields.description,
        amountCents: fields.amountCents,
        spentOn: fields.spentOn,
        createdBy,
      })
      .returning();
    await tx.insert(expenseShares).values(
      fields.sharerIds.map((participantId) => ({
        expenseId: expense.id,
        participantId,
      })),
    );
  });

  revalidatePath(`/t/${code}`, "layout");
  redirect(`/t/${code}`);
}

export async function updateExpense(code: string, expenseId: number, formData: FormData) {
  const trip = await getTripByCode(code);
  if (!trip) redirect("/");
  const fields = await parseExpenseForm(trip.id, formData);
  if (typeof fields === "string") {
    redirect(`/t/${code}/expense/${expenseId}?error=${encodeURIComponent(fields)}`);
  }

  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(expenses)
      .set({
        payerId: fields.payerId,
        description: fields.description,
        amountCents: fields.amountCents,
        spentOn: fields.spentOn,
      })
      .where(and(eq(expenses.id, expenseId), eq(expenses.tripId, trip.id)))
      .returning();
    if (!updated) throw new Error("Expense not found.");
    await tx.delete(expenseShares).where(eq(expenseShares.expenseId, expenseId));
    await tx.insert(expenseShares).values(
      fields.sharerIds.map((participantId) => ({
        expenseId,
        participantId,
      })),
    );
  });

  revalidatePath(`/t/${code}`, "layout");
  redirect(`/t/${code}`);
}

export async function deleteExpense(code: string, expenseId: number) {
  const trip = await getTripByCode(code);
  if (!trip) redirect("/");
  await db
    .delete(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.tripId, trip.id)));
  revalidatePath(`/t/${code}`, "layout");
  redirect(`/t/${code}`);
}

export async function recordSettlement(code: string, formData: FormData) {
  const trip = await getTripByCode(code);
  if (!trip) redirect("/");

  const fromId = parseInt(String(formData.get("fromId") ?? ""), 10);
  const toId = parseInt(String(formData.get("toId") ?? ""), 10);
  const amountCents =
    parseInt(String(formData.get("amountCents") ?? ""), 10) ||
    parseAmountToCents(String(formData.get("amount") ?? "")) ||
    0;
  if (!Number.isFinite(fromId) || !Number.isFinite(toId) || fromId === toId || amountCents <= 0) {
    redirect(`/t/${code}/settle`);
  }

  const tripPeople = await db
    .select({ id: participants.id })
    .from(participants)
    .where(eq(participants.tripId, trip.id));
  const validIds = new Set(tripPeople.map((p) => p.id));
  if (!validIds.has(fromId) || !validIds.has(toId)) redirect(`/t/${code}/settle`);

  await db.insert(settlements).values({ tripId: trip.id, fromId, toId, amountCents });
  revalidatePath(`/t/${code}`, "layout");
  redirect(`/t/${code}/settle`);
}

export async function deleteSettlement(code: string, settlementId: number) {
  const trip = await getTripByCode(code);
  if (!trip) return;
  await db
    .delete(settlements)
    .where(and(eq(settlements.id, settlementId), eq(settlements.tripId, trip.id)));
  revalidatePath(`/t/${code}`, "layout");
}
