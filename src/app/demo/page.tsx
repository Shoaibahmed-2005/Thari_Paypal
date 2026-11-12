import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Code, Info, Landmark, ShoppingBag, Spool } from "lucide-react";
import { Wordmark } from "@/components/ui";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/session";
import { SignOutButton } from "@/components/SignOutButton";

export const metadata: Metadata = {
  title: "Try Thari in 3 roles — Thari",
  description: "One-click demo logins for the weaver, buyer and co-op views.",
};

const REPO_URL = "https://github.com/Shoaibahmed-2005/Thari_Paypal";

const ROLES = [
  {
    key: "weaver",
    icon: Spool,
    name: "Weaver — Lakshmi",
    where: "Kanchipuram, Tamil Nadu",
    blurb: "Phone view, in her own language — Tamil in this demo. Record a voice note and the AI writes the listing. She hears when a piece sells.",
    goes: "/w",
  },
  {
    key: "buyer",
    icon: ShoppingBag,
    name: "Buyer — Emma",
    where: "Boston, United States",
    blurb: "Browse handwoven pieces, check the loom clip behind the Verified badge, and pay with PayPal.",
    goes: "/",
  },
  {
    key: "coop",
    icon: Landmark,
    name: "Co-op — Priya",
    where: "Kanchipuram Weavers' Co-op",
    blurb: "Confirm that a piece is genuinely handwoven, watch orders and payouts, refund when something goes wrong.",
    goes: "/coop",
  },
] as const;

/**
 * Reads the session cookie, so with Cache Components it cannot be part of the
 * static shell and must stream in behind <Suspense>
 * (node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md).
 */
async function SignedInNotice() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <p className="t-caption m-0">
      Signed in as {user.name}.{" "}
      <SignOutButton className="underline" />
    </p>
  );
}

export default function DemoPage() {
  const buyerEmail = env.SANDBOX_BUYER_EMAIL;
  const buyerPassword = env.SANDBOX_BUYER_PASSWORD;

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-8 md:px-6 md:py-12">
      <Link href="/" aria-label="Thari home">
        <Wordmark />
      </Link>

      <section
        className="mt-6 flex flex-col gap-3 bg-coral p-6 text-on-coral md:p-10"
        style={{ borderRadius: "var(--radius-xl)" }}
      >
        <h1 className="t-display m-0">Try Thari in 3 roles</h1>
        <p className="t-body m-0 max-w-[60ch]">
          Thari lets a handloom weaver sell worldwide using only her voice, in whichever language she speaks, with
          proof each piece is genuinely handwoven. Pick a role below — one click signs you in as that person.
        </p>
        <Suspense fallback={null}>
          <SignedInNotice />
        </Suspense>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {ROLES.map(({ key, icon: Icon, name, where, blurb, goes }) => (
          <article key={key} className="th-card">
            <div className="flex flex-1 flex-col gap-2 p-5">
              <span
                className="grid h-12 w-12 place-items-center bg-blush text-maroon"
                style={{ borderRadius: "var(--radius-pill)" }}
              >
                <Icon size={24} strokeWidth={1.75} aria-hidden />
              </span>
              <h2 className="t-title m-0 mt-2">{name}</h2>
              <p className="t-caption m-0 text-ink-muted">{where}</p>
              <p className="t-body m-0 mt-1 flex-1">{blurb}</p>
              <a href={`/api/demo-login?role=${key}`} className="th-btn th-btn--primary th-btn--block mt-3">
                Enter as {name.split(" — ")[1]}
              </a>
              <p className="t-caption m-0 text-center text-ink-muted">goes to {goes}</p>
            </div>
          </article>
        ))}
      </div>

      <section className="th-card mt-6 p-5">
        <div className="flex items-start gap-3">
          <Info size={20} strokeWidth={1.75} aria-hidden className="mt-1 flex-none text-maroon" />
          <div>
            <h2 className="t-title m-0">PayPal sandbox: no real money moves</h2>
            <p className="t-body m-0 mt-1">
              Checkout runs against the PayPal sandbox. Pay with the sandbox buyer account below — not a real PayPal
              login.
            </p>
            <dl className="t-body mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              <dt className="text-ink-muted">Buyer email</dt>
              <dd className="m-0 font-mono">{buyerEmail ?? "— set SANDBOX_BUYER_EMAIL in .env.local (M3)"}</dd>
              <dt className="text-ink-muted">Password</dt>
              <dd className="m-0 font-mono">{buyerPassword ?? "— set SANDBOX_BUYER_PASSWORD in .env.local (M3)"}</dd>
            </dl>
          </div>
        </div>
      </section>

      <footer className="th-row mt-6 justify-center">
        <a href={REPO_URL} className="th-btn th-btn--ghost" target="_blank" rel="noreferrer">
          <Code size={20} strokeWidth={1.75} aria-hidden />
          Code and README on GitHub
        </a>
      </footer>
    </main>
  );
}
