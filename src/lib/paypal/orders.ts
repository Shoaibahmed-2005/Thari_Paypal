import { env } from "@/lib/env";
import { paypalFetch, usd } from "./client";

/**
 * Orders v2, Payments v2 and Payouts v1 calls (BUILD_PLAN 11.2–11.5, 11.8, 11.9).
 * Every write passes a requestId derived from our own order id, so a retry is
 * never a second charge or a second payout.
 */

export interface CreateOrderArgs {
  ourOrderId: string;
  listingId: string;
  title: string;
  itemUsdCents: number;
  shippingUsdCents: number;
  /** Absolute https URL of the first photo, if there is one. */
  imageUrl?: string | null;
}

interface PayPalOrder {
  id: string;
  status: string;
  purchase_units?: {
    payments?: { captures?: { id: string; status: string }[] };
    shipping?: { name?: { full_name?: string }; address?: Record<string, unknown> };
    custom_id?: string;
  }[];
  payer?: { email_address?: string };
}

export async function createPayPalOrder(a: CreateOrderArgs): Promise<PayPalOrder> {
  const total = a.itemUsdCents + a.shippingUsdCents;
  const name = a.title.slice(0, 127);

  return paypalFetch<PayPalOrder>("/v2/checkout/orders", {
    method: "POST",
    requestId: `create-${a.ourOrderId}`,
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: a.listingId,
          custom_id: a.ourOrderId,
          invoice_id: `THARI-${a.ourOrderId}`,
          description: name,
          soft_descriptor: "THARI HANDLOOM",
          amount: {
            ...usd(total),
            breakdown: { item_total: usd(a.itemUsdCents), shipping: usd(a.shippingUsdCents) },
          },
          items: [
            {
              name,
              sku: a.listingId,
              quantity: "1",
              category: "PHYSICAL_GOODS",
              unit_amount: usd(a.itemUsdCents),
              ...(a.imageUrl ? { image_url: a.imageUrl } : {}),
              url: new URL(`/p/${a.listingId}`, env.APP_URL).toString(),
            },
          ],
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Thari",
            shipping_preference: "GET_FROM_FILE",
            user_action: "PAY_NOW",
            return_url: new URL("/checkout/return", env.APP_URL).toString(),
            cancel_url: new URL(`/p/${a.listingId}`, env.APP_URL).toString(),
          },
        },
      },
    },
  });
}

export interface CaptureResult {
  captureId: string | null;
  captureStatus: string | null;
  orderStatus: string;
  payerEmail: string | null;
  shippingAddress: unknown | null;
  ourOrderId: string | null;
}

export async function capturePayPalOrder(paypalOrderId: string, ourOrderId: string): Promise<CaptureResult> {
  const res = await paypalFetch<PayPalOrder>(`/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    requestId: `capture-${ourOrderId}`,
    body: {},
  });

  const unit = res.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  return {
    captureId: capture?.id ?? null,
    captureStatus: capture?.status ?? null,
    orderStatus: res.status,
    payerEmail: res.payer?.email_address ?? null,
    shippingAddress: unit?.shipping ?? null,
    ourOrderId: unit?.custom_id ?? null,
  };
}

/** BUILD_PLAN 11.4. One batch per order, so a retry can't pay twice. */
export interface PayoutItem {
  payoutId: string;
  receiverEmail: string;
  amountUsdCents: number;
  note: string;
}

export async function sendPayoutBatch(orderId: string, items: PayoutItem[]): Promise<{ batchId: string }> {
  const res = await paypalFetch<{ batch_header?: { payout_batch_id?: string } }>("/v1/payments/payouts", {
    method: "POST",
    requestId: `payout-${orderId}`,
    body: {
      sender_batch_header: {
        sender_batch_id: `THARI-${orderId}`,
        email_subject: "You have a payment from Thari",
        email_message: "Your handwoven piece sold on Thari.",
      },
      items: items.map((i) => ({
        recipient_type: "EMAIL",
        receiver: i.receiverEmail,
        amount: usd(i.amountUsdCents),
        sender_item_id: i.payoutId,
        note: i.note,
      })),
    },
  });

  const batchId = res.batch_header?.payout_batch_id;
  if (!batchId) throw new Error("PayPal accepted the payout but returned no batch id");
  return { batchId };
}

/** BUILD_PLAN 11.5. Non-blocking: a failure here must not stop a listing going live. */
export async function createCatalogProduct(a: {
  listingId: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
}): Promise<string | null> {
  try {
    const res = await paypalFetch<{ id?: string }>("/v1/catalogs/products", {
      method: "POST",
      requestId: `product-${a.listingId}`,
      body: {
        name: a.title.slice(0, 127),
        description: a.description?.slice(0, 256) ?? undefined,
        type: "PHYSICAL",
        ...(a.imageUrl ? { image_url: a.imageUrl } : {}),
        home_url: new URL(`/p/${a.listingId}`, env.APP_URL).toString(),
      },
    });
    return res.id ?? null;
  } catch (err) {
    console.error("[thari] catalog product failed (non-blocking)", err);
    return null;
  }
}

/** BUILD_PLAN 11.9. Full refund of a capture. */
export async function refundCapture(captureId: string, orderId: string): Promise<{ id: string; status: string }> {
  return paypalFetch(`/v2/payments/captures/${captureId}/refund`, {
    method: "POST",
    requestId: `refund-${orderId}`,
    body: {},
  });
}
