import { mkdir, readFile, writeFile } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";

const OUT_FILE = new URL("../public/live-data.json", import.meta.url);
const GARDEN_FILE = new URL("../public/garden-theatre.json", import.meta.url);
const TIME_ZONE = "America/New_York";
const PRINCETON_POINT = "40.3573,-74.6672";
// The page is a day view: it answers "what is on Tuesday evening", so it carries a week
// of events rather than the next 18. The per-day cap is a size guard, not an editorial
// cut, and no ordinary Princeton day comes close to it.
const WINDOW_DAYS = 7;
const MAX_EVENTS_PER_DAY = 60;

// Series worth carrying past the 18-event window. That window covers about two days, so
// a festival announced a month out never reaches the page on date order alone. A tracked
// series keeps its dates in the list and gets its own card until the run is over.
// Entry shape: { id, name, label, match: /regex/i, venue, url, maxDates }.
const trackedSeries = [];

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
  {
    name: "Princeton Garden Theatre",
    url: "https://www.princetongardentheatre.org/",
    status: "pending",
  },
  ...trackedSeries.map((series) => ({
    name: `${series.name} (${series.label})`,
    url: series.url,
    status: "pending",
  })),
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
  days: [],
  windowDays: WINDOW_DAYS,
  trackedSeries: [],
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
  "arts.princeton.edu",
  "www.princetongardentheatre.org",
  "princetongardentheatre.org",
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

const MONTHS = new Map(
  [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ].map((name, index) => [name, index]),
);

const easternHour = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  hourCycle: "h23",
});

const easternWeekday = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  weekday: "short",
});

function easternOffsetMinutes(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    timeZoneName: "longOffset",
  }).formatToParts(date);
  const name = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT-05:00";
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!match) return -300;
  return (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]));
}

// Turns a wall-clock reading from a Princeton page into a real instant.
//
// Node reads a date string that carries no zone in the machine's own zone. That is UTC on
// the refresh runner and Eastern on a laptop, so the same feed produced two different
// orderings depending on where it ran, and a day view built on it would put an evening
// show on the wrong day. Every source that publishes local time goes through here.
function easternInstant(year, monthIndex, day, hour = 0, minute = 0) {
  const guess = Date.UTC(year, monthIndex, day, hour, minute);
  const first = new Date(guess - easternOffsetMinutes(new Date(guess)) * 60000);
  // The second pass only matters on the two changeover days, where the offset at the
  // guess is not the offset at the answer.
  return new Date(guess - easternOffsetMinutes(first) * 60000);
}

