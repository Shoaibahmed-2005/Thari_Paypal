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

- **Fixed: Tailwind was emitting no utilities at all.** `next.config.ts` ran Tailwind v4 through a `turbopack.rules` `@tailwindcss/turbopack` loader. That silently produced zero utility classes, so every `mx-auto`, `grid`, `md:*`, `bg-coral` etc. in the app was a no-op and both `/` and `/demo` rendered as unstyled full-bleed stacks (only the hand-written `.th-*` CSS worked). Switched to the setup Next 16 documents (`node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`): `@tailwindcss/postcss` + `postcss.config.mjs`, loader rule and `@tailwindcss/turbopack` removed. Checked in the browser at 1280px -- hero, grid, cards and spacing are correct now.

### Phase 1 is COMPLETE. Acceptance (section 15) passed 2026-11-10
- `/demo` 200 -> Buyer login 307 -> `/` shows all **8** seeded listings in brand styling, checked at **390px and 1280px**.
- `/p/[id]` complete: gallery with thumbnails, Tamil sub-title, "Woven by ... in ...", price block (USD + approx INR + $20 shipping), PayPal button stub, full AuthenticityBadge panel, LoomClipPlayer serving the real 10s clip (200, 5.3 MB), details table, craft story, schema.org Product JSON-LD. `seed-l9` correctly shows the Sold chip and a disabled button.
- `/explore` server-side search across title, description, fabric, weave, colour and weaver name, plus category chips (All / Silk / Cotton / Dupattas), three sorts and an empty state. Home chips link through to it.
- `npm run build` clean, `tsc --noEmit` clean, `eslint src prisma` clean, `npm test` 12/12.

### Exact next task
**Phase 2 — weaver listing creation with AI** (BUILD_PLAN section 15, screens in 9.3, AI design in 10).
1. `/w` weaver home: greeting, latest unheard notification card with play button, "sell a new piece" button, my-pieces list with StatusChips, money summary. Note the weaver demo login already redirects here, so `/w` is currently a 404 -- this closes that.
2. `/w/new` step flow (9.3): speak -> photos -> loom clip -> working -> questions -> read-back and confirm -> done.
3. `src/lib/ai/` with `AI_MODE=mock` fixtures first, so the whole flow runs before M4 (Gemini key) arrives.
4. **Carry the language work through:** the weaver UI's hardcoded strings need a per-language dictionary keyed off `User.preferredLang` (see `src/lib/languages.ts`), plus the language picker and `next/font` loading for Devanagari, Telugu and Bengali. The AI prompts take the language as a parameter, not a hardcoded "Tamil".
5. `/coop` is also still a 404; it is Phase 4.

### Half-done / broken / blocked
- `/api/demo-login?role=weaver` and `?role=coop` redirect to `/w` and `/coop`, which don't exist yet (Phase 2 and Phase 4). The buyer role works end to end today.
- The same loom clip is reused for every verified listing. Fine for the demo; swap per-piece clips if more arrive.
- `.gitignore` excludes `src/generated/` (Prisma client). `npm install` regenerates it through the `postinstall` script.
- `/weavers/[id]` is linked from the product page but not built yet (Phase 2).
- Colour search matches a colour array element exactly; partial colour words are caught by the title search instead.
- The authenticity panel shows no "filmed on" date: no filming date is recorded until the Phase 2 upload flow captures one, and inventing one on a trust badge is worse than omitting it.

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
| M5 Neon | **Done.** Project created 2026-11-10, migrated and seeded. |
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
- **The weaver's language is a setting, not Tamil hardcoded** (decided 2026-11-10, deviates from BUILD_PLAN sections 7, 9.3 and 10). BUILD_PLAN assumed Tamil everywhere, down to the column names. The app is now language-agnostic: `User.preferredLang` (chosen at sign-up, changeable in settings), `Listing.lang` snapshotting what she actually spoke for that piece so an old listing stays correct if she switches, and `Notification.lang`. Renamed `titleTa` -> `titleNative`, `transcriptTa` -> `transcriptNative`, `readbackTa` -> `readbackNative`, `bioTa` -> `bioNative`, `textTa` -> `textNative`. `src/lib/languages.ts` holds the supported set (Tamil, Hindi, Telugu, Bengali, English) plus a font stack per script. Gemini handles all of them natively, so the AI side becomes a prompt parameter rather than separate code paths.
  - **Why now:** the language was baked into database columns, and the first migration had not run yet. Doing this later would have meant a second migration against live demo data close to the deadline.
  - **Still to do when Phase 2 builds `/w`:** the weaver UI's own hardcoded strings need a dictionary per language, the language picker at sign-up and in settings, and `next/font` loading for Devanagari, Telugu and Bengali. Brand tokens, including `--font-tamil`, are untouched.
  - **The demo still runs in Tamil** (seeded weavers have `preferredLang: "ta"`), so the recorded footage and sample voice note stay valid.

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
