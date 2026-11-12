import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Mic } from "lucide-react";
import { WeaverBottomNav } from "@/components/Nav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NotificationCard } from "@/components/NotificationCard";
import { ListingChip, PlaceholderImage, Wordmark } from "@/components/ui";
import { fill, weaverStrings } from "@/lib/i18n";
import { fontStackFor } from "@/lib/languages";
import { formatInr, usdCentsToInr } from "@/lib/money";
import { env } from "@/lib/env";
import { requireWeaver, getWeaverMoney, getWeaverNotifications, getWeaverPieces } from "@/lib/weaver";
import { SignedOut } from "@/components/SignedOut";

/**
 * Every render of this page must see the real request.
 *
 * Without this, Next was free to produce a cookie-less version of the route
 * and the router served it on a client-side navigation: the page rendered as
 * though nobody was signed in, and a weaver who had just signed in was shown
 * the sign-in panel. A document load never reproduced it, because a document
 * load always carries her cookie -- which is what made it look intermittent
 * and impossible to pin down.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Thari — weaver" };

/** Listing status -> the chip the weaver sees. */
async function WeaverHome() {
  const auth = await requireWeaver();
  if (!auth.ok) return <SignedOut reason={auth.reason} />;
  const weaver = auth.weaver;

  const { t, language } = weaverStrings(weaver.preferredLang);
  const nativeFont = fontStackFor(language.script);

  const [pieces, notifications, money] = await Promise.all([
    getWeaverPieces(weaver.id),
    getWeaverNotifications(weaver.id),
    getWeaverMoney(weaver.id),
  ]);

  const unheard = notifications.find((n) => !n.heardAt);
  const comingInr = usdCentsToInr(money.pendingUsdCents + money.receivedUsdCents, env.FX_INR_PER_USD);

  return (
    <>
      {/* The wordmark stays தறி in every language: it is a mark, not a word
          to translate. Only the interface follows her. */}
      <header className="th-row justify-between">
        <Link href="/w" aria-label="Thari">
          <Wordmark />
        </Link>
        <div className="th-row">
          <LanguageSwitcher current={language.code} />
          <Link href="/api/logout" className="t-caption text-ink-muted">
            Sign out
          </Link>
        </div>
      </header>

      <h1 className="t-title-lg mt-4" style={{ fontFamily: nativeFont }} lang={language.code}>
        {fill(t.greeting, { name: weaver.name.replace(/\s+\w\.$/, "") })}
      </h1>

      {unheard && <NotificationCard notification={{ id: unheard.id, textNative: unheard.textNative, textEn: unheard.textEn, audioUrl: unheard.audioUrl }} playLabel={t.play} lang={language.code} nativeFont={nativeFont} />}

      {/* A plain <a> for the same reason as the bottom nav: see Nav.tsx. */}
      <a
        href="/w/new"
        className="mt-5 flex items-center justify-center gap-3 bg-coral px-5 py-6 text-on-coral no-underline"
        style={{ borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-float)" }}
      >
        <Mic size={28} strokeWidth={1.75} aria-hidden />
        <span className="t-title m-0" style={{ fontFamily: nativeFont }} lang={language.code}>
          {t.sellNew}
        </span>
      </a>

      <section className="mt-6">
        <h2 className="t-title" style={{ fontFamily: nativeFont }} lang={language.code}>
          {t.myPieces}
        </h2>
        {pieces.length === 0 ? (
          <p className="t-body text-ink-muted" style={{ fontFamily: nativeFont }} lang={language.code}>
            {t.noPieces}
          </p>
        ) : (
          <ul className="mt-2 flex list-none flex-col gap-3 p-0">
            {pieces.map((p, i) => (
              <li key={p.id} className="th-card flex-row items-center gap-3 p-3">
                <div className="h-16 w-16 flex-none overflow-hidden" style={{ borderRadius: "var(--radius-md)" }}>
                  {p.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photos[0].url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <PlaceholderImage seed={i} label="" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {/* Her own short name for the piece, but only when she still
                      reads that language. A listing keeps the language she
                      spoke, so after switching to Hindi her old Tamil titles
                      would otherwise sit under Hindi headings — which reads
                      as broken rather than as faithful. */}
                  {p.titleNative && p.lang === language.code ? (
                    <>
                      <div className="t-label truncate" style={{ fontFamily: nativeFont }} lang={p.lang}>
                        {p.titleNative}
                      </div>
                      <div className="t-caption truncate text-ink-muted">{p.title ?? "Draft"}</div>
                    </>
                  ) : (
                    <div className="t-label truncate">{p.title ?? "Draft"}</div>
                  )}
                  <div className="mt-1">
                    <ListingChip status={p.status} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="th-card mt-6 p-4">
        <div className="t-caption text-ink-muted" style={{ fontFamily: nativeFont }} lang={language.code}>
          {t.moneyComing}
        </div>
        <div className="th-price" style={{ fontSize: 28, lineHeight: "34px" }}>
          {formatInr(comingInr)}
        </div>
      </section>
    </>
  );
}

export default function WeaverHomePage() {
  return (
    <>
      {/* 8.5: the weaver area is a phone column even on a laptop, so judges see the real experience. */}
      <main className="mx-auto min-h-dvh max-w-[420px] px-4 pb-[110px] pt-4">
        <Suspense fallback={<p className="t-body text-ink-muted">…</p>}>
          <WeaverHome />
        </Suspense>
      </main>
      <WeaverBottomNav current="/w" />
    </>
  );
}
