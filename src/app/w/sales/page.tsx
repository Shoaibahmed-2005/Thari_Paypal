import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { WeaverBottomNav } from "@/components/Nav";
import { OrderChip, PlaceholderImage } from "@/components/ui";
import { env } from "@/lib/env";
import { weaverStrings } from "@/lib/i18n";
import { fontStackFor } from "@/lib/languages";
import { formatInr, usdCentsToInr } from "@/lib/money";
import { getWeaver } from "@/lib/weaver";
import { SignedOut } from "@/components/SignedOut";

export const metadata: Metadata = { title: "Thari — sales" };

export default async function WeaverSalesPage() {
  const weaver = await getWeaver();
  if (!weaver) return <SignedOut />;

  const { t, language } = weaverStrings(weaver.preferredLang);
  const nativeFont = fontStackFor(language.script);

  const { getDb } = await import("@/lib/db");
  const orders = await getDb().order.findMany({
    where: { listing: { weaverId: weaver.id }, status: { not: "CREATED" } },
    orderBy: { createdAt: "desc" },
    include: {
      listing: { include: { photos: { orderBy: { position: "asc" }, take: 1 } } },
      payouts: { where: { recipient: "WEAVER" } },
    },
    take: 50,
  });

  return (
    <>
      <main className="mx-auto min-h-dvh max-w-[420px] px-4 pb-[110px] pt-4">
        <Link href="/w" className="th-btn th-btn--ghost" style={{ paddingLeft: 0 }}>
          <ChevronLeft size={20} strokeWidth={1.75} aria-hidden />
        </Link>

        <h1 className="t-title-lg mt-2" style={{ fontFamily: nativeFont }} lang={language.code}>
          {t.myPieces}
        </h1>

        {orders.length === 0 ? (
          <p className="t-body mt-4 text-ink-muted" style={{ fontFamily: nativeFont }} lang={language.code}>
            {t.noPieces}
          </p>
        ) : (
          <ul className="mt-4 flex list-none flex-col gap-3 p-0">
            {orders.map((o, i) => {
              const mine = o.payouts[0];
              const inr = usdCentsToInr(mine?.amountUsdCents ?? 0, env.FX_INR_PER_USD);
              return (
                <li key={o.id} className="th-card p-3">
                  <div className="flex gap-3">
                    <div className="h-16 w-16 flex-none overflow-hidden" style={{ borderRadius: "var(--radius-md)" }}>
                      {o.listing.photos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={o.listing.photos[0].url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <PlaceholderImage seed={i} label="" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      {o.listing.titleNative && o.listing.lang === language.code ? (
                        <>
                          <div className="t-label truncate" style={{ fontFamily: nativeFont }} lang={o.listing.lang}>
                            {o.listing.titleNative}
                          </div>
                          <div className="t-caption truncate text-ink-muted">{o.listing.title}</div>
                        </>
                      ) : (
                        <div className="t-label truncate">{o.listing.title}</div>
                      )}
                      <div className="th-row mt-1 justify-between">
                        <OrderChip status={o.status} />
                        <span className="th-price">{formatInr(inr)}</span>
                      </div>
                      {mine && mine.status !== "SUCCEEDED" && (
                        <p className="t-caption m-0 mt-1 text-ink-muted">
                          {mine.status === "FAILED"
                            ? "The co-op is sorting out the payment."
                            : "On its way to you."}
                        </p>
                      )}
                      {o.trackingNumber && (
                        <p className="t-caption m-0 mt-1 text-ink-muted">
                          {o.carrier ?? "Courier"}: <span className="font-mono">{o.trackingNumber}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <WeaverBottomNav current="/w/sales" />
    </>
  );
}
