import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCoopAdmin } from "@/lib/coop";

/**
 * BUILD_PLAN 9.4: the co-op confirms a piece is genuinely handwoven. This is
 * what turns the gold Verified handwoven badge on, and it is deliberately not
 * something the weaver or the AI can do — the badge means a second party
 * looked at the loom clip and vouched for it.
 *
 * Setting it requires a loom clip to exist; there is nothing to vouch for
 * without one.
 */
const Body = z.object({ confirmed: z.boolean().default(true) });

export async function POST(req: NextRequest, { params }: RouteContext<"/api/listings/[id]/confirm">) {
  const admin = await getCoopAdmin();
  if (!admin) return NextResponse.json({ error: "Only the co-op can confirm a piece." }, { status: 403 });

  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  const confirmed = parsed.success ? parsed.data.confirmed : true;

  const { getDb } = await import("@/lib/db");
  const db = getDb();

  const listing = await db.listing.findUnique({ where: { id } });
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (confirmed && !listing.loomClipUrl) {
    return NextResponse.json(
      { error: "This piece has no loom clip, so there is nothing to confirm." },
      { status: 409 },
    );
  }

  const saved = await db.listing.update({
    where: { id },
    data: { coopConfirmedAt: confirmed ? new Date() : null },
  });

  await db.agentLog.create({
    data: {
      actor: "coop",
      action: confirmed ? "listing.confirmed" : "listing.unconfirmed",
      listingId: id,
      detail: { by: admin.name, title: listing.title },
    },
  });

  return NextResponse.json({ id: saved.id, confirmed: Boolean(saved.coopConfirmedAt) });
}
