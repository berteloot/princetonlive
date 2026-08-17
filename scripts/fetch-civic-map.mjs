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
      name: "Census Reporter API / ACS 2024 5-year",
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

function tractStats(data, geoid) {
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
    childShare: population ? children / population : null,
  };
}

async function fetchNationalBenchmarks(release) {
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

    return {
      income: {
        label: "U.S. median household income",
        value: income,
        unit: "currency",
        release: nationalCensus.release?.name || releaseName,
        sourceName,
        sourceUrl: nationalUrl,
      },
      children: {
        label: "U.S. average residents under 18 per census tract",
        value: children && nationalTracts ? children / nationalTracts : null,
        unit: "number",
        release: nationalCensus.release?.name || releaseName,
        sourceName: `${sourceName} + TIGERweb tract count`,
        sourceUrl: nationalUrl,
      },
      childShare: {
        label: "U.S. share of population under 18",
        value: population && children ? children / population : null,
        unit: "percent",
        release: nationalCensus.release?.name || releaseName,
        sourceName,
        sourceUrl: nationalUrl,
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
  const [geometry, census] = await Promise.all([fetchJson(geometryUrl), fetchJson(censusReporterUrl)]);
  const benchmarks = await fetchNationalBenchmarks(census.release);
  const selected = (geometry.features || []).filter(inPrincetonArea);
  const mapProjection = projectionForPoints(allPoints(selected));
  const project = (point) => projectPoint(point, mapProjection);

  const features = selected
    .map((feature) => {
      const geoid = feature.properties.GEOID;
      const stats = tractStats(census, geoid);
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
    release: census.release?.name || "ACS latest 5-year",
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
