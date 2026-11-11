import { NextResponse } from "next/server";
import { env } from "@/lib/env";

/**
 * BUILD_PLAN 12.3: a machine-readable catalog so AI shopping agents can read
 * the whole shop without scraping. schema.org-shaped, plus the one field that
 * makes this marketplace different — whether a human co-op has confirmed the
 * piece is handwoven, and why.
 */
export const revalidate = 60;

export async function GET() {
  const { getDb } = await import("@/lib/db");
  const rows = await getDb().listing.findMany({
    where: { status: "LIVE" },
    orderBy: { createdAt: "desc" },
    include: { weaver: { include: { coop: true } }, photos: { orderBy: { position: "asc" } } },
    take: 200,
  });

  const abs = (p: string) => new URL(p, env.APP_URL).toString();

  const items = rows.map((l) => {
    const verified = Boolean(l.loomClipUrl && l.coopConfirmedAt);
    return {
      "@type": "Product",
      id: l.id,
      url: abs(`/p/${l.id}`),
      name: l.title,
      description: l.description,
      brand: { "@type": "Brand", name: "Thari" },
      category: l.category,
      material: l.fabric,
      weave: l.weave,
      color: l.colors,
      pattern: l.motifs,
      countryOfOrigin: "India",
      madeIn: l.weaver.town,
      weaver: { name: l.weaver.name, town: l.weaver.town, coop: l.weaver.coop?.name ?? null },
      lengthMeters: l.lengthMeters,
      includesBlousePiece: l.includesBlouse,
      stitched: l.stitched,
      weeksToWeave: l.weeksToWeave,
      geographicalIndication: l.giTag,
      image: l.photos.map((p) => abs(p.url)),
      offers: {
        "@type": "Offer",
        price: ((l.priceUsdCents ?? 0) / 100).toFixed(2),
        priceCurrency: "USD",
        shippingUsd: env.SHIPPING_USD.toFixed(2),
        availability: "https://schema.org/InStock",
        url: abs(`/p/${l.id}`),
      },
      verifiedHandwoven: verified,
      verificationEvidence: verified
        ? `Filmed on the loom; confirmed by ${l.weaver.coop?.name ?? "the weavers' co-op"} on ${l.coopConfirmedAt?.toISOString().slice(0, 10)}.`
        : "Not yet confirmed by the co-op.",
    };
  });

  return NextResponse.json(
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Thari — handwoven pieces for sale",
      description:
        "Handloom pieces sold directly by the weavers who made them. 'verifiedHandwoven' means a weavers' co-op watched the loom footage and vouched for the piece.",
      mcpEndpoint: new URL("/api/mcp", env.APP_URL).toString(),
      updated: new Date().toISOString(),
      numberOfItems: items.length,
      itemListElement: items,
    },
    { headers: { "cache-control": "public, max-age=60, s-maxage=60" } },
  );
}
