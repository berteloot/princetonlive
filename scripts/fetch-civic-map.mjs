import { mkdir, readFile, writeFile } from "node:fs/promises";

const OUT_FILE = new URL("../public/civic-map.json", import.meta.url);
const PRINCETON_AREA_BOUNDS = {
  minLat: 40.28,
  maxLat: 40.42,
  minLon: -74.75,
  maxLon: -74.6,
};
const SVG_WIDTH = 100;
const SVG_HEIGHT = 72;
const SVG_PAD = 2.5;

const geometryUrl =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/7/query?where=STATE%3D%2734%27%20AND%20COUNTY%3D%27021%27&outFields=GEOID,BASENAME,NAME,CENTLAT,CENTLON&returnGeometry=true&outSR=4326&f=geojson";
const censusReporterUrl =
  "https://api.censusreporter.org/1.0/data/show/latest?table_ids=B19013,B01001&geo_ids=140%7C05000US34021";
const tractCountUrl =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/7/query?where=1%3D1&returnCountOnly=true&f=json";
const censusReporterBase = "https://api.censusreporter.org/1.0/data/show";
const censusReporterHome = "https://api.censusreporter.org/";
const fecNationalResultUrl = "https://www.fec.gov/documents/5644/2024presgeresults.pdf";
const preferredCensusAcsYear = process.env.CENSUS_ACS_YEAR?.trim();
const censusApiKey = process.env.CENSUS_API_KEY?.trim();
const censusApiDocsUrl = "https://www.census.gov/data/developers/data-sets/acs-5year.html";

const officialChildAgeKeys = [
  "B01001_003E",
  "B01001_004E",
  "B01001_005E",
  "B01001_006E",
  "B01001_027E",
  "B01001_028E",
  "B01001_029E",
  "B01001_030E",
];

const officialCensusGet = [
  "NAME",
  "B19013_001E",
  "B01001_001E",
  ...officialChildAgeKeys,
].join(",");

const childAgeKeys = [
  "B01001003",
  "B01001004",
  "B01001005",
  "B01001006",
  "B01001027",
  "B01001028",
  "B01001029",
  "B01001030",
];

const princetonVoting = {
  year: 2024,
  level: "Municipality",
  contest: "U.S. President",
  democratCandidate: "Kamala D. Harris",
  republicanCandidate: "Donald J. Trump",
  democratVotes: 10292,
  republicanVotes: 2029,
  otherVotes: 373,
  sourceName: "NJ Division of Elections official Mercer County presidential results",
  sourceUrl:
    "https://www.nj.gov/state/elections/assets/pdf/election-results/2024/2024-official-general-results-president-mercer.pdf",
};

const nationalVoting = {
  year: 2024,
  level: "United States",
  contest: "U.S. President",
  democratCandidate: "Kamala D. Harris",
  republicanCandidate: "Donald J. Trump",
  democratVotes: 75017613,
  republicanVotes: 77302580,
  totalVotes: 155238302,
  sourceName: "FEC official 2024 presidential general election results",
  sourceUrl: fecNationalResultUrl,
};

const votingTotal =
  princetonVoting.democratVotes + princetonVoting.republicanVotes + princetonVoting.otherVotes;
const votingSummary = {
  ...princetonVoting,
  totalVotes: votingTotal,
  democratShare: princetonVoting.democratVotes / votingTotal,
  republicanShare: princetonVoting.republicanVotes / votingTotal,
  otherShare: princetonVoting.otherVotes / votingTotal,
  margin: (princetonVoting.democratVotes - princetonVoting.republicanVotes) / votingTotal,
  nationalBenchmark: {
    ...nationalVoting,
    democratShare: nationalVoting.democratVotes / nationalVoting.totalVotes,
    republicanShare: nationalVoting.republicanVotes / nationalVoting.totalVotes,
    margin: (nationalVoting.democratVotes - nationalVoting.republicanVotes) / nationalVoting.totalVotes,
  },
};