// "8:00 PM", "10:30am", "1:00 PM - 1:45 PM" all yield the start of the event.
function parseClock(value) {
  const match = /(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?/i.exec(String(value ?? ""));
  if (!match) return null;
  const hour = (Number(match[1]) % 12) + (match[3].toLowerCase() === "p" ? 12 : 0);
  return { hour, minute: Number(match[2] ?? 0) };
}

function monthIndex(name) {
  return MONTHS.get(String(name ?? "").trim().toLowerCase().slice(0, 12)) ?? null;
}

// Every event carries the Eastern day it belongs to and the hour it starts, because the
// day picker and the evening filter must not re-parse a date format in the browser.
function stamp(event, start) {
  if (!(start instanceof Date) || Number.isNaN(start.valueOf())) return null;
  return {
    ...event,
    isoDate: easternDateParts(start),
    startHour: Number(easternHour.format(start)) % 24,
    sortTime: start.toISOString(),
  };
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
    // pubDate on this feed is the performance time, not a publication date, and it
    // carries its own offset.
    const events = items
      .map((item) => {
        const start = new Date(item.pubDate);
        return stamp(
          {
            title: stripHtml(item.title),
            source: "Princeton University",
            dateLabel: dateLabel(start),
            timeLabel: timeLabel(start),
            location: "Princeton campus",
            url: safeUrl(item.link),
            tags: classify(`${item.title} ${item.description} Princeton University`),
          },
          start,
        );
      })
      .filter(Boolean);
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
    const mapped = asArray(events)
      .map((event) => {
        // raw_start_time is "2026-08-20 10:30:00" in Princeton local time, with no zone.
        const parts = /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(
          String(event.raw_start_time ?? ""),
        );
        if (!parts) return null;
        const start = easternInstant(
          Number(parts[1]),
          Number(parts[2]) - 1,
          Number(parts[3]),
          Number(parts[4]),
          Number(parts[5]),
        );
        return stamp(
          {
            title: stripHtml(event.title),
            source: "Princeton Public Library",
            dateLabel: event.simple_date || dateLabel(start),
            timeLabel: event.time_string || event.start_time || "Check time",
            location: [event.library, event.venues].filter(Boolean).join(" - "),
            url: safeUrl(event.url),
            tags: classify(`${event.title} ${event.description} ${event.tags} ${event.ages}`),
          },
          start,
        );
      })
      .filter(Boolean);
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
    const mapped = items
      .map((item) => {
        const details = municipalDate(item.description || "");
        // "Event date: August 18, 2026" and "Event Time: 01:00 PM - 01:45 PM", both
        // Princeton local, so they are assembled rather than handed to Date().
        const parts = /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/.exec(details.date ?? "");
        const clock = parseClock(details.time?.split(" - ")[0]);
        const month = parts ? monthIndex(parts[1]) : null;
        const start =
          parts && month !== null
            ? easternInstant(
                Number(parts[3]),
                month,
                Number(parts[2]),
                clock?.hour ?? 0,
                clock?.minute ?? 0,
              )
            : new Date(item.pubDate);
        return stamp(
          {
            title: stripHtml(item.title),
            source: "Municipality of Princeton",
            dateLabel: details.date || dateLabel(start),
            timeLabel: details.time || "Check time",
            location: stripHtml(item["calendarEvent:Location"] || "Princeton, NJ"),
            url: safeUrl(item.link),
            tags: classify(`${item.title} municipal Princeton ${item.description}`),
          },
          start,
        );
      })
      .filter(Boolean);
    mark("Municipality of Princeton", "ok", `${mapped.length} calendar items`);
    return mapped;
  } catch (error) {
    mark("Municipality of Princeton", "error", error.message);
    return [];
  }
}

// The cinema is the most common answer to "what is on tonight", so its showtimes belong
// in the day list, not only in their own section.
//
// The schedule is read off the file that scripts/fetch-garden-theatre.mjs writes rather
// than fetched again. That script runs first in refresh:public, and it fails closed, so
// the worst case here is a schedule from the previous cycle instead of a missing one.
async function gardenEvents() {
  try {
    const schedule = JSON.parse(await readFile(GARDEN_FILE, "utf8"));
    const now = new Date();
    const events = [];

    for (const day of asArray(schedule.days)) {
      const dayNumber = Number(/\b(\d{1,2})\b/.exec(day.day ?? "")?.[1]);
      const month = monthIndex(new RegExp([...MONTHS.keys()].join("|"), "i").exec(day.day ?? "")?.[0]);
      if (!dayNumber || month === null) continue;

      // The storefront prints "Thursday 20, August" with no year, and it lists weeks
      // ahead, so the year is the one that puts the date just ahead of today.
      const year = [0, 1, -1]
        .map((offset) => Number(easternDateParts(now).slice(0, 4)) + offset)
        .find((candidate) => {
          const days = (easternInstant(candidate, month, dayNumber, 12) - now) / 86400000;
          return days > -2 && days < 300;
        });
      if (!year) continue;

      for (const screening of asArray(day.screenings)) {
        for (const slot of asArray(screening.times)) {
          const clock = parseClock(slot.time);
          if (!clock) continue;
          const start = easternInstant(year, month, dayNumber, clock.hour, clock.minute);
          const stamped = stamp(
            {
              title: screening.title,
              source: "Garden Theatre",
              dateLabel: dateLabel(start),
              timeLabel: slot.badges?.length
                ? `${slot.time} (${slot.badges.join(", ")})`
                : slot.time,
              location: "160 Nassau Street",
              url: safeUrl(screening.url),
              tags: classify(`${screening.title} film cinema movie theatre`),
            },
            start,
          );
          if (stamped) events.push(stamped);
        }
      }
    }

    mark("Princeton Garden Theatre", "ok", `${events.length} showtimes`);
    return events;
  } catch (error) {
    mark("Princeton Garden Theatre", "error", error.message);
    return [];
  }
}

