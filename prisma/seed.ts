/**
 * Idempotent seed (BUILD_PLAN 14.1). Fixed ids + upserts, so running it twice changes nothing.
 * Run: npx prisma db seed
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";
import { inrToUsdCents, splitPayout } from "../src/lib/money";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set in .env.local");
const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: url }) });

const FX = Number(process.env.FX_INR_PER_USD ?? 88);
const SHIPPING_CENTS = Number(process.env.SHIPPING_USD ?? 20) * 100;
const COMMISSION = Number(process.env.DEFAULT_COOP_COMMISSION_PCT ?? 10);
const WEAVER_EMAIL = process.env.SANDBOX_WEAVER_EMAIL || "weaver-sandbox@example.com";
const COOP_EMAIL = process.env.SANDBOX_COOP_EMAIL || "coop-sandbox@example.com";
const BUYER_EMAIL = process.env.SANDBOX_BUYER_EMAIL || "buyer-sandbox@example.com";
/** Real handloom clip supplied for M7, served from /public/media. */
const LOOM_CLIP = "/media/loom-handloom.mp4";

type SeedListing = {
  id: string;
  weaver: "lakshmi" | "meena" | "selvi";
  title: string;
  titleTa: string;
  category: string;
  fabric: string;
  weave: string;
  colors: string[];
  motifs: string[];
  includesBlouse: boolean;
  lengthMeters: number | null;
  weeksToWeave: number;
  priceInr: number;
  verified: boolean;
  giTag?: string;
  description: string;
  story: string;
  /** Real photos under /public/media (M7). Listings without any fall back to the woven placeholder. */
  photos?: string[];
};

const WEAVERS = {
  lakshmi: { id: "seed-weaver-lakshmi", name: "Lakshmi R.", town: "Kanchipuram", bioEn: "Lakshmi has woven silk on a pit loom in Kanchipuram for twenty years, like her mother before her." },
  meena: { id: "seed-weaver-meena", name: "Meena S.", town: "Karaikudi", bioEn: "Meena weaves Chettinad cotton in Karaikudi, known for bold checks and contrast borders." },
  selvi: { id: "seed-weaver-selvi", name: "Selvi K.", town: "Arani", bioEn: "Selvi weaves silk and silk-cotton in Arani, mixing traditional buttas with bright colours." },
} as const;