const fallback = {
  generatedAt: null,
  release: "Civic map unavailable",
  privacy:
    "Neighborhood-scale public data only. PrincetonLive does not publish individual voter, household, or address-level records.",
  viewBox: `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`,
  features: [],
  highlights: [],
  benchmarks: {},
  voting: {
    status: "municipality-level",
    title: "Voting layer",
    summary:
      "The map reflects Princeton's official 2024 municipal presidential result. Neighborhood-level Republican/Democrat shading should only be added after official district totals are safely joined to public district boundaries.",
    result: votingSummary,
    links: [
      {
        label: "NJ official Princeton presidential result",
        url: princetonVoting.sourceUrl,
      },
      {
        label: "Mercer County archived election results",
        url: "https://www.mercercounty.org/government/county-clerk-/elections/archived-election-results",
      },
      {
        label: "Princeton elections",
        url: "https://www.princetonnj.gov/192/Elections",
      },
    ],
  },
  sources: [
    {
      name: "U.S. Census TIGERweb",
      url: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer",
    },
    {
      name: "U.S. Census API / ACS 5-year",
      url: censusApiDocsUrl,
    },
    {
      name: "Census Reporter API / ACS 5-year fallback",
      url: censusReporterHome,
    },
    {
      name: "U.S. Census TIGERweb national tract count",
      url: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/7",
    },
    {
      name: "FEC official 2024 presidential general election results",
      url: fecNationalResultUrl,
    },
    {
      name: "Mercer County archived election results",
      url: "https://www.mercercounty.org/government/county-clerk-/elections/archived-election-results",
    },
    {
      name: "NJ Division of Elections official 2024 Mercer presidential results",
      url: princetonVoting.sourceUrl,
    },
    {
      name: "Princeton elections",
      url: "https://www.princetonnj.gov/192/Elections",
    },
  ],
};

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "PrincetonLive/0.1 (https://princetonlive.berteloot.org)",
      Accept: "application/geo+json, application/json, */*",
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return number;
}

function sumEstimates(estimate, keys) {
  const values = keys.map((key) => numberOrNull(estimate[key])).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function sumRowValues(row, keys) {
  const values = keys.map((key) => numberOrNull(row[key])).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function reporterTractStats(data, geoid) {
  const key = `14000US${geoid}`;
  const entry = data.data?.[key];
  const age = entry?.B01001?.estimate || {};
  const income = entry?.B19013?.estimate?.B19013001;
  const children = sumEstimates(age, childAgeKeys);
  const population = numberOrNull(age.B01001001);

  return {
    income: numberOrNull(income),
    population,
    children,
    childShare: population && children !== null ? children / population : null,
  };
}

function candidateAcsYears() {
  if (preferredCensusAcsYear) return [preferredCensusAcsYear];
  const currentYear = new Date().getUTCFullYear();
  return Array.from({ length: 6 }, (_, index) => String(currentYear - 1 - index));
}

function officialRelease(acsYear) {
  const year = Number(acsYear);
  return {
    id: `acs${acsYear}_5yr`,
    name: `ACS ${acsYear} 5-year`,
    years: Number.isFinite(year) ? `${year - 4}-${year}` : null,
  };
}

function censusApiUrl(acsYear, params, { includeKey = false } = {}) {
  const url = new URL(`https://api.census.gov/data/${acsYear}/acs/acs5`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  if (includeKey && censusApiKey) url.searchParams.set("key", censusApiKey);
  return url.toString();
}

function parseCensusRows(rows) {
  if (!Array.isArray(rows) || rows.length < 2) {
    throw new Error("Census API returned no data rows");
  }

  const [headers, ...dataRows] = rows;
  return dataRows.map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index]])),
  );
}

function officialStatsFromRow(row) {
  const children = sumRowValues(row, officialChildAgeKeys);
  const population = numberOrNull(row.B01001_001E);

  return {
    income: numberOrNull(row.B19013_001E),
    population,
    children,
    childShare: population && children !== null ? children / population : null,
  };
}

function buildBenchmarks({ release, nationalStats, nationalTracts, sourceName, sourceUrl }) {
  return {
    income: {
      label: "U.S. median household income",
      value: nationalStats.income,
      unit: "currency",
      release: release.name,
      sourceName,
      sourceUrl,
    },
    children: {
      label: "U.S. average residents under 18 per census tract",
      value:
        nationalStats.children !== null && nationalTracts ? nationalStats.children / nationalTracts : null,
      unit: "number",
      release: release.name,
      sourceName: `${sourceName} + TIGERweb tract count`,
      sourceUrl,
    },
    childShare: {
      label: "U.S. share of population under 18",
      value:
        nationalStats.population && nationalStats.children !== null
          ? nationalStats.children / nationalStats.population
          : null,
      unit: "percent",
      release: release.name,
      sourceName,
      sourceUrl,
    },
    voting: {
      label: "U.S. 2024 presidential popular-vote margin",
      value: votingSummary.nationalBenchmark.margin,
      unit: "margin",
      release: "FEC official 2024 result",
      sourceName: nationalVoting.sourceName,
      sourceUrl: nationalVoting.sourceUrl,
    },
  };
}

async function fetchOfficialCensusSnapshot() {
  if (!censusApiKey) throw new Error("CENSUS_API_KEY not set");

  let lastError = null;
  for (const acsYear of candidateAcsYears()) {
    try {
      return await fetchOfficialCensusSnapshotForYear(acsYear);
    } catch (error) {
      lastError = error;
      if (preferredCensusAcsYear) break;
    }
  }

  throw new Error(`no official ACS release succeeded${lastError ? ` (${lastError.message})` : ""}`);
}

