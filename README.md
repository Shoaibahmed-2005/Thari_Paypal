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

## Credits and media

- **Saree photographs and the loom clip** in `public/media` were supplied by the project owner.
- **Home page hero** (`public/media/weaver-loom.jpg`): photo by [Sanjay Adhitya](https://www.pexels.com/@sanjay-adhitya-2153341322/) via [Pexels](https://www.pexels.com/photo/indian-weaver-crafting-traditional-textiles-32673642/), used under the Pexels licence (free for commercial use). It shows a real weaver at a pit loom and is not a photograph of any of the seeded weavers, who are fictional.
- **Sample voice notes** in `public/samples` are Tamil stand-ins for the judge demo path.
- The seeded weavers, co-op and buyer are fictional; sandbox PayPal accounts move no real money.
