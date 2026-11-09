# Agent instructions

Read `BUILD_PLAN.md` fully before doing anything. It is the single source of truth for what to build, how, the brand kit, and which steps need the human (MANUAL items M1–M12).

- Resume from `PROGRESS.md` (create it if missing) and update it after every task.
- Build phase by phase (section 15); don't start a phase before the previous one's acceptance tests pass.
- At a MANUAL item, stop and ask the human for exactly what it lists.
- Never commit secrets. Never change the brand tokens.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
