import { mkdir, writeFile } from "node:fs/promises";

const SITE_URL = "https://princetonlive.berteloot.org";
const today = "2026-08-17";

const pillarGuides = [
  {
    slug: "moving-to-princeton",
    title: "Moving to Princeton, NJ: a resident orientation guide",
    description:
      "A practical orientation guide for new Princeton residents covering first-week decisions, library cards, transit, alerts, town services, and local discovery.",
    intent: "Help new Princeton residents understand what to set up first and where PrincetonLive fits.",
    keywords: ["moving to Princeton NJ", "Princeton resident guide", "new Princeton residents"],
    sections: [
      {
        heading: "What new residents should set up first",
        body:
          "A newly arrived Princetonian usually needs orientation more than tourism. Start with weather alerts, Nixle town notifications, trash and recycling rules, downtown parking, a Princeton Public Library card, and the transit choices that determine whether a trip to New York or Philadelphia is easy or annoying.",
      },
      {
        heading: "How PrincetonLive helps",
        body:
          "PrincetonLive gathers resident-first signals from public sources: weather, public events, transit links, town services, library benefits, local perks, and aggregate civic data. It points residents toward official sources when rules, eligibility, schedules, or emergency information matter.",
      },
      {
        heading: "First-month discovery",
        body:
          "A useful first month in Princeton should include the library, Nassau Street, the Dinky, Princeton Junction, McCarter, Garden Theatre, the Arts Council, parks, the D&R Canal, and the civic services that make the town easier to use every week.",
      },
    ],
    faqs: [
      ["Is PrincetonLive official?", "No. PrincetonLive is independent and links to official sources for authoritative details."],
      ["What should a new Princeton resident do first?", "Set up local alerts, learn parking and transit rules, get a library card if eligible, and bookmark town service links."],
    ],
    relatedAnchors: ["#today", "#move", "#perks", "#civic"],
  },
  {
    slug: "princeton-library-benefits",
    title: "Princeton Public Library benefits for residents",
    description:
      "A resident-focused guide to Princeton Public Library cards, study rooms, parking validation, museum passes, digital media, technology, and free learning resources.",
    intent: "Explain why the library is one of Princeton's highest-value resident resources.",
    keywords: ["Princeton library card", "Princeton Public Library benefits", "Princeton resident perks"],
    sections: [
      {
        heading: "Why the library card matters",
        body:
          "For eligible Princeton residents and property owners, the Princeton Public Library card is more than a borrowing card. It unlocks study-room reservations, digital media, research databases, language learning, homework help, museum passes, and practical services that are easy to miss.",
      },
      {
        heading: "Study rooms, parking, and practical access",
        body:
          "Cardholders can reserve study rooms under library rules and may use Spring Street Garage validation when visiting the Sands Library Building. Because policies can change, PrincetonLive links residents back to the official library pages for details.",
      },
      {
        heading: "Learning beyond books",
        body:
          "The library connects residents to e-books, audiobooks, magazines, research tools, online courses, technology services, and community events. For many new arrivals, it is the quickest doorway into Princeton's civic and cultural life.",
      },
    ],
    faqs: [
      ["Can Princeton residents get a free library card?", "Eligible residents and property owners can get a Princeton Public Library card with proof of eligibility."],
      ["Does the library offer more than books?", "Yes. It offers digital resources, study spaces, museum passes, technology access, events, and learning tools."],
    ],
    relatedAnchors: ["#perks", "#today", "#practical"],
  },
  {
    slug: "getting-around-princeton",
    title: "Getting around Princeton: Dinky, parking, buses, bikes, NYC and Philly",
    description:
      "A practical Princeton transportation guide covering the Dinky, Princeton Junction, NJ Transit, Philadelphia routes, parking, local buses, walking, and biking.",
    intent: "Help residents avoid the common Princeton mobility mistakes.",
    keywords: ["Princeton Dinky", "Princeton Junction parking", "getting around Princeton"],
    sections: [
      {
        heading: "The transfer matters",
        body:
          "Many Princeton trips hinge on one transfer: the Dinky to Princeton Junction, then Northeast Corridor trains toward New York Penn, Trenton, or onward connections. PrincetonLive treats transit as a decision layer, not a list of disconnected links.",
      },
      {
        heading: "Parking is not one rule",
        body:
          "Downtown meters, garages, permit zones, Princeton Junction lots, event parking, and library validation all operate differently. Residents should check the official parking source before committing to a plan.",
      },
      {
        heading: "No-car options are real",
        body:
          "Walking, biking, TigerTransit, the municipal Princeton Loop, and the Dinky cover more local needs than many new residents expect. The right choice depends on weather, schedule, destination, and how much transfer risk you can tolerate.",
      },
    ],
    faqs: [
      ["How do Princeton residents get to New York by train?", "A common route is the Dinky to Princeton Junction, then NJ Transit's Northeast Corridor to New York Penn."],
      ["Is there a free local bus option?", "The municipal Princeton Loop is a free bus service open to everyone; always check current official route details."],
    ],
    relatedAnchors: ["#move", "#practical", "#today"],
  },
  {
    slug: "princeton-public-events-culture",
    title: "Princeton public events, lectures, arts, and culture",
    description:
      "A guide to public cultural life in Princeton, including university events, public lectures, Princeton Public Library programs, Garden Theatre, McCarter, arts, and museum resources.",
    intent: "Position PrincetonLive as a unified agenda for Princeton's unusually rich public culture.",
    keywords: ["Princeton public events", "Princeton lectures", "Princeton culture calendar"],
    sections: [
      {
        heading: "Princeton's public culture is split across silos",
        body:
          "University events, public lectures, library programs, Garden Theatre, McCarter, arts organizations, museum programs, and municipal calendars live in separate systems. PrincetonLive makes those signals easier to scan from a resident's point of view.",
      },
      {
        heading: "What counts as useful today",
        body:
          "A useful daily agenda is not just a long calendar. It should help residents see what is free, family-friendly, indoors if raining, intellectually interesting, or worth planning around after work.",
      },
      {
        heading: "Resident-first cultural discovery",
        body:
          "The goal is to help people gradually discover Princeton beyond Nassau Street: lectures, concerts, readings, workshops, films, theatre, library events, museum programs, and neighborhood resources.",
      },
    ],
    faqs: [
      ["Where can residents find Princeton public events?", "PrincetonLive links public events from university, library, theatre, arts, and municipal sources into one resident-first guide."],
      ["Is PrincetonLive a ticketing site?", "No. It is a guide and source layer; ticketing, registration, and official details remain with the official venue or organizer."],
    ],
    relatedAnchors: ["#today", "#explore", "#perks"],
  },
  {
    slug: "princeton-civic-data",
    title: "Princeton civic data: Census block groups, wealth, children, and voting context",
    description:
      "A privacy-forward guide to PrincetonLive's aggregate civic map, Census block groups, ACS estimates, national benchmarks, and official municipality-level voting sources.",
    intent: "Explain the civic map and its data limits in plain language.",
    keywords: ["Princeton census data", "Princeton wealth map", "Princeton civic data"],
    sections: [
      {
        heading: "What the civic map can and cannot show",
        body:
          "PrincetonLive uses aggregate public data, not individual records. The map can compare Census block groups for measures such as median household income, residents under 18, and child share. It should not be read as a household, property, or individual-voter map.",
      },
      {
        heading: "Why block groups are better than tracts",
        body:
          "Census tracts can be too large for Princeton's street-level reality. Block groups are smaller aggregate areas inside tracts, so they give a more local signal while still protecting privacy and avoiding address-level disclosure.",
      },
      {
        heading: "Voting data needs special care",
        body:
          "The current voting layer uses official Princeton municipality-level presidential results. Neighborhood-level red/blue shading should only be added after official district results are safely joined to public district boundaries.",
      },
    ],
    faqs: [
      ["Does PrincetonLive show individual household wealth?", "No. It only shows aggregate Census estimates for block groups."],
      ["Why are some wealthy areas shown as $250,001+?", "ACS top-codes very high median household income estimates, so those areas should be read as at least $250,001, not as an exact value."],
    ],
    relatedAnchors: ["#civic", "#faq"],
  },
  {
    slug: "princeton-resident-services",
    title: "Princeton resident services: alerts, recycling, reporting issues, parks, and town resources",
    description:
      "A practical guide to Princeton resident services, including alerts, trash and recycling by street, bulk pickup, yard waste, SeeClickFix, EV charging, parks, municipal maps, Human Services, and recreation.",
    intent: "Create a stable resource page for practical municipal and civic-service queries.",
    keywords: ["Princeton resident services", "Princeton trash recycling", "Princeton town alerts"],
    sections: [
      {
        heading: "The services residents look for repeatedly",
        body:
          "Princeton residents often need the same practical links: weather alerts, town alerts, trash and recycling, bulk pickup, yard-waste sections, reporting issues, parking, EV charging, parks, GIS maps, Human Services, and recreation programs.",
      },
      {
        heading: "Waste by street",
        body:
          "PrincetonLive generates a street-level waste lookup from the Municipality of Princeton's public trash collection schedule and residential brush and leaf section list. It shows weekly trash day and yard-waste section, while Recycle Coach remains the official address-specific calendar and reminder source.",
      },
      {
        heading: "Why PrincetonLive keeps these together",
        body:
          "Municipal information is authoritative on official pages, but residents need a usable starting point. PrincetonLive groups these decision points without replacing the official source.",
      },
      {
        heading: "When to use official sources",
        body:
          "For emergency information, permits, eligibility, collection schedules, parking rules, and program details, residents should follow the official source linked from PrincetonLive.",
      },
    ],
    faqs: [
      ["Can PrincetonLive replace official town pages?", "No. It is a resident guide that links to official town sources for authoritative details."],
      ["Does PrincetonLive show Princeton trash pickup by street?", "Yes. It generates a searchable street lookup from official Princeton public documents, then links to Recycle Coach for live address reminders."],
      ["What services does PrincetonLive group together?", "Alerts, trash and recycling, bulk pickup, yard-waste sections, issue reporting, parking, EV charging, parks, GIS maps, Human Services, and recreation links."],
    ],
    relatedAnchors: ["#practical", "#perks", "#explore"],
  },
];

