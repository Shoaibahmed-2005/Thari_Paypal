import { NextResponse, type NextRequest } from "next/server";
import { PayPalError, isPayPalConfigured } from "@/lib/paypal/client";
import { fulfillOrderWithDb } from "@/lib/paypal/deps";
import { capturePayPalOrder } from "@/lib/paypal/orders";

/**
 * BUILD_PLAN 11.3. Idempotent at every level: an order already PAID returns
 * straight away, the capture call carries a request id derived from our order,
 * and fulfilment runs through the one function that can only act once.
 */
export async function POST(_req: NextRequest, { params }: RouteContext<"/api/orders/[paypalOrderId]/capture">) {
  if (!isPayPalConfigured()) {
    return NextResponse.json({ error: "PayPal isn't configured on this server yet." }, { status: 503 });
  }

  const { paypalOrderId } = await params;
  const { getDb } = await import("@/lib/db");
  const db = getDb();

  const order = await db.order.findUnique({
    where: { paypalOrderId },
    include: { listing: true },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Already captured: say so rather than calling PayPal again.
  if (order.status === "PAID" || order.fulfilledAt) {
    return NextResponse.json({ orderId: order.id, alreadyPaid: true });
  }

  // Someone else bought it in the meantime. Don't take the money; the
  // uncaptured PayPal order simply expires.
  if (order.listing.status !== "LIVE") {
    await db.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
    return NextResponse.json({ error: "This piece was just sold to someone else." }, { status: 409 });
  }

  let capture;
  try {
    capture = await capturePayPalOrder(paypalOrderId, order.id);
  } catch (err) {
    const e = err as PayPalError;
    console.error("[thari] capture failed", { debugId: e?.debugId, name: e?.payPalName });
    await db.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
    return NextResponse.json(
      { error: "The payment could not be completed.", payPalName: e?.payPalName, debugId: e?.debugId },
      { status: 502 },
    );
  }

  await db.order.update({
    where: { id: order.id },
    data: {
      captureId: capture.captureId,
      payerEmail: capture.payerEmail,
      shippingAddress: (capture.shippingAddress ?? undefined) as object | undefined,
    },
  });

  // A PENDING capture is not money yet: wait for PAYMENT.CAPTURE.COMPLETED
  // rather than paying the weaver out of a payment that may still fail (11.3).
  if (capture.captureStatus !== "COMPLETED") {
    await db.agentLog.create({
      data: {
        actor: "system",
        action: "capture.pending",
        orderId: order.id,
        detail: { captureStatus: capture.captureStatus, orderStatus: capture.orderStatus },
      },
    });
    return NextResponse.json({ orderId: order.id, pending: true });
  }

  const result = await fulfillOrderWithDb(order.id);
  return NextResponse.json({ orderId: order.id, fulfilled: result });
}
