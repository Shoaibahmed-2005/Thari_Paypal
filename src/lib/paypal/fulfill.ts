import { splitPayout, usdCentsToInr } from "@/lib/money";
import { transitionListing, transitionOrder, type ListingStatus, type OrderStatus } from "@/lib/fsm";

/**
 * BUILD_PLAN 11.6: the one idempotent post-payment function. Both the capture
 * route and the webhook call it, and running it twice must change nothing.
 *
 * The dependencies are injected so the idempotency guarantee can be unit
 * tested without a database or a network (rule 9).
 */

export interface FulfillDeps {
  /**
   * Atomically claims the order: sets fulfilledAt only if it is still null,
   * and returns the number of rows changed. 1 means this call owns the work.
   */
  claimOrder(orderId: string, at: Date): Promise<number>;
  loadOrder(orderId: string): Promise<FulfillOrderRow | null>;
  markOrderPaid(orderId: string, status: OrderStatus): Promise<void>;
  markListingSold(listingId: string, status: ListingStatus): Promise<void>;
  /** Upserted on (orderId, recipient), so a rerun replaces rather than duplicates. */
  upsertPayout(row: PayoutRow): Promise<string>;
  sendPayoutBatch(batch: PayoutBatch): Promise<{ batchId: string } | null>;
  markPayoutsSent(orderId: string, batchId: string): Promise<void>;
  markPayoutsFailed(orderId: string, error: string): Promise<void>;
  /** Keyed on a deterministic id, so a rerun does not add a second one. */
  upsertNotification(n: NotificationRow): Promise<void>;
  log(action: string, detail: unknown): Promise<void>;
}

export interface FulfillOrderRow {
  id: string;
  status: OrderStatus;
  listingId: string;
  itemUsdCents: number;
  listing: {
    status: ListingStatus;
    title: string | null;
    titleNative: string | null;
    lang: string;
    weaverId: string;
    weaver: { paypalEmail: string | null };
    coop: { paypalEmail: string; commissionPct: number } | null;
  };
}

export interface PayoutRow {
  orderId: string;
  recipient: "WEAVER" | "COOP";
  receiverEmail: string;
  amountUsdCents: number;
}

export interface PayoutBatch {
  orderId: string;
  items: { payoutId: string; receiverEmail: string; amountUsdCents: number; note: string }[];
}

export interface NotificationRow {
  id: string;
  userId: string;
  kind: string;
  lang: string;
  textNative: string;
  textEn: string;
  orderId: string;
}

export type FulfillResult =
  | { done: true; alreadyFulfilled: true }
  | { done: true; alreadyFulfilled: false; payoutsSent: boolean }
  | { done: false; reason: string };

export async function fulfillOrder(
  orderId: string,
  deps: FulfillDeps,
  fxInrPerUsd: number,
  now: Date = new Date(),
): Promise<FulfillResult> {
  // 1. Claim it. Anything after this point runs exactly once per order.
  const claimed = await deps.claimOrder(orderId, now);
  if (claimed === 0) {
    await deps.log("fulfillOrder.skipped", { orderId, reason: "already fulfilled" });
    return { done: true, alreadyFulfilled: true };
  }

  const order = await deps.loadOrder(orderId);
  if (!order) return { done: false, reason: "order not found" };

  // 2. Order -> PAID, listing -> SOLD, both through the state machine.
  if (order.status !== "PAID") {
    await deps.markOrderPaid(orderId, transitionOrder(order.status, "PAID"));
  }
  if (order.listing.status !== "SOLD") {
    await deps.markListingSold(order.listingId, transitionListing(order.listing.status, "SOLD"));
  }
  await deps.log("fulfillOrder.paid", { orderId, listingId: order.listingId });

  // 3. Split and pay out. Each step below is independently retryable: a
  //    failure here leaves the order PAID and the payouts marked FAILED,
  //    which the co-op dashboard can retry (11.4).
  const commissionPct = order.listing.coop?.commissionPct ?? 0;
  const split = splitPayout(order.itemUsdCents, commissionPct);
  const weaverEmail = order.listing.weaver.paypalEmail;
  const coopEmail = order.listing.coop?.paypalEmail;

  let payoutsSent = false;
  if (!weaverEmail) {
    await deps.log("fulfillOrder.payoutSkipped", { orderId, reason: "weaver has no PayPal email" });
  } else {
    const rows: PayoutRow[] = [
      { orderId, recipient: "WEAVER", receiverEmail: weaverEmail, amountUsdCents: split.weaverUsdCents },
    ];
    if (coopEmail && split.coopUsdCents > 0) {
      rows.push({ orderId, recipient: "COOP", receiverEmail: coopEmail, amountUsdCents: split.coopUsdCents });
    }

    const items = [];
    for (const r of rows) {
      const payoutId = await deps.upsertPayout(r);
      items.push({
        payoutId,
        receiverEmail: r.receiverEmail,
        amountUsdCents: r.amountUsdCents,
        note: `Thari sale ${order.listing.title ?? ""}`.trim().slice(0, 150),
      });
    }

    try {
      const batch = await deps.sendPayoutBatch({ orderId, items });
      if (batch) {
        await deps.markPayoutsSent(orderId, batch.batchId);
        payoutsSent = true;
        await deps.log("fulfillOrder.payoutsSent", { orderId, batchId: batch.batchId, split });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await deps.markPayoutsFailed(orderId, message);
      await deps.log("fulfillOrder.payoutsFailed", { orderId, error: message });
    }
  }

  // 4. Tell the weaver, in her language. Template, never AI (10.4).
  const weaverInr = usdCentsToInr(split.weaverUsdCents, fxInrPerUsd);
  await deps.upsertNotification({
    id: `notif-sold-${orderId}`,
    userId: order.listing.weaverId,
    kind: "SOLD",
    lang: order.listing.lang,
    textNative: soldTextNative(order.listing.lang, order.listing.titleNative ?? order.listing.title ?? "", weaverInr),
    textEn: `Your ${order.listing.title ?? "piece"} sold. ₹${weaverInr.toLocaleString("en-IN")} is coming to you.`,
    orderId,
  });
  await deps.log("fulfillOrder.notified", { orderId, weaverInr });

  return { done: true, alreadyFulfilled: false, payoutsSent };
}

/**
 * BUILD_PLAN 10.4 gives the Tamil template verbatim. The others follow the
 * same shape in the weaver's own language; English is the fallback.
 */
export function soldTextNative(lang: string, title: string, amountInr: number): string {
  const amount = `₹${amountInr.toLocaleString("en-IN")}`;
  switch (lang) {
    case "ta":
      return `உங்கள் ${title} விற்பனையானது. ${amount} உங்களுக்கு வருகிறது.`;
    case "hi":
      return `आपकी ${title} बिक गई। ${amount} आपको मिलने वाले हैं।`;
    case "te":
      return `మీ ${title} అమ్ముడైంది. ${amount} మీకు రాబోతున్నాయి.`;
    case "bn":
      return `আপনার ${title} বিক্রি হয়েছে। ${amount} আপনার কাছে আসছে।`;
    default:
      return `Your ${title} sold. ${amount} is coming to you.`;
  }
}
