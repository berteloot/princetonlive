import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  BatteryCharging,
  Baby,
  BadgeDollarSign,
  BarChart3,
  Bike,
  BookOpen,
  Bus,
  CalendarDays,
  ChevronRight,
  CloudRain,
  ExternalLink,
  Film,
  Info,
  Landmark,
  Library,
  Map,
  Navigation,
  ParkingCircle,
  Recycle,
  Route,
  Search,
  School,
  Sparkles,
  Theater,
  Train,
  Trees,
  Umbrella,
  Users,
  Vote,
} from "lucide-react";
import "./styles.css";

const languages = [
  { code: "en", short: "EN", label: "English" },
  { code: "fr", short: "FR", label: "Francais" },
  { code: "es", short: "ES", label: "Espanol" },
];

const languageMeta = {
  en: {
    title: "PrincetonLive",
    description: "PrincetonLive is a daily operating guide for becoming a Princetonian.",
  },
  fr: {
    title: "PrincetonLive in French",
    description: "PrincetonLive translated into French by Google Translate.",
  },
  es: {
    title: "PrincetonLive in Spanish",
    description: "PrincetonLive translated into Spanish by Google Translate.",
  },
};

const fallbackData = {
  generatedAt: null,
  weather: {
    temperature: null,
    shortForecast: "Weather loading",
    wind: "",
    detailedForecast: "Current Princeton forecast was not available during the last refresh.",
    sourceUrl: "https://www.weather.gov/",
  },
  alerts: [],
  events: [
    {
      title: "Princeton University public events",
      source: "Princeton University",
      dateLabel: "Today",
      timeLabel: "Check schedule",
      location: "Princeton campus",
      url: "https://www.princeton.edu/events",
      tags: ["culture", "new"],
    },
    {
      title: "Princeton Public Library events",
      source: "Princeton Public Library",
      dateLabel: "Today",
      timeLabel: "Check schedule",
      location: "65 Witherspoon Street",
      url: "https://princetonlibrary.libnet.info/events",
      tags: ["family", "rain"],
    },
    {
      title: "Municipal calendar",
      source: "Municipality of Princeton",
      dateLabel: "Today",
      timeLabel: "Check schedule",
      location: "Princeton, NJ",
      url: "https://www.princetonnj.gov/calendar.aspx",
      tags: ["practical", "new"],
    },
  ],
  sources: [],
};

