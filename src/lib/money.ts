/** Pricing and split math. All money is integer cents (USD) or whole rupees (INR). */

/** INR price → USD cents, rounded to the nearest whole dollar (section 10.1). */
export function inrToUsdCents(priceInr: number, fxInrPerUsd: number): number {
  if (!Number.isFinite(priceInr) || priceInr < 0) throw new Error("priceInr must be >= 0");
  if (!Number.isFinite(fxInrPerUsd) || fxInrPerUsd <= 0) throw new Error("fx must be > 0");
  return Math.round(priceInr / fxInrPerUsd) * 100;
}

/** USD cents → approximate whole rupees, for weaver-facing display. */
export function usdCentsToInr(cents: number, fxInrPerUsd: number): number {
  return Math.round((cents / 100) * fxInrPerUsd);
}

export interface OrderTotals {
  itemUsdCents: number;
  shippingUsdCents: number;
  totalUsdCents: number;
}

export function orderTotals(itemUsdCents: number, shippingUsd: number): OrderTotals {
  assertCents(itemUsdCents);
  const shippingUsdCents = Math.round(shippingUsd * 100);
  assertCents(shippingUsdCents);
  return { itemUsdCents, shippingUsdCents, totalUsdCents: itemUsdCents + shippingUsdCents };
}

export interface Split {
  weaverUsdCents: number;
  coopUsdCents: number;
}

/** Co-op gets its commission (rounded), weaver gets the rest. Never loses or creates a cent. */
export function splitPayout(itemUsdCents: number, commissionPct: number): Split {
  assertCents(itemUsdCents);
  if (!Number.isInteger(commissionPct) || commissionPct < 0 || commissionPct > 100) {
    throw new Error("commissionPct must be an integer 0–100");
  }
  const coopUsdCents = Math.round((itemUsdCents * commissionPct) / 100);
  return { coopUsdCents, weaverUsdCents: itemUsdCents - coopUsdCents };
}

/** PayPal amount string with 2 decimals. */
export function centsToPaypalValue(cents: number): string {
  assertCents(cents);
  return (cents / 100).toFixed(2);
}

/** "$205" or "$184.50" for buyers. */
export function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return `$${Number.isInteger(dollars) ? dollars.toLocaleString("en-US") : dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "₹18,000" in Indian digit grouping. */
export function formatInr(rupees: number): string {
  return `₹${Math.round(rupees).toLocaleString("en-IN")}`;
}

function assertCents(n: number): void {
  if (!Number.isInteger(n) || n < 0) throw new Error(`invalid cents: ${n}`);
}
