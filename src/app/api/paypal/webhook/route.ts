import { NextResponse, type NextRequest } from "next/server";
import { fulfillOrderWithDb } from "@/lib/paypal/deps";
import {
  ourOrderIdFromCapture,
  payoutIdFromItem,
  payoutStatusFor,
  readWebhookHeaders,
  verifyWebhookSignature,
  type PayPalEvent,
} from "@/lib/paypal/webhook";
import { transitionOrder, TransitionError, type OrderStatus } from "@/lib/fsm";

/**
 * BUILD_PLAN 11.7: PayPal telling us what happened after the browser has gone.
 *
 * Three rules, in order:
 *  1. Verify the signature. The endpoint is public; an unverified body is just
 *     a stranger claiming someone got paid.
 *  2. Record the event by its id and stop if it is already processed. PayPal
 *     retries, and a retry must not pay anyone twice.
 *  3. Answer 200 quickly and never throw on an event type we don't handle.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();

  let event: PayPalEvent;
  try {
    event = JSON.parse(raw) as PayPalEvent;
  } catch {
    return NextResponse.json({ error: "not JSON" }, { status: 400 });
  }
  if (!event?.id || !event?.event_type) {
    return NextResponse.json({ error: "not a PayPal event" }, { status: 400 });
  }

  const verified = await verifyWebhookSignature(readWebhookHeaders(req.headers), event);
  if (!verified) {
    console.warn("[thari] rejected an unverified webhook", { id: event.id, type: event.event_type });
    return NextResponse.json({ error: "signature not verified" }, { status: 400 });
  }

  const { getDb } = await import("@/lib/db");
  const db = getDb();

  // Claim the event atomically: createMany with skipDuplicates tells us
  // whether this delivery is the first one for this event id.
  const claimed = await db.webhookEvent.createMany({
    data: [{ id: event.id, type: event.event_type, payload: event as object }],
    skipDuplicates: true,
  });
  if (claimed.count === 0) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    await handle(event, db);
  } catch (err) {
    // Leave processedAt null so a PayPal retry gets another go at it, but
    // still answer 200: a 500 here just makes PayPal hammer us.
    console.error("[thari] webhook handling failed", { id: event.id, type: event.event_type, err });
    return NextResponse.json({ ok: true, handled: false });
  }

  await db.webhookEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
  return NextResponse.json({ ok: true });
}

type Db = Awaited<ReturnType<typeof import("@/lib/db").getDb>>;

async function handle(event: PayPalEvent, db: Db): Promise<void> {
  switch (event.event_type) {
    case "PAYMENT.CAPTURE.COMPLETED": {
      const orderId = ourOrderIdFromCapture(event.resource);
      if (!orderId) return;
      // The same idempotent function the capture route calls, so whichever
      // arrives first does the work and the other is a no-op.
      await fulfillOrderWithDb(orderId);
      return;
    }

    case "PAYMENT.CAPTURE.DENIED": {
      const orderId = ourOrderIdFromCapture(event.resource);
      if (!orderId) return;
      const order = await db.order.findUnique({ where: { id: orderId } });
      if (!order || order.status !== "CREATED") return;
      await db.order.update({ where: { id: orderId }, data: { status: "FAILED" } });
      return;
    }

    case "PAYMENT.CAPTURE.REFUNDED": {
      const orderId = ourOrderIdFromCapture(event.resource);
      if (!orderId) return;
      const order = await db.order.findUnique({ where: { id: orderId } });
      if (!order || order.status === "REFUNDED") return;
      try {
        const status = transitionOrder(order.status as OrderStatus, "REFUNDED");
        await db.order.update({ where: { id: orderId }, data: { status, refundedAt: new Date() } });
      } catch (err) {
        if (!(err instanceof TransitionError)) throw err;
      }
      return;
    }

    case "PAYMENT.PAYOUTS-ITEM.SUCCEEDED":
    case "PAYMENT.PAYOUTS-ITEM.FAILED":
    case "PAYMENT.PAYOUTS-ITEM.UNCLAIMED": {
      const payoutId = payoutIdFromItem(event.resource);
      const status = payoutStatusFor(event.event_type);
      if (!payoutId || !status) return;
      const errors = (event.resource?.errors as { name?: string; message?: string } | undefined) ?? undefined;
      await db.payout.updateMany({
        where: { id: payoutId },
        data: {
          status,
          error:
            status === "FAILED"
              ? (errors?.name ?? event.event_type.replace("PAYMENT.PAYOUTS-ITEM.", "")).slice(0, 500)
              : null,
        },
      });
      return;
    }

    case "PAYMENT.PAYOUTSBATCH.DENIED": {
      const batchId = (event.resource?.batch_header as { payout_batch_id?: string } | undefined)?.payout_batch_id;
      if (!batchId) return;
      await db.payout.updateMany({
        where: { paypalBatchId: batchId },
        data: { status: "FAILED", error: "Batch denied by PayPal" },
      });
      return;
    }

    // CHECKOUT.ORDER.APPROVED and PAYOUTSBATCH.SUCCESS are recorded for the
    // audit trail; the capture route and the item-level events do the work.
    default:
      return;
  }
}
