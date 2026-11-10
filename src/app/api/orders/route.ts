import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { PayPalError, PayPalNotConfiguredError, isPayPalConfigured } from "@/lib/paypal/client";
import { createPayPalOrder } from "@/lib/paypal/orders";
import { getCurrentUser } from "@/lib/session";

/**
 * BUILD_PLAN 11.2. The browser never sends an amount: the price comes from the
 * database and the total is computed here (rule 4).
 */
const Body = z.object({
  listingId: z.string().min(1),
  channel: z.enum(["WEB", "ASSISTANT", "MCP"]).default("WEB"),
});

export async function POST(req: NextRequest) {
  if (!isPayPalConfigured()) {
    return NextResponse.json(
      { error: "PayPal isn't configured on this server yet.", kind: "not-configured" },
      { status: 503 },
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request", issues: parsed.error.issues }, { status: 400 });
  }

  const { getDb } = await import("@/lib/db");
  const db = getDb();

  const listing = await db.listing.findUnique({
    where: { id: parsed.data.listingId },
    include: { photos: { orderBy: { position: "asc" }, take: 1 } },
  });
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (listing.status !== "LIVE") {
    return NextResponse.json({ error: "This piece was just sold." }, { status: 409 });
  }
  if (listing.priceUsdCents == null) {
    return NextResponse.json({ error: "This piece has no price yet." }, { status: 409 });
  }

  const itemUsdCents = listing.priceUsdCents;
  const shippingUsdCents = Math.round(env.SHIPPING_USD * 100);
  const session = await getCurrentUser();

  // Our row first, so the PayPal order can carry our id as custom_id and the
  // request id is derived from something we own.
  const order = await db.order.create({
    data: {
      listingId: listing.id,
      buyerId: session?.role === "BUYER" ? session.userId : null,
      status: "CREATED",
      channel: parsed.data.channel,
      paypalOrderId: `pending-${crypto.randomUUID()}`,
      itemUsdCents,
      shippingUsdCents,
      totalUsdCents: itemUsdCents + shippingUsdCents,
    },
  });

  // Only absolute https URLs are usable by PayPal; our seeded photos are
  // relative paths and data URLs are not fetchable, so send neither.
  const photo = listing.photos[0]?.url;
  const imageUrl =
    photo && !photo.startsWith("data:") && env.APP_URL.startsWith("https://")
      ? new URL(photo, env.APP_URL).toString()
      : null;

  try {
    const pp = await createPayPalOrder({
      ourOrderId: order.id,
      listingId: listing.id,
      title: listing.title ?? "Handwoven piece",
      itemUsdCents,
      shippingUsdCents,
      imageUrl,
    });

    await db.order.update({ where: { id: order.id }, data: { paypalOrderId: pp.id } });
    return NextResponse.json({ paypalOrderId: pp.id, orderId: order.id });
  } catch (err) {
    await db.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
    if (err instanceof PayPalNotConfiguredError) {
      return NextResponse.json({ error: err.message, kind: "not-configured" }, { status: 503 });
    }
    const e = err as PayPalError;
    console.error("[thari] createPayPalOrder failed", { debugId: e?.debugId, name: e?.payPalName });
    return NextResponse.json(
      { error: "We couldn't start the payment. Please try again.", debugId: e?.debugId },
      { status: 502 },
    );
  }
}
