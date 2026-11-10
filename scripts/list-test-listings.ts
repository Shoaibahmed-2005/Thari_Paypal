/** Read-only: lists listings that did not come from the seed. */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";
const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) });
async function main() {
  const rows = await db.listing.findMany({
    where: { NOT: { id: { startsWith: "seed-" } } },
    select: { id: true, status: true, title: true },
    orderBy: { createdAt: "asc" },
  });
  for (const r of rows) console.log(`${r.id}  ${r.status.padEnd(17)} ${r.title ?? ""}`);
  console.log(`${rows.length} non-seed listing(s)`);
}
main().finally(() => db.$disconnect());
