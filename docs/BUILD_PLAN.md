# Thari — Build Plan (PayPal AI Hackathon 2026)

> **For the coding agent (Claude, Antigravity or any other):** this file is the single source of truth. Read it fully before writing code. Build phase by phase (section 15). At every `MANUAL` item, stop and ask the human for exactly what is listed, then continue. Keep `PROGRESS.md` updated after every task (what is done, what is next, anything blocked). Never commit secrets. Never change the brand tokens in section 8.

---

## 0. Rules for the agent

1. **Work in phases, in order.** Finish a phase's acceptance tests before starting the next. If the human's session ends mid-phase, write the exact next step in `PROGRESS.md`.
2. **Ask, don't guess, at `MANUAL` items** (section 4). Ask for one item at a time, say why it is needed, and say where to paste it (`.env.local` or the hosting dashboard). Never ask the human to paste secrets into chat if a file is possible; if they do, put them in `.env.local` only.
3. **Verify facts that change.** Before using a model name, SDK call or API field, check the official docs linked in section 19. Model names in this plan are placeholders read from environment variables for that reason.
4. **Never trust the browser with money.** Prices, totals and splits are always computed on the server from the database.
5. **Every PayPal write call carries a `PayPal-Request-Id`** (idempotency key) derived from our own IDs, so retries never double-charge or double-pay.
6. **Every post-payment action runs through one idempotent function** (`fulfillOrder`, section 11.6) that both the capture route and the webhook call. Running it twice must change nothing.
7. **Fail soft in the UI.** A failed AI call or payout never crashes a page. Show a friendly message and a retry button, and log the error.
8. **Type everything.** TypeScript strict mode, Zod for every API input and every AI JSON output, and Zod validation of env vars at startup.
9. **Tests are part of done.** Unit tests for pricing, splits, the order state machine and webhook idempotency must pass (`npm test`) before each phase is marked complete.
10. **Commit after each task** with a clear message. Keep the repo public-ready at all times: README, MIT `LICENSE`, `.env.example`, no keys.

---

## 1. What we are building (plain words)

**Thari** (தறி, Tamil for *loom*) lets a handloom weaver in Tamil Nadu sell to buyers worldwide using only her voice and phone, with proof that each piece is genuinely handwoven.

**The end-to-end story the app must support:**

1. **Weaver (mobile, Tamil, voice-first).** She records a Tamil voice note ("I wove a Kanchipuram silk saree, orange and yellow, peacock border, blouse piece included, unstitched, ₹18,000, took six weeks"), adds 3–6 photos and a 10–20 second clip of the piece on her loom.
2. **AI turns it into a listing.** It extracts structured fields, writes an English title, description and craft story, and converts the price to USD. If something important is missing (fabric, length), it **asks her in spoken Tamil** and she answers by voice. It reads the final listing back in Tamil, and **nothing goes live until she says yes**.
3. **Co-op confirms authenticity.** Her weavers' cooperative confirms the piece and the loom clip. Only then does the listing show the gold **Verified handwoven** badge.
4. **Listed in two places.** An Amazon-style product page on the Thari website, and a machine-readable catalog that AI shopping assistants can search (our in-app buyer assistant, an MCP endpoint for Claude and other agents, and a JSON product feed).
5. **Buyer pays with PayPal.** On the website, or through the AI assistant, which prepares a PayPal checkout that the buyer approves. An AI never pays on its own.
6. **Money is split automatically.** PayPal Payouts sends the weaver her share and the co-op its commission.
7. **The weaver hears it.** Her phone says in Tamil: "Your saree sold. ₹16,200 is coming to you." AI drafts the export paperwork. She or the co-op adds tracking, and the buyer is notified through PayPal.
8. **Problems are handled.** The co-op can refund through PayPal from its dashboard.

**Who uses what:**

| Role | Device | Language | Area of the app |
|---|---|---|---|
| Weaver | Phone | Tamil, mostly voice | `/w/*` |
| Buyer abroad | Laptop and phone | English | `/`, `/explore`, `/p/*`, `/assistant`, `/orders` |
| Co-op admin | Laptop | English | `/coop/*` |
| Judge | Laptop | English | `/demo` (one-click role switch) |

---

## 2. Hackathon requirements this build must satisfy

| Requirement (from Devpost rules and emails) | How we satisfy it | Where |
|---|---|---|
| Meaningful use of **PayPal** (sandbox is fine) | Orders v2 checkout via JS SDK v6, capture, Payouts split, Catalog Products, order tracking, refunds, verified webhooks | Section 11 |
| Meaningful use of **AI** | Tamil voice understanding, photo understanding, listing writing, Tamil voice questions and read-back, Tamil TTS notifications, buyer shopping assistant with tools, MCP endpoint, export-paper drafting | Section 10, 12 |
| **Working build judges can use** without installing | Hosted URL, `/demo` page with one-click roles, sandbox buyer login shown on the page, "use sample voice note" button for judges who don't speak Tamil | Section 9, 14 |
| **Public repo** with README and **open source license** | GitHub public, MIT `LICENSE` at root, README with architecture, setup, test logins | Section 17 |
| **Hide API keys** | Env vars only, `.env.example` committed, `.env*` ignored | Section 5 |
| **Video under 3 minutes**, public YouTube | Human records it (`MANUAL` M10); outline in section 18 | Section 18 |
| Keep demo, credentials and credits **live until Dec 21** | Free tiers that don't pause, keys not rotated | Section 16 |
| **No edits after the deadline** (Nov 12, 12:00 PM PST = **Nov 13, 1:30 AM IST**) | Plan finishes by Nov 12 evening IST | Section 15 |

---

## 3. Tech stack

Use the **latest stable version** of each at install time and commit the lockfile.

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript (strict)** | One codebase for UI and API routes; easy hosting |
| Styling | **Tailwind CSS** + the CSS variables in section 8 | Brand tokens as variables; Tailwind for layout |
| Icons | **lucide-react** | Matches the brand spec |
| Database | **PostgreSQL on Neon** (free tier, does not pause permanently) | Reliable through judging |
| ORM | **Prisma** | Familiar to agents, typed |
| File storage | **Vercel Blob** | Public HTTPS URLs for photos, clips, audio |
| AI | **Google Gemini API** via `@google/genai` | One key for audio understanding (Tamil), vision, JSON output, tool calling and Tamil TTS |
| Audio recording | `extendable-media-recorder` + `extendable-media-recorder-wav-encoder` | Records **WAV** in every browser (incl. Safari), a format Gemini accepts |
| Payments | **PayPal REST APIs** (direct, typed `fetch` client) + **PayPal JS SDK v6** in the browser | Reliable; avoids the hosted PayPal MCP server, which other teams reported failing in sandbox |
| Agent protocol | **MCP** via `mcp-handler` (or `@modelcontextprotocol/sdk` Streamable HTTP) | Lets Claude and other agents shop the catalog |
| Co-op tables | **AG Grid Community** (`ag-grid-react`) | Also targets the AG Grid sponsor prize |
| Sessions | **iron-session** (signed cookie) | Simple demo logins, no OAuth |
| Validation | **Zod** | API inputs, AI outputs, env |
| Tests | **Vitest** (unit), optional **Playwright** smoke test | |
| Hosting | **Vercel** (Hobby) | Next.js native; no cold-start sleep like free Render |

---

## 4. MANUAL tasks for the human

The agent must ask for these at the phase shown. Status lives in `PROGRESS.md`.

| ID | Task (human does this) | Gives the agent | Needed by |
|---|---|---|---|
| **M1** | Create a **public GitHub repo** named `thari-paypal` and clone it. Put this file at the root. | Repo URL | Phase 0 |
| **M2** | **PayPal sandbox app.** Go to developer.paypal.com → log in → *Apps & Credentials* → switch to **Sandbox** → *Create App* (type Merchant) named "Thari". Copy **Client ID** and **Secret**. In the app's settings, make sure **Payouts** is ticked. | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | Phase 0 |
| **M3** | **PayPal sandbox accounts.** *Testing Tools → Sandbox Accounts → Create account*: (a) **Personal, United States** = the buyer; (b) **Personal, India** = weaver Lakshmi; (c) **Business, India** = the co-op. The app's default business account is "Thari Platform". For each, note email and password (open each with "View/Edit"). | 4 sandbox emails, buyer password | Phase 0 |
| **M4** | **Gemini API key** at aistudio.google.com/apikey. Recommended: enable billing on the project so the demo doesn't hit free-tier limits during judging (usage will be tiny). | `GEMINI_API_KEY` | Phase 0 |
| **M5** | **Neon database.** neon.tech → new project "thari" → copy the **pooled** connection string and the **direct** one. | `DATABASE_URL`, `DIRECT_URL` | Phase 0 |
| **M6** | **Vercel.** vercel.com → import the GitHub repo → *Storage → Create Blob store* → connect to the project → copy `BLOB_READ_WRITE_TOKEN` into `.env.local` too. | Blob token, deployed URL | Phase 1 (Blob), Phase 5 (deploy) |
| **M7** | **Real content (most important for winning).** (a) 3–6 sarees, 3–6 daylight photos each, portrait; (b) one 10–20 s loom clip per piece if possible (phone video, horizontal OK); (c) a photo of the weaver; (d) her written consent to show her name, face and work. Drop into `/content/raw/`. Until then the agent uses woven-pattern placeholders. | Files in repo (not committed if large; agent uploads to Blob) | Phase 2 (placeholders OK until Phase 5) |
| **M8** | **Tamil sample voice note.** A Tamil speaker records the script in section 14.3 (30–45 s, quiet room) as `.wav` or `.m4a`. Put it at `/public/samples/sample-voice-ta.wav` (agent converts if needed). | Audio file | Phase 2 |
| **M9** | **PayPal webhook.** After the first deploy: PayPal app (Sandbox) → *Webhooks → Add webhook* → URL `https://<your-app>.vercel.app/api/paypal/webhook` → select events in section 11.7 → copy **Webhook ID**. | `PAYPAL_WEBHOOK_ID` | Phase 5 |
| **M10** | **Record and upload the demo video** (under 3 min, public on YouTube). Outline in section 18. | YouTube URL | Phase 6 |
| **M11** | **Devpost submission.** Fill description, "Built with", select **AG Grid** as sponsor tool (only if Phase 4 dashboard is done), add hosted URL, repo URL, video URL, sandbox buyer login, invite and get teammates to accept. | — | Phase 6 |
| **M12** | **After submitting:** don't edit repo/video/demo until winners are announced (Dec 21). Keep Neon, Vercel, Gemini and PayPal sandbox active. | — | After deadline |

