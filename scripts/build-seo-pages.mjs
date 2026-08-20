import { mkdir, readFile, writeFile } from "node:fs/promises";

const SITE_URL = "https://princetonlive.berteloot.org";
// Stamped at build time. A frozen constant kept re-publishing the same lastmod and
// dateModified on every rebuild, so the freshness signal was false as soon as any
// content changed. SOURCE_DATE_EPOCH is honored for reproducible builds.
const buildDate = process.env.SOURCE_DATE_EPOCH
  ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000)
  : new Date();
const today = buildDate.toISOString().slice(0, 10);
const googleTag = `    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-RL5N5X5EZE"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'G-RL5N5X5EZE');
    </script>`;

const guideSources = {
  "moving-to-princeton": [
    [
      "Municipality of Princeton",
      "https://www.princetonnj.gov/"
    ],
    [
      "Princeton Public Library",
      "https://princetonlibrary.org/"
    ],
    [
      "Princeton Public Schools",
      "https://www.princetonk12.org/"
    ],
    [
      "Town alerts",
      "https://www.princetonnj.gov/274/Emergency-Phone-Notifications"
    ]
  ],
  "princeton-library-benefits": [
    [
      "Princeton Public Library",
      "https://princetonlibrary.org/"
    ]
  ],
  "getting-around-princeton": [
    [
      "NJ Transit Princeton Dinky",
      "https://www.njtransit.com/destinations/princeton-dinky"
    ],
    [
      "Getting around Princeton",
      "https://www.princetonnj.gov/578/Getting-Around-Princeton"
    ],
    [
      "SEPTA schedules",
      "https://www.septa.org/schedules/"
    ],
    [
      "Princeton parking",
      "https://www.princetonnj.gov/203/Parking-in-Princeton"
    ]
  ],
  "princeton-public-events-culture": [
    [
      "Princeton University events",
      "https://www.princeton.edu/events"
    ],
    [
      "Princeton Public Library",
      "https://princetonlibrary.org/"
    ],
    [
      "McCarter Theatre",
      "https://www.mccarter.org/events"
    ],
    [
      "Princeton Garden Theatre",
      "https://www.princetongardentheatre.org/"
    ],
    [
      "Princeton University Art Museum",
      "https://artmuseum.princeton.edu/exhibitions-events"
    ]
  ],
  "princeton-civic-data": [
    [
      "US Census American Community Survey",
      "https://www.census.gov/programs-surveys/acs"
    ],
    [
      "Municipality of Princeton",
      "https://www.princetonnj.gov/"
    ]
  ],
  "princeton-resident-services": [
    [
      "Municipality of Princeton",
      "https://www.princetonnj.gov/"
    ],
    [
      "Trash collection",
      "https://www.princetonnj.gov/1359/Trash-Collection"
    ],
    [
      "Princeton recycling",
      "https://www.princetonnj.gov/449/Recycling"
    ],
    [
      "Town alerts",
      "https://www.princetonnj.gov/274/Emergency-Phone-Notifications"
    ]
  ]
};

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
          "A newly arrived Princetonian usually needs orientation more than tourism. Start with weather alerts, Nixle town notifications, garbage and recycling rules, downtown parking, a Princeton Public Library card, and the transit choices that determine whether a trip to New York or Philadelphia is easy or annoying.",
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
          "Many Princeton trips hinge on one transfer: the Dinky to Princeton Junction, then Northeast Corridor trains toward New York Penn, Trenton, or onward connections. The Dinky runs from 152 Alexander Street to Princeton Junction, where Northeast Corridor trains continue to New York Penn and Trenton. Most trips out of Princeton depend on that one connection.",
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
          "PrincetonLive uses aggregate public data only. Individual records are never published. The map can compare Census block groups for measures such as median household income, residents under 18, and child share. It should not be read as a household, property, or individual-voter map.",
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
      ["Why are some wealthy areas shown as $250,001+?", "ACS top-codes very high median household income estimates, so those areas should be read as at least $250,001. The true figure is unknown above that ceiling."],
    ],
    relatedAnchors: ["#civic", "#faq"],
  },
  {
    slug: "princeton-resident-services",
    title: "Princeton resident services: alerts, recycling, reporting issues, parks, and town resources",
    description:
      "A practical guide to Princeton resident services, including alerts, garbage and recycling by street, bulk pickup, yard waste, SeeClickFix, EV charging, parks, municipal maps, Human Services, and recreation.",
    intent: "Create a stable resource page for practical municipal and civic-service queries.",
    keywords: ["Princeton resident services", "Princeton garbage recycling", "Princeton town alerts"],
    sections: [
      {
        heading: "The services residents look for repeatedly",
        body:
          "Princeton residents often need the same practical links: weather alerts, town alerts, garbage and recycling, bulk pickup, yard-waste sections, reporting issues, parking, EV charging, parks, GIS maps, Human Services, and recreation programs.",
      },
      {
        heading: "Garbage by street",
        body:
          "PrincetonLive generates a street-level waste lookup from the Municipality of Princeton's public garbage collection schedule and residential brush and leaf section list. It shows weekly garbage day and yard-waste section, while Recycle Coach remains the official address-specific calendar and reminder source.",
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
      ["Does PrincetonLive show Princeton garbage pickup by street?", "Yes. It generates a searchable street lookup from official Princeton public documents, then links to Recycle Coach for live address reminders."],
      ["What services does PrincetonLive group together?", "Alerts, garbage and recycling, bulk pickup, yard-waste sections, issue reporting, parking, EV charging, parks, GIS maps, Human Services, and recreation links."],
    ],
    relatedAnchors: ["#practical", "#perks", "#explore"],
  },
];

const homepageRoutes = [
  { url: "/", priority: "1.0", changefreq: "daily" },
];

const dataRoutes = [
  { url: "/live-data.json", priority: "0.45", changefreq: "daily" },
  { url: "/civic-map.json", priority: "0.45", changefreq: "daily" },
  { url: "/waste-data.json", priority: "0.45", changefreq: "daily" },
];