async function fetchOfficialCensusSnapshotForYear(acsYear) {
  const tractParams = {
    get: officialCensusGet,
    for: "tract:*",
    in: "state:34 county:021",
  };
  const nationalParams = {
    get: officialCensusGet,
    for: "us:1",
  };
  const tractUrl = censusApiUrl(acsYear, tractParams, { includeKey: true });
  const nationalUrl = censusApiUrl(acsYear, nationalParams, { includeKey: true });
  const publicNationalUrl = censusApiUrl(acsYear, nationalParams);
  const [tractRows, nationalRows, tractCount] = await Promise.all([
    fetchJson(tractUrl),
    fetchJson(nationalUrl),
    fetchJson(tractCountUrl),
  ]);
  const statsByGeoid = Object.fromEntries(
    parseCensusRows(tractRows).map((row) => [
      `${row.state}${row.county}${row.tract}`,
      officialStatsFromRow(row),
    ]),
  );
  const nationalStats = officialStatsFromRow(parseCensusRows(nationalRows)[0]);
  const release = officialRelease(acsYear);
  const sourceName = `U.S. Census API / ${release.name}`;

  return {
    release,
    sourceName,
    sourceUrl: publicNationalUrl,
    statsForGeoid: (geoid) =>
      statsByGeoid[geoid] || {
        income: null,
        population: null,
        children: null,
        childShare: null,
      },
    benchmarks: buildBenchmarks({
      release,
      nationalStats,
      nationalTracts: numberOrNull(tractCount.count),
      sourceName,
      sourceUrl: publicNationalUrl,
    }),
  };
}

async function fetchReporterNationalBenchmarks(release) {
  const releaseId = release?.id || "latest";
  const releaseName = release?.name || "ACS latest";
  const nationalUrl = `${censusReporterBase}/${releaseId}?table_ids=B19013,B01001&geo_ids=01000US`;

  try {
    const [nationalCensus, tractCount] = await Promise.all([
      fetchJson(nationalUrl),
      fetchJson(tractCountUrl),
    ]);
    const entry = nationalCensus.data?.["01000US"];
    const age = entry?.B01001?.estimate || {};
    const population = numberOrNull(age.B01001001);
    const children = sumEstimates(age, childAgeKeys);
    const income = numberOrNull(entry?.B19013?.estimate?.B19013001);
    const nationalTracts = numberOrNull(tractCount.count);
    const sourceName = `Census Reporter API / ${releaseName}`;

    return buildBenchmarks({
      release: {
        id: nationalCensus.release?.id || releaseId,
        name: nationalCensus.release?.name || releaseName,
      },
      nationalStats: {
        income,
        population,
        children,
        childShare: population && children !== null ? children / population : null,
      },
      nationalTracts,
      sourceName,
      sourceUrl: nationalUrl,
    });
  } catch (error) {
    console.warn(`National benchmark refresh failed: ${error.message}`);
    return {
      voting: {
        label: "U.S. 2024 presidential popular-vote margin",
        value: votingSummary.nationalBenchmark.margin,
        unit: "margin",
        release: "FEC official 2024 result",
        sourceName: nationalVoting.sourceName,
        sourceUrl: nationalVoting.sourceUrl,
      },
    };
  }
}

async function fetchCensusReporterSnapshot() {
  const census = await fetchJson(censusReporterUrl);
  const release = {
    id: census.release?.id || "latest",
    name: census.release?.name || "ACS latest 5-year",
  };
  return {
    release,
    sourceName: `Census Reporter API / ${release.name}`,
    sourceUrl: censusReporterUrl,
    statsForGeoid: (geoid) => reporterTractStats(census, geoid),
    benchmarks: await fetchReporterNationalBenchmarks(census.release),
  };
}

async function fetchCensusSnapshot() {
  try {
    return await fetchOfficialCensusSnapshot();
  } catch (error) {
    console.warn(`Official Census API refresh unavailable: ${error.message}. Falling back to Census Reporter.`);
    return fetchCensusReporterSnapshot();
  }
}

function inPrincetonArea(feature) {
  const lat = Number(feature.properties.CENTLAT);
  const lon = Number(feature.properties.CENTLON);
  return (
    lat > PRINCETON_AREA_BOUNDS.minLat &&
    lat < PRINCETON_AREA_BOUNDS.maxLat &&
    lon > PRINCETON_AREA_BOUNDS.minLon &&
    lon < PRINCETON_AREA_BOUNDS.maxLon
  );
}

function polygonRings(geometry) {
  if (geometry.type === "Polygon") return geometry.coordinates;
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat();
  return [];
}

