"use client";

import { useState } from "react";
import { PlaceholderImage } from "./ui";

export interface GalleryProps {
  photos: { id: string; url: string }[];
  title: string;
  /** Varies the woven placeholder's hue when there are no photos yet. */
  seed?: number;
}

/**
 * Product gallery (BUILD_PLAN 9.2): one main image with thumbnails under it.
 * On mobile the strip scrolls horizontally, which is the swipe gesture.
 */
export function Gallery({ photos, title, seed = 0 }: GalleryProps) {
  const [active, setActive] = useState(0);
  const current = photos[active];

  return (
    <div className="flex flex-col gap-3">
      <div className="th-listing__media m-0 bg-surface-tint">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.url} alt={title} className="h-full w-full object-cover" />
        ) : (
          <PlaceholderImage seed={seed} label={`${title} — photo coming soon`} />
        )}
      </div>

      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="More photos">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Photo ${i + 1} of ${photos.length}`}
              aria-current={i === active}
              className="h-16 w-16 flex-none overflow-hidden"
              style={{
                borderRadius: "var(--radius-md)",
                outline: i === active ? "2px solid var(--primary)" : "none",
                outlineOffset: 2,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