---

## 5. Environment variables

Create `.env.example` (committed, no values) and `.env.local` (git-ignored). Validate all of these with Zod in `src/lib/env.ts`; fail fast with a readable message listing what is missing.

```bash
# App
APP_URL=http://localhost:3000            # https://<app>.vercel.app in production
SESSION_SECRET=                           # 32+ random chars (agent generates)

# Database (Neon)
DATABASE_URL=                             # pooled
DIRECT_URL=                               # direct, for migrations

# Storage
BLOB_READ_WRITE_TOKEN=

# Gemini — check https://ai.google.dev/gemini-api/docs/models for current IDs
GEMINI_API_KEY=
GEMINI_MODEL=                             # current stable Flash model that accepts audio + image input
GEMINI_TTS_MODEL=                         # current Flash TTS model; must support Tamil (ta-IN)
GEMINI_TTS_VOICE=                         # a prebuilt voice name from the TTS docs
AI_MODE=live                              # live | mock  (mock returns fixtures; for offline dev and as emergency fallback)

# PayPal (sandbox)
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
NEXT_PUBLIC_PAYPAL_CLIENT_ID=             # same as PAYPAL_CLIENT_ID (client ID is safe in the browser)

# Business config
FX_INR_PER_USD=88                         # fixed demo rate, shown as "approx." in the UI
SHIPPING_USD=20                           # flat international shipping per order
DEFAULT_COOP_COMMISSION_PCT=10

# Sandbox account emails (from M3), used by seed data
SANDBOX_BUYER_EMAIL=
SANDBOX_WEAVER_EMAIL=
SANDBOX_COOP_EMAIL=
```

PayPal base URL: `https://api-m.sandbox.paypal.com` when `PAYPAL_ENV=sandbox`.

---

## 6. Architecture and folder structure

```
Browser (weaver phone) ──voice/photos──▶ /api/listings/*  ──▶ Gemini (understand, write, ask, TTS)
Browser (buyer)  ──PayPal JS SDK v6──▶ /api/orders (create) ─▶ PayPal Orders v2
                                   └▶ /api/orders/[id]/capture ─▶ PayPal capture ─▶ fulfillOrder()
PayPal ──webhook──▶ /api/paypal/webhook (verify signature) ─▶ fulfillOrder() / refund sync / payout sync
fulfillOrder(): mark SOLD → Payouts (weaver + co-op) → Tamil notification + TTS → export papers draft → log
Buyer assistant (/assistant) ─▶ /api/assistant ─▶ Gemini tool calling ─▶ search/get/create_checkout tools
External agents (Claude etc.) ─▶ /api/mcp (MCP Streamable HTTP) ─▶ same tools
/api/catalog.json + schema.org JSON-LD on product pages ─▶ machine-readable catalog
```

```
thari-paypal/
├─ BUILD_PLAN.md  PROGRESS.md  README.md  LICENSE  .env.example
├─ prisma/ schema.prisma  seed.ts
├─ public/ samples/sample-voice-ta.wav  brand/ (wordmark svg, og image)
├─ content/raw/            # human's photos/clips (git-ignored if large)
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx  globals.css (tokens + components, section 8)
│  │  ├─ page.tsx                      # buyer home
│  │  ├─ explore/page.tsx
│  │  ├─ p/[id]/page.tsx               # product page
│  │  ├─ weavers/[id]/page.tsx
│  │  ├─ checkout/success/[orderId]/page.tsx
│  │  ├─ orders/page.tsx
│  │  ├─ assistant/page.tsx
│  │  ├─ demo/page.tsx
│  │  ├─ w/ (weaver area, mobile shell)
│  │  │  ├─ page.tsx  new/page.tsx  sales/page.tsx  sales/[orderId]/page.tsx
│  │  │  ├─ sales/[orderId]/papers/page.tsx  money/page.tsx  pieces/[id]/page.tsx
│  │  ├─ coop/ page.tsx  listings/page.tsx  orders/page.tsx  payouts/page.tsx
│  │  └─ api/
│  │     ├─ demo-login/route.ts  logout/route.ts
│  │     ├─ upload/route.ts                    # Blob client-upload token
│  │     ├─ listings/draft/route.ts            # voice+photos → draft
│  │     ├─ listings/[id]/answer/route.ts      # voice answer to a question
│  │     ├─ listings/[id]/confirm/route.ts     # weaver says yes → LIVE
│  │     ├─ listings/[id]/coop-confirm/route.ts
│  │     ├─ tts/route.ts                        # text → cached Tamil audio URL
│  │     ├─ orders/route.ts                     # create PayPal order
│  │     ├─ orders/[paypalOrderId]/capture/route.ts
│  │     ├─ orders/[id]/ship/route.ts           # tracking
│  │     ├─ orders/[id]/refund/route.ts
│  │     ├─ payouts/[id]/retry/route.ts
│  │     ├─ paypal/webhook/route.ts
│  │     ├─ me/notifications/route.ts
│  │     ├─ assistant/route.ts
│  │     ├─ mcp/[transport]/route.ts
│  │     └─ catalog.json/route.ts
│  ├─ components/ (Button, TextField, ListingCard, AuthenticityBadge, VoiceRecorder, StatusChip, BottomNav, TopNav, PhotoPicker, LoomClipPlayer, PayPalButton, AssistantChat, ...)
│  ├─ lib/
│  │  ├─ env.ts  db.ts  session.ts  money.ts (pricing + split)  fsm.ts (order states)
│  │  ├─ paypal/ client.ts (token cache, fetch wrapper) orders.ts payouts.ts catalog.ts tracking.ts refunds.ts webhooks.ts
│  │  ├─ ai/ gemini.ts  extractListing.ts  answerQuestion.ts  tts.ts  assistant.ts  exportPapers.ts  prompts.ts  schemas.ts  fixtures/
│  │  ├─ fulfill.ts  notify.ts  log.ts  tools.ts (shared shop tools for assistant + MCP)
│  └─ tests/ money.test.ts fsm.test.ts fulfill.test.ts webhook.test.ts extract.test.ts
```

---

## 7. Data model (Prisma)

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL"); directUrl = env("DIRECT_URL") }

enum Role { WEAVER BUYER COOP_ADMIN }
enum ListingStatus { DRAFT NEEDS_ANSWERS READY_TO_CONFIRM LIVE SOLD ARCHIVED }
enum OrderStatus { CREATED PAID SHIPPED DELIVERED REFUNDED FAILED }
enum Channel { WEB ASSISTANT MCP }
enum PayoutRecipient { WEAVER COOP }
enum PayoutStatus { PENDING SENT SUCCEEDED FAILED }

model Coop {
  id            String  @id @default(cuid())
  name          String
  town          String
  paypalEmail   String
  commissionPct Int     @default(10)
  weavers       User[]
}

model User {
  id          String   @id @default(cuid())
  role        Role
  name        String
  town        String?
  bioTa       String?
  bioEn       String?
  photoUrl    String?
  paypalEmail String?            // sandbox receiver for payouts (weaver)
  email       String?            // buyer
  coopId      String?
  coop        Coop?    @relation(fields: [coopId], references: [id])
  listings    Listing[]
  orders      Order[]  @relation("BuyerOrders")
  notifications Notification[]
  createdAt   DateTime @default(now())
}

model Listing {
  id              String        @id @default(cuid())
  weaverId        String
  weaver          User          @relation(fields: [weaverId], references: [id])
  status          ListingStatus @default(DRAFT)
  title           String?
  description     String?
  story           String?
  category        String?       // saree | dupatta | stole | fabric
  fabric          String?       // silk | cotton | silk-cotton | ...
  weave           String?       // e.g. Kanchipuram, Chettinad, Arani
  colors          String[]
  motifs          String[]
  includesBlouse  Boolean?
  stitched        Boolean?
  lengthMeters    Float?
  weeksToWeave    Int?
  giTag           String?       // e.g. "Kanchipuram Silk (GI)" only if stated/known
  priceInr        Int?
  priceUsdCents   Int?
  photos          Photo[]
  loomClipUrl     String?
  voiceNoteUrl    String?
  transcriptTa    String?
  transcriptEn    String?
  pendingQuestions Json?        // [{field, questionTa, questionEn, audioUrl}]
  readbackTa      String?
  readbackAudioUrl String?
  aiRaw           Json?
  coopConfirmedAt DateTime?
  paypalProductId String?
  orders          Order[]
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model Photo {
  id        String  @id @default(cuid())
  listingId String
  listing   Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)
  url       String
  position  Int
}

