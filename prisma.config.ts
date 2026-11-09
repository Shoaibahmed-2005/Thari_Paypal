import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 7 does not auto-load env files; Next.js uses .env.local, so load it here.
config({ path: ".env.local" });
config(); // fall back to .env if present

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // CLI (migrate, seed) uses the DIRECT (non-pooled) URL. The app uses the pooled
    // DATABASE_URL via the Neon adapter in src/lib/db.ts. The placeholder lets
    // `prisma generate` run on machines without a database configured.
    url: process.env.DIRECT_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
