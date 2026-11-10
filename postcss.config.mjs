/**
 * Tailwind CSS v4 via PostCSS, the setup Next 16 documents
 * (node_modules/next/dist/docs/01-app/01-getting-started/11-css.md).
 * The @tailwindcss/turbopack loader rule we had in next.config.ts silently
 * emitted no utilities at all, so every Tailwind class in the app was a no-op.
 */
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
