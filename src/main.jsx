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

const profileStorageKey = "princetonlive.residentProfile";

const defaultResidentProfile = {
  street: "",
  modes: {
    family: false,
    noCar: false,
    culture: false,
    rain: false,
  },
};

// These replace the served <title> after hydration, so they must be at least as good
// as the one in index.html. The previous English entry was the bare word
// "PrincetonLive", which threw away the served title, and the fr/es entries were
// English strings describing a translation ("PrincetonLive in French") that were
// useless as a search snippet.
const languageMeta = {
  en: {
    title: "PrincetonLive | Princeton, NJ resident guide",
    description:
      "Daily Princeton, NJ resident guide: garbage day by street, weather alerts, public events, transit, town services, and library benefits.",
  },
  fr: {
    title: "PrincetonLive | Guide du résident de Princeton, NJ",
    description:
      "Guide quotidien pour les résidents de Princeton, NJ: jour de collecte des ordures par rue, alertes météo, événements publics, transports et services municipaux.",
  },
  es: {
    title: "PrincetonLive | Guía para residentes de Princeton, NJ",
    description:
      "Guía diaria para residentes de Princeton, NJ: día de recogida de basura por calle, alertas meteorológicas, eventos públicos, transporte y servicios municipales.",
  },
};

// Cache-busting bucket. A per-load Date.now() defeated the browser and CDN cache on
// every visit. A 5-minute bucket matches the CDN s-maxage=300 and still picks up the
// 3-hourly data refresh promptly.
const DATA_VERSION = Math.floor(Date.now() / 300000);

// alertsAvailable: null means "not loaded yet", false means "the feed failed".
// Those two must never render as "no alerts", which is an affirmative safety claim.
// eventsArePlaceholder marks the rows below as source links rather than real events.
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
  alertsAvailable: null,
  eventsArePlaceholder: true,
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

