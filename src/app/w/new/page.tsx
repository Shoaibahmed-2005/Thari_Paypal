import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { NewListingFlow } from "@/components/NewListingFlow";
import { weaverStrings } from "@/lib/i18n";
import { fontStackFor } from "@/lib/languages";
import { requireWeaver } from "@/lib/weaver";
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

export const metadata: Metadata = { title: "Thari — new piece" };

async function Flow() {
  const auth = await requireWeaver();
  if (!auth.ok) return <SignedOut reason={auth.reason} />;
  const weaver = auth.weaver;
  const { t, language } = weaverStrings(weaver.preferredLang);
  return <NewListingFlow t={t} lang={language.code} nativeFont={fontStackFor(language.script)} />;
}

export default function NewListingPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-[420px] px-4 pb-10 pt-4">
      <Link href="/w" className="th-btn th-btn--ghost" style={{ paddingLeft: 0 }}>
        <ChevronLeft size={20} strokeWidth={1.75} aria-hidden />
      </Link>
      <div className="mt-2">
        <Suspense fallback={<p className="t-body text-ink-muted">…</p>}>
          <Flow />
        </Suspense>
      </div>
    </main>
  );
}
