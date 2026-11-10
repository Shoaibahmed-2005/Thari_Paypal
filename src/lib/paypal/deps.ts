import { env } from "@/lib/env";
import { isPayPalConfigured } from "./client";
import { sendPayoutBatch } from "./orders";
import { fulfillOrder, type FulfillDeps, type FulfillResult } from "./fulfill";

/**
 * The real, database-backed dependencies for `fulfillOrder` (BUILD_PLAN 11.6).
 * The pure logic and its idempotency guarantee live in fulfill.ts and are unit
 * tested; this file is only the wiring.
 */
export async function fulfillOrderWithDb(orderId: string): Promise<FulfillResult> {
  const { getDb } = await import("@/lib/db");
  const db = getDb();

  const deps: FulfillDeps = {
    // The whole idempotency guarantee rests on this one atomic write:
    // fulfilledAt is only set if it is still null, and the row count tells us
    // whether this call is the one that owns the work.
    async claimOrder(id, at) {
      const res = await db.order.updateMany({
        where: { id, fulfilledAt: null },
        data: { fulfilledAt: at },
      });
      return res.count;
    },

    async loadOrder(id) {
      const o = await db.order.findUnique({
        where: { id },
        include: { listing: { include: { weaver: { include: { coop: true } } } } },
      });
      if (!o) return null;
      return {
        id: o.id,
        status: o.status,
        listingId: o.listingId,
        itemUsdCents: o.itemUsdCents,
        listing: {
          status: o.listing.status,
          title: o.listing.title,
          titleNative: o.listing.titleNative,
          lang: o.listing.lang,
          weaverId: o.listing.weaverId,
          weaver: { paypalEmail: o.listing.weaver.paypalEmail },
          coop: o.listing.weaver.coop
            ? {
                paypalEmail: o.listing.weaver.coop.paypalEmail,
                commissionPct: o.listing.weaver.coop.commissionPct,
              }
            : null,
        },
      };
    },

    async markOrderPaid(id, status) {
      await db.order.update({ where: { id }, data: { status } });
    },

    async markListingSold(id, status) {
      await db.listing.update({ where: { id }, data: { status } });
    },

    async upsertPayout(row) {
      const saved = await db.payout.upsert({
        where: { orderId_recipient: { orderId: row.orderId, recipient: row.recipient } },
        update: { receiverEmail: row.receiverEmail, amountUsdCents: row.amountUsdCents },
        create: {
          orderId: row.orderId,
          recipient: row.recipient,
          receiverEmail: row.receiverEmail,
          amountUsdCents: row.amountUsdCents,
        },
      });
      return saved.id;
    },

    async sendPayoutBatch(batch) {
      // Without credentials the rows stay PENDING rather than pretending to pay.
      if (!isPayPalConfigured()) {
        console.warn("[thari] PayPal not configured; payouts left pending for order", batch.orderId);
        return null;
      }
      return sendPayoutBatch(batch.orderId, batch.items);
    },

    async markPayoutsSent(orderId, batchId) {
      await db.payout.updateMany({
        where: { orderId },
        data: { status: "SENT", paypalBatchId: batchId, error: null },
      });
    },

    async markPayoutsFailed(orderId, error) {
      await db.payout.updateMany({
        where: { orderId },
        data: { status: "FAILED", error: error.slice(0, 500) },
      });
    },

    async upsertNotification(n) {
      await db.notification.upsert({
        where: { id: n.id },
        update: {},
        create: {
          id: n.id,
          userId: n.userId,
          kind: n.kind,
          lang: n.lang,
          textNative: n.textNative,
          textEn: n.textEn,
          orderId: n.orderId,
        },
      });
    },

    async log(action, detail) {
      try {
        await db.agentLog.create({
          data: { actor: "system", action, orderId: String((detail as { orderId?: string })?.orderId ?? ""), detail: detail as object },
        });
      } catch (err) {
        console.error("[thari] AgentLog write failed", err);
      }
    },
  };

  return fulfillOrder(orderId, deps, env.FX_INR_PER_USD);
}
