/** Read-only: recent orders with their payouts and the weaver notification. */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { listing: { select: { title: true, status: true } }, payouts: true },
  });

  for (const o of orders) {
    console.log("");
    console.log(o.id);
    console.log("  paypalOrderId " + o.paypalOrderId);
    console.log(
      "  status " + o.status + "  captureId " + (o.captureId ?? "-") + "  fulfilledAt " + (o.fulfilledAt?.toISOString() ?? "-"),
    );
    console.log(
      "  total $" + (o.totalUsdCents / 100).toFixed(2) + '  listing "' + o.listing.title + '" (' + o.listing.status + ")",
    );
    for (const p of o.payouts) {
      console.log(
        "  payout " + p.recipient.padEnd(6) + " $" + (p.amountUsdCents / 100).toFixed(2) + " " + p.status + " " + (p.paypalBatchId ?? "") + " " + (p.error ?? ""),
      );
    }
    const n = await db.notification.findFirst({ where: { orderId: o.id } });
    if (n) console.log("  notification [" + n.lang + "] " + n.textNative);
  }

  const live = await db.listing.count({ where: { status: "LIVE" } });
  console.log("");
  console.log(live + " live listings");
}

main().finally(() => db.$disconnect());
