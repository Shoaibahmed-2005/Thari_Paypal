"use client";

import { useState } from "react";

/**
 * The loom clip behind the Verified handwoven badge (BUILD_PLAN 9.2).
 * Fails soft per rule 7: if the file is missing or the codec is unsupported,
 * the player is replaced by a line of text rather than a broken box.
 */
export function LoomClipPlayer({ src, poster, title }: { src: string; poster?: string | null; title: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <p className="t-caption m-0 text-ink-muted">
        The loom clip can&apos;t be played here. The co-op has confirmed this piece was woven by hand.
      </p>
    );
  }

  return (
    <video
      src={src}
      poster={poster ?? undefined}
      controls
      preload="metadata"
      playsInline
      muted
      onError={() => setFailed(true)}
      aria-label={`${title} being woven on the loom`}
      className="w-full bg-surface-tint"
      style={{ borderRadius: "var(--radius-md)", maxHeight: 420 }}
    />
  );
}
