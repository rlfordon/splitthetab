export const SUPPORTED_CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "KRW", name: "South Korean Won" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "INR", name: "Indian Rupee" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "DKK", name: "Danish Krone" },
  { code: "PLN", name: "Polish Zloty" },
  { code: "CZK", name: "Czech Koruna" },
  { code: "THB", name: "Thai Baht" },
  { code: "VND", name: "Vietnamese Dong" },
  { code: "ZAR", name: "South African Rand" },
] as const;

export const DEFAULT_CURRENCY = "USD";

export function isSupportedCurrency(code: string): boolean {
  return SUPPORTED_CURRENCIES.some((c) => c.code === code);
}

/** Number of decimal places the currency uses (2 for USD, 0 for JPY, ...). */
export function minorUnitDigits(currency: string): number {
  return (
    new Intl.NumberFormat("en-US", { style: "currency", currency }).resolvedOptions()
      .maximumFractionDigits ?? 2
  );
}

/** The currency's symbol as shown to the user ("$", "€", "¥", ...). */
export function currencySymbol(currency: string): string {
  const parts = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).formatToParts(0);
  return parts.find((p) => p.type === "currency")?.value ?? currency;
}

/** Format an amount stored in minor units (cents, yen, ...) for display. */
export function formatMoney(minorUnits: number, currency: string): string {
  const factor = 10 ** minorUnitDigits(currency);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).format(minorUnits / factor);
}

// Sanity cap (1,000,000.00 in a 2-decimal currency) that also keeps stored
// values well inside Postgres int4.
export const MAX_AMOUNT_MINOR = 100_000_000;

/**
 * Parse a user-entered amount like "43.72", "$1,200", "5" into the
 * currency's minor units. Zero-decimal currencies accept whole numbers only.
 */
export function parseAmountToMinor(input: string, currency: string): number | null {
  const digits = minorUnitDigits(currency);
  const cleaned = input.trim().replace(/[$€£¥₹₩,\s]/g, "");
  const pattern =
    digits === 0 ? /^\d+$/ : new RegExp(`^\\d+(\\.\\d{1,${digits}})?$`);
  if (!pattern.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const factor = 10 ** digits;
  const minor =
    parseInt(whole, 10) * factor +
    (digits === 0 ? 0 : parseInt(frac.padEnd(digits, "0") || "0", 10));
  return minor > 0 && minor <= MAX_AMOUNT_MINOR ? minor : null;
}

/** Amount in minor units → plain input-field string ("43.72", "1000"). */
export function minorToInputString(minorUnits: number, currency: string): string {
  const digits = minorUnitDigits(currency);
  if (digits === 0) return String(minorUnits);
  const factor = 10 ** digits;
  const whole = Math.floor(minorUnits / factor);
  const frac = minorUnits % factor;
  return `${whole}.${frac.toString().padStart(digits, "0")}`;
}
