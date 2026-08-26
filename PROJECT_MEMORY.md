# PrincetonLive Project Memory

This file is the working memory for PrincetonLive. Update it whenever the site gains a feature, a data source, a deployment change, or an important UX decision.

## Current Product

PrincetonLive is a static React/Vite website for residents and new arrivals in Princeton, NJ. It is positioned as a daily operating guide: what to know today so Princeton becomes a usable home.

Production:
- Primary URL: https://princetonlive.berteloot.org
- Render URL: https://princetonlive.onrender.com
- Render service ID: kept in local notes outside this repo
- GitHub repo: `berteloot/princetonlive`
- Canonical local folder: kept in local notes outside this repo

## Architecture

- App entry: `src/main.jsx`
- Styling: `src/styles.css`
- Live daily data output: `public/live-data.json`, holding `events` (seven days, each with `isoDate` and `startHour`), `days` (the picker with per-day counts), and `trackedSeries`
- Civic map data output: `public/civic-map.json`
- Daily data refresh script: `scripts/fetch-live-data.mjs`
- Civic map refresh script: `scripts/fetch-civic-map.mjs`
- SEO pillar page generator: `scripts/build-seo-pages.mjs`
- Render config: `render.yaml`
- Scheduled data refresh: `.github/workflows/refresh-data.yml`
- Pierre site monitor: `.github/workflows/pierre-site-monitor.yml`
- Pierre monitor config: `monitoring/pierre-site-monitor.json`
- Pierre monitor runner: `tools/site_monitor.py`
- Crawl policy: `public/robots.txt`
- XML sitemap: `public/sitemap.xml`
- Agent guidance: `public/llms.txt`
- Analytics: Google tag `G-RL5N5X5EZE` in `index.html` and generated guide pages

