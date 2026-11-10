import { cookies } from "next/headers";
import { connection } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { env } from "@/lib/env";

/** BUILD_PLAN 13: signed cookie `thari_session` holding `{ userId, role }`. */
export type Role = "WEAVER" | "BUYER" | "COOP_ADMIN";

export interface SessionData {
  userId?: string;
  role?: Role;
  /** Display name, so the nav can greet without a DB round trip. */
  name?: string;
}

/** Demo roles the judge can switch between on /demo (BUILD_PLAN 9.1, 13). */
export const DEMO_ROLES = {
  weaver: { userId: "seed-weaver-lakshmi", role: "WEAVER", name: "Lakshmi R.", redirect: "/w" },
  buyer: { userId: "seed-buyer-emma", role: "BUYER", name: "Emma Clarke", redirect: "/" },
  coop: { userId: "seed-coop-priya", role: "COOP_ADMIN", name: "Priya N.", redirect: "/coop" },
} as const satisfies Record<string, { userId: string; role: Role; name: string; redirect: string }>;

export type DemoRole = keyof typeof DEMO_ROLES;

export function isDemoRole(v: string | null | undefined): v is DemoRole {
  return v === "weaver" || v === "buyer" || v === "coop";
}

/**
 * Dev-only fallback so the app still boots before M5/SESSION_SECRET is filled
 * in. `env.ts` already lists SESSION_SECRET as required and production throws
 * at startup when it is missing, so this never applies to a real deployment.
 */
const DEV_FALLBACK_SECRET = "thari-dev-only-insecure-session-secret-32+";

function sessionOptions(): SessionOptions {
  const password = env.SESSION_SECRET ?? DEV_FALLBACK_SECRET;
  return {
    password,
    cookieName: "thari_session",
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    },
  };
}

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}

/**
 * Who is signed in, or null. Never throws.
 *
 * `connection()` first: iron-session calls `Date.now()` while unsealing the
 * cookie, which Cache Components flags as unstable during prerendering. This
 * marks the read as request-time data, which is what it is.
 */
export async function getCurrentUser(): Promise<Required<SessionData> | null> {
  try {
    await connection();
    const s = await getSession();
    if (!s.userId || !s.role) return null;
    return { userId: s.userId, role: s.role, name: s.name ?? "" };
  } catch (err) {
    // Next's own control-flow errors (redirect, notFound, the prerender
    // bailout when `cookies()` is read outside a Suspense boundary) must
    // travel up; only a genuinely unreadable cookie means "signed out".
    unstable_rethrow(err);
    console.error("[thari] reading session failed", err);
    return null;
  }
}

export async function loginAsDemoRole(role: DemoRole): Promise<string> {
  const who = DEMO_ROLES[role];
  const s = await getSession();
  s.userId = who.userId;
  s.role = who.role;
  s.name = who.name;
  await s.save();
  return who.redirect;
}

export async function logout(): Promise<void> {
  const s = await getSession();
  s.destroy();
}
