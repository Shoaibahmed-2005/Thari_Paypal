import { NextResponse, type NextRequest } from "next/server";
import { isDemoRole, loginAsDemoRole } from "@/lib/session";

/**
 * BUILD_PLAN 13: `/api/demo-login?role=weaver|buyer|coop` signs in the seeded
 * user for that role and redirects to their home. It stays enabled in
 * production on purpose (the whole app is a demo), so it is lightly rate
 * limited per IP.
 */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many sign-ins, try again in a minute." }, { status: 429 });
  }

  const role = req.nextUrl.searchParams.get("role");
  if (!isDemoRole(role)) {
    return NextResponse.json({ error: "role must be weaver, buyer or coop" }, { status: 400 });
  }

  const redirectTo = await loginAsDemoRole(role);
  return NextResponse.redirect(new URL(redirectTo, req.nextUrl.origin));
}
