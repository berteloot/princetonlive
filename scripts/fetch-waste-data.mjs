import { mkdir, writeFile } from "node:fs/promises";
import { inflateRawSync } from "node:zlib";

const OUT_FILE = new URL("../public/waste-data.json", import.meta.url);
const trashStreetUrl =
  "https://www.princetonnj.gov/DocumentCenter/View/969/Trash-Collection-Schedule-by-Street-PDF";
const yardSectionUrl =
  "https://www.princetonnj.gov/DocumentCenter/View/1018/Residential-Brush-and-Leaf-Collection-Sections-PDF";
const wasteMailerUrl =
  "https://www.princetonnj.gov/DocumentCenter/View/22550/2026-Waste-Mailer---English";

const yardSchedule2026 = {
  "1": {
    branchAndLogs: ["January", "March 16", "April 27", "June 15", "August 10", "September 8", "October 5"],
    looseLeaves: ["March 23", "October 19", "November 16", "December 14"],
    baggedLeaves: ["May 4", "October 12", "October 19", "October 26", "November 2", "November 9", "November 16", "November 30", "December 7"],
  },
  "2": {
    branchAndLogs: ["January", "March 16", "April 27", "June 15", "August 17", "September 14", "October 5"],
    looseLeaves: ["March 23", "October 26", "November 30", "December 14"],
    baggedLeaves: ["May 4", "October 13", "October 20", "October 27", "November 3", "November 10", "November 17", "December 1", "December 8"],
  },
  "3": {
    branchAndLogs: ["January", "March 16", "April 27", "June 15", "August 24", "September 21", "October 5"],
    looseLeaves: ["March 23", "November 2", "December 7", "December 14"],
    baggedLeaves: ["May 4", "October 14", "October 21", "October 28", "November 4", "November 12", "November 18", "December 2", "December 9"],
  },
  "4": {
    branchAndLogs: ["January", "March 16", "April 27", "June 15", "August 31", "September 28", "October 5"],
    looseLeaves: ["March 23", "October 12", "November 9", "December 14"],
    baggedLeaves: ["May 4", "October 15", "October 22", "October 29", "November 5", "November 12", "November 19", "December 3", "December 10"],
  },
  "5": {
    branchAndLogs: ["January", "March 16", "April 27", "June 15", "August 17", "August 31", "September 14", "September 28", "October 5"],
    looseLeaves: ["March 23", "October 12", "October 26", "November 9", "November 30", "December 14"],
    baggedLeaves: ["May 4", "October 13", "October 20", "October 27", "November 3", "November 10", "November 17", "December 1", "December 8"],
  },
};

function readUInt(buffer, offset, bytes) {
  if (bytes === 2) return buffer.readUInt16LE(offset);
  if (bytes === 4) return buffer.readUInt32LE(offset);
  throw new Error(`Unsupported integer width ${bytes}`);
}

function findZipEntry(buffer, targetName) {
  let eocdOffset = -1;
  for (let index = buffer.length - 22; index >= Math.max(0, buffer.length - 65557); index -= 1) {
    if (buffer.readUInt32LE(index) === 0x06054b50) {
      eocdOffset = index;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error("Could not find DOCX central directory.");

  const centralDirectoryOffset = readUInt(buffer, eocdOffset + 16, 4);
  const centralDirectorySize = readUInt(buffer, eocdOffset + 12, 4);
  let offset = centralDirectoryOffset;
  const end = centralDirectoryOffset + centralDirectorySize;

  while (offset < end) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("Unexpected DOCX central directory header.");
    }
    const compressionMethod = readUInt(buffer, offset + 10, 2);
    const compressedSize = readUInt(buffer, offset + 20, 4);
    const filenameLength = readUInt(buffer, offset + 28, 2);
    const extraLength = readUInt(buffer, offset + 30, 2);
    const commentLength = readUInt(buffer, offset + 32, 2);
    const localHeaderOffset = readUInt(buffer, offset + 42, 4);
    const filename = buffer.toString("utf8", offset + 46, offset + 46 + filenameLength);

    if (filename === targetName) {
      if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
        throw new Error(`Unexpected local header for ${targetName}.`);
      }
      const localFilenameLength = readUInt(buffer, localHeaderOffset + 26, 2);
      const localExtraLength = readUInt(buffer, localHeaderOffset + 28, 2);
      const dataStart = localHeaderOffset + 30 + localFilenameLength + localExtraLength;
      const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
      if (compressionMethod === 0) return compressed;
      if (compressionMethod === 8) return inflateRawSync(compressed);
      throw new Error(`Unsupported DOCX compression method ${compressionMethod}.`);
    }

    offset += 46 + filenameLength + extraLength + commentLength;
  }

  throw new Error(`Could not find ${targetName} in DOCX.`);
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function normalizeStreet(street) {
  return street
    .toUpperCase()
    .replace(/\bAVENUE\b/g, "AVE")
    .replace(/\bDRIVE\b/g, "DR")
    .replace(/\bSTREET\b/g, "ST")
    .replace(/\bROAD\b/g, "RD")
    .replace(/\bLANE\b/g, "LN")
    .replace(/\bCOURT\b/g, "CT")
    .replace(/\bCIRCLE\b/g, "CIR")
    .replace(/\bPLACE\b/g, "PL")
    .replace(/\s+/g, " ")
    .trim();
}

