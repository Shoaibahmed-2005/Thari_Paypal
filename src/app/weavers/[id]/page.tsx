import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { ListingCard } from "@/components/ListingCard";
import { BuyerBottomNav, TopNav } from "@/components/Nav";
import { AuthenticityBadge } from "@/components/ui";

export const metadata: Metadata = { title: "The weaver — Thari" };

const GRID = "grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 lg:grid-cols-4";

export default async function WeaverPage({ params }: PageProps<"/weavers/[id]">) {
  await connection();
  const { id } = await params;

  const { getDb } = await import("@/lib/db");
  const weaver = await getDb().user.findFirst({
    where: { id, role: "WEAVER" },
    include: {
      coop: true,
      listings: {
        where: { status: "LIVE" },
        orderBy: { createdAt: "desc" },
        include: { weaver: true, photos: { orderBy: { position: "asc" }, take: 1 } },
      },
    },
  });
  if (!weaver) notFound();

  const verifiedCount = weaver.listings.filter((l) => l.loomClipUrl && l.coopConfirmedAt).length;

  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-[1200px] px-4 pb-[100px] pt-4 md:px-6 md:pb-12 md:pt-8">
        <section
          className="flex flex-col gap-3 bg-coral p-6 text-on-coral md:p-10"
          style={{ borderRadius: "var(--radius-xl)" }}
        >
          <h1 className="t-display m-0">{weaver.name}</h1>
          <p className="t-body m-0">
            {weaver.town ? `${weaver.town}, Tamil Nadu` : "Tamil Nadu"}
            {weaver.coop ? ` · ${weaver.coop.name}` : ""}
          </p>
          {weaver.bioEn && <p className="t-story m-0 max-w-[60ch]">{weaver.bioEn}</p>}
        </section>

        {verifiedCount > 0 && (
          <div className="th-row mt-4">
            <AuthenticityBadge />
            <span className="t-caption text-ink-muted">
              {verifiedCount} of {weaver.listings.length} pieces confirmed handwoven by{" "}
              {weaver.coop?.name ?? "her co-op"}
            </span>
          </div>
        )}

        <h2 className="t-title mb-4 mt-8">Her pieces</h2>
        {weaver.listings.length === 0 ? (
          <p className="t-body text-ink-muted">Nothing on the loom just now. Check back soon.</p>
        ) : (
          <div className={GRID}>
            {weaver.listings.map((l, i) => (
              <ListingCard
                key={l.id}
                l={{
                  id: l.id,
                  title: l.title ?? "Handwoven piece",
                  weaverName: weaver.name,
                  town: weaver.town ?? "",
                  priceUsdCents: l.priceUsdCents ?? 0,
                  imageUrl: l.photos[0]?.url ?? null,
                  verified: Boolean(l.loomClipUrl && l.coopConfirmedAt),
                  seed: i + 1,
                }}
              />
            ))}
          </div>
        )}
      </main>
      <BuyerBottomNav />
    </>
  );
}
