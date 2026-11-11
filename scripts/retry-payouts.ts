/**
 * Re-send the payouts for one order: npx tsx scripts/retry-payouts.ts <orderId>
 * Stands in for the co-op dashboard's Retry button until Phase 4 builds it.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

async function main() {
  const orderId = process.argv[2];
  if (!orderId) throw new Error("usage: tsx scripts/retry-payouts.ts <orderId>");
  const { retryPayouts } = await import("../src/lib/paypal/retry");
  const result = await retryPayouts(orderId);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
