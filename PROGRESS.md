# Progress

## HANDOFF (end of session 1, 2026-11-09)

### Done and verified (`npm test` 12/12, `tsc --noEmit`, `eslint src`, `npm run dev` → 200)
- **Phase 0: complete except the push.** Next.js 16.4.5 (App Router, TS strict, Tailwind v4, ESLint, `src/`), Prettier, Vitest 5, MIT LICENSE, `.gitignore`, `.env.example`, README stub, `src/lib/env.ts` (Zod; dev prints missing vars, production throws), `src/instrumentation.ts` runs the check at startup.
- **Phase 1, partly done:**
  - [x] 1. `src/app/globals.css`: section 8 tokens (verbatim) + component CSS + typography classes; fonts via `next/font` in `src/app/layout.tsx` (Manrope, Noto Sans Tamil, Fraunces).
  - [x] 2. Components: `src/components/ui.tsx` (Button, IconButton, TextField, StatusChip, AuthenticityBadge, PlaceholderImage, Wordmark), `src/components/ListingCard.tsx`, `src/components/Nav.tsx` (TopNav, BuyerBottomNav, WeaverBottomNav).
  - [ ] 3. Prisma schema + migrate + seed. **Not started (needs M5).**
  - [ ] 4. Session + `/api/demo-login` + `/demo`. Not started.
  - [~] 5. Buyer home `/` renders 8 listings from **temporary static data** (`src/lib/sample.ts`); checked at 375px and 1280px. `/explore` and `/p/[id]` not started.
  - [x] 6. `src/lib/money.ts` + `src/lib/fsm.ts` with tests.

### Exact next task
1. Get M5 (Neon `DATABASE_URL` pooled + `DIRECT_URL` direct) into `.env.local`.
2. Read the Prisma 7 + Neon docs (https://neon.tech/docs/guides/prisma and Prisma 7 upgrade notes). Prisma 7 moves the datasource URL into `prisma.config.ts` and needs a driver adapter (`@prisma/adapter-pg` is installed; `@prisma/adapter-neon` is an option).
3. Create `prisma/schema.prisma` (BUILD_PLAN section 7), `prisma.config.ts`, `src/lib/db.ts`; run `npx prisma migrate dev --name init`.
4. Write `prisma/seed.ts` (section 14.1) and switch `src/app/page.tsx` from `SAMPLE_LISTINGS` to Prisma queries; delete `src/lib/sample.ts`.
5. Then Phase 1 items 4 and 5 (session, `/demo`, `/explore`, `/p/[id]`).

### Half-done / broken / blocked
- **The first push may not have gone through.** Browser sign-in (Git Credential Manager) on this laptop authenticated as the laptop owner's GitHub account, so `Repository not found`. Fix: push with your PAT, e.g. `git -c credential.helper= push -u origin main` and paste the PAT at the password prompt. On your own laptop a normal push is fine.
- Home page uses static sample data until the seed exists.
- Category chips on `/` are visual only (no filtering yet).

### MANUAL items
| ID | Status |
|---|---|
| M1 GitHub repo | Done (repo exists, remote set). Repo is github.com/Shoaibahmed-2005/Thari_Paypal (not thari-paypal) |
| M2 PayPal sandbox app | Pending |
| M3 Sandbox accounts | Pending |
| M4 Gemini key | Pending |
| M5 Neon | Pending, **needed first next session** |
| M6 Vercel + Blob | Pending (Phase 1 Blob / Phase 5 deploy) |
| M7–M12 | Later phases |

### Env vars (names only). `.env.local` does not exist yet, so **none are set**.
`APP_URL` (default http://localhost:3000), `SESSION_SECRET` (agent generates), `DATABASE_URL`, `DIRECT_URL`, `BLOB_READ_WRITE_TOKEN`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_TTS_MODEL`, `GEMINI_TTS_VOICE`, `AI_MODE` (default live), `PAYPAL_ENV` (default sandbox), `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `FX_INR_PER_USD` (default 88), `SHIPPING_USD` (default 20), `DEFAULT_COOP_COMMISSION_PCT` (default 10), `SANDBOX_BUYER_EMAIL`, `SANDBOX_WEAVER_EMAIL`, `SANDBOX_COOP_EMAIL`.

### Fresh-machine setup
```bash
git clone https://github.com/Shoaibahmed-2005/Thari_Paypal.git
cd Thari_Paypal
npm install
cp .env.example .env.local        # then fill in values (never commit)
npx prisma migrate dev            # once prisma/ exists (next session)
npx prisma db seed                # once seed exists (next session)
npm run dev                       # prints any missing env vars
npm test
```
Needs Node 22+.

### Deviations from BUILD_PLAN.md and why
- **Prisma 7.10.1, not npm `latest`:** the `latest` tag currently points to an 8.0 release candidate. Prisma 7 changes the setup (see next task).
- **`@types/node` 22:** Vitest 5 requires it.
- **`vitest.config.mts`** (ESM) instead of `.ts`, to avoid a Vite CJS warning.
- **Component CSS wrapped in `@layer components`:** Tailwind v4 utilities are layered, so unlayered component CSS was overriding `md:hidden`. Token and component values are unchanged.
- **Tailwind tokens exposed via `@theme inline`** (`bg-coral`, `text-maroon`, ...) as aliases of the section 8 variables.
- **Next 16 scaffold defaults kept:** `cacheComponents` and `partialPrefetching` in `next.config.ts`; `turbopack.root` set because of a stray lockfile in the user's home folder. If dynamic pages complain about caching, read `node_modules/next/dist/docs/` first.
- `AGENTS.md` has a block appended by `next dev`; it's committed so the tree stays clean.
- Not yet installed (later phases): ag-grid-react/community, mcp-handler, extendable-media-recorder(+wav-encoder).
