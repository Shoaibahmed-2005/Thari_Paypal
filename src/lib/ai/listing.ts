import { callAi, type InlinePart } from "./client";
import { answerSystemPrompt, extractSystemPrompt, regenerateSystemPrompt, type WeaverContext } from "./prompts";
import {
  AnswerSchema,
  ExtractedListingSchema,
  RegeneratedCopySchema,
  type Answer,
  type ExtractedListing,
  type MissingField,
  type RegeneratedCopy,
} from "./schemas";
import sampleExtract from "./fixtures/extract-sample.json";

/** BUILD_PLAN 10.1: voice note + photos -> structured draft. */
export async function extractListing(args: {
  weaver: WeaverContext;
  audio?: InlinePart;
  photos?: InlinePart[];
  listingId?: string;
}): Promise<ExtractedListing> {
  const media: InlinePart[] = [];
  if (args.audio) media.push(args.audio);
  for (const p of (args.photos ?? []).slice(0, 6)) media.push(p);

  return callAi({
    action: "extractListing",
    listingId: args.listingId,
    schema: ExtractedListingSchema,
    systemPrompt: extractSystemPrompt(args.weaver),
    text: "Here is the weaver's voice note and the photos of the piece. Extract the listing.",
    media,
    // 10.6: matches the sample voice note in 14.3, length deliberately missing
    // so the question-and-answer step is exercised in mock mode too.
    mock: () => ExtractedListingSchema.parse(sampleExtract),
  });
}

/** BUILD_PLAN 10.2: one spoken answer to one question. */
export async function answerQuestion(args: {
  weaver: WeaverContext;
  field: MissingField;
  questionNative: string;
  audio?: InlinePart;
  /** Used instead of audio when she taps a quick-answer chip. */
  typedAnswer?: string;
  listingId?: string;
}): Promise<Answer> {
  return callAi({
    action: "answerQuestion",
    listingId: args.listingId,
    schema: AnswerSchema,
    systemPrompt: answerSystemPrompt(args.weaver, args.field, args.questionNative),
    text: args.typedAnswer
      ? `She chose this answer: "${args.typedAnswer}"`
      : "Here is her spoken answer. Transcribe it and extract the value.",
    media: args.audio ? [args.audio] : [],
    mock: () => mockAnswer(args.field, args.typedAnswer),
  });
}

/** BUILD_PLAN 10.2: rewrite the prose once the answers are merged. Text only. */
export async function regenerateCopy(args: {
  weaver: WeaverContext;
  fields: Record<string, unknown>;
  listingId?: string;
}): Promise<RegeneratedCopy> {
  return callAi({
    action: "regenerateCopy",
    listingId: args.listingId,
    schema: RegeneratedCopySchema,
    systemPrompt: regenerateSystemPrompt(args.weaver),
    text: `Field values:\n${JSON.stringify(args.fields, null, 2)}`,
    mock: () => {
      const base = ExtractedListingSchema.parse(sampleExtract);
      const length = args.fields.lengthMeters;
      return {
        title: base.title,
        titleNative: base.titleNative,
        description: length ? `${base.description} The saree is ${String(length)} metres long.` : base.description,
        story: base.story,
        readbackNative: base.readbackNative,
      };
    },
  });
}

/**
 * Mock answers for the demo path. The sample answer in BUILD_PLAN 14.3 is
 * "ஆறரை மீட்டர்" — six and a half metres.
 */
function mockAnswer(field: MissingField, typed?: string): Answer {
  const canned: Partial<Record<MissingField, { value: Answer["value"]; transcriptNative: string }>> = {
    lengthMeters: { value: 6.5, transcriptNative: "ஆறரை மீட்டர்" },
    fabric: { value: "silk", transcriptNative: "பட்டு" },
    priceInr: { value: 18000, transcriptNative: "பதினெட்டாயிரம் ரூபாய்" },
    includesBlouse: { value: true, transcriptNative: "ரவிக்கைத் துண்டு உண்டு" },
    stitched: { value: false, transcriptNative: "தைக்கப்படவில்லை" },
    colors: { value: ["orange", "yellow"], transcriptNative: "ஆரஞ்சும் மஞ்சளும்" },
    category: { value: "saree", transcriptNative: "புடவை" },
  };
  const c = canned[field];
  return {
    field,
    value: typed ?? c?.value ?? null,
    understood: true,
    transcriptNative: typed ?? c?.transcriptNative ?? "",
  };
}
