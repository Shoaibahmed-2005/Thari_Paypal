import { connection } from "next/server";
import type { ListingCardData } from "@/components/ListingCard";
export type ListingsResult = { listings: ListingCardData[]; source: "db" | "error" };

/** LIVE listings for the shop. Fails soft: a DB error returns empty plus a flag the page renders as a friendly message. */
export async function getLiveListings(take = 24): Promise<ListingsResult> {
  await connection(); // request-time data, never prerendered
  try {
    const { getDb } = await import("@/lib/db");
    const rows = await getDb().listing.findMany({
      where: { status: "LIVE" },
      orderBy: { createdAt: "desc" },
      take,
      include: { weaver: true, photos: { orderBy: { position: "asc" }, take: 1 } },
    });
    return {
      source: "db",
      listings: rows.map((r, i) => ({
        id: r.id,
        title: r.title ?? "Untitled piece",
        weaverName: r.weaver.name,
        town: r.weaver.town ?? "",
        priceUsdCents: r.priceUsdCents ?? 0,
        imageUrl: r.photos[0]?.url ?? null,
        verified: Boolean(r.loomClipUrl && r.coopConfirmedAt),
        seed: i + 1,
      })),
    };
  } catch (err) {
    console.error("[thari] getLiveListings failed", err);
    return { listings: [], source: "error" };
  }
}
