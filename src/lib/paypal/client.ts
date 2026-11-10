import { env, requireEnv } from "@/lib/env";

/**
 * Every server-side PayPal call goes through here (BUILD_PLAN 11).
 *
 * Rule 5: every write carries a `PayPal-Request-Id` derived from our own ids,
 * so a retry can never double-charge or double-pay.
 */

const BASE = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
} as const;

export { WEB_SDK_ORIGIN } from "./config";

export function paypalBaseUrl(): string {
  return BASE[env.PAYPAL_ENV];
}

export interface PayPalErrorDetail {
  issue?: string;
  description?: string;
  field?: string;
}

export class PayPalError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payPalName?: string,
    readonly details: PayPalErrorDetail[] = [],
    readonly debugId?: string,
  ) {
    super(message);
    this.name = "PayPalError";
  }

  /** True for the cases a retry might fix. */
  get retryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

export class PayPalNotConfiguredError extends Error {
  constructor() {
    super("PayPal credentials are not set. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to .env.local.");
    this.name = "PayPalNotConfiguredError";
  }
}

export function isPayPalConfigured(): boolean {
  return Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);
}

/* ---------- access token, cached in memory until just before it expires ---------- */

let cached: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cached && Date.now() < cached.expiresAt) return cached.token;
  if (!isPayPalConfigured()) throw new PayPalNotConfiguredError();

  const id = requireEnv("PAYPAL_CLIENT_ID");
  const secret = requireEnv("PAYPAL_CLIENT_SECRET");
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");

  const res = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  const body = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  };

  if (!res.ok || !body.access_token) {
    cached = null;
    throw new PayPalError(
      body.error_description ?? "Could not get a PayPal access token.",
      res.status,
      "AUTH_FAILED",
    );
  }

  // Refresh 60 s early so a call never races the expiry.
  cached = { token: body.access_token, expiresAt: Date.now() + ((body.expires_in ?? 3600) - 60) * 1000 };
  return cached.token;
}

/** Only for tests and for forcing a fresh token after a credential change. */
export function clearTokenCache(): void {
  cached = null;
}

/* ---------- the request helper ---------- */

export interface PayPalFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Idempotency key. Required on writes; always derived from our own ids. */
  requestId?: string;
  /** Extra headers, e.g. none today. */
  headers?: Record<string, string>;
}

export async function paypalFetch<T = unknown>(path: string, opts: PayPalFetchOptions = {}): Promise<T> {
  const method = opts.method ?? "GET";
  const isWrite = method !== "GET";

  if (isWrite && !opts.requestId) {
    // A programming error, not a runtime condition: never ship a write without one.
    throw new Error(`paypalFetch: ${method} ${path} needs a requestId (idempotency key)`);
  }

  const token = await getAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
    ...opts.headers,
  };
  if (opts.requestId) headers["PayPal-Request-Id"] = opts.requestId;

  const res = await fetch(`${paypalBaseUrl()}${path}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    cache: "no-store",
  });

  const text = await res.text();
  const parsed: unknown = text ? safeJson(text) : null;

  if (!res.ok) {
    const e = (parsed ?? {}) as {
      name?: string;
      message?: string;
      details?: PayPalErrorDetail[];
      debug_id?: string;
    };
    // debug_id is what PayPal support and the dashboard search on.
    console.error("[thari] PayPal error", {
      path,
      status: res.status,
      name: e.name,
      debug_id: e.debug_id,
      details: e.details,
    });
    throw new PayPalError(
      e.message ?? `PayPal returned ${res.status}`,
      res.status,
      e.name,
      e.details ?? [],
      e.debug_id,
    );
  }

  return parsed as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

/** PayPal wants amounts as strings with exactly two decimals. */
export function usd(cents: number): { currency_code: "USD"; value: string } {
  return { currency_code: "USD", value: (cents / 100).toFixed(2) };
}
