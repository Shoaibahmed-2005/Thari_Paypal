import { PayPalError } from "./client";
import { fulfillOrderWithDb } from "./deps";
import { capturePayPalOrder } from "./orders";

/**
 * Capture an approved PayPal order and fulfil it (BUILD_PLAN 11.3).
 *
 * Shared by the two ways an approval can come back to us:
 *  - `onApprove` in the browser SDK, which posts to /api/orders/[id]/capture
 *  - PayPal redirecting the buyer to our `return_url`, /checkout/return
 *
 * Both paths must be safe to run twice, so everything below is idempotent:
 * an order already paid returns straight away, the capture call carries a
 * request id derived from our own order, and fulfilment goes through
 * `fulfillOrder`, which can only act once.
 */
export type CaptureOutcome =
  | { kind: "ok"; orderId: string }
  | { kind: "already-paid"; orderId: string }
  | { kind: "pending"; orderId: string }
  | { kind: "sold-elsewhere"; orderId: string }
  | { kind: "not-found" }
  | { kind: "failed"; orderId: string; message: string; payPalName?: string; debugId?: string };

export async function captureAndFulfil(paypalOrderId: string): Promise<CaptureOutcome> {
  const { getDb } = await import("@/lib/db");
  const db = getDb();

  const order = await db.order.findUnique({ where: { paypalOrderId }, include: { listing: true } });
  if (!order) return { kind: "not-found" };
  if (order.status === "PAID" || order.fulfilledAt) return { kind: "already-paid", orderId: order.id };

  // Someone else bought it while this buyer was in the PayPal window. Don't
  // take the money; the uncaptured order simply expires.
  if (order.listing.status !== "LIVE") {
    await db.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
    return { kind: "sold-elsewhere", orderId: order.id };
  }

  let capture;
  try {
    capture = await capturePayPalOrder(paypalOrderId, order.id);
  } catch (err) {
    const e = err as PayPalError;
    console.error("[thari] capture failed", { debugId: e?.debugId, name: e?.payPalName });
    await db.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
    return {
      kind: "failed",
      orderId: order.id,
      message: e?.message ?? "The payment could not be completed.",
      payPalName: e?.payPalName,
      debugId: e?.debugId,
    };
  }

  await db.order.update({
    where: { id: order.id },
    data: {
      captureId: capture.captureId,
      payerEmail: capture.payerEmail,
      shippingAddress: (capture.shippingAddress ?? undefined) as object | undefined,
    },
  });

  // A PENDING capture is not money yet: leave it to the webhook rather than
  // paying the weaver out of a payment that may still fail.
  if (capture.captureStatus !== "COMPLETED") {
    await db.agentLog.create({
      data: {
        actor: "system",
        action: "capture.pending",
        orderId: order.id,
        detail: { captureStatus: capture.captureStatus, orderStatus: capture.orderStatus },
      },
    });
    return { kind: "pending", orderId: order.id };
  }

  await fulfillOrderWithDb(order.id);
  return { kind: "ok", orderId: order.id };
}
