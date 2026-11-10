import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { Check } from "lucide-react";
import { BuyerBottomNav, TopNav } from "@/components/Nav";
import { StatusChip } from "@/components/ui";
import type { ChipStatus } from "@/components/ui";
import { formatUsd } from "@/lib/money";

export const metadata: Metadata = { title: "Thank you — Thari" };

const CHIP: Record<string, ChipStatus> = {
  PAID: "paid",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  REFUNDED: "refunded",
};

async function Confirmation({ orderId }: { orderId: string }) {
  await connection();
  const { getDb } = await import("@/lib/db");
  const order = await getDb().order.findUnique({
    where: { id: orderId },
    include: { listing: { include: { weaver: true } }, payouts: true },
  });
  if (!order) notFound();

  const weaverFirstName = order.listing.weaver.name.split(" ")[0];
  const payoutsSettled = order.payouts.some((p) => p.status === "SENT" || p.status === "SUCCEEDED");

  return (
    <>
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        {/* Coral check, drawn in CSS rather than shipped as an image. */}
        <span
          className="grid h-20 w-20 place-items-center bg-coral text-on-coral"
          style={{ borderRadius: "var(--radius-pill)", boxShadow: "var(--shadow-float)" }}
        >
          <Check size={40} strokeWidth={2.5} aria-hidden />
        </span>
        <h1 className="t-display m-0">Thank you.</h1>
        <p className="t-story m-0 max-w-[40ch] text-ink-muted">
          {weaverFirstName} has been told in her own language that her piece sold.
        </p>
      </div>

      <section className="th-card mx-auto max-w-[520px] p-5">
        <div className="th-row justify-between">
          <h2 className="t-title m-0">Your order</h2>
          <StatusChip status={CHIP[order.status] ?? "paid"} />
        </div>

        <dl className="t-body mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-ink-muted">Piece</dt>
          <dd className="m-0">
            <Link href={`/p/${order.listingId}`}>{order.listing.title ?? "Handwoven piece"}</Link>
          </dd>
          <dt className="text-ink-muted">Woven by</dt>
          <dd className="m-0">
            {order.listing.weaver.name}, {order.listing.weaver.town ?? "Tamil Nadu"}
          </dd>
          <dt className="text-ink-muted">Item</dt>
          <dd className="m-0">{formatUsd(order.itemUsdCents)}</dd>
          <dt className="text-ink-muted">Shipping</dt>
          <dd className="m-0">{formatUsd(order.shippingUsdCents)}</dd>
          <dt className="text-ink-muted">Total paid</dt>
          <dd className="m-0 font-bold">{formatUsd(order.totalUsdCents)}</dd>
          <dt className="text-ink-muted">PayPal order</dt>
          <dd className="m-0 break-all font-mono text-[13px]">{order.paypalOrderId}</dd>
        </dl>

        {payoutsSettled && (
          <p className="t-caption mt-4 text-ink-muted">
            The weaver&apos;s share and the co-op&apos;s commission have been sent through PayPal.
          </p>
        )}
      </section>

      <section className="mx-auto mt-4 max-w-[520px]">
        <h2 className="t-title">Track your order</h2>
        {order.trackingNumber ? (
          <p className="t-body m-0">
            {order.carrier ?? "Courier"}: <span className="font-mono">{order.trackingNumber}</span>
          </p>
        ) : (
          <p className="t-body m-0 text-ink-muted">
            Tracking appears here once {weaverFirstName} or the co-op ships it, usually in 3–5 days. PayPal will
            email you too.
          </p>
        )}
      </section>
    </>
  );
}

export default function SuccessPage({ params }: PageProps<"/checkout/success/[orderId]">) {
  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-[1200px] px-4 pb-[100px] pt-4 md:px-6 md:pb-12 md:pt-8">
        <Suspense fallback={<p className="t-body text-ink-muted">…</p>}>
          <ConfirmationLoader params={params} />
        </Suspense>
      </main>
      <BuyerBottomNav />
    </>
  );
}

async function ConfirmationLoader({ params }: { params: PageProps<"/checkout/success/[orderId]">["params"] }) {
  const { orderId } = await params;
  return <Confirmation orderId={orderId} />;
}
