import { describe, expect, it } from "vitest";
import { buildEntities } from "./entities";
import {
  currencySymbol,
  formatMoney,
  minorToInputString,
  minorUnitDigits,
  parseAmountToMinor,
} from "./money";
import {
  aggregateBalances,
  computeBalances,
  simplifyDebts,
  splitCents,
} from "./settlement";

describe("splitCents", () => {
  it("splits evenly when divisible", () => {
    const shares = splitCents(3000, [1, 2, 3]);
    expect([...shares.values()]).toEqual([1000, 1000, 1000]);
  });

  it("distributes remainder cents deterministically to lowest ids", () => {
    const shares = splitCents(1000, [3, 1, 2]);
    expect(shares.get(1)).toBe(334);
    expect(shares.get(2)).toBe(333);
    expect(shares.get(3)).toBe(333);
  });

  it("always sums exactly to the total", () => {
    for (let amount = 1; amount < 500; amount += 7) {
      for (let n = 1; n <= 9; n++) {
        const ids = Array.from({ length: n }, (_, i) => i + 1);
        const total = [...splitCents(amount, ids).values()].reduce((a, b) => a + b, 0);
        expect(total).toBe(amount);
      }
    }
  });

  it("throws on zero sharers", () => {
    expect(() => splitCents(100, [])).toThrow();
  });
});

describe("computeBalances", () => {
  it("credits the payer and debits the sharers", () => {
    // Alice (1) pays $30, split among Alice, Bob (2), Carol (3).
    const balances = computeBalances(
      [1, 2, 3],
      [{ payerId: 1, amountCents: 3000, sharerIds: [1, 2, 3] }],
      [],
    );
    expect(balances.get(1)).toBe(2000);
    expect(balances.get(2)).toBe(-1000);
    expect(balances.get(3)).toBe(-1000);
  });

  it("handles a payer who is not a sharer", () => {
    const balances = computeBalances(
      [1, 2],
      [{ payerId: 1, amountCents: 500, sharerIds: [2] }],
      [],
    );
    expect(balances.get(1)).toBe(500);
    expect(balances.get(2)).toBe(-500);
  });

  it("applies recorded settlements against balances", () => {
    const balances = computeBalances(
      [1, 2],
      [{ payerId: 1, amountCents: 1000, sharerIds: [1, 2] }],
      [{ fromId: 2, toId: 1, amountCents: 500 }],
    );
    expect(balances.get(1)).toBe(0);
    expect(balances.get(2)).toBe(0);
  });

  it("always sums to zero", () => {
    const balances = computeBalances(
      [1, 2, 3, 4],
      [
        { payerId: 1, amountCents: 8599, sharerIds: [1, 2, 3] },
        { payerId: 2, amountCents: 1234, sharerIds: [3, 4] },
        { payerId: 3, amountCents: 999, sharerIds: [1, 2, 3, 4] },
      ],
      [{ fromId: 4, toId: 1, amountCents: 250 }],
    );
    const sum = [...balances.values()].reduce((a, b) => a + b, 0);
    expect(sum).toBe(0);
  });
});

describe("simplifyDebts", () => {
  it("returns no payments when everyone is settled", () => {
    expect(simplifyDebts(new Map([[1, 0], [2, 0]]))).toEqual([]);
  });

  it("produces payments that zero every balance", () => {
    const balances = computeBalances(
      [1, 2, 3, 4],
      [
        { payerId: 1, amountCents: 10000, sharerIds: [1, 2, 3, 4] },
        { payerId: 2, amountCents: 6001, sharerIds: [2, 3] },
        { payerId: 3, amountCents: 333, sharerIds: [1, 4] },
      ],
      [],
    );
    const payments = simplifyDebts(balances);
    const after = new Map(balances);
    for (const p of payments) {
      after.set(p.fromId, after.get(p.fromId)! + p.amountCents);
      after.set(p.toId, after.get(p.toId)! - p.amountCents);
    }
    for (const v of after.values()) expect(v).toBe(0);
  });

  it("uses at most n-1 payments", () => {
    const balances = new Map([
      [1, 500],
      [2, -200],
      [3, -100],
      [4, -300],
      [5, 100],
    ]);
    expect(simplifyDebts(balances).length).toBeLessThanOrEqual(4);
  });

  it("matches largest debtor with largest creditor first", () => {
    const balances = new Map([
      [1, 700],
      [2, -700],
      [3, 300],
      [4, -300],
    ]);
    expect(simplifyDebts(balances)).toEqual([
      { fromId: 2, toId: 1, amountCents: 700 },
      { fromId: 4, toId: 3, amountCents: 300 },
    ]);
  });
});

