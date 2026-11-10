# Progress

## HANDOFF (session 2, 2026-11-10)

### Done and verified this session (`npm test` 12/12, `tsc --noEmit`, `eslint src prisma`, `npm run build` clean, `npm run dev` -> 200)
- **Repo set up on Shoaib's laptop** (`D:	hari_paypal`): `git init` + `origin` + `main`, local `user.name`/`user.email` set, `npm install` (578 packages, Node 24.14.1).
- **`.env.local` created** from `.env.example` with a freshly generated `SESSION_SECRET` and `AI_MODE=mock`. Everything else still empty.
- **M7 media (partial): real saree photos and loom clip are in.** Five supplied photos and one handloom clip moved to `/public/media` as `seed-l1-1.jpg`, `seed-l2-1.jpg`, `seed-l3-1.jpg`, `seed-l4-1.jpg`, `seed-l9-1.jpg`, `loom-handloom.mp4` (all committed; ~5.9 MB total). `prisma/seed.ts` now creates `Photo` rows for those five listings (fixed ids `<listingId>-pN`, upserted, so re-seeding does not duplicate), and `loomClipUrl` on verified listings points at the real clip instead of the `/media/placeholder-loom.mp4` path that never existed. Seed titles, colours, motifs and descriptions for l1-l4 and l9 were rewritten to match what is actually in each photo. The other four listings (cotton sarees, dupatta) keep the woven `PlaceholderImage`, which also keeps the verified/unverified contrast visible.
- **Phase 1 item 4 done: session + demo logins.**
  - `src/lib/session.ts`: iron-session 9, cookie `thari_session` `{ userId, role, name }`, httpOnly, sameSite lax, secure in production, 7-day maxAge. `DEMO_ROLES` maps weaver/buyer/coop to the seeded user ids. `getCurrentUser()` calls `unstable_rethrow` first so Next's own control-flow errors are not swallowed. Dev-only fallback password so the app boots before `SESSION_SECRET` exists; production still throws via `env.ts`.
  - `src/app/api/demo-login/route.ts`: `?role=weaver|buyer|coop` -> sets session, 307 to `/w`, `/` or `/coop`. Bad role -> 400. In-memory per-IP rate limit (20/min).
  - `src/app/api/logout/route.ts`: GET or POST, destroys the session, 307 to `/demo`.
  - `src/app/demo/page.tsx`: coral hero, three role cards, PayPal-sandbox box (buyer email reads `SANDBOX_BUYER_EMAIL`, shows a "set it in .env.local (M3)" note while empty), repo link. The signed-in notice reads the cookie, so it streams in behind `<Suspense>` per `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`; `/demo` builds as Partial Prerender.
  - Verified by curl: `/demo` 200, buyer login 307 -> `/` with `Set-Cookie`, weaver 307 -> `/w`, bad role 400, signed-in name renders, logout 307 -> `/demo`.

### Exact next task
1. **Still blocked on M5.** Put `DATABASE_URL` and `DIRECT_URL` in `.env.local` (Neon project `thari` -> Connect; pooling ON for `DATABASE_URL`, OFF for `DIRECT_URL`). Confirm with `npm run dev` -- they should drop off the missing list.
2. `npx prisma migrate dev --name init`, then `npx prisma db seed`. Expect `Seeded: 8 live listings, 1 orders, 2 payouts, 5 photos`. Run the seed twice; the counts must not change.
   - If you see SSL error P1010, add `ssl: { rejectUnauthorized: false }` handling per the Prisma 7 docs.
3. `npm run dev` -> `/` should show the 8 seeded listings with the five real saree photos. Then delete `src/lib/sample.ts` and its fallback in `src/lib/listings.ts`.
4. Phase 1 item 5: `src/app/explore/page.tsx` and `src/app/p/[id]/page.tsx` (section 9.2) -- gallery, PayPal button stub, LoomClipPlayer pointing at `/media/loom-handloom.mp4`, JSON-LD.
5. Then Phase 1 acceptance (section 15) before starting Phase 2.

### Half-done / broken / blocked
- **Blocked on M5:** migrations and seed haven't run, so `/` still renders `src/lib/sample.ts` and the real photos are not visible yet.
- `/api/demo-login?role=weaver` and `?role=coop` redirect to `/w` and `/coop`, which don't exist yet (Phase 2/3). The buyer role works end to end today.
- The same loom clip is reused for every verified listing. Fine for the demo; swap per-piece clips if more arrive.
- `.gitignore` excludes `src/generated/` (Prisma client). `npm install` regenerates it through the `postinstall` script.
- Category chips on `/` are visual only (no filtering yet).

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
| M7 Real content | **Partly done:** 5 saree photos + 1 loom clip supplied and wired into the seed. Still wanted: a photo of the weaver, and her written consent if a real name/face is used. |
| M8–M12 | Later phases |

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
