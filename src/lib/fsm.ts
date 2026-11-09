/** Order and listing state machines (section 7). String unions mirror the Prisma enums. */

export type OrderStatus = "CREATED" | "PAID" | "SHIPPED" | "DELIVERED" | "REFUNDED" | "FAILED";
export type ListingStatus =
  | "DRAFT"
  | "NEEDS_ANSWERS"
  | "READY_TO_CONFIRM"
  | "LIVE"
  | "SOLD"
  | "ARCHIVED";

export class TransitionError extends Error {
  constructor(kind: string, from: string, to: string) {
    super(`Invalid ${kind} transition: ${from} → ${to}`);
    this.name = "TransitionError";
  }
}

const ORDER: Record<OrderStatus, readonly OrderStatus[]> = {
  CREATED: ["PAID", "FAILED"],
  PAID: ["SHIPPED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  REFUNDED: [],
  FAILED: [],
};

const LISTING: Record<ListingStatus, readonly ListingStatus[]> = {
  DRAFT: ["NEEDS_ANSWERS", "READY_TO_CONFIRM"],
  NEEDS_ANSWERS: ["NEEDS_ANSWERS", "READY_TO_CONFIRM"],
  READY_TO_CONFIRM: ["NEEDS_ANSWERS", "LIVE", "DRAFT"],
  LIVE: ["SOLD", "ARCHIVED"],
  SOLD: ["LIVE"], // relist after refund (section 11.9)
  ARCHIVED: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER[from].includes(to);
}

export function transitionOrder(from: OrderStatus, to: OrderStatus): OrderStatus {
  if (!canTransitionOrder(from, to)) throw new TransitionError("order", from, to);
  return to;
}

export function canTransitionListing(from: ListingStatus, to: ListingStatus): boolean {
  return LISTING[from].includes(to);
}

export function transitionListing(from: ListingStatus, to: ListingStatus): ListingStatus {
  if (!canTransitionListing(from, to)) throw new TransitionError("listing", from, to);
  return to;
}

export const ORDER_STATUSES = Object.keys(ORDER) as OrderStatus[];
export const LISTING_STATUSES = Object.keys(LISTING) as ListingStatus[];