const fallbackCivicMap = {
  generatedAt: null,
  release: "Civic map loading",
  privacy:
    "Block-group public data only. PrincetonLive does not publish individual voter, household, or address-level records.",
  geography: "census block groups",
  viewBox: "0 0 100 72",
  mapProjection: null,
  features: [],
  highlights: [],
  benchmarks: {},
  schoolContext: {
    title: "School context",
    summary:
      "School context is loading. PrincetonLive uses official public school and performance-report links when available.",
    caveat:
      "This is not a ranking layer. Use official district and NJDOE sources for authoritative school information.",
    schools: [],
    districtUrl: "https://www.princetonk12.org/",
    registrationUrl: "https://www.princetonk12.org/families/registration",
    performanceReportsUrl: "https://www.nj.gov/education/spr/",
  },
  voting: {
    title: "Voting layer",
    summary:
      "Official election result links are available. Republican/Democrat neighborhood shading will only be added after official precinct totals can be safely joined to public district boundaries.",
    result: null,
    links: [
      {
        label: "NJ official Princeton presidential result",
        url: "https://www.nj.gov/state/elections/assets/pdf/election-results/2024/2024-official-general-results-president-mercer.pdf",
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
  sources: [],
};

function externalLinkProps(href) {
  return typeof href === "string" && !href.startsWith("#")
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};
}

const agendaFilters = [
  ["all", "All", CalendarDays],
  ["new", "New here", Sparkles],
  ["family", "Family", Users],
  ["rain", "Rain plan", Umbrella],
  ["culture", "Culture", Theater],
];

const civicMetrics = [
  {
    key: "income",
    label: "Wealth",
    detail: "Median household income",
    note: "ACS top-codes very high medians as $250,001+. Small block groups may have no published estimate.",
    icon: BadgeDollarSign,
  },
  {
    key: "children",
    label: "Children count",
    detail: "Residents under 18",
    note: "Raw count of residents under 18 in the block group.",
    icon: Baby,
  },
  {
    key: "childShare",
    label: "Child share",
    detail: "Children as share of population",
    note: "Percentage of the block-group population that is under 18.",
    icon: Users,
  },
  {
    key: "voting",
    label: "Voting",
    detail: "Democratic vs. Republican result",
    icon: Vote,
  },
  {
    key: "schools",
    label: "Schools",
    detail: "Public school context",
    note: "Campus points, grades, assignment caveats, and official report links. Not a ranking layer.",
    icon: School,
  },
];

const commuteCards = [
  {
    title: "NYC by train",
    detail: "Dinky to Princeton Junction, then Northeast Corridor to New York Penn. Check the transfer before you leave.",
    action: "NJ Transit Dinky",
    url: "https://www.njtransit.com/destinations/princeton-dinky",
    icon: Train,
  },
  {
    title: "Philly route",
    detail: "Use Princeton Junction to Trenton, then SEPTA toward Center City. Compare Amtrak when timing matters.",
    action: "SEPTA schedules",
    url: "https://api.septa.org/",
    icon: Route,
  },
  {
    title: "Downtown parking",
    detail: "Meters, garages, permit zones, and Princeton Junction lots each work differently. Check before you commit.",
    action: "Parking rules",
    url: "https://www.princetonnj.gov/203/Parking-in-Princeton",
    icon: ParkingCircle,
  },
  {
    title: "No-car options",
    detail: "TigerTransit, FreeB, walking, biking, and the Dinky cover more day-to-day trips than new residents expect.",
    action: "Getting around",
    url: "https://www.princetonnj.gov/578/Getting-Around-Princeton",
    icon: Bus,
  },
];

const practicalTiles = [
  {
    label: "Weather alerts",
    value: "NWS",
    url: "https://www.weather.gov/",
    icon: CloudRain,
  },
  {
    label: "Town alerts",
    value: "Nixle",
    url: "https://www.princetonnj.gov/274/Emergency-Phone-Notifications",
    icon: AlertTriangle,
  },
  {
    label: "Trash & recycling",
    value: "Resident services",
    url: "https://www.princetonnj.gov/263/Trash-Recycling",
    icon: Recycle,
  },
  {
    label: "EV charging",
    value: "Station map",
    url: "https://afdc.energy.gov/stations/#/find/nearest?location=Princeton%2C%20NJ",
    icon: BatteryCharging,
  },
  {
    label: "Report an issue",
    value: "SeeClickFix",
    url: "https://seeclickfix.com/princeton_nj",
    icon: Landmark,
  },
  {
    label: "Parks & GIS",
    value: "Town maps",
    url: "https://www.princetonnj.gov/1845/GIS-Maps-and-Apps",
    icon: Map,
  },
];

const residentFaqs = [
  {
    question: "What is PrincetonLive?",
    answer:
      "PrincetonLive is an independent daily operating guide for Princeton, NJ residents and new arrivals. It brings public events, transit, weather, alerts, town services, library benefits, resident perks, and aggregate civic data into one place.",
  },
  {
    question: "Is PrincetonLive an official Princeton University or municipal website?",
    answer:
      "No. PrincetonLive is independent. It links to official Princeton University, Princeton Public Library, municipal, Census, weather, transit, and election sources when residents need the authoritative source.",
  },
  {
    question: "What public data does PrincetonLive use?",
    answer:
      "PrincetonLive uses public feeds and pages including National Weather Service data, Princeton University public events, Princeton Public Library events, municipal resources, U.S. Census ACS and TIGERweb data, and official election-result sources.",
  },
  {
    question: "Does the civic map show individual households or voters?",
    answer:
      "No. The civic map uses aggregate Census block-group data and official municipality-level voting results. PrincetonLive does not publish individual voter, household, or address-level records.",
  },
];

const pillarGuides = [
  {
    title: "Moving to Princeton",
    detail: "First-week orientation for new residents: alerts, transit, library cards, services, and local discovery.",
    url: "/guides/moving-to-princeton.html",
  },
  {
    title: "Library benefits",
    detail: "Library cards, study rooms, parking validation, museum passes, technology, and digital resources.",
    url: "/guides/princeton-library-benefits.html",
  },
  {
    title: "Getting around",
    detail: "Dinky, Princeton Junction, NYC and Philly routes, parking, buses, walking, and biking.",
    url: "/guides/getting-around-princeton.html",
  },
  {
    title: "Public events and culture",
    detail: "University public events, lectures, library programs, Garden Theatre, McCarter, arts, and museums.",
    url: "/guides/princeton-public-events-culture.html",
  },
  {
    title: "Civic data",
    detail: "Census block groups, wealth, children, national benchmarks, and voting-source limits.",
    url: "/guides/princeton-civic-data.html",
  },
  {
    title: "Resident services",
    detail: "Alerts, recycling, reporting issues, EV charging, parks, Human Services, and recreation.",
    url: "/guides/princeton-resident-services.html",
  },
];

const residentPerks = [
  {
    group: "Free with a Princeton library card",
    items: [
      {
        title: "Library card for residents",
        detail:
          "Residents and property owners in the Municipality of Princeton can get a free Princeton Public Library card with proof of eligibility.",
        action: "Get a card",
        url: "https://princetonlibrary.org/about-us/library-cards/",
        icon: Library,
      },
      {
        title: "Two hours of garage parking",
        detail:
          "PPL cardholders visiting the Sands Library Building can validate a Spring Street Garage paper ticket for up to two hours per day.",
        action: "Parking details",
        url: "https://princetonlibrary.org/about-us/location-hours-book-drops/",
        icon: ParkingCircle,
      },
      {
        title: "Study rooms",
        detail:
          "Cardholders can reserve one study room per day, up to 48 hours ahead. Rooms are generally 30 minutes to two hours.",
        action: "Book a room",
        url: "https://princetonlibrary.org/services/study-rooms/",
        icon: BookOpen,
      },
      {
        title: "Museum passes",
        detail:
          "Cardholders in good standing can reserve museum passes at no charge, subject to availability and each museum's rules.",
        action: "Reserve a pass",
        url: "https://princetonlibrary.org/services/museum-pass/",
        icon: Landmark,
      },
      {
        title: "Library of Things and tech",
        detail:
          "Borrow nontraditional items, use MacBooks in the library, borrow Chromebooks or hotspots, and access software and gadgets.",
        action: "Technology services",
        url: "https://princetonlibrary.org/services/technology-services/",
        icon: BatteryCharging,
      },
      {
        title: "Online learning and digital media",
        detail:
          "Use e-books, audiobooks, digital magazines, research databases, online courses, language learning, and homework help.",
        action: "Card benefits",
        url: "https://princetonlibrary.org/about-us/library-cards/#card-benefits",
        icon: Sparkles,
      },
    ],
  },
  {
    group: "Resident resources worth knowing",
    items: [
      {
        title: "Audit Princeton classes",
        detail:
          "The Community Auditing Program lets adults audit University lectures as non-credit silent students. Courses have tuition, with Princeton-affiliated/resident priority on day one.",
        action: "Auditing program",
        url: "https://community.princeton.edu/community-auditing",
        icon: BookOpen,
      },
      {
        title: "Arts Council access",
        detail:
          "The Arts Council of Princeton offers free community programming, free or low-cost events, and need-based scholarships for classes.",
        action: "Arts Council",
        url: "https://artscouncilofprinceton.org/about/",
        icon: Theater,
      },
      {
        title: "Free art-making with PU Museum",
        detail:
          "ACP partners with the Princeton University Art Museum on free virtual art-making classes and recordings.",
        action: "Art classes",
        url: "https://artscouncilofprinceton.org/classes/free-virtual-art-making-with-pu-museum/",
        icon: Film,
      },
      {
        title: "Princeton Loop bus",
        detail:
          "The municipal Princeton Loop is a free bus service open to everyone, connecting housing, downtown, and the Princeton Shopping Center.",
        action: "Loop details",
        url: "https://www.princetonnj.gov/578/Getting-Around-Princeton",
        icon: Bus,
      },
      {
        title: "Human Services directory",
        detail:
          "The town maintains a resident resource guide for local services, assistance programs, transportation, seniors, veterans, and more.",
        action: "Resource guide",
        url: "https://www.princetonnj.gov/DocumentCenter/View/21016/Princeton-Resource-Guide-Updated-2025",
        icon: Users,
      },
      {
        title: "Recreation programs",
        detail:
          "Princeton Recreation runs programs, community events, trips, and classes for children, adults, and seniors.",
        action: "Recreation",
        url: "https://www.princetonnj.gov/1697/Recreation",
        icon: Trees,
      },
    ],
  },
];

const exploreStops = [
  ["D&R Canal towpath", "Flat, easy orientation walk along the water."],
  ["Institute Woods", "Shaded trails for a quiet first-month ritual."],
  ["Princeton Battlefield", "History, fields, and a useful western anchor."],
  ["Stony Brook paths", "Good for nature breaks and weekend resets."],
  ["Community Park", "Playgrounds, pool, fields, and everyday family logistics."],
  ["Nassau Street side streets", "Errands, coffee, bookshops, and shortcuts."],
];

function getInitialLanguage() {
  const params = new URLSearchParams(window.location.search);
  const lang = params.get("lang") || params.get("tl") || params.get("_x_tr_tl");
  return lang === "fr" || lang === "es" ? lang : "en";
}

function setGoogleTranslateCookie(targetLanguage) {
  const expires = "expires=Fri, 31 Dec 9999 23:59:59 GMT";
  const value = targetLanguage === "en" ? "/en/en" : `/en/${targetLanguage}`;
  document.cookie = `googtrans=${value}; path=/; ${expires}`;
  document.cookie = `googtrans=${value}; domain=.berteloot.org; path=/; ${expires}`;
}

function triggerGoogleTranslate(targetLanguage) {
  const combo = document.querySelector(".goog-te-combo");
  if (!combo) return false;
  combo.value = targetLanguage;
  combo.dispatchEvent(new Event("change"));
  return true;
}

function formatRefresh(value) {
  if (!value) return "Last refreshed when the site was built";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(new Date(value));
}

function formatCivicValue(key, value) {
  if (!Number.isFinite(value)) {
    return key === "voting" || key === "voteMargin" ? "Source linked" : "No ACS estimate";
  }
  if (key === "voting" || key === "voteMargin") {
    const points = Math.abs(value) * 100;
    return `${value >= 0 ? "Democratic" : "Republican"} +${points.toFixed(1)} pts`;
  }
  if (key === "income") {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
    return value >= 250001 ? `${formatted}+` : formatted;
  }
  if (key === "childShare") {
    return new Intl.NumberFormat("en-US", {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US").format(value);
}

function formatBenchmarkDelta(key, value, benchmark) {
  const benchmarkValue = benchmark?.value;
  if (!Number.isFinite(value) || !Number.isFinite(benchmarkValue)) return null;

  if (key === "childShare" || key === "voting" || key === "voteMargin") {
    const delta = (value - benchmarkValue) * 100;
    if (Math.abs(delta) < 0.05) return "Matches U.S. benchmark";
    return `${delta > 0 ? "+" : "-"}${Math.abs(delta).toFixed(1)} pts vs U.S.`;
  }

  if (!benchmarkValue) return null;
  const delta = ((value - benchmarkValue) / benchmarkValue) * 100;
  if (Math.abs(delta) < 0.5) return "Matches U.S. benchmark";
  return `${delta > 0 ? "+" : "-"}${Math.abs(delta).toFixed(0)}% vs U.S.`;
}

function benchmarkValueKey(key) {
  return key === "voting" ? "voting" : key;
}

function projectCivicPoint(projection, lat, lon) {
  if (!projection || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const drawWidth = projection.width - projection.pad * 2;
  const drawHeight = projection.height - projection.pad * 2;
  return {
    x: projection.pad + ((lon - projection.minLon) / (projection.maxLon - projection.minLon)) * drawWidth,
    y: projection.pad + ((projection.maxLat - lat) / (projection.maxLat - projection.minLat)) * drawHeight,
  };
}

function metricDomain(features, key) {
  const values = features.map((feature) => feature[key]).filter(Number.isFinite);
  return values.length ? [Math.min(...values), Math.max(...values)] : [0, 1];
}

function tractFill(feature, key, domain) {
  if (key === "voting") {
    const margin = Number.isFinite(feature.voteMargin) ? feature.voteMargin : 0;
    const intensity = Math.min(Math.abs(margin), 0.75) / 0.75;
    const lightness = 88 - intensity * 42;
    const hue = margin >= 0 ? 214 : 5;
    return `hsl(${hue} 72% ${lightness}%)`;
  }
  if (key === "schools") return "#f4efe4";
  const value = feature[key];
  if (!Number.isFinite(value)) return "#edf0e9";
  const [min, max] = domain;
  const ratio = max === min ? 0.62 : (value - min) / (max - min);
  if (key === "income") {
    const lightness = 88 - ratio * 48;
    return `hsl(27 86% ${lightness}%)`;
  }
  if (key === "childShare") {
    const lightness = 88 - ratio * 44;
    return `hsl(203 58% ${lightness}%)`;
  }
  const lightness = 86 - ratio * 43;
  return `hsl(154 40% ${lightness}%)`;
}

function App() {
  const [language, setLanguage] = useState(getInitialLanguage);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [liveData, setLiveData] = useState(fallbackData);
  const [civicMap, setCivicMap] = useState(fallbackCivicMap);
  const [civicMetric, setCivicMetric] = useState("income");
  const [hoveredCivicFeature, setHoveredCivicFeature] = useState(null);
  const [hoveredSchool, setHoveredSchool] = useState(null);
  const [civicTooltip, setCivicTooltip] = useState({ x: 0, y: 0 });
  const [addressQuery, setAddressQuery] = useState("");
  const [addressLookup, setAddressLookup] = useState({
    status: "idle",
    message: "",
    result: null,
  });

  useEffect(() => {
    fetch(`/live-data.json?v=${Date.now()}`)
      .then((response) => (response.ok ? response.json() : fallbackData))
      .then((data) => setLiveData({ ...fallbackData, ...data }))
      .catch(() => setLiveData(fallbackData));
  }, []);

  useEffect(() => {
    fetch(`/civic-map.json?v=${Date.now()}`)
      .then((response) => (response.ok ? response.json() : fallbackCivicMap))
      .then((data) => setCivicMap({ ...fallbackCivicMap, ...data }))
      .catch(() => setCivicMap(fallbackCivicMap));
  }, []);

  useEffect(() => {
    if (window.google?.translate?.TranslateElement) return;

    window.googleTranslateElementInit = () => {
      if (!window.google?.translate?.TranslateElement) return;
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: "en,fr,es",
          autoDisplay: false,
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        },
        "google_translate_element",
      );
    };

    const script = document.createElement("script");
    script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = languageMeta[language].title;
    const metaDescription = document.querySelector('meta[name="description"]');
    metaDescription?.setAttribute("content", languageMeta[language].description);
    setGoogleTranslateCookie(language);

    const attempts = [250, 750, 1500, 2500].map((delay) =>
      window.setTimeout(() => triggerGoogleTranslate(language), delay),
    );
    return () => attempts.forEach((attempt) => window.clearTimeout(attempt));
  }, [language]);

  const selectLanguage = (nextLanguage) => {
    if (nextLanguage === language) return;

    setGoogleTranslateCookie(nextLanguage);
    setLanguage(nextLanguage);
    const url = new URL(window.location.href);
    if (nextLanguage === "en") {
      url.searchParams.delete("lang");
    } else {
      url.searchParams.set("lang", nextLanguage);
    }
    window.location.assign(`${url.pathname}${url.search}${url.hash}`);
  };

  const filteredEvents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return liveData.events.filter((event) => {
      const tagMatch = filter === "all" || event.tags?.includes(filter);
      const text = `${event.title} ${event.source} ${event.location} ${event.dateLabel} ${event.timeLabel}`.toLowerCase();
      return tagMatch && (!normalized || text.includes(normalized));
    });
  }, [filter, liveData.events, query]);

  const visibleEvents = filteredEvents.slice(0, 10);
  const nextEvent = liveData.events[0];
  const alertCount = liveData.alerts?.length ?? 0;
  const activeCivicMetric =
    civicMetrics.find((metric) => metric.key === civicMetric) ?? civicMetrics[0];
  const civicDomain = metricDomain(civicMap.features, civicMetric);
  const activeBenchmark = civicMetric === "schools" ? null : civicMap.benchmarks?.[civicMetric];
  const schoolContext = civicMap.schoolContext ?? fallbackCivicMap.schoolContext;
  const activeSchool = hoveredSchool ?? schoolContext.schools?.[0] ?? null;
  const topCivicFeatures = civicMap.features
    .filter((feature) => Number.isFinite(feature[civicMetric]))
    .sort((a, b) => b[civicMetric] - a[civicMetric])
    .slice(0, 4);
  const metricValueKey = civicMetric === "voting" ? "voteMargin" : civicMetric;
  const activeBenchmarkValueKey = benchmarkValueKey(civicMetric);
  const votingResult = civicMap.voting?.result;
  const votingStats = votingResult
    ? [
        ["Democratic", `${(votingResult.democratShare * 100).toFixed(1)}%`],
        ["Republican", `${(votingResult.republicanShare * 100).toFixed(1)}%`],
        ["Other", `${(votingResult.otherShare * 100).toFixed(1)}%`],
      ]
    : [];
  const addressMarker = addressLookup.result
    ? projectCivicPoint(civicMap.mapProjection, addressLookup.result.lat, addressLookup.result.lon)
    : null;

  const updateCivicTooltip = (event) => {
    const shell = event.currentTarget.closest?.(".civic-map-shell") ?? event.currentTarget;
    const rect = shell.getBoundingClientRect();
    setCivicTooltip({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  const locateAddress = async (event) => {
    event.preventDefault();
    const cleanQuery = addressQuery.trim();
    if (!cleanQuery) {
      setHoveredCivicFeature(null);
      setAddressLookup({
        status: "error",
        message: "Type a Princeton address first.",
        result: null,
      });
      return;
    }

    const searchQuery = /princeton/i.test(cleanQuery) ? cleanQuery : `${cleanQuery}, Princeton, NJ`;
    const params = new URLSearchParams({
      format: "jsonv2",
      q: searchQuery,
      countrycodes: "us",
      limit: "1",
      bounded: "1",
      viewbox: "-74.75,40.42,-74.60,40.28",
    });

    setAddressLookup({
      status: "loading",
      message: "Looking up that address...",
      result: null,
    });

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
      if (!response.ok) throw new Error("Address lookup failed.");
      const [match] = await response.json();
      const lat = Number(match?.lat);
      const lon = Number(match?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        setHoveredCivicFeature(null);
        setAddressLookup({
          status: "error",
          message: "No Princeton match found. Try a street number and street name.",
          result: null,
        });
        return;
      }

      const marker = projectCivicPoint(civicMap.mapProjection, lat, lon);
      const svg = document.querySelector(".civic-map-shell svg");
      const point = svg?.createSVGPoint?.();
      if (point && marker) {
        point.x = marker.x;
        point.y = marker.y;
      }
      const matchedPath =
        point &&
        marker &&
        Array.from(svg.querySelectorAll("path[data-geoid]")).find((path) =>
          path.isPointInFill(point),
        );
      const feature = civicMap.features.find((item) => item.geoid === matchedPath?.dataset.geoid);
      if (!feature) {
        setHoveredCivicFeature(null);
        setAddressLookup({
          status: "error",
          message: "Found the address, but it falls outside this Princeton civic map.",
          result: null,
        });
        return;
      }

      setHoveredCivicFeature(feature);
      setAddressLookup({
        status: "success",
        message: `${feature.tractLabel}: ${feature.areaLabel}`,
        result: {
          label: match.display_name,
          lat,
          lon,
          geoid: feature.geoid,
          tractLabel: feature.tractLabel,
          areaLabel: feature.areaLabel,
        },
      });
    } catch {
      setHoveredCivicFeature(null);
      setAddressLookup({
        status: "error",
        message: "Address lookup is unavailable right now. Try again in a moment.",
        result: null,
      });
    }
  };

  const clearAddressLookup = () => {
    setAddressQuery("");
    setHoveredCivicFeature(null);
    setAddressLookup({ status: "idle", message: "", result: null });
  };

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="PrincetonLive home">
          <span className="brand-mark notranslate" translate="no">
            PL
          </span>
          <span>
            <span className="notranslate" translate="no">
              PrincetonLive
            </span>
            <small>Independent resident guide</small>
          </span>
        </a>
        <div className="header-controls">
          <nav aria-label="Primary navigation">
            <a href="#today">Today</a>
            <a href="#move">Move</a>
            <a href="#practical">Practical</a>
            <a href="#perks">Perks</a>
            <a href="#civic">Civic map</a>
            <a href="#guides">Guides</a>
            <a href="#faq">FAQ</a>
            <a href="#explore">Explore</a>
          </nav>
          <div className="language-switcher notranslate" translate="no" aria-label="Language">
            <span className="translation-provider">Google Translate</span>
            {languages.map((option) => (
              <button
                key={option.code}
                type="button"
                className={language === option.code ? "is-active" : ""}
                onClick={() => selectLanguage(option.code)}
                aria-pressed={language === option.code}
                title={option.label}
              >
                {option.short}
              </button>
            ))}
          </div>
          <div id="google_translate_element" className="google-translate-shell" />
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-media" aria-hidden="true">
          <img
            src="https://www.princeton.edu/sites/default/files/styles/half_2x/public/20161006_CL_DJA_028.jpg?itok=AGbX2ltx"
            alt=""
          />
        </div>
        <div className="hero-copy">
          <p className="eyebrow">Princeton, NJ today</p>
          <h1>PrincetonLive</h1>
          <p className="hero-lede">
            A Princeton resident guide for events, transit, services, library benefits, and civic
            data.
          </p>
          <p className="hero-summary">
            Find weather, alerts, public events, transit decisions, town services, library perks,
            and neighborhood-scale civic context in one independent daily guide.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#today">
              Open today <ChevronRight size={18} aria-hidden="true" />
            </a>
            <a className="secondary-action" href="#move">
              Check transit
            </a>
          </div>
        </div>
        <aside className="daily-brief" aria-label="Today snapshot">
          <a
            className="weather-summary-card"
            href={liveData.weather.sourceUrl}
            {...externalLinkProps(liveData.weather.sourceUrl)}
          >
            <span>Weather</span>
            <strong>
              {liveData.weather.temperature ? `${liveData.weather.temperature}°F, ` : ""}
              {liveData.weather.shortForecast}
            </strong>
            <small>
              {liveData.weather.wind ? `${liveData.weather.wind}. ` : ""}
              {liveData.weather.detailedForecast}
            </small>
          </a>
          <a href="https://www.weather.gov/phi/" {...externalLinkProps("https://www.weather.gov/phi/")}>
            <span>Alerts</span>
            <strong>{alertCount ? `${alertCount} active weather alert${alertCount === 1 ? "" : "s"}` : "No active NWS alerts"}</strong>
          </a>
          <a
            href={nextEvent?.url ?? "https://www.princeton.edu/events"}
            {...externalLinkProps(nextEvent?.url ?? "https://www.princeton.edu/events")}
          >
            <span>Next useful item</span>
            <strong>{nextEvent ? nextEvent.title : "Check public calendars"}</strong>
          </a>
          <div>
            <span>Updated</span>
            <strong>{formatRefresh(liveData.generatedAt)}</strong>
          </div>
        </aside>
      </section>

      <section className="section today-grid" id="today">
        <div className="section-heading">
          <p className="eyebrow">Today</p>
          <h2>Public events and resident signals.</h2>
          <p>
            Pulled from public Princeton sources, then trimmed into a short list that is useful
            for a resident deciding what to do next.
          </p>
        </div>
        <div className="control-row" aria-label="Agenda filters">
          {agendaFilters.map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              className={filter === value ? "is-active" : ""}
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
            >
              <Icon size={17} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search agenda</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search events, library, town, lectures..."
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              Clear
            </button>
          ) : null}
        </label>
        <div className="results-meta" aria-live="polite">
          Showing {visibleEvents.length} of {filteredEvents.length} matching public items
        </div>
        <div className="agenda-list" key={`agenda-${filter}-${query}-${liveData.generatedAt}`}>
          {visibleEvents.length ? (
            visibleEvents.map((event, index) => (
              <a
                className="agenda-card"
                href={event.url}
                key={`${event.url}-${index}`}
                {...externalLinkProps(event.url)}
              >
                <time>
                  {event.dateLabel}
                  <small>{event.timeLabel}</small>
                </time>
                <div>
                  <h3>{event.title}</h3>
                  <p>{event.location}</p>
                </div>
                <span>{event.source}</span>
                <ExternalLink size={16} aria-hidden="true" />
              </a>
            ))
          ) : (
            <div className="empty-state">No matching items in the current public-data snapshot.</div>
          )}
        </div>
      </section>

      {liveData.alerts.length ? (
        <section className="section alert-band" aria-labelledby="alerts-heading">
          <div className="section-heading split">
            <div>
              <p className="eyebrow">Active alerts</p>
              <h2 id="alerts-heading">Weather items that need attention.</h2>
            </div>
            <p>
              Current National Weather Service alerts for Princeton. When there are no active
              alerts, this section is hidden so the page stays focused.
            </p>
          </div>
          <div className="alert-strip">
            {liveData.alerts.slice(0, 3).map((alert) => (
              <a href={alert.url} key={alert.id} {...externalLinkProps(alert.url)}>
                <AlertTriangle size={18} aria-hidden="true" />
                <strong>{alert.event}</strong>
                <span>{alert.headline}</span>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section" id="move">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">Move</p>
            <h2>Make the commute choice before the calendar choice.</h2>
          </div>
          <p>
            Princeton trips often hinge on one transfer, one parking rule, or one missed shuttle.
            These links get residents to the official decision points quickly.
          </p>
        </div>
        <div className="commute-grid">
          {commuteCards.map(({ title, detail, action, url, icon: Icon }) => (
            <a href={url} className="feature-card" key={title} {...externalLinkProps(url)}>
              <Icon size={24} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{detail}</p>
              <span>
                {action} <ChevronRight size={16} aria-hidden="true" />
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="section practical" id="practical">
        <div className="section-heading">
          <p className="eyebrow">Practical</p>
          <h2>Resident errands without the tab hunt.</h2>
        </div>
        <div className="tile-grid">
          {practicalTiles.map(({ label, value, url, icon: Icon }) => (
            <a className="utility-tile" href={url} key={label} {...externalLinkProps(url)}>
              <Icon size={21} aria-hidden="true" />
              <span>{label}</span>
              <strong>{value}</strong>
            </a>
          ))}
        </div>
      </section>

      <section className="section resident-perks" id="perks">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">Resident perks</p>
            <h2>Things Princeton quietly makes available.</h2>
          </div>
          <p>
            A resident-first checklist of library benefits, learning access, arts resources, and
            civic services that are easy to miss when you first arrive.
          </p>
        </div>
        <div className="perks-layout">
          {residentPerks.map((group) => (
            <section className="perk-group" key={group.group} aria-labelledby={`${group.group.replace(/\W+/g, "-").toLowerCase()}-heading`}>
              <h3 id={`${group.group.replace(/\W+/g, "-").toLowerCase()}-heading`}>
                {group.group}
              </h3>
              <div className="perk-list">
                {group.items.map(({ title, detail, action, url, icon: Icon }) => (
                  <a className="perk-card" href={url} key={title} {...externalLinkProps(url)}>
                    <Icon size={21} aria-hidden="true" />
                    <span>{title}</span>
                    <p>{detail}</p>
                    <strong>
                      {action} <ExternalLink size={14} aria-hidden="true" />
                    </strong>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="section civic-section" id="civic">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">Civic map</p>
            <h2>Public data, neighborhood scale.</h2>
          </div>
          <p>
            Census block-group boundaries and ACS estimates make the map more local without exposing
            household-level records. Areas are selected against the Princeton municipal boundary. Voting uses the official Princeton municipal result until
            district-level results can be joined safely.
          </p>
        </div>

        <div className="civic-layout">
          <div className={`civic-map-panel metric-${civicMetric}`}>
            <div className="civic-toolbar" aria-label="Civic map metrics">
              {civicMetrics.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  className={civicMetric === key ? "is-active" : ""}
                  onClick={() => {
                    setCivicMetric(key);
                    setHoveredSchool(null);
                  }}
                  aria-pressed={civicMetric === key}
                >
                  <Icon size={17} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            <div className="metric-definition">
              <div>
                <strong>{activeCivicMetric.detail}</strong>
                {activeCivicMetric.note ? <span>{activeCivicMetric.note}</span> : null}
              </div>
              {activeBenchmark ? (
                <a
                  className="benchmark-pill"
                  href={activeBenchmark.sourceUrl}
                  {...externalLinkProps(activeBenchmark.sourceUrl)}
                >
                  <span>U.S. benchmark</span>
                  <strong>
                    {formatCivicValue(activeBenchmarkValueKey, activeBenchmark.value)}
                  </strong>
                </a>
              ) : null}
            </div>
            <form className="address-locator" onSubmit={locateAddress}>
              <label htmlFor="address-search">Find an address on this map</label>
              <div>
                <Search size={17} aria-hidden="true" />
                <input
                  id="address-search"
                  value={addressQuery}
                  onChange={(event) => setAddressQuery(event.target.value)}
                  placeholder="Try 400 Witherspoon St"
                  autoComplete="street-address"
                />
                <button type="submit" disabled={addressLookup.status === "loading"}>
                  <Navigation size={16} aria-hidden="true" />
                  {addressLookup.status === "loading" ? "Locating" : "Locate"}
                </button>
                {addressLookup.result ? (
                  <button type="button" className="clear-address" onClick={clearAddressLookup}>
                    Clear
                  </button>
                ) : null}
              </div>
              <p className={`address-status is-${addressLookup.status}`} aria-live="polite">
                {addressLookup.message ||
                  "Uses OpenStreetMap address lookup. PrincetonLive does not store submitted addresses."}
              </p>
            </form>
            <div className="civic-map-shell">
              <svg
                viewBox={civicMap.viewBox}
                role="img"
                aria-label={`Princeton-area block groups by ${activeCivicMetric.detail}`}
                onPointerMove={updateCivicTooltip}
                onMouseMove={updateCivicTooltip}
                onMouseLeave={() => setHoveredCivicFeature(null)}
                onPointerLeave={() => setHoveredCivicFeature(null)}
              >
                {civicMap.features.map((feature) => {
                  const featureValue = feature[metricValueKey];
                  const featureDelta = formatBenchmarkDelta(
                    metricValueKey,
                    featureValue,
                    activeBenchmark,
                  );

                  return (
                    <path
                      key={feature.geoid}
                      d={feature.path}
                      data-geoid={feature.geoid}
                      fill={tractFill(feature, civicMetric, civicDomain)}
                      className={hoveredCivicFeature?.geoid === feature.geoid ? "is-hovered" : ""}
                      tabIndex="0"
                      role="button"
                      aria-label={`${feature.areaLabel}, ${feature.tractLabel}, ${formatCivicValue(metricValueKey, featureValue)}`}
                      onMouseEnter={(event) => {
                        setHoveredCivicFeature(feature);
                        updateCivicTooltip(event);
                      }}
                      onPointerEnter={(event) => {
                        setHoveredCivicFeature(feature);
                        updateCivicTooltip(event);
                      }}
                      onPointerMove={updateCivicTooltip}
                      onClick={(event) => {
                        setHoveredCivicFeature(feature);
                        updateCivicTooltip(event);
                      }}
                      onFocus={() => setHoveredCivicFeature(feature)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setHoveredCivicFeature(feature);
                        }
                      }}
                    >
                      <title>
                        {feature.areaLabel}, {feature.tractLabel}:{" "}
                        {formatCivicValue(metricValueKey, featureValue)}
                        {featureDelta ? ` (${featureDelta})` : ""}
                      </title>
                    </path>
                  );
                })}
                {civicMetric === "schools"
                  ? schoolContext.schools?.map((school) => {
                      const marker =
                        school.marker ??
                        projectCivicPoint(civicMap.mapProjection, school.lat, school.lon);
                      if (!marker) return null;
                      return (
                        <g
                          className={`school-marker${hoveredSchool?.id === school.id ? " is-hovered" : ""}`}
                          key={school.id}
                          role="button"
                          tabIndex="0"
                          transform={`translate(${marker.x.toFixed(3)} ${marker.y.toFixed(3)})`}
                          aria-label={`${school.name}, ${school.type}, ${school.grades}`}
                          onMouseEnter={(event) => {
                            setHoveredSchool(school);
                            setHoveredCivicFeature(null);
                            updateCivicTooltip(event);
                          }}
                          onPointerEnter={(event) => {
                            setHoveredSchool(school);
                            setHoveredCivicFeature(null);
                            updateCivicTooltip(event);
                          }}
                          onPointerMove={updateCivicTooltip}
                          onClick={(event) => {
                            setHoveredSchool(school);
                            setHoveredCivicFeature(null);
                            updateCivicTooltip(event);
                          }}
                          onFocus={() => setHoveredSchool(school)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setHoveredSchool(school);
                              setHoveredCivicFeature(null);
                            }
                          }}
                        >
                          <circle r="2.2" />
                          <text y="0.74" textAnchor="middle">
                            S
                          </text>
                          <title>
                            {school.name}: {school.grades}
                          </title>
                        </g>
                      );
                    })
                  : null}
                {addressMarker ? (
                  <g
                    className="address-marker"
                    transform={`translate(${addressMarker.x.toFixed(3)} ${addressMarker.y.toFixed(3)})`}
                    aria-label={`Located address in ${addressLookup.result.tractLabel}`}
                  >
                    <circle r="2.1" />
                    <circle r="0.72" />
                    <title>
                      {addressLookup.result.tractLabel}: {addressLookup.result.areaLabel}
                    </title>
                  </g>
                ) : null}
              </svg>
              {hoveredCivicFeature ? (
                <div
                  className="civic-tooltip"
                  style={{
                    left: `${civicTooltip.x}px`,
                    top: `${civicTooltip.y}px`,
                  }}
                >
                  <strong>{hoveredCivicFeature.areaLabel}</strong>
                  <span>{hoveredCivicFeature.tractLabel}</span>
                  <b>{formatCivicValue(metricValueKey, hoveredCivicFeature[metricValueKey])}</b>
                  <small>
                    {formatBenchmarkDelta(
                      metricValueKey,
                      hoveredCivicFeature[metricValueKey],
                      activeBenchmark,
                    ) ||
                      (civicMetric === "voting"
                        ? "Princeton municipal result"
                        : activeBenchmark?.label)}
                  </small>
                </div>
              ) : civicMetric === "schools" && hoveredSchool ? (
                <div
                  className="civic-tooltip school-tooltip"
                  style={{
                    left: `${civicTooltip.x}px`,
                    top: `${civicTooltip.y}px`,
                  }}
                >
                  <strong>{hoveredSchool.name}</strong>
                  <span>{hoveredSchool.type}</span>
                  <b>{hoveredSchool.grades}</b>
                  <small>{hoveredSchool.address}</small>
                </div>
              ) : null}
              {civicMetric === "voting" ? (
                <div className="vote-overlay">
                  <Vote size={22} aria-hidden="true" />
                  <strong>{formatCivicValue("voting", votingResult?.margin)}</strong>
                  <span>Princeton 2024 municipal result</span>
                </div>
              ) : null}
            </div>
            <div className="civic-legend">
              <span>{activeCivicMetric.detail}</span>
              <div className="legend-scale">
                <span>
                  {civicMetric === "voting"
                    ? "Republican"
                    : civicMetric === "schools"
                      ? "Context"
                      : "Lower"}
                </span>
                <i aria-hidden="true" />
                <span>
                  {civicMetric === "voting"
                    ? "Democratic"
                    : civicMetric === "schools"
                      ? "Official links"
                      : "Higher"}
                </span>
              </div>
            </div>
          </div>

          <div className="civic-insights">
            <div className="privacy-note">
              <BarChart3 size={19} aria-hidden="true" />
              <strong>{civicMap.release}</strong>
              <span>{civicMap.privacy}</span>
            </div>
            <div className="tract-explainer">
              <Info size={19} aria-hidden="true" />
              <strong>What is a block group?</strong>
              <span>
                A block group is a Census area inside a tract, usually smaller than a neighborhood.
                It is useful for local statistics, but it is still an aggregate area, not a named neighborhood,
                voting precinct, or exact address.
              </span>
              <a
                href="https://www.census.gov/programs-surveys/geography/about/glossary.html"
                {...externalLinkProps("https://www.census.gov/programs-surveys/geography/about/glossary.html")}
              >
                Census glossary
              </a>
            </div>
            {civicMetric === "voting" ? (
              <div className="voting-note">
                <h3>{civicMap.voting.title}</h3>
                <p>{civicMap.voting.summary}</p>
                {votingStats.length ? (
                  <div className="vote-stats">
                    {votingStats.map(([label, value]) => (
                      <span key={label}>
                        {label}
                        <strong>{value}</strong>
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="source-links compact">
                  {civicMap.voting.links.map((link) => (
                    <a href={link.url} key={link.url} {...externalLinkProps(link.url)}>
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            ) : civicMetric === "schools" ? (
              <div className="school-context-panel">
                <h3>{schoolContext.title}</h3>
                <p>{schoolContext.summary}</p>
                {activeSchool ? (
                  <div className="active-school">
                    <span>{activeSchool.type}</span>
                    <strong>{activeSchool.name}</strong>
                    <small>{activeSchool.grades}</small>
                    <p>{activeSchool.address}</p>
                    <a href={activeSchool.sourceUrl} {...externalLinkProps(activeSchool.sourceUrl)}>
                      Official school page
                    </a>
                  </div>
                ) : null}
                <div className="school-list">
                  {schoolContext.schools?.map((school) => (
                    <button
                      type="button"
                      key={school.id}
                      className={activeSchool?.id === school.id ? "is-active" : ""}
                      onClick={() => setHoveredSchool(school)}
                    >
                      <span>{school.name}</span>
                      <small>{school.grades}</small>
                    </button>
                  ))}
                </div>
                <p className="school-caveat">{schoolContext.caveat}</p>
                <div className="source-links compact">
                  <a
                    href={schoolContext.districtUrl}
                    {...externalLinkProps(schoolContext.districtUrl)}
                  >
                    Princeton Public Schools
                  </a>
                  <a
                    href={schoolContext.registrationUrl}
                    {...externalLinkProps(schoolContext.registrationUrl)}
                  >
                    Registration and assignment
                  </a>
                  <a
                    href={schoolContext.performanceReportsUrl}
                    {...externalLinkProps(schoolContext.performanceReportsUrl)}
                  >
                    NJDOE performance reports
                  </a>
                </div>
              </div>
            ) : (
              <>
                <div className="highlight-list">
                  {civicMap.highlights.map((highlight) => (
                    <div key={highlight.key}>
                      <span>{highlight.title}</span>
                      <strong>{highlight.value}</strong>
                      <small>
                        {highlight.label}, {highlight.tract}
                      </small>
                      {formatBenchmarkDelta(
                        highlight.key,
                        highlight.rawValue,
                        civicMap.benchmarks?.[highlight.key],
                      ) ? (
                        <em>
                          {formatBenchmarkDelta(
                            highlight.key,
                            highlight.rawValue,
                            civicMap.benchmarks?.[highlight.key],
                          )}
                        </em>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="tract-rank">
                  <h3>{hoveredCivicFeature ? "Hovered area" : "Highest on this layer"}</h3>
                  {hoveredCivicFeature ? (
                    <div>
                      <span>
                        {hoveredCivicFeature.areaLabel}
                        <small>{hoveredCivicFeature.tractLabel}</small>
                      </span>
                      <strong>
                        <span>
                          {formatCivicValue(metricValueKey, hoveredCivicFeature[metricValueKey])}
                        </span>
                        {formatBenchmarkDelta(
                          metricValueKey,
                          hoveredCivicFeature[metricValueKey],
                          activeBenchmark,
                        ) ? (
                          <small>
                            {formatBenchmarkDelta(
                              metricValueKey,
                              hoveredCivicFeature[metricValueKey],
                              activeBenchmark,
                            )}
                          </small>
                        ) : null}
                      </strong>
                    </div>
                  ) : null}
                  {topCivicFeatures.map((feature) => (
                    <div key={feature.geoid}>
                      <span>
                        {feature.areaLabel}
                        <small>{feature.tractLabel}</small>
                      </span>
                      <strong>
                        <span>{formatCivicValue(metricValueKey, feature[metricValueKey])}</span>
                        {formatBenchmarkDelta(
                          metricValueKey,
                          feature[metricValueKey],
                          activeBenchmark,
                        ) ? (
                          <small>
                            {formatBenchmarkDelta(
                              metricValueKey,
                              feature[metricValueKey],
                              activeBenchmark,
                            )}
                          </small>
                        ) : null}
                      </strong>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="section faq-section" id="faq">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2>Clear answers for residents and AI assistants.</h2>
          </div>
          <p>
            Short answers to the questions a new Princetonian, a search engine, or an AI chatbot
            should be able to answer without guessing.
          </p>
        </div>
        <div className="faq-grid">
          {residentFaqs.map(({ question, answer }) => (
            <article className="faq-card" key={question}>
              <h3>{question}</h3>
              <p>{answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section guides-section" id="guides">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">Guides</p>
            <h2>Stable pages for recurring Princeton questions.</h2>
          </div>
          <p>
            Crawlable resident guides give search engines and AI assistants durable pages to cite,
            while the homepage stays focused on live daily signals.
          </p>
        </div>
        <div className="guide-grid">
          {pillarGuides.map(({ title, detail, url }) => (
            <a className="guide-card" href={url} key={url}>
              <span>{title}</span>
              <p>{detail}</p>
              <strong>
                Open guide <ChevronRight size={16} aria-hidden="true" />
              </strong>
            </a>
          ))}
        </div>
      </section>

      <section className="section culture-band" aria-labelledby="culture-heading">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">Culture</p>
            <h2 id="culture-heading">One evening, several Princeton layers.</h2>
          </div>
          <p>
            The library, university, Garden Theatre, McCarter, museum, and town calendars are
            different silos. PrincetonLive keeps the useful public signals together.
          </p>
        </div>
        <div className="culture-layout">
          <div className="culture-map" aria-hidden="true">
            <span className="pin pin-library">
              <Library size={18} />
            </span>
            <span className="pin pin-film">
              <Film size={18} />
            </span>
            <span className="pin pin-theater">
              <Theater size={18} />
            </span>
            <span className="pin pin-campus">
              <BookOpen size={18} />
            </span>
            <span className="route-line" />
          </div>
          <div className="source-links">
            <a
              href="https://www.princeton.edu/events"
              {...externalLinkProps("https://www.princeton.edu/events")}
            >
              Princeton University events
            </a>
            <a
              href="https://princetonlibrary.libnet.info/events"
              {...externalLinkProps("https://princetonlibrary.libnet.info/events")}
            >
              Princeton Public Library
            </a>
            <a
              href="https://www.princetongardentheatre.org/"
              {...externalLinkProps("https://www.princetongardentheatre.org/")}
            >
              Garden Theatre
            </a>
            <a
              href="https://www.mccarter.org/events"
              {...externalLinkProps("https://www.mccarter.org/events")}
            >
              McCarter Theatre
            </a>
          </div>
        </div>
      </section>

      <section className="section explore" id="explore">
        <div>
          <p className="eyebrow">Explore</p>
          <h2>First-month Princeton walks.</h2>
          <p>
            Short local anchors for learning the town beyond Nassau Street, selected for everyday
            usefulness rather than tourism.
          </p>
        </div>
        <div className="walk-list">
          {exploreStops.map(([stop, note], index) => (
            <div key={stop}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{stop}</strong>
              <small>{note}</small>
              {index % 2 === 0 ? <Trees size={18} /> : <Bike size={18} />}
            </div>
          ))}
        </div>
      </section>

      <footer>
        <div>
          <strong>PrincetonLive</strong>
          <span>
            Vibe coded with love by{" "}
            <a
              className="notranslate"
              translate="no"
              href="https://www.linkedin.com/in/berteloot"
              {...externalLinkProps("https://www.linkedin.com/in/berteloot")}
            >
              Stan Berteloot
            </a>
          </span>
        </div>
        <a href="#top">
          <Navigation size={16} aria-hidden="true" />
          Back to top
        </a>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