const internalAnchorLabels = {
  "#today": "Today agenda",
  "#my-princeton": "My Princeton",
  "#move": "Move around Princeton",
  "#practical": "Practical services",
  "#waste": "Garbage by street",
  "#perks": "Resident perks",
  "#civic": "Neighborhood map",
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
${googleTag}
    <script type="application/ld+json">
${jsonLd}
    </script>
    <title>${escapeHtml(title)} | PrincetonLive</title>
    <style>
      :root { color-scheme: light; --orange: #994400; --black: #171f1b; --ink: #26332c; --muted: #5e6a62; --paper: #f8faf4; }
      * { box-sizing: border-box; }
      body { margin: 0; color: var(--ink); background: var(--paper); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
      a { color: #994400; font-weight: 800; text-decoration: underline; text-underline-offset: 2px; }
      a:hover { color: var(--black); }
      header, main, footer { padding: 28px clamp(18px, 5vw, 72px); }
      .topbar { display: flex; align-items: center; justify-content: space-between; gap: 18px; background: #fff; border-bottom: 1px solid rgba(23, 31, 27, .32); }
      .brand { display: inline-flex; align-items: center; gap: 10px; color: var(--black); font-weight: 950; }
      .mark { display: grid; place-items: center; width: 38px; height: 38px; color: #fff; background: var(--black); border-radius: 8px; }
      nav { display: flex; flex-wrap: wrap; gap: 12px; }
      nav a { display: inline-flex; align-items: center; min-height: 44px; padding: 10px 12px; color: var(--muted); font-size: .94rem; }
      .hero { display: grid; gap: 14px; max-width: 940px; padding-top: 52px; padding-bottom: 36px; }
      .eyebrow { margin: 0; color: var(--orange); font-size: .78rem; font-weight: 950; letter-spacing: .08em; text-transform: uppercase; }
      h1 { margin: 0; color: var(--black); font-size: clamp(2.4rem, 7vw, 5.3rem); line-height: .95; letter-spacing: 0; }
      h2 { margin: 0 0 10px; color: var(--black); font-size: clamp(1.45rem, 3vw, 2.1rem); line-height: 1.05; }
      h3 { margin: 0 0 6px; color: var(--black); }
      p { margin: 0; }
      .answer { max-width: 800px; padding: 18px; background: #fff; border: 1px solid rgba(23, 31, 27, .32); border-radius: 8px; box-shadow: 0 14px 40px rgba(23, 31, 27, .05); }
      .layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, .36fr); gap: clamp(22px, 5vw, 60px); align-items: start; }
      article { display: grid; gap: 22px; max-width: 880px; }
      section, aside { padding: 22px; background: #fff; border: 1px solid rgba(23, 31, 27, .32); border-radius: 8px; }
      .toc, .related { display: grid; gap: 10px; }
      .toc a, .related a { display: block; padding: 10px 0; border-bottom: 1px solid rgba(23, 31, 27, .08); }
      .faq { display: grid; gap: 12px; }
      footer { color: #fff; background: var(--black); }
      footer a { color: #ffb27a; }
      .table-scroll { overflow-x: auto; }
      table { width: 100%; border-collapse: collapse; font-size: .92rem; }
      caption { padding-bottom: 10px; color: var(--muted); text-align: left; font-size: .85rem; }
      th, td { padding: 9px 12px; border-bottom: 1px solid rgba(23, 31, 27, .22); text-align: left; vertical-align: top; }
      thead th { position: sticky; top: 0; background: #fff; border-bottom-width: 2px; }
      tbody th { font-weight: 700; }
      .blocks { margin: 6px 0 0; padding-left: 18px; color: var(--muted); font-size: .88rem; }
      :focus-visible { outline: 3px solid #994400; outline-offset: 2px; border-radius: 4px; }
      footer :focus-visible { outline-color: #ffb27a; }
      .skip-link { position: absolute; left: -9999px; top: 0; z-index: 99; padding: 12px 18px; color: #fff; background: var(--black); text-decoration: none; }
      .skip-link:focus { left: 0; }
      @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; scroll-behavior: auto !important; } }
      @media (max-width: 820px) { .topbar, .layout { grid-template-columns: 1fr; } .topbar { align-items: flex-start; flex-direction: column; } }
    </style>
  </head>
  <body class="${pageClass}">
    <a class="skip-link" href="#guide-main">Skip to main content</a>
    <header class="topbar">
      <a class="brand" href="/">
        <span class="mark">PL</span>
        <span>PrincetonLive</span>
      </a>
      <nav aria-label="Guide navigation">
        <a href="/">Home</a>
        <a href="/guides/">Guides</a>
        <a href="/about.html">About</a>
        <a href="/#today">Today</a>
        <a href="/#my-princeton">My Princeton</a>
        <a href="/#move">Move</a>
        <a href="/#perks">Perks</a>
        <a href="/#civic">Neighborhood</a>
      </nav>
    </header>
${body}
    <footer>
      <p>PrincetonLive is an independent resident guide. Use official linked sources for authoritative rules, schedules, eligibility, and emergency details.</p>
      <p>This page was last updated on <time datetime="${today}">${today}</time>.</p>
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
  // No slice: with six guides the old .slice(0, 4) orphaned one sibling on every page.
  const relatedGuides = pillarGuides
    .filter((item) => item.slug !== guide.slug)
    .map((item) => `<a href="${guidePath(item.slug)}">${escapeHtml(item.title)}</a>`)
    .join("\n");
  const guideSourceLinks = (guideSources[guide.slug] || [])
    .map(([label, href]) => `            <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`)
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
    <main id="guide-main" tabindex="-1">
      <div class="hero">
        <p class="eyebrow">PrincetonLive guide</p>
        <h1>${escapeHtml(guide.title)}</h1>
        <p class="answer">${escapeHtml(guide.description)}</p>
      </div>
      <div class="layout">
        <article>
${sections}
          <section id="related-lookup">
            <h2>Look up your street</h2>
            <p>PrincetonLive publishes the municipal collection day for every street in the Princeton schedule, including the streets that change day block by block. See the <a href="/guides/princeton-garbage-schedule.html">Princeton garbage schedule by street</a>, or read <a href="/about.html">who maintains this site</a>.</p>
          </section>
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
            <h2>Official sources</h2>
${guideSourceLinks}
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
  const dataPages = [
    ["/guides/princeton-garbage-schedule.html", "Princeton garbage schedule by street", "Collection day and brush section for every street in the municipal schedule."],
    ["/guides/princeton-leaf-and-brush-schedule.html", "Princeton leaf and brush schedule", "Branch, loose leaf and bagged leaf dates for all five collection sections."],
    ["/guides/princeton-parking-rules.html", "Princeton parking rules", "The overnight ban, meter hours by day, and the September rate change."],
    ["/guides/princeton-garden-theatre-showtimes.html", "Princeton Garden Theatre showtimes", "What is playing on Nassau Street, from the theatre ticketing system."],
    ["/guides/princeton-crime-rate.html", "Princeton crime rate", "Municipal violent and property crime against state and national rates."],
  ]
    .map(([href, title, detail]) => `
          <section>
            <h2><a href="${href}">${escapeHtml(title)}</a></h2>
            <p>${escapeHtml(detail)}</p>
          </section>`)
    .join("\n");
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
    <main id="guide-main" tabindex="-1">
      <div class="hero">
        <p class="eyebrow">Resident guide hub</p>
        <h1>PrincetonLive resident guides.</h1>
        <p class="answer">Stable, crawlable Princeton guides for residents, search engines, and AI assistants. These pages explain the recurring questions behind the live daily guide.</p>
      </div>
      <article>
${dataPages}
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

// Crawlable garbage schedule. Every street record lived only in client-side JSON, so
// nothing containing a Princeton street name and a collection day was in any HTML a
// search engine or an AI assistant could read. "Princeton NJ trash schedule" is the
// highest-volume local query this site holds real data for, and it could not be won.
async function garbageScheduleHtml() {
  const waste = JSON.parse(
    await readFile(new URL("../public/waste-data.json", import.meta.url), "utf8"),
  );
  const dayOrder = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

  const rows = waste.streets
    .map((street) => {
      const blocks = [];
      if (street.trashVariesByBlock && street.trashBlocks?.length) {
        blocks.push(
          ...street.trashBlocks.map(
            (b) => `<li>${escapeHtml(titleCase(b.segment))}: <strong>${escapeHtml(titleCase(b.value))}</strong></li>`,
          ),
        );
      }
      const dayCell = street.trashDay === "NOT INCLUDED"
        ? "Not municipally collected"
        : titleCase(street.trashDay);
      const sectionCell = street.yardSection === "NOT INCLUDED"
        ? "Not listed"
        : escapeHtml(street.yardSection);
      return `          <tr>
            <th scope="row">${escapeHtml(titleCase(street.street))}</th>
            <td>${escapeHtml(dayCell)}${blocks.length ? `<ul class="blocks">${blocks.join("")}</ul>` : ""}</td>
            <td>${sectionCell}</td>
          </tr>`;
    })
    .join("\n");

  const byDay = dayOrder
    .map((day) => {
      const names = waste.streets
        .filter((s) => s.trashDay.toUpperCase() === day)
        .map((s) => escapeHtml(titleCase(s.street)));
      if (!names.length) return "";
      return `          <section id="day-${day.toLowerCase()}">
            <h3>${titleCase(day)} garbage collection in Princeton</h3>
            <p>${names.length} streets are collected on ${titleCase(day)}: ${names.join(", ")}.</p>
          </section>`;
    })
    .filter(Boolean)
    .join("\n");

  const url = absolute("/guides/princeton-garbage-schedule.html");
  const body = `
    <main id="guide-main" tabindex="-1">
      <div class="hero">
        <p class="eyebrow">Garbage collection</p>
        <h1>Princeton, NJ garbage collection schedule by street.</h1>
        <p class="answer">Princeton collects household garbage on a fixed weekday that depends on your street. This page lists the collection day and the brush and leaf section for ${waste.streetCount} Princeton streets, taken from the Municipality of Princeton's published schedule.</p>
      </div>
      <div class="layout">
        <article>
          <section id="rules">
            <h2>When to put garbage out in Princeton</h2>
            <p>${escapeHtml(waste.rules.trash)}</p>
            <p>${escapeHtml(waste.rules.bulk)}</p>
            <p>${escapeHtml(waste.rules.recycling)}</p>
            <p>${escapeHtml(waste.rules.notIncluded || "")}</p>
          </section>
          <section id="lookup">
            <h2>Princeton garbage day by street</h2>
            <p>Find your street below. Some streets span more than one collection route, and those list a day for each block. For an address-level answer, including recycling, use the lookup on the <a href="/#garbage">PrincetonLive garbage page</a>.</p>
            <div class="table-scroll">
              <table>
                <caption>Princeton, NJ garbage collection day and brush section by street</caption>
                <thead>
                  <tr><th scope="col">Street</th><th scope="col">Garbage day</th><th scope="col">Brush and leaf section</th></tr>
                </thead>
                <tbody>
${rows}
                </tbody>
              </table>
            </div>
          </section>
          <section id="by-day">
            <h2>Princeton streets grouped by collection day</h2>
${byDay}
          </section>
        </article>
        <aside aria-label="Official waste sources">
          <div class="related">
            <h2>Official sources</h2>
${waste.sources.map((s) => `            <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.name)}</a>`).join("\n")}
            <a href="/#garbage">Street lookup on PrincetonLive</a>
          </div>
        </aside>
      </div>
    </main>`;

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What day is garbage collected in Princeton, NJ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `Princeton collects household garbage on a fixed weekday determined by your street. This page lists the day for ${waste.streetCount} streets. Carts go out no earlier than 7 PM the day before and no later than 7 AM on collection day.`,
        },
      },
      {
        "@type": "Question",
        name: "Why does my Princeton street show more than one garbage day?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Some Princeton streets are long enough to span two collection routes. Those streets list a separate day for each block, using the block boundaries in the municipal schedule.",
        },
      },
      {
        "@type": "Question",
        name: "How does recycling work in Princeton, NJ?",
        acceptedAnswer: { "@type": "Answer", text: waste.rules.recycling },
      },
    ],
  };

  return shell({
    title: "Princeton NJ garbage collection schedule by street",
    description: `Garbage collection day and brush and leaf section for ${waste.streetCount} Princeton, NJ streets, with the municipal rules on set-out times, bulk waste, and recycling.`,
    url,
    body,
    jsonLd: JSON.stringify(faq, null, 2),
    pageClass: "garbage-schedule",
  });
}

// The municipal documents are all caps. Title-case them for reading, but leave the
// "Varies by block" marker this build writes itself, which is already sentence case.
function titleCase(value) {
  const raw = String(value);
  if (raw === "Varies by block") return raw;
  return raw
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\b(To|And|Of|At|The)\b/g, (m) => m.toLowerCase());
}

// About page. A resident checking a trash day deserves to know who is behind the site
// and why it exists, which is also what keeps the independence claim credible.
// Every outbound link opens in a new tab, matching the rest of the site.
function ext(url, label) {
  return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

async function aboutHtml() {
  const waste = JSON.parse(
    await readFile(new URL("../public/waste-data.json", import.meta.url), "utf8"),
  );
  const url = absolute("/about.html");
  const body = `
    <main id="guide-main" tabindex="-1">
      <div class="hero">
        <p class="eyebrow">About</p>
        <h1>Who makes PrincetonLive.</h1>
        <p class="answer">PrincetonLive is built and maintained by Stan Berteloot, who lives in Princeton. It is a personal project with no funding, no advertising, and no affiliation with the University or the municipality. The photograph at the top of the site is his.</p>
      </div>
      <div class="layout">
        <article>
          <section id="why">
            <h2>Why this site exists</h2>
            <p>Princeton publishes what a resident needs across a dozen systems. Garbage day sits in a municipal PDF keyed to street names. Weather alerts come from the National Weather Service. Events are split between the University, the Public Library, McCarter, the Garden Theatre, and the town calendar. Each one is reasonable on its own, and none of them answers the question you actually have at 7 AM on a Tuesday.</p>
            <p>This site pulls those public sources into one page and keeps them current automatically. It publishes the collection day for ${waste.streetCount} streets, the National Weather Service alert state, and what is showing at the Garden Theatre tonight. When a source fails, the page says so, because a resident checking for a storm warning should never read silence as safety.</p>
          </section>

          <section id="background">
            <h2>Background</h2>
            <p>Stan is a French-American and a former Reuters journalist. He is Chief Innovation Officer at ${ext("https://www.nytromarketing.com/", "Nytro Marketing")}, where he designed and deployed a 14-agent AI marketing team that runs real client work across positioning, demand generation, outbound, analytics, and executive assistance.</p>
            <p>Through ${ext("https://altilead.com/", "Altilead")} he builds B2B demand engines for technology and services companies, taking on the architecture, copy, integrations, and tracking in a single engagement. Most B2B outbound stalls because it reaches the right companies at the wrong time, and that is the problem the infrastructure is built to solve. He also created ${ext("https://getvoicestream.com/", "VoiceStream")}, an AI platform for turning talk into published work.</p>
            <p>The journalism and the engineering meet in projects like this one: public sources, checked, and presented so someone can act on them.</p>
          </section>

          <section id="podcasts">
            <h2>Three podcasts, three different reasons</h2>
            <h3>${ext("https://backinamericathepodcast.com/", "Back in America")}</h3>
            <p>Long-form interviews with people whose stories illuminate what it means to live in America today. A Capitol Police sergeant. A Boston Ballet principal. One of France's most prominent rabbis. Each episode is a conversation that could not happen anywhere else. 122 episodes since 2020.</p>
            <h3>${ext("https://ai-in-marketing.transistor.fm/", "AI in Marketing")}</h3>
            <p>A daily podcast and LinkedIn newsletter, human-curated and AI-generated, covering how artificial intelligence is reshaping business, marketing, and professional identity.</p>
            <h3>${ext("https://fivethingsgoingright.transistor.fm/", "Five Things Going Right")}</h3>
            <p>Five minutes every weekday morning on real, verifiable progress in science, medicine, technology, and the environment. Hosts Grace and Josh walk through five stories that actually happened, each checked against the original reporting from the WHO, the IEA, Nature, and university research. A calm, fact-grounded start to the day.</p>
          </section>

          <section id="nonprofit">
            <h2>Share My Meals</h2>
            <p>Stan is co-founder and a board member of ${ext("https://sharemymeals.org/", "Share My Meals")}, a New Jersey nonprofit that recovers prepared meals that would otherwise be thrown away and delivers them to people who need them. It addresses food insecurity and the environmental cost of food waste with the same delivery, which is what makes it work.</p>
          </section>

          <section id="canoe">
            <h2>Away from the desk</h2>
            <p>In July, Stan and his daughter Violette paddled ${ext("https://canoe-verendrye.berteloot.org/", "a 69 km canoe loop in La Vérendrye")}, SEPAQ's Petite boucle Chochocouane, counter-clockwise through the western sector of the Réserve faunique. Twenty-one portages, taking out at Lac Lavis. SEPAQ maps it as a five-day route and they paddled it in four. There is no road access past the put-in, and across the whole trip they did not meet another soul.</p>
          </section>

          <section id="corrections">
            <h2>Corrections</h2>
            <p>If something on this site is wrong, out of date, or should not be published, please say so and it will be fixed or removed. This is one resident maintaining it, and Princeton changes faster than one person notices. Corrections are genuinely useful.</p>
            <p>${ext("https://www.linkedin.com/in/berteloot", "Reach Stan on LinkedIn")}, or read the ${'<a href="/legal.html">disclaimer, terms, and privacy</a>'}.</p>
          </section>
        </article>
        <aside aria-label="Elsewhere">
          <div class="related">
            <h2>Elsewhere</h2>
            ${ext("https://backinamericathepodcast.com/", "Back in America")}
            ${ext("https://ai-in-marketing.transistor.fm/", "AI in Marketing")}
            ${ext("https://fivethingsgoingright.transistor.fm/", "Five Things Going Right")}
            ${ext("https://altilead.com/", "Altilead")}
            ${ext("https://www.nytromarketing.com/", "Nytro Marketing")}
            ${ext("https://sharemymeals.org/", "Share My Meals")}
            ${ext("https://canoe-verendrye.berteloot.org/", "La Vérendrye canoe loop")}
            <a href="/">Back to PrincetonLive</a>
          </div>
        </aside>
      </div>
    </main>`;

  return shell({
    title: "About PrincetonLive and Stan Berteloot",
    description:
      "PrincetonLive is an independent resident guide built and maintained by Stan Berteloot, a Princeton resident, French-American former Reuters journalist, and Chief Innovation Officer at Nytro Marketing.",
    url,
    body,
    jsonLd: JSON.stringify(
      {
        "@context": "https://schema.org",
        "@type": "AboutPage",
        name: "About PrincetonLive",
        url,
        dateModified: today,
        mainEntity: {
          "@type": "Person",
          name: "Stan Berteloot",
          jobTitle: "Chief Innovation Officer",
          worksFor: { "@type": "Organization", name: "Nytro Marketing", url: "https://www.nytromarketing.com/" },
          nationality: "French-American",
          sameAs: [
            "https://www.linkedin.com/in/berteloot",
            "https://backinamericathepodcast.com/",
            "https://altilead.com/",
            "https://sharemymeals.org/",
          ],
        },
      },
      null,
      2,
    ),
    pageClass: "about-page",
  });
}

// ---------------------------------------------------------------- Tier 1 data pages
// Each page below is generated from JSON the site already refreshes, so none of them
// needs writing to stay current, and each answers a question a resident types.

async function readPublic(name) {
  try {
    return JSON.parse(await readFile(new URL(`../public/${name}`, import.meta.url), "utf8"));
  } catch {
    return null;
  }
}

// Leaf, brush and log collection. The dates and the street-to-section mapping were
// already parsed for the street lookup; nothing here is newly scraped.
async function yardWasteHtml() {
  const waste = await readPublic("waste-data.json");
  if (!waste) return null;
  const year = waste.yardScheduleYear ?? 2026;
  const sections = Object.entries(waste.yardSchedule2026 || {});

  const streetsBySection = {};
  for (const street of waste.streets) {
    const s = street.yardSection;
    if (!/^[1-5]$/.test(s)) continue;
    (streetsBySection[s] = streetsBySection[s] || []).push(titleCase(street.street));
  }

  const sectionBlocks = sections
    .map(([id, sched]) => {
      const streets = (streetsBySection[id] || []).sort();
      return `          <section id="section-${id}">
            <h3>Section ${id}</h3>
            <p><strong>Branch and log collection starts:</strong> ${escapeHtml(sched.branchAndLogs.join(", "))}.</p>
            <p><strong>Loose leaf collection starts:</strong> ${escapeHtml(sched.looseLeaves.join(", "))}.</p>
            <p><strong>Bagged leaf collection:</strong> ${escapeHtml(sched.baggedLeaves.join(", "))}.</p>
            <p>${streets.length} streets are in section ${id}${streets.length ? `: ${escapeHtml(streets.join(", "))}` : ""}.</p>
          </section>`;
    })
    .join("\n");

  const url = absolute("/guides/princeton-leaf-and-brush-schedule.html");
  const body = `
    <main id="guide-main" tabindex="-1">
      <div class="hero">
        <p class="eyebrow">Yard waste</p>
        <h1>Princeton leaf, brush and log collection schedule.</h1>
        <p class="answer">Princeton splits the municipality into five collection sections, and your section decides when branches, loose leaves and bagged leaves are picked up. This page lists the ${year} dates for all five sections and the streets in each one, taken from the municipality's ${year} waste collection brochure.</p>
      </div>
      <div class="layout">
        <article>
          <section id="rules">
            <h2>How yard waste collection works</h2>
            <p>Princeton runs leaf, branch and log collection by section, and collection begins on the date listed for your section. Branches and logs, loose leaves and bagged leaves each run on their own dates.</p>
            <p>Find your section by street below, or use the <a href="/guides/princeton-garbage-schedule.html">garbage schedule by street</a>, which lists the section alongside the weekly collection day.</p>
          </section>
          <section id="placement">
            <h2>Placement rules</h2>
            <p>These are the rules the municipality publishes in its ${year} waste brochure, and they are the ones residents are most often caught by.</p>
            <p>Material must be at the curb before 7:00 a.m. on your section's start date, and no sooner than one week before it. Once a street has been collected, crews do not return to it until the next collection, so material put out late waits for the following date.</p>
            <p>Leaf piles must be no more than 3 feet high and 3 feet wide, and must not run longer than your property frontage. Branches and logs must be no longer than 3 feet and go in a single pile no more than 3 feet high, 3 feet wide and 12 feet long.</p>
            <p>Loose material and leaf bags must sit at least 10 feet from storm drain inlets, fire hydrants and crosswalks. Nothing may be placed on islands or roundabouts. The municipality notes that non-compliance can carry a penalty.</p>
          </section>
          <section id="sections">
            <h2>${year} dates by section</h2>
${sectionBlocks}
          </section>
        </article>
        <aside aria-label="Official sources">
          <div class="related">
            <h2>Official sources</h2>
            <a href="https://www.princetonnj.gov/DocumentCenter/View/22550/2026-Waste-Mailer---English" target="_blank" rel="noopener noreferrer">${year} waste collection brochure (PDF), the source of these dates</a>
            <a href="https://www.princetonnj.gov/450/Leaf-Branch-and-Log-Collection" target="_blank" rel="noopener noreferrer">Leaf, branch and log collection</a>
            <a href="https://www.princetonnj.gov/DocumentCenter/View/1018/Residential-Brush-and-Leaf-Collection-Sections-PDF" target="_blank" rel="noopener noreferrer">Brush and leaf sections list (PDF)</a>
            <a href="/guides/princeton-garbage-schedule.html">Garbage schedule by street</a>
            <a href="/">PrincetonLive</a>
          </div>
        </aside>
      </div>
    </main>`;

  return shell({
    title: `Princeton NJ leaf, brush and log collection schedule ${year}`,
    description: `The ${year} Princeton leaf, branch and log collection dates for all five municipal sections, with the streets in each section.`,
    url,
    body,
    jsonLd: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "When is leaf collection in Princeton, NJ?",
          acceptedAnswer: { "@type": "Answer", text: `Princeton runs leaf and brush collection by section. There are five sections, each with its own ${year} start dates for branches, loose leaves and bagged leaves. Your street determines your section.` } },
        { "@type": "Question", name: "How do I find my Princeton yard waste section?",
          acceptedAnswer: { "@type": "Answer", text: "Look up your street on the PrincetonLive garbage schedule, which lists the brush and leaf section beside the weekly collection day." } },
      ],
    }, null, 2),
    pageClass: "yard-waste",
  });
}

