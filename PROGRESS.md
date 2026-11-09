# Progress

## HANDOFF (end of session 1, 2026-11-09)

### Done and verified (`npm test` 12/12, `tsc --noEmit`, `eslint src prisma`, `npm run dev` → 200)
- **Phase 0: complete and pushed.** Next.js 16.4.5 (App Router, TS strict, Tailwind v4, ESLint, `src/`), Prettier, Vitest 5, MIT LICENSE, `.gitignore`, `.env.example`, README stub, `src/lib/env.ts` (Zod; dev prints missing vars, production throws), `src/instrumentation.ts` runs the check at startup.
- **Phase 1, partly done:**
  - [x] 1. `src/app/globals.css`: section 8 tokens (verbatim) + component CSS + typography classes; fonts via `next/font` in `src/app/layout.tsx` (Manrope, Noto Sans Tamil, Fraunces).
  - [x] 2. Components: `src/components/ui.tsx` (Button, IconButton, TextField, StatusChip, AuthenticityBadge, PlaceholderImage, Wordmark), `src/components/ListingCard.tsx`, `src/components/Nav.tsx` (TopNav, BuyerBottomNav, WeaverBottomNav).
  - [~] 3. Prisma: **code done, not yet run against a database.** `prisma/schema.prisma` (section 7 + `titleTa` from 10.4), `prisma.config.ts`, `src/lib/db.ts` (Neon adapter), `prisma/seed.ts` (idempotent: co-op, 3 weavers, buyer, co-op admin, 8 LIVE listings with 6 verified, 1 SOLD with PAID order + 2 succeeded payouts + heard notification). `prisma validate` and `prisma generate` pass. **Migrate + seed wait on M5.**
  - [ ] 4. Session + `/api/demo-login` + `/demo`. Not started.
  - [~] 5. Buyer home `/` reads LIVE listings from the DB (`src/lib/listings.ts`, streamed in `<Suspense>`). With no `DATABASE_URL` it falls back to `src/lib/sample.ts`; on a DB error it shows a friendly message. Checked at 375px and 1280px. `/explore` and `/p/[id]` not started.
  - [x] 6. `src/lib/money.ts` + `src/lib/fsm.ts` with tests.

### Exact next task
1. **Fill in `DATABASE_URL` and `DIRECT_URL` in `.env.local`** (M5, see "Create .env.local" below). The Neon project already exists: open it → Connect, and copy both strings. Save the file, then confirm with `npm run dev` (they should no longer be listed as missing).
2. Run `npx prisma migrate dev --name init`, then `npx prisma db seed`. Expect "Seeded: 8 live listings, 1 orders, 2 payouts". Run the seed twice to confirm nothing duplicates.
   - If you see SSL error P1010, add `ssl: { rejectUnauthorized: false }` handling per the Prisma 7 docs.
3. `npm run dev` → `/` should show the 8 seeded listings (not the sample ones). Then delete `src/lib/sample.ts` and its fallback in `src/lib/listings.ts`.
4. Phase 1 item 4: `src/lib/session.ts` (iron-session, cookie `thari_session`), `src/app/api/demo-login/route.ts`, `src/app/api/logout/route.ts`, `src/app/demo/page.tsx` (section 9.1).
5. Phase 1 item 5: `src/app/explore/page.tsx`, `src/app/p/[id]/page.tsx` (section 9.2, PayPal button stub, JSON-LD).

### Half-done / broken / blocked
- **Blocked on M5:** migrations and seed haven't run.
- `.gitignore` excludes `src/generated/` (Prisma client). `npm install` regenerates it through the `postinstall` script.
- Category chips on `/` are visual only (no filtering yet).
- The seed uses `/media/placeholder-loom.mp4` as the loom clip URL for verified pieces until M7 real media exists. The file doesn't exist yet; the product page should show the woven placeholder when the video fails.
- Pushing from the friend's laptop: browser sign-in there uses the owner's GitHub account. Use Git Credential Manager's token dialog: `git -c credential.gitHubAuthModes=pat push`. On your own laptop a normal push is fine.

### Create `.env.local` (do this first on any new machine)
`.env.local` holds all secrets. It is git-ignored, so it never reaches GitHub and must be recreated on each machine.
1. Copy the template: `cp .env.example .env.local` (PowerShell: `Copy-Item .env.example .env.local`).
2. Generate `SESSION_SECRET` (32+ random chars): `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` and paste the output after `SESSION_SECRET=`.
3. Set `AI_MODE=mock` until you have a Gemini key (M4); switch to `live` after.
4. Fill in each value from where it comes from:

