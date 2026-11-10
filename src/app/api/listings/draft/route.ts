import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { extractListing } from "@/lib/ai/listing";
import { AiError } from "@/lib/ai/client";
import { lengthQuestionFor, missingRequired } from "@/lib/ai/schemas";
import { env } from "@/lib/env";
import { inrToUsdCents } from "@/lib/money";
import { getWeaver, weaverContext } from "@/lib/weaver";

/**
 * BUILD_PLAN 9.3 step 4 / 15 Phase 2: voice note + photos in, a draft listing
 * out. The price in USD is computed here on the server, never by the AI and
 * never by the browser (rule 4).
 */

const InlineMedia = z.object({
  mimeType: z.string().min(1),
  /** base64 without the data: prefix */
  data: z.string().min(1),
});

const Body = z.object({
  audio: InlineMedia.optional(),
  photos: z.array(InlineMedia).max(6).default([]),
  /** Data URLs the client already resized; stored as Photo rows. */
  photoUrls: z.array(z.string()).max(6).default([]),
  loomClipUrl: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const weaver = await getWeaver();
  if (!weaver) return NextResponse.json({ error: "Sign in as a weaver first." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request", issues: parsed.error.issues }, { status: 400 });
  }
  const { audio, photos, photoUrls, loomClipUrl } = parsed.data;

  let extracted;
  try {
    extracted = await extractListing({ weaver: weaverContext(weaver), audio, photos });
  } catch (err) {
    const e = err instanceof AiError ? err : new AiError("Unexpected AI failure", "upstream", err);
    console.error("[thari] draft extraction failed", e);
    return NextResponse.json({ error: e.message, kind: e.kind }, { status: 502 });
  }

  const missing = missingRequired(extracted);
  // lengthMeters is wanted for sarees but never blocks publishing (10.1).
  const askAbout = extracted.questions.filter(
    (q) => missing.includes(q.field) || q.field === "lengthMeters",
  );
  // The model is asked to always question a saree's missing length, but it
  // doesn't always comply, so guarantee it here.
  if (
    extracted.category === "saree" &&
    extracted.lengthMeters == null &&
    !askAbout.some((q) => q.field === "lengthMeters")
  ) {
    askAbout.push(lengthQuestionFor(weaver.preferredLang));
  }
  const status = askAbout.length > 0 ? "NEEDS_ANSWERS" : "READY_TO_CONFIRM";

  const { getDb } = await import("@/lib/db");
  const db = getDb();

  const listing = await db.listing.create({
    data: {
      weaverId: weaver.id,
      status,
      lang: weaver.preferredLang,
      title: extracted.title,
      titleNative: extracted.titleNative,
      description: extracted.description,
      story: extracted.story,
      category: extracted.category,
      fabric: extracted.fabric,
      weave: extracted.weave,
      colors: extracted.colors,
      motifs: extracted.motifs,
      includesBlouse: extracted.includesBlouse,
      stitched: extracted.stitched,
      lengthMeters: extracted.lengthMeters,
      weeksToWeave: extracted.weeksToWeave,
      priceInr: extracted.priceInr,
      priceUsdCents:
        extracted.priceInr != null ? inrToUsdCents(extracted.priceInr, env.FX_INR_PER_USD) : null,
      transcriptNative: extracted.transcriptNative,
      transcriptEn: extracted.transcriptEn,
      readbackNative: extracted.readbackNative,
      pendingQuestions: askAbout,
      aiRaw: extracted,
      loomClipUrl: loomClipUrl ?? null,
    },
  });

  if (photoUrls.length) {
    await db.photo.createMany({
      data: photoUrls.map((url, i) => ({ listingId: listing.id, url, position: i })),
    });
  }

  return NextResponse.json({
    id: listing.id,
    status,
    questions: askAbout,
    readbackNative: extracted.readbackNative,
    title: extracted.title,
    titleNative: extracted.titleNative,
    priceInr: extracted.priceInr,
    priceUsdCents: listing.priceUsdCents,
    conflicts: extracted.conflicts,
  });
}