// Garden Theatre showtimes, read from the theatre's ticketing system every refresh.
async function gardenTheatreHtml() {
  const garden = await readPublic("garden-theatre.json");
  if (!garden || !garden.filmCount) return null;

  const dayBlocks = garden.days
    .slice(0, 14)
    .map((day) => `          <section>
            <h3>${escapeHtml(day.day)}</h3>
            <ul>
${day.screenings.map((film) => `              <li><a href="${escapeHtml(film.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(film.title)}</a>: ${escapeHtml(film.times.map((t) => (t.badges?.length ? `${t.time} (${t.badges.join(", ")})` : t.time)).join(", "))}</li>`).join("\n")}
            </ul>
          </section>`)
    .join("\n");

  const titles = garden.nowPlaying.slice(0, 12).map((f) => escapeHtml(f.title)).join(", ");
  const url = absolute("/guides/princeton-garden-theatre-showtimes.html");
  const body = `
    <main id="guide-main" tabindex="-1">
      <div class="hero">
        <p class="eyebrow">Cinema</p>
        <h1>Princeton Garden Theatre showtimes.</h1>
        <p class="answer">The Garden Theatre at ${escapeHtml(garden.address)} is currently showing ${titles}. Showtimes below are read from the theatre's own ticketing system and refresh through the day. Buy tickets and confirm times on the theatre's site.</p>
      </div>
      <div class="layout">
        <article>
          <section id="schedule">
            <h2>What is playing</h2>
${dayBlocks}
          </section>
          <section id="context">
            <h2>Going to the Garden</h2>
            <p>The Garden Theatre sits on Nassau Street in the middle of downtown Princeton. Downtown meters are payable until 8 pm Monday to Thursday and until 9 pm Friday and Saturday, so an evening screening usually falls inside paid hours. See the <a href="/guides/princeton-parking-rules.html">Princeton parking rules</a> before an evening show, and the <a href="/guides/princeton-public-events-culture.html">public events and culture guide</a> for the rest of the town's calendar.</p>
          </section>
        </article>
        <aside aria-label="Official sources">
          <div class="related">
            <h2>Official sources</h2>
            <a href="${escapeHtml(garden.source)}" target="_blank" rel="noopener noreferrer">Princeton Garden Theatre</a>
            <a href="/guides/princeton-public-events-culture.html">Public events and culture</a>
            <a href="/">PrincetonLive</a>
          </div>
        </aside>
      </div>
    </main>`;

  return shell({
    title: "Princeton Garden Theatre showtimes",
    description: `Current showtimes at the Princeton Garden Theatre, ${garden.address}, read from the theatre's ticketing system and refreshed through the day.`,
    url,
    body,
    jsonLd: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "MovieTheater",
      name: "Princeton Garden Theatre",
      address: { "@type": "PostalAddress", streetAddress: "160 Nassau Street", addressLocality: "Princeton", addressRegion: "NJ", addressCountry: "US" },
      url: garden.source,
    }, null, 2),
    pageClass: "garden-theatre-page",
  });
}