model Order {
  id               String      @id @default(cuid())
  listingId        String
  listing          Listing     @relation(fields: [listingId], references: [id])
  buyerId          String?
  buyer            User?       @relation("BuyerOrders", fields: [buyerId], references: [id])
  status           OrderStatus @default(CREATED)
  channel          Channel     @default(WEB)
  paypalOrderId    String      @unique
  captureId        String?     @unique
  itemUsdCents     Int
  shippingUsdCents Int
  totalUsdCents    Int
  payerEmail       String?
  shippingAddress  Json?
  trackingNumber   String?
  carrier          String?
  fulfilledAt      DateTime?   // set by fulfillOrder, guards idempotency
  refundedAt       DateTime?
  payouts          Payout[]
  createdAt        DateTime    @default(now())
}

model Payout {
  id            String          @id @default(cuid())
  orderId       String
  order         Order           @relation(fields: [orderId], references: [id])
  recipient     PayoutRecipient
  receiverEmail String
  amountUsdCents Int
  status        PayoutStatus    @default(PENDING)
  paypalBatchId String?
  paypalItemId  String?
  error         String?
  createdAt     DateTime        @default(now())
  @@unique([orderId, recipient])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  kind      String   // SOLD | PAYOUT | QUESTION | SHIPPED_REMINDER
  textTa    String
  textEn    String
  audioUrl  String?
  orderId   String?
  heardAt   DateTime?
  createdAt DateTime @default(now())
}

model WebhookEvent {
  id          String   @id            // PayPal event id
  type        String
  payload     Json
  processedAt DateTime?
  createdAt   DateTime @default(now())
}

model AgentLog {          // visible audit trail of every AI and money action
  id        String   @id @default(cuid())
  actor     String   // "ai:extract" | "ai:assistant" | "mcp" | "system:fulfill" | "user:<id>"
  action    String
  listingId String?
  orderId   String?
  detail    Json
  createdAt DateTime @default(now())
}

model TtsCache {
  hash     String @id   // sha256(model+voice+text)
  url      String
  createdAt DateTime @default(now())
}
```

**Order state machine (`src/lib/fsm.ts`):** `CREATED → PAID → SHIPPED → DELIVERED`, `PAID|SHIPPED|DELIVERED → REFUNDED`, `CREATED → FAILED`. Any other transition throws. Unit-test every allowed and forbidden transition.

**Listing state machine:** `DRAFT → NEEDS_ANSWERS ⇄ (answers) → READY_TO_CONFIRM → LIVE → SOLD`. `LIVE → ARCHIVED`. Only `LIVE` listings appear in the shop, feed, assistant and MCP.

---

## 8. Brand kit (source of truth for all UI)

**Feel:** warm coral and cream, soft and rounded, friendly like a modern food or shopping app, with heritage shown through real people, real cloth and a serif voice for weaver names and stories. Never ornamental, no emoji, no purple gradients.

**Reference images:** not required; this section is complete. Optional: the human may drop the three Behance screenshots into `/docs/design-reference/` for mood only. This section always wins over the screenshots. **Do not** copy any brand names, logos or screens from the reference.

**Ship the light theme only** (dark tokens exist in the design system but are out of scope).

### 8.1 Colour tokens (put in `globals.css`)

```css
:root {
  --ground: #fff7e2;        /* page background (cream) */
  --surface: #ffffff;       /* cards, sheets, nav bars */
  --surface-tint: #fff0ef;  /* filled inputs, quiet panels */
  --blush: #fdcfcf;         /* selected chips, secondary buttons, cart rows */
  --coral: #f86261;         /* BRAND: big fills, splash, hero, voice button. Text on it = --on-coral */
  --on-coral: #2a1614;      /* text/icons on coral */
  --primary: #c8302e;       /* primary buttons, links, active nav, focus ring */
  --on-primary: #ffffff;
  --maroon: #991c1a;        /* prices, headings on blush, dark hero slab */
  --ink: #2a1614;           /* body text */
  --ink-muted: #6e5450;     /* secondary text, placeholders */
  --line: #eadbd6;          /* hairline dividers only */
  --zari: #8a5a14;          /* gold: ONLY authenticity badge + certificate */
  --zari-soft: #fbefd4;     /* authenticity badge background */
  --success: #24603d;  --success-soft: #e3f3e8;
  --danger: #9b1c1c;
  --focus-ring: var(--primary);

  --font-sans: "Manrope", "Noto Sans Tamil", system-ui, sans-serif;
  --font-serif: "Fraunces", Georgia, serif;
  --font-tamil: "Noto Sans Tamil", "Manrope", system-ui, sans-serif;

  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-6: 24px; --space-8: 32px; --space-12: 48px;

  --radius-sm: 10px; --radius-md: 16px; --radius-lg: 24px; --radius-xl: 32px; --radius-pill: 999px;

  --shadow-card: 0 6px 20px rgba(153, 28, 26, 0.08);
  --shadow-float: 0 12px 32px rgba(200, 48, 46, 0.28);
}
body { background: var(--ground); color: var(--ink); font-family: var(--font-sans); }
```

Contrast is checked: white on `--coral` fails for small text (3.0:1), so **never put small white text on coral**; use `--on-coral`, or use `--primary` for buttons (5.4:1 with white).

### 8.2 Typography

Load with `next/font/google`: **Manrope** (500, 600, 700, 800), **Noto Sans Tamil** (500, 700), **Fraunces** (600, 400 italic).

| Style | Font | Size / line | Weight | Use |
|---|---|---|---|---|
| display | Fraunces | 48/52 (mobile 34/38) | 600 | Laptop hero, splash |
| story | Fraunces italic | 20/30 (mobile 17/26) | 400 | Craft story, weaver name on product page |
| title-lg | Manrope | 28/34 (mobile 24/30) | 800 | Page titles |
| title | Manrope | 20/26 | 700 | Section headings |
| label | Manrope | 15/20 | 700 | Buttons, card titles |
| body | Manrope | 15/22 | 500 | Body copy |
| caption | Manrope | 12/16 | 600 | Meta, chips |
| price | Manrope | 18/22 | 800, colour `--maroon` | All prices |
| tamil-prompt | Noto Sans Tamil | 22/34 | 700 | Weaver prompts |
| tamil-body | Noto Sans Tamil | 17/28 | 500 | Tamil body text |

Tamil always uses the Tamil styles (it needs ~30% more line height).

### 8.3 Shape, depth, motion, imagery, icons

- Cards `--radius-lg` + `--shadow-card`, no borders. Inputs `--radius-md`, filled `--surface-tint`, no border. Buttons, search bar, bottom nav, voice button: `--radius-pill`. Hero blocks and sheets: `--radius-xl`.
- Motion: 200ms ease-out for presses and sheets; voice button pulses while recording; respect `prefers-reduced-motion`.
- Photos: real only, 4:5 portrait in `--radius-lg` frames on `--surface-tint`. Placeholder while loading or missing: the `.th-weave` woven stripe pattern, never a grey box.
- Icons: Lucide, 1.75 stroke, 20px in UI, 22–24px in nav. Key icons: `Mic`, `Play`, `BadgeCheck`, `ShoppingBag`, `Truck`, `Wallet`, `User`, `Search`, `Heart`, `Camera`, `Video`, `Sparkles` (assistant).
- Wordmark (no logo yet): "தறி Thari" in Fraunces 600, with தறி in `--coral`, Thari in `--ink`. Make `public/brand/wordmark.svg` from this text only.

### 8.4 Components (copy this CSS into `globals.css`, then wrap in React components with typed props)

```css
/* Thari components. Values come from tokens.css; classes use the th- prefix. */
.th-root, .th-root * { box-sizing: border-box; }
.th-root { font-family: var(--font-sans); color: var(--ink); -webkit-font-smoothing: antialiased; }
.th-row { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: center; }
.th-stack { display: flex; flex-direction: column; gap: var(--space-3); }
.th-pad { padding: var(--space-4); }

/* Button */
.th-btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2); min-height: 48px; padding: 0 var(--space-6); border: 0; border-radius: var(--radius-pill); font: 700 15px/20px var(--font-sans); cursor: pointer; transition: transform .2s ease-out, filter .2s ease-out; text-decoration: none; }
.th-btn:active { transform: scale(.97); }
.th-btn:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.th-btn svg { width: 20px; height: 20px; }
.th-btn--primary { background: var(--primary); color: var(--on-primary); box-shadow: var(--shadow-float); }
.th-btn--primary:hover { filter: brightness(1.06); }
.th-btn--secondary { background: var(--blush); color: var(--maroon); }
.th-btn--ghost { background: transparent; color: var(--primary); padding: 0 var(--space-3); }
.th-btn--block { width: 100%; }
.th-btn[disabled] { opacity: .45; cursor: not-allowed; box-shadow: none; }
.th-icon-btn { width: 48px; height: 48px; padding: 0; border-radius: var(--radius-pill); background: var(--surface-tint); color: var(--ink); border: 0; display: inline-grid; place-items: center; cursor: pointer; }
.th-icon-btn:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }

