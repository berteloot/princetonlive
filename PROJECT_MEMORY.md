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
- SEO pillar page generator: `scripts/build-seo-pages.mjs`
- Render config: `render.yaml`
- Scheduled data refresh: `.github/workflows/refresh-data.yml`
- Crawl policy: `public/robots.txt`
- XML sitemap: `public/sitemap.xml`
- Agent guidance: `public/llms.txt`

The website is a static Render site. Runtime data is served from generated JSON files in `public/`, and the frontend fetches those files with cache-busting query strings.
SEO pillar pages are generated into `public/guides/` before each build, along with synced sitemap and llms.txt entries.

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

Generate SEO pillar pages:

```bash
npm run build:seo
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
- Static resident-perk links verified from Princeton Public Library, Princeton University Community Auditing, Arts Council of Princeton, and Princeton municipal pages

Civic map:
- U.S. Census TIGERweb block-group geometry
- U.S. Census TIGERweb Princeton county-subdivision boundary for selecting only Princeton municipal block groups
- U.S. Census API / ACS 5-year estimates when `CENSUS_API_KEY` is available during build or refresh. The refresh tries the newest plausible ACS 5-year release first, steps backward if Census has not published that year yet, and can be pinned with `CENSUS_ACS_YEAR`.
- Census Reporter API / ACS estimates as the automatic fallback if the official Census key is missing or the API is unavailable
- U.S. Census API or Census Reporter national ACS benchmarks, matched to the same ACS release as the Princeton block-group feed
- U.S. Census TIGERweb national block-group count for children-per-block-group normalization
- OpenStreetMap Nominatim for submit-only address lookup on the civic map
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
- Civic map benchmarks must be generated from public data during refresh. Income and child-share use U.S. ACS values from the same release as Princeton block-group estimates; children count is compared with U.S. average residents under 18 per census block group, not the national child total.
- Explain Census terms in resident language. A block group is a smaller aggregate area inside a tract; it is still not a named neighborhood, voting precinct, household, or exact address.
- Wealth UI must explain that ACS median household income is top-coded at `$250,001+`; missing small-area estimates should read as "No ACS estimate," not low wealth.
- Civic address lookup should be submit-only, privacy-forward, and should not store searched addresses. The current implementation uses OpenStreetMap/Nominatim plus local block-group geometry. Google Places autocomplete can be added later only after a Google Maps API key, billing, and domain restrictions are configured.
- Resident perks must distinguish free benefits from access programs that cost money. Princeton University Community Auditing is resident-relevant, but it is tuition-based, not a free library-style perk.
- The Census API key must stay server/build-side only. The browser receives generated aggregate JSON, never the key.
- GitHub scheduled refresh passes `CENSUS_API_KEY` from repository secrets when configured and falls back to Census Reporter when absent.
- External links should open in a new tab with `target="_blank"` and `rel="noopener noreferrer"` so visitors do not lose PrincetonLive. In-page hash navigation stays in the same tab.
- SEO/GEO crawlability matters: `index.html` must keep crawlable fallback body content inside `#root`, a clear H1, canonical/geo/social metadata, and JSON-LD in the initial HTML so non-JavaScript AI/search crawlers can classify the page.
- Structured data should represent visible page content. Keep the visible FAQ in sync with the FAQPage JSON-LD and keep the civic Dataset JSON-LD aligned with `public/civic-map.json`.
- `robots.txt`, `sitemap.xml`, and `llms.txt` should be deployed at the domain root and updated when site positioning, URLs, language routes, or machine-readable endpoints change.
- SEO pillar pages live under `/guides/` and are generated from `scripts/build-seo-pages.mjs`. Add new stable guide topics there first so the HTML page, guide hub, sitemap, and llms.txt stay synchronized.

## Feature Log

- Latest - Added a generated SEO pillar guide cluster under `/guides/` for moving to Princeton, library benefits, transit, culture, civic data, and resident services, with homepage internal links.
- Latest - Added SEO/GEO crawlability layer: raw HTML answer block, explicit H1, canonical/social/geo metadata, JSON-LD graph, robots.txt, sitemap.xml, llms.txt, and visible resident FAQ.
- Latest - Updated external link handling so outbound and data-fed links open in a new tab while internal section navigation remains same-page.
- Latest - Updated the civic data refresh to prefer the official U.S. Census API with `CENSUS_API_KEY`, auto-detect the newest available ACS 5-year release, and keep Census Reporter as an automatic fallback.
- Latest - Improved civic map accuracy by switching wealth/children from census tracts to census block groups and selecting areas against the Princeton municipal boundary instead of a bounding box.
- Latest - Added explicit ACS top-code and missing-estimate handling to the wealth layer after checking Library Place, Westcott Road, and Lytle Street.
- Latest - Added a resident perks section covering free library-card benefits, library parking/study rooms/museum passes/technology, community auditing, Arts Council resources, the free Princeton Loop, Human Services, and Recreation.
- Latest - Added civic map address lookup that places a marker and highlights the matching block group without storing the submitted address.
- Latest - Added a plain-English Census geography explainer to the civic map.
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
