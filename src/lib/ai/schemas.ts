import { z } from "zod";

/**
 * Zod schemas for every AI output (BUILD_PLAN 10.1, 10.2, rule 8).
 *
 * BUILD_PLAN names these fields `transcriptTa`, `questionsTa`, `readbackTa`.
 * They are `*Native` here for the same reason the database columns are: the
 * weaver's language is a setting, not a constant. See src/lib/languages.ts.
 */

export const MISSING_FIELDS = [
  "fabric",
  "priceInr",
  "lengthMeters",
  "includesBlouse",
  "stitched",
  "colors",
  "category",
] as const;

export type MissingField = (typeof MISSING_FIELDS)[number];

/** Must all be present before a draft can move to READY_TO_CONFIRM (10.1). */
export const REQUIRED_BEFORE_CONFIRM = [
  "category",
  "fabric",
  "colors",
  "priceInr",
  "includesBlouse",
  "stitched",
] as const satisfies readonly MissingField[];

export const QuestionSchema = z.object({
  field: z.enum(MISSING_FIELDS),
  /** The question as she will hear it, in her language. */
  questionNative: z.string().min(1),
  /** The same question in English, for the co-op dashboard and logs. */
  questionEn: z.string().min(1),
});

export type Question = z.infer<typeof QuestionSchema>;

export const ExtractedListingSchema = z.object({
  transcriptNative: z.string(),
  transcriptEn: z.string(),
  category: z.enum(["saree", "dupatta", "stole", "fabric", "other"]).nullable(),
  fabric: z.string().nullable(),
  weave: z.string().nullable(),
  colors: z.array(z.string()),
  motifs: z.array(z.string()),
  includesBlouse: z.boolean().nullable(),
  stitched: z.boolean().nullable(),
  lengthMeters: z.number().nullable(),
  weeksToWeave: z.number().int().nullable(),
  priceInr: z.number().int().nullable(),
  photoObservations: z.string(),
  conflicts: z.array(z.string()),
  title: z.string().max(80),
  /** Short name in her language, <= 6 words, used in the sale notification (10.4). */
  titleNative: z.string(),
  description: z.string(),
  story: z.string(),
  missingFields: z.array(z.enum(MISSING_FIELDS)),
  questions: z.array(QuestionSchema),
  /** Spoken summary she confirms by ear, ending in "shall I publish?". */
  readbackNative: z.string(),
});

export type ExtractedListing = z.infer<typeof ExtractedListingSchema>;

/** 10.2: one spoken answer to one question. */
export const AnswerSchema = z.object({
  field: z.enum(MISSING_FIELDS),
  /** Raw value; coerced against the field's real type by `coerceAnswer`. */
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]),
  understood: z.boolean(),
  transcriptNative: z.string(),
  /** Played back when `understood` is false, asking her to say it again. */
  clarifyNative: z.string().optional(),
});

export type Answer = z.infer<typeof AnswerSchema>;

/** 10.2: after answers are merged, the prose is rewritten in one text-only call. */
export const RegeneratedCopySchema = z.object({
  title: z.string().max(80),
  titleNative: z.string(),
  description: z.string(),
  story: z.string(),
  readbackNative: z.string(),
});

export type RegeneratedCopy = z.infer<typeof RegeneratedCopySchema>;

/** Which required fields a draft is still missing. */
export function missingRequired(draft: {
  category?: string | null;
  fabric?: string | null;
  colors?: string[];
  priceInr?: number | null;
  includesBlouse?: boolean | null;
  stitched?: boolean | null;
}): MissingField[] {
  const out: MissingField[] = [];
  if (!draft.category) out.push("category");
  if (!draft.fabric) out.push("fabric");
  if (!draft.colors || draft.colors.length === 0) out.push("colors");
  if (draft.priceInr == null) out.push("priceInr");
  if (draft.includesBlouse == null) out.push("includesBlouse");
  if (draft.stitched == null) out.push("stitched");
  return out;
}

/** Narrow a loose AI value to the type the field actually holds. */
export function coerceAnswer(field: MissingField, value: Answer["value"]): unknown {
  switch (field) {
    case "priceInr": {
      const n = typeof value === "number" ? value : Number(String(value).replace(/[^\d.]/g, ""));
      return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
    }
    case "lengthMeters": {
      const n = typeof value === "number" ? value : Number(String(value).replace(/[^\d.]/g, ""));
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    case "includesBlouse":
    case "stitched":
      return typeof value === "boolean" ? value : null;
    case "colors":
      return Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
    default:
      return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  }
}
