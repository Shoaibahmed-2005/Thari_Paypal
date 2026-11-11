/** Read-only: which addresses payouts would actually be sent to. */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const weavers = await db.user.findMany({ where: { role: "WEAVER" }, select: { name: true, paypalEmail: true } });
  for (const w of weavers) console.log("  weaver " + w.name + " -> " + w.paypalEmail);
  const coop = await db.coop.findFirst({ select: { name: true, paypalEmail: true } });
  console.log("  coop   " + coop?.name + " -> " + coop?.paypalEmail);
}

main().finally(() => db.$disconnect());
