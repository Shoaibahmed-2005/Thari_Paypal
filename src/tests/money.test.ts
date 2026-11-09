import { describe, expect, it } from "vitest";
import {
  centsToPaypalValue,
  formatInr,
  formatUsd,
  inrToUsdCents,
  orderTotals,
  splitPayout,
} from "@/lib/money";

describe("money", () => {
  it("converts INR to whole-dollar USD cents", () => {
    expect(inrToUsdCents(18000, 88)).toBe(20500); // 204.54 → $205
    expect(inrToUsdCents(4000, 88)).toBe(4500); // 45.45 → $45
    expect(inrToUsdCents(0, 88)).toBe(0);
  });

  it("rejects bad inputs", () => {
    expect(() => inrToUsdCents(-1, 88)).toThrow();
    expect(() => inrToUsdCents(100, 0)).toThrow();
  });

  it("computes totals with shipping", () => {
    expect(orderTotals(20500, 20)).toEqual({
      itemUsdCents: 20500,
      shippingUsdCents: 2000,
      totalUsdCents: 22500,
    });
  });

  it("splits without losing or creating a cent", () => {
    for (let item = 0; item <= 30000; item += 37) {
      for (const pct of [0, 7, 10, 15, 33, 100]) {
        const s = splitPayout(item, pct);
        expect(s.weaverUsdCents + s.coopUsdCents).toBe(item);
        expect(s.coopUsdCents).toBeGreaterThanOrEqual(0);
        expect(s.weaverUsdCents).toBeGreaterThanOrEqual(0);
      }
    }
    expect(splitPayout(20500, 10)).toEqual({ coopUsdCents: 2050, weaverUsdCents: 18450 });
  });

  it("rejects bad commission", () => {
    expect(() => splitPayout(100, 101)).toThrow();
    expect(() => splitPayout(100, 2.5)).toThrow();
  });

  it("formats", () => {
    expect(centsToPaypalValue(22500)).toBe("225.00");
    expect(centsToPaypalValue(18450)).toBe("184.50");
    expect(formatUsd(20500)).toBe("$205");
    expect(formatUsd(18450)).toBe("$184.50");
    expect(formatInr(18000)).toBe("₹18,000");
    expect(formatInr(162000)).toBe("₹1,62,000");
  });
});
