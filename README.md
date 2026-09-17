# PrincetonLive

PrincetonLive is a static React/Vite MVP for a daily operating guide for becoming a Princetonian.

For ongoing development context, data sources, deployment notes, and the change checklist, read `PROJECT_MEMORY.md` before making updates.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The static output is written to `dist`.

## Hosting: Cloudflare Workers

The site is served by Cloudflare Workers Static Assets (Worker `princetonlive`, config in `wrangler.jsonc`).

- Deploys run from `.github/workflows/deploy-cloudflare.yml` on every push to main and after every successful "Refresh public data" run. The build is `npm ci && npm run build`, the same command Render ran.
- Repository secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CENSUS_API_KEY`.
- Security headers live in `public/_headers`. Rewrites for `/` and `/guides/` live in `public/_redirects`, because `html_handling` is `none` so the `.html` URLs in the sitemap are never redirected.
- Unknown paths return a real 404.
- Origin URL: https://princetonlive.berteloot.workers.dev

