import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { getWeaver } from "@/lib/weaver";

/**
 * Weaver photo and loom-clip uploads (BUILD_PLAN Phase 2 item 1, M6).
 *
 * Until the Blob store existed, photos were stored as data URLs in the
 * database and the loom clip was kept as a `blob:` object URL — which only
 * exists inside the tab that made it, so a clip recorded in /w/new was lost
 * the moment the page closed. Both are fixed by putting the bytes in Blob and
 * keeping only a URL.
 *
 * With no Blob token (local development) the route says so and the client
 * falls back to a data URL for photos, which still works.
 */

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_VIDEO_BYTES = 30 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const weaver = await getWeaver();
  if (!weaver) return NextResponse.json({ error: "Sign in as a weaver first." }, { status: 401 });

  if (!env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Blob storage isn't configured.", kind: "not-configured" }, { status: 503 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });

  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  if (!isVideo && !isImage) {
    return NextResponse.json({ error: "Only images and video can be uploaded." }, { status: 415 });
  }

  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) {
    return NextResponse.json(
      { error: `That file is larger than ${Math.round(limit / 1024 / 1024)} MB.` },
      { status: 413 },
    );
  }

  try {
    const { put } = await import("@vercel/blob");
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || (isVideo ? "mp4" : "jpg");
    const blob = await put(`listings/${weaver.id}/${crypto.randomUUID()}.${ext}`, file, {
      access: "public",
      contentType: file.type,
      token: env.BLOB_READ_WRITE_TOKEN,
    });
    return NextResponse.json({ url: blob.url, contentType: file.type });
  } catch (err) {
    console.error("[thari] blob upload failed", err);
    return NextResponse.json({ error: "The upload failed. Please try again." }, { status: 502 });
  }
}
