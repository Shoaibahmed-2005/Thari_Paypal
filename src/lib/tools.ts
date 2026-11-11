import { z } from "zod";
import { env } from "@/lib/env";
import { createPayPalOrder } from "@/lib/paypal/orders";
import { isPayPalConfigured } from "@/lib/paypal/client";

/**
 * The three tools an AI can use against Thari (BUILD_PLAN 12.1), defined once
 * and shared by the in-app assistant and the MCP endpoint so an outside agent
 * and our own chat get exactly the same capabilities.
 *
 * The hard rule, from section 1: an AI never pays. `create_checkout` prepares
 * a PayPal order and hands back a link; a human approves it.
 */

export const searchListingsSchema = z.object({
  query: z.string().optional().describe("free text: colour, weave, motif, weaver name"),
  fabric: z.string().optional().describe("silk, cotton, silk-cotton"),
  color: z.string().optional(),
  maxPriceUsd: z.number().positive().optional(),
  category: z.enum(["saree", "dupatta", "stole", "fabric"]).optional(),
  verifiedOnly: z.boolean().optional().describe("only pieces the co-op has confirmed as handwoven"),
});

export const getListingSchema = z.object({ id: z.string().describe("the listing id") });

export const createCheckoutSchema = z.object({ listingId: z.string() });

export type Channel = "WEB" | "ASSISTANT" | "MCP";

function absolute(path: string): string {
  return new URL(path, env.APP_URL).toString();
}

export interface ToolListing {
  id: string;
  title: string;
  weaver: string;
  town: string;
  priceUsd: number;
  verified: boolean;
  fabric: string | null;
  colors: string[];
  imageUrl: string | null;
  url: string;
}

