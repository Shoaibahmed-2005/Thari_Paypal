import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSupportedLanguage } from "@/lib/languages";
import { getWeaver } from "@/lib/weaver";

/**
 * The weaver changes the language she speaks to Thari in.
 *
 * This only changes her interface and the language the AI talks to her in
 * from now on. Listings she has already made keep the language she spoke at
 * the time (`Listing.lang`), so an old piece's title does not silently become
 * a language she never used.
 */
const Body = z.object({ lang: z.string().min(2).max(8) });

export async function POST(req: NextRequest) {
  const weaver = await getWeaver();
  if (!weaver) return NextResponse.json({ error: "Sign in as a weaver first." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isSupportedLanguage(parsed.data.lang)) {
    return NextResponse.json({ error: "That language isn't supported yet." }, { status: 400 });
  }

  const { getDb } = await import("@/lib/db");
  await getDb().user.update({ where: { id: weaver.id }, data: { preferredLang: parsed.data.lang } });

  return NextResponse.json({ lang: parsed.data.lang });
}
