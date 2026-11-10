import { describe, expect, it } from "vitest";
import {
  fulfillOrder,
  soldTextNative,
  type FulfillDeps,
  type FulfillOrderRow,
  type NotificationRow,
  type PayoutBatch,
  type PayoutRow,
} from "@/lib/paypal/fulfill";
import { splitPayout } from "@/lib/money";

const FX = 88;

/** An in-memory stand-in for the database, with the same idempotency rules. */
function makeDeps(overrides: Partial<FulfillDeps> = {}) {
  const state = {
    fulfilledAt: null as Date | null,
    orderStatus: "CREATED" as FulfillOrderRow["status"],
    listingStatus: "LIVE" as FulfillOrderRow["listing"]["status"],
    payouts: new Map<string, PayoutRow>(),
    notifications: new Map<string, NotificationRow>(),
    batches: [] as PayoutBatch[],
    logs: [] as string[],
    payoutsSentBatchId: null as string | null,
    payoutsError: null as string | null,
  };

  const order: FulfillOrderRow = {
    id: "o1",
    get status() {
      return state.orderStatus;
    },
    listingId: "l1",
    itemUsdCents: 20_500,
    listing: {
      get status() {
        return state.listingStatus;
      },
      title: "Kanchipuram silk saree",
      titleNative: "ஆரஞ்சு பட்டுப் புடவை",
      lang: "ta",
      weaverId: "w1",
      weaver: { paypalEmail: "weaver@sandbox.test" },
      coop: { paypalEmail: "coop@sandbox.test", commissionPct: 10 },
    },
  };

  const deps: FulfillDeps = {
    // The atomic "set fulfilledAt only if null" that the real query does.
    async claimOrder(_id, at) {
      if (state.fulfilledAt) return 0;
      state.fulfilledAt = at;
      return 1;
    },
    async loadOrder() {
      return order;
    },
    async markOrderPaid(_id, status) {
      state.orderStatus = status;
    },
    async markListingSold(_id, status) {
      state.listingStatus = status;
    },
    // Unique on (orderId, recipient), like the schema.
    async upsertPayout(row) {
      const key = `${row.orderId}:${row.recipient}`;
      state.payouts.set(key, row);
      return key;
    },
    async sendPayoutBatch(batch) {
      state.batches.push(batch);
      return { batchId: "BATCH-1" };
    },
    async markPayoutsSent(_id, batchId) {
      state.payoutsSentBatchId = batchId;
    },
    async markPayoutsFailed(_id, error) {
      state.payoutsError = error;
    },
    async upsertNotification(n) {
      state.notifications.set(n.id, n);
    },
    async log(action) {
      state.logs.push(action);
    },
    ...overrides,
  };

  return { deps, state };
}

describe("fulfillOrder", () => {
  it("pays, splits and notifies on the first run", async () => {
    const { deps, state } = makeDeps();
    const result = await fulfillOrder("o1", deps, FX);

    expect(result).toEqual({ done: true, alreadyFulfilled: false, payoutsSent: true });
    expect(state.orderStatus).toBe("PAID");
    expect(state.listingStatus).toBe("SOLD");
    expect(state.payouts.size).toBe(2);
    expect(state.notifications.size).toBe(1);
    expect(state.batches).toHaveLength(1);
  });

  it("is idempotent: a second run changes nothing (BUILD_PLAN 11.6)", async () => {
    const { deps, state } = makeDeps();
    await fulfillOrder("o1", deps, FX);
    const second = await fulfillOrder("o1", deps, FX);

    expect(second).toEqual({ done: true, alreadyFulfilled: true });
    expect(state.payouts.size).toBe(2);
    expect(state.notifications.size).toBe(1);
    expect(state.batches).toHaveLength(1); // no second payout batch
  });

  it("splits the item total without losing or creating a cent", async () => {
    const { deps, state } = makeDeps();
    await fulfillOrder("o1", deps, FX);

    const amounts = [...state.payouts.values()].map((p) => p.amountUsdCents);
    expect(amounts.reduce((a, b) => a + b, 0)).toBe(20_500);
    const expected = splitPayout(20_500, 10);
    expect(state.payouts.get("o1:WEAVER")?.amountUsdCents).toBe(expected.weaverUsdCents);
    expect(state.payouts.get("o1:COOP")?.amountUsdCents).toBe(expected.coopUsdCents);
  });

  it("keeps the order paid when the payout batch fails", async () => {
    const { deps, state } = makeDeps({
      async sendPayoutBatch() {
        throw new Error("RECEIVER_UNREGISTERED");
      },
    });
    const result = await fulfillOrder("o1", deps, FX);

    expect(result).toEqual({ done: true, alreadyFulfilled: false, payoutsSent: false });
    expect(state.orderStatus).toBe("PAID");
    expect(state.payoutsError).toBe("RECEIVER_UNREGISTERED");
    // She is still told about the sale even if the money is stuck.
    expect(state.notifications.size).toBe(1);
  });

  it("still fulfils when the weaver has no PayPal email", async () => {
    const { deps, state } = makeDeps();
    const result = await fulfillOrder("o1", { ...deps, async loadOrder() {
      const o = await deps.loadOrder("o1");
      return o && { ...o, listing: { ...o.listing, weaver: { paypalEmail: null } } };
    } }, FX);

    expect(result).toMatchObject({ done: true, alreadyFulfilled: false, payoutsSent: false });
    expect(state.payouts.size).toBe(0);
    expect(state.notifications.size).toBe(1);
  });

  it("notifies in the weaver's own language", async () => {
    const { deps, state } = makeDeps();
    await fulfillOrder("o1", deps, FX);
    const n = state.notifications.get("notif-sold-o1");
    expect(n?.lang).toBe("ta");
    expect(n?.textNative).toContain("விற்பனையானது");
    expect(n?.textEn).toContain("sold");
  });
});

describe("soldTextNative", () => {
  it("uses the exact Tamil template from BUILD_PLAN 10.4", () => {
    expect(soldTextNative("ta", "ஆரஞ்சு பட்டுப் புடவை", 16_200)).toBe(
      "உங்கள் ஆரஞ்சு பட்டுப் புடவை விற்பனையானது. ₹16,200 உங்களுக்கு வருகிறது.",
    );
  });

  it("falls back to English for a language it has no template for", () => {
    expect(soldTextNative("fr", "saree", 1000)).toBe("Your saree sold. ₹1,000 is coming to you.");
  });
});