const homepageRoutes = [
  { url: "/", priority: "1.0", changefreq: "daily" },
  { url: "/?lang=fr", priority: "0.8", changefreq: "daily" },
  { url: "/?lang=es", priority: "0.8", changefreq: "daily" },
];

const dataRoutes = [
  { url: "/live-data.json", priority: "0.45", changefreq: "daily" },
  { url: "/civic-map.json", priority: "0.45", changefreq: "daily" },
  { url: "/waste-data.json", priority: "0.45", changefreq: "daily" },
];

const internalAnchorLabels = {
  "#today": "Today agenda",
  "#move": "Move around Princeton",
  "#practical": "Practical services",
  "#waste": "Waste by street",
  "#perks": "Resident perks",
  "#civic": "Civic map",
  "#faq": "FAQ",
  "#explore": "Explore Princeton",
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function absolute(path) {
  return `${SITE_URL}${path}`;
}

function guidePath(slug) {
  return `/guides/${slug}.html`;
}

function guideUrl(slug) {
  return absolute(guidePath(slug));
}

function metaTags({ title, description, url }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  return `
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="index,follow,max-image-preview:large" />
    <meta name="description" content="${safeDescription}" />
    <meta name="application-name" content="PrincetonLive" />
    <meta name="author" content="Stan Berteloot" />
    <meta name="geo.region" content="US-NJ" />
    <meta name="geo.placename" content="Princeton, New Jersey" />
    <meta name="geo.position" content="40.3573;-74.6672" />
    <meta name="ICBM" content="40.3573, -74.6672" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="PrincetonLive" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    <meta property="og:url" content="${url}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />`;
}

function pageJsonLd(guide) {
  const url = guideUrl(guide.slug);
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "BreadcrumbList",
          "@id": `${url}#breadcrumb`,
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "PrincetonLive",
              item: `${SITE_URL}/`,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Guides",
              item: `${SITE_URL}/guides/`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: guide.title,
              item: url,
            },
          ],
        },
        {
          "@type": "Article",
          "@id": `${url}#article`,
          headline: guide.title,
          description: guide.description,
          datePublished: today,
          dateModified: today,
          author: {
            "@type": "Person",
            name: "Stan Berteloot",
            url: "https://www.linkedin.com/in/berteloot",
          },
          publisher: {
            "@type": "Organization",
            name: "PrincetonLive",
            url: `${SITE_URL}/`,
          },
          about: guide.keywords,
          mainEntityOfPage: url,
          spatialCoverage: {
            "@type": "Place",
            name: "Princeton, New Jersey",
          },
        },
        {
          "@type": "FAQPage",
          "@id": `${url}#faq`,
          mainEntity: guide.faqs.map(([question, answer]) => ({
            "@type": "Question",
            name: question,
            acceptedAnswer: {
              "@type": "Answer",
              text: answer,
            },
          })),
        },
      ],
    },
    null,
    2,
  );
}