export async function searchListings(args: z.infer<typeof searchListingsSchema>): Promise<ToolListing[]> {
  const { getDb } = await import("@/lib/db");
  const q = args.query?.trim();

  const rows = await getDb().listing.findMany({
    where: {
      status: "LIVE",
      ...(args.category ? { category: args.category } : {}),
      ...(args.fabric ? { fabric: { contains: args.fabric, mode: "insensitive" } } : {}),
      ...(args.color ? { OR: [{ colors: { has: args.color.toLowerCase() } }, { title: { contains: args.color, mode: "insensitive" } }] } : {}),
      ...(args.maxPriceUsd ? { priceUsdCents: { lte: Math.round(args.maxPriceUsd * 100) } } : {}),
      ...(args.verifiedOnly ? { loomClipUrl: { not: null }, coopConfirmedAt: { not: null } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { weave: { contains: q, mode: "insensitive" } },
              { fabric: { contains: q, mode: "insensitive" } },
              { colors: { has: q.toLowerCase() } },
              { weaver: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { priceUsdCents: "asc" },
    take: 6,
    include: { weaver: true, photos: { orderBy: { position: "asc" }, take: 1 } },
  });

  return rows.map((r) => ({
    id: r.id,
    title: r.title ?? "Handwoven piece",
    weaver: r.weaver.name,
    town: r.weaver.town ?? "",
    priceUsd: (r.priceUsdCents ?? 0) / 100,
    verified: Boolean(r.loomClipUrl && r.coopConfirmedAt),
    fabric: r.fabric,
    colors: r.colors,
    imageUrl: r.photos[0]?.url ?? null,
    url: absolute(`/p/${r.id}`),
  }));
}

export async function getListing(args: z.infer<typeof getListingSchema>) {
  const { getDb } = await import("@/lib/db");
  const l = await getDb().listing.findFirst({
    where: { id: args.id, status: { in: ["LIVE", "SOLD"] } },
    include: { weaver: { include: { coop: true } }, photos: { orderBy: { position: "asc" } } },
  });
  if (!l) return null;

  const verified = Boolean(l.loomClipUrl && l.coopConfirmedAt);
  return {
    id: l.id,
    title: l.title,
    description: l.description,
    story: l.story,
    weaver: l.weaver.name,
    town: l.weaver.town,
    coop: l.weaver.coop?.name ?? null,
    fabric: l.fabric,
    weave: l.weave,
    colors: l.colors,
    motifs: l.motifs,
    lengthMeters: l.lengthMeters,
    includesBlouse: l.includesBlouse,
    stitched: l.stitched,
    weeksToWeave: l.weeksToWeave,
    giTag: l.giTag,
    priceUsd: (l.priceUsdCents ?? 0) / 100,
    shippingUsd: env.SHIPPING_USD,
    available: l.status === "LIVE",
    verifiedHandwoven: verified,
    // Say why it is verified, rather than asking anyone to take it on trust.
    evidence: verified
      ? `Filmed on the loom, and confirmed by ${l.weaver.coop?.name ?? "the weavers' co-op"}.`
      : "Not yet confirmed by the co-op.",
    images: l.photos.map((p) => absolute(p.url)),
    url: absolute(`/p/${l.id}`),
  };
}

export type CheckoutResult =
  | {
      ok: true;
      orderId: string;
      paypalOrderId: string;
      itemUsd: number;
      shippingUsd: number;
      totalUsd: number;
      approveUrl: string | null;
      note: string;
    }
  | { ok: false; error: string };

/**
 * Prepares a payment. Deliberately does NOT pay: it returns a link a human
 * must approve (BUILD_PLAN 12.1, 12.2, and rule 4 — the amount comes from the
 * database, never from the caller).
 */
export async function createCheckout(
  args: z.infer<typeof createCheckoutSchema>,
  channel: Channel,
  buyerId?: string,
): Promise<CheckoutResult> {
  if (!isPayPalConfigured()) return { ok: false, error: "Checkout is not configured on this server." };

  const { getDb } = await import("@/lib/db");
  const db = getDb();

  const listing = await db.listing.findUnique({
    where: { id: args.listingId },
    include: { photos: { orderBy: { position: "asc" }, take: 1 } },
  });
  if (!listing) return { ok: false, error: "No such piece." };
  if (listing.status !== "LIVE") return { ok: false, error: "That piece has already sold." };
  if (listing.priceUsdCents == null) return { ok: false, error: "That piece has no price yet." };

  const itemUsdCents = listing.priceUsdCents;
  const shippingUsdCents = Math.round(env.SHIPPING_USD * 100);

  const order = await db.order.create({
    data: {
      listingId: listing.id,
      buyerId: buyerId ?? null,
      status: "CREATED",
      channel,
      paypalOrderId: `pending-${crypto.randomUUID()}`,
      itemUsdCents,
      shippingUsdCents,
      totalUsdCents: itemUsdCents + shippingUsdCents,
    },
  });

  const photo = listing.photos[0]?.url;
  const imageUrl =
    photo && !photo.startsWith("data:") && env.APP_URL.startsWith("https://") ? absolute(photo) : null;

  try {
    const pp = (await createPayPalOrder({
      ourOrderId: order.id,
      listingId: listing.id,
      title: listing.title ?? "Handwoven piece",
      itemUsdCents,
      shippingUsdCents,
      imageUrl,
    })) as { id: string; links?: { rel: string; href: string }[] };

    await db.order.update({ where: { id: order.id }, data: { paypalOrderId: pp.id } });
    await db.agentLog.create({
      data: {
        actor: channel === "MCP" ? "ai:mcp" : "ai:assistant",
        action: "create_checkout",
        listingId: listing.id,
        orderId: order.id,
        detail: { totalUsdCents: order.totalUsdCents },
      },
    });

    const approve = pp.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href ?? null;

    return {
      ok: true,
      orderId: order.id,
      paypalOrderId: pp.id,
      itemUsd: itemUsdCents / 100,
      shippingUsd: shippingUsdCents / 100,
      totalUsd: (itemUsdCents + shippingUsdCents) / 100,
      approveUrl: approve,
      note: "Nothing has been paid. The buyer must approve this in PayPal themselves.",
    };
  } catch (err) {
    await db.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
    console.error("[thari] create_checkout failed", err);
    return { ok: false, error: "Could not prepare the payment." };
  }
}

/** One description per tool, shared by the assistant and MCP. */
export const TOOL_DESCRIPTIONS = {
  search_listings:
    "Search handwoven pieces for sale on Thari. Returns up to 6 live listings with the weaver's name, price in USD, and whether the co-op has verified the piece as handwoven.",
  get_listing:
    "Get the full details of one piece: fabric, weave, colours, length, the weaver's story, and the evidence behind its Verified handwoven badge.",
  create_checkout:
    "Prepare a PayPal checkout for one piece and return a link the buyer must approve. This does NOT pay: no money moves until a human approves it in PayPal.",
} as const;
