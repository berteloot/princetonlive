// Now playing at the Garden Theatre, 160 Nassau Street.
//
// The theatre publishes no feed. Its site is a Veezi storefront, /films returns 403 to
// anything without a browser user agent, and there is no JSON-LD. The weekly schedule on
// the homepage is the only public structured source, so this parses that.
//
// Because it is a scrape it is deliberately brittle in the safe direction: if the markup
// changes, the parse yields nothing, the script exits non-zero, and the previous file is
// left in place rather than being replaced with an empty schedule. The monitor then
// catches the staleness.

import { mkdir, readFile, writeFile } from "node:fs/promises";

const OUT_FILE = new URL("../public/garden-theatre.json", import.meta.url);
const SOURCE = "https://www.princetongardentheatre.org/";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

function decode(value) {
  return value
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

const response = await fetch(SOURCE, { headers: { "User-Agent": UA, Accept: "text/html" } });
if (!response.ok) throw new Error(`Garden Theatre returned ${response.status}`);
const htmlText = await response.text();

// Each day is a <div id="box-day"> holding a .week-day label and a list of screenings.
const dayBlocks = htmlText.split(/<div id="box-day">/i).slice(1);
const days = [];

for (const block of dayBlocks) {
  const dayMatch = block.match(/<div class="week-day">([\s\S]*?)<\/div>/i);
  if (!dayMatch) continue;
  const day = decode(dayMatch[1]);

  const screenings = [];
  const itemRe = /<li>([\s\S]*?)<\/li>/gi;
  let item;
  while ((item = itemRe.exec(block))) {
    const chunk = item[1];
    const filmMatch = chunk.match(/<a href="film\?id=([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!filmMatch) continue;
    // A showtime can carry an attribute badge such as OC (open captions), which is
    // useful to a resident, so it is kept as a label instead of being flattened into
    // the time string.
    const times = [...chunk.matchAll(/class="week-time"[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => {
      const raw = m[1];
      const badges = [...raw.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)]
        .map((b) => decode(b[1]))
        .filter(Boolean);
      const time = decode(raw.replace(/<span[^>]*>[\s\S]*?<\/span>/gi, "").replace(/<[^>]+>/g, ""));
      return time ? { time, badges } : null;
    }).filter(Boolean);
    screenings.push({
      slug: decode(filmMatch[1]),
      title: decode(filmMatch[2]),
      url: `https://www.princetongardentheatre.org/film?id=${decode(filmMatch[1])}`,
      times,
    });
  }
  if (screenings.length) days.push({ day, screenings });
}

if (!days.length) {
  console.error(
    "Parsed no Garden Theatre screenings. The homepage markup has probably changed. " +
      "Keeping the existing file rather than publishing an empty schedule.",
  );
  process.exit(1);
}

// A flat, de-duplicated list of what is on this week, for the compact card.
const seen = new Set();
const nowPlaying = [];
for (const { screenings } of days) {
  for (const film of screenings) {
    if (seen.has(film.slug)) continue;
    seen.add(film.slug);
    nowPlaying.push({ slug: film.slug, title: film.title, url: film.url });
  }
}

const payload = {
  generatedAt: new Date().toISOString(),
  venue: "Princeton Garden Theatre",
  address: "160 Nassau Street, Princeton",
  source: SOURCE,
  note: "Parsed from the theatre's published weekly schedule. Confirm showtimes and buy tickets on their site.",
  filmCount: nowPlaying.length,
  nowPlaying,
  days,
};

await mkdir(new URL("../public", import.meta.url), { recursive: true });
await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`);
console.log(
  `Wrote garden-theatre.json: ${nowPlaying.length} films across ${days.length} days.`,
);