const LISTINGS: SeedListing[] = [
  { id: "seed-l1", weaver: "lakshmi", title: "Kanchipuram silk saree, marigold orange with blue and maroon zari borders", titleTa: "ஆரஞ்சு பட்டுப் புடவை", category: "saree", fabric: "silk", weave: "Kanchipuram", colors: ["orange", "blue", "maroon"], motifs: ["zari border"], includesBlouse: true, lengthMeters: 6.5, weeksToWeave: 6, priceInr: 18000, verified: true, giTag: "Kanchipuram Silk (GI)", description: "A handwoven Kanchipuram silk saree in marigold orange, with a royal blue border in gold zari and a contrasting maroon zari border on the pallu. Comes with an unstitched blouse piece. Woven on a pit loom with interlocked borders, the traditional Kanchipuram technique.", story: "Lakshmi wove this saree over six weeks in Kanchipuram. The two borders are different colours, each worked thread by thread with a second shuttle, which is why the colour stays crisp on both sides.", photos: ["/media/seed-l1-1.jpg"] },
  { id: "seed-l2", weaver: "lakshmi", title: "Kanchipuram silk saree, deep green with purple peacock border", titleTa: "பச்சை பட்டுப் புடவை", category: "saree", fabric: "silk", weave: "Kanchipuram", colors: ["green", "purple", "gold"], motifs: ["peacock border"], includesBlouse: true, lengthMeters: 6.3, weeksToWeave: 7, priceInr: 22880, verified: true, description: "Deep green Kanchipuram silk with fine gold stripes in the body and a wide aubergine-purple border carrying a row of gold-zari peacocks. Unstitched blouse piece included.", story: "Lakshmi wove the peacock row her grandmother used to weave, and set it against a deep green body.", photos: ["/media/seed-l2-1.jpg"] },
  { id: "seed-l3", weaver: "selvi", title: "Arani silk saree, rani pink with green and gold zari border", titleTa: "இளஞ்சிவப்பு பட்டுப் புடவை", category: "saree", fabric: "silk", weave: "Arani", colors: ["pink", "green", "gold"], motifs: ["zari border"], includesBlouse: true, lengthMeters: 6.2, weeksToWeave: 4, priceInr: 14080, verified: true, description: "A light Arani silk saree in rani pink with a bottle-green border filled with gold zari. Easy to wear and drape.", story: "Selvi wove this in Arani, where silk is woven for everyday wear as well as festivals.", photos: ["/media/seed-l3-1.jpg"] },
  { id: "seed-l4", weaver: "selvi", title: "Arani silk saree, violet checks with gold buttas", titleTa: "ஊதா பட்டுப் புடவை", category: "saree", fabric: "silk", weave: "Arani", colors: ["violet", "blue", "gold"], motifs: ["buttas", "elephant border"], includesBlouse: false, lengthMeters: 5.5, weeksToWeave: 5, priceInr: 15840, verified: false, description: "Violet silk saree with a fine gold check across the body, large woven buttas, and a blue border carrying elephants and peacocks in zari. No blouse piece.", story: "Selvi scattered large buttas across this violet silk, each one woven in by hand.", photos: ["/media/seed-l4-1.jpg"] },
  { id: "seed-l5", weaver: "meena", title: "Chettinad cotton saree, indigo and white checks", titleTa: "நீலக் கட்டம் பருத்திப் புடவை", category: "saree", fabric: "cotton", weave: "Chettinad", colors: ["indigo", "white"], motifs: ["checks"], includesBlouse: false, lengthMeters: 5.5, weeksToWeave: 2, priceInr: 5720, verified: true, description: "Crisp Chettinad cotton in indigo and white checks with a contrast border.", story: "Meena wove this in Karaikudi in the Chettinad style: thick cotton, bold checks and a firm border." },
  { id: "seed-l6", weaver: "meena", title: "Chettinad cotton saree, mango yellow with red border", titleTa: "மஞ்சள் பருத்திப் புடவை", category: "saree", fabric: "cotton", weave: "Chettinad", colors: ["yellow", "red"], motifs: ["contrast border"], includesBlouse: false, lengthMeters: 5.5, weeksToWeave: 2, priceInr: 3960, verified: true, description: "Mango yellow Chettinad cotton with a red contrast border. Breathable for daily wear.", story: "Meena paired mango yellow with a red border, a classic Chettinad combination." },
  { id: "seed-l7", weaver: "meena", title: "Chettinad cotton saree, rust with black stripes", titleTa: "துரு நிற பருத்திப் புடவை", category: "saree", fabric: "cotton", weave: "Chettinad", colors: ["rust", "black"], motifs: ["stripes"], includesBlouse: true, lengthMeters: 6.2, weeksToWeave: 3, priceInr: 7920, verified: false, description: "Rust Chettinad cotton with black stripes and a blouse piece.", story: "Meena wove the stripes in black to set off the warm rust body." },
  { id: "seed-l8", weaver: "selvi", title: "Cotton dupatta, coral with zari edge", titleTa: "பவள நிற துப்பட்டா", category: "dupatta", fabric: "cotton", weave: "Arani", colors: ["coral"], motifs: ["zari edge"], includesBlouse: false, lengthMeters: 2.4, weeksToWeave: 1, priceInr: 3080, verified: true, description: "A soft cotton dupatta in coral with a fine zari edge.", story: "Selvi wove this dupatta between saree commissions, using the same coral as her festival sarees." },
];

const SOLD: SeedListing = { id: "seed-l9", weaver: "lakshmi", title: "Kanchipuram silk saree, red with gold buttas and green zari pallu", titleTa: "சிவப்பு பட்டுப் புடவை", category: "saree", fabric: "silk", weave: "Kanchipuram", colors: ["red", "gold", "green"], motifs: ["buttas"], includesBlouse: true, lengthMeters: 6.5, weeksToWeave: 6, priceInr: 18480, verified: true, description: "Red Kanchipuram silk covered in gold-zari buttas, with a heavy gold pallu and a green selvedge.", story: "Lakshmi wove the buttas row by row over six weeks, then the full-gold pallu at the end.", photos: ["/media/seed-l9-1.jpg"] };

