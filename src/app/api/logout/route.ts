import { NextResponse, type NextRequest } from "next/server";
import { logout } from "@/lib/session";

async function end(req: NextRequest) {
  await logout();
  return NextResponse.redirect(new URL("/demo", req.nextUrl.origin));
}

export const GET = end;
export const POST = end;
