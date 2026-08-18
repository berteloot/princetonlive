// Now playing at the Garden Theatre, 160 Nassau Street.
//
// There is no public feed. The theatre runs on Veezi, and Veezi does publish a real
// JSON API at api.us.veezi.com (/v1/session, /v1/film), but every call needs a
// VeeziAccessToken that only the cinema can issue. Without that token the API returns
// 403, so a feed is not available to us today. Getting one means asking the theatre to
// generate a token.
//
// Best available source is therefore the Veezi ticketing storefront, which is the
// ticketing system's own output: it lists every session with dates, times, session
// attributes, ratings, and posters, in stable semantic markup. The theatre's homepage
// is kept as a fallback for the case where the storefront changes or goes down.
//
// Both parsers fail closed. If neither yields a screening the script writes nothing,
// exits non-zero, and leaves the previous file in place, so the monitor catches the
// staleness instead of the site publishing an empty schedule.

import { mkdir, writeFile } from "node:fs/promises";

const OUT_FILE = new URL("../public/garden-theatre.json", import.meta.url);
const SITE_TOKEN = "af0wawfbmqctzhm3rh7b4exs10";
const STOREFRONT = `https://ticketing.useast.veezi.com/sessions?siteToken=${SITE_TOKEN}`;
const HOMEPAGE = "https://www.princetongardentheatre.org/";
const PUBLIC_URL = "https://www.princetongardentheatre.org/";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

function decode(value) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getHtml(url) {
  const response = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" } });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

// -------------------------------------------------- primary: Veezi storefront

function parseStorefront(htmlText) {
  const films = new Map();
  const byDay = new Map();

  // Each <div class="film "> block carries the title, rating, poster and its sessions.
  const filmBlocks = htmlText.split(/<div\s+class="film\s*"/i).slice(1);

  for (const block of filmBlocks) {
    const titleMatch = block.match(/<h3\s+class="title">([\s\S]*?)<\/h3>/i);
    if (!titleMatch) continue;
    const title = decode(titleMatch[1]);
    if (!title) continue;
    const slug = slugify(title);

    const posterMatch = block.match(/<img\s+class="poster"\s+src="([^"]+)"/i);
    const censorMatch = block.match(/<p>\s*<span\s+class="censor">([\s\S]*?)<\/span>([\s\S]*?)<\/p>/i);

    if (!films.has(slug)) {
      films.set(slug, {
        slug,
        title,
        url: `${PUBLIC_URL}film?id=${slug}`,
        poster: posterMatch
          ? new URL(posterMatch[1].replace(/&amp;/g, "&"), "https://ticketing.useast.veezi.com").href
          : null,
        rating: censorMatch ? decode(`${censorMatch[1]} ${censorMatch[2]}`) : null,
      });
    }

    // Sessions are grouped under a per-date container inside the film block.
    const dateBlocks = block.split(/<div\s+class="date-container">/i).slice(1);
    for (const dateBlock of dateBlocks) {
      const dayMatch = dateBlock.match(/<h4\s+class="date">([\s\S]*?)<\/h4>/i);
      if (!dayMatch) continue;
      const day = decode(dayMatch[1]);

      const listMatch = dateBlock.match(/<ul\s+class="session-times">([\s\S]*?)<\/ul>/i);
      if (!listMatch) continue;

      const times = [];
      for (const li of listMatch[1].matchAll(/<li>([\s\S]*?)<\/li>/gi)) {
        const chunk = li[1];
        const badges = [...chunk.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)]
          .map((b) => decode(b[1]))
          .filter((b) => b && !/^\d/.test(b));
        const time = decode(chunk.replace(/<span[^>]*>[\s\S]*?<\/span>/gi, ""));
        if (time) times.push({ time, badges });
      }
      if (!times.length) continue;

      if (!byDay.has(day)) byDay.set(day, new Map());
      const dayFilms = byDay.get(day);
      const existing = dayFilms.get(slug);
      const target = existing || { slug, title, url: films.get(slug).url, times: [] };
      // The storefront repeats a film block under more than one date section, so the
      // same showtime arrives twice. Key on time plus attributes to keep one of each.
      const keyOf = (slot) => `${slot.time}|${slot.badges.join(",")}`;
      const seenTimes = new Set(target.times.map(keyOf));
      for (const slot of times) {
        if (seenTimes.has(keyOf(slot))) continue;
        seenTimes.add(keyOf(slot));
        target.times.push(slot);
      }
      if (!existing) dayFilms.set(slug, target);
    }
  }

  const days = [...byDay.entries()].map(([day, dayFilms]) => ({
    day,
    screenings: [...dayFilms.values()],
  }));
  return { days, films: [...films.values()] };
}

