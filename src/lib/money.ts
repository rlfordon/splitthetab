export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const rem = abs % 100;
  return `${sign}$${dollars.toLocaleString("en-US")}.${rem.toString().padStart(2, "0")}`;
}

// $1,000,000 — sanity cap that also keeps cents well inside Postgres int4.
export const MAX_AMOUNT_CENTS = 100_000_000;

/** Parse a user-entered dollar amount like "43.72", "$1,200", "5" into cents. */
export function parseAmountToCents(input: string): number | null {
  const cleaned = input.trim().replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const cents = parseInt(whole, 10) * 100 + parseInt(frac.padEnd(2, "0") || "0", 10);
  return cents > 0 && cents <= MAX_AMOUNT_CENTS ? cents : null;
}
