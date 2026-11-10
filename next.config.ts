import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  /**
   * cacheComponents (and the partial prefetching that rides on it) was a Next
   * 16 scaffold default, not something this app needs. It cost us a day of
   * strange failures: runtime data had to sit behind Suspense on every page,
   * and client components inside a nested async server component on /p/[id]
   * silently never hydrated, so the Pay with PayPal button could not be
   * clicked. The same button one level up worked. Disabling the flag removes
   * the whole class of problem and nothing in this app relies on it.
   */
  // Tailwind v4 runs through PostCSS (postcss.config.mjs), the setup Next 16
  // documents. `root` is pinned because a stray lockfile in the user's home
  // folder otherwise confuses Turbopack's workspace detection.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;