// The seven days the page can show. Labels are built here so the browser never has to
// parse a date format to draw the picker.
function dayWindow(count) {
  const [year, month, day] = easternDateParts().split("-").map(Number);
  const days = [];
  for (let index = 0; index < count; index += 1) {
    // 16:00 UTC is the middle of the Princeton day under either offset, so a label
    // never slips to the day before.
    const midday = new Date(Date.UTC(year, month - 1, day + index, 16));
    days.push({
      iso: easternDateParts(midday),
      label: dateLabel(midday),
      weekday: easternWeekday.format(midday),
      count: 0,
    });
  }
  return days;
}

function eventSort(a, b) {
  return String(a.sortTime).localeCompare(String(b.sortTime));
}

// Pulls every date of a tracked series out of the pooled events, so those dates survive
// the MAX_EVENTS cut and get a card of their own. A series with no upcoming date returns
// nothing and disappears from the page the day after its last performance.
function collectTrackedSeries(all) {
  // Keeps a performance listed through the evening it happens rather than dropping it
  // at its start time, which is when a resident is most likely to be looking for it.
  const cutoff = Date.now() - 12 * 60 * 60 * 1000;
  const cards = [];
  const trackedEvents = [];

  for (const series of trackedSeries) {
    const dates = all
      .filter((event) => series.match.test(`${event.title} ${event.location}`))
      .filter((event) => {
        const start = new Date(event.sortTime);
        return !Number.isNaN(start.valueOf()) && start.valueOf() >= cutoff;
      })
      .sort(eventSort)
      .map((event) => ({
        ...event,
        // The university feed labels every campus event "Princeton campus". The series
        // knows its own venue, which is the useful line on the card.
        location: series.venue,
        series: series.name,
        seriesUrl: series.url,
        tags: [...new Set([...(event.tags ?? []), "culture"])],
      }));

    mark(
      `${series.name} (${series.label})`,
      "ok",
      dates.length ? `${dates.length} upcoming dates` : "no upcoming dates",
    );
    if (!dates.length) continue;

    trackedEvents.push(...dates);
    const first = dates[0];
    const last = dates[dates.length - 1];
    cards.push({
      id: series.id,
      name: series.name,
      label: series.label,
      venue: series.venue,
      url: series.url,
      count: dates.length,
      startLabel: first.dateLabel,
      endLabel: last.dateLabel,
      next: {
        title: first.title,
        dateLabel: first.dateLabel,
        timeLabel: first.timeLabel,
        url: first.url,
      },
      dates: dates.slice(0, series.maxDates).map((event) => ({
        title: event.title,
        dateLabel: event.dateLabel,
        timeLabel: event.timeLabel,
        url: event.url,
      })),
    });
  }

  return { cards, trackedEvents };
}

try {
  const [weatherData, university, library, municipal, garden] = await Promise.all([
    weather(),
    universityEvents(),
    libraryEvents(),
    municipalEvents(),
    gardenEvents(),
  ]);

  const all = [...university, ...library, ...municipal, ...garden].filter(
    (event) => event.title && event.url,
  );
  const { cards, trackedEvents } = collectTrackedSeries(all);

  // One film can run twice in an evening, so a screening is identified by its start
  // time as well as its link.
  const keyOf = (event) => `${event.url}|${event.sortTime}`;
  const days = dayWindow(WINDOW_DAYS);
  const dayIndex = new Map(days.map((day) => [day.iso, day]));
  const merged = new Map();

  for (const event of all.slice().sort(eventSort)) {
    const day = dayIndex.get(event.isoDate);
    if (!day || day.count >= MAX_EVENTS_PER_DAY) continue;
    if (merged.has(keyOf(event))) continue;
    merged.set(keyOf(event), event);
    day.count += 1;
  }

  // Tracked dates go in whether or not they fall inside the week, and they overwrite the
  // plain copy of the same performance so the annotated version is the one that ships.
  for (const event of trackedEvents) merged.set(keyOf(event), event);

  const events = [...merged.values()]
    .sort(eventSort)
    .map(({ sortTime, ...event }) => event);

  const payload = {
    generatedAt: new Date().toISOString(),
    ...weatherData,
    events: events.length ? events : fallback.events,
    days,
    windowDays: WINDOW_DAYS,
    trackedSeries: cards,
    sources,
  };

  await mkdir(new URL("../public", import.meta.url), { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    `Wrote ${OUT_FILE.pathname} with ${payload.events.length} events across ` +
      `${days.length} days (${days.map((day) => `${day.weekday} ${day.count}`).join(", ")}).`,
  );
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
