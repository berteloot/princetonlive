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

## Render static site

This repo includes `render.yaml` for Render Blueprint deployment.

- Service type: `static_site`
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- SPA rewrite: `/*` to `/index.html`

Render static sites are free to deploy, subject to Render's included outbound bandwidth and build pipeline limits.