| Variable | Where to get it | MANUAL |
|---|---|---|
| `DATABASE_URL` | Neon → project `thari` → Connect → pooling **ON** (host has `-pooler`) | M5 |
| `DIRECT_URL` | Neon → Connect → pooling **OFF** | M5 |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | developer.paypal.com → Apps & Credentials → **Sandbox** → app "Thari" | M2 |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | same value as `PAYPAL_CLIENT_ID` | M2 |
| `SANDBOX_BUYER_EMAIL`, `SANDBOX_WEAVER_EMAIL`, `SANDBOX_COOP_EMAIL` | PayPal → Testing Tools → Sandbox Accounts | M3 |
| `GEMINI_API_KEY` | aistudio.google.com/apikey | M4 |
| `GEMINI_MODEL`, `GEMINI_TTS_MODEL`, `GEMINI_TTS_VOICE` | Agent picks current IDs from ai.google.dev/gemini-api/docs/models and speech-generation docs | M4 |
| `BLOB_READ_WRITE_TOKEN` | Vercel → Storage → Blob store | M6 |
| `PAYPAL_WEBHOOK_ID` | PayPal app → Webhooks (after first deploy) | M9 |
| `APP_URL`, `PAYPAL_ENV`, `FX_INR_PER_USD`, `SHIPPING_USD`, `DEFAULT_COOP_COMMISSION_PCT` | keep the defaults from `.env.example` | — |

5. Run `npm run dev`. The terminal lists any required variables still missing.

Never paste these values into chat, commits or screenshots.

### MANUAL items
| ID | Status |
|---|---|
| M1 GitHub repo | Done: github.com/Shoaibahmed-2005/Thari_Paypal (not thari-paypal), pushed |
| M2 PayPal sandbox app | Pending |
| M3 Sandbox accounts | Pending |
| M4 Gemini key | Pending |
| M5 Neon | **Neon project created**, but the URLs never got saved into `.env.local` on the session-1 laptop, so migrate/seed haven't run. **First thing next session:** put both URLs in `.env.local` on your laptop |
| M6 Vercel + Blob | Pending (Phase 1 Blob / Phase 5 deploy) |
| M7–M12 | Later phases |

### Env vars (names only)
On the session-1 laptop, `.env.local` had only `SESSION_SECRET` (generated) and `AI_MODE=mock`; everything else was empty. Your own laptop needs a fresh `.env.local` (see above).
`APP_URL` (default http://localhost:3000), `SESSION_SECRET` (agent generates), `DATABASE_URL`, `DIRECT_URL`, `BLOB_READ_WRITE_TOKEN`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_TTS_MODEL`, `GEMINI_TTS_VOICE`, `AI_MODE` (default live), `PAYPAL_ENV` (default sandbox), `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `FX_INR_PER_USD` (default 88), `SHIPPING_USD` (default 20), `DEFAULT_COOP_COMMISSION_PCT` (default 10), `SANDBOX_BUYER_EMAIL`, `SANDBOX_WEAVER_EMAIL`, `SANDBOX_COOP_EMAIL`.

### Fresh-machine setup
```bash
git clone https://github.com/Shoaibahmed-2005/Thari_Paypal.git
cd Thari_Paypal
npm install                       # also runs `prisma generate` (postinstall)
cp .env.example .env.local        # then fill in values, see "Create .env.local" (never commit)
npx prisma migrate dev --name init   # needs DATABASE_URL + DIRECT_URL
npx prisma db seed
npm run dev                       # prints any missing env vars
npm test
```
Needs Node 22+.

### Deviations from BUILD_PLAN.md and why
- **Prisma 7.10.1, not npm `latest`:** the `latest` tag currently points to an 8.0 release candidate. Prisma 7 changes the setup:
  - generator `prisma-client` with output `src/generated/prisma` (import from `@/generated/prisma/client`)
  - no `url`/`directUrl` in `schema.prisma`; the CLI uses `DIRECT_URL` from `prisma.config.ts`, and the app uses pooled `DATABASE_URL` via `@prisma/adapter-neon` (Neon's recommendation)
  - Prisma no longer auto-loads env files, so `prisma.config.ts` and `seed.ts` load `.env.local` with `dotenv`
  - seed is configured in `prisma.config.ts` (`migrations.seed`) and doesn't run automatically after migrate
- **`titleTa` added to `Listing`** (section 10.4 asks for it; section 7's model didn't have it).
- **`@types/node` 22:** Vitest 5 requires it.
- **`vitest.config.mts`** (ESM) instead of `.ts`, to avoid a Vite CJS warning.
- **Component CSS wrapped in `@layer components`:** Tailwind v4 utilities are layered, so unlayered component CSS was overriding `md:hidden`. Token and component values are unchanged.
- **Tailwind tokens exposed via `@theme inline`** (`bg-coral`, `text-maroon`, ...) as aliases of the section 8 variables.
- **Next 16 scaffold defaults kept:** `cacheComponents` and `partialPrefetching` in `next.config.ts`; `turbopack.root` set because of a stray lockfile in the user's home folder. If dynamic pages complain about caching, read `node_modules/next/dist/docs/` first.
- `AGENTS.md` has a block appended by `next dev`; it's committed so the tree stays clean.
- Not yet installed (later phases): ag-grid-react/community, mcp-handler, extendable-media-recorder(+wav-encoder).