function allPoints(features) {
  return features.flatMap((feature) => polygonRings(feature.geometry).flat());
}

function projectionForPoints(points) {
  const lons = points.map(([lon]) => lon);
  const lats = points.map(([, lat]) => lat);

  return {
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    width: SVG_WIDTH,
    height: SVG_HEIGHT,
    pad: SVG_PAD,
  };
}

function projectPoint([lon, lat], projection) {
  const drawWidth = projection.width - projection.pad * 2;
  const drawHeight = projection.height - projection.pad * 2;
  const x = projection.pad + ((lon - projection.minLon) / (projection.maxLon - projection.minLon)) * drawWidth;
  const y = projection.pad + ((projection.maxLat - lat) / (projection.maxLat - projection.minLat)) * drawHeight;
  return [Number(x.toFixed(3)), Number(y.toFixed(3))];
}

function pathForGeometry(geometry, project) {
  return polygonRings(geometry)
    .map((ring) =>
      ring
        .map((point, index) => {
          const [x, y] = project(point);
          return `${index === 0 ? "M" : "L"}${x} ${y}`;
        })
        .join(" "),
    )
    .join(" Z ");
}

function areaLabel(feature) {
  const lat = Number(feature.properties.CENTLAT);
  const lon = Number(feature.properties.CENTLON);
  if (lat >= 40.36 && lon <= -74.675) return "Northwest Princeton area";
  if (lat >= 40.36) return "Northeast Princeton area";
  if (lat <= 40.32 && lon <= -74.69) return "Western edge";
  if (lat <= 40.32) return "Southern edge";
  if (lon <= -74.68) return "West Princeton area";
  if (lon >= -74.64) return "East Princeton area";
  return "Central Princeton area";
}

function metricHighlight(features, key, title, formatter) {
  const feature = features
    .filter((item) => Number.isFinite(item[key]))
    .sort((a, b) => b[key] - a[key])[0];
  return feature
    ? {
        key,
        title,
        label: feature.areaLabel,
        tract: feature.tractLabel,
        value: formatter(feature[key]),
        rawValue: feature[key],
      }
    : null;
}

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const formatNumber = (value) => new Intl.NumberFormat("en-US").format(value);

const formatPercent = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);

try {
  const [geometry, censusSnapshot] = await Promise.all([fetchJson(geometryUrl), fetchCensusSnapshot()]);
  const benchmarks = censusSnapshot.benchmarks;
  const selected = (geometry.features || []).filter(inPrincetonArea);
  const mapProjection = projectionForPoints(allPoints(selected));
  const project = (point) => projectPoint(point, mapProjection);

  const features = selected
    .map((feature) => {
      const geoid = feature.properties.GEOID;
      const stats = censusSnapshot.statsForGeoid(geoid);
      return {
        geoid,
        tractLabel: `Tract ${feature.properties.BASENAME}`,
        areaLabel: areaLabel(feature),
        centroid: {
          lat: Number(Number(feature.properties.CENTLAT).toFixed(5)),
          lon: Number(Number(feature.properties.CENTLON).toFixed(5)),
        },
        path: pathForGeometry(feature.geometry, project),
        voteMargin: votingSummary.margin,
        democratShare: votingSummary.democratShare,
        republicanShare: votingSummary.republicanShare,
        otherShare: votingSummary.otherShare,
        ...stats,
      };
    })
    .filter((feature) => feature.path)
    .sort((a, b) => a.tractLabel.localeCompare(b.tractLabel, "en", { numeric: true }));

  const highlights = [
    metricHighlight(features, "income", "Highest median household income", formatCurrency),
    metricHighlight(features, "children", "Most children under 18", formatNumber),
    metricHighlight(features, "childShare", "Largest child share of population", formatPercent),
  ].filter(Boolean);

  const payload = {
    ...fallback,
    generatedAt: new Date().toISOString(),
    release: censusSnapshot.release?.name || "ACS latest 5-year",
    censusSource: censusSnapshot.sourceName,
    censusSourceUrl: censusSnapshot.sourceUrl,
    mapProjection,
    features,
    highlights,
    benchmarks,
  };

  await mkdir(new URL("../public", import.meta.url), { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${OUT_FILE.pathname} with ${features.length} civic map features.`);
} catch (error) {
  console.warn(`Civic-map refresh failed: ${error.message}`);
  try {
    await readFile(OUT_FILE);
    console.warn("Keeping existing public/civic-map.json.");
  } catch {
    await mkdir(new URL("../public", import.meta.url), { recursive: true });
    await writeFile(
      OUT_FILE,
      `${JSON.stringify({ ...fallback, generatedAt: new Date().toISOString() }, null, 2)}\n`,
    );
    console.warn("Wrote fallback public/civic-map.json.");
  }
}