async function main() {
  const coop = await db.coop.upsert({
    where: { id: "seed-coop" },
    update: { paypalEmail: COOP_EMAIL, commissionPct: COMMISSION },
    create: { id: "seed-coop", name: "Kanchipuram Weavers' Co-op", town: "Kanchipuram", paypalEmail: COOP_EMAIL, commissionPct: COMMISSION },
  });

  for (const w of Object.values(WEAVERS)) {
    await db.user.upsert({
      where: { id: w.id },
      update: { paypalEmail: WEAVER_EMAIL, bioEn: w.bioEn },
      create: { id: w.id, role: "WEAVER", name: w.name, town: w.town, bioEn: w.bioEn, paypalEmail: WEAVER_EMAIL, coopId: coop.id },
    });
  }
  const buyer = await db.user.upsert({
    where: { id: "seed-buyer-emma" },
    update: { email: BUYER_EMAIL },
    create: { id: "seed-buyer-emma", role: "BUYER", name: "Emma Clarke", town: "Boston", email: BUYER_EMAIL },
  });
  await db.user.upsert({
    where: { id: "seed-coop-priya" },
    update: {},
    create: { id: "seed-coop-priya", role: "COOP_ADMIN", name: "Priya N.", town: "Kanchipuram", coopId: coop.id },
  });

  const confirmedAt = new Date("2026-11-01T10:00:00Z");
  for (const l of [...LISTINGS, SOLD]) {
    const status = l.id === SOLD.id ? "SOLD" : "LIVE";
    const data = {
      weaverId: WEAVERS[l.weaver].id,
      status,
      title: l.title,
      titleTa: l.titleTa,
      description: l.description,
      story: l.story,
      category: l.category,
      fabric: l.fabric,
      weave: l.weave,
      colors: l.colors,
      motifs: l.motifs,
      includesBlouse: l.includesBlouse,
      stitched: false,
      lengthMeters: l.lengthMeters,
      weeksToWeave: l.weeksToWeave,
      giTag: l.giTag ?? null,
      priceInr: l.priceInr,
      priceUsdCents: inrToUsdCents(l.priceInr, FX),
      // Real loom clip (M7) in /public/media; verified = clip + co-op confirmation.
      loomClipUrl: l.verified ? LOOM_CLIP : null,
      coopConfirmedAt: l.verified ? confirmedAt : null,
    } as const;
    await db.listing.upsert({ where: { id: l.id }, update: data, create: { id: l.id, ...data } });

    // Photos: fixed ids so re-seeding replaces rather than duplicates.
    for (const [i, url] of (l.photos ?? []).entries()) {
      const id = `${l.id}-p${i + 1}`;
      await db.photo.upsert({
        where: { id },
        update: { url, position: i },
        create: { id, listingId: l.id, url, position: i },
      });
    }
  }

  // One PAID order on the sold listing, with succeeded payouts and a heard notification.
  const item = inrToUsdCents(SOLD.priceInr, FX);
  const order = await db.order.upsert({
    where: { id: "seed-order-1" },
    update: {},
    create: {
      id: "seed-order-1",
      listingId: SOLD.id,
      buyerId: buyer.id,
      status: "PAID",
      channel: "WEB",
      paypalOrderId: "SEED-PAYPAL-ORDER-1",
      captureId: "SEED-CAPTURE-1",
      itemUsdCents: item,
      shippingUsdCents: SHIPPING_CENTS,
      totalUsdCents: item + SHIPPING_CENTS,
      payerEmail: BUYER_EMAIL,
      fulfilledAt: new Date("2026-11-05T09:00:00Z"),
    },
  });
  const split = splitPayout(item, COMMISSION);
  for (const [recipient, email, amount] of [
    ["WEAVER", WEAVER_EMAIL, split.weaverUsdCents],
    ["COOP", COOP_EMAIL, split.coopUsdCents],
  ] as const) {
    await db.payout.upsert({
      where: { orderId_recipient: { orderId: order.id, recipient } },
      update: {},
      create: { orderId: order.id, recipient, receiverEmail: email, amountUsdCents: amount, status: "SUCCEEDED", paypalBatchId: "SEED-BATCH-1" },
    });
  }
  const weaverInr = Math.round((split.weaverUsdCents / 100) * FX);
  await db.notification.upsert({
    where: { id: "seed-notif-1" },
    update: {},
    create: {
      id: "seed-notif-1",
      userId: WEAVERS.lakshmi.id,
      kind: "SOLD",
      textTa: `உங்கள் ${SOLD.titleTa} விற்பனையானது. ₹${weaverInr.toLocaleString("en-IN")} உங்களுக்கு வருகிறது.`,
      textEn: `Your ${SOLD.title} sold. ₹${weaverInr.toLocaleString("en-IN")} is coming to you.`,
      orderId: order.id,
      heardAt: new Date("2026-11-05T09:05:00Z"),
    },
  });

  const counts = await Promise.all([db.listing.count({ where: { status: "LIVE" } }), db.order.count(), db.payout.count(), db.photo.count()]);
  console.log(`Seeded: ${counts[0]} live listings, ${counts[1]} orders, ${counts[2]} payouts, ${counts[3]} photos`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