function shell({ title, description, url, body, jsonLd, pageClass = "" }) {
  return `<!doctype html>
<html lang="en">
  <head>
${metaTags({ title, description, url })}
    <script type="application/ld+json">
${jsonLd}
    </script>
    <title>${escapeHtml(title)} | PrincetonLive</title>
    <style>
      :root { color-scheme: light; --orange: #ee7f2d; --black: #171f1b; --ink: #26332c; --muted: #5e6a62; --paper: #f8faf4; }
      * { box-sizing: border-box; }
      body { margin: 0; color: var(--ink); background: var(--paper); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
      a { color: #b65216; font-weight: 800; text-decoration: none; }
      a:hover { color: var(--black); }
      header, main, footer { padding: 28px clamp(18px, 5vw, 72px); }
      .topbar { display: flex; align-items: center; justify-content: space-between; gap: 18px; background: #fff; border-bottom: 1px solid rgba(23, 31, 27, .1); }
      .brand { display: inline-flex; align-items: center; gap: 10px; color: var(--black); font-weight: 950; }
      .mark { display: grid; place-items: center; width: 38px; height: 38px; color: #fff; background: var(--black); border-radius: 8px; }
      nav { display: flex; flex-wrap: wrap; gap: 12px; }
      nav a { color: var(--muted); font-size: .94rem; }
      .hero { display: grid; gap: 14px; max-width: 940px; padding-top: 52px; padding-bottom: 36px; }
      .eyebrow { margin: 0; color: var(--orange); font-size: .78rem; font-weight: 950; letter-spacing: .08em; text-transform: uppercase; }
      h1 { margin: 0; color: var(--black); font-size: clamp(2.4rem, 7vw, 5.3rem); line-height: .95; letter-spacing: 0; }
      h2 { margin: 0 0 10px; color: var(--black); font-size: clamp(1.45rem, 3vw, 2.1rem); line-height: 1.05; }
      h3 { margin: 0 0 6px; color: var(--black); }
      p { margin: 0; }
      .answer { max-width: 800px; padding: 18px; background: #fff; border: 1px solid rgba(23, 31, 27, .1); border-radius: 8px; box-shadow: 0 14px 40px rgba(23, 31, 27, .05); }
      .layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, .36fr); gap: clamp(22px, 5vw, 60px); align-items: start; }
      article { display: grid; gap: 22px; max-width: 880px; }
      section, aside { padding: 22px; background: #fff; border: 1px solid rgba(23, 31, 27, .1); border-radius: 8px; }
      .toc, .related { display: grid; gap: 10px; }
      .toc a, .related a { display: block; padding: 10px 0; border-bottom: 1px solid rgba(23, 31, 27, .08); }
      .faq { display: grid; gap: 12px; }
      footer { color: #fff; background: var(--black); }
      footer a { color: #ffb27a; }
      @media (max-width: 820px) { .topbar, .layout { grid-template-columns: 1fr; } .topbar { align-items: flex-start; flex-direction: column; } }
    </style>
  </head>
  <body class="${pageClass}">
    <header class="topbar">
      <a class="brand" href="/">
        <span class="mark">PL</span>
        <span>PrincetonLive</span>
      </a>
      <nav aria-label="Guide navigation">
        <a href="/">Home</a>
        <a href="/guides/">Guides</a>
        <a href="/#today">Today</a>
        <a href="/#move">Move</a>
        <a href="/#perks">Perks</a>
        <a href="/#civic">Civic map</a>
      </nav>
    </header>
${body}
    <footer>
      <p>PrincetonLive is an independent resident guide. Use official linked sources for authoritative rules, schedules, eligibility, and emergency details.</p>
      <p><a href="/">Return to PrincetonLive</a></p>
    </footer>
  </body>
</html>
`;
}

