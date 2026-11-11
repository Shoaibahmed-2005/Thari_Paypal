import { NextResponse, type NextRequest } from "next/server";
import { captureAndFulfil } from "@/lib/paypal/capture";
import { isPayPalConfigured } from "@/lib/paypal/client";

/**
 * The `return_url` we give PayPal when creating an order (BUILD_PLAN 11.2).
 *
 * The v6 SDK usually keeps the buyer in the popup and calls `onApprove` in the
 * opener, which posts to /api/orders/[id]/capture. But when the popup is a
 * separate browser window, PayPal falls back to redirecting the buyer here
 * instead — and this route did not exist, so a real approved payment landed on
 * a 404 and was never captured. Found the hard way during sandbox testing.
 *
 * `token` is the PayPal order id. Capturing is idempotent, so it is safe if
 * `onApprove` also fired.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/", req.nextUrl.origin));

  if (!isPayPalConfigured()) {
    return NextResponse.redirect(new URL("/?checkout=unavailable", req.nextUrl.origin));
  }

  const result = await captureAndFulfil(token);
  const origin = req.nextUrl.origin;

  switch (result.kind) {
    case "ok":
    case "already-paid":
    case "pending":
      return NextResponse.redirect(new URL(`/checkout/success/${result.orderId}`, origin));
    case "sold-elsewhere":
      return NextResponse.redirect(new URL("/explore?sold=1", origin));
    case "not-found":
      return NextResponse.redirect(new URL("/", origin));
    case "failed":
      return NextResponse.redirect(new URL(`/checkout/success/${result.orderId}?payment=failed`, origin));
  }
}