The website is a static Render site. Runtime data is served from generated JSON files in `public/`, and the frontend fetches those files with cache-busting query strings.
SEO pillar pages are generated into `public/guides/` before each build, along with synced sitemap and llms.txt entries.
Pierre monitors the website every 15 minutes from GitHub Actions, persists `.monitor-state.json` through the Actions cache, and sends Telegram alerts only on new failures or recoveries. The required GitHub repository secrets are `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.

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

Order matters: the cinema schedule is written first because the day list reads it. A garden
failure logs and continues, so weather and events still refresh.

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

Run Pierre's health monitor locally:

```bash
python3 tools/site_monitor.py --config monitoring/pierre-site-monitor.json --state /tmp/princetonlive-monitor-state.json
```

Render deploy status uses a local API key held outside this repo. Do not commit or display secrets.

## Public Data Sources

Daily operating data:
- National Weather Service forecast and alerts
- Princeton University public events RSS
- Princeton Garden Theatre showtimes, read from `public/garden-theatre.json` rather than fetched twice. `refresh:garden` therefore runs BEFORE `refresh:data` in `refresh:public`, and it is guarded so a cinema outage cannot stop the daily data refresh
- Tracked series, currently none. The Seuls en Scene French Theater Festival was carried here until Stan removed it on 2026-08-26. If a series returns: the Lewis Center host (arts.princeton.edu) sits behind a Cloudflare challenge and returns 403 to any scheduled fetch, so read performance dates out of the university events feed by title match and use the arts page as the resident-facing link
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
- Princeton Public Schools official school pages and registration/address-assignment guidance
- NJ School Performance Reports as the official public report-card source

Waste:
- Princeton garbage collection page and public street schedule
- Princeton leaf, branch, and log collection page and residential brush/leaf section list
- Princeton 2026 waste collection brochure for yard-waste section dates and placement rules
- Recycle Coach Princeton city record/widget for official live address-specific reminders

Explore walks:
- Municipality of Princeton open-space pages for D&R Canal State Park, Institute Woods, Iron Mike Trail, and Community Park North
- D&R Canal trail maps
- Institute for Advanced Study Institute Woods trail map PDF
- NJDEP Princeton Battlefield State Park page
- Friends of Princeton Open Space trail maps
- Princeton Recreation Community Park South page
- Historical Society of Princeton digital tours
- Experience Princeton downtown visit resources

## UX Decisions

- Keep PrincetonLive resident-first. Tourist content only earns space when residents also use it.
- The event list is a day view. It carries seven days, each event stamped with its Eastern day and start hour at build time, and the visitor picks a day and can filter to 5 PM onward. This came from user feedback: the question a resident actually asks is what is on Tuesday evening, and a flat 18-event cut answered about two days and hid everything else.
- Every source that publishes local wall-clock time goes through `easternInstant()`. Node reads an unzoned date string in the machine's zone, which is UTC on the GitHub runner and Eastern on a laptop, so before this the library, town and cinema events sorted differently depending on where the refresh ran.
- Section order follows what a visitor needs first: alerts, the day list, the cinema, town services and garbage, personalization, transit, first week, perks, walks, neighborhood data, guides, FAQ. The FAQ is about the site itself, so it stays last. The top navigation mirrors that order.
- Page copy follows `memory/writing_guide.md` and passes `integrations/quality_gate.py`. No noun piles standing in for a description, no editorial adjectives, no slogan headings. A heading names what the section holds.
- A tracked series pins a dated run that is too far out for the agenda list. The list keeps the next 18 events, which is about two days, so a festival a month away would never appear on date order alone. Series are declared in `trackedSeries` in `scripts/fetch-live-data.mjs`: every matching date joins the event list regardless of the cut, and the series gets one card above the list. The card disappears on its own once the last performance is 12 hours past, so no one has to remove it.
- Use Princeton orange and black with strong contrast; avoid white text on light backgrounds.
- Keep the homepage hero hierarchy practical: `PrincetonLive` can be the large H1, while descriptive SEO/resident-guide language belongs in smaller lead/supporting copy so daily content remains visible in the first viewport.
- Google Translate powers French and Spanish because the content is expected to update from public feeds.
- Agenda filters and search must remain clickable after Google Translate mutates the DOM.
- Weather appears in the top daily brief; do not duplicate weaker weather cards lower on the page.
- Anchor links must account for the sticky header so section headings, controls, and map toolbars are not hidden when landing on a deep link.
- Mobile navigation wraps cleanly on iPhone-width screens, with no clipping and no horizontal scrolling.
- Deep links are re-applied after React/data hydration so links like `#waste` and `#civic` land on the correct section on mobile and desktop.
- First-month walk cards must include actionable guide/map links. Avoid listing walks that residents cannot open in a map or official/stable resource.
- The site serves two readers, a resident and a newcomer, and the layout separates them (reader feedback, Aug 2026). Garbage day is a once-and-done question: once a street is saved in My Princeton, the hero tile states the day and the garbage tool collapses to the answer with one control to reopen the full lookup. The hero carries four tiles and no buttons: one link per daily question, and one-time lookups (neighborhood map, perks, walks) stay in the nav. Newcomer steps group under "New to town?" in the nav, with perks and walks reached from that section rather than from the nav. The nav holds eight entries, one per question a visitor arrives with; "Move" and "My" were read as house-moving and as nothing.
- Search lives in the sticky header (a Search button opens a panel under the header row), so it is one click away anywhere on the page. It is a combobox: arrow keys, Enter, Escape, click outside closes. It covers everything already in memory: sections, guides, FAQ, transit and service tiles, perks, walks, every street in the garbage schedule and the week's events. A street result fills the garbage lookup, an event result opens its day. No server, no index build.
- Live data refreshes only when the reader's tab asks for it. A tab returning to the foreground after 30 minutes re-reads every JSON file (`dataVersion` state, visibilitychange + focus), and the Updated tile says how to force it by hand.
- PrincetonLive takes no submissions. The FAQ says so and points to the public calendars it reads; keep it that way for a hobby site.
- Garbage pickup by street is a primary resident tool. Keep it directly reachable from the top navigation as `#waste` and placed before lower-priority practical service tiles.
- The homepage should behave like an operating guide before it behaves like a brochure: daily shortcuts, resident setup, garbage, transit, events, alerts, and neighborhood context should be reachable quickly.
- My Princeton is a browser-local personalization panel. It may store street name and resident modes in `localStorage`, but must not create accounts, send addresses to PrincetonLive servers, or imply server-side storage.
- The garbage lookup should be input-first. Do not show arbitrary alphabetical streets before the resident types or chooses an example.
- Use resident-facing "Neighborhood map/context" in UI labels; keep civic-data language where it is useful for source notes, SEO, datasets, and technical documentation.
- Civic data must be neighborhood-scale or aggregate only. Do not publish individual voter, household, or address-level data.
- The voting layer may show official Princeton municipal-level Republican/Democrat results across the map, but neighborhood shading should only be added after official district totals are safely joined to public district boundaries.
- Civic map legends must show both sides of the scale. For wealth/children layers, darker means higher. Children count and child share must use distinct labels and color scales because count and percentage answer different questions. For voting, red-to-blue means Republican-to-Democratic.
- Civic map regions should expose their current metric on hover, focus, and tap/click.
- Civic map benchmarks must be generated from public data during refresh. Income and child-share use U.S. ACS values from the same release as Princeton block-group estimates; children count is compared with U.S. average residents under 18 per census block group; comparing against the national child total would be wrong.
- Explain Census terms in resident language. A block group is a smaller aggregate area inside a tract; it is still not a named neighborhood, voting precinct, household, or exact address.
- Wealth UI must explain that ACS median household income is top-coded at `$250,001+`; missing small-area estimates should read as "No ACS estimate," not low wealth.
- Civic address lookup should be submit-only, privacy-forward, and should not store searched addresses. The current implementation uses OpenStreetMap/Nominatim plus local block-group geometry. Google Places autocomplete can be added later only after a Google Maps API key, billing, and domain restrictions are configured.
- School context belongs on the civic map as point/context data. A ranking heatmap is out of scope. Use official public school locations, district assignment links, and NJDOE performance-report links. Do not mix in private-school rankings or third-party scores unless the source methodology is explicit and worth showing.
- Resident perks must distinguish free benefits from access programs that cost money. Princeton University Community Auditing is resident-relevant but tuition-based, so it must never be listed among the free library-style perks.
- The Census API key must stay server/build-side only. The browser receives generated aggregate JSON, never the key.
- GitHub scheduled refresh passes `CENSUS_API_KEY` from repository secrets when configured and falls back to Census Reporter when absent.
- Waste pickup should be resident-first and street/address-first. Use official Princeton street schedules to generate a local searchable garbage-day and yard-section lookup. Recycle Coach has a public city lookup and official widget, but no documented stable schedule API for PrincetonLive use, so link/embed Recycle Coach for live address-specific reminders; reverse-engineering private schedule endpoints is off the table.
- External links should open in a new tab with `target="_blank"` and `rel="noopener noreferrer"` so visitors do not lose PrincetonLive. In-page hash navigation stays in the same tab.
- SEO/GEO crawlability matters: `index.html` must keep crawlable fallback body content inside `#root`, a clear H1, canonical/geo/social metadata, and JSON-LD in the initial HTML so non-JavaScript AI/search crawlers can classify the page.
- Structured data should represent visible page content. Keep the visible FAQ in sync with the FAQPage JSON-LD and keep the civic Dataset JSON-LD aligned with `public/civic-map.json`.
- `robots.txt`, `sitemap.xml`, and `llms.txt` should be deployed at the domain root and updated when site positioning, URLs, language routes, or machine-readable endpoints change.
- Machine-readable JSON endpoints (`/live-data.json`, `/civic-map.json`, `/waste-data.json`) belong in the sitemap and llms.txt so AI/search crawlers can discover the public data layer directly.
- SEO pillar pages live under `/guides/` and are generated from `scripts/build-seo-pages.mjs`. Add new stable guide topics there first so the HTML page, guide hub, sitemap, and llms.txt stay synchronized.
- Pierre monitoring should cover the canonical domain, Render origin, crawlability endpoints, generated JSON freshness, and important upstream public sources.
- Google Analytics must be added at source level: update `index.html` for the app shell and `scripts/build-seo-pages.mjs` for all generated `/guides/` pages.

