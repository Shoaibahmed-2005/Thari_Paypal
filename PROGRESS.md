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

### Phase 1 COMPLETE (2026-11-10). Phase 2 core COMPLETE (2026-11-10)

**Phase 1 acceptance passed:** `/demo` -> Buyer -> `/` shows all 8 seeded listings in brand styling at 390px and 1280px; `/p/[id]` complete (gallery, price block, PayPal stub, authenticity panel, loom clip, details, story, Product JSON-LD, Sold state); `/explore` search and filters working.

**Phase 2, verified end to end in the browser with `AI_MODE=mock`:**
- Weaver demo login -> `/w` renders entirely in Tamil: greeting, "sell a new piece", her pieces with Tamil titles and status chips, money summary. The phone column is centred on a laptop per 8.5.
- `/w/new` seven-step flow (speak -> photos -> clip -> working -> questions -> read-back -> done) with progress dots. Ran it: sample voice note -> skip photos -> skip clip -> **the AI asked the length question in Tamil ("புடவை எத்தனை மீட்டர்?") exactly as BUILD_PLAN 14.3 predicts** -> answer merged (6.5 m) -> Tamil read-back ending "வெளியிடலாமா?" with the English title and $205 -> published -> "உங்கள் புடவை பட்டியலில் உள்ளது".
- The published listing appeared on `/explore`, showed 6.5 metres and $205 on its product page, and correctly carried **no** Verified badge (co-op confirmation is Phase 4). The verification listing was deleted afterwards, so the database is back to the 8 seeded ones.
- `src/lib/ai/`: `client.ts` (45 s timeout, one retry on 429/5xx, Zod validation, AgentLog row, typed AiError, mock short-circuit), `schemas.ts`, `prompts.ts` (language is a parameter), `listing.ts` (extractListing / answerQuestion / regenerateCopy), `fixtures/extract-sample.json` matching the 14.3 script.
- Routes: `POST /api/listings/draft`, `POST /api/listings/[id]/answer`, `POST /api/listings/[id]/publish`. USD is computed server-side from INR (rule 4); publish runs through the listing FSM.
- `src/lib/i18n.ts` carries the weaver UI strings in Tamil, Hindi, Telugu, Bengali and English, with English filling any gap. Devanagari, Telugu and Bengali fonts load via `next/font`.
- Fixed: iron-session calls `Date.now()` while unsealing, which Cache Components flags during prerendering, so `getCurrentUser()` now calls `connection()` first.

### M4 done: Gemini is live and verified (2026-11-11)
- `GEMINI_API_KEY` set by the human. Model IDs chosen from the live `/v1beta/models` listing and aistudio.google.com/docs, not from memory:
  - `GEMINI_MODEL=gemini-3.6-flash`, `GEMINI_TTS_MODEL=gemini-3.8-flash-tts`, `GEMINI_TTS_VOICE=Sulafat` (the voice the docs call "warm").
  - **gemini-3.8-flash and 3.7-flash were both returning 503 "experiencing high demand"** when tested, while 3.6-flash answered in 2.6s. `client.ts` now falls through a candidate list on 503/429 rather than failing, so a demand spike during judging cannot kill the demo.
- **`AI_MODE=live` verified end to end through the real route.** Posted the generated Tamil WAV to `/api/listings/draft`: 200 in 20s, transcribed the Tamil, extracted ₹18,000 (-> $205 computed server-side), returned status NEEDS_ANSWERS with one Tamil question about length, and a Tamil read-back ending "வெளியிடலாமா?". The test draft was deleted afterwards.
- **M8 DONE with a real human voice (2026-11-11).** The owner recorded both clips; they live at `public/samples/sample-voice-ta.m4a` and `sample-answer-ta.m4a` (AAC in MP4, straight off a phone — Gemini accepts it as `audio/aac`). The synthetic TTS stand-ins were deleted. `scripts/make-sample-voice.ts` is kept only as a way to regenerate stand-ins if the real files are ever lost.
  - Verified live: the recording transcribed as "நான் ஒரு காஞ்சிபுரம் பட்டுப்புடவை நெய்திருக்கேன்... விலை பதினெட்டாயிரம் ரூபாய். நெய்ய ஆறு வாரம் ஆச்சு", ₹18,000 -> $205, the length question was asked in colloquial Tamil, and the answer clip came back understood with value 6.5 -> READY_TO_CONFIRM.
  - **The length question is now guaranteed, not left to the model.** On one live run Gemini skipped it, which would have cut the best beat out of the demo. The prompt now insists on it, and `/api/listings/draft` adds `lengthQuestionFor(lang)` if the model still omits it for a saree with no length.
