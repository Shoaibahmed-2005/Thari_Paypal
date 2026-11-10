import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Tailwind v4 runs through PostCSS (postcss.config.mjs), the setup Next 16
  // documents. `root` is pinned because a stray lockfile in the user's home
  // folder otherwise confuses Turbopack's workspace detection.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
