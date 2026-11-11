import { getCurrentUser } from "@/lib/session";

/** The signed-in co-op admin, or null (BUILD_PLAN 9.4). */
export async function getCoopAdmin() {
  const session = await getCurrentUser();
  if (!session || session.role !== "COOP_ADMIN") return null;
  const { getDb } = await import("@/lib/db");
  return getDb().user.findFirst({ where: { id: session.userId, role: "COOP_ADMIN" }, include: { coop: true } });
}

export interface CoopStats {
  live: number;
  soldThisMonth: number;
  paidToWeaversUsdCents: number;
  pendingConfirmations: number;
}

export interface CoopListingRow {
  id: string;
  title: string;
  weaver: string;
  town: string;
  priceUsdCents: number;
  status: string;
  photoUrl: string | null;
  loomClipUrl: string | null;
  confirmed: boolean;
  createdAt: string;
}

export interface CoopOrderRow {
  id: string;
  paypalOrderId: string;
  piece: string;
  weaver: string;
  buyerCountry: string;
  totalUsdCents: number;
  status: string;
  tracking: string | null;
  captureId: string | null;
  createdAt: string;
}

export interface CoopPayoutRow {
  id: string;
  orderId: string;
  recipient: string;
  receiverEmail: string;
  amountUsdCents: number;
  status: string;
  paypalBatchId: string | null;
  error: string | null;
}

export interface CoopLogRow {
  id: string;
  actor: string;
  action: string;
  at: string;
  summary: string;
}

export interface CoopData {
  stats: CoopStats;
  listings: CoopListingRow[];
  orders: CoopOrderRow[];
  payouts: CoopPayoutRow[];
  log: CoopLogRow[];
}

/** Everything the dashboard shows, in one round trip. */
export async function getCoopData(): Promise<CoopData> {
  const { getDb } = await import("@/lib/db");
  const db = getDb();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [listings, orders, payouts, log, live, soldThisMonth, paid] = await Promise.all([
    db.listing.findMany({
      where: { status: { notIn: ["ARCHIVED"] } },
      orderBy: { createdAt: "desc" },
      include: { weaver: true, photos: { orderBy: { position: "asc" }, take: 1 } },
      take: 100,
    }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      include: { listing: { include: { weaver: true } } },
      take: 100,
    }),
    db.payout.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    db.agentLog.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
    db.listing.count({ where: { status: "LIVE" } }),
    db.order.count({ where: { status: { in: ["PAID", "SHIPPED", "DELIVERED"] }, createdAt: { gte: monthStart } } }),
    db.payout.aggregate({
      _sum: { amountUsdCents: true },
      where: { recipient: "WEAVER", status: { in: ["SENT", "SUCCEEDED"] } },
    }),
  ]);

  return {
    stats: {
      live,
      soldThisMonth,
      paidToWeaversUsdCents: paid._sum.amountUsdCents ?? 0,
      pendingConfirmations: listings.filter((l) => l.status === "LIVE" && !l.coopConfirmedAt).length,
    },
    listings: listings.map((l) => ({
      id: l.id,
      title: l.title ?? "Untitled",
      weaver: l.weaver.name,
      town: l.weaver.town ?? "",
      priceUsdCents: l.priceUsdCents ?? 0,
      status: l.status,
      photoUrl: l.photos[0]?.url ?? null,
      loomClipUrl: l.loomClipUrl,
      confirmed: Boolean(l.coopConfirmedAt),
      createdAt: l.createdAt.toISOString(),
    })),
    orders: orders.map((o) => ({
      id: o.id,
      paypalOrderId: o.paypalOrderId,
      piece: o.listing.title ?? "Untitled",
      weaver: o.listing.weaver.name,
      buyerCountry: countryOf(o.shippingAddress) ?? "—",
      totalUsdCents: o.totalUsdCents,
      status: o.status,
      tracking: o.trackingNumber,
      captureId: o.captureId,
      createdAt: o.createdAt.toISOString(),
    })),
    payouts: payouts.map((p) => ({
      id: p.id,
      orderId: p.orderId,
      recipient: p.recipient,
      receiverEmail: p.receiverEmail,
      amountUsdCents: p.amountUsdCents,
      status: p.status,
      paypalBatchId: p.paypalBatchId,
      error: p.error,
    })),
    log: log.map((a) => ({
      id: a.id,
      actor: a.actor,
      action: a.action,
      at: a.createdAt.toISOString(),
      summary: summarise(a.action, a.detail),
    })),
  };
}

function countryOf(shipping: unknown): string | null {
  const addr = (shipping as { address?: { country_code?: string } } | null)?.address;
  return addr?.country_code ?? null;
}

/** Turn an AgentLog row into one readable line for the feed (BUILD_PLAN 9.4). */
function summarise(action: string, detail: unknown): string {
  const d = (detail ?? {}) as Record<string, unknown>;
  switch (action) {
    case "extractListing":
      return d.mode === "mock" ? "AI drafted a listing (mock)" : "AI drafted a listing from a voice note";
    case "answerQuestion":
      return "AI understood a spoken answer";
    case "regenerateCopy":
      return "AI rewrote a listing after new answers";
    case "publishListing":
      return `Weaver published "${String(d.title ?? "a piece")}"`;
    case "fulfillOrder.paid":
      return "Payment captured, piece marked sold";
    case "fulfillOrder.payoutsSent":
      return "Payouts sent to weaver and co-op";
    case "fulfillOrder.payoutsFailed":
      return `Payout failed: ${String(d.error ?? "unknown")}`.slice(0, 120);
    case "fulfillOrder.notified":
      return "Weaver told, in her own language";
    case "payouts.retried":
      return "Payout retried";
    case "listing.confirmed":
      return "Co-op confirmed a piece as handwoven";
    case "order.refunded":
      return "Order refunded";
    default:
      return action;
  }
}
