# PrincetonLive Project Memory

This file is the working memory for PrincetonLive. Update it whenever the site gains a feature, a data source, a deployment change, or an important UX decision.

## Current Product

PrincetonLive is a static React/Vite website for residents and new arrivals in Princeton, NJ. It is positioned as a daily operating guide: what to know today so Princeton becomes a usable home.

Production:
- Primary URL: https://princetonlive.berteloot.org
- Render URL: https://princetonlive.onrender.com
- Render service ID: `srv-da1fs149v7es73bavnq0`
- GitHub repo: `berteloot/princetonlive`

## Architecture

- App entry: `src/main.jsx`
- Styling: `src/styles.css`
- Live daily data output: `public/live-data.json`
- Civic map data output: `public/civic-map.json`
- Daily data refresh script: `scripts/fetch-live-data.mjs`
- Civic map refresh script: `scripts/fetch-civic-map.mjs`
- Render config: `render.yaml`
- Scheduled data refresh: `.github/workflows/refresh-data.yml`

The website is a static Render site. Runtime data is served from generated JSON files in `public/`, and the frontend fetches those files with cache-busting query strings.

## Commands

Local development:

```bash
npm install
npm run dev
```

Refresh public data:

```bash
npm run refresh:public
```

Build:

```bash
npm run build
```

Quick public verification after deploy:

```bash
curl -fsS 'https://princetonlive.berteloot.org/civic-map.json?v=COMMIT' | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const j=JSON.parse(s); console.log(j.features.length, j.release);})'
```

Render deploy status uses the API key in `/Users/stanislasberteloot/.config/nytro/.env`. Do not commit or display secrets.

## Public Data Sources

Daily operating data:
- National Weather Service forecast and alerts
- Princeton University public events RSS
- Princeton Public Library Communico events endpoint
- Municipality of Princeton RSS calendar

Civic map:
- U.S. Census TIGERweb tract geometry
- Census Reporter API / ACS 2024 5-year estimates
- Census Reporter API national ACS benchmarks, matched to the same ACS release as the Princeton tract feed
- U.S. Census TIGERweb national tract count for children-per-tract normalization
- NJ Division of Elections official 2024 Mercer presidential results PDF
- FEC official 2024 presidential general election results PDF for national popular-vote benchmark
- Mercer County archived election results links
- Princeton elections links

## UX Decisions

- Keep PrincetonLive resident-first, not tourist-first.
- Use Princeton orange and black with strong contrast; avoid white text on light backgrounds.
- Google Translate powers French and Spanish because the content is expected to update from public feeds.
- Agenda filters and search must remain clickable after Google Translate mutates the DOM.
- Weather appears in the top daily brief; do not duplicate weaker weather cards lower on the page.
- Anchor links must account for the sticky header so section headings, controls, and map toolbars are not hidden when landing on a deep link.
- Civic data must be neighborhood-scale or aggregate only. Do not publish individual voter, household, or address-level data.
- The voting layer may show official Princeton municipal-level Republican/Democrat results across the map, but neighborhood shading should only be added after official district totals are safely joined to public district boundaries.
- Civic map legends must show both sides of the scale. For wealth/children layers, darker means higher. Children count and child share must use distinct labels and color scales because count and percentage answer different questions. For voting, red-to-blue means Republican-to-Democratic.
- Civic map regions should expose their current metric on hover, focus, and tap/click.
- Civic map benchmarks must be generated from public data during refresh. Income and child-share use U.S. ACS values from the same release as Princeton tract estimates; children count is compared with U.S. average residents under 18 per census tract, not the national child total.

## Feature Log

- Latest - Added U.S. benchmark comparisons to civic map metrics, generated from public Census/FEC sources during the civic data refresh.
- Latest - Improved civic map hover/tap details, fixed lower/higher legends, and reflected official Princeton municipal presidential results on the voting layer.
- Latest - Made the civic map distinction between children count and child share explicit, with separate green and blue scales.
- `744922f` - Added aggregate civic map with wealth, children, family-share, and source-linked voting layers.
- `c2241f2` - Added footer attribution: "Vibe coded with love by Stan Berteloot."
- `a22ce90` - Consolidated weather and alert UI.
- `8993e45` - Fixed agenda filters and search.
- `53d5aa3` - Automated Princeton public data feed.
- `aba729b` - Removed manual multilingual copy in favor of Google Translate.

## Update Checklist

When changing the site:

1. Update this file if the change affects features, data sources, deployment, verification, or UX rules.
2. Run `npm run build`.
3. Verify the relevant interaction locally, especially search, filter buttons, map controls, and language controls.
4. Commit and push.
5. Confirm Render deployed the intended commit.
6. Verify the public URL with a cache-busting `?v=COMMIT`.