- **Deviation from 10.3:** the plan expected raw PCM needing a WAV header. Unary TTS responses already return `audio/wav` with a RIFF header, so the wrapper only runs if a response ever comes back headerless.
- **Deviation:** TTS is called over REST, not through `@google/genai`. The installed SDK serialises `speechConfig` in a way the API rejects ("Unknown name speechConfig at generation_config") while the identical shape over REST returns 200. Text generation through the SDK is fine.

### PHASE 3 PROVEN LIVE: a real sandbox purchase paid the weaver (2026-11-11)
A full buy ran end to end against the PayPal sandbox and every step was verified at PayPal, not just in our database:
- Order created ($225.00 = $205 item + $20 shipping), buyer approved, **capture 44968660CK8999534**, order PAID, listing SOLD.
- Weaver notified in Tamil from the template: "உங்கள் ஆரஞ்சு பட்டுப் புடவை விற்பனையானது. ₹16,236 உங்களுக்கு வருகிறது."
- **Split paid out: $184.50 to the weaver's sandbox account, $20.50 to the co-op's**, batch accepted by PayPal.
- Test orders were deleted afterwards and the seed re-run, so the demo database is pristine: 8 live listings, 1 seeded order.

**Four real bugs this shook out, none of which any amount of code review would have found:**
1. **`cacheComponents` broke checkout silently.** Client components inside a nested async server component on `/p/[id]` never hydrated, so the Pay button could not be clicked. Proven by rendering the same button inside and outside: outer worked, inner did not, in dev and in a production build. The flag is off now (`next.config.ts`).
2. **`/checkout/return` did not exist.** We pass it to PayPal as `return_url`. When the popup is a separate browser window PayPal redirects there instead of calling `onApprove` — a real approved payment landed on a 404 and was never captured. The route now exists and shares `captureAndFulfil` with the API route; both are idempotent.
3. **Payouts v1 wants `amount.currency`, Orders v2 wants `amount.currency_code`.** Reusing the Orders helper made PayPal answer VALIDATION_ERROR, "may not be null". BUILD_PLAN 11.4 had it right and we didn't follow it.
4. **The seed's fallback payout addresses reached PayPal.** The database had been seeded before `SANDBOX_*_EMAIL` existed, so payouts went to `weaver-sandbox@example.com` and came back UNCLAIMED / RECEIVER_UNREGISTERED. Re-seeding fixed it, and `retryPayouts` now re-reads the current address rather than trusting the one stored at failure time.

**Also built:** `POST /api/payouts/[orderId]/retry` (co-op only) — the Retry button's endpoint from BUILD_PLAN 11.4, which Phase 4's dashboard will call. It lives under `/api/payouts` because Next forbids two different dynamic slug names at one path level.

**Sandbox accounts must be United States.** Indian sandbox accounts were rejected at checkout with "this seller doesn't accept payments in your currency", exactly as BUILD_PLAN 11.4 warned. The app and all four accounts were recreated as US.

### PHASE 4 COMPLETE (2026-11-11): co-op dashboard + agentic commerce
**Co-op dashboard `/coop`** (co-op only; a weaver is redirected). Overview tiles, three AG Grid 36 tables (listings, orders, payouts) with sorting, filtering, per-grid quick search and CSV export, themed from the brand tokens. Confirm/undo a piece, play its loom clip in a side panel, refund an order, retry a failed payout, and a readable activity feed built from AgentLog. **Confirming is what turns the Verified badge on** and is refused for anyone but the co-op (403) and for pieces with no loom clip.

