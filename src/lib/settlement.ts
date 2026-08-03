export interface ExpenseInput {
  payerId: number;
  amountCents: number;
  sharerIds: number[];
}

export interface SettlementInput {
  fromId: number;
  toId: number;
  amountCents: number;
}

export interface Payment {
  fromId: number;
  toId: number;
  amountCents: number;
}

/**
 * Split an amount equally among sharers, cent-exact. The remainder cents go
 * one each to the sharers with the lowest ids, so splits are deterministic
 * and always sum to exactly the total.
 */
export function splitCents(amountCents: number, sharerIds: number[]): Map<number, number> {
  if (sharerIds.length === 0) throw new Error("cannot split among zero sharers");
  const sorted = [...sharerIds].sort((a, b) => a - b);
  const base = Math.floor(amountCents / sorted.length);
  const remainder = amountCents % sorted.length;
  const shares = new Map<number, number>();
  sorted.forEach((id, i) => {
    shares.set(id, base + (i < remainder ? 1 : 0));
  });
  return shares;
}

/**
 * Net balance per participant in cents.
 * Positive = the group owes them; negative = they owe the group.
 * Balances always sum to zero.
 */
export function computeBalances(
  participantIds: number[],
  expenses: ExpenseInput[],
  settlements: SettlementInput[],
): Map<number, number> {
  const balances = new Map<number, number>(participantIds.map((id) => [id, 0]));
  const add = (id: number, delta: number) => {
    balances.set(id, (balances.get(id) ?? 0) + delta);
  };

  for (const e of expenses) {
    add(e.payerId, e.amountCents);
    for (const [sharerId, share] of splitCents(e.amountCents, e.sharerIds)) {
      add(sharerId, -share);
    }
  }
  for (const s of settlements) {
    add(s.fromId, s.amountCents);
    add(s.toId, -s.amountCents);
  }
  return balances;
}

/**
 * Greedy debt simplification: repeatedly match the largest debtor with the
 * largest creditor. Produces at most n-1 payments that zero every balance.
 */
export function simplifyDebts(balances: Map<number, number>): Payment[] {
  const debtors: { id: number; amount: number }[] = [];
  const creditors: { id: number; amount: number }[] = [];
  for (const [id, balance] of balances) {
    if (balance < 0) debtors.push({ id, amount: -balance });
    else if (balance > 0) creditors.push({ id, amount: balance });
  }
  // Sort descending, ties broken by id for determinism.
  const byAmount = (a: { id: number; amount: number }, b: { id: number; amount: number }) =>
    b.amount - a.amount || a.id - b.id;
  debtors.sort(byAmount);
  creditors.sort(byAmount);

  const payments: Payment[] = [];
  let di = 0;
  let ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const debtor = debtors[di];
    const creditor = creditors[ci];
    const amount = Math.min(debtor.amount, creditor.amount);
    payments.push({ fromId: debtor.id, toId: creditor.id, amountCents: amount });
    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount === 0) di++;
    if (creditor.amount === 0) ci++;
  }
  return payments;
}
