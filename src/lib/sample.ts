import type { ListingCardData } from "@/components/ListingCard";

/**
 * TEMPORARY static data so the brand components can be checked before the
 * database exists (M5). Replace with Prisma queries once prisma/seed.ts runs.
 */
export const SAMPLE_LISTINGS: ListingCardData[] = [
  { id: "s1", title: "Kanchipuram silk saree, orange and yellow, peacock border", weaverName: "Lakshmi R.", town: "Kanchipuram", priceUsdCents: 20500, verified: true, seed: 1 },
  { id: "s2", title: "Kanchipuram silk saree, deep green with temple border", weaverName: "Lakshmi R.", town: "Kanchipuram", priceUsdCents: 26000, verified: true, seed: 2 },
  { id: "s3", title: "Arani silk-cotton saree, maroon with gold checks", weaverName: "Selvi K.", town: "Arani", priceUsdCents: 16000, verified: true, seed: 3 },
  { id: "s4", title: "Arani silk saree, mustard with small buttas", weaverName: "Selvi K.", town: "Arani", priceUsdCents: 18000, verified: false, seed: 4 },
  { id: "s5", title: "Chettinad cotton saree, indigo and white checks", weaverName: "Meena S.", town: "Karaikudi", priceUsdCents: 6500, verified: true, seed: 5 },
  { id: "s6", title: "Chettinad cotton saree, mango yellow with red border", weaverName: "Meena S.", town: "Karaikudi", priceUsdCents: 4500, verified: true, seed: 6 },
  { id: "s7", title: "Chettinad cotton saree, rust with black stripes", weaverName: "Meena S.", town: "Karaikudi", priceUsdCents: 9000, verified: false, seed: 7 },
  { id: "s8", title: "Cotton dupatta, coral with zari edge", weaverName: "Selvi K.", town: "Arani", priceUsdCents: 3500, verified: true, seed: 8 },
];
