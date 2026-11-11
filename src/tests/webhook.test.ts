import { describe, expect, it } from "vitest";
import {
  WEBHOOK_EVENTS,
  ourOrderIdFromCapture,
  payoutIdFromItem,
  payoutStatusFor,
  readWebhookHeaders,
} from "@/lib/paypal/webhook";

describe("payoutStatusFor", () => {
  it("maps a succeeded item to SUCCEEDED", () => {
    expect(payoutStatusFor("PAYMENT.PAYOUTS-ITEM.SUCCEEDED")).toBe("SUCCEEDED");
  });

  it("treats UNCLAIMED as failed, because the weaver has not been paid", () => {
    // Unclaimed money is sitting at PayPal, not in her account. Calling it a
    // success would tell her she has money she cannot spend — and hide the
    // row from the co-op's Retry button.
    expect(payoutStatusFor("PAYMENT.PAYOUTS-ITEM.UNCLAIMED")).toBe("FAILED");
    expect(payoutStatusFor("PAYMENT.PAYOUTS-ITEM.FAILED")).toBe("FAILED");
  });

  it("ignores event types that are not payout items", () => {
    expect(payoutStatusFor("PAYMENT.CAPTURE.COMPLETED")).toBeNull();
    expect(payoutStatusFor("anything.else")).toBeNull();
  });
});

describe("ourOrderIdFromCapture", () => {
  it("reads custom_id, which is where we put our order id", () => {
    expect(ourOrderIdFromCapture({ custom_id: "order-123" })).toBe("order-123");
  });

  it("falls back to supplementary related ids", () => {
    expect(ourOrderIdFromCapture({ supplementary_data: { related_ids: { order_id: "pp-9" } } })).toBe("pp-9");
  });

  it("returns null rather than guessing", () => {
    expect(ourOrderIdFromCapture({})).toBeNull();
    expect(ourOrderIdFromCapture(undefined)).toBeNull();
    expect(ourOrderIdFromCapture({ custom_id: "" })).toBeNull();
  });
});

describe("payoutIdFromItem", () => {
  it("reads sender_item_id, which is our Payout row id", () => {
    expect(payoutIdFromItem({ payout_item: { sender_item_id: "payout-7" } })).toBe("payout-7");
  });

  it("returns null when absent", () => {
    expect(payoutIdFromItem({})).toBeNull();
  });
});

describe("readWebhookHeaders", () => {
  it("pulls the five headers PayPal signs with", () => {
    const h = new Headers({
      "paypal-auth-algo": "SHA256withRSA",
      "paypal-cert-url": "https://api.sandbox.paypal.com/cert.pem",
      "paypal-transmission-id": "tid",
      "paypal-transmission-sig": "sig",
      "paypal-transmission-time": "2026-11-11T00:00:00Z",
    });
    expect(readWebhookHeaders(h)).toEqual({
      authAlgo: "SHA256withRSA",
      certUrl: "https://api.sandbox.paypal.com/cert.pem",
      transmissionId: "tid",
      transmissionSig: "sig",
      transmissionTime: "2026-11-11T00:00:00Z",
    });
  });

  it("reports missing headers as null rather than empty strings", () => {
    expect(readWebhookHeaders(new Headers()).transmissionSig).toBeNull();
  });
});

describe("the subscribed event list", () => {
  it("covers every event the handler acts on (BUILD_PLAN 11.7)", () => {
    for (const e of [
      "PAYMENT.CAPTURE.COMPLETED",
      "PAYMENT.CAPTURE.DENIED",
      "PAYMENT.CAPTURE.REFUNDED",
      "PAYMENT.PAYOUTS-ITEM.SUCCEEDED",
      "PAYMENT.PAYOUTS-ITEM.FAILED",
      "PAYMENT.PAYOUTS-ITEM.UNCLAIMED",
      "PAYMENT.PAYOUTSBATCH.DENIED",
    ]) {
      expect(WEBHOOK_EVENTS).toContain(e);
    }
  });
});