## Feature Log

- Latest - Removed the Seuls en Scène French Theater Festival tracked series at Stan's request (Aug 26, 2026). The tracked-series machinery stays in `fetch-live-data.mjs` with an empty list.
- Latest - Reader feedback round (Karin, Aug 2026): nav relabelled and cut to eight entries, "New to town?" groups newcomer steps, the garbage hero tile shows the saved day, a live NJ Transit DepartureVision card replaces the duplicate "Check transit" button, site-wide search in the hero, data re-read on return to the tab, and two FAQ entries (no submissions; how current the page is) mirrored in the JSON-LD.
- Latest - Moved the local working copy into its intended local workspace folder. Local absolute paths stay out of this repo.
- Latest - Added Google tag / GA4 measurement ID `G-RL5N5X5EZE` to the app shell and generated SEO pillar pages.
- Latest - Added guide and map links to every First-month Princeton walk card.
- Latest - Renamed user-facing pickup language to garbage pickup.
- Latest - Added homepage resident shortcuts, a first-week Princeton setup checklist, input-first garbage lookup examples, and Neighborhood map/context wording.
- Latest - Added My Princeton browser-local profile with street-based garbage summary, resident modes, event filter shortcuts, commute shortcut, and neighborhood map link.
- Latest - Promoted Garbage pickup by street into the primary navigation and moved the lookup above practical service tiles.
- Latest - Added Pierre site health monitoring with 15-minute GitHub Actions checks and Telegram alert secrets, mirroring the Le Pouliguen Live monitoring pattern.
- Latest - Fixed iPhone navigation wrapping and post-hydration hash scrolling for direct links such as Garbage by Street and Civic Map.
- Latest - Added generated JSON endpoints to the sitemap for AI/chatbot SEO discoverability.
- Latest - Added a generated SEO pillar guide cluster under `/guides/` for moving to Princeton, library benefits, transit, culture, civic data, and resident services, with homepage internal links.
- Latest - Added a generated waste-data refresh and practical Garbage by Street tool using Princeton public garbage-day and brush/leaf section documents, plus Recycle Coach as the official live address calendar.
- Latest - Reduced the homepage hero headline from a long descriptive sentence to `PrincetonLive`, with the resident-guide phrase moved into smaller lead copy for better first-viewport usability.
- Latest - Added a Schools layer to the civic map with Princeton Public Schools campus points, grade context, official district links, assignment caveat, and NJDOE report links.
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