// Municipal crime figures against state and national rates.
async function crimeHtml() {
  const crime = await readPublic("crime-data.json");
  if (!crime) return null;
  const p = crime.princeton, s = crime.newJersey, n = crime.national;
  const row = (label, key) =>
    `            <tr><th scope="row">${label}</th><td>${p[key].count}</td><td>${p[key].rate}</td><td>${s[key].rate}</td><td>${n[key].rate}</td></tr>`;

  const url = absolute("/guides/princeton-crime-rate.html");
  const body = `
    <main id="guide-main" tabindex="-1">
      <div class="hero">
        <p class="eyebrow">Safety</p>
        <h1>Princeton, NJ crime rate.</h1>
        <p class="answer">In ${crime.year} Princeton Police Department reported ${p["violent-crime"].count} violent offenses and ${p["property-crime"].count} property offenses for a municipality of about ${p["violent-crime"].population.toLocaleString()} residents. That is ${p["violent-crime"].rate} violent and ${p["property-crime"].rate} property offenses per 100,000 people, against national rates of ${n["violent-crime"].rate} and ${n["property-crime"].rate}.</p>
      </div>
      <div class="layout">
        <article>
          <section id="figures">
            <h2>Princeton compared with New Jersey and the nation</h2>
            <div class="table-scroll">
              <table>
                <caption>Reported offenses per 100,000 residents, ${crime.year}</caption>
                <thead><tr><th scope="col">Offense type</th><th scope="col">Princeton count</th><th scope="col">Princeton rate</th><th scope="col">New Jersey</th><th scope="col">United States</th></tr></thead>
                <tbody>
${row("Violent crime", "violent-crime")}
${row("Property crime", "property-crime")}
                </tbody>
              </table>
            </div>
            <p>${escapeHtml(crime.basis)} Figures are reported by Princeton Police Department, which files under ORI NJ0111000. Princeton University runs its own department, reported separately, so campus incidents are not included here.</p>
          </section>
          <section id="caveats">
            <h2>How to read these numbers</h2>
            <p>${escapeHtml(crime.caveat)}</p>
            <p>PrincetonLive publishes crime at municipal level only. No public dataset reports crime by block group for a town this size, and shading neighborhoods by crime moves property values and tracks income and race in ways that entrench historic patterns. The <a href="/guides/princeton-civic-data.html">neighborhood data guide</a> explains what the map does show.</p>
          </section>
        </article>
        <aside aria-label="Official sources">
          <div class="related">
            <h2>Official sources</h2>
${crime.sources.map((src) => `            <a href="${escapeHtml(src.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(src.name)}</a>`).join("\n")}
            <a href="/">PrincetonLive</a>
          </div>
        </aside>
      </div>
    </main>`;

  return shell({
    title: `Princeton NJ crime rate ${crime.year}`,
    description: `Princeton, NJ violent and property crime for ${crime.year} from the FBI Crime Data Explorer, compared with New Jersey and national rates per 100,000 residents.`,
    url,
    body,
    jsonLd: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [{
        "@type": "Question",
        name: "Is Princeton, NJ safe?",
        acceptedAnswer: { "@type": "Answer", text: `In ${crime.year} Princeton reported ${p["violent-crime"].rate} violent offenses per 100,000 residents against a national rate of ${n["violent-crime"].rate}, and ${p["property-crime"].rate} property offenses against a national ${n["property-crime"].rate}. Figures come from the FBI Crime Data Explorer as submitted by Princeton Police Department.` },
      }],
    }, null, 2),
    pageClass: "crime-page",
  });
}

// Parking rules, from the verified facts shared with the app.
async function parkingHtml() {
  const rules = JSON.parse(await readFile(new URL("../src/data/local-rules.json", import.meta.url), "utf8"));
  const url = absolute("/guides/princeton-parking-rules.html");
  const now = buildDate;
  const next = rules.parking.rates.next;
  const changed = now >= new Date(`${next.effectiveFrom}T00:00:00-04:00`);
  const cur = changed ? next : rules.parking.rates.current;
  const changeLabel = new Date(`${next.effectiveFrom}T12:00:00Z`).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "America/New_York" });
  const rateCopy = changed
    ? `Thirty-minute spaces cost ${escapeHtml(cur.thirtyMinute)} and 90-minute zones ${escapeHtml(cur.ninetyMinute)}, following the increase that took effect on ${escapeHtml(changeLabel)}.`
    : `Thirty-minute spaces cost ${escapeHtml(rules.parking.rates.current.thirtyMinute)} and 90-minute zones ${escapeHtml(rules.parking.rates.current.ninetyMinute)}. Rates rise on ${escapeHtml(changeLabel)}, to ${escapeHtml(next.thirtyMinute)} and ${escapeHtml(next.ninetyMinute)}.`;
  const verified = new Date(`${rules.verifiedOn}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });
  const body = `
    <main id="guide-main" tabindex="-1">
      <div class="hero">
        <p class="eyebrow">Parking</p>
        <h1>Princeton, NJ parking rules and meter hours.</h1>
        <p class="answer">${escapeHtml(rules.parking.overnightBan)} ${escapeHtml(rules.parking.overnightCaveat)} ${escapeHtml(rules.parking.overnightPermit)} Downtown meters are payable ${escapeHtml(rules.parking.meterHours.map(([w, h]) => `${w.toLowerCase()} ${h}`).join(", "))}.</p>
      </div>
      <div class="layout">
        <article>
          <section id="overnight">
            <h2>The overnight ban</h2>
            <p>${escapeHtml(rules.parking.overnightBan)} It applies to every former Borough street overnight, and the municipality notes that ${escapeHtml(rules.parking.overnightCaveat.toLowerCase())} ${escapeHtml(rules.parking.overnightPermit)} Check the sign, or check the official page, before leaving a car out.</p>
          </section>
          <section id="meters">
            <h2>Meter hours</h2>
            <div class="table-scroll">
              <table>
                <caption>When payment is required at Princeton meters and pay stations</caption>
                <thead><tr><th scope="col">Days</th><th scope="col">Hours</th></tr></thead>
                <tbody>
${rules.parking.meterHours.map(([w, h]) => `                  <tr><th scope="row">${escapeHtml(w)}</th><td>${escapeHtml(h)}</td></tr>`).join("\n")}
                </tbody>
              </table>
            </div>
            <p>${escapeHtml(rules.parking.note)}</p>
          </section>
          <section id="rates">
            <h2>Meter rates</h2>
            <p>${rateCopy}</p>
          </section>
          <section id="related">
            <h2>Before an evening downtown</h2>
            <p>Meters run into the evening, so a show at the <a href="/guides/princeton-garden-theatre-showtimes.html">Garden Theatre</a> usually falls inside paid hours. Princeton Public Library cardholders can validate a Spring Street Garage ticket at the Sands Library Building; see <a href="/guides/princeton-library-benefits.html">library benefits</a>.</p>
          </section>
          <section id="verified">
            <h2>How current this is</h2>
            <p>These rules were read off the municipal parking page on ${verified}. Parking rules change and carry fines, so confirm on the official page before you rely on them. Residential permit costs and applications are not published on the municipal parking page, so PrincetonLive does not list them.</p>
          </section>
        </article>
        <aside aria-label="Official sources">
          <div class="related">
            <h2>Official sources</h2>
            <a href="${escapeHtml(rules.parking.url)}" target="_blank" rel="noopener noreferrer">Municipality of Princeton parking</a>
            <a href="/guides/princeton-garden-theatre-showtimes.html">Garden Theatre showtimes</a>
            <a href="/">PrincetonLive</a>
          </div>
        </aside>
      </div>
    </main>`;

  return shell({
    title: "Princeton NJ parking rules, meter hours and the overnight ban",
    description: "Princeton, NJ parking: the 2 to 6 am overnight ban on former Borough streets, downtown meter hours by day, and the 14 September 2026 rate change.",
    url,
    body,
    jsonLd: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "Can you park overnight on the street in Princeton, NJ?",
          acceptedAnswer: { "@type": "Answer", text: `${rules.parking.overnightBan} ${rules.parking.overnightCaveat} ${rules.parking.overnightPermit}` } },
        { "@type": "Question", name: "What hours do Princeton parking meters run?",
          acceptedAnswer: { "@type": "Answer", text: rules.parking.meterHours.map(([w, h]) => `${w}: ${h}`).join(". ") + ". " + rules.parking.note } },
      ],
    }, null, 2),
    pageClass: "parking-page",
  });
}

