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

const votingTotal =
  princetonVoting.democratVotes + princetonVoting.republicanVotes + princetonVoting.otherVotes;
const votingSummary = {
  ...princetonVoting,
  totalVotes: votingTotal,
  democratShare: princetonVoting.democratVotes / votingTotal,
  republicanShare: princetonVoting.republicanVotes / votingTotal,
  otherShare: princetonVoting.otherVotes / votingTotal,
  margin: (princetonVoting.democratVotes - princetonVoting.republicanVotes) / votingTotal,
};

const fallback = {
  generatedAt: null,
  release: "Civic map unavailable",
  privacy:
    "Neighborhood-scale public data only. PrincetonLive does not publish individual voter, household, or address-level records.",
  viewBox: `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`,
  features: [],
  highlights: [],
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
      url: "https://api.censusreporter.org/",
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
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return number;
}

function tractStats(data, geoid) {
  const key = `14000US${geoid}`;
  const entry = data.data?.[key];
  const age = entry?.B01001?.estimate || {};
  const income = entry?.B19013?.estimate?.B19013001;
  const children =
    numberOrNull(age.B01001003) +
    numberOrNull(age.B01001004) +
    numberOrNull(age.B01001005) +
    numberOrNull(age.B01001006) +
    numberOrNull(age.B01001027) +
    numberOrNull(age.B01001028) +
    numberOrNull(age.B01001029) +
    numberOrNull(age.B01001030);
  const population = numberOrNull(age.B01001001);

  return {
    income: numberOrNull(income),
    population,
    children: Number.isFinite(children) ? children : null,
    childShare: population ? children / population : null,
  };
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

function projectFactory(points) {
  const lons = points.map(([lon]) => lon);
  const lats = points.map(([, lat]) => lat);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const drawWidth = SVG_WIDTH - SVG_PAD * 2;
  const drawHeight = SVG_HEIGHT - SVG_PAD * 2;

  return ([lon, lat]) => {
    const x = SVG_PAD + ((lon - minLon) / (maxLon - minLon)) * drawWidth;
    const y = SVG_PAD + ((maxLat - lat) / (maxLat - minLat)) * drawHeight;
    return [Number(x.toFixed(3)), Number(y.toFixed(3))];
  };
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
  const selected = (geometry.features || []).filter(inPrincetonArea);
  const project = projectFactory(allPoints(selected));

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
    features,
    highlights,
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
