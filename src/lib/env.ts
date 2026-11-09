import { z } from "zod";

/**
 * Env validation. In development, missing values print a readable list and the
 * app keeps running (features needing them fail soft). In production, any
 * missing required value throws at startup.
 */
const optionalStr = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().default("http://localhost:3000"),
  SESSION_SECRET: optionalStr,

  DATABASE_URL: optionalStr,
  DIRECT_URL: optionalStr,

  BLOB_READ_WRITE_TOKEN: optionalStr,

  GEMINI_API_KEY: optionalStr,
  GEMINI_MODEL: optionalStr,
  GEMINI_TTS_MODEL: optionalStr,
  GEMINI_TTS_VOICE: optionalStr,
  AI_MODE: z.enum(["live", "mock"]).default("live"),

  PAYPAL_ENV: z.enum(["sandbox", "live"]).default("sandbox"),
  PAYPAL_CLIENT_ID: optionalStr,
  PAYPAL_CLIENT_SECRET: optionalStr,
  PAYPAL_WEBHOOK_ID: optionalStr,
  NEXT_PUBLIC_PAYPAL_CLIENT_ID: optionalStr,

  FX_INR_PER_USD: z.coerce.number().positive().default(88),
  SHIPPING_USD: z.coerce.number().nonnegative().default(20),
  DEFAULT_COOP_COMMISSION_PCT: z.coerce.number().int().min(0).max(100).default(10),

  SANDBOX_BUYER_EMAIL: optionalStr,
  SANDBOX_WEAVER_EMAIL: optionalStr,
  SANDBOX_COOP_EMAIL: optionalStr,
});

export type Env = z.infer<typeof schema>;

/** Vars every running deployment needs. Webhook ID and Blob come later (M6, M9). */
export const REQUIRED_KEYS = [
  "SESSION_SECRET",
  "DATABASE_URL",
  "DIRECT_URL",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "GEMINI_TTS_MODEL",
  "GEMINI_TTS_VOICE",
  "PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
  "NEXT_PUBLIC_PAYPAL_CLIENT_ID",
  "SANDBOX_BUYER_EMAIL",
  "SANDBOX_WEAVER_EMAIL",
  "SANDBOX_COOP_EMAIL",
] as const satisfies readonly (keyof Env)[];

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment variables:\n${lines.join("\n")}`);
  }
  return result.data;
}

export function missingKeys(env: Env): string[] {
  return REQUIRED_KEYS.filter((k) => env[k] === undefined);
}

export const env: Env = parseEnv(process.env);

/** Called once at server start (src/instrumentation.ts). */
export function checkEnvAtStartup(): void {
  const missing = missingKeys(env);
  if (missing.length === 0) return;
  const msg =
    `[thari] Missing environment variables (set them in .env.local):\n` +
    missing.map((k) => `  - ${k}`).join("\n");
  if (env.NODE_ENV === "production") throw new Error(msg);
  console.warn(msg);
}

/** Use inside features that need a value: throws a clear error if it is missing. */
export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const v = env[key];
  if (v === undefined || v === null) {
    throw new Error(`[thari] ${String(key)} is not set. Add it to .env.local.`);
  }
  return v as NonNullable<Env[K]>;
}
