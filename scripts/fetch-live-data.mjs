import { mkdir, readFile, writeFile } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";

const OUT_FILE = new URL("../public/live-data.json", import.meta.url);
const TIME_ZONE = "America/New_York";
const PRINCETON_POINT = "40.3573,-74.6672";
const MAX_EVENTS = 18;

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: false,
  trimValues: true,
});

const sources = [
  {
    name: "National Weather Service",
    url: "https://api.weather.gov/",
    status: "pending",
  },
  {
    name: "Princeton University Events",
    url: "https://www.princeton.edu/feed/events/",
    status: "pending",
  },
  {
    name: "Princeton Public Library",
    url: "https://princetonlibrary.libnet.info/events",
    status: "pending",
  },
  {
    name: "Municipality of Princeton",
    url: "https://www.princetonnj.gov/RSSFeed.aspx?ModID=58&CID=All-0",
    status: "pending",
  },
];

const fallback = {
  generatedAt: null,
  weather: {
    temperature: null,
    shortForecast: "Weather unavailable",
    wind: "",
    detailedForecast: "The forecast source did not respond during the last refresh.",
    sourceUrl: "https://www.weather.gov/",
  },
  alerts: [],
  alertsAvailable: false,
  events: [],
  sources,
};

// Hosts we accept links from. Feed content is untrusted: an upstream feed can be
// compromised, and an ordinary feed can carry a javascript: or off-domain URL that
// would render under an official-looking label.
const allowedLinkHosts = new Set([
  "www.princeton.edu",
  "princeton.edu",
  "princetonlibrary.libnet.info",
  "www.princetonlibrary.org",
  "princetonlibrary.org",
  "www.princetonnj.gov",
  "princetonnj.gov",
  "alerts.weather.gov",
  "api.weather.gov",
  "www.weather.gov",
  "forecast.weather.gov",
]);

