import { describe, expect, it } from "vitest";
import { formatCents, parseAmountToCents } from "./money";
import { computeBalances, simplifyDebts, splitCents } from "./settlement";

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

describe("money helpers", () => {
  it("formats cents as dollars", () => {
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(5)).toBe("$0.05");
    expect(formatCents(123456)).toBe("$1,234.56");
    expect(formatCents(-7350)).toBe("-$73.50");
  });

  it("parses valid amounts", () => {
    expect(parseAmountToCents("43.72")).toBe(4372);
    expect(parseAmountToCents("$1,200")).toBe(120000);
    expect(parseAmountToCents("5")).toBe(500);
    expect(parseAmountToCents("0.5")).toBe(50);
  });

  it("rejects invalid amounts", () => {
    expect(parseAmountToCents("")).toBeNull();
    expect(parseAmountToCents("0")).toBeNull();
    expect(parseAmountToCents("-5")).toBeNull();
    expect(parseAmountToCents("1.234")).toBeNull();
    expect(parseAmountToCents("abc")).toBeNull();
  });

  it("caps amounts at $1,000,000", () => {
    expect(parseAmountToCents("1000000")).toBe(100_000_000);
    expect(parseAmountToCents("1000000.01")).toBeNull();
    expect(parseAmountToCents("99999999999")).toBeNull();
  });
});
