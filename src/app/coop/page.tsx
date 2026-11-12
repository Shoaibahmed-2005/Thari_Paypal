import type { Metadata } from "next";
import { CoopDashboard } from "@/components/CoopDashboard";
import { getCoopAdmin, getCoopData } from "@/lib/coop";
import { SignedOut } from "@/components/SignedOut";

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
