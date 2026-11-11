import { sendPayoutBatch } from "./orders";
import { isPayPalConfigured } from "./client";

/**
 * Re-send the payouts for an order whose batch failed (BUILD_PLAN 11.4).
 *
 * `fulfillOrder` is idempotent and will not run twice, which is exactly what
 * we want for the payment — but it means a payout that failed needs its own
 * way back. This is that way, and it is what the co-op dashboard's Retry
 * button will call in Phase 4.
 */
export interface RetryResult {
  ok: boolean;
  batchId?: string;
  error?: string;
  skipped?: string;
}

export async function retryPayouts(orderId: string): Promise<RetryResult> {
  if (!isPayPalConfigured()) return { ok: false, skipped: "PayPal is not configured" };

  const { getDb } = await import("@/lib/db");
  const db = getDb();

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      payouts: true,
      listing: { select: { title: true, weaver: { select: { paypalEmail: true, coop: true } } } },
    },
  });
  if (!order) return { ok: false, error: "order not found" };
  if (order.status !== "PAID" && order.status !== "SHIPPED" && order.status !== "DELIVERED") {
    return { ok: false, error: `order is ${order.status}, not paid` };
  }

  // Only the ones that still need sending; never re-pay a succeeded payout.
  const pending = order.payouts.filter((p) => p.status === "FAILED" || p.status === "PENDING");
  if (pending.length === 0) return { ok: true, skipped: "nothing to retry" };

  // Re-read the addresses rather than trusting the ones stored at the time of
  // the failure: the usual reason a payout failed is a wrong or unregistered
  // address, and the usual fix is to correct it, so a retry should use the
  // current value. (This is how we recovered from the seeded placeholder
  // addresses that PayPal rejected as RECEIVER_UNREGISTERED.)
  const current: Record<string, string | null | undefined> = {
    WEAVER: order.listing.weaver.paypalEmail,
    COOP: order.listing.weaver.coop?.paypalEmail,
  };

  const items = [];
  for (const p of pending) {
    const receiverEmail = current[p.recipient] ?? p.receiverEmail;
    if (!receiverEmail) continue;
    if (receiverEmail !== p.receiverEmail) {
      await db.payout.update({ where: { id: p.id }, data: { receiverEmail } });
    }
    items.push({
      payoutId: p.id,
      receiverEmail,
      amountUsdCents: p.amountUsdCents,
      note: `Thari sale ${order.listing.title ?? ""}`.trim().slice(0, 150),
    });
  }
  if (items.length === 0) return { ok: false, error: "no payout address on file" };

  try {
    // A new batch id per attempt, so PayPal treats the retry as a fresh batch
    // rather than rejecting it as a duplicate of the one that failed.
    const { batchId } = await sendPayoutBatch(`${orderId}-retry-${Date.now()}`, items);
    await db.payout.updateMany({
      where: { id: { in: pending.map((p) => p.id) } },
      data: { status: "SENT", paypalBatchId: batchId, error: null },
    });
    await db.agentLog.create({
      data: { actor: "system", action: "payouts.retried", orderId, detail: { batchId, count: items.length } },
    });
    return { ok: true, batchId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.payout.updateMany({
      where: { id: { in: pending.map((p) => p.id) } },
      data: { status: "FAILED", error: message.slice(0, 500) },
    });
    await db.agentLog.create({
      data: { actor: "system", action: "payouts.retryFailed", orderId, detail: { error: message } },
    });
    return { ok: false, error: message };
  }
}
