import { describe, expect, it } from "vitest";
import {
  LISTING_STATUSES,
  ORDER_STATUSES,
  TransitionError,
  canTransitionOrder,
  transitionListing,
  transitionOrder,
  type OrderStatus,
} from "@/lib/fsm";

const ALLOWED_ORDER: [OrderStatus, OrderStatus][] = [
  ["CREATED", "PAID"],
  ["CREATED", "FAILED"],
  ["PAID", "SHIPPED"],
  ["SHIPPED", "DELIVERED"],
  ["PAID", "REFUNDED"],
  ["SHIPPED", "REFUNDED"],
  ["DELIVERED", "REFUNDED"],
];

describe("order fsm", () => {
  it("allows exactly the documented transitions", () => {
    for (const from of ORDER_STATUSES) {
      for (const to of ORDER_STATUSES) {
        const expected = ALLOWED_ORDER.some(([f, t]) => f === from && t === to);
        expect(canTransitionOrder(from, to), `${from}→${to}`).toBe(expected);
        if (expected) expect(transitionOrder(from, to)).toBe(to);
        else expect(() => transitionOrder(from, to)).toThrow(TransitionError);
      }
    }
  });
});

describe("listing fsm", () => {
  it("follows the happy path", () => {
    let s = transitionListing("DRAFT", "NEEDS_ANSWERS");
    s = transitionListing(s, "READY_TO_CONFIRM");
    s = transitionListing(s, "LIVE");
    s = transitionListing(s, "SOLD");
    expect(s).toBe("SOLD");
  });

  it("forbids skipping to LIVE or leaving ARCHIVED", () => {
    expect(() => transitionListing("DRAFT", "LIVE")).toThrow(TransitionError);
    expect(() => transitionListing("NEEDS_ANSWERS", "LIVE")).toThrow(TransitionError);
    for (const to of LISTING_STATUSES) {
      expect(() => transitionListing("ARCHIVED", to)).toThrow(TransitionError);
    }
  });
});