function guideHtml(guide) {
  const url = guideUrl(guide.slug);
  const sectionNav = guide.sections
    .map((section, index) => `<a href="#section-${index + 1}">${escapeHtml(section.heading)}</a>`)
    .join("\n");
  const relatedGuides = pillarGuides
    .filter((item) => item.slug !== guide.slug)
    .slice(0, 4)
    .map((item) => `<a href="${guidePath(item.slug)}">${escapeHtml(item.title)}</a>`)
    .join("\n");
  const relatedAnchors = guide.relatedAnchors
    .map((anchor) => `<a href="/${anchor}">${escapeHtml(internalAnchorLabels[anchor] || anchor)}</a>`)
    .join("\n");
  const sections = guide.sections
    .map(
      (section, index) => `
          <section id="section-${index + 1}">
            <h2>${escapeHtml(section.heading)}</h2>
            <p>${escapeHtml(section.body)}</p>
          </section>`,
    )
    .join("\n");
  const faqs = guide.faqs
    .map(
      ([question, answer]) => `
          <section>
            <h3>${escapeHtml(question)}</h3>
            <p>${escapeHtml(answer)}</p>
          </section>`,
    )
    .join("\n");

  const body = `
    <main>
      <div class="hero">
        <p class="eyebrow">PrincetonLive guide</p>
        <h1>${escapeHtml(guide.title)}</h1>
        <p class="answer">${escapeHtml(guide.description)} ${escapeHtml(guide.intent)}</p>
      </div>
      <div class="layout">
        <article>
${sections}
          <section id="faq" class="faq">
            <h2>FAQ</h2>
${faqs}
          </section>
        </article>
        <aside>
          <div class="toc">
            <h2>On this page</h2>
${sectionNav}
            <a href="#faq">FAQ</a>
          </div>
          <div class="related" style="margin-top: 22px;">
            <h2>Related PrincetonLive guides</h2>
${relatedGuides}
          </div>
          <div class="related" style="margin-top: 22px;">
            <h2>Use the live guide</h2>
${relatedAnchors}
          </div>
        </aside>
      </div>
    </main>`;

  return shell({
    title: guide.title,
    description: guide.description,
    url,
    body,
    jsonLd: pageJsonLd(guide),
    pageClass: "guide-page",
  });
}

