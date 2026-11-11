import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCoopAdmin } from "@/lib/coop";
import { PayPalError, isPayPalConfigured } from "@/lib/paypal/client";
import { refundCapture } from "@/lib/paypal/orders";
import { TransitionError, transitionListing, transitionOrder, type ListingStatus, type OrderStatus } from "@/lib/fsm";

/**
 * BUILD_PLAN 11.9: full refund of a capture, co-op only.
 *
 * The piece goes back on sale unless the co-op says otherwise. Payouts that
 * already went out are NOT clawed back automatically — that is out of scope
 * and listed in the README limitations — so the response says plainly when
 * money needs recovering by hand.
 */
const Body = z.object({ relist: z.boolean().default(true) });

export async function POST(req: NextRequest, { params }: RouteContext<"/api/refunds/[orderId]">) {
  const admin = await getCoopAdmin();
  if (!admin) return NextResponse.json({ error: "Only the co-op can refund an order." }, { status: 403 });
  if (!isPayPalConfigured()) {
    return NextResponse.json({ error: "PayPal isn't configured on this server yet." }, { status: 503 });
  }

  const { orderId } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  const relist = parsed.success ? parsed.data.relist : true;

  const { getDb } = await import("@/lib/db");
  const db = getDb();

  const order = await db.order.findUnique({ where: { id: orderId }, include: { listing: true, payouts: true } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.status === "REFUNDED") return NextResponse.json({ orderId, alreadyRefunded: true });
  if (!order.captureId) {
    return NextResponse.json({ error: "This order was never captured, so there is nothing to refund." }, { status: 409 });
  }

  let nextStatus: OrderStatus;
  try {
    nextStatus = transitionOrder(order.status as OrderStatus, "REFUNDED");
  } catch (err) {
    if (err instanceof TransitionError) return NextResponse.json({ error: err.message }, { status: 409 });
    throw err;
  }

  try {
    await refundCapture(order.captureId, order.id);
  } catch (err) {
    const e = err as PayPalError;
    console.error("[thari] refund failed", { debugId: e?.debugId, name: e?.payPalName });
    return NextResponse.json(
      { error: e?.message ?? "The refund could not be completed.", debugId: e?.debugId },
      { status: 502 },
    );
  }

  await db.order.update({ where: { id: order.id }, data: { status: nextStatus, refundedAt: new Date() } });

  if (relist && order.listing.status === "SOLD") {
    await db.listing.update({
      where: { id: order.listingId },
      data: { status: transitionListing(order.listing.status as ListingStatus, "LIVE") },
    });
  }

  const payoutsAlreadySent = order.payouts.some((p) => p.status === "SENT" || p.status === "SUCCEEDED");
  await db.agentLog.create({
    data: { actor: "coop", action: "order.refunded", orderId: order.id, detail: { by: admin.name, relist } },
  });

  return NextResponse.json({
    orderId: order.id,
    status: nextStatus,
    relisted: relist,
    // Said plainly rather than hidden: the money has already left.
    recoverPayoutsManually: payoutsAlreadySent,
  });
}
