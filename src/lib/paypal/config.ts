/**
 * PayPal constants that are safe anywhere — no Node built-ins, no secrets.
 * Kept apart from client.ts, which uses Buffer and the credentials, so a page
 * that only needs the SDK origin doesn't drag server-only code into its
 * module graph.
 */
export const WEB_SDK_ORIGIN = {
  sandbox: "https://www.sandbox.paypal.com",
  live: "https://www.paypal.com",
} as const;
