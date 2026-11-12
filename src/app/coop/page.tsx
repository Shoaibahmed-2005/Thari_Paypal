import type { Metadata } from "next";
import { CoopDashboard } from "@/components/CoopDashboard";
import { getCoopAdmin, getCoopData } from "@/lib/coop";
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

export const metadata: Metadata = { title: "Co-op dashboard — Thari" };

export default async function CoopPage() {
  const admin = await getCoopAdmin();
  if (!admin) return <SignedOut role="coop" />;

  const data = await getCoopData();

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
      <CoopDashboard data={data} coopName={admin.coop?.name ?? "Weavers' co-op"} />
    </main>
  );
}
