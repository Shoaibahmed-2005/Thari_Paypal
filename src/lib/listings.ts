import { connection } from "next/server";
import type { ListingCardData } from "@/components/ListingCard";

export type ListingsResult = { listings: ListingCardData[]; source: "db" | "error" };

/** Category chips on `/` and `/explore` (BUILD_PLAN 9.2). */
export const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "silk", label: "Silk sarees" },
  { key: "cotton", label: "Cotton sarees" },
  { key: "dupatta", label: "Dupattas" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

export const SORTS = [
  { key: "new", label: "Newest" },
  { key: "price-low", label: "Price: low to high" },
  { key: "price-high", label: "Price: high to low" },
] as const;

export type SortKey = (typeof SORTS)[number]["key"];

export function isCategory(v: string | undefined): v is CategoryKey {
  return CATEGORIES.some((c) => c.key === v);
}

export function isSort(v: string | undefined): v is SortKey {
  return SORTS.some((s) => s.key === v);
}

function toCard(
  r: {
    id: string;
    title: string | null;
    priceUsdCents: number | null;
    loomClipUrl: string | null;
    coopConfirmedAt: Date | null;
    weaver: { name: string; town: string | null };
    photos: { url: string }[];
  },
  i: number,
): ListingCardData {
  return {
    id: r.id,
    title: r.title ?? "Untitled piece",
    weaverName: r.weaver.name,
    town: r.weaver.town ?? "",
    priceUsdCents: r.priceUsdCents ?? 0,
    imageUrl: r.photos[0]?.url ?? null,
    verified: Boolean(r.loomClipUrl && r.coopConfirmedAt),
    seed: i + 1,
  };
}

const CARD_SELECT = {
  weaver: true,
  photos: { orderBy: { position: "asc" }, take: 1 },
} as const;

/** LIVE listings for the shop. Fails soft: a DB error returns empty plus a flag the page renders as a friendly message. */
export async function getLiveListings(take = 24): Promise<ListingsResult> {
  await connection(); // request-time data, never prerendered
  try {
    const { getDb } = await import("@/lib/db");
    const rows = await getDb().listing.findMany({
      where: { status: "LIVE" },
      orderBy: { createdAt: "desc" },
      take,
      include: CARD_SELECT,
    });
    return { source: "db", listings: rows.map(toCard) };
  } catch (err) {
    console.error("[thari] getLiveListings failed", err);
    return { listings: [], source: "error" };
  }
}

export interface SearchParams {
  q?: string;
  category?: CategoryKey;
  sort?: SortKey;
}

/**
 * Server-side search (BUILD_PLAN 9.2). Case-insensitive `contains` across
 * title, fabric, weave and the weaver's name, plus an exact match on a colour.
 * Colours are a String[], which Postgres can only match element-wise, but the
 * titles carry the colour words too, so "pink" finds the pink saree either way.
 */
export async function searchListings({ q, category = "all", sort = "new" }: SearchParams): Promise<ListingsResult> {
  await connection();
  const term = q?.trim();
  try {
    const { getDb } = await import("@/lib/db");

    const categoryWhere =
      category === "silk"
        ? { category: "saree", fabric: { contains: "silk", mode: "insensitive" as const } }
        : category === "cotton"
          ? { category: "saree", fabric: { equals: "cotton", mode: "insensitive" as const } }
          : category === "dupatta"
            ? { category: "dupatta" }
            : {};

    const textWhere = term
      ? {
          OR: [
            { title: { contains: term, mode: "insensitive" as const } },
            { description: { contains: term, mode: "insensitive" as const } },
            { fabric: { contains: term, mode: "insensitive" as const } },
            { weave: { contains: term, mode: "insensitive" as const } },
            { colors: { has: term.toLowerCase() } },
            { weaver: { name: { contains: term, mode: "insensitive" as const } } },
          ],
        }
      : {};

    const orderBy =
      sort === "price-low"
        ? { priceUsdCents: "asc" as const }
        : sort === "price-high"
          ? { priceUsdCents: "desc" as const }
          : { createdAt: "desc" as const };

    const rows = await getDb().listing.findMany({
      where: { status: "LIVE", ...categoryWhere, ...textWhere },
      orderBy,
      take: 48,
      include: CARD_SELECT,
    });
    return { source: "db", listings: rows.map(toCard) };
  } catch (err) {
    console.error("[thari] searchListings failed", err);
    return { listings: [], source: "error" };
  }
}

/** One listing with everything the product page shows. `null` when it doesn't exist. */
export async function getListingDetail(id: string) {
  await connection();
  const { getDb } = await import("@/lib/db");
  return getDb().listing.findFirst({
    where: { id, status: { in: ["LIVE", "SOLD"] } },
    include: {
      weaver: { include: { coop: true } },
      photos: { orderBy: { position: "asc" } },
    },
  });
}

export type ListingDetail = NonNullable<Awaited<ReturnType<typeof getListingDetail>>>;
