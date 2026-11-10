import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Truck } from "lucide-react";
import { Gallery } from "@/components/Gallery";
import { LoomClipPlayer } from "@/components/LoomClipPlayer";
import { BuyerBottomNav, TopNav } from "@/components/Nav";
import { AuthenticityBadge, StatusChip } from "@/components/ui";
import { env } from "@/lib/env";
import { getListingDetail, type ListingDetail } from "@/lib/listings";
import { formatInr, formatUsd, usdCentsToInr } from "@/lib/money";

function fmtDate(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="t-caption text-ink-muted">{label}</dt>
      <dd className="t-body m-0">{value}</dd>
    </>
  );
}

function details(l: ListingDetail): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (l.fabric) rows.push({ label: "Fabric", value: l.fabric });
  if (l.weave) rows.push({ label: "Weave", value: l.weave });
  if (l.colors.length) rows.push({ label: "Colours", value: l.colors.join(", ") });
  if (l.motifs.length) rows.push({ label: "Motifs", value: l.motifs.join(", ") });
  if (l.lengthMeters) rows.push({ label: "Length", value: `${l.lengthMeters} metres` });
  if (l.includesBlouse !== null) {
    rows.push({ label: "Blouse piece", value: l.includesBlouse ? "Included, unstitched" : "Not included" });
  }
  if (l.stitched !== null) rows.push({ label: "Stitched", value: l.stitched ? "Stitched" : "Unstitched" });
  if (l.weeksToWeave) rows.push({ label: "Time on the loom", value: `${l.weeksToWeave} weeks` });
  if (l.giTag) rows.push({ label: "Geographical Indication", value: l.giTag });
  return rows;
}

async function Product({ params }: { params: PageProps<"/p/[id]">["params"] }) {
  const { id } = await params;
  const l = await getListingDetail(id);
  if (!l) notFound();

  const sold = l.status === "SOLD";
  const verified = Boolean(l.loomClipUrl && l.coopConfirmedAt);
  const priceCents = l.priceUsdCents ?? 0;
  const shippingUsd = env.SHIPPING_USD;
  const approxInr = usdCentsToInr(priceCents, env.FX_INR_PER_USD);
  const photos = l.photos.map((p) => ({ id: p.id, url: p.url }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: l.title ?? "Handwoven piece",
    image: photos.map((p) => new URL(p.url, env.APP_URL).toString()),
    description: l.description ?? undefined,
    brand: { "@type": "Brand", name: "Thari" },
    offers: {
      "@type": "Offer",
      price: (priceCents / 100).toFixed(2),
      priceCurrency: "USD",
      availability: sold ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      url: new URL(`/p/${l.id}`, env.APP_URL).toString(),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        <Gallery photos={photos} title={l.title ?? "Handwoven piece"} seed={1} />

        <div className="flex flex-col gap-4">
          <div className="th-row justify-between">
            {verified && <AuthenticityBadge />}
            {sold && <StatusChip status="sold" />}
          </div>

          <h1 className="t-title-lg m-0">{l.title ?? "Handwoven piece"}</h1>
          {l.titleNative && (
            <p className="t-tamil-body m-0 text-ink-muted" lang={l.lang}>
              {l.titleNative}
            </p>
          )}

          <Link href={`/weavers/${l.weaverId}`} className="t-story text-ink-muted no-underline">
            Woven by {l.weaver.name} in {l.weaver.town ?? "Tamil Nadu"}
          </Link>

          <div>
            <div className="th-price" style={{ fontSize: 28, lineHeight: "34px" }}>
              {formatUsd(priceCents)}
            </div>
            <p className="t-caption m-0 mt-1 text-ink-muted">
              about {formatInr(approxInr)} · + ${shippingUsd} shipping worldwide
            </p>
          </div>

          {sold ? (
            <button className="th-btn th-btn--primary th-btn--block" disabled>
              Sold
            </button>
          ) : (
            <button className="th-btn th-btn--primary th-btn--block" disabled title="PayPal checkout arrives in Phase 4">
              Pay with PayPal
            </button>
          )}
          <p className="t-caption m-0 text-center text-ink-muted">
            <Truck size={14} strokeWidth={1.75} aria-hidden className="inline align-[-2px]" /> Ships from Tamil Nadu,
            India in 3–5 days
          </p>

          {verified && (
            <section className="flex flex-col gap-3">
              <AuthenticityBadge
                full
                evidence={{
                  weaverName: l.weaver.name,
                  town: l.weaver.town ?? "Tamil Nadu",
                  // No filming date is recorded yet; the upload flow (Phase 2)
                  // will capture it. Better blank than invented on a badge
                  // whose whole job is being trustworthy.
                  loomClipDate: undefined,
                  coopName: l.weaver.coop?.name ?? "the weavers' co-op",
                  coopConfirmedDate: fmtDate(l.coopConfirmedAt) ?? "recently",
                  giTag: l.giTag,
                }}
              />
              {l.loomClipUrl && (
                <LoomClipPlayer
                  src={l.loomClipUrl}
                  poster={photos[0]?.url}
                  title={l.title ?? "This piece"}
                />
              )}
            </section>
          )}
        </div>
      </div>

      {l.description && (
        <section className="mt-10">
          <h2 className="t-title">About this piece</h2>
          <p className="t-body max-w-[70ch]">{l.description}</p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="t-title">Details</h2>
        <dl className="mt-2 grid max-w-[520px] grid-cols-[140px_1fr] gap-x-4 gap-y-2">
          {details(l).map((d) => (
            <DetailRow key={d.label} label={d.label} value={d.value} />
          ))}
        </dl>
      </section>

      {l.story && (
        <section className="mt-8">
          <h2 className="t-title">The weaver&apos;s story</h2>
          <p className="t-story max-w-[60ch]">{l.story}</p>
        </section>
      )}
    </>
  );
}

function ProductSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 md:gap-10" aria-busy="true" aria-label="Loading piece">
      <div className="th-listing__media m-0 bg-surface-tint" />
      <div className="flex flex-col gap-4">
        <div className="th-card" style={{ height: 40 }} />
        <div className="th-card" style={{ height: 120 }} />
      </div>
    </div>
  );
}

export default function ProductPage({ params }: PageProps<"/p/[id]">) {
  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-[1200px] px-4 pb-[100px] pt-4 md:px-6 md:pb-12 md:pt-8">
        <Suspense fallback={<ProductSkeleton />}>
          <Product params={params} />
        </Suspense>
      </main>
      <BuyerBottomNav />
    </>
  );
}
