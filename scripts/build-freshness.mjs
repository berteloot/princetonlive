// Publishes a machine-readable freshness record so Pierre can alert on the one class of
// content that cannot refresh itself: facts a human read off an official page.
//
// Everything else on this site re-fetches every three hours. These do not, so without a
// check they would rot silently and the site would state a superseded parking rate or a
// school date that has passed as though it were upcoming.

import { mkdir, readFile, writeFile } from "node:fs/promises";

const rules = JSON.parse(
  await readFile(new URL("../src/data/local-rules.json", import.meta.url), "utf8"),
);
const waste = JSON.parse(
  await readFile(new URL("../public/waste-data.json", import.meta.url), "utf8"),
);

const now = new Date();
const days = (iso) => Math.round((new Date(`${iso}T12:00:00Z`) - now) / 86400000);

const items = [
  {
    name: "Verified local rules review",
    detail: "Parking, school and library facts were last read off the official pages by hand.",
    dueInDays: days(rules.reviewBy),
    source: rules.parking.url,
  },
  {
    name: "Yard waste schedule year",
    detail: `The leaf and brush dates are for calendar ${waste.yardScheduleYear} and must be replaced for the next year.`,
    dueInDays: days(`${waste.yardScheduleYear}-12-15`),
    source: "https://www.princetonnj.gov/450/Leaf-Branch-and-Log-Collection",
  },
  {
    name: "School year start",
    detail: `Term start for ${rules.schools.schoolYear}. Replace with the next school year's calendar once published.`,
    dueInDays: days(rules.schools.termStart),
    source: rules.schools.url,
  },
];

const overdue = items.filter((i) => i.dueInDays <= 0);
const payload = {
  generatedAt: now.toISOString(),
  // The monitor watches this. Anything at or below zero needs a human to re-read a page.
  minDaysUntilReview: Math.min(...items.map((i) => i.dueInDays)),
  overdueCount: overdue.length,
  ok: overdue.length === 0,
  items,
};

await mkdir(new URL("../public", import.meta.url), { recursive: true });
await writeFile(
  new URL("../public/freshness.json", import.meta.url),
  `${JSON.stringify(payload, null, 2)}\n`,
);
console.log(
  `Wrote freshness.json: ${overdue.length} overdue, next review in ${payload.minDaysUntilReview} days.`,
);
