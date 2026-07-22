# MK ViralCanvas

**Free browser studio for memes, social graphics, and quote cards. No signup. Open source.**

Live: https://19-web-viral-creator.vercel.app

MK ViralCanvas is a privacy-conscious meme + social-graphic editor that runs entirely in the browser. Pick a template, drop in an upload, add text, export in the right size for your platform. Nothing gets uploaded to a server unless you explicitly opt into public sharing.

## What actually ships today

- Template browser powered by the free Imgflip API (always on).
- Multi-source paid image search (Serper, Brave, SerpApi, Tavily, SearchApi, Exa, ScrapingDog, Apify) — each source activates only when its API key is set in the Vercel project. When none are set, template browsing still works.
- Editor with text overlay, style controls, undo/redo, and export via html2canvas.
- Local project persistence via `localStorage` (see [docs/PRIVACY.md](docs/PRIVACY.md)).
- Analytics: nothing loads unless you configure `VITE_GTM_ID` or `VITE_GA4_ID` at build time, or enable Vercel Analytics in the dashboard. See [docs/ANALYTICS.md](docs/ANALYTICS.md).

Not shipped yet:

- Server-side AI features (`AI_PROVIDER`, `OPENAI_API_KEY`, etc. are placeholders in `.env.example` — no LLM calls wired).
- Multi-page campaigns, background removal, batch export — on the roadmap.

## Tech stack

- React 19 + TypeScript
- Vite 6
- Tailwind CSS 4
- Zustand
- Vercel Serverless Functions (`api/*.mjs`) for meme search
- Express (`server/index.js`) for local dev, thin wrapper over the same handlers
- Vitest

## Getting started

```bash
npm install
npm run dev
npm test
npm run build
```

`npm run dev` runs Vite (`:5000`) and the Express dev API (`:3001`) concurrently.

## Environment variables

Copy `.env.example` to `.env.local` for local dev, or set them in the Vercel project. All are optional — the app degrades gracefully.

## Deployment

Deploys to Vercel via Git integration. Push to `main` triggers production; any other branch produces a preview deployment. Framework: Vite (auto). Output: `dist/`. Serverless functions: `api/*.mjs`.

## Project structure

```
src/
  App.tsx
  components/
  stores/
  utils/api.ts
  utils/analytics.ts
api/
  _lib/memes.mjs
  memes/{templates,search,trending}.mjs
  memes/category/[category].mjs
  {categories,sources,health}.mjs
server/index.js   # dev-only Express wrapper importing the same handlers
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md).

## License

MIT — see [LICENSE](LICENSE).

Built and maintained by [Kazi Musharraf](https://www.mkazi.live) (`mk-knight23`).