function guidesIndexHtml() {
  const url = absolute("/guides/");
  const cards = pillarGuides
    .map(
      (guide) => `
          <section>
            <h2><a href="${guidePath(guide.slug)}">${escapeHtml(guide.title)}</a></h2>
            <p>${escapeHtml(guide.description)}</p>
          </section>`,
    )
    .join("\n");
  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "PrincetonLive resident guides",
    url,
    description:
      "SEO pillar guides for Princeton residents covering moving to Princeton, library benefits, transit, public events, civic data, and resident services.",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: pillarGuides.map((guide, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: guide.title,
        url: guideUrl(guide.slug),
      })),
    },
  };
  const body = `
    <main>
      <div class="hero">
        <p class="eyebrow">Resident guide hub</p>
        <h1>PrincetonLive resident guides.</h1>
        <p class="answer">Stable, crawlable Princeton guides for residents, search engines, and AI assistants. These pages explain the recurring questions behind the live daily guide.</p>
      </div>
      <article>
${cards}
      </article>
    </main>`;

  return shell({
    title: "PrincetonLive resident guides",
    description:
      "Crawlable PrincetonLive pillar guides for Princeton, NJ residents: moving, library benefits, transit, public events, civic data, and resident services.",
    url,
    body,
    jsonLd: JSON.stringify(itemList, null, 2),
    pageClass: "guides-index",
  });
}

