import { NextResponse, type NextRequest } from "next/server";
import { retryPayouts } from "@/lib/paypal/retry";
import { getCurrentUser } from "@/lib/session";

/**
 * BUILD_PLAN 11.4: "mark FAILED with the error, keep the order PAID, show
 * 'Payout pending' and a Retry button." This is that button's endpoint; the
 * co-op dashboard will call it in Phase 4.
 *
 * It lives under /api/payouts rather than /api/orders because Next forbids
 * two different dynamic slug names at the same path level, and the capture
 * route next door is keyed by the PayPal order id, not ours.
 *
 * Co-op only: it moves money.
 */
export async function POST(_req: NextRequest, { params }: RouteContext<"/api/payouts/[orderId]/retry">) {
  const user = await getCurrentUser();
  if (!user || user.role !== "COOP_ADMIN") {
    return NextResponse.json({ error: "Only the co-op can retry a payout." }, { status: 403 });
  }

  const { orderId } = await params;
  const result = await retryPayouts(orderId);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
