import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { WeaverBottomNav } from "@/components/Nav";
import { StatusChip } from "@/components/ui";
import { env } from "@/lib/env";
import { weaverStrings } from "@/lib/i18n";
import { fontStackFor } from "@/lib/languages";
import { formatInr, usdCentsToInr } from "@/lib/money";
import { getWeaver, getWeaverMoney } from "@/lib/weaver";

export const metadata: Metadata = { title: "Thari — money" };

export default async function WeaverMoneyPage() {
  const weaver = await getWeaver();
  if (!weaver) redirect("/demo");

  const { t, language } = weaverStrings(weaver.preferredLang);
  const nativeFont = fontStackFor(language.script);

  const { getDb } = await import("@/lib/db");
  const [money, payouts] = await Promise.all([
    getWeaverMoney(weaver.id),
    getDb().payout.findMany({
      where: { recipient: "WEAVER", order: { listing: { weaverId: weaver.id } } },
      orderBy: { createdAt: "desc" },
      include: { order: { include: { listing: true } } },
      take: 50,
    }),
  ]);

  const receivedInr = usdCentsToInr(money.receivedUsdCents, env.FX_INR_PER_USD);
  const pendingInr = usdCentsToInr(money.pendingUsdCents, env.FX_INR_PER_USD);

  return (
    <>
      <main className="mx-auto min-h-dvh max-w-[420px] px-4 pb-[110px] pt-4">
        <Link href="/w" className="th-btn th-btn--ghost" style={{ paddingLeft: 0 }}>
          <ChevronLeft size={20} strokeWidth={1.75} aria-hidden />
        </Link>

        <h1 className="t-title-lg mt-2" style={{ fontFamily: nativeFont }} lang={language.code}>
          {t.moneyComing}
        </h1>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="th-card p-4">
            <div className="t-caption text-ink-muted">Received</div>
            <div className="th-price mt-1" style={{ fontSize: 24, lineHeight: "30px" }}>
              {formatInr(receivedInr)}
            </div>
          </div>
          <div className="th-card p-4">
            <div className="t-caption text-ink-muted">On the way</div>
            <div className="th-price mt-1" style={{ fontSize: 24, lineHeight: "30px" }}>
              {formatInr(pendingInr)}
            </div>
          </div>
        </div>

        {payouts.length === 0 ? (
          <p className="t-body mt-5 text-ink-muted" style={{ fontFamily: nativeFont }} lang={language.code}>
            {t.noPieces}
          </p>
        ) : (
          <ul className="mt-5 flex list-none flex-col gap-3 p-0">
            {payouts.map((p) => (
              <li key={p.id} className="th-card p-3">
                <div className="th-row justify-between">
                  <div className="min-w-0">
                    {p.order.listing.titleNative && (
                      <div
                        className="t-label truncate"
                        style={{ fontFamily: nativeFont }}
                        lang={p.order.listing.lang}
                      >
                        {p.order.listing.titleNative}
                      </div>
                    )}
                    <div className="t-caption truncate text-ink-muted">{p.order.listing.title}</div>
                  </div>
                  <span className="th-price">{formatInr(usdCentsToInr(p.amountUsdCents, env.FX_INR_PER_USD))}</span>
                </div>
                <div className="th-row mt-2 justify-between">
                  <StatusChip status={p.status === "SUCCEEDED" ? "paid" : "payout-pending"} />
                  <span className="t-caption text-ink-muted">
                    {new Date(p.createdAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <WeaverBottomNav current="/w/money" />
    </>
  );
}