const fallbackWasteData = {
  generatedAt: null,
  streetCount: 0,
  recycleCoach: {
    pluginToken: "TVRJek53PT0=",
    url: "https://recyclecoach.com/cities/usa-nj-municipality-of-princeton/",
    apiNote:
      "Recycle Coach city lookup is publicly reachable, but PrincetonLive uses official municipal documents for local street lookup and links/embeds Recycle Coach for live address-specific reminders.",
  },
  rules: {
    trash:
      "Place Princeton garbage carts no earlier than 7 PM the day before collection and no later than 7 AM on collection day.",
    bulk:
      "Bulk waste is collected Wednesdays by reservation only. Reserve by Sunday 11:59 PM.",
    yard:
      "Leaf, branch, and log collection begins on the listed section date. Put material out by 7 AM on the start date, no more than 7 days prior.",
    recycling:
      "Use Recycle Coach for address-specific recycling dates and reminders.",
  },
  yardSchedule2026: {},
  streets: [],
  sources: [
    { name: "Princeton garbage collection", url: "https://www.princetonnj.gov/1359/Trash-Collection" },
    { name: "Leaf, branch, and log collection", url: "https://www.princetonnj.gov/450/Leaf-Branch-and-Log-Collection" },
    { name: "Recycle Coach Princeton", url: "https://recyclecoach.com/cities/usa-nj-municipality-of-princeton/" },
  ],
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

// Second line of defence for URLs that came from a public feed. The refresh script
// validates them at fetch time; this catches anything already sitting in a cached
// live-data.json. A card with no valid URL renders without a link.
function safeHref(href) {
  if (typeof href !== "string" || !href) return null;
  if (href.startsWith("#")) return href;
  try {
    const url = new URL(href, window.location.origin);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
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
    label: "Garbage & recycling",
    value: "Street lookup",
    url: "#waste",
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

const dailyShortcuts = [
  {
    label: "Garbage day",
    value: "Street lookup",
    url: "#waste",
    icon: Recycle,
  },
  {
    label: "Today",
    value: "Events + alerts",
    url: "#today",
    icon: CalendarDays,
  },
  {
    label: "Transit",
    value: "NYC / Philly",
    url: "#move",
    icon: Train,
  },
  {
    label: "Neighborhood",
    value: "Map context",
    url: "#civic",
    icon: Map,
  },
];

const newResidentChecklist = [
  {
    title: "Find your garbage day",
    detail: "Type your street once and learn your pickup day, bulk rule, and yard-waste section.",
    action: "Street lookup",
    url: "#waste",
    icon: Recycle,
  },
  {
    title: "Sign up for town alerts",
    detail: "Use Nixle for official emergency and municipal notifications.",
    action: "Nixle alerts",
    url: "https://www.princetonnj.gov/274/Emergency-Phone-Notifications",
    icon: AlertTriangle,
  },
  {
    title: "Get the library card",
    detail: "Unlock study rooms, digital resources, museum passes, events, and resident benefits.",
    action: "Library card",
    url: "https://princetonlibrary.org/about-us/library-cards/",
    icon: Library,
  },
  {
    title: "Learn your transit pattern",
    detail: "Know the Dinky, Princeton Junction, downtown parking, and no-car options before you need them.",
    action: "Move around",
    url: "#move",
    icon: Train,
  },
  {
    title: "Check neighborhood context",
    detail: "Use aggregate public data, school context, and address lookup without exposing private records.",
    action: "Neighborhood map",
    url: "#civic",
    icon: Map,
  },
  {
    title: "Pick a first walk",
    detail: "Start with the canal, Institute Woods, Battlefield, Community Park, or downtown side streets.",
    action: "Walks",
    url: "#explore",
    icon: Trees,
  },
];

const profileModeOptions = [
  {
    key: "family",
    label: "Family",
    detail: "Prioritize kid-friendly events and library programs.",
    icon: Users,
    filter: "family",
  },
  {
    key: "noCar",
    label: "No car",
    detail: "Keep transit, walking, biking, and shuttles close.",
    icon: Train,
    filter: null,
  },
  {
    key: "culture",
    label: "Culture",
    detail: "Surface lectures, arts, films, and performances.",
    icon: Theater,
    filter: "culture",
  },
  {
    key: "rain",
    label: "Rain plan",
    detail: "Favor indoor options when the weather gets annoying.",
    icon: Umbrella,
    filter: "rain",
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
    question: "Does the neighborhood map show individual households or voters?",
    answer:
      "No. The neighborhood map uses aggregate Census block-group data and official municipality-level voting results. PrincetonLive does not publish individual voter, household, or address-level records.",
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
  {
    stop: "D&R Canal towpath",
    note: "Flat, easy orientation walk along the water.",
    guideLabel: "Town guide",
    guideUrl: "https://www.princetonnj.gov/1641/DR-Canal-State-Park",
    mapLabel: "Trail maps",
    mapUrl: "https://dandrcanal.org/trails",
    icon: Trees,
  },
  {
    stop: "Institute Woods",
    note: "Shaded trails for a quiet first-month ritual.",
    guideLabel: "Town guide",
    guideUrl: "https://www.princetonnj.gov/1765/Institute-Woods",
    mapLabel: "Trail map",
    mapUrl: "https://www.ias.edu/sites/default/files/IAS%20Woods%20-%20Trail%20Map.pdf",
    icon: Trees,
  },
  {
    stop: "Princeton Battlefield",
    note: "History, fields, and a useful western anchor.",
    guideLabel: "Park guide",
    guideUrl: "https://dep.nj.gov/parksandforests/state-park/princeton-battlefield-state-park/",
    mapLabel: "Open map",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Princeton%20Battlefield%20State%20Park",
    icon: Bike,
  },
  {
    stop: "Stony Brook paths",
    note: "Good for nature breaks and weekend resets.",
    guideLabel: "Iron Mike",
    guideUrl: "https://www.princetonnj.gov/1771/Iron-Mike-Trail",
    mapLabel: "Trail maps",
    mapUrl: "https://www.fopos.org/trail-maps",
    icon: Trees,
  },
  {
    stop: "Community Park",
    note: "Playgrounds, pool, fields, and everyday family logistics.",
    guideLabel: "North park",
    guideUrl: "https://www.princetonnj.gov/1605/Community-Park-North",
    mapLabel: "South park",
    mapUrl: "https://princetonrecreation.com/facilities/facility/details/Community-Park-South-9",
    icon: Bike,
  },
  {
    stop: "Nassau Street side streets",
    note: "Errands, coffee, bookshops, and shortcuts.",
    guideLabel: "Digital tours",
    guideUrl: "https://princetonhistory.org/visit/digitaltours/",
    mapLabel: "Downtown",
    mapUrl: "https://www.experienceprinceton.org/visit",
    icon: Bike,
  },
];

function getInitialLanguage() {
  const params = new URLSearchParams(window.location.search);
  const lang = params.get("lang") || params.get("tl") || params.get("_x_tr_tl");
  return lang === "fr" || lang === "es" ? lang : "en";
}

function getStoredResidentProfile() {
  try {
    const raw = window.localStorage.getItem(profileStorageKey);
    if (!raw) return defaultResidentProfile;
    const parsed = JSON.parse(raw);
    return {
      street: typeof parsed.street === "string" ? parsed.street : "",
      modes: { ...defaultResidentProfile.modes, ...(parsed.modes ?? {}) },
    };
  } catch {
    return defaultResidentProfile;
  }
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

function normalizeWasteStreet(value) {
  return value
    .toUpperCase()
    .replace(/\bAVENUE\b/g, "AVE")
    .replace(/\bDRIVE\b/g, "DR")
    .replace(/\bSTREET\b/g, "ST")
    .replace(/\bROAD\b/g, "RD")
    .replace(/\bLANE\b/g, "LN")
    .replace(/\bCOURT\b/g, "CT")
    .replace(/\bCIRCLE\b/g, "CIR")
    .replace(/\bPLACE\b/g, "PL")
    .replace(/[^\w\s().-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wasteSectionSchedule(wasteData, section) {
  if (!section || section === "NOT INCLUDED" || section === "Not listed" || section === "Varies by block") {
    return null;
  }
  return wasteData.yardSchedule2026?.[section] ?? null;
}

const monthIndex = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

// The schedule is a list of labels like "March 16" or a bare "January" for a whole
// month. Showing dates that have already passed made the yard section read as useless,
// so only future entries are rendered. A bare month counts as upcoming until it ends.
function upcomingYardDates(dates, year, now = new Date()) {
  if (!Array.isArray(dates)) return [];
  return dates.filter((label) => {
    const match = String(label).trim().match(/^([A-Za-z]+)(?:\s+(\d{1,2}))?$/);
    if (!match) return true;
    const month = monthIndex[match[1].toLowerCase()];
    if (month === undefined) return true;
    const day = match[2] ? Number(match[2]) : null;
    // A bare month stays visible through its final day.
    const end = day === null ? new Date(year, month + 1, 0, 23, 59, 59) : new Date(year, month, day, 23, 59, 59);
    return end >= now;
  });
}

// The hardcoded yard schedule is stamped for one calendar year. Once that year is
// over the whole list is wrong, and nothing upstream would say so.
function yardScheduleIsStale(wasteData, now = new Date()) {
  const year = wasteData?.yardScheduleYear;
  return typeof year === "number" && now.getFullYear() > year;
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
  const [residentProfile, setResidentProfile] = useState(getStoredResidentProfile);
  const [liveData, setLiveData] = useState(fallbackData);
  const [wasteData, setWasteData] = useState(fallbackWasteData);
  const [wasteQuery, setWasteQuery] = useState("");
  const [civicMap, setCivicMap] = useState(fallbackCivicMap);
  const [civicMetric, setCivicMetric] = useState("income");
  const [hoveredCivicFeature, setHoveredCivicFeature] = useState(null);
  const [hoveredSchool, setHoveredSchool] = useState(null);
  const [recycleCoachFailed, setRecycleCoachFailed] = useState(false);
  const [civicTooltip, setCivicTooltip] = useState({ x: 0, y: 0 });
  const [addressQuery, setAddressQuery] = useState("");
  const [addressLookup, setAddressLookup] = useState({
    status: "idle",
    message: "",
    result: null,
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(profileStorageKey, JSON.stringify(residentProfile));
    } catch {
      // Local personalization is optional. If storage is blocked, the site still works.
    }
  }, [residentProfile]);

  useEffect(() => {
    fetch(`/live-data.json?v=${DATA_VERSION}`)
      .then((response) => {
        if (!response.ok) throw new Error(`live-data ${response.status}`);
        return response.json();
      })
      // A successful fetch carries its own eventsArePlaceholder: false and the
      // alertsAvailable flag written by the refresh script.
      .then((data) => setLiveData({ ...fallbackData, eventsArePlaceholder: false, ...data }))
      .catch(() => setLiveData({ ...fallbackData, alertsAvailable: false }));
  }, []);

  useEffect(() => {
    fetch(`/civic-map.json?v=${DATA_VERSION}`)
      .then((response) => (response.ok ? response.json() : fallbackCivicMap))
      .then((data) => setCivicMap({ ...fallbackCivicMap, ...data }))
      .catch(() => setCivicMap(fallbackCivicMap));
  }, []);

  useEffect(() => {
    fetch(`/waste-data.json?v=${DATA_VERSION}`)
      .then((response) => (response.ok ? response.json() : fallbackWasteData))
      .then((data) => setWasteData({ ...fallbackWasteData, ...data }))
      .catch(() => setWasteData(fallbackWasteData));
  }, []);

  useEffect(() => {
    if (document.getElementById("recyclecoach-loader")) return;
    const script = document.createElement("script");
    script.id = "recyclecoach-loader";
    script.src = "https://cdn.recyclecoach.com/webapp/js/loader.min.js";
    script.async = true;
    script.onerror = () => setRecycleCoachFailed(true);
    document.head.appendChild(script);

    // The loader 302-redirects and can silently never render, which left the embed
    // showing "Loading official Recycle Coach calendar..." forever. Fall back to a plain
    // link only when the mount point is genuinely still empty. An earlier version looked
    // for an iframe, which this widget never creates, so it showed the fallback even on
    // a healthy load. Poll rather than check once, because the widget renders whenever
    // the CDN script gets round to it.
    const deadline = Date.now() + 15000;
    const poll = window.setInterval(() => {
      const root = document.getElementById("rcroot");
      if (root && root.childElementCount > 0) {
        window.clearInterval(poll);
        return;
      }
      if (Date.now() >= deadline) {
        window.clearInterval(poll);
        setRecycleCoachFailed(true);
      }
    }, 1000);
    return () => window.clearInterval(poll);
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

  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      const target = document.getElementById(decodeURIComponent(hash));
      target?.scrollIntoView({ block: "start" });
    };

    const timers = [120, 450, 900].map((delay) => window.setTimeout(scrollToHash, delay));
    window.addEventListener("hashchange", scrollToHash);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("hashchange", scrollToHash);
    };
  }, [liveData.generatedAt, civicMap.generatedAt, wasteData.generatedAt]);

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
  const normalizedProfileStreet = normalizeWasteStreet(residentProfile.street);
  const profileWasteMatch = useMemo(() => {
    if (!normalizedProfileStreet) return null;
    return (
      wasteData.streets.find(
        (street) =>
          street.normalized === normalizedProfileStreet ||
          normalizeWasteStreet(street.street) === normalizedProfileStreet,
      ) ??
      wasteData.streets.find(
        (street) =>
          street.normalized?.includes(normalizedProfileStreet) ||
          normalizeWasteStreet(street.street).includes(normalizedProfileStreet),
      ) ??
      null
    );
  }, [normalizedProfileStreet, wasteData.streets]);
  const profileYardSchedule = profileWasteMatch
    ? wasteSectionSchedule(wasteData, profileWasteMatch.yardSection)
    : null;
  const activeProfileModes = profileModeOptions.filter((mode) => residentProfile.modes[mode.key]);
  const profileEventFilter = activeProfileModes.find((mode) => mode.filter)?.filter ?? "all";
  const profileEvents = useMemo(() => {
    const activeFilters = activeProfileModes.map((mode) => mode.filter).filter(Boolean);
    if (!activeFilters.length) return liveData.events.slice(0, 3);
    return liveData.events
      .filter((event) => activeFilters.some((activeFilter) => event.tags?.includes(activeFilter)))
      .slice(0, 3);
  }, [activeProfileModes, liveData.events]);
  const normalizedWasteQuery = normalizeWasteStreet(wasteQuery);
  const wasteMatches = useMemo(() => {
    if (!normalizedWasteQuery) return [];
    return wasteData.streets
      .filter(
        (street) =>
          street.normalized?.includes(normalizedWasteQuery) ||
          normalizeWasteStreet(street.street).includes(normalizedWasteQuery),
      )
      .slice(0, 8);
  }, [normalizedWasteQuery, wasteData.streets]);
  const primaryWasteMatch = wasteMatches[0] ?? null;
  const primaryYardSchedule = primaryWasteMatch
    ? wasteSectionSchedule(wasteData, primaryWasteMatch.yardSection)
    : null;
  const nextEvent = liveData.events[0];
  const alertCount = liveData.alerts?.length ?? 0;
  // Never state "no alerts" unless the feed actually answered. A failed or pending
  // fetch says so, because a resident checking during a storm reads silence as safety.
  const alertsUnavailable = liveData.alertsAvailable === false;
  const alertsPending = liveData.alertsAvailable === null || liveData.alertsAvailable === undefined;
  const alertStatusLabel = alertCount
    ? `${alertCount} active weather alert${alertCount === 1 ? "" : "s"}`
    : alertsUnavailable
      ? "Alert status unavailable"
      : alertsPending
        ? "Checking alerts"
        : "No active NWS alerts";
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

  const updateResidentStreet = (street) => {
    setResidentProfile((current) => ({ ...current, street }));
  };

  const toggleResidentMode = (key) => {
    setResidentProfile((current) => ({
      ...current,
      modes: {
        ...current.modes,
        [key]: !current.modes[key],
      },
    }));
  };

  const resetResidentProfile = () => {
    setResidentProfile(defaultResidentProfile);
  };
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
          message: "Found the address, but it falls outside this Princeton neighborhood map.",
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

  // <header> and <footer> sit outside <main> so they map to the banner and contentinfo
  // landmarks. Nested inside <main>, HTML gives them the generic role and a screen
  // reader gets no landmark rotor.
  return (
    <>
      <a className="skip-link" href="#top">
        Skip to main content
      </a>
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
            <a href="#my-princeton">My</a>
            <a href="#move">Move</a>
            <a href="#practical">Practical</a>
            <a href="#waste">Garbage</a>
            <a href="#perks">Perks</a>
            <a href="#civic">Neighborhood</a>
            <a href="#guides">Guides</a>
            <a href="#faq">FAQ</a>
            <a href="#explore">Explore</a>
          </nav>
          {/* role="group" so the aria-label is honored: on a bare div it is dropped.
              aria-current marks the one active language, which is what a single-select
              group means. aria-pressed described three independent toggles. */}
          <div
            className="language-switcher notranslate"
            translate="no"
            role="group"
            aria-label="Page language"
          >
            <span className="translation-provider">Google Translate</span>
            {languages.map((option) => (
              <button
                key={option.code}
                type="button"
                className={language === option.code ? "is-active" : ""}
                onClick={() => selectLanguage(option.code)}
                aria-current={language === option.code ? "true" : undefined}
                aria-label={option.label}
              >
                {option.short}
              </button>
            ))}
          </div>
          <div id="google_translate_element" className="google-translate-shell" />
        </div>
      </header>

      <main>
      {/* tabIndex -1 so the skip link moves focus here, not just the scroll position. */}
      <section className="hero" id="top" tabIndex={-1}>
        {/* Self-hosted photograph of the Nassau Hall cupola, owned by the site author.
            Replaces a 421 KB image hotlinked from princeton.edu that was the LCP
            candidate, spent a third party's bandwidth, carried an ?itok= derivative token
            that expires whenever the university rebuilds its image styles, and was
            university-owned imagery on an independent site. 5408x3072 source, generated
            by `npm run build:hero`. A phone now pulls 39 to 76 KB. */}
        <div className="hero-media" aria-hidden="true">
          <picture>
            <source
              type="image/webp"
              srcSet={[
                "/hero-nassau-hall-800.webp 800w",
                "/hero-nassau-hall-1200.webp 1200w",
                "/hero-nassau-hall-1600.webp 1600w",
                "/hero-nassau-hall-2000.webp 2000w",
              ].join(", ")}
              sizes="100vw"
            />
            <img
              src="/hero-nassau-hall-1600.jpg"
              alt=""
              width="1600"
              height="909"
              fetchPriority="high"
              decoding="async"
            />
          </picture>
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
          <div className="daily-shortcuts" role="group" aria-label="Resident shortcuts">
            {dailyShortcuts.map(({ label, value, url, icon: Icon }) => (
              <a href={url} key={label} {...externalLinkProps(url)}>
                <Icon size={17} aria-hidden="true" />
                <span>{label}</span>
                <strong>{value}</strong>
              </a>
            ))}
          </div>
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
            <strong>{alertStatusLabel}</strong>
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

      <section className="section my-princeton" id="my-princeton" aria-labelledby="my-princeton-heading">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">My Princeton</p>
            <h2 id="my-princeton-heading">Your local setup, saved on this device.</h2>
          </div>
          <p>
            Add a street and a few resident modes. PrincetonLive keeps this in your browser only,
            then turns the page into a lightweight dashboard for your week.
          </p>
        </div>
        <div className="profile-layout">
          <section className="profile-setup" aria-label="My Princeton setup">
            <label>
              <span>Street name</span>
              <input
                value={residentProfile.street}
                onChange={(event) => updateResidentStreet(event.target.value)}
                placeholder="Lytle Street, Library Place..."
              />
            </label>
            <div className="profile-mode-grid" aria-label="Resident modes">
              {profileModeOptions.map(({ key, label, detail, icon: Icon }) => (
                <button
                  type="button"
                  key={key}
                  className={residentProfile.modes[key] ? "is-active" : ""}
                  onClick={() => toggleResidentMode(key)}
                  aria-pressed={residentProfile.modes[key]}
                >
                  <Icon size={17} aria-hidden="true" />
                  <strong>{label}</strong>
                  <span>{detail}</span>
                </button>
              ))}
            </div>
            <div className="profile-privacy">
              <span>No account. No address upload. Browser-only.</span>
              <button type="button" onClick={resetResidentProfile}>
                Reset
              </button>
            </div>
          </section>

          <aside className="profile-dashboard" aria-label="My Princeton dashboard">
            <div className="profile-card is-primary">
              <span>My garbage day</span>
              <strong>
                {profileWasteMatch
                  ? `${profileWasteMatch.street}: ${profileWasteMatch.trashDay}`
                  : residentProfile.street
                    ? "Street not matched yet"
                    : "Add your street"}
              </strong>
              <p>
                {profileYardSchedule
                  ? `Yard section ${profileWasteMatch.yardSection}; next branch and log starts ${
                      upcomingYardDates(profileYardSchedule.branchAndLogs, wasteData.yardScheduleYear)
                        .slice(0, 3)
                        .join(", ") || `none left in ${wasteData.yardScheduleYear}`
                    }.`
                  : "Use the street lookup for pickup day, yard section, bulk rules, and Recycle Coach."}
              </p>
              <a
                href="#waste"
                onClick={() => {
                  if (profileWasteMatch) setWasteQuery(profileWasteMatch.street);
                }}
              >
                Open garbage lookup <ChevronRight size={15} aria-hidden="true" />
              </a>
            </div>
            <div className="profile-card">
              <span>{residentProfile.modes.noCar ? "No-car plan" : "Commute plan"}</span>
              <strong>{residentProfile.modes.noCar ? "Transit first" : "Check transfer + parking"}</strong>
              <p>
                {residentProfile.modes.noCar
                  ? "Keep the Dinky, Princeton Loop, walking, biking, and shuttles close."
                  : "Compare the Dinky, Princeton Junction parking, downtown parking, and NYC/Philly route timing."}
              </p>
              <a href="#move">
                Move around <ChevronRight size={15} aria-hidden="true" />
              </a>
            </div>
            <div className="profile-card">
              <span>Events for me</span>
              <strong>
                {activeProfileModes.length
                  ? activeProfileModes.map((mode) => mode.label).join(" + ")
                  : "Latest resident signals"}
              </strong>
              <p>
                {profileEvents[0]
                  ? `${profileEvents[0].title} (${profileEvents[0].source})`
                  : "No matching public events in this refresh yet."}
              </p>
              <a
                href="#today"
                onClick={() => {
                  setFilter(profileEventFilter);
                  setQuery("");
                }}
              >
                Show my events <ChevronRight size={15} aria-hidden="true" />
              </a>
            </div>
            <div className="profile-card">
              <span>Neighborhood</span>
              <strong>Map context without private records</strong>
              <p>Use public aggregate data, school context, and address lookup when you need orientation.</p>
              <a href="#civic">
                Open map <ChevronRight size={15} aria-hidden="true" />
              </a>
            </div>
          </aside>
        </div>
      </section>

      <section className="section resident-checklist" id="new-resident" aria-labelledby="new-resident-heading">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">New here</p>
            <h2 id="new-resident-heading">First-week Princeton setup.</h2>
          </div>
          <p>
            A practical checklist for turning Princeton from a famous place into a usable home:
            alerts, garbage pickup, library access, transit, neighborhood context, and first walks.
          </p>
        </div>
        <div className="checklist-grid">
          {newResidentChecklist.map(({ title, detail, action, url, icon: Icon }, index) => (
            <a className="checklist-card" href={url} key={title} {...externalLinkProps(url)}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <Icon size={19} aria-hidden="true" />
              <strong>{title}</strong>
              <p>{detail}</p>
              <b>
                {action} <ChevronRight size={15} aria-hidden="true" />
              </b>
            </a>
          ))}
        </div>
      </section>

      <section className="section today-grid" id="today" aria-labelledby="today-heading">
        <div className="section-heading">
          <p className="eyebrow">Today</p>
          <h2 id="today-heading">Public events and resident signals.</h2>
          <p>
            Pulled from public Princeton sources, then trimmed into a short list that is useful
            for a resident deciding what to do next.
          </p>
        </div>
        <div className="control-row" role="group" aria-label="Agenda filters">
          {agendaFilters.map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              className={filter === value ? "is-active" : ""}
              onClick={() => setFilter(value)}
              aria-current={filter === value ? "true" : undefined}
            >
              <Icon size={17} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        {/* The Clear button used to sit inside the <label>, which is invalid and makes a
            click on it also activate the input. The label now wraps only the field. */}
        <div className="search-box">
          <label htmlFor="agenda-search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Search agenda</span>
          </label>
          <input
            id="agenda-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search events, library, town, lectures..."
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              Clear
            </button>
          ) : null}
        </div>
        <div className="results-meta" aria-live="polite">
          Showing {visibleEvents.length} of {filteredEvents.length} matching public items
        </div>
        {liveData.eventsArePlaceholder ? (
          <p className="agenda-placeholder-note" role="status">
            The Princeton event feeds did not load. The entries below link to each official
            calendar, so you can check today's listings at the source.
          </p>
        ) : null}
        <div className="agenda-list" key={`agenda-${filter}-${query}-${liveData.generatedAt}`}>
          {visibleEvents.length ? (
            visibleEvents.map((event, index) => (
              <a
                className="agenda-card"
                href={safeHref(event.url) ?? undefined}
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

      {alertCount || alertsUnavailable ? (
        <section className="section alert-band" aria-labelledby="alerts-heading">
          <div className="section-heading split">
            <div>
              <p className="eyebrow">Active alerts</p>
              <h2 id="alerts-heading">
                {alertsUnavailable
                  ? "Alert status could not be checked."
                  : "Weather items that need attention."}
              </h2>
            </div>
            <p>
              {alertsUnavailable
                ? "The National Weather Service alert feed did not respond during the last refresh, so this page cannot tell you whether Princeton is under an alert. Check weather.gov directly."
                : "Current National Weather Service alerts for Princeton. When there are no active alerts, this section is hidden so the page stays focused."}
            </p>
          </div>
          <div className="alert-strip">
            {alertsUnavailable ? (
              <a
                href="https://alerts.weather.gov/search?zone=NJZ016"
                {...externalLinkProps("https://alerts.weather.gov/search?zone=NJZ016")}
              >
                <AlertTriangle size={18} aria-hidden="true" />
                <strong>Check weather.gov</strong>
                <span>Live National Weather Service alerts for Mercer County</span>
              </a>
            ) : (
              liveData.alerts.slice(0, 3).map((alert) => (
                <a href={safeHref(alert.url) ?? undefined} key={alert.id} {...externalLinkProps(alert.url)}>
                  <AlertTriangle size={18} aria-hidden="true" />
                  <strong>{alert.event}</strong>
                  <span>{alert.headline}</span>
                </a>
              ))
            )}
          </div>
        </section>
      ) : null}

      <section className="section" id="move" aria-labelledby="move-heading">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">Move</p>
            <h2 id="move-heading">Make the commute choice before the calendar choice.</h2>
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

      <section className="section practical" id="practical" aria-labelledby="practical-heading">
        <div className="section-heading">
          <p className="eyebrow">Practical</p>
          <h2 id="practical-heading">Resident errands without the tab hunt.</h2>
          <p>
            Start with the street lookup below when you need garbage day, bulk pickup rules,
            or the yard-waste section for a Princeton street.
          </p>
        </div>
        <section className="waste-tool" id="waste" aria-labelledby="waste-heading">
          <div className="waste-copy">
            <p className="eyebrow">Garbage pickup by street</p>
            <h3 id="waste-heading">Type your street to find your Princeton garbage day.</h3>
            <p>
              Search the town's public street schedule by street name only. The result shows regular
              garbage pickup, bulk pickup rules, and the yard-waste section used for leaves, branches,
              and logs.
            </p>
            <div className="search-box waste-search">
              <label htmlFor="waste-search-input">
                <Search size={18} aria-hidden="true" />
                <span className="sr-only">Search Princeton street waste schedule</span>
              </label>
              <input
                id="waste-search-input"
                value={wasteQuery}
                onChange={(event) => setWasteQuery(event.target.value)}
                placeholder="Street name, e.g. Lytle Street"
              />
              {wasteQuery ? (
                <button type="button" onClick={() => setWasteQuery("")} aria-label="Clear street search">
                  Clear
                </button>
              ) : null}
            </div>
            {/* The live region is a short count, not the result list. Announcing up to
                eight full records on every keystroke made the field unusable. */}
            <div className="sr-only" aria-live="polite">
              {normalizedWasteQuery
                ? `${wasteMatches.length} street${wasteMatches.length === 1 ? "" : "s"} matched`
                : ""}
            </div>
            {yardScheduleIsStale(wasteData) ? (
              <p className="waste-stale" role="status">
                The yard collection dates below are from the {wasteData.yardScheduleYear} schedule and
                have not been replaced yet. Confirm with the municipal page before putting material out.
              </p>
            ) : null}
            <div className="waste-results">
              {!normalizedWasteQuery ? (
                <div className="waste-prompt">
                  <strong>Start with the street name only.</strong>
                  <p>Do not enter a house number. Try one of these examples or type your street above.</p>
                  <div>
                    {["Lytle Street", "Library Place", "Witherspoon Street"].map((example) => (
                      <button type="button" key={example} onClick={() => setWasteQuery(example)}>
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              ) : wasteMatches.length ? (
                wasteMatches.map((street) => {
                  const sectionSchedule = wasteSectionSchedule(wasteData, street.yardSection);
                  const upcoming = sectionSchedule
                    ? upcomingYardDates(sectionSchedule.branchAndLogs, wasteData.yardScheduleYear)
                    : [];
                  return (
                    <article className="waste-result" key={`${street.normalized}-${street.trashDay}-${street.yardSection}`}>
                      <div>
                        <strong>{street.street}</strong>
                        <span>
                          Garbage: {street.trashDay === "NOT INCLUDED" ? "not included" : street.trashDay}
                        </span>
                      </div>
                      <div>
                        <small>Yard section</small>
                        <b>{street.yardSection}</b>
                      </div>
                      {street.trashVariesByBlock && street.trashBlocks?.length ? (
                        <p className="waste-blocks">
                          <span>Garbage day depends on your block:</span>
                          {street.trashBlocks.map((block) => (
                            <span key={block.segment}>
                              {block.segment}: <b>{block.value}</b>
                            </span>
                          ))}
                        </p>
                      ) : null}
                      {street.yardVariesByBlock && street.yardBlocks?.length ? (
                        <p className="waste-blocks">
                          <span>Yard section depends on your block:</span>
                          {street.yardBlocks.map((block) => (
                            <span key={block.segment}>
                              {block.segment}: section <b>{block.value}</b>
                            </span>
                          ))}
                        </p>
                      ) : null}
                      {street.trashDay === "NOT INCLUDED" ? (
                        <p>{wasteData.rules?.notIncluded}</p>
                      ) : null}
                      {sectionSchedule ? (
                        upcoming.length ? (
                          <p>Next branch and log starts: {upcoming.slice(0, 4).join(", ")}.</p>
                        ) : (
                          <p>
                            No branch or log start dates remain in the {wasteData.yardScheduleYear} schedule.
                            Check the municipal page for next year's dates.
                          </p>
                        )
                      ) : street.yardVariesByBlock ? null : (
                        <p>Use Recycle Coach or the official section list for address-level yard pickup.</p>
                      )}
                    </article>
                  );
                })
              ) : (
                <div className="empty-state">
                  No street match yet. Try the street name only, without a house number.
                </div>
              )}
            </div>
          </div>
          <aside className="waste-official" aria-label="Official Princeton waste tools">
            <div className="waste-summary">
              <span>{wasteData.streetCount || "Official"} street records</span>
              <strong>
                {primaryWasteMatch
                  ? `${primaryWasteMatch.street}: ${primaryWasteMatch.trashDay}`
                  : "Type a street for the quickest answer"}
              </strong>
              <p>
                {primaryYardSchedule
                  ? `Section ${primaryWasteMatch.yardSection} loose leaves: ${
                      upcomingYardDates(primaryYardSchedule.looseLeaves, wasteData.yardScheduleYear).join(", ") ||
                      `no dates left in ${wasteData.yardScheduleYear}`
                    }.`
                  : wasteData.rules.yard}
              </p>
              {/* Freshness was invisible here, so a resident could not tell a current
                  schedule from one scraped before the town changed it. */}
              <small className="waste-freshness">
                Street data {formatRefresh(wasteData.generatedAt)}
              </small>
            </div>
            <div className="waste-rules">
              <div>
                <span>Bulk items</span>
                <p>{wasteData.rules.bulk}</p>
              </div>
              <div>
                <span>Recycling</span>
                <p>{wasteData.rules.recycling}</p>
              </div>
            </div>
            <div className="recyclecoach-card notranslate" translate="no">
              <div>
                <span>Official live calendar</span>
                <p>Recycle Coach handles exact address schedules, reminders, recycling, and yard-waste updates.</p>
              </div>
              <div className="recyclecoach-embed">
                {recycleCoachFailed ? (
                  <p className="recyclecoach-fallback">
                    The Recycle Coach widget did not load.{" "}
                    <a
                      href={wasteData.recycleCoach.url}
                      {...externalLinkProps(wasteData.recycleCoach.url)}
                    >
                      Open the official Princeton calendar
                    </a>{" "}
                    for address-level schedules and reminders.
                  </p>
                ) : (
                  <div id="rcroot" data-plugin={wasteData.recycleCoach.pluginToken} />
                )}
              </div>
            </div>
            <div className="source-links compact waste-links">
              {wasteData.sources.slice(0, 4).map((source) => (
                <a href={source.url} key={source.url} {...externalLinkProps(source.url)}>
                  {source.name}
                </a>
              ))}
            </div>
          </aside>
        </section>
        <div className="tile-grid practical-more">
          {practicalTiles.map(({ label, value, url, icon: Icon }) => (
            <a className="utility-tile" href={url} key={label} {...externalLinkProps(url)}>
              <Icon size={21} aria-hidden="true" />
              <span>{label}</span>
              <strong>{value}</strong>
            </a>
          ))}
        </div>
      </section>

      <section className="section resident-perks" id="perks" aria-labelledby="perks-heading">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">Resident perks</p>
            <h2 id="perks-heading">Things Princeton quietly makes available.</h2>
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

      <section className="section civic-section" id="civic" aria-labelledby="civic-heading">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">Neighborhood context</p>
            <h2 id="civic-heading">Public data, closer to daily life.</h2>
          </div>
          <p>
            Census block-group boundaries and ACS estimates make the map more local without exposing
            household-level records. Areas are selected against the Princeton municipal boundary. Voting uses the official Princeton municipal result until
            district-level results can be joined safely.
          </p>
        </div>

        <div className="civic-layout">
          <div className={`civic-map-panel metric-${civicMetric}`}>
            <div className="civic-toolbar" role="group" aria-label="Neighborhood map metrics">
              {civicMetrics.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  className={civicMetric === key ? "is-active" : ""}
                  onClick={() => {
                    setCivicMetric(key);
                    setHoveredSchool(null);
                  }}
                  aria-current={civicMetric === key ? "true" : undefined}
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
                        // WCAG 1.4.13 requires hover/focus content to be dismissable
                        // without moving the pointer or focus.
                        if (event.key === "Escape") {
                          setHoveredCivicFeature(null);
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
                          {/* The visible marker is 7.3px across on a 360px phone, well
                              under the 24px minimum. This invisible circle enlarges the
                              hit area without changing the design. */}
                          <circle className="school-marker-hit" r="8" />
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

      <section className="section faq-section" id="faq" aria-labelledby="faq-heading">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2 id="faq-heading">Clear answers for residents and AI assistants.</h2>
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

      <section className="section guides-section" id="guides" aria-labelledby="guides-heading">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">Guides</p>
            <h2 id="guides-heading">Stable pages for recurring Princeton questions.</h2>
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

      <section className="section explore" id="explore" aria-labelledby="explore-heading">
        <div>
          <p className="eyebrow">Explore</p>
          <h2 id="explore-heading">First-month Princeton walks.</h2>
          <p>
            Short local anchors for learning the town beyond Nassau Street, selected for everyday
            usefulness rather than tourism.
          </p>
        </div>
        <div className="walk-list">
          {exploreStops.map((walk, index) => {
            const WalkIcon = walk.icon;
            return (
              <article key={walk.stop}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{walk.stop}</strong>
                <small>{walk.note}</small>
                <div className="walk-actions">
                  <a href={walk.guideUrl} {...externalLinkProps(walk.guideUrl)}>
                    {walk.guideLabel} <ExternalLink size={13} aria-hidden="true" />
                  </a>
                  <a href={walk.mapUrl} {...externalLinkProps(walk.mapUrl)}>
                    {walk.mapLabel} <Map size={13} aria-hidden="true" />
                  </a>
                </div>
                <WalkIcon size={18} aria-hidden="true" />
              </article>
            );
          })}
        </div>
      </section>
      </main>

      <footer>
        <div className="footer-identity">
          <strong>PrincetonLive</strong>
          <span>
            Built and maintained by{" "}
            <a
              className="notranslate"
              translate="no"
              href="https://www.linkedin.com/in/berteloot"
              {...externalLinkProps("https://www.linkedin.com/in/berteloot")}
            >
              Stan Berteloot
            </a>
            , Princeton resident. Corrections welcome.
          </span>
        </div>
        {/* The two exposures worth naming on every page: implied affiliation (the site
            carries the town name and a photograph of Nassau Hall) and reliance (residents
            act on collection days and weather alerts shown here). */}
        <div className="footer-disclaimer">
          <p>
            <strong>Independent and unofficial.</strong> PrincetonLive is a personal project
            with no affiliation to and no endorsement from Princeton University, the
            Municipality of Princeton, Princeton Public Library, or Princeton Public Schools.
            All names and trademarks belong to their owners.
          </p>
          <p>
            Information is gathered from public sources, provided as is with no warranty, and
            can be delayed, incomplete, or out of date. It is not authoritative. Confirm
            anything that matters with the official source before you act on it. Never rely on
            this site in an emergency: call 911, and check{" "}
            <a href="https://www.weather.gov/phi/" {...externalLinkProps("https://www.weather.gov/phi/")}>
              weather.gov
            </a>{" "}
            for severe weather.
          </p>
          <p>
            <a href="/legal.html">Disclaimer, terms, and privacy</a>
          </p>
        </div>
        <a href="#top">
          <Navigation size={16} aria-hidden="true" />
          Back to top
        </a>
      </footer>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
