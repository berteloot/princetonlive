// Town-level crime rates for Princeton, benchmarked against New Jersey and the nation.
//
// Deliberately NOT mapped to block groups. No public crime dataset exists at that
// granularity for a town this size, and neighborhood-level crime shading is a known
// harm: it moves property values, it tracks race and income in ways that entrench
// historic redlining, and with roughly 30,000 residents the year-to-year counts are so
// small that two incidents would swing a polygon from "safest" to "worst". A single
// municipal figure against real benchmarks is the honest version of this question.
//
// Source: FBI Crime Data Explorer API (UCR/NIBRS), which is what Princeton Police
// Department reports into via the New Jersey State Police.
//
// Princeton Police Department ORI is NJ0111000. Princeton University has its own
// department (NJ0115000) covering campus, and it is reported separately here rather
// than folded in, because the two cover different populations and areas.

import { mkdir, readFile, writeFile } from "node:fs/promises";

const OUT_FILE = new URL("../public/crime-data.json", import.meta.url);
const BASE = "https://api.usa.gov/crime/fbi/cde";
// DEMO_KEY works but is rate limited. Set FBI_CRIME_API_KEY (free, api.data.gov/signup)
// for a real key.
const API_KEY = process.env.FBI_CRIME_API_KEY || "DEMO_KEY";

const PRINCETON_ORI = "NJ0111000";
const UNIVERSITY_ORI = "NJ0115000";
const OFFENSES = ["violent-crime", "property-crime"];
// Crime data is annual and revised slowly. Refetching every few hours would waste the
// rate limit and change nothing.
const MAX_AGE_DAYS = 7;

// DEMO_KEY allows only a handful of requests per hour, so a 429 is expected on the
// shared key and is worth waiting out rather than failing the build.
async function getJson(url, attempt = 1) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (response.status === 429 && attempt <= 4) {
    const waitMs = 20000 * attempt;
    console.log(`  rate limited, retrying in ${waitMs / 1000}s (attempt ${attempt} of 4)`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return getJson(url, attempt + 1);
  }
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.json();
}

function sumYear(monthly, year) {
  let total = 0;
  let months = 0;
  for (const [key, value] of Object.entries(monthly || {})) {
    if (key.endsWith(`-${year}`) && typeof value === "number") {
      total += value;
      months += 1;
    }
  }
  return { total, months };
}

function pickSeries(block, matcher) {
  const entries = Object.entries(block || {});
  const hit = entries.find(([name]) => matcher.test(name));
  return hit ? hit[1] : null;
}

// Population basis: participated_population is the population actually covered by
// reporting agencies in that month. Using it for all three levels keeps the comparison
// like-for-like, because state and national offence counts only include agencies that
// reported.
function populationFor(payload, matcher, year) {
  const participated = pickSeries(payload.populations?.participated_population, matcher);
  const full = pickSeries(payload.populations?.population, matcher);
  const series = participated || full;
  if (!series) return null;
  const values = Object.entries(series)
    .filter(([key]) => key.endsWith(`-${year}`))
    .map(([, value]) => value)
    .filter((value) => typeof value === "number" && value > 0);
  if (!values.length) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function rate(count, population) {
  if (!population) return null;
  return Number(((count / population) * 100000).toFixed(1));
}

async function fetchScope(path, matcher, year) {
  const result = {};
  for (const offense of OFFENSES) {
    const payload = await getJson(
      `${BASE}/summarized/${path}/${offense}?from=01-${year}&to=12-${year}&API_KEY=${API_KEY}`,
    );
    const offences = pickSeries(payload.offenses?.actuals, new RegExp(`${matcher.source}.*Offenses`, "i"));
    const { total, months } = sumYear(offences, year);
    const population = populationFor(payload, matcher, year);
    result[offense] = { count: total, monthsReported: months, population, rate: rate(total, population) };
  }
  return result;
}

// Use the newest year where Princeton reported all twelve months.
async function latestCompleteYear() {
  const thisYear = new Date().getUTCFullYear();
  for (let year = thisYear; year >= thisYear - 4; year -= 1) {
    const payload = await getJson(
      `${BASE}/summarized/agency/${PRINCETON_ORI}/property-crime?from=01-${year}&to=12-${year}&API_KEY=${API_KEY}`,
    );
    const offences = pickSeries(payload.offenses?.actuals, /Princeton.*Offenses/i);
    const { months } = sumYear(offences, year);
    if (months >= 12) return year;
  }
  return null;
}

async function isFresh() {
  try {
    const existing = JSON.parse(await readFile(OUT_FILE, "utf8"));
    const ageDays = (Date.now() - new Date(existing.generatedAt).getTime()) / 86400000;
    return ageDays < MAX_AGE_DAYS && Boolean(existing.year);
  } catch {
    return false;
  }
}

if (await isFresh()) {
  console.log(`crime-data.json is under ${MAX_AGE_DAYS} days old. Skipping refresh.`);
  process.exit(0);
}

const year = await latestCompleteYear();
if (!year) {
  console.error("No complete reporting year found for Princeton. Keeping the existing file.");
  process.exit(1);
}

const [princeton, university, state, national] = await Promise.all([
  fetchScope(`agency/${PRINCETON_ORI}`, /Princeton\s+Police/i, year),
  fetchScope(`agency/${UNIVERSITY_ORI}`, /Princeton University/i, year).catch(() => null),
  fetchScope("state/NJ", /New Jersey/i, year),
  fetchScope("national", /United States/i, year),
]);

const payload = {
  generatedAt: new Date().toISOString(),
  year,
  source: "FBI Crime Data Explorer (Uniform Crime Reporting), as submitted by Princeton Police Department",
  basis:
    "Rates are offences per 100,000 residents for the calendar year shown, using the population covered by reporting agencies so the three levels compare like for like.",
  caveat:
    "Princeton is a small town, so a handful of incidents moves the rate noticeably from one year to the next. Treat a single year as a rough indicator and read the trend instead. These counts cover the municipal police department only.",
  princeton,
  princetonUniversity: university,
  newJersey: state,
  national,
  sources: [
    { name: "FBI Crime Data Explorer: Princeton Police Department", url: `https://cde.ucr.cjis.gov/LATEST/webapp/#/pages/le/summary?ori=${PRINCETON_ORI}` },
    { name: "FBI Crime Data Explorer", url: "https://cde.ucr.cjis.gov/" },
    { name: "New Jersey State Police Uniform Crime Reporting", url: "https://www.nj.gov/njsp/ucr/uniform-crime-reports.shtml" },
    { name: "Princeton annual and monthly police reports", url: "https://www.princetonnj.gov/396/Annual-Monthly-Police-Reports" },
  ],
};

await mkdir(new URL("../public", import.meta.url), { recursive: true });
await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`);
console.log(
  `Wrote crime-data.json for ${year}: Princeton violent ${princeton["violent-crime"].rate}/100k, property ${princeton["property-crime"].rate}/100k.`,
);