describe("payment groups", () => {
  // Trip: Alex(1) & Sam(2) are a couple; Jordan(3) is solo.
  const people = [
    { id: 1, tripId: 1, name: "Alex", paymentGroupId: 10 },
    { id: 2, tripId: 1, name: "Sam", paymentGroupId: 10 },
    { id: 3, tripId: 1, name: "Jordan", paymentGroupId: null },
  ];
  const groups = [{ id: 10, tripId: 1, name: "Alex & Sam" }];

  it("builds entities: one wallet per group plus solo participants", () => {
    const { entities, entityOf, walletNameOf } = buildEntities(people, groups);
    expect(entities.map((e) => e.key)).toEqual(["g:10", "p:3"]);
    expect(entityOf(1)).toBe("g:10");
    expect(entityOf(2)).toBe("g:10");
    expect(entityOf(3)).toBe("p:3");
    expect(walletNameOf(2)).toBe("Alex & Sam");
    expect(walletNameOf(3)).toBe("Jordan");
  });

  it("uses the lowest member id as the representative", () => {
    const { byKey } = buildEntities(people, groups);
    expect(byKey.get("g:10")!.representativeId).toBe(1);
  });

  it("pools member balances into the group wallet", () => {
    // Alex pays $90 dinner for all three: Alex +60, Sam -30, Jordan -30.
    const personBalances = computeBalances(
      [1, 2, 3],
      [{ payerId: 1, amountCents: 9000, sharerIds: [1, 2, 3] }],
      [],
    );
    const { entityOf } = buildEntities(people, groups);
    const pooled = aggregateBalances(personBalances, entityOf);
    // Couple's wallet: +60 - 30 = +30. Jordan: -30.
    expect(pooled.get("g:10")).toBe(3000);
    expect(pooled.get("p:3")).toBe(-3000);
  });

  it("intra-group debts vanish; settlement is between wallets", () => {
    // Sam pays $50 for just Alex & Sam — a wash inside the couple.
    const personBalances = computeBalances(
      [1, 2, 3],
      [{ payerId: 2, amountCents: 5000, sharerIds: [1, 2] }],
      [],
    );
    const { entityOf } = buildEntities(people, groups);
    const pooled = aggregateBalances(personBalances, entityOf);
    expect(pooled.get("g:10")).toBe(0);
    expect(simplifyDebts(pooled)).toEqual([]);
  });

  it("simplifyDebts works over string entity keys", () => {
    const pooled = new Map([
      ["g:10", 3000],
      ["p:3", -3000],
    ]);
    expect(simplifyDebts(pooled)).toEqual([
      { fromId: "p:3", toId: "g:10", amountCents: 3000 },
    ]);
  });

  it("empty groups are dropped and members without groups stay solo", () => {
    const { entities } = buildEntities(
      [{ id: 5, tripId: 1, name: "Riley", paymentGroupId: null }],
      [{ id: 99, tripId: 1, name: "Ghosts" }],
    );
    expect(entities.map((e) => e.key)).toEqual(["p:5"]);
  });
});

describe("money helpers", () => {
  it("formats minor units per currency", () => {
    expect(formatMoney(0, "USD")).toBe("$0.00");
    expect(formatMoney(5, "USD")).toBe("$0.05");
    expect(formatMoney(123456, "USD")).toBe("$1,234.56");
    expect(formatMoney(-7350, "USD")).toBe("-$73.50");
    expect(formatMoney(123456, "EUR")).toBe("€1,234.56");
    // JPY has no minor unit: 1234 is ¥1,234, not ¥12.34.
    expect(formatMoney(1234, "JPY")).toBe("¥1,234");
  });

  it("knows currency decimals and symbols", () => {
    expect(minorUnitDigits("USD")).toBe(2);
    expect(minorUnitDigits("JPY")).toBe(0);
    expect(currencySymbol("GBP")).toBe("£");
    expect(minorToInputString(4372, "USD")).toBe("43.72");
    expect(minorToInputString(4372, "JPY")).toBe("4372");
  });

  it("parses valid amounts", () => {
    expect(parseAmountToMinor("43.72", "USD")).toBe(4372);
    expect(parseAmountToMinor("$1,200", "USD")).toBe(120000);
    expect(parseAmountToMinor("5", "USD")).toBe(500);
    expect(parseAmountToMinor("0.5", "USD")).toBe(50);
    expect(parseAmountToMinor("4300", "JPY")).toBe(4300);
    expect(parseAmountToMinor("€9.99", "EUR")).toBe(999);
  });

  it("rejects invalid amounts", () => {
    expect(parseAmountToMinor("", "USD")).toBeNull();
    expect(parseAmountToMinor("0", "USD")).toBeNull();
    expect(parseAmountToMinor("-5", "USD")).toBeNull();
    expect(parseAmountToMinor("1.234", "USD")).toBeNull();
    expect(parseAmountToMinor("abc", "USD")).toBeNull();
    // Decimals are invalid in a zero-decimal currency.
    expect(parseAmountToMinor("43.50", "JPY")).toBeNull();
  });

  it("caps amounts at 100M minor units", () => {
    expect(parseAmountToMinor("1000000", "USD")).toBe(100_000_000);
    expect(parseAmountToMinor("1000000.01", "USD")).toBeNull();
    expect(parseAmountToMinor("99999999999", "USD")).toBeNull();
  });
});
