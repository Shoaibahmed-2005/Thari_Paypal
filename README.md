# Thari (தறி)

Handloom weavers in Tamil Nadu sell worldwide with their voice and phone, with proof each piece is handwoven. Built for the PayPal AI Hackathon 2026.

> Work in progress. See `BUILD_PLAN.md` for the full plan and `PROGRESS.md` for status.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in values (see PROGRESS.md → "Create .env.local")
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
npm test
```

`.env.local` is git-ignored and must be created on every machine. Never commit it.

## License

MIT, see `LICENSE`.