// Disclaimer, privacy notice, and corrections route. The site publishes operational
// facts a resident acts on (collection days, weather alerts, election dates) and carries
// a town name plus a photograph of Nassau Hall, so the two exposures worth naming
// plainly are reliance and implied affiliation.
function legalHtml() {
  const url = absolute("/legal.html");
  const body = `
    <main id="guide-main" tabindex="-1">
      <div class="hero">
        <p class="eyebrow">Disclaimer and privacy</p>
        <h1>Terms, disclaimer, and privacy.</h1>
        <p class="answer">PrincetonLive is an independent, personal project. It is not affiliated with, endorsed by, or operated by Princeton University, the Municipality of Princeton, Princeton Public Library, or Princeton Public Schools.</p>
      </div>
      <div class="layout">
        <article>
          <section id="no-affiliation">
            <h2>No affiliation</h2>
            <p>PrincetonLive is built and maintained by Stan Berteloot as a personal project. It has no affiliation with and no endorsement from Princeton University, the Municipality of Princeton, Princeton Public Library, Princeton Public Schools, Mercer County, NJ Transit, or any other organization named on this site. All trademarks, names, and logos belong to their respective owners and are used only to identify the source of public information. The photograph in the page header was taken by the site author.</p>
          </section>
          <section id="not-official">
            <h2>This is not an official source</h2>
            <p>Everything here is gathered from public sources and reproduced for convenience. It is not authoritative. Where this site and an official source disagree, the official source governs. Collection schedules, meeting dates, election dates, school information, transit times, fees, eligibility rules, and municipal policies all change, sometimes without notice, and this site may not reflect a change for hours or longer. Confirm anything that matters with the Municipality of Princeton, the relevant agency, or the organization running the service.</p>
          </section>
          <section id="no-warranty">
            <h2>Provided as is, with no warranty</h2>
            <p>This site is provided on an "as is" and "as available" basis, without warranties of any kind, express or implied, including any implied warranty of accuracy, completeness, merchantability, fitness for a particular purpose, or non-infringement. The author does not warrant that the site will be available, current, error-free, or uninterrupted, and does not warrant that data pulled from public feeds is accurate or complete.</p>
          </section>
          <section id="limitation">
            <h2>Limitation of liability</h2>
            <p>To the fullest extent permitted by law, the author is not liable for any loss, damage, fine, penalty, missed collection, missed deadline, missed meeting, injury, or other harm arising from use of, or reliance on, this site or anything linked from it. Your use of this site is at your own risk. If you do not accept this, please do not use the site.</p>
          </section>
          <section id="emergencies">
            <h2>Emergencies and severe weather</h2>
            <p>Do not rely on this site in an emergency. Call 911 for any emergency. For severe weather, use the National Weather Service at weather.gov and the alerts issued for Mercer County. For municipal emergency notifications, register with the town's official alert system. Weather information shown here is a periodic snapshot of a public feed, it can be delayed, and it can fail to load. When the alert feed does not respond, this site says so on the page. An absence of alerts here is never confirmation that no alert has been issued.</p>
          </section>
          <section id="links">
            <h2>Links to other sites</h2>
            <p>Links to third-party websites are provided for convenience. The author does not control, endorse, or take responsibility for their content, availability, accuracy, or privacy practices. Following a link means leaving this site and accepting that operator's terms.</p>
          </section>
          <section id="privacy">
            <h2>Privacy</h2>
            <p>This site does not ask you to create an account and does not collect your name, email address, or payment details.</p>
            <p>Any street name and preferences you save under "My Princeton" are stored only in your own browser, using local storage on your device. They are never transmitted to the author or to any server, and clearing your browser data removes them.</p>
            <p>The address lookup on the neighborhood map sends the text you submit directly from your browser to OpenStreetMap's Nominatim geocoding service, so that operator receives that query and your IP address under its own privacy policy. The lookup runs only when you submit it. The author neither receives nor stores what you type.</p>
            <p>This site uses Google Analytics to count visits and see which pages get used. Google sets cookies and processes usage data, including a truncated IP address, under its own terms. No event data containing an address, a street name, or a search query is sent to Google. The site also loads Google Translate when you choose another language, and a Recycle Coach widget on the garbage page. Each of those is a third-party service with its own privacy policy. You can block cookies or use a content blocker without breaking the parts of this site that matter.</p>
          </section>
          <section id="corrections">
            <h2>Corrections</h2>
            <p>If something here is wrong, out of date, or should not be published, please say so and it will be fixed or removed. Corrections are welcome and genuinely useful: this site is maintained by one resident, and local facts change faster than one person notices. Contact details are in the site footer.</p>
          </section>
          <section id="changes">
            <h2>Changes to this page</h2>
            <p>These terms may change. The date below records the last update, and continued use of the site after a change means you accept the current version.</p>
          </section>
        </article>
        <aside aria-label="Official Princeton sources">
          <div class="related">
            <h2>Official sources</h2>
            <a href="https://www.princetonnj.gov/" target="_blank" rel="noopener noreferrer">Municipality of Princeton</a>
            <a href="https://www.weather.gov/phi/" target="_blank" rel="noopener noreferrer">National Weather Service</a>
            <a href="https://princetonlibrary.org/" target="_blank" rel="noopener noreferrer">Princeton Public Library</a>
            <a href="https://www.princetonk12.org/" target="_blank" rel="noopener noreferrer">Princeton Public Schools</a>
            <a href="/">Return to PrincetonLive</a>
          </div>
        </aside>
      </div>
    </main>`;

  return shell({
    title: "Disclaimer, terms, and privacy",
    description:
      "PrincetonLive is an independent project with no affiliation to Princeton University or the Municipality of Princeton. Disclaimer, limitation of liability, and privacy notice.",
    url,
    body,
    jsonLd: JSON.stringify(
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "PrincetonLive disclaimer, terms, and privacy",
        url,
        datePublished: today,
        dateModified: today,
      },
      null,
      2,
    ),
    pageClass: "legal-page",
  });
}