// -------------------------------------------------- fallback: theatre homepage

function parseHomepage(htmlText) {
  const days = [];
  const filmIndex = new Map();
  const dayBlocks = htmlText.split(/<div id="box-day">/i).slice(1);

  for (const block of dayBlocks) {
    const dayMatch = block.match(/<div class="week-day">([\s\S]*?)<\/div>/i);
    if (!dayMatch) continue;
    const day = decode(dayMatch[1]);

    const screenings = [];
    for (const item of block.matchAll(/<li>([\s\S]*?)<\/li>/gi)) {
      const chunk = item[1];
      const filmMatch = chunk.match(/<a href="film\?id=([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!filmMatch) continue;
      const slug = decode(filmMatch[1]);
      const title = decode(filmMatch[2]);
      const times = [];
      for (const m of chunk.matchAll(/class="week-time"[^>]*>([\s\S]*?)<\/a>/gi)) {
        const raw = m[1];
        const badges = [...raw.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)]
          .map((b) => decode(b[1]))
          .filter(Boolean);
        const time = decode(raw.replace(/<span[^>]*>[\s\S]*?<\/span>/gi, ""));
        if (time) times.push({ time, badges });
      }
      const url = `${PUBLIC_URL}film?id=${slug}`;
      screenings.push({ slug, title, url, times });
      if (!filmIndex.has(slug)) filmIndex.set(slug, { slug, title, url, poster: null, rating: null });
    }
    if (screenings.length) days.push({ day, screenings });
  }
  return { days, films: [...filmIndex.values()] };
}

// -------------------------------------------------------------------- assemble

let parsed = null;
let sourceUsed = null;

try {
  parsed = parseStorefront(await getHtml(STOREFRONT));
  if (parsed.days.length) sourceUsed = "veezi-storefront";
  else parsed = null;
} catch (error) {
  console.error(`Veezi storefront unavailable: ${error.message}`);
}

if (!parsed) {
  try {
    parsed = parseHomepage(await getHtml(HOMEPAGE));
    if (parsed.days.length) sourceUsed = "theatre-homepage";
    else parsed = null;
  } catch (error) {
    console.error(`Theatre homepage unavailable: ${error.message}`);
  }
}

if (!parsed) {
  console.error(
    "Both Garden Theatre sources failed to yield screenings. Keeping the existing file " +
      "rather than publishing an empty schedule.",
  );
  process.exit(1);
}

const payload = {
  generatedAt: new Date().toISOString(),
  venue: "Princeton Garden Theatre",
  address: "160 Nassau Street, Princeton",
  source: PUBLIC_URL,
  sourceUsed,
  note: "Read from the theatre's own ticketing system. Confirm showtimes and buy tickets on their site.",
  filmCount: parsed.films.length,
  nowPlaying: parsed.films,
  days: parsed.days,
};

await mkdir(new URL("../public", import.meta.url), { recursive: true });
await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`);
console.log(
  `Wrote garden-theatre.json from ${sourceUsed}: ${parsed.films.length} films across ${parsed.days.length} days.`,
);
