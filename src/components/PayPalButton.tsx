"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * PayPal JS SDK v6 (BUILD_PLAN 11.1, checked against the v6 reference on
 * 2026-11-11: createInstance -> findEligibleMethods ->
 * createPayPalOneTimePaymentSession -> session.start).
 *
 * The order is created by our server, never by the browser, and `start()` is
 * given the promise rather than an awaited value so the popup opens inside the
 * click gesture instead of being blocked.
 */

interface PayPalSdk {
  createInstance(opts: { clientId: string; components: string[] }): Promise<SdkInstance>;
}
interface SdkInstance {
  findEligibleMethods(opts?: { currencyCode?: string; amount?: string }): Promise<{
    isEligible(method: string): boolean;
  }>;
  createPayPalOneTimePaymentSession(opts: {
    onApprove(data: { orderId: string }): void | Promise<void>;
    onCancel?(): void;
    onError?(err: { code?: string; message?: string }): void;
  }): PaymentSession;
}
interface PaymentSession {
  start(opts: { presentationMode: string }, order: Promise<{ orderId: string }>): Promise<void>;
}

declare global {
  interface Window {
    paypal?: PayPalSdk;
  }
}

let sdkPromise: Promise<PayPalSdk> | null = null;

/** Loads the v6 core script once per page, however many buttons there are. */
function loadSdk(origin: string): Promise<PayPalSdk> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    if (window.paypal) return resolve(window.paypal);
    const s = document.createElement("script");
    s.src = `${origin}/web-sdk/v6/core`;
    s.async = true;
    s.onload = () => (window.paypal ? resolve(window.paypal) : reject(new Error("PayPal SDK loaded but is not available")));
    s.onerror = () => {
      sdkPromise = null;
      reject(new Error("Could not load PayPal"));
    };
    document.head.appendChild(s);
  });
  return sdkPromise;
}

export interface PayPalButtonProps {
  listingId: string;
  clientId: string | null;
  sdkOrigin: string;
  /** Total in USD as a plain string, for eligibility only. */
  amount: string;
  disabled?: boolean;
}

export function PayPalButton({ listingId, clientId, sdkOrigin, amount, disabled }: PayPalButtonProps) {
  const router = useRouter();
  // Derived from the props rather than set inside the effect: with no client
  // id there is nothing to load, and setting that in an effect is both a wasted
  // render and a lint error (react-hooks/set-state-in-effect).
  const [state, setState] = useState<"loading" | "ready" | "paying" | "unavailable">(
    clientId ? "loading" : "unavailable",
  );
  const [message, setMessage] = useState<string | null>(
    clientId ? null : "Checkout isn't switched on yet.",
  );
  const sessionRef = useRef<PaymentSession | null>(null);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    (async () => {
      try {
        const sdk = await loadSdk(sdkOrigin);
        const instance = await sdk.createInstance({ clientId, components: ["paypal-payments"] });
        const methods = await instance.findEligibleMethods({ currencyCode: "USD", amount });
        if (cancelled) return;
        if (!methods.isEligible("paypal")) {
          setState("unavailable");
          setMessage("PayPal isn't available for this payment.");
          return;
        }

        sessionRef.current = instance.createPayPalOneTimePaymentSession({
          async onApprove({ orderId }) {
            setState("paying");
            setMessage(null);
            try {
              const res = await fetch(`/api/orders/${orderId}/capture`, { method: "POST" });
              const body = await res.json();
              if (!res.ok) throw new Error(body.error ?? "The payment could not be completed.");
              router.push(`/checkout/success/${body.orderId}`);
            } catch (err) {
              setState("ready");
              setMessage(err instanceof Error ? err.message : "The payment could not be completed.");
            }
          },
          onCancel() {
            setState("ready");
            setMessage("Payment cancelled. Your saree is still available.");
          },
          onError(err) {
            setState("ready");
            setMessage(
              err?.code === "INSTRUMENT_DECLINED"
                ? "That payment method was declined. Try another one in the PayPal window."
                : "Something went wrong with PayPal. Please try again.",
            );
          },
        });
        setState("ready");
      } catch {
        if (!cancelled) {
          setState("unavailable");
          setMessage("Could not reach PayPal just now.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId, sdkOrigin, amount, router]);

  const pay = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    setMessage(null);
    // Not awaited before start(): the popup must open inside the click.
    const order = fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listingId }),
    })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "We couldn't start the payment.");
        return { orderId: body.paypalOrderId as string };
      })
      .catch((err) => {
        setMessage(err instanceof Error ? err.message : "We couldn't start the payment.");
        throw err;
      });

    void session.start({ presentationMode: "auto" }, order).catch(() => {
      /* onError and onCancel already report to the buyer */
    });
  }, [listingId]);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="th-btn th-btn--primary th-btn--block"
        onClick={pay}
        disabled={disabled || state !== "ready"}
      >
        {state === "paying"
          ? "Completing payment…"
          : state === "loading"
            ? "Loading PayPal…"
            : state === "unavailable"
              ? "Checkout unavailable"
              : "Pay with PayPal"}
      </button>
      {message && (
        <p className="t-caption m-0 text-center text-ink-muted" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