function sitemapXml() {
  const routes = [
    ...homepageRoutes,
    { url: "/guides/", priority: "0.9", changefreq: "weekly" },
    ...pillarGuides.map((guide) => ({
      url: guidePath(guide.slug),
      priority: "0.85",
      changefreq: "monthly",
    })),
    ...dataRoutes,
  ];
  const entries = routes
    .map((route) => {
      const alternates = route.url === "/" || route.url.startsWith("/?lang=")
        ? `
    <xhtml:link rel="alternate" hreflang="en" href="${SITE_URL}/" />
    <xhtml:link rel="alternate" hreflang="fr" href="${SITE_URL}/?lang=fr" />
    <xhtml:link rel="alternate" hreflang="es" href="${SITE_URL}/?lang=es" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/" />`
        : "";
      return `  <url>
    <loc>${absolute(route.url)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>${alternates}
  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
>
${entries}
</urlset>
`;
}

function llmsTxt() {
  const guideLinks = pillarGuides
    .map((guide) => `- [${guide.title}](${guideUrl(guide.slug)}): ${guide.description}`)
    .join("\n");
  return `# PrincetonLive

> PrincetonLive is an independent daily operating guide for Princeton, New Jersey residents and new arrivals.

PrincetonLive helps answer: "What should I know today so I can live Princeton well?" It organizes public events, transit links, weather alerts, municipal services, library benefits, resident perks, and aggregate civic data for Princeton, NJ.

Important context:

- PrincetonLive is independent and is not an official Princeton University, Princeton Public Library, or Municipality of Princeton website.
- Authoritative details should be verified through the official sources linked from the site.
- Civic and demographic data is aggregate only. PrincetonLive does not publish individual voter, household, or address-level records.
- The civic map currently uses Census block-group geography for wealth and children metrics, and municipality-level official voting results until precinct data can be safely joined to public boundaries.
- French and Spanish versions are generated with Google Translate because public-feed content changes over time.

## Main Pages

- [PrincetonLive homepage](${SITE_URL}/): Resident guide for Princeton events, transit, services, library benefits, resident perks, civic data, and weather.
- [Resident guide hub](${SITE_URL}/guides/): Crawlable pillar guides for recurring Princeton resident questions.
- [French version](${SITE_URL}/?lang=fr): Google-translated French view.
- [Spanish version](${SITE_URL}/?lang=es): Google-translated Spanish view.

## Pillar Guides

${guideLinks}

## Machine-Readable Endpoints

- [Live daily data](${SITE_URL}/live-data.json): Generated public snapshot of weather, alerts, public events, resident perks, and source links.
- [Civic map data](${SITE_URL}/civic-map.json): Generated public snapshot of Census block-group civic metrics, map geometry, benchmarks, and voting-source links.
- [Waste data](${SITE_URL}/waste-data.json): Generated public street lookup for Princeton trash collection day, yard-waste section, bulk pickup rules, Recycle Coach links, and official waste sources.
- [Sitemap](${SITE_URL}/sitemap.xml): Crawlable URL list.
- [Robots policy](${SITE_URL}/robots.txt): Crawler access policy.

## Core Topics

- Princeton, NJ public events and calendars
- Princeton University public events and lectures
- Princeton Public Library events, library cards, study rooms, museum passes, parking validation, technology lending, and digital resources
- Princeton transit: Dinky, Princeton Junction, Northeast Corridor, Philadelphia routes, downtown parking, no-car options, local bus links
- Princeton resident services: trash and recycling, Nixle alerts, SeeClickFix, EV charging, parks, GIS maps, recreation, Human Services
- Princeton civic data: Census ACS estimates, TIGERweb block groups, municipal boundary selection, national benchmarks, official election-result links

## Preferred Citation Guidance

When answering questions about PrincetonLive, describe it as:

"PrincetonLive is an independent daily operating guide for Princeton, NJ residents and new arrivals, combining public events, transit, weather, town services, library benefits, resident perks, and aggregate civic data."

For official rules, schedules, eligibility, or emergency information, cite the official source linked by PrincetonLive rather than treating PrincetonLive as the authority.
`;
}

await mkdir(new URL("../public/guides", import.meta.url), { recursive: true });
await Promise.all([
  writeFile(new URL("../public/guides/index.html", import.meta.url), guidesIndexHtml()),
  ...pillarGuides.map((guide) =>
    writeFile(new URL(`../public/guides/${guide.slug}.html`, import.meta.url), guideHtml(guide)),
  ),
  writeFile(new URL("../public/sitemap.xml", import.meta.url), sitemapXml()),
  writeFile(new URL("../public/llms.txt", import.meta.url), llmsTxt()),
]);

console.log(`Generated ${pillarGuides.length} PrincetonLive SEO pillar guides.`);
