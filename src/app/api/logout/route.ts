import { NextResponse, type NextRequest } from "next/server";
import { logout } from "@/lib/session";

/**
 * Signing out is POST only, and deliberately so.
 *
 * It used to answer GET as well, reached from a `<Link href="/api/logout">`.
 * Next prefetches links, prefetching a GET route handler runs it, and so the
 * weaver was signed out by a sign-out she never clicked -- her cookie simply
 * vanished and the next page she opened told her to sign in again. Prefetch
 * is off in development, which is why this only ever happened once deployed
 * and why it looked random: it depended on when the link came into view.
 *
 * A GET should not change anything. Honouring that is the whole fix; the
 * sign-out controls are forms now.
 */
export async function POST(req: NextRequest) {
  await logout();
  return NextResponse.redirect(new URL("/demo", req.nextUrl.origin), { status: 303 });
}
