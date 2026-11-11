import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { BuyerBottomNav, TopNav } from "@/components/Nav";
import { PlaceholderImage, StatusChip } from "@/components/ui";
import type { ChipStatus } from "@/components/ui";
import { formatUsd } from "@/lib/money";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Your orders — Thari" };

const CHIP: Record<string, ChipStatus> = {
  CREATED: "payout-pending",
  PAID: "paid",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  REFUNDED: "refunded",
  FAILED: "refunded",
};

export default async function OrdersPage() {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect("/demo");

  const { getDb } = await import("@/lib/db");
  const orders = await getDb().order.findMany({
    where: { buyerId: user.userId, status: { not: "CREATED" } },
    orderBy: { createdAt: "desc" },
    include: {
      listing: { include: { weaver: true, photos: { orderBy: { position: "asc" }, take: 1 } } },
    },
    take: 50,
  });

  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-[900px] px-4 pb-[100px] pt-4 md:px-6 md:pb-12 md:pt-8">
        <h1 className="t-title-lg">Your orders</h1>

        {orders.length === 0 ? (
          <div className="th-card mt-4 p-6 text-center">
            <p className="t-title m-0">Nothing here yet</p>
            <p className="t-body mt-2 text-ink-muted">
              When you buy a piece, it appears here with its tracking.
            </p>
            <Link href="/explore" className="th-btn th-btn--primary mt-4">
              Explore the pieces
            </Link>
          </div>
        ) : (
          <ul className="mt-4 flex list-none flex-col gap-3 p-0">
            {orders.map((o, i) => (
              <li key={o.id} className="th-card p-3">
                <div className="flex gap-3">
                  <Link
                    href={`/p/${o.listingId}`}
                    className="h-20 w-20 flex-none overflow-hidden"
                    style={{ borderRadius: "var(--radius-md)" }}
                  >
                    {o.listing.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={o.listing.photos[0].url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <PlaceholderImage seed={i} label="" />
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="th-row justify-between">
                      <Link href={`/p/${o.listingId}`} className="t-label no-underline">
                        {o.listing.title ?? "Handwoven piece"}
                      </Link>
                      <StatusChip status={CHIP[o.status] ?? "paid"} />
                    </div>
                    <p className="th-listing__weaver m-0">
                      by {o.listing.weaver.name}, {o.listing.weaver.town ?? "Tamil Nadu"}
                    </p>
                    <p className="t-caption m-0 mt-1 text-ink-muted">
                      {new Date(o.createdAt).toLocaleDateString("en-GB", { dateStyle: "medium" })} ·{" "}
                      {formatUsd(o.totalUsdCents)}
                    </p>
                    <p className="t-caption m-0 mt-1 text-ink-muted">
                      {o.trackingNumber ? (
                        <>
                          {o.carrier ?? "Courier"}: <span className="font-mono">{o.trackingNumber}</span>
                        </>
                      ) : o.status === "PAID" ? (
                        "Being packed. Tracking appears here when it ships."
                      ) : (
                        ""
                      )}
                    </p>
                  </div>
                </div>

                <div className="th-row mt-2 justify-end">
                  <Link href={`/checkout/success/${o.id}`} className="th-btn th-btn--ghost">
                    Order details
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <BuyerBottomNav current="/orders" />
    </>
  );
}
