import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

/**
 * Temporary diagnostic for a session that works locally and drops on Vercel.
 *
 * Reports whether the cookie arrives and whether it unseals, and surfaces the
 * real error instead of the silent null that `getCurrentUser` returns. Reveals
 * no secret: only lengths, flags and the error message.
 */
export async function GET(_req: NextRequest) {
  const jar = await cookies();
  const raw = jar.get("thari_session");

  const out: Record<string, unknown> = {
    cookiePresent: Boolean(raw),
    cookieLength: raw?.value.length ?? 0,
    secretConfigured: Boolean(process.env.SESSION_SECRET),
    secretLength: process.env.SESSION_SECRET?.length ?? 0,
    nodeEnv: process.env.NODE_ENV,
  };

  try {
    const { getCurrentUser } = await import("@/lib/session");
    const user = await getCurrentUser();
    out.user = user ? { role: user.role, hasId: Boolean(user.userId) } : null;
  } catch (err) {
    out.getCurrentUserThrew = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  }

  try {
    const { getWeaver } = await import("@/lib/weaver");
    const w = await getWeaver();
    out.weaverFound = Boolean(w);
  } catch (err) {
    out.weaverLookupThrew = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  }

  return NextResponse.json(out, { headers: { "cache-control": "no-store" } });
}
