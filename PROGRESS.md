# Progress

_Last updated: 2026-11-09, session 1_

## Done
- Phase 0: Next.js 16.4.5 (App Router, TS strict, Tailwind v4, ESLint, `src/`), Prettier, Vitest 5.
- LICENSE (MIT), `.gitignore` (`.env*` except `.env.example`, `content/raw/`), `.env.example`, README stub.
- `src/lib/env.ts` (Zod): `npm run dev` prints the missing vars; in production a missing var throws.
- Deps installed: zod 4, @prisma/client + @prisma/adapter-pg 7.10.1, prisma 7.10.1 (npm `latest` is an 8.0 RC, so we stay on stable 7), @google/genai 3, @vercel/blob 2, iron-session 9, lucide-react.
- Phase 1 item 6: `money.ts` + `fsm.ts` with unit tests (12 passing).

## Next
- Phase 1: brand tokens + component CSS + fonts, React components, Prisma schema + seed, session + `/demo`, buyer pages.

## Blocked / notes
- Prisma 7 needs the datasource URL in `prisma.config.ts` and a driver adapter. Check the Prisma + Neon docs before writing the schema.
- Deferred until their phase: ag-grid, mcp-handler, extendable-media-recorder.

## MANUAL items
| ID | Status |
|---|---|
| M1 repo | Remote set to github.com/Shoaibahmed-2005/thari-paypal |
| M2 PayPal app | pending |
| M3 sandbox accounts | pending |
| M4 Gemini key | pending |
| M5 Neon | pending (needed next, for Prisma migrate) |
| M6–M12 | later phases |