function safeUrl(value) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  try {
    const url = new URL(String(value));
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return allowedLinkHosts.has(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}

function source(name) {
  return sources.find((item) => item.name === name);
}

function mark(name, status, detail = "") {
  const item = source(name);
  if (item) {
    item.status = status;
    item.detail = detail;
  }
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "PrincetonLive/0.1 (https://princetonlive.berteloot.org)",
      Accept: "application/rss+xml, application/xml, application/json, text/html;q=0.9, */*;q=0.8",
      ...options.headers,
    },
    ...options,
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

async function fetchJson(url, options = {}) {
  const text = await fetchText(url, {
    ...options,
    headers: {
      Accept: "application/geo+json, application/json, */*",
      ...options.headers,
    },
  });
  return JSON.parse(text);
}

function easternDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateLabel(value) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function timeLabel(value) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function stripHtml(value = "") {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function classify(text) {
  const value = text.toLowerCase();
  const tags = new Set();

  // "new" used to be seeded on every event, so the "New here" filter returned the whole
  // list and did nothing. It now means orientation-shaped: free, public, drop-in, or a
  // first-look at the town.
  if (/tour|orientation|welcome|newcomer|new resident|open house|introduction|intro to|first|drop-in|drop in|free/.test(value)) {
    tags.add("new");
  }

  // "workshop" alone was tagging adult writing groups as family. Require an explicit
  // age or child signal instead.
  if (/story ?time|kids|children|teen|toddler|preschool|baby|babies|family|all ages|youth|ages \d/.test(value)) {
    tags.add("family");
  }
  if (/film|theatre|theater|concert|music|art|museum|lecture|studio|dance|culture|exhibit|author|reading|poetry/.test(value)) {
    tags.add("culture");
  }
  if (/library|film|theatre|theater|museum|workshop|meeting|indoor|gallery|class/.test(value)) {
    tags.add("rain");
  }
  if (/council|municipal|trash|recycling|food pantry|health|permit|task force|zoning|board|budget|registration/.test(value)) {
    tags.add("practical");
  }
  return [...tags];
}

async function weather() {
  try {
    const point = await fetchJson(`https://api.weather.gov/points/${PRINCETON_POINT}`);
    const forecast = await fetchJson(point.properties.forecast);
    const alerts = await fetchJson(`https://api.weather.gov/alerts/active?point=${PRINCETON_POINT}`);
    const current = forecast.properties.periods[0];

    mark("National Weather Service", "ok", `${current.shortForecast}, ${current.temperature}F`);
    return {
      weather: {
        temperature: current.temperature,
        shortForecast: current.shortForecast,
        wind: `${current.windSpeed} ${current.windDirection}`,
        detailedForecast: current.detailedForecast,
        sourceUrl: "https://forecast.weather.gov/MapClick.php?lat=40.3573&lon=-74.6672",
      },
      alerts: asArray(alerts.features).map((feature) => ({
        id: feature.id,
        event: feature.properties.event,
        headline: feature.properties.headline,
        severity: feature.properties.severity,
        url: safeUrl(feature.properties.uri),
      })),
      alertsAvailable: true,
    };
  } catch (error) {
    mark("National Weather Service", "error", error.message);
    // An empty alert list here means "we do not know", never "there are no alerts".
    // The flag is what lets the page tell those two apart.
    return { weather: fallback.weather, alerts: [], alertsAvailable: false };
  }
}

async function universityEvents() {
  try {
    const xml = await fetchText("https://www.princeton.edu/feed/events/");
    const data = parser.parse(xml);
    const items = asArray(data.rss?.channel?.item);
    const events = items.map((item) => {
      const start = new Date(item.pubDate);
      return {
        title: stripHtml(item.title),
        source: "Princeton University",
        dateLabel: dateLabel(start),
        timeLabel: timeLabel(start),
        location: "Princeton campus",
        url: safeUrl(item.link),
        sortTime: start.toISOString(),
        tags: classify(`${item.title} ${item.description} Princeton University`),
      };
    });
    mark("Princeton University Events", "ok", `${events.length} events`);
    return events;
  } catch (error) {
    mark("Princeton University Events", "error", error.message);
    return [];
  }
}

async function libraryEvents() {
  try {
    const today = easternDateParts();
    const req = encodeURIComponent(JSON.stringify({ private: false, date: today, days: 8 }));
    const events = await fetchJson(
      `https://princetonlibrary.libnet.info/eeventcaldata?event_type=0&req=${req}`,
    );
    const mapped = asArray(events).map((event) => {
      const start = new Date(event.raw_start_time.replace(" ", "T"));
      return {
        title: stripHtml(event.title),
        source: "Princeton Public Library",
        dateLabel: event.simple_date || dateLabel(start),
        timeLabel: event.time_string || event.start_time || "Check time",
        location: [event.library, event.venues].filter(Boolean).join(" - "),
        url: safeUrl(event.url),
        sortTime: event.raw_start_time,
        tags: classify(`${event.title} ${event.description} ${event.tags} ${event.ages}`),
      };
    });
    mark("Princeton Public Library", "ok", `${mapped.length} events`);
    return mapped;
  } catch (error) {
    mark("Princeton Public Library", "error", error.message);
    return [];
  }
}

function municipalDate(description) {
  const date = description.match(/Event date:<\/strong>\s*([^<]+)/i)?.[1]?.trim();
  const time = description.match(/Event Time:\s*<\/strong>\s*([^<]+)/i)?.[1]?.trim();
  return { date, time };
}

async function municipalEvents() {
  try {
    const xml = await fetchText("https://www.princetonnj.gov/RSSFeed.aspx?ModID=58&CID=All-0");
    const data = parser.parse(xml);
    const items = asArray(data.rss?.channel?.item);
    const mapped = items.map((item) => {
      const details = municipalDate(item.description || "");
      const parsed = details.date ? new Date(`${details.date} ${details.time?.split(" - ")[0] || ""}`) : new Date(item.pubDate);
      return {
        title: stripHtml(item.title),
        source: "Municipality of Princeton",
        dateLabel: details.date || dateLabel(parsed),
        timeLabel: details.time || "Check time",
        location: stripHtml(item["calendarEvent:Location"] || "Princeton, NJ"),
        url: safeUrl(item.link),
        sortTime: Number.isNaN(parsed.valueOf()) ? item.pubDate : parsed.toISOString(),
        tags: classify(`${item.title} municipal Princeton ${item.description}`),
      };
    });
    mark("Municipality of Princeton", "ok", `${mapped.length} calendar items`);
    return mapped;
  } catch (error) {
    mark("Municipality of Princeton", "error", error.message);
    return [];
  }
}

function eventSort(a, b) {
  return String(a.sortTime).localeCompare(String(b.sortTime));
}

try {
  const [weatherData, university, library, municipal] = await Promise.all([
    weather(),
    universityEvents(),
    libraryEvents(),
    municipalEvents(),
  ]);

  const events = [...university, ...library, ...municipal]
    .filter((event) => event.title && event.url)
    .sort(eventSort)
    .slice(0, MAX_EVENTS)
    .map(({ sortTime, ...event }) => event);

  const payload = {
    generatedAt: new Date().toISOString(),
    ...weatherData,
    events: events.length ? events : fallback.events,
    sources,
  };

  await mkdir(new URL("../public", import.meta.url), { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${OUT_FILE.pathname} with ${payload.events.length} events.`);
} catch (error) {
  console.warn(`Live-data refresh failed: ${error.message}`);
  try {
    await readFile(OUT_FILE);
    console.warn("Keeping existing public/live-data.json.");
  } catch {
    await mkdir(new URL("../public", import.meta.url), { recursive: true });
    await writeFile(
      OUT_FILE,
      `${JSON.stringify({ ...fallback, generatedAt: new Date().toISOString() }, null, 2)}\n`,
    );
    console.warn("Wrote fallback public/live-data.json.");
  }
}
