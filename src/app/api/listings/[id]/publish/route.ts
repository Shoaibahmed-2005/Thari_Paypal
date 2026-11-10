import { NextResponse, type NextRequest } from "next/server";
import { missingRequired } from "@/lib/ai/schemas";
import { TransitionError, transitionListing, type ListingStatus } from "@/lib/fsm";
import { getWeaver } from "@/lib/weaver";

/**
 * BUILD_PLAN 9.3 step 6: nothing goes live until she says yes.
 * The listing goes LIVE but stays unverified until the co-op confirms it
 * (Phase 4), which is what the Verified handwoven badge depends on.
 */
export async function POST(_req: NextRequest, { params }: RouteContext<"/api/listings/[id]/publish">) {
  const weaver = await getWeaver();
  if (!weaver) return NextResponse.json({ error: "Sign in as a weaver first." }, { status: 401 });

  const { id } = await params;
  const { getDb } = await import("@/lib/db");
  const db = getDb();

  const listing = await db.listing.findFirst({ where: { id, weaverId: weaver.id } });
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const missing = missingRequired(listing);
  if (missing.length > 0) {
    return NextResponse.json({ error: "Some details are still missing.", missing }, { status: 409 });
  }

  let status: ListingStatus;
  try {
    status = transitionListing(listing.status as ListingStatus, "LIVE");
  } catch (err) {
    if (err instanceof TransitionError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }

  await db.listing.update({ where: { id: listing.id }, data: { status, pendingQuestions: [] } });
  await db.agentLog.create({
    data: {
      actor: "weaver",
      action: "publishListing",
      listingId: listing.id,
      detail: { title: listing.title, priceInr: listing.priceInr },
    },
  });

  return NextResponse.json({ id: listing.id, status });
}
