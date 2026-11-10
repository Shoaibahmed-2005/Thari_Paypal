import { z } from "zod";
import { env, requireEnv } from "@/lib/env";

/**
 * One place where every Gemini call goes through (BUILD_PLAN 10):
 * 45 s timeout, one retry on 429/5xx with backoff, Zod validation of the
 * output, an AgentLog row, and a typed error the UI can show.
 *
 * `AI_MODE=mock` short-circuits before any network call, so the whole weaver
 * flow runs without a key (M4).
 */

export class AiError extends Error {
  constructor(
    message: string,
    readonly kind: "timeout" | "rate-limit" | "invalid-output" | "no-key" | "upstream",
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AiError";
  }
}

export interface InlinePart {
  mimeType: string;
  /** base64, no data: prefix */
  data: string;
}

export interface CallOptions<T> {
  /** For logs: "extractListing", "answerQuestion", ... */
  action: string;
  schema: z.ZodType<T>;
  systemPrompt: string;
  /** Text first, then any audio/image parts. */
  text: string;
  media?: InlinePart[];
  listingId?: string;
  /** Returned as-is when AI_MODE=mock. */
  mock: () => T | Promise<T>;
}

const TIMEOUT_MS = 45_000;

function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (typeof status === "number") return status === 429 || status >= 500;
  const msg = String((err as Error)?.message ?? "");
  return /\b429\b|\b5\d\d\b|rate.?limit|overloaded|unavailable/i.test(msg);
}

async function logAgent(action: string, listingId: string | undefined, detail: unknown): Promise<void> {
  try {
    const { getDb } = await import("@/lib/db");
    await getDb().agentLog.create({
      data: { actor: "gemini", action, listingId: listingId ?? null, detail: detail as object },
    });
  } catch (err) {
    // Logging must never break the flow it is logging.
    console.error("[thari] AgentLog write failed", err);
  }
}

export async function callAi<T>(opts: CallOptions<T>): Promise<T> {
  const started = Date.now();

  if (env.AI_MODE === "mock") {
    const value = await opts.mock();
    await logAgent(opts.action, opts.listingId, { mode: "mock", ms: Date.now() - started });
    return value;
  }

  const apiKey = (() => {
    try {
      return requireEnv("GEMINI_API_KEY");
    } catch {
      throw new AiError("GEMINI_API_KEY is not set. Add it to .env.local or run with AI_MODE=mock.", "no-key");
    }
  })();
  const model = (() => {
    try {
      return requireEnv("GEMINI_MODEL");
    } catch {
      throw new AiError("GEMINI_MODEL is not set. Add it to .env.local.", "no-key");
    }
  })();

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const parts: object[] = [{ text: opts.text }];
  for (const m of opts.media ?? []) parts.push({ inlineData: { mimeType: m.mimeType, data: m.data } });

  const run = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: opts.systemPrompt,
          responseMimeType: "application/json",
          responseJsonSchema: z.toJSONSchema(opts.schema as z.ZodType),
          abortSignal: controller.signal,
        },
      });
    } finally {
      clearTimeout(timer);
    }
  };

  let raw: string | undefined;
  try {
    let response;
    try {
      response = await run();
    } catch (err) {
      if (!isRetryable(err)) throw err;
      await new Promise((r) => setTimeout(r, 1500));
      response = await run();
    }
    raw = response.text;
  } catch (err) {
    const aborted = (err as Error)?.name === "AbortError";
    const kind = aborted ? "timeout" : isRetryable(err) ? "rate-limit" : "upstream";
    await logAgent(opts.action, opts.listingId, { mode: "live", error: String(err), ms: Date.now() - started });
    throw new AiError(aborted ? "The AI took too long to answer." : "The AI service could not be reached.", kind, err);
  }

  if (!raw) {
    await logAgent(opts.action, opts.listingId, { mode: "live", error: "empty response", ms: Date.now() - started });
    throw new AiError("The AI returned nothing.", "invalid-output");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    await logAgent(opts.action, opts.listingId, { mode: "live", error: "not JSON", raw: raw.slice(0, 2000) });
    throw new AiError("The AI returned something that wasn't JSON.", "invalid-output", err);
  }

  const result = opts.schema.safeParse(parsed);
  if (!result.success) {
    await logAgent(opts.action, opts.listingId, {
      mode: "live",
      error: "schema mismatch",
      issues: result.error.issues.slice(0, 10),
    });
    throw new AiError("The AI's answer didn't match what we expected.", "invalid-output", result.error);
  }

  await logAgent(opts.action, opts.listingId, { mode: "live", ms: Date.now() - started, model });
  return result.data;
}
