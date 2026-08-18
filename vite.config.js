import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// index.html carried a hand-maintained datePublished/dateModified pair in its JSON-LD.
// A frozen date keeps asserting freshness the site no longer has, and nobody remembers
// to bump it. Stamp it at build time instead. SOURCE_DATE_EPOCH is honored so a
// reproducible build can pin the value.
const buildDate = process.env.SOURCE_DATE_EPOCH
  ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000)
  : new Date();
const today = buildDate.toISOString().slice(0, 10);

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
  } catch {
    return null;
  }
}

// The crawlable fallback inside #root is what a non-rendering crawler and most AI
// retrieval sees. It used to be 508 words describing what the site does, with no
// Princeton fact in it: an assistant could learn what PrincetonLive is and had nothing
// it could cite. This regenerates it from the same JSON the app renders, so the facts
// are real and cannot drift from the page.
function buildFallback() {
  const waste = readJson("./public/waste-data.json");
  const crime = readJson("./public/crime-data.json");
  const garden = readJson("./public/garden-theatre.json");

  const streetCount = waste?.streetCount ?? 0;
  const dayCounts = {};
  for (const street of waste?.streets ?? []) {
    const day = (street.trashDay || "").toUpperCase();
    if (["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].includes(day)) {
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    }
  }
  const dayLine = Object.entries(dayCounts)
    .map(([day, n]) => `${day.charAt(0)}${day.slice(1).toLowerCase()} ${n} streets`)
    .join(", ");

  const examples = (waste?.streets ?? [])
    .filter((s) => ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].includes((s.trashDay || "").toUpperCase()))
    .slice(0, 8)
    .map((s) => `${esc(s.street)} is collected on ${esc(s.trashDay.charAt(0) + s.trashDay.slice(1).toLowerCase())}`)
    .join(". ");

  const crimeLine = crime
    ? `In ${crime.year} Princeton recorded ${crime.princeton["violent-crime"].count} violent offenses and ${crime.princeton["property-crime"].count} property offenses, a rate of ${crime.princeton["violent-crime"].rate} and ${crime.princeton["property-crime"].rate} per 100,000 residents. The national rates that year were ${crime.national["violent-crime"].rate} and ${crime.national["property-crime"].rate}, and New Jersey's were ${crime.newJersey["violent-crime"].rate} and ${crime.newJersey["property-crime"].rate}.`
    : "";

  const films = (garden?.nowPlaying ?? []).slice(0, 6).map((f) => esc(f.title)).join(", ");
  const gardenLine = films
    ? `The Garden Theatre at 160 Nassau Street is currently showing ${films}.`
    : "";

  return `
      <main>
        <header>
          <p>Princeton, NJ resident guide</p>
          <h1>PrincetonLive: Princeton, NJ resident guide</h1>
          <p>Garbage day by street, weather alerts, public events, transit, town services, and neighborhood data for Princeton, New Jersey.</p>
        </header>

        <section>
          <h2>What PrincetonLive answers</h2>
          <p>PrincetonLive is an independent daily guide for residents of Princeton, New Jersey. It publishes the municipal garbage collection day for ${streetCount} Princeton streets, the current National Weather Service alert state for the town, showtimes at the Garden Theatre, opening hours for Princeton Public Library, and Census block-group data for the municipality. It is not affiliated with Princeton University or the Municipality of Princeton, and it links to the official source for every figure.</p>
        </section>

        <section>
          <h2>Princeton garbage collection day by street</h2>
          <p>Princeton collects household garbage on a fixed weekday determined by your street address. Across ${streetCount} streets in the municipal schedule the split is ${esc(dayLine)}. ${examples}. Streets that span two collection routes, including Nassau Street and Witherspoon Street, have a different day for each block. Carts go out no earlier than 7 PM the day before collection and no later than 7 AM on collection day. Bulk waste is collected on Wednesdays by reservation only, reserved by Sunday at 11:59 PM, with a maximum of two items per week each up to 50 pounds. Recycling is handled through the Mercer County Improvement Authority. The full street list is published at /guides/princeton-garbage-schedule.html.</p>
        </section>

        <section>
          <h2>Princeton parking rules</h2>
          <p>There is no overnight parking on any former Princeton Borough street between 2 and 6 am, and not every street carries a sign saying so. Downtown meters are payable 9 am to 8 pm Monday to Thursday, 9 am to 9 pm Friday and Saturday, and 1 pm to 8 pm Sunday. The 90-minute pay stations begin at 10 am. Meter rates rise on 14 September 2026, with 30-minute spaces going from $1.00 to $1.25 and 90-minute zones from $3.00 to $3.50.</p>
        </section>

        <section>
          <h2>Princeton Public Library and schools</h2>
          <p>Princeton Public Library is at 65 Witherspoon Street and opens 9 am to 8 pm Monday to Thursday, 9 am to 5 pm Friday and Saturday, and noon to 5 pm Sunday. A card gets residents study-room reservations, museum passes, digital media, and Spring Street Garage validation at the Sands Library Building. The first day of school for students in Princeton Public Schools is Monday 31 August 2026.</p>
        </section>

        <section>
          <h2>Getting around Princeton</h2>
          <p>The Dinky runs from 152 Alexander Street to Princeton Junction, where NJ Transit's Northeast Corridor trains continue to New York Penn Station and Trenton. For Philadelphia, residents change at Trenton for SEPTA. The Princeton Loop is the municipal free bus, and TigerTransit, walking, and biking cover most local trips.</p>
        </section>

        <section>
          <h2>Reported crime in Princeton</h2>
          <p>${crimeLine} Figures come from the FBI Crime Data Explorer as submitted by Princeton Police Department, which reports under ORI NJ0111000. Princeton is a small town, so a handful of incidents moves the rate noticeably between years. PrincetonLive publishes crime at municipal level only and does not shade neighborhoods or block groups by crime.</p>
        </section>

        <section>
          <h2>Public events and culture in Princeton</h2>
          <p>PrincetonLive merges the public calendars of Princeton University, Princeton Public Library, and the Municipality of Princeton, alongside the National Weather Service forecast and alerts. ${gardenLine} The Princeton University Art Museum reopened with free admission for everyone.</p>
        </section>

        <section>
          <h2>Neighborhood data for Princeton, NJ</h2>
          <p>The neighborhood map uses public aggregate data only. It combines Census block-group geometry from TIGERweb, ACS estimates, and official election results for the municipality. It does not publish individual voter, household, or address-level records, and the areas shown are Census block groups rather than named Princeton neighborhoods.</p>
        </section>

        <section>
          <h2>PrincetonLive resident guides</h2>
          <p>Stable pages for recurring questions: the garbage schedule by street, moving to Princeton, Princeton Public Library benefits, getting around Princeton, public events and culture, civic data, and resident services. Read who maintains the site at /about.html and the disclaimer at /legal.html.</p>
        </section>

        <section>
          <h2>PrincetonLive FAQ</h2>
          <h3>What is PrincetonLive?</h3>
          <p>An independent daily operating guide for Princeton, New Jersey residents and new arrivals, maintained by Princeton resident Stan Berteloot.</p>
          <h3>Is PrincetonLive official?</h3>
          <p>No. It has no affiliation with Princeton University, the Municipality of Princeton, Princeton Public Library, or Princeton Public Schools, and it links to official sources for authoritative details.</p>
          <h3>What day is garbage collected in Princeton?</h3>
          <p>It depends on your street. PrincetonLive lists the collection day for ${streetCount} Princeton streets, and some long streets differ block by block.</p>
          <h3>What data sources does PrincetonLive use?</h3>
          <p>National Weather Service forecasts and alerts, Princeton University public events, Princeton Public Library events, the municipal calendar, Municipality of Princeton waste documents, US Census TIGERweb and ACS, the FBI Crime Data Explorer, and the Garden Theatre ticketing system.</p>
          <h3>Does the neighborhood map show individual people?</h3>
          <p>No. It uses aggregate public data and avoids individual household, voter, and address-level records.</p>
        </section>
      </main>
`;
}

function stampAndFill() {
  return {
    name: "stamp-and-fill",
    transformIndexHtml(html) {
      let out = html
        .replace(/"datePublished":\s*"\d{4}-\d{2}-\d{2}"/g, `"datePublished": "${today}"`)
        .replace(/"dateModified":\s*"\d{4}-\d{2}-\d{2}"/g, `"dateModified": "${today}"`);
      const start = out.indexOf("<!-- fallback:start -->");
      const end = out.indexOf("<!-- fallback:end -->");
      if (start !== -1 && end !== -1) {
        out =
          out.slice(0, start + "<!-- fallback:start -->".length) +
          buildFallback() +
          out.slice(end);
      }
      return out;
    },
  };
}

export default defineConfig({
  plugins: [react(), stampAndFill()],
});