/* TextField */
.th-field { display: flex; flex-direction: column; gap: var(--space-1); width: 100%; }
.th-field__label { font: 600 12px/16px var(--font-sans); color: var(--ink-muted); }
.th-field__box { display: flex; align-items: center; gap: var(--space-2); min-height: 52px; padding: 0 var(--space-4); background: var(--surface-tint); border-radius: var(--radius-md); color: var(--ink-muted); }
.th-field__box:focus-within { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.th-field__box svg { width: 20px; height: 20px; flex: none; }
.th-field__input { flex: 1; min-width: 0; border: 0; background: transparent; font: 500 15px/22px var(--font-sans); color: var(--ink); outline: none; }
.th-field__input::placeholder { color: var(--ink-muted); }
.th-field--search .th-field__box { border-radius: var(--radius-pill); background: var(--surface); box-shadow: var(--shadow-card); }
.th-field__hint { font: 600 12px/16px var(--font-sans); color: var(--ink-muted); }
.th-field--error .th-field__hint { color: var(--danger); }

/* Woven placeholder for images */
.th-weave { background-color: var(--blush); background-image: repeating-linear-gradient(90deg, var(--coral) 0 6px, transparent 6px 18px), repeating-linear-gradient(0deg, rgba(255,255,255,.35) 0 2px, transparent 2px 8px); }

/* ListingCard */
.th-card { background: var(--surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); overflow: hidden; display: flex; flex-direction: column; }
.th-listing__media { position: relative; aspect-ratio: 4 / 5; border-radius: var(--radius-lg); margin: var(--space-2); overflow: hidden; }
.th-listing__fav { position: absolute; top: var(--space-2); right: var(--space-2); width: 36px; height: 36px; border-radius: var(--radius-pill); background: var(--surface); color: var(--primary); display: grid; place-items: center; border: 0; }
.th-listing__body { padding: 0 var(--space-3) var(--space-3); display: flex; flex-direction: column; gap: var(--space-1); }
.th-listing__weaver { font: italic 400 15px/20px var(--font-serif); color: var(--ink-muted); }
.th-listing__title { font: 700 15px/20px var(--font-sans); color: var(--ink); margin: 0; }
.th-listing__foot { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); margin-top: var(--space-2); }
.th-price { font: 800 18px/22px var(--font-sans); color: var(--maroon); }
.th-add { width: 40px; height: 40px; border-radius: var(--radius-pill); border: 0; background: var(--primary); color: var(--on-primary); display: grid; place-items: center; cursor: pointer; }
.th-add:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }

/* AuthenticityBadge */
.th-auth { display: inline-flex; align-items: center; gap: var(--space-1); padding: 4px 10px 4px 6px; border-radius: var(--radius-pill); background: var(--zari-soft); color: var(--zari); font: 700 12px/16px var(--font-sans); white-space: nowrap; }
.th-auth svg { width: 16px; height: 16px; }
.th-auth--full { display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); white-space: normal; }
.th-auth--full svg { width: 24px; height: 24px; flex: none; margin-top: 2px; }
.th-auth__title { font: 800 15px/20px var(--font-sans); color: var(--zari); }
.th-auth__list { margin: var(--space-1) 0 0; padding: 0; list-style: none; font: 500 13px/20px var(--font-sans); color: var(--ink); }

