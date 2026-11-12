import Link from "next/link";

/**
 * Shown where a signed-in page used to call `redirect("/demo")`.
 *
 * Redirecting from these pages caused a bug that only appeared on Vercel. The
 * bottom nav prefetches `/w/new`, `/w/sales` and `/w/money`, so Next renders
 * them speculatively. A prefetch issued before the sign-in cookie is in play —
 * a race you never see locally, but hit often on serverless cold starts — came
 * back as a flight payload whose instruction was "go to /demo". The router
 * cached that and later carried it out as a full page load, so the weaver was
 * thrown back to the role picker mid-task with nothing explaining why.
 *
 * Rendering a page instead of redirecting makes that impossible: a stale
 * prefetch can now only produce this panel, never a navigation. It also tells
 * her what happened, which a silent bounce never did.
 */
export function SignedOut({
  role = "weaver",
  reason,
}: {
  role?: "weaver" | "buyer" | "coop";
  /**
   * Why this panel is showing, written into the markup rather than shown.
   * "no-cookie" and "no-session" look the same to her but mean different
   * things to us, and without it the only way to tell them apart is to
   * guess.
   */
  reason?: string;
}) {
  return (
    // A plain div, not a <main>: some of these pages render it inside their
    // own <main>, and nesting the width and padding clipped the card.
    <div data-signed-out-reason={reason} className="mx-auto flex w-full max-w-[420px] flex-col justify-center py-16">
      <div className="th-card p-5">
        <h1 className="t-title-lg m-0">Please sign in again</h1>
        <p className="t-body mt-2 text-ink-muted">
          Your demo session ended. Nothing you listed has been lost.
        </p>
        <Link href={`/api/demo-login?role=${role}`} className="th-btn th-btn--primary mt-4 w-full">
          Sign back in
        </Link>
        <Link href="/demo" className="th-btn th-btn--ghost mt-2 w-full">
          Pick a different role
        </Link>
      </div>
    </div>
  );
}