function extractRowsFromDocx(buffer) {
  const documentXml = findZipEntry(buffer, "word/document.xml").toString("utf8");
  return [...documentXml.matchAll(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g)]
    .map(([rowXml]) =>
      [...rowXml.matchAll(/<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g)].map(([cellXml]) =>
        [...cellXml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
          .map(([, text]) => decodeXml(text))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim(),
      ),
    )
    .filter((cells) => cells.length >= 2);
}

async function fetchDocxRows(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not fetch ${url}: ${response.status}`);
  return extractRowsFromDocx(Buffer.from(await response.arrayBuffer()));
}

// The two municipal documents cut the same street into different blocks. The trash
// schedule says "WITHERSPOON STREET (WIGGINS TO FRANKLIN)" while the brush schedule
// says "WITHERSPOON STREET (Nassau St. to Clay St.)". Joining on the whole string
// therefore never matched on any segmented street, and the resident saw "Not listed"
// on Nassau, Witherspoon, Harrison and Library Place. Join on the base street name
// instead and keep each document's blocks as sub-entries.
function splitStreet(raw) {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const match = cleaned.match(/^([^(]+?)\s*\((.+)\)\s*$/);
  if (match) {
    return { base: match[1].trim(), segment: match[2].replace(/\s+/g, " ").trim() };
  }
  return { base: cleaned, segment: "" };
}

function parseEntries(rows, valuePattern) {
  const byBase = new Map();
  for (const [street, value] of rows) {
    if (!street || !value || /STREET NAME/i.test(street)) continue;
    if (!valuePattern.test(value)) continue;
    const { base, segment } = splitStreet(street);
    const key = normalizeStreet(base);
    if (!key) continue;
    if (!byBase.has(key)) byBase.set(key, { base, entries: [] });
    byBase.get(key).entries.push({ segment, value: value.trim() });
  }
  return byBase;
}

// One value if every block agrees (or there is only one), otherwise a marker telling
// the resident the answer depends on their block.
function resolve(record) {
  if (!record || !record.entries.length) return { value: "Not listed", varies: false };
  const distinct = [...new Set(record.entries.map((entry) => entry.value.toUpperCase()))];
  if (distinct.length === 1) return { value: record.entries[0].value, varies: false };
  return { value: "Varies by block", varies: true };
}

const [trashRows, yardRows] = await Promise.all([
  fetchDocxRows(trashStreetUrl),
  fetchDocxRows(yardSectionUrl),
]);

const trashByStreet = parseEntries(trashRows, /^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|NOT INCLUDED)$/i);
const yardByStreet = parseEntries(yardRows, /^(1|2|3|4|5|NOT INCLUDED)$/i);
const allStreetKeys = new Set([...trashByStreet.keys(), ...yardByStreet.keys()]);

const streets = [...allStreetKeys]
  .map((key) => {
    const trash = trashByStreet.get(key);
    const yard = yardByStreet.get(key);
    const trashResolved = resolve(trash);
    const yardResolved = resolve(yard);
    return {
      street: trash?.base ?? yard?.base ?? key,
      normalized: key,
      trashDay: trashResolved.value,
      yardSection: yardResolved.value,
      trashVariesByBlock: trashResolved.varies,
      yardVariesByBlock: yardResolved.varies,
      // Blocks are carried through so the page can show which block is which when the
      // street-level answer is not single-valued.
      trashBlocks: (trash?.entries ?? []).filter((entry) => entry.segment),
      yardBlocks: (yard?.entries ?? []).filter((entry) => entry.segment),
    };
  })
  .sort((a, b) => a.street.localeCompare(b.street));

const completeCount = streets.filter(
  (item) => item.trashDay !== "Not listed" && item.yardSection !== "Not listed",
).length;

const payload = {
  generatedAt: new Date().toISOString(),
  source: "Municipality of Princeton public waste documents",
  streetCount: streets.length,
  completeStreetCount: completeCount,
  yardScheduleYear: 2026,
  recycleCoach: {
    cityId: "3320",
    projectId: "537",
    districtId: "PR",
    pluginToken: "TVRJek53PT0=",
    url: "https://recyclecoach.com/cities/usa-nj-municipality-of-princeton/",
    citySearchUrl: "https://api-city.recyclecoach.com/city/search?term=Princeton%2C%20New%20Jersey%2C%20USA",
    apiNote:
      "Recycle Coach city lookup is publicly reachable, but PrincetonLive uses official municipal documents for local street lookup and links/embeds Recycle Coach for live address-specific reminders.",
  },
  rules: {
    trash:
      "Place Princeton garbage carts no earlier than 7 PM the day before collection and no later than 7 AM on collection day. Central Business District timing differs.",
    bulk:
      "Bulk waste is collected Wednesdays by reservation only. Reserve by Sunday 11:59 PM; maximum two eligible items per week, each up to 50 pounds.",
    yard:
      "Leaf, branch, and log collection begins on the listed section date. Put material out by 7 AM on the start date, no more than 7 days prior.",
    recycling:
      "Recycling is handled through Mercer County Improvement Authority; use Recycle Coach for address-specific recycling dates and reminders.",
    notIncluded:
      "Municipal garbage collection covers buildings of one to four dwelling units. Larger buildings and most commercial properties arrange private collection, which is why some streets are listed as not included.",
  },
  yardSchedule2026,
  streets,
  sources: [
    { name: "Princeton garbage collection", url: "https://www.princetonnj.gov/1359/Trash-Collection" },
    { name: "Garbage collection schedule by street", url: trashStreetUrl },
    { name: "Leaf, branch, and log collection", url: "https://www.princetonnj.gov/450/Leaf-Branch-and-Log-Collection" },
    { name: "Residential brush and leaf collection sections", url: yardSectionUrl },
    { name: "2026 waste collection brochure", url: wasteMailerUrl },
    { name: "Recycle Coach Princeton", url: "https://recyclecoach.com/cities/usa-nj-municipality-of-princeton/" },
  ],
};

await mkdir(new URL("../public", import.meta.url), { recursive: true });
await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${OUT_FILE.pathname} with ${streets.length} Princeton street waste records.`);