/* VoiceRecorder */
.th-voice { display: flex; flex-direction: column; align-items: center; gap: var(--space-4); text-align: center; padding: var(--space-6) var(--space-4); background: var(--surface); border-radius: var(--radius-xl); }
.th-voice__prompt { font: 700 22px/34px var(--font-tamil); color: var(--ink); margin: 0; }
.th-voice__sub { font: 600 12px/16px var(--font-sans); color: var(--ink-muted); margin: -8px 0 0; }
.th-voice__btn { width: 88px; height: 88px; border-radius: var(--radius-pill); border: 0; background: var(--coral); color: var(--on-coral); display: grid; place-items: center; box-shadow: var(--shadow-float); cursor: pointer; position: relative; }
.th-voice__btn svg { width: 36px; height: 36px; }
.th-voice__btn:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 4px; }
.th-voice--listening .th-voice__btn::after { content: ""; position: absolute; inset: -10px; border-radius: inherit; border: 3px solid var(--coral); opacity: .5; animation: th-pulse 1.6s ease-out infinite; }
@keyframes th-pulse { from { transform: scale(.9); opacity: .6; } to { transform: scale(1.25); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .th-voice--listening .th-voice__btn::after { animation: none; } }
.th-wave { display: flex; align-items: center; gap: 4px; height: 32px; }
.th-wave i { display: block; width: 4px; border-radius: 2px; background: var(--coral); }
.th-voice__time { font: 700 15px/20px var(--font-sans); color: var(--maroon); }

/* StatusChip */
.th-chip { display: inline-flex; align-items: center; gap: var(--space-1); min-height: 28px; padding: 0 10px; border-radius: var(--radius-pill); font: 700 12px/16px var(--font-sans); background: var(--blush); color: var(--maroon); }
.th-chip svg { width: 14px; height: 14px; }
.th-chip--listed { background: var(--surface-tint); color: var(--ink); }
.th-chip--sold { background: var(--coral); color: var(--on-coral); }
.th-chip--paid, .th-chip--delivered { background: var(--success-soft); color: var(--success); }
.th-chip--shipped { background: var(--blush); color: var(--maroon); }
.th-chip--refund { background: var(--surface-tint); color: var(--danger); }
.th-chip--select { min-height: 40px; padding: 0 var(--space-4); font-size: 13px; background: var(--surface); color: var(--ink); box-shadow: var(--shadow-card); }
.th-chip--select[aria-pressed="true"] { background: var(--primary); color: var(--on-primary); }

/* BottomNav */
.th-nav { display: flex; align-items: center; justify-content: space-around; height: 68px; padding: 0 var(--space-2); background: var(--surface); border-radius: var(--radius-pill); box-shadow: var(--shadow-float); }
.th-nav__item { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 56px; padding: 6px 0; border: 0; background: transparent; color: var(--ink-muted); font: 600 11px/14px var(--font-sans); cursor: pointer; }
.th-nav__item svg { width: 22px; height: 22px; }
.th-nav__item[aria-current="page"] { color: var(--primary); font-weight: 800; }
.th-nav__center { width: 56px; height: 56px; margin-top: -28px; border-radius: var(--radius-pill); background: var(--coral); color: var(--on-coral); display: grid; place-items: center; border: 4px solid var(--ground); box-shadow: var(--shadow-float); }
.th-nav__center svg { width: 26px; height: 26px; }
```

Component rules:

- **Button:** one `--primary` button per screen. Variants: primary, secondary (blush), ghost, block, icon-only (needs `aria-label`). Min height 48px.
- **TextField:** label above, hint/error below; search variant is a white pill with shadow.
- **ListingCard:** photo (4:5), AuthenticityBadge (only if verified), title, "by {weaver}, {town}" in Fraunces italic, price in maroon, round add/buy button. 2 per row on mobile, 4 on laptop.
- **AuthenticityBadge:** compact pill on cards; full panel on product page listing the evidence (weaver and town, loom video date, co-op confirmation, GI tag if any). Shown only when `loomClipUrl && coopConfirmedAt`.
- **VoiceRecorder:** Tamil prompt (spoken + shown), English caption, 88px coral round button, waveform, timer. States: idle, recording, processing, playing.
- **StatusChip:** always icon + word: Listed, Sold, Paid, Shipped, Delivered, Refunded, Payout pending.
- **BottomNav:** floating white pill, mobile only. Weaver: Home, Sales, centre Mic, Money, Profile. Buyer (mobile): Home, Explore, centre Assistant (Sparkles), Orders, Profile.
- **TopNav (laptop buyer):** white bar, wordmark left, search centre, links right (Explore, Assistant, Orders), sticky.

### 8.5 Layout rules

- **Mobile (360–430px):** 16px gutters, one column, BottomNav floating 16px from bottom, primary action in a sticky bar above it, content has 100px bottom padding.
- **Laptop (≥1024px):** max content width 1200px, centred, 12-column grid, 24px gutters, TopNav. Product grid 4 across. Product page split 7/5: gallery + story left, sticky buy box right.
- **Tablet (768–1023px):** grid 2–3 across, TopNav.
- **Weaver area `/w/*`:** mobile layout always; on laptop show it as a centred 420px phone-width column on `--ground` (so judges on laptops see the phone experience).
- **Co-op area `/coop/*`:** laptop layout with left sidebar (Overview, Listings, Orders, Payouts) and AG Grid tables.

### 8.6 Copy rules

- Sentence case everywhere. Warm, plain, specific. No emoji. No "AI-powered magic"; say what happens ("We wrote your listing. Listen and check.").
- Always show the weaver's name. Lead with person and place: "Woven by Lakshmi in Kanchipuram".
- "Verified handwoven" only when evidence exists. Never "100% guaranteed".
- Prices: buyer sees USD (`$205`) with "approx. ₹18,000" small underneath; weaver sees ₹ only.
- Weaver screens: Tamil first in large type, short English caption underneath.

---

## 9. Screens and routes

### 9.1 Judge entry — `/demo`
Coral hero card "Try Thari in 3 roles". Three big cards, each a one-click login via `/api/demo-login?role=…` that sets the session and redirects:
1. **Weaver — Lakshmi (phone view)** → `/w`
2. **Buyer — Emma in the US** → `/`
3. **Co-op — Kanchipuram Weavers' Co-op** → `/coop`

Below: a box with the **sandbox PayPal buyer email and password** (from M3) and "PayPal sandbox: no real money moves." Link the README and repo. Also link `/demo` from the footer of every page.

### 9.2 Buyer (responsive)
- **`/` Home.** Laptop: coral `--radius-xl` hero block on the left half with display text "Handwoven. Sold by the weaver." and subcopy, a real photo of the weaver at her loom on the right; below, search pill, category chips (All, Silk sarees, Cotton sarees, Dupattas), "Meet the weavers" row (round photos + names), "New from the loom" grid of ListingCards. Mobile: greeting + search + chips + coral promo card ("Ask our assistant to find your saree") + grid, BottomNav.
- **`/explore`.** Search (title, fabric, colour, weave, weaver), filter chips, price sort, grid. Server-side search with Prisma (case-insensitive contains across fields).
- **`/p/[id]` Product page.** Gallery (main image + thumbnails; swipe on mobile), title (title-lg), "Woven by {name} in {town}" (story style) linking to weaver page, price block (USD + approx ₹ + "+ $20 shipping worldwide"), **PayPal button**, AuthenticityBadge full panel with **LoomClipPlayer** (inline `<video>` with poster), details table (fabric, weave, colours, length, blouse piece, stitched/unstitched, weeks to weave), craft story (Fraunces italic), "Ships from Tamil Nadu, India in 3–5 days". Include schema.org `Product` JSON-LD (name, image, description, brand "Thari", offers price USD, availability). If SOLD: show "Sold" chip and disable the button.
- **`/weavers/[id]`.** Photo, name, town, short bio (English), co-op, their live pieces.
- **`/checkout/success/[orderId]`.** Coral check illustration (CSS shapes), "Thank you. Lakshmi has been told in Tamil that her saree sold.", order summary, PayPal order ID, status chip, "Track order" section that fills in when shipped.
- **`/orders`.** Buyer's orders with status chips and tracking.
- **`/assistant`** (and a floating "Ask Thari" button on buyer pages). Chat UI (section 12.1). Product results render as mini ListingCards inside the chat. When the assistant prepares checkout, render a card "Ready to pay $225 with PayPal" with the PayPal button for that order.

### 9.3 Weaver (`/w`, Tamil-first, mobile)
- **`/w` Home.** Greeting "வணக்கம் லக்ஷ்மி" (Vanakkam Lakshmi). Latest unheard notification as a big coral card with a play button (auto-plays when possible). Big "புதிய புடவை விற்க" (Sell a new piece) VoiceRecorder-style button → `/w/new`. "My pieces" list with photo, Tamil+English title, StatusChip. Money summary: "₹ வருகிறது / coming".
- **`/w/new` Create listing — step flow (one thing per screen, progress dots):**
  1. **Speak.** VoiceRecorder, prompt "உங்கள் புடவையைப் பற்றி சொல்லுங்கள்" (Tell us about your saree). Hint chips in Tamil: colour, fabric, price, blouse piece, stitched or not, weeks. Secondary button: **"Use sample voice note"** (loads `/samples/sample-voice-ta.wav`; for judges). Play back before continuing.
  2. **Photos.** `<input type="file" accept="image/*" capture="environment" multiple>`; grid of thumbnails; 1–6 photos; client-side resize to max 1600px JPEG before upload.
  3. **Loom clip (optional but recommended).** `<input accept="video/*" capture>`; max 30 s / 30 MB; show preview. "Skip for now" allowed (badge won't show without it).
  4. **Working.** Friendly progress: "Listening… Looking at your photos… Writing your listing…". Calls `/api/listings/draft`.
  5. **Questions (if any).** For each missing field: auto-play the Tamil question audio, show the question large, VoiceRecorder to answer (or tap quick-answer chips where obvious, e.g. "பட்டு / Silk", "பருத்தி / Cotton"). Calls `/api/listings/[id]/answer`.
  6. **Read-back and confirm.** Plays Tamil read-back audio. Shows a preview of the buyer page (photo, English title, price ₹ and $). Two big buttons: "ஆம், வெளியிடு" (Yes, publish) primary; "மாற்ற வேண்டும்" (Change something) secondary → back to step 1 with existing data kept.
  7. **Done.** "உங்கள் புடவை பட்டியலில் உள்ளது" (Your saree is listed) + "Co-op will confirm it soon."
- **`/w/sales`** list of sold orders. **`/w/sales/[orderId]`**: buyer country, amount coming to her in ₹, payout status, "Mark as shipped" (tracking number input + carrier select; voice not needed), link to **Export papers**.
- **`/w/sales/[orderId]/papers`** printable commercial invoice + packing list (section 10.5) with print CSS and "Print / Save PDF".
- **`/w/money`** payouts list (₹ approx, status), total received.

### 9.4 Co-op (`/coop`, laptop, AG Grid)
- **Overview:** stat tiles (pieces live, sold this month, money paid to weavers, pending confirmations) + recent AgentLog feed ("AI wrote listing for Lakshmi", "Payout $184.50 sent to Lakshmi").
- **Listings grid:** weaver, photo thumb, title, price, status, loom clip (play in side panel), **Confirm** button (sets `coopConfirmedAt`), Archive.
- **Orders grid:** order, piece, weaver, buyer country, total, status chip, tracking, **Refund** button (confirm dialog).
- **Payouts grid:** recipient, amount, status, PayPal batch ID, **Retry** for failed.
- AG Grid: sorting, filtering, quick search, CSV export button. Theme it with brand variables (font Manrope, header background `--surface-tint`, row hover `--surface-tint`, accent `--primary`).

---

## 10. AI design (Gemini)

All AI code in `src/lib/ai/`. Every call: timeout 45 s, one retry on 429/5xx with backoff, Zod-validate the output, log to `AgentLog`, and on failure return a typed error the UI can show. `AI_MODE=mock` returns fixtures from `src/lib/ai/fixtures/` so the app works without keys.

### 10.1 Extract listing (voice + photos → structured draft)
Input: WAV audio (inline base64, ≤ 60 s), up to 6 photos (inline JPEG, resized), weaver profile (name, town, co-op), FX rate.
Call `GEMINI_MODEL` with `responseMimeType: "application/json"` and a `responseSchema` matching this Zod schema:

```ts
const ExtractedListing = z.object({
  transcriptTa: z.string(),                // what she said, in Tamil script
  transcriptEn: z.string(),                // faithful English translation
  category: z.enum(["saree","dupatta","stole","fabric","other"]).nullable(),
  fabric: z.string().nullable(),           // "silk", "cotton", "silk-cotton"...
  weave: z.string().nullable(),            // "Kanchipuram", "Chettinad", "Arani"... only if stated or certain
  colors: z.array(z.string()),             // from speech, cross-checked with photos
  motifs: z.array(z.string()),             // "peacock border", "temple border", "checks"
  includesBlouse: z.boolean().nullable(),
  stitched: z.boolean().nullable(),
  lengthMeters: z.number().nullable(),
  weeksToWeave: z.number().int().nullable(),
  priceInr: z.number().int().nullable(),
  photoObservations: z.string(),           // what the photos show; flag conflicts with speech
  conflicts: z.array(z.string()),          // e.g. "said orange, photos look red"
  title: z.string(),                       // English, ≤ 80 chars, no hype words
  description: z.string(),                 // English, 60–120 words, factual
  story: z.string(),                       // English, 40–80 words, about her and the making, first person plural NOT used; third person "Lakshmi wove…"
  missingFields: z.array(z.enum(["fabric","priceInr","lengthMeters","includesBlouse","stitched","colors","category"])),
  questionsTa: z.array(z.object({ field: z.string(), questionTa: z.string(), questionEn: z.string() })),
  readbackTa: z.string(),                  // short spoken Tamil summary for confirmation, ends with "வெளியிடலாமா?" (Shall I publish?)
});
```

**Required fields before READY_TO_CONFIRM:** category, fabric, colors (≥1), priceInr, includesBlouse, stitched. `lengthMeters` is asked for sarees but may be skipped if she says she doesn't know. GI tag is never invented: set `giTag` only for known GI weaves the weaver states (e.g. "Kanchipuram Silk") and the co-op later confirms.

**System prompt (put in `prompts.ts`):**
> You are the listing assistant for Thari, a marketplace where Tamil Nadu handloom weavers sell directly to buyers abroad. You receive a weaver's voice note in Tamil and photos of one handwoven piece. Extract only facts she states or that are clearly visible; never invent fabric, weave, origin certificates, measurements or prices. If speech and photos conflict, trust her words for fabric, price and making details, trust the photos for colours, and record the conflict. Write the English title, description and story in plain, warm, factual language: no superlatives, no "exquisite", no "luxurious", no emoji. Name her and her town in the story. For every required field that is missing, write one short, polite spoken-Tamil question (simple everyday words, not formal written Tamil). Write `readbackTa` as a short spoken Tamil summary she can confirm by ear, with the price in rupees.

Then compute on the server (not by AI): `priceUsdCents = round(priceInr / FX_INR_PER_USD * 100)`, rounded to the nearest whole dollar ×100.

### 10.2 Answer a question (voice answer → field update)
Input: the field being asked, the Tamil question, the WAV answer, the current draft. Output schema: `{ field, value, understood: boolean, transcriptTa, clarifyTa? }`. If `understood=false`, play `clarifyTa` and ask again (max 2 attempts, then show tap-chips fallback). After all answers, regenerate `title/description/story/readbackTa` with a second small call using the merged fields (text only).

### 10.3 Tamil text-to-speech (`/api/tts`)
- Input `{ text, lang: "ta-IN" }`. Hash `sha256(model+voice+text)`; return cached Blob URL from `TtsCache` if present.
- Call `GEMINI_TTS_MODEL` with the voice from `GEMINI_TTS_VOICE` and a short style instruction ("Say warmly and slowly, in Tamil: …"). The API returns raw PCM (check docs for sample rate, typically 24 kHz, 16-bit mono): wrap it in a WAV header in `tts.ts`, upload to Blob, cache, return URL.
- **Fallback:** if TTS fails, the client uses `speechSynthesis` with `lang="ta-IN"` when a Tamil voice exists, and always shows the text.
- Pre-generate and cache TTS for the fixed weaver prompts and the seed notifications during seeding (when `AI_MODE=live`).

### 10.4 Sale notification text
Template, not AI (must be exact): `textTa = "உங்கள் {titleTaShort} விற்பனையானது. ₹{weaverAmountInr} உங்களுக்கு வருகிறது."`, `textEn = "Your {title} sold. ₹{amount} is coming to you."` `titleTaShort` = a short Tamil name for the piece generated once at listing time (add `titleTa` to the extraction schema, ≤ 6 words). Then TTS it.

### 10.5 Export papers draft
Text-only call producing JSON: `{ goodsDescription, hsnSuggestion, hsnReason, countryOfOrigin: "India", declaredValueUsd, netWeightKgEstimate, packingNotes }`. The page renders a **commercial invoice** (exporter: weaver + co-op address placeholders, consignee: PayPal shipping address, invoice number = order id, date, item, value, currency USD) and a **packing list**. A yellow notice at the top: "Draft prepared automatically. Check the HSN code and values with your co-op or courier before shipping." Never claim it is legally complete.

### 10.6 Fixtures for mock mode
`fixtures/extract-sample.json` must match the sample voice note in section 14.3 exactly (with `lengthMeters: null` and one question about length), so the whole weaver flow can be demoed with `AI_MODE=mock`.

---

## 11. PayPal integration

All server-side calls go through `src/lib/paypal/client.ts`:
- `getAccessToken()`: `POST /v1/oauth2/token` with Basic auth (client id:secret), `grant_type=client_credentials`; cache the token in memory until 60 s before `expires_in`.
- `paypalFetch(path, { method, body, requestId })`: adds `Authorization: Bearer`, `Content-Type: application/json`, `PayPal-Request-Id: requestId` on writes, `Prefer: return=representation`. On non-2xx: parse PayPal's error (`name`, `message`, `details[]`, `debug_id`), log it with `debug_id`, throw a typed `PayPalError`.
- Amounts are strings with 2 decimals (`(cents/100).toFixed(2)`), currency `USD`.

### 11.1 Checkout in the browser (JS SDK v6)
Follow the official v6 guide (section 19). Shape:
- Load `https://www.sandbox.paypal.com/web-sdk/v6/core` (production URL differs; read from config).
- `const sdk = await window.paypal.createInstance({ clientId: NEXT_PUBLIC_PAYPAL_CLIENT_ID, components: ["paypal-payments"] })`.
- `const methods = await sdk.findEligibleMethods(...)`; if `isEligible("paypal")`, render the `<paypal-button>` element.
- `const session = sdk.createPayPalOneTimePaymentSession({ onApprove, onCancel, onError })`.
- On button click: **don't await** `createOrder()` first; call `session.start({ presentationMode: "auto" }, createOrderPromise)` where `createOrderPromise = fetch("/api/orders", { method: "POST", body: { listingId } }).then(r => r.json()).then(d => ({ orderId: d.paypalOrderId }))`.
- `onApprove({ orderId })` → `POST /api/orders/{orderId}/capture` → on success redirect to `/checkout/success/{ourOrderId}`.
- `onCancel` → small notice "Payment cancelled. Your saree is still available." `onError` → friendly message, map `INSTRUMENT_DECLINED` etc.
- Wrap all of this in one `<PayPalButton listingId>` client component; load the script once (singleton promise). If the v6 API differs from this summary, follow the docs.

### 11.2 Create order — `POST /api/orders`
1. Validate `{ listingId, channel? }`. Load listing; must be `LIVE`. Else 409 "This piece was just sold."
2. Compute `item = listing.priceUsdCents`, `shipping = SHIPPING_USD*100`, `total = item + shipping`.
3. Create our `Order` row first (status CREATED) to get `ourOrderId`, then `POST /v2/checkout/orders` with `requestId = "create-" + ourOrderId`:
```json
{
  "intent": "CAPTURE",
  "purchase_units": [{
    "reference_id": "<listingId>",
    "custom_id": "<ourOrderId>",
    "invoice_id": "THARI-<ourOrderId>",
    "description": "<title, max 127 chars>",
    "soft_descriptor": "THARI HANDLOOM",
    "amount": { "currency_code": "USD", "value": "225.00",
      "breakdown": { "item_total": { "currency_code": "USD", "value": "205.00" },
                     "shipping":   { "currency_code": "USD", "value": "20.00" } } },
    "items": [{ "name": "<title ≤127>", "sku": "<listingId>", "quantity": "1",
                "category": "PHYSICAL_GOODS",
                "unit_amount": { "currency_code": "USD", "value": "205.00" },
                "image_url": "<first photo https>", "url": "<APP_URL>/p/<listingId>" }]
  }],
  "payment_source": { "paypal": { "experience_context": {
      "brand_name": "Thari", "shipping_preference": "GET_FROM_FILE",
      "user_action": "PAY_NOW", "return_url": "<APP_URL>/checkout/return", "cancel_url": "<APP_URL>/p/<listingId>" } } }
}
```
4. Save `paypalOrderId`; return `{ paypalOrderId, orderId: ourOrderId }`. (Verify field names against the Orders v2 reference.)

### 11.3 Capture — `POST /api/orders/[paypalOrderId]/capture`
1. Load our order by `paypalOrderId`. If already PAID, return it (idempotent).
2. Re-check listing is still `LIVE`; if SOLD to someone else, don't capture: return 409 and set order FAILED (the uncaptured PayPal order simply expires).
3. `POST /v2/checkout/orders/{id}/capture` with `requestId = "capture-" + ourOrderId`.
4. From the response read `purchase_units[0].payments.captures[0].id` + `status` (`COMPLETED`), payer email, `purchase_units[0].shipping` (name + address). If status is not COMPLETED (e.g. PENDING), mark PAID only when the webhook `PAYMENT.CAPTURE.COMPLETED` arrives.
5. Save, then call `fulfillOrder(ourOrderId)`. Return `{ orderId }`.

### 11.4 Payouts (split) — inside `fulfillOrder`
- `coop = round(item * commissionPct / 100)`, `weaver = item - coop`. Shipping stays with the platform (it pays the courier). Unit-test the split (rounding never loses or creates a cent: `weaver + coop === item`).
- Create two `Payout` rows (unique per order+recipient, so reruns don't duplicate).
- `POST /v1/payments/payouts` with `requestId = "payout-" + orderId`, `sender_batch_header: { sender_batch_id: "THARI-" + orderId, email_subject: "You have a payment from Thari" }`, items `[{ recipient_type: "EMAIL", receiver: weaverEmail, amount: { value, currency: "USD" }, sender_item_id: payoutRowId, note: "Thari sale <title>" }, { …coop }]`.
- Save `payout_batch_id`, mark SENT. Final status comes from webhooks `PAYMENT.PAYOUTS-ITEM.SUCCEEDED/FAILED/UNCLAIMED` or a status check `GET /v1/payments/payouts/{batch_id}` on the co-op page.
- **If payouts fail** (e.g. sandbox country/currency issue), mark FAILED with the error, keep the order PAID, show "Payout pending" and a Retry button. **Test this on day 1 of Phase 3** with the India sandbox accounts. If India receivers fail in sandbox, recreate the weaver/co-op sandbox accounts in another country, note it in README limitations, and continue.

### 11.5 Catalog product (on publish)
When a listing goes LIVE, `POST /v1/catalogs/products` `{ name: title, description (≤256), type: "PHYSICAL", image_url, home_url: APP_URL + "/p/" + id }` with `requestId = "product-" + listingId`; store `paypalProductId`. Non-blocking: if it fails, log and continue.

### 11.6 `fulfillOrder(orderId)` — the one idempotent post-payment function
In a DB transaction with a row lock (`SELECT … FOR UPDATE` via `prisma.$transaction` + raw query, or an atomic `updateMany where fulfilledAt is null`):
1. If `fulfilledAt` is set → return (already done).
2. Order → PAID (via FSM), listing → SOLD, set `fulfilledAt`.
Then outside the transaction (each step independently retryable and logged):
3. Payouts (11.4).
4. Weaver notification (10.4) + TTS audio.
5. AgentLog entries for each step.
Unit-test: calling it twice creates exactly one set of payouts and one notification.

### 11.7 Webhooks — `POST /api/paypal/webhook`
- Subscribe (M9) to: `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.PAYOUTSBATCH.SUCCESS`, `PAYMENT.PAYOUTSBATCH.DENIED`, `PAYMENT.PAYOUTS-ITEM.SUCCEEDED`, `PAYMENT.PAYOUTS-ITEM.FAILED`, `PAYMENT.PAYOUTS-ITEM.UNCLAIMED`.
- Verify every event: `POST /v1/notifications/verify-webhook-signature` with `auth_algo`, `cert_url`, `transmission_id`, `transmission_sig`, `transmission_time` (from `paypal-*` headers), `webhook_id = PAYPAL_WEBHOOK_ID`, `webhook_event` (the parsed body). Only `verification_status === "SUCCESS"` proceeds; otherwise 400.
- Store in `WebhookEvent` by event id; if already processed → 200 and stop (idempotent).
- `PAYMENT.CAPTURE.COMPLETED` → find order by `custom_id`/capture id → `fulfillOrder`. `PAYMENT.CAPTURE.REFUNDED` → order REFUNDED (if not already). Payout item events → update `Payout.status`.
- Always respond 200 quickly after storing; never throw on unknown event types.
- Locally (no public URL) the capture route alone is enough; webhooks are verified after deploy.

### 11.8 Shipping and tracking — `POST /api/orders/[id]/ship`
Input `{ trackingNumber, carrier }` (carrier select: India Post, DHL, FedEx, Blue Dart, Other). Call `POST /v2/checkout/orders/{paypalOrderId}/track` with `{ capture_id, tracking_number, carrier: "OTHER", carrier_name_other: "<name>", notify_payer: true }` (use a real carrier enum where one exists in the docs, e.g. `DHL`, `FEDEX`). Order → SHIPPED. Buyer success/orders pages show tracking. A "Mark delivered" button (co-op) sets DELIVERED.

### 11.9 Refund — `POST /api/orders/[id]/refund` (co-op only)
`POST /v2/payments/captures/{captureId}/refund` with `requestId = "refund-" + orderId` and empty body (full refund). Order → REFUNDED, listing → LIVE again (unless co-op unticks "relist"). If payouts were already sent, show a note "Recover the weaver/co-op payout manually" (out of scope to claw back automatically; list in limitations).

---

## 12. Agentic commerce

### 12.1 Buyer assistant — `/assistant`, `POST /api/assistant`
- Gemini chat with **function calling**. Tools defined once in `src/lib/tools.ts` and reused by MCP:
  - `search_listings({ query?, fabric?, color?, maxPriceUsd?, category? })` → up to 6 LIVE listings `{ id, title, weaver, town, priceUsd, verified, imageUrl, url }`.
  - `get_listing({ id })` → full details incl. authenticity evidence.
  - `create_checkout({ listingId })` → creates an order exactly like `/api/orders` with `channel: ASSISTANT` and returns `{ orderId, paypalOrderId, totalUsd, approveUrl }`. **It does not pay.** The chat renders a "Ready to pay" card with the PayPal button (v6) for that order; the buyer approves.
- System prompt: "You help buyers find authentic handwoven pieces on Thari. Only recommend items returned by tools. Always mention the weaver's name and whether the piece is verified handwoven. Never claim certifications not in the data. Before creating a checkout, confirm the item and total with the buyer. You cannot complete payment; the buyer approves it in PayPal."
- Stream responses if easy; otherwise return the full message. Keep conversation in client state (send history each turn, cap at 20 messages).
- Log each tool call to AgentLog with actor `ai:assistant`.

### 12.2 MCP endpoint — `/api/mcp`
- Expose the same three tools over **MCP Streamable HTTP** (use `mcp-handler` for Next.js or the official SDK). `create_checkout` returns the `approveUrl` (the `payer-action`/`approve` link from the PayPal order's `links`) so the human approves in their browser; orders get `channel: MCP`.
- README section "Use Thari from Claude": how to add `https://<app>/api/mcp` as a custom connector, and a sample prompt ("Find me a verified handwoven silk saree under $250 and get it ready for checkout").
- Optional (only if time): simple bearer token via `MCP_TOKEN` env.

### 12.3 Machine-readable catalog
- `GET /api/catalog.json`: all LIVE listings with schema.org-like fields (id, title, description, brand "Thari", weaver, origin, fabric, colours, price USD, availability, images, url, verifiedHandwoven, evidence summary). Cache 60 s.
- JSON-LD `Product` on every product page (9.2).

---

## 13. Sessions and access

- `iron-session` cookie `thari_session` `{ userId, role }`.
- `/api/demo-login?role=weaver|buyer|coop` logs in the seeded user for that role. In production keep it enabled (it is a demo) but rate-limit lightly.
- Middleware: `/w/*` requires WEAVER, `/coop/*` requires COOP_ADMIN; buyer pages are public; `/orders` shows orders for the session buyer (or "Log in as demo buyer" button). Checkout works without login (buyer id null, payer email from PayPal).
- API routes check role server-side (weaver can only edit her own listings; refund/confirm only COOP_ADMIN).

---

## 14. Seed data and sample content

### 14.1 Seed (`prisma/seed.ts`, idempotent upserts)
- Co-op: "Kanchipuram Weavers' Co-op", Kanchipuram, `SANDBOX_COOP_EMAIL`, 10%.
- Weavers: **Lakshmi R.** (Kanchipuram, silk), **Meena S.** (Karaikudi, Chettinad cotton), **Selvi K.** (Arani, silk-cotton). Lakshmi uses `SANDBOX_WEAVER_EMAIL`; the other two use the same address with a note (sandbox) or extra sandbox accounts if the human creates them.
- Buyer: **Emma Clarke**, Boston, `SANDBOX_BUYER_EMAIL`.
- Co-op admin: **Priya N.**
- 8 LIVE listings (mix: 4 silk sarees $160–$260, 3 cotton $45–$90, 1 dupatta $35), all with English title/description/story, Tamil short title, photos (placeholders until M7), 6 with loom clip + co-op confirmation (verified), 2 without (not verified, to show the difference).
- 1 SOLD listing with a PAID order + succeeded payouts + a heard notification (so dashboards aren't empty).
- Fake but plausible text; **never** use real people's names except the human's real weaver when M7 consent is given.

### 14.2 Placeholder media
Until M7 arrives, photos use the `.th-weave` pattern via a `PlaceholderImage` component (vary hue per listing). When M7 files arrive, a script `npm run media:upload` uploads `/content/raw/*` to Blob and updates seed records by filename convention `<listingSlug>-1.jpg`, `<listingSlug>-loom.mp4`.

### 14.3 Tamil sample voice note script (for M8)
Record this, spoken naturally (it deliberately leaves out the length, so the AI asks a question in the demo):

> நான் ஒரு காஞ்சிபுரம் பட்டுப் புடவை நெய்திருக்கிறேன். ஆரஞ்சும் மஞ்சளும் கலந்த நிறம், மயில் பார்டர். ரவிக்கைத் துண்டு உண்டு, தைக்கப்படவில்லை. விலை பதினெட்டாயிரம் ரூபாய். நெய்ய ஆறு வாரம் ஆனது.

English meaning: "I have woven a Kanchipuram silk saree. Orange and yellow, peacock border. Blouse piece included, unstitched. Price eighteen thousand rupees. It took six weeks to weave."

Expected AI question: "புடவை எத்தனை மீட்டர்?" (How many metres is the saree?) → answer "ஆறரை மீட்டர்" (six and a half metres) → record this answer too as `/public/samples/sample-answer-ta.wav` for the judge demo path.

---

## 15. Phases (time-boxed to the deadline)

Deadline: **Nov 13, 1:30 AM IST**. Target: submitted by **Nov 12, 9:00 PM IST**.

### Phase 0 — Setup (Session 1, first ~20 min) — human + agent in parallel
Human: M1, M2, M3, M4, M5 (agent asks for each value as needed).
Agent:
1. Scaffold Next.js (TypeScript, App Router, Tailwind, ESLint, `src/`), add Prettier, Vitest.
2. Add MIT `LICENSE`, `.gitignore` (incl. `.env*`, `content/raw`), `.env.example`, `PROGRESS.md`, README stub.
3. `src/lib/env.ts` with Zod; `npm run dev` prints a clear list of missing vars.
4. Install deps (section 3).
**Accept:** `npm run dev` starts; `npm test` runs (one trivial test); repo pushed.

### Phase 1 — Brand, data, shells (Session 1, remaining ~25 min, may spill)
1. `globals.css` with section 8 tokens + component CSS; fonts via `next/font`.
2. React components: Button, TextField, ListingCard, AuthenticityBadge, StatusChip, BottomNav, TopNav, PlaceholderImage, Wordmark.
3. Prisma schema (section 7), `prisma migrate dev`, seed (14.1).
4. Session + `/api/demo-login` + `/demo` page.
5. Buyer home `/`, `/explore`, `/p/[id]` rendering seeded data (PayPal button stub), responsive per 8.5.
6. `money.ts` + `fsm.ts` with unit tests.
**Accept:** `/demo` → Buyer → home shows 8 seeded listings in brand styling on 390px and 1280px widths; product page complete; tests green.
**End of Session 1:** update PROGRESS.md with exactly where to resume.

### Phase 2 — Weaver listing creation with AI (Session 2, ~3–4 h)
1. Blob upload route (client uploads with token), photo resize, clip limits.
2. VoiceRecorder (WAV), PhotoPicker, clip picker, step flow `/w/new`.
3. `extractListing`, `answerQuestion`, regeneration, TTS with cache, mock fixtures.
4. Routes draft/answer/confirm; listing state machine; co-op confirm route.
5. Weaver home `/w` and pieces list.
**Accept:** with `AI_MODE=mock` the full flow works; with `AI_MODE=live` and the sample voice note, a listing is created with correct fields, the length question is asked in spoken Tamil, the sample answer fills it, read-back plays, confirm makes it LIVE, and it appears on `/explore` (unverified until co-op confirms).

### Phase 3 — PayPal checkout, capture, split, notification (Session 3, ~3–4 h)
1. PayPal client + token cache; create order; capture; `PayPalButton` (v6).
2. `fulfillOrder` with payouts, notification + TTS, logs; tests for idempotency and split.
3. Catalog product on publish.
4. Success page, `/orders`, weaver sales + money pages, notification polling (every 5 s on `/w`) with auto-play attempt.
5. Ship (tracking) and export papers page.
**Accept:** buying a listing with the sandbox buyer completes; listing shows Sold; two payouts appear (or "Payout pending" with Retry and a logged reason); weaver home shows the Tamil sold card and plays audio; tracking added appears for the buyer; tests green.

### Phase 4 — Agentic commerce + co-op dashboard (Session 4, ~3 h)
1. Shared tools; `/assistant` chat with tool calling and in-chat PayPal button.
2. `/api/mcp` with the same tools; README instructions; test with Claude (custom connector) or the MCP Inspector.
3. `/api/catalog.json`, JSON-LD.
4. Co-op dashboard with AG Grid (listings confirm, orders refund, payouts retry, overview + AgentLog feed).
**Accept:** "Find a verified silk saree under $250" in `/assistant` returns real seeded items and produces a payable checkout; MCP Inspector lists and calls the tools; co-op confirm makes the badge appear; refund works in sandbox.

### Phase 5 — Deploy, webhooks, real content, polish (Session 5, ~2–3 h)
1. Deploy to Vercel (M6), set env vars there, run migrations + seed against Neon.
2. M9 webhook, verify signature path end to end (a real sandbox purchase triggers `PAYMENT.CAPTURE.COMPLETED`, stored once).
3. Upload M7 real photos/clips; swap seed media.
4. Polish pass: empty states, loading skeletons (woven shimmer), error toasts, 404 page, favicon, OG image, page titles, mobile Safari check (audio recording + playback), lighthouse accessibility ≥ 90 on home and product page.
5. README final (section 17).
**Accept:** the full demo path (section 18) works on the hosted URL on a phone and a laptop, twice in a row, with a fresh listing each time.

### Phase 6 — Submit (Session 6, ~1–2 h)
1. Human records video (M10). Agent writes the Devpost description draft into `docs/devpost.md` (inspiration, what it does, how we built it, challenges, accomplishments, what we learned, what's next, built with) and the "Built with" list.
2. Human submits (M11) by **Nov 12, 9 PM IST**.
3. Freeze: no further commits.

**If time runs short, cut in this order:** MCP endpoint (keep in-app assistant) → export papers → catalog product → co-op AG Grid (replace with simple tables, and don't select the AG Grid sponsor) → refunds. **Never cut:** voice → listing → read-back → PayPal checkout → split payouts → Tamil sold notification → verified badge.

---

## 16. Testing checklist

**Unit (Vitest):** money conversion and rounding; split sums exactly; FSM allowed/forbidden transitions; `fulfillOrder` twice = one payout set + one notification (mock PayPal client); webhook handler ignores duplicates and rejects bad signatures (mock verify); Zod schemas reject malformed AI output; `create_checkout` refuses non-LIVE listings.

**Manual sandbox script (run before deploy and after):**
1. `/demo` → Weaver → New → Use sample voice note → add 3 photos + clip → answer length with sample answer → hear read-back → publish.
2. `/demo` → Co-op → Listings → Confirm the new piece → badge shows on product page.
3. `/demo` → Buyer → open the piece → PayPal → log in with sandbox buyer → pay.
4. Success page shows; piece is Sold; co-op Payouts shows two rows; weaver home plays the Tamil sold message.
5. Weaver → Sales → add tracking → buyer Orders shows tracking.
6. Buyer → Assistant → "Find me a verified cotton saree under $100" → Ready to pay card → pay.
7. Co-op → Orders → Refund the second order → status Refunded, piece relisted.
8. Reload everything; nothing duplicated (one notification, two payouts per order).

**Keep alive until Dec 21:** Vercel Hobby (no sleep), Neon free (auto-wakes), Gemini key active (billing recommended), PayPal sandbox app untouched, Bryntum/AG Grid community needs no trial.

---

## 17. README (final contents)

Title + one-line pitch, hosted demo link + `/demo`, video link, screenshots (mobile weaver + laptop buyer + co-op), the problem (3 sentences), how it works (8 steps from section 1), **PayPal features used table** (Orders v2 + JS SDK v6, capture, Payouts, Catalog Products, order tracking, refunds, webhooks with signature verification, idempotency keys), **AI used table** (Tamil audio understanding, vision, structured listing generation, spoken Tamil questions and read-back, Tamil TTS, assistant tool calling, MCP, export-paper drafting), architecture diagram (Mermaid), local setup (env, migrate, seed, dev), test logins (sandbox buyer), "Use Thari from Claude (MCP)", tests, **design decisions and limitations** (sandbox only; fixed FX rate; flat shipping; platform-collects-then-payouts model would need PayPal partner onboarding in production; payouts not clawed back on refund; export papers are drafts; authenticity is evidence not a guarantee; India domestic PayPal payments not supported, so focus is cross-border), "Beyond handloom" (pottery, Swamimalai bronzes, Tanjore paintings, Channapatna toys — categories are data, not code), license (MIT), team.

---

## 18. Demo video outline (under 3 minutes)

- **0:00–0:20 Problem.** Real footage of the weaver/loom (M7). "Lakshmi's saree takes six weeks. A trader pays her a fraction. Buyers abroad can't tell real handloom from copies."
- **0:20–1:05 Weaver.** Phone view: Tamil voice note → photos → loom clip → the AI asks in Tamil "How many metres?" → she answers → Tamil read-back → publish. Caption English subtitles.
- **1:05–1:20 Co-op confirms.** Gold Verified handwoven badge appears.
- **1:20–1:55 Buyer.** Laptop: product page with loom clip and story → PayPal checkout (sandbox) → success. Then the assistant: "Find a verified silk saree under $250" → Ready to pay card.
- **1:55–2:20 Weaver hears it.** Phone plays: "உங்கள் புடவை விற்பனையானது…" with subtitle; payouts split shown in co-op dashboard.
- **2:20–2:45 How it's built.** Architecture slide naming each PayPal API and AI piece; MCP in Claude for 5 seconds.
- **2:45–3:00 Impact.** "Thari starts with handloom; any maker with a phone can use it." End card with URL.

---

## 19. Official docs to check (agent: verify before coding each part)

- PayPal JS SDK v6 checkout: https://developer.paypal.com/checkout/integrate and v6 reference https://docs.paypal.ai/reference/sdk/js/v6/reference
- PayPal Orders v2 API: https://developer.paypal.com/docs/api/orders/v2/
- PayPal Payments v2 (captures, refunds): https://developer.paypal.com/docs/api/payments/v2/
- PayPal Payouts: https://developer.paypal.com/docs/api/payments.payouts-batch/v1/
- PayPal Catalog Products: https://developer.paypal.com/docs/api/catalog-products/v1/
- PayPal order tracking: https://developer.paypal.com/docs/api/orders/v2/#orders_track_create
- PayPal webhooks + verify signature: https://developer.paypal.com/api/rest/webhooks/
- Gemini models (current IDs): https://ai.google.dev/gemini-api/docs/models
- Gemini audio understanding: https://ai.google.dev/gemini-api/docs/audio
- Gemini structured output: https://ai.google.dev/gemini-api/docs/structured-output
- Gemini function calling: https://ai.google.dev/gemini-api/docs/function-calling
- Gemini speech generation (TTS, languages incl. Tamil): https://ai.google.dev/gemini-api/docs/speech-generation
- MCP on Next.js: https://github.com/vercel/mcp-handler
- AG Grid React: https://www.ag-grid.com/react-data-grid/getting-started/
- Vercel Blob: https://vercel.com/docs/storage/vercel-blob
- Prisma + Neon: https://neon.tech/docs/guides/prisma

---

## 20. Definition of done

- [ ] Every "Never cut" feature works on the hosted URL, on phone and laptop.
- [ ] `/demo` lets a judge try all three roles without setup; sandbox buyer login shown.
- [ ] "Use sample voice note" path works for non-Tamil speakers.
- [ ] All unit tests pass; manual sandbox script passes twice.
- [ ] No secrets in the repo; `.env.example` complete; MIT license visible at repo top.
- [ ] README complete (section 17) with screenshots and limitations.
- [ ] Brand kit followed: tokens only, no emoji, one primary button per screen, Tamil styles for Tamil text.
- [ ] AgentLog shows every AI and money action in the co-op overview.
- [ ] Video under 3 minutes uploaded publicly; Devpost submitted before the deadline.
