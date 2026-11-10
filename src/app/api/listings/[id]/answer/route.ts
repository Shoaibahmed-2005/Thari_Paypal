import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { AiError } from "@/lib/ai/client";
import { answerQuestion, regenerateCopy } from "@/lib/ai/listing";
import { MISSING_FIELDS, coerceAnswer, missingRequired, type Question } from "@/lib/ai/schemas";
import { env } from "@/lib/env";
import { transitionListing, type ListingStatus } from "@/lib/fsm";
import { inrToUsdCents } from "@/lib/money";
import { getWeaver, weaverContext } from "@/lib/weaver";

/**
 * BUILD_PLAN 10.2: one spoken answer to one pending question. When the last
 * question is answered the prose is regenerated from the merged fields and the
 * draft moves to READY_TO_CONFIRM.
 */

const Body = z.object({
  field: z.enum(MISSING_FIELDS),
  audio: z.object({ mimeType: z.string(), data: z.string() }).optional(),
  /** Set when she taps a quick-answer chip instead of speaking. */
  typedAnswer: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: RouteContext<"/api/listings/[id]/answer">) {
  const weaver = await getWeaver();
  if (!weaver) return NextResponse.json({ error: "Sign in as a weaver first." }, { status: 401 });

  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request", issues: parsed.error.issues }, { status: 400 });
  }

  const { getDb } = await import("@/lib/db");
  const db = getDb();
  const listing = await db.listing.findFirst({ where: { id, weaverId: weaver.id } });
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pending = (listing.pendingQuestions as Question[] | null) ?? [];
  const question = pending.find((q) => q.field === parsed.data.field);
  if (!question) return NextResponse.json({ error: "That question isn't pending." }, { status: 400 });

  let answer;
  try {
    answer = await answerQuestion({
      weaver: weaverContext(weaver),
      field: parsed.data.field,
      questionNative: question.questionNative,
      audio: parsed.data.audio,
      typedAnswer: parsed.data.typedAnswer,
      listingId: listing.id,
    });
  } catch (err) {
    const e = err instanceof AiError ? err : new AiError("Unexpected AI failure", "upstream", err);
    return NextResponse.json({ error: e.message, kind: e.kind }, { status: 502 });
  }

  // Not understood: keep the question pending and let the UI ask again.
  if (!answer.understood) {
    return NextResponse.json({
      understood: false,
      clarifyNative: answer.clarifyNative ?? question.questionNative,
      transcriptNative: answer.transcriptNative,
      questions: pending,
    });
  }

  const value = coerceAnswer(parsed.data.field, answer.value);
  const update: Record<string, unknown> = { [parsed.data.field]: value };
  if (parsed.data.field === "priceInr" && typeof value === "number") {
    update.priceUsdCents = inrToUsdCents(value, env.FX_INR_PER_USD);
  }

  const remaining = pending.filter((q) => q.field !== parsed.data.field);
  const merged = { ...listing, ...update } as Record<string, unknown>;
  const stillMissing = missingRequired(merged as Parameters<typeof missingRequired>[0]);
  const done = remaining.length === 0 && stillMissing.length === 0;

  if (done) {
    try {
      const copy = await regenerateCopy({
        weaver: weaverContext(weaver),
        listingId: listing.id,
        fields: {
          category: merged.category,
          fabric: merged.fabric,
          weave: merged.weave,
          colors: merged.colors,
          motifs: merged.motifs,
          includesBlouse: merged.includesBlouse,
          stitched: merged.stitched,
          lengthMeters: merged.lengthMeters,
          weeksToWeave: merged.weeksToWeave,
          priceInr: merged.priceInr,
        },
      });
      Object.assign(update, copy);
    } catch (err) {
      // Fail soft (rule 7): keep the original copy rather than blocking her.
      console.error("[thari] regenerateCopy failed, keeping the first draft", err);
    }
  }

  update.pendingQuestions = remaining;
  const nextStatus: ListingStatus = done ? "READY_TO_CONFIRM" : "NEEDS_ANSWERS";
  update.status = transitionListing(listing.status as ListingStatus, nextStatus);

  const saved = await db.listing.update({ where: { id: listing.id }, data: update });

  return NextResponse.json({
    understood: true,
    transcriptNative: answer.transcriptNative,
    field: parsed.data.field,
    value,
    questions: remaining,
    status: saved.status,
    readbackNative: saved.readbackNative,
    title: saved.title,
    priceUsdCents: saved.priceUsdCents,
  });
}