**Agentic commerce**, all three tools defined once in `src/lib/tools.ts` and shared:
- **`/assistant`** — Gemini function calling, verified live: "Find a verified silk saree under 250 dollars" returned the two real verified silk pieces under $250, named their weavers, and rendered them as cards. Falls back to a real database search in `AI_MODE=mock`.
- **`/api/mcp`** — MCP Streamable HTTP via `mcp-handler` + SDK 1.32 (`registerTool`, not the deprecated `.tool()`). Verified with raw JSON-RPC: `tools/list` returns all three; `search_listings` with `{fabric:"silk", maxPriceUsd:250, verifiedOnly:true}` returned the right two; **`create_checkout` prepared a real $180 PayPal order and returned an approveUrl with `paid: false`.**
- **`/api/catalog.json`** — 8 items, schema.org-shaped, 60s cache, each carrying `verifiedHandwoven` and the evidence sentence behind it.

**An AI never pays.** `create_checkout` prepares an order and returns a link; a human approves it in PayPal. The tool says so in its own output rather than relying on the caller.

### Exact next task
**Phase 5 — deploy, webhooks, polish.** This is now the critical path.
1. **M6:** Vercel project + Blob store -> `BLOB_READ_WRITE_TOKEN`. Set every `.env.local` value as a Vercel environment variable, with `APP_URL` as the deployed URL.
2. Deploy, then **M9:** create the webhook in the PayPal app pointing at `https://<url>/api/paypal/webhook`, paste `PAYPAL_WEBHOOK_ID`, redeploy. **`/api/paypal/webhook` is not built yet** (BUILD_PLAN 11.7) — build it with signature verification and `WebhookEvent` idempotency.
3. Swap `/w/new` photo data-URLs for Vercel Blob uploads.
4. Re-run the full demo against the deployed URL before filming.
5. **M10** video, **M11** Devpost submission.


1. **Phase 2 leftovers, in priority order** (see the blocked list below): Blob upload (needs M6) to replace data-URL photos; a WAV encoder for live-mode recording; `/w/sales`, `/w/money`, `/weavers/[id]`.
2. **Phase 3 — PayPal checkout, capture, split, notification** (BUILD_PLAN section 11, Phase 3 in section 15). Needs **M2 and M3**: the sandbox app credentials and the three sandbox account emails. Ask for these next.
3. Phase 4 adds `/coop` (AG Grid), which is also what sets `coopConfirmedAt` and turns the Verified badge on for newly created listings, plus refunds.

### Half-done / broken / blocked
- **Photos from `/w/new` are stored as data URLs in `Photo.url`, not uploaded to Blob.** M6 isn't available, Vercel's filesystem is read-only, and resized JPEGs are roughly 150 KB each, so this works for the demo. Swap to `@vercel/blob` once `BLOB_READ_WRITE_TOKEN` exists.
- **Live-mode microphone recording needs a WAV encoder.** The recorder uses the browser's own MediaRecorder, which gives webm/opus; Gemini wants wav/mp3/aac/ogg/flac. BUILD_PLAN lists `extendable-media-recorder` + `-wav-encoder` for exactly this and they are still not installed. Mock mode ignores the audio, and the live demo path uses the sample WAV (M8), so this only blocks recording a *new* voice note against live Gemini.
- **`/samples/sample-voice-ta.wav` does not exist yet (M8).** The "use sample voice note" button currently just advances the step, which is all mock mode needs. Record it before the live demo.
- **TTS (`/api/tts`, BUILD_PLAN 10.3) is not built.** The Tamil read-back and the notification card fall back to the browser's `speechSynthesis`, which works but sounds robotic. Build it with M4.
- **The non-Tamil UI strings in `src/lib/i18n.ts` were written by the model.** Tamil is the demo language and reads correctly; Hindi, Telugu and Bengali want a native speaker's check before submission.
- `/w/sales`, `/w/money` and `/weavers/[id]` are linked but not built; the weaver bottom nav points at two of them.
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
