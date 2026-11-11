import { NextResponse, type NextRequest } from "next/server";
import { captureAndFulfil } from "@/lib/paypal/capture";
import { isPayPalConfigured } from "@/lib/paypal/client";

/**
 * BUILD_PLAN 11.3, called by the SDK's onApprove. The logic lives in
 * captureAndFulfil, shared with /checkout/return so both ways an approval can
 * reach us behave identically and are safe to run twice.
 */
export async function POST(_req: NextRequest, { params }: RouteContext<"/api/orders/[paypalOrderId]/capture">) {
  if (!isPayPalConfigured()) {
    return NextResponse.json({ error: "PayPal isn't configured on this server yet." }, { status: 503 });
  }

  const { paypalOrderId } = await params;
  const result = await captureAndFulfil(paypalOrderId);

  switch (result.kind) {
    case "ok":
      return NextResponse.json({ orderId: result.orderId });
    case "already-paid":
      return NextResponse.json({ orderId: result.orderId, alreadyPaid: true });
    case "pending":
      return NextResponse.json({ orderId: result.orderId, pending: true });
    case "sold-elsewhere":
      return NextResponse.json({ error: "This piece was just sold to someone else." }, { status: 409 });
    case "not-found":
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    case "failed":
      return NextResponse.json(
        { error: result.message, payPalName: result.payPalName, debugId: result.debugId },
        { status: 502 },
      );
  }
}