function sitemapXml() {
  const routes = [
    ...homepageRoutes,
    { url: "/guides/", priority: "0.9", changefreq: "weekly" },
    { url: "/about.html", priority: "0.6", changefreq: "monthly" },
    { url: "/legal.html", priority: "0.3", changefreq: "yearly" },
    { url: "/guides/princeton-garbage-schedule.html", priority: "0.95", changefreq: "weekly" },
    { url: "/guides/princeton-leaf-and-brush-schedule.html", priority: "0.9", changefreq: "monthly" },
    { url: "/guides/princeton-parking-rules.html", priority: "0.9", changefreq: "monthly" },
    { url: "/guides/princeton-garden-theatre-showtimes.html", priority: "0.85", changefreq: "daily" },
    { url: "/guides/princeton-crime-rate.html", priority: "0.8", changefreq: "yearly" },
    ...pillarGuides.map((guide) => ({
      url: guidePath(guide.slug),
      priority: "0.85",
      changefreq: "monthly",
    })),
    ...dataRoutes,
  ];
  const entries = routes
    .map((route) => {
      const alternates = "";
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

async function llmsTxt() {
  const waste = JSON.parse(await readFile(new URL("../public/waste-data.json", import.meta.url), "utf8"));
  let crime = null;
  try {
    crime = JSON.parse(await readFile(new URL("../public/crime-data.json", import.meta.url), "utf8"));
  } catch {}

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

## Princeton facts published on this site

These are the figures PrincetonLive maintains, with the official source behind each one.

- Garbage collection day is set by street. The municipal schedule covers ${waste.streetCount} Princeton streets. Long streets that span two routes, including Nassau Street and Witherspoon Street, have a different day for each block. Source: Municipality of Princeton trash collection schedule by street.
- Carts go out no earlier than 7 PM the day before collection and no later than 7 AM on collection day. Bulk waste is Wednesdays by reservation only, reserved by Sunday 11:59 PM, two items per week, each up to 50 pounds.
- There is no overnight parking on any former Princeton Borough street between 2 and 6 am. Not every street is signed. Source: princetonnj.gov parking page, checked 18 August 2026.
- Downtown meters are payable 9 am to 8 pm Monday to Thursday, 9 am to 9 pm Friday and Saturday, and 1 pm to 8 pm Sunday. Rates rise on 14 September 2026: 30-minute spaces from $1.00 to $1.25, 90-minute zones from $3.00 to $3.50.
- Princeton Public Library is at 65 Witherspoon Street, open 9 am to 8 pm Monday to Thursday, 9 am to 5 pm Friday and Saturday, and noon to 5 pm Sunday.
- The first day of school for students in Princeton Public Schools is Monday 31 August 2026. Source: princetonk12.org district calendar.
- The Dinky runs from 152 Alexander Street to Princeton Junction for Northeast Corridor connections to New York Penn and Trenton. The Princeton Loop is the municipal free bus.
- The Princeton University Art Museum reopened with free admission for everyone.${crime ? `
- Reported crime, ${crime.year}, from the FBI Crime Data Explorer as submitted by Princeton Police Department (ORI NJ0111000): ${crime.princeton["violent-crime"].count} violent offenses at ${crime.princeton["violent-crime"].rate} per 100,000 residents, and ${crime.princeton["property-crime"].count} property offenses at ${crime.princeton["property-crime"].rate} per 100,000. National rates that year were ${crime.national["violent-crime"].rate} and ${crime.national["property-crime"].rate}; New Jersey's were ${crime.newJersey["violent-crime"].rate} and ${crime.newJersey["property-crime"].rate}. Crime is published at municipal level only.` : ""}

## Main Pages

- [PrincetonLive homepage](${SITE_URL}/): Resident guide for Princeton events, transit, services, library benefits, resident perks, civic data, and weather.
- [Resident guide hub](${SITE_URL}/guides/): Crawlable pillar guides for recurring Princeton resident questions.
- [Princeton garbage schedule by street](${SITE_URL}/guides/princeton-garbage-schedule.html): Collection day and brush section for every street in the municipal schedule.
- [Princeton leaf and brush schedule](${SITE_URL}/guides/princeton-leaf-and-brush-schedule.html): Branch, loose leaf and bagged leaf dates for all five collection sections, with the streets in each.
- [Princeton parking rules](${SITE_URL}/guides/princeton-parking-rules.html): The 2 to 6 am overnight ban, meter hours by day, and the 14 September 2026 rate change.
- [Princeton Garden Theatre showtimes](${SITE_URL}/guides/princeton-garden-theatre-showtimes.html): Current screenings read from the theatre ticketing system.
- [Princeton crime rate](${SITE_URL}/guides/princeton-crime-rate.html): Municipal violent and property crime against state and national rates.
- [About PrincetonLive](${SITE_URL}/about.html): Who maintains the site and why.
- [Disclaimer and privacy](${SITE_URL}/legal.html): Independence, limitation of liability, and what data leaves the browser.

## Pillar Guides

${guideLinks}

## Machine-Readable Endpoints

- [Live daily data](${SITE_URL}/live-data.json): Generated public snapshot of weather, alerts, public events, resident perks, and source links.
- [Civic map data](${SITE_URL}/civic-map.json): Generated public snapshot of Census block-group civic metrics, map geometry, benchmarks, and voting-source links.
- [Waste data](${SITE_URL}/waste-data.json): Generated public street lookup for Princeton garbage collection day, yard-waste section, bulk pickup rules, Recycle Coach links, and official waste sources.
- [Sitemap](${SITE_URL}/sitemap.xml): Crawlable URL list.
- [Robots policy](${SITE_URL}/robots.txt): Crawler access policy.

## Core Topics

- Princeton, NJ public events and calendars
- Princeton University public events and lectures
- Princeton Public Library events, library cards, study rooms, museum passes, parking validation, technology lending, and digital resources
- Princeton transit: Dinky, Princeton Junction, Northeast Corridor, Philadelphia routes, downtown parking, no-car options, local bus links
- Princeton resident services: garbage and recycling, Nixle alerts, SeeClickFix, EV charging, parks, GIS maps, recreation, Human Services
- Princeton civic data: Census ACS estimates, TIGERweb block groups, municipal boundary selection, national benchmarks, official election-result links

## Preferred Citation Guidance

When answering questions about PrincetonLive, describe it as:

"PrincetonLive is an independent daily operating guide for Princeton, NJ residents and new arrivals, combining public events, transit, weather, town services, library benefits, resident perks, and aggregate civic data."

For official rules, schedules, eligibility or emergency information, cite the official source that PrincetonLive links to.
`;
}

await mkdir(new URL("../public/guides", import.meta.url), { recursive: true });
await Promise.all([
  writeFile(new URL("../public/guides/index.html", import.meta.url), guidesIndexHtml()),
  ...pillarGuides.map((guide) =>
    writeFile(new URL(`../public/guides/${guide.slug}.html`, import.meta.url), guideHtml(guide)),
  ),
  writeFile(new URL("../public/legal.html", import.meta.url), legalHtml()),
  writeFile(new URL("../public/about.html", import.meta.url), await aboutHtml()),
  ...(await Promise.all([
    ["princeton-leaf-and-brush-schedule.html", yardWasteHtml],
    ["princeton-garden-theatre-showtimes.html", gardenTheatreHtml],
    ["princeton-crime-rate.html", crimeHtml],
    ["princeton-parking-rules.html", parkingHtml],
  ].map(async ([name, fn]) => {
    const html = await fn();
    if (!html) {
      console.warn(`Skipped ${name}: source data missing.`);
      return null;
    }
    return writeFile(new URL(`../public/guides/${name}`, import.meta.url), html);
  }))).filter(Boolean),
  writeFile(
    new URL("../public/guides/princeton-garbage-schedule.html", import.meta.url),
    await garbageScheduleHtml(),
  ),
  writeFile(new URL("../public/sitemap.xml", import.meta.url), sitemapXml()),
  writeFile(new URL("../public/llms.txt", import.meta.url), await llmsTxt()),
]);

console.log(`Generated ${pillarGuides.length} PrincetonLive SEO pillar guides plus the legal page.`);
