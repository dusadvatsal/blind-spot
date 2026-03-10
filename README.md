# Blind Spot

A post-conversation tool that makes your judgment visible to yourself.

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo
3. Add environment variable: `ANTHROPIC_API_KEY` = your key
4. Deploy

Every push to `main` auto-deploys.

## Local dev

```bash
npm install
cp .env.example .env.local  # add your key
npm run dev
```

## How it works

- `app/page.js` — the full UI (single client component)
- `app/api/claude/route.js` — server-side proxy to Anthropic API (keeps key hidden)
- `app/layout.js` — metadata + fonts