## Crime data (pending an API key)

`scripts/fetch-crime-data.mjs` pulls town-level crime rates for Princeton from the FBI
Crime Data Explorer and benchmarks them against New Jersey and the nation. Run it with
`npm run refresh:crime`.

It is deliberately not wired into `refresh:public` and has no UI yet, because it needs a
free api.data.gov key. The shared `DEMO_KEY` allows only a few requests per hour and is
exhausted immediately. Get a key at https://api.data.gov/signup/ and set
`FBI_CRIME_API_KEY` in the environment, then run the script and build the panel.

Verified while writing it: Princeton Police Department is ORI `NJ0111000`, Princeton
University has its own department at `NJ0115000`, and both report monthly violent and
property counts with populations, so the rate maths works once the key is in place.

Crime is reported at municipal level only. There is no public block-group crime data for
a town this size, and neighborhood-level crime shading is deliberately out of scope: it
moves property values, tracks race and income in ways that entrench historic redlining,
and at roughly 30,000 residents two incidents would swing a polygon from best to worst.

## Princeton University Art Museum

The rebuilt museum is free to all and is linked from the resident perks and the culture
source list. Automated event ingestion is not possible today: artmuseum.princeton.edu is
Drupal 11, its `/rss.xml` is an empty channel, and `/feed`, `/events/feed` and the Views
JSON paths all 404. Adding its events needs either a feed they do not currently publish
or an HTML scraper.
