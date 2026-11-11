import { env } from "@/lib/env";
import { paypalFetch } from "./client";

/**
 * BUILD_PLAN 11.7. Every event is verified with PayPal before we act on it:
 * the endpoint is public, so an unverified body is just a stranger's claim
 * that someone got paid.
 */

export const WEBHOOK_EVENTS = [
  "CHECKOUT.ORDER.APPROVED",
  "PAYMENT.CAPTURE.COMPLETED",
  "PAYMENT.CAPTURE.DENIED",
  "PAYMENT.CAPTURE.REFUNDED",
  "PAYMENT.PAYOUTSBATCH.SUCCESS",
  "PAYMENT.PAYOUTSBATCH.DENIED",
  "PAYMENT.PAYOUTS-ITEM.SUCCEEDED",
  "PAYMENT.PAYOUTS-ITEM.FAILED",
  "PAYMENT.PAYOUTS-ITEM.UNCLAIMED",
] as const;

export interface WebhookHeaders {
  authAlgo: string | null;
  certUrl: string | null;
  transmissionId: string | null;
  transmissionSig: string | null;
  transmissionTime: string | null;
}

export function readWebhookHeaders(h: Headers): WebhookHeaders {
  return {
    authAlgo: h.get("paypal-auth-algo"),
    certUrl: h.get("paypal-cert-url"),
    transmissionId: h.get("paypal-transmission-id"),
    transmissionSig: h.get("paypal-transmission-sig"),
    transmissionTime: h.get("paypal-transmission-time"),
  };
}

/**
 * Asks PayPal whether it really sent this. Returns false when the webhook id
 * is not configured yet, so an unconfigured deployment rejects events rather
 * than trusting them.
 */
export async function verifyWebhookSignature(headers: WebhookHeaders, event: unknown): Promise<boolean> {
  const webhookId = env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.warn("[thari] PAYPAL_WEBHOOK_ID is not set; refusing the event");
    return false;
  }
  if (
    !headers.authAlgo ||
    !headers.certUrl ||
    !headers.transmissionId ||
    !headers.transmissionSig ||
    !headers.transmissionTime
  ) {
    return false;
  }

  try {
    const res = await paypalFetch<{ verification_status?: string }>("/v1/notifications/verify-webhook-signature", {
      method: "POST",
      requestId: `verify-${headers.transmissionId}`,
      body: {
        auth_algo: headers.authAlgo,
        cert_url: headers.certUrl,
        transmission_id: headers.transmissionId,
        transmission_sig: headers.transmissionSig,
        transmission_time: headers.transmissionTime,
        webhook_id: webhookId,
        webhook_event: event,
      },
    });
    return res.verification_status === "SUCCESS";
  } catch (err) {
    console.error("[thari] webhook verification call failed", err);
    return false;
  }
}

export interface PayPalEvent {
  id: string;
  event_type: string;
  resource?: Record<string, unknown>;
}

/** Map a payout item's PayPal status onto ours. */
export function payoutStatusFor(eventType: string): "SUCCEEDED" | "FAILED" | null {
  switch (eventType) {
    case "PAYMENT.PAYOUTS-ITEM.SUCCEEDED":
      return "SUCCEEDED";
    case "PAYMENT.PAYOUTS-ITEM.FAILED":
    case "PAYMENT.PAYOUTS-ITEM.UNCLAIMED":
      // Unclaimed money has not reached her, so it is not success. The co-op
      // sees it as failed and can retry to a corrected address.
      return "FAILED";
    default:
      return null;
  }
}

/** Our order id travels on the capture as custom_id (set when the order was created). */
export function ourOrderIdFromCapture(resource: Record<string, unknown> | undefined): string | null {
  if (!resource) return null;
  const custom = resource.custom_id;
  if (typeof custom === "string" && custom) return custom;
  const supp = resource.supplementary_data as { related_ids?: { order_id?: string } } | undefined;
  return supp?.related_ids?.order_id ?? null;
}

/** Our Payout row id travels as sender_item_id. */
export function payoutIdFromItem(resource: Record<string, unknown> | undefined): string | null {
  if (!resource) return null;
  const item = resource.payout_item as { sender_item_id?: string } | undefined;
  return item?.sender_item_id ?? null;
}
