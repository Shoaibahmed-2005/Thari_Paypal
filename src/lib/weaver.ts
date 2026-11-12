import { getCurrentUser } from "@/lib/session";
import type { WeaverContext } from "@/lib/ai/prompts";

/** The signed-in weaver, or null. Used by `/w/*` and the listing API routes. */
export async function getWeaver() {
  const session = await getCurrentUser();
  if (!session || session.role !== "WEAVER") return null;

  const { getDb } = await import("@/lib/db");
  return getDb().user.findFirst({
    where: { id: session.userId, role: "WEAVER" },
    include: { coop: true },
  });
}

/**
 * Why a weaver-only request could not proceed.
 *
 * Collapsing all three into "sign in first" produced a baffling bug: the
 * language switcher bounced the weaver to the sign-in page with no
 * explanation, and a database hiccup looked identical to a lapsed cookie.
 */
export type WeaverAuth =
  | { ok: true; weaver: NonNullable<Awaited<ReturnType<typeof getWeaver>>> }
  | { ok: false; reason: "no-cookie" | "no-session" | "wrong-role" | "lookup-failed" };

export async function requireWeaver(): Promise<WeaverAuth> {
  const session = await getCurrentUser();
  if (!session) {
    // Tell "the cookie never arrived" apart from "it arrived and said
    // nothing useful". The two look identical on screen and have entirely
    // different causes, and guessing between them cost a long hunt once.
    const { cookies } = await import("next/headers");
    const jar = await cookies();
    return { ok: false, reason: jar.has("thari_session") ? "no-session" : "no-cookie" };
  }
  if (session.role !== "WEAVER") return { ok: false, reason: "wrong-role" };

  try {
    const { getDb } = await import("@/lib/db");
    const weaver = await getDb().user.findFirst({
      where: { id: session.userId, role: "WEAVER" },
      include: { coop: true },
    });
    if (!weaver) return { ok: false, reason: "lookup-failed" };
    return { ok: true, weaver };
  } catch (err) {
    console.error("[thari] weaver lookup failed", err);
    return { ok: false, reason: "lookup-failed" };
  }
}

export type Weaver = NonNullable<Awaited<ReturnType<typeof getWeaver>>>;

export function weaverContext(w: Weaver): WeaverContext {
  return {
    name: w.name,
    town: w.town ?? "",
    coopName: w.coop?.name ?? "her weavers' co-op",
    lang: w.preferredLang,
  };
}

/** Her own pieces, newest first, for `/w`. */
export async function getWeaverPieces(weaverId: string) {
  const { getDb } = await import("@/lib/db");
  return getDb().listing.findMany({
    where: { weaverId, status: { not: "ARCHIVED" } },
    orderBy: { createdAt: "desc" },
    include: { photos: { orderBy: { position: "asc" }, take: 1 } },
    take: 30,
  });
}

/** Her notifications, unheard first, for the big coral card on `/w`. */
export async function getWeaverNotifications(weaverId: string) {
  const { getDb } = await import("@/lib/db");
  return getDb().notification.findMany({
    where: { userId: weaverId },
    orderBy: [{ heardAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
    take: 10,
  });
}

/** Total already paid out to her, and what is still pending, in USD cents. */
export async function getWeaverMoney(weaverId: string) {
  const { getDb } = await import("@/lib/db");
  const rows = await getDb().payout.findMany({
    where: { recipient: "WEAVER", order: { listing: { weaverId } } },
    select: { amountUsdCents: true, status: true },
  });
  let receivedUsdCents = 0;
  let pendingUsdCents = 0;
  for (const r of rows) {
    if (r.status === "SUCCEEDED") receivedUsdCents += r.amountUsdCents;
    else if (r.status !== "FAILED") pendingUsdCents += r.amountUsdCents;
  }
  return { receivedUsdCents, pendingUsdCents };
}
