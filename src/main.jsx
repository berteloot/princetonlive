import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
// Verified local facts live in one JSON file so the page generator and the app cannot
// drift apart on a rule that carries a fine.
import localRules from "./data/local-rules.json";
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
  ShieldCheck,
  Menu,
  X,
  CloudRain,
  ExternalLink,
  Film,
  Info,
  Landmark,
  Library,
  Map,
  Moon,
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

// Cache-busting bucket. A per-load Date.now() defeated the browser and CDN cache on
// every visit. A 5-minute bucket matches the CDN s-maxage=300 and still picks up the
// 3-hourly data refresh promptly.
// Five-minute buckets: a cache-busting query string for the generated JSON files.
const dataVersionNow = () => Math.floor(Date.now() / 300000);
// A tab left open overnight was showing yesterday's events. After this many buckets
// (30 minutes) away, coming back to the tab re-reads every data file.
const STALE_AFTER_BUCKETS = 6;

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
  days: [],
  windowDays: 7,
  trackedSeries: [],
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

// Eight entries, one per question a visitor arrives with. Perks, walks and My Princeton
// are reached from "New to town?", which groups the things a newcomer does once. A reader
// of the first version read "Move" as house-moving and "My" as nothing at all.
const primaryNavLinks = [
  ["#today", "Today"],
  ["#waste", "Garbage"],
  ["#practical", "Services"],
  ["#move", "Transit"],
  ["#new-resident", "New to town?"],
  ["#civic", "Neighborhood"],
  ["#guides", "Guides"],
  ["#faq", "FAQ"],
];

// Tooltip box plus its 14px offset, and the room it needs above and below the pointer.
const TOOLTIP_WIDTH = 290;
const TOOLTIP_EDGE_PAD = 76;

// School markers draw in CSS pixels: an 18px dot inside a 28px hit target, which clears
// the 24px minimum for a touch point.
const SCHOOL_DOT_PX = 9;
const SCHOOL_HIT_PX = 14;
// Used until the map reports its width, one frame at most.
const CIVIC_MAP_FALLBACK_WIDTH = 900;

// 5 PM is where "after work" starts for the evening filter, and the first show at the
// Garden Theatre most nights.
const EVENING_HOUR = 17;
const DAY_PREVIEW_COUNT = 12;

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


// The library publishes hours as static text with no API and no holiday feed, so this
// is computed from the posted weekly hours and says as much. It must never be presented
// as authoritative on a holiday.
function libraryStatus(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(values.weekday);
  const span = localRules.library.hours[dayIndex];
  if (!span) return { open: false, label: "Closed today" };
  const minutes = Number(values.hour) * 60 + Number(values.minute);
  const [openHour, closeHour] = span;
  const open = minutes >= openHour * 60 && minutes < closeHour * 60;
  const fmt = (hour) => {
    const suffix = hour >= 12 ? "pm" : "am";
    const twelve = hour % 12 === 0 ? 12 : hour % 12;
    return `${twelve} ${suffix}`;
  };
  return {
    open,
    label: open ? `Open until ${fmt(closeHour)}` : `Closed, opens ${fmt(openHour)}`,
  };
}

const commuteCards = [
  {
    title: "Live departures",
    detail:
      "NJ Transit DepartureVision for Princeton Junction: the next trains, their tracks and any delay, as the station board shows them. Everything else on this page is a published schedule.",
    action: "DepartureVision",
    url: "https://www.njtransit.com/dv-to/Princeton%20Junction",
    icon: Train,
  },
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
    url: "https://www.septa.org/schedules/",
    icon: Route,
  },
  {
    title: "Downtown parking",
    detail:
      "Meters run 9 am to 8 pm Monday to Thursday, to 9 pm Friday and Saturday, and 1 pm to 8 pm Sunday. Rates rise on 14 September 2026.",
    action: "Parking rules",
    url: "https://www.princetonnj.gov/203/Parking-in-Princeton",
    icon: ParkingCircle,
  },
  {
    title: "Overnight street parking",
    detail:
      "No overnight parking on any former Princeton Borough street between 2 and 6 am, and not every street is signed. A home without a driveway can buy one on-street permit, $30 a quarter, good from 6 pm to 9 am.",
    action: "Check the rule",
    url: "https://www.princetonnj.gov/203/Parking-in-Princeton",
    icon: ParkingCircle,
  },
  {
    title: "No-car options",
    detail: "TigerTransit, the Princeton Loop, walking, biking and the Dinky cover most day-to-day trips.",
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
    key: "garbage",
    label: "Garbage day",
    value: "Street lookup",
    url: "#waste",
    icon: Recycle,
  },
  {
    key: "today",
    label: "Today",
    value: "Events + alerts",
    url: "#today",
    icon: CalendarDays,
  },
  {
    key: "transit",
    label: "Transit",
    value: "NYC / Philly",
    url: "#move",
    icon: Train,
  },
  {
    key: "setup",
    label: "New to town?",
    value: "First-week setup",
    url: "#new-resident",
    icon: Sparkles,
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
    detail: "A free card covers study rooms, museum passes and digital media.",
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
    detail: "Show lectures, films and performances.",
    icon: Theater,
    filter: "culture",
  },
  {
    key: "rain",
    label: "Rain plan",
    detail: "Favor indoor options when it rains.",
    icon: Umbrella,
    filter: "rain",
  },
];

const residentFaqs = [
  {
    question: "What is PrincetonLive?",
    answer:
      "PrincetonLive is an independent daily operating guide for Princeton, NJ residents and new arrivals. It puts the day's public listings, garbage day by street, transit links and neighborhood data on one page.",
  },
  {
    question: "Is PrincetonLive an official Princeton University or municipal website?",
    answer:
      "No. It is independent, and it links to the official university, library, municipal, Census and weather pages whenever you need the source itself.",
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
  {
    question: "Can I send an event or a listing to be posted?",
    answer:
      "No. PrincetonLive takes no submissions and has no editor. It reads the public calendars of the university, the library, the town and the Garden Theatre every three hours, so an event posted on one of those appears here on its own.",
  },
  {
    question: "How current is the page I am looking at?",
    answer:
      "The Updated time in the top panel says when the data was last read. The page reloads its data when you return to the tab after half an hour; a manual refresh does the same at any time.",
  },
];

const pillarGuides = [
  {
    title: "Garbage schedule by street",
    detail: "Collection day and brush section for every Princeton street, with the set-out times and bulk rules.",
    url: "/guides/princeton-garbage-schedule.html",
  },
  {
    title: "Leaf and brush schedule",
    detail: "Branch, loose leaf and bagged leaf dates for all five collection sections, and the streets in each.",
    url: "/guides/princeton-leaf-and-brush-schedule.html",
  },
  {
    title: "Parking rules",
    detail: "The 2 to 6 am overnight ban, downtown meter hours by day, and the September rate change.",
    url: "/guides/princeton-parking-rules.html",
  },
  {
    title: "Garden Theatre showtimes",
    detail: "What is playing on Nassau Street this week, read from the theatre's ticketing system.",
    url: "/guides/princeton-garden-theatre-showtimes.html",
  },
  {
    title: "Princeton crime rate",
    detail: "Municipal violent and property crime against New Jersey and national rates.",
    url: "/guides/princeton-crime-rate.html",
  },
  {
    title: "Moving to Princeton",
    detail: "First-week orientation for new residents: alerts, transit, library cards, town services and first walks.",
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
        title: "Princeton University Art Museum",
        detail:
          "The rebuilt museum reopened with free admission for everyone, no ticket or membership needed. Check the calendar for current exhibitions, talks, and tours.",
        action: "Exhibitions and events",
        url: "https://artmuseum.princeton.edu/exhibitions-events",
        icon: Theater,
      },
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
    note: "Shaded, flat trails behind the Institute.",
    guideLabel: "Town guide",
    guideUrl: "https://www.princetonnj.gov/1765/Institute-Woods",
    mapLabel: "Trail map",
    mapUrl: "https://www.ias.edu/sites/default/files/IAS%20Woods%20-%20Trail%20Map.pdf",
    icon: Trees,
  },
  {
    stop: "Princeton Battlefield",
    note: "Open fields and the battle monument, west of town.",
    guideLabel: "Park guide",
    guideUrl: "https://dep.nj.gov/parksandforests/state-park/princeton-battlefield-state-park/",
    mapLabel: "Open map",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Princeton%20Battlefield%20State%20Park",
    icon: Bike,
  },
  {
    stop: "Stony Brook paths",
    note: "Water and woods, quiet on a weekday.",
    guideLabel: "Iron Mike",
    guideUrl: "https://www.princetonnj.gov/1771/Iron-Mike-Trail",
    mapLabel: "Trail maps",
    mapUrl: "https://www.fopos.org/trail-maps",
    icon: Trees,
  },
  {
    stop: "Community Park",
    note: "Playgrounds, a pool and fields.",
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



// The street schedule is upper-case in the town PDF; a heading reads better in title case.
function titleCase(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/(^|[\s-])([a-z])/g, (match, lead, letter) => `${lead}${letter.toUpperCase()}`);
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

// Site-wide search (a reader asked for one). Everything on the page is already in memory,
// so this is a substring match over a flat index: sections, guides, FAQ, transit and
// service tiles, perks, walks, every street in the garbage schedule and this week's
// events. A street result fills the garbage lookup; an event result opens its day.
const SEARCH_RESULT_LIMIT = 8;

function SiteSearch({ entries, onPick, onClose, autoFocus = false }) {
  const [term, setTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);
  const inputId = "site-search-input";
  const listId = "site-search-results";
  const needle = term.trim().toLowerCase();
  const results = useMemo(() => {
    if (needle.length < 2) return [];
    const starts = [];
    const contains = [];
    for (const entry of entries) {
      const hay = entry.text.toLowerCase();
      if (hay.startsWith(needle) || entry.label.toLowerCase().startsWith(needle)) starts.push(entry);
      else if (hay.includes(needle)) contains.push(entry);
      if (starts.length >= SEARCH_RESULT_LIMIT) break;
    }
    return [...starts, ...contains].slice(0, SEARCH_RESULT_LIMIT);
  }, [entries, needle]);
  const open = needle.length >= 2;
  const activeId = activeIndex >= 0 && results[activeIndex] ? `${listId}-${activeIndex}` : undefined;

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const pick = (entry) => {
    onPick?.(entry);
    setTerm("");
    setActiveIndex(-1);
    onClose?.();
  };

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (term) {
        setTerm("");
        setActiveIndex(-1);
      } else {
        onClose?.();
      }
      return;
    }
    if (!open || !results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const entry = results[activeIndex];
      pick(entry);
      if (entry.url.startsWith("#")) window.location.hash = entry.url;
      else window.open(entry.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="site-search" role="search">
      <label htmlFor={inputId}>Find on this site</label>
      <div className="site-search-field">
        <Search size={18} aria-hidden="true" />
        <input
          id={inputId}
          ref={inputRef}
          type="search"
          role="combobox"
          value={term}
          placeholder="A street, an event, a guide, a question"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={activeId}
          onChange={(event) => {
            setTerm(event.target.value);
            setActiveIndex(-1);
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      {/* The announcement is a count. Reading eight records on every keystroke is noise. */}
      <div className="sr-only" aria-live="polite">
        {open ? `${results.length} result${results.length === 1 ? "" : "s"}` : ""}
      </div>
      {open ? (
        <ul id={listId} className="site-search-results" role="listbox" aria-label="Search results">
          {results.length ? (
            results.map((entry, index) => (
              // Two showtimes of one film share title and URL, so the key carries the index.
              <li
                key={`${index}-${entry.kind}-${entry.label}`}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={index === activeIndex ? "is-active" : ""}
              >
                <a
                  href={entry.url}
                  tabIndex={-1}
                  {...externalLinkProps(entry.url)}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => pick(entry)}
                >
                  <span>{entry.kind}</span>
                  <strong>{entry.label}</strong>
                  {entry.detail ? <small>{entry.detail}</small> : null}
                </a>
              </li>
            ))
          ) : (
            <li className="site-search-empty" role="presentation">
              Nothing on this page matches. The guides and the FAQ are further down.
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}

function App() {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  // null means "the first day the data offers", which is today. Storing the choice as a
  // date string rather than an index keeps a selected day valid across a data refresh.
  const [selectedDay, setSelectedDay] = useState(null);
  const [eveningOnly, setEveningOnly] = useState(false);
  const [showWholeDay, setShowWholeDay] = useState(false);
  const [residentProfile, setResidentProfile] = useState(getStoredResidentProfile);
  const [liveData, setLiveData] = useState(fallbackData);
  const [wasteData, setWasteData] = useState(fallbackWasteData);
  const [wasteQuery, setWasteQuery] = useState("");
  const [civicMap, setCivicMap] = useState(fallbackCivicMap);
  const [civicMetric, setCivicMetric] = useState("income");
  const [hoveredCivicFeature, setHoveredCivicFeature] = useState(null);
  const [hoveredSchool, setHoveredSchool] = useState(null);
  // The map is drawn in a 100-unit viewBox, so anything sized in user units grows with
  // the container. School markers are places, not quantities, and a place marker should
  // be the same size on every screen. Measuring the rendered width lets the marker draw
  // in pixels: 1 unit inside the marker group is 1 CSS pixel.
  const [civicMapBox, setCivicMapBox] = useState(null);
  const civicMapResize = useRef(null);
  const [recycleCoachFailed, setRecycleCoachFailed] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // A saved street collapses the garbage tool to its answer. Opening it again is one click.
  const [wasteToolOpen, setWasteToolOpen] = useState(false);
  const [crimeData, setCrimeData] = useState(null);
  const [gardenTheatre, setGardenTheatre] = useState(null);
  const libraryOpen = useMemo(() => libraryStatus(), []);
  // Hand-maintained facts carry a date, and the wording follows the date rather than
  // asserting a past event is still upcoming.
  const parkingRateLine = useMemo(() => {
    const next = localRules.parking.rates.next;
    const effective = new Date(`${next.effectiveFrom}T00:00:00-04:00`);
    const label = effective.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "America/New_York" });
    if (Date.now() >= effective.getTime()) {
      return `Thirty-minute spaces cost ${next.thirtyMinute} and 90-minute zones ${next.ninetyMinute}, after the increase on ${label}.`;
    }
    const cur = localRules.parking.rates.current;
    return `Thirty-minute spaces cost ${cur.thirtyMinute} and 90-minute zones ${cur.ninetyMinute}. Rates rise on ${label}, to ${next.thirtyMinute} and ${next.ninetyMinute}.`;
  }, []);
  const schoolLine = useMemo(() => {
    const start = new Date(`${localRules.schools.termStart}T00:00:00-04:00`);
    if (Date.now() < start.getTime()) {
      return { headline: localRules.schools.termStartLabel, detail: `First day of school for students in Princeton Public Schools, ${localRules.schools.schoolYear}.` };
    }
    return { headline: `${localRules.schools.schoolYear} school year`, detail: "The Princeton Public Schools year is under way. Check the district calendar for breaks and closures." };
  }, []);
  const [civicTooltip, setCivicTooltip] = useState({ x: 0, y: 0, flip: false });
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

  const [dataVersion, setDataVersion] = useState(dataVersionNow);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const now = dataVersionNow();
      if (now - dataVersion >= STALE_AFTER_BUCKETS) setDataVersion(now);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [dataVersion]);

  useEffect(() => {
    fetch(`/live-data.json?v=${dataVersion}`)
      .then((response) => {
        if (!response.ok) throw new Error(`live-data ${response.status}`);
        return response.json();
      })
      // A successful fetch carries its own eventsArePlaceholder: false and the
      // alertsAvailable flag written by the refresh script.
      .then((data) => setLiveData({ ...fallbackData, eventsArePlaceholder: false, ...data }))
      .catch(() => setLiveData({ ...fallbackData, alertsAvailable: false }));
  }, [dataVersion]);

  useEffect(() => {
    fetch(`/civic-map.json?v=${dataVersion}`)
      .then((response) => (response.ok ? response.json() : fallbackCivicMap))
      .then((data) => setCivicMap({ ...fallbackCivicMap, ...data }))
      .catch(() => setCivicMap(fallbackCivicMap));
  }, [dataVersion]);

  useEffect(() => {
    // Absent or failed, the safety panel simply does not render. Crime figures are not
    // something to show a placeholder for.
    fetch(`/garden-theatre.json?v=${dataVersion}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setGardenTheatre(data && data.filmCount ? data : null))
      .catch(() => setGardenTheatre(null));
  }, [dataVersion]);

  useEffect(() => {
    fetch(`/crime-data.json?v=${dataVersion}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setCrimeData(data && data.year ? data : null))
      .catch(() => setCrimeData(null));
  }, [dataVersion]);

  useEffect(() => {
    fetch(`/waste-data.json?v=${dataVersion}`)
      .then((response) => (response.ok ? response.json() : fallbackWasteData))
      .then((data) => setWasteData({ ...fallbackWasteData, ...data }))
      .catch(() => setWasteData(fallbackWasteData));
  }, [dataVersion]);

  useEffect(() => {
    if (!searchOpen) return;
    const onPointer = (event) => {
      if (!event.target.closest?.(".site-search-panel, .search-toggle")) setSearchOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [searchOpen]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (event) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [navOpen]);

  useEffect(() => {
    if (document.getElementById("recyclecoach-loader")) return;
    const mount = document.getElementById("rcroot");
    if (!mount) return;

    let cleanup = () => {};

    const load = () => {
      if (document.getElementById("recyclecoach-loader")) return;
      const script = document.createElement("script");
      script.id = "recyclecoach-loader";
      script.src = "https://cdn.recyclecoach.com/webapp/js/loader.min.js";
      script.async = true;
      script.onerror = () => setRecycleCoachFailed(true);
      document.head.appendChild(script);

      // The loader 302-redirects and can silently never render, which left the embed
      // showing "Loading official Recycle Coach calendar..." forever. Fall back to a
      // plain link only when the mount point is genuinely still empty.
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
      cleanup = () => window.clearInterval(poll);
    };

    // Load it when the garbage section comes within a screen of the viewport. Browsers
    // without IntersectionObserver just load it straight away.
    if (!("IntersectionObserver" in window)) {
      load();
      return () => cleanup();
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          load();
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(mount);
    return () => {
      observer.disconnect();
      cleanup();
    };
  }, []);


  useEffect(() => {
    document.documentElement.lang = "en";
  }, []);

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


  const days = liveData.days ?? [];
  // A day the visitor picked can fall out of the window when the data refreshes at
  // midnight. Falling back to the first day keeps the list from going blank.
  const activeDay = days.some((day) => day.iso === selectedDay) ? selectedDay : days[0]?.iso ?? null;
  const activeDayMeta = days.find((day) => day.iso === activeDay) ?? null;

  const filteredEvents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return liveData.events.filter((event) => {
      // With no day window the feeds failed and the placeholder rows carry no date, so
      // the day filter has to let them through rather than empty the section.
      const dayMatch = !activeDay || !event.isoDate || event.isoDate === activeDay;
      const eveningMatch = !eveningOnly || (event.startHour ?? -1) >= EVENING_HOUR;
      const tagMatch = filter === "all" || event.tags?.includes(filter);
      const text = `${event.title} ${event.source} ${event.location} ${event.dateLabel} ${event.timeLabel}`.toLowerCase();
      return dayMatch && eveningMatch && tagMatch && (!normalized || text.includes(normalized));
    });
  }, [activeDay, eveningOnly, filter, liveData.events, query]);

  const visibleEvents = showWholeDay ? filteredEvents : filteredEvents.slice(0, DAY_PREVIEW_COUNT);
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
  // Garbage day is a once-and-done question: once the street is saved, the hero tile
  // states the day. The lookup stays further down for anyone else.
  // The four tiles are the daily questions; one-time lookups (the neighborhood map,
  // perks, walks) live in the nav. With a street saved, the first tile states the day
  // and the last one becomes the visitor's own dashboard.
  const heroShortcuts = dailyShortcuts.map((shortcut) => {
    if (!profileWasteMatch) return shortcut;
    if (shortcut.key === "garbage") {
      const day = profileWasteMatch.trashDay;
      return {
        ...shortcut,
        label: "Your garbage day",
        value:
          day === "NOT INCLUDED"
            ? "Not on the town route"
            : day.charAt(0) + day.slice(1).toLowerCase(),
        url: "#my-princeton",
      };
    }
    if (shortcut.key === "setup") {
      return { ...shortcut, label: "My Princeton", value: "Your saved setup", url: "#my-princeton" };
    }
    return shortcut;
  });
  const wasteToolCollapsed = Boolean(profileWasteMatch) && !wasteToolOpen && !wasteQuery;
  const searchIndex = useMemo(() => {
    const entries = [];
    const add = (kind, label, url, detail = "") =>
      entries.push({ kind, label, url, detail, text: `${label} ${detail}` });
    primaryNavLinks.forEach(([href, label]) => add("section", label, href));
    add("section", "My Princeton", "#my-princeton", "Save your street and resident modes on this device");
    add("section", "Perks", "#perks", "What a library card and a Princeton address get you");
    add("section", "Walks", "#explore", "First-month Princeton walks");
    add("section", "Garden Theatre", "#culture", "What is playing this week");
    pillarGuides.forEach((guide) => add("guide", guide.title, guide.url, guide.detail));
    residentFaqs.forEach((faq) => add("question", faq.question, "#faq", faq.answer));
    commuteCards.forEach((card) => add("transit", card.title, card.url, card.detail));
    practicalTiles.forEach((tile) => add("service", tile.label, tile.url, tile.value));
    newResidentChecklist.forEach((item) => add("new to town", item.title, item.url, item.detail));
    residentPerks.forEach((group) =>
      group.items.forEach((item) => add("perk", item.title, item.url, item.detail)),
    );
    exploreStops.forEach((stop) => add("walk", stop.stop, stop.guideUrl, stop.note));
    wasteData.streets.forEach((street) =>
      entries.push({
        kind: "street",
        label: street.street,
        url: "#waste",
        detail: street.trashDay === "NOT INCLUDED" ? "Not on the town route" : `Garbage: ${street.trashDay}`,
        text: street.street,
        street: street.street,
      }),
    );
    liveData.events.forEach((event) =>
      entries.push({
        kind: "event",
        label: event.title,
        url: "#today",
        detail: [event.dateLabel, event.timeLabel, event.location].filter(Boolean).join(", "),
        text: `${event.title} ${event.location ?? ""} ${event.source ?? ""}`,
        title: event.title,
        isoDate: event.isoDate,
      }),
    );
    return entries;
  }, [wasteData.streets, liveData.events]);
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
  // viewBox units per CSS pixel. Applied to the marker group, it cancels the map's own
  // scaling, so the dot stays 18px whether the map is 360px or 1200px wide. The svg keeps
  // its aspect ratio, so the smaller of the two axes sets the scale; measuring width alone
  // drew the marker short whenever the shell was height-constrained.
  const schoolMarkerScale = useMemo(() => {
    const [, , boxWidth, boxHeight] = String(civicMap.viewBox ?? "0 0 100 72")
      .split(/\s+/)
      .map(Number);
    const width = civicMapBox?.width || CIVIC_MAP_FALLBACK_WIDTH;
    const height = civicMapBox?.height || (CIVIC_MAP_FALLBACK_WIDTH * boxHeight) / boxWidth;
    const pixelsPerUnit = Math.min(width / boxWidth, height / boxHeight);
    return pixelsPerUnit > 0 ? 1 / pixelsPerUnit : 0.1;
  }, [civicMap.viewBox, civicMapBox]);
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

  // A callback ref rather than an effect, so it still works if the map ever moves behind
  // a lazy boundary the way the garbage widget already does.
  //
  // Two things keep this from looping. The ref is stable, so React does not detach and
  // reattach it on every render, and the setter returns the previous object when the size
  // has not moved. Storing a fresh object unconditionally re-rendered, which re-ran the
  // ref, which stored another object: React error #185.
  const applyCivicMapBox = useCallback((width, height) => {
    setCivicMapBox((current) =>
      current && Math.abs(current.width - width) < 0.5 && Math.abs(current.height - height) < 0.5
        ? current
        : { width, height },
    );
  }, []);

  const measureCivicMap = useCallback(
    (node) => {
      civicMapResize.current?.disconnect();
      civicMapResize.current = null;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      applyCivicMapBox(rect.width, rect.height);
      if (typeof ResizeObserver === "undefined") return;
      civicMapResize.current = new ResizeObserver(([entry]) => {
        applyCivicMapBox(entry.contentRect.width, entry.contentRect.height);
      });
      civicMapResize.current.observe(node);
    },
    [applyCivicMapBox],
  );

  const updateCivicTooltip = (event) => {
    const shell = event.currentTarget.closest?.(".civic-map-shell") ?? event.currentTarget;
    const rect = shell.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const edge = Math.min(TOOLTIP_EDGE_PAD, rect.height / 2);
    setCivicTooltip({
      x,
      // Centred on the pointer, so it needs half its height of room at the top and bottom.
      y: Math.min(Math.max(y, edge), rect.height - edge),
      // The map panel clips its overflow to keep its rounded corners, so a tooltip opened
      // to the right of a marker near the right edge was being cut in half. Past that
      // point it opens to the left of the pointer instead.
      flip: x > rect.width - TOOLTIP_WIDTH,
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
          {/* On a phone the ten links plus the header controls made a 206px header,
              roughly a quarter of an 844px screen, before any content. Below 900px they
              collapse behind this toggle. */}
          <button
            type="button"
            className="search-toggle"
            aria-expanded={searchOpen}
            aria-controls="site-search-panel"
            aria-label={searchOpen ? "Close search" : "Search this site"}
            onClick={() => {
              setSearchOpen((open) => !open);
              setNavOpen(false);
            }}
          >
            {searchOpen ? <X size={20} aria-hidden="true" /> : <Search size={20} aria-hidden="true" />}
            <span>Search</span>
          </button>
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={navOpen}
            aria-controls="primary-nav"
            aria-label={navOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setNavOpen((open) => !open)}
          >
            {navOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
          <nav
            id="primary-nav"
            aria-label="Primary navigation"
            className={navOpen ? "is-open" : ""}
          >
            {primaryNavLinks.map(([href, label]) => (
              <a key={href} href={href} onClick={() => setNavOpen(false)}>
                {label}
              </a>
            ))}
          </nav>
        </div>
        {searchOpen ? (
          <div className="site-search-panel" id="site-search-panel">
            <SiteSearch
              autoFocus
              entries={searchIndex}
              onClose={() => setSearchOpen(false)}
              onPick={(entry) => {
                if (entry.kind === "street") {
                  setWasteToolOpen(true);
                  setWasteQuery(entry.street);
                }
                if (entry.kind === "event") {
                  setQuery(entry.title);
                  setFilter("all");
                  setSelectedDay(entry.isoDate);
                }
              }}
            />
          </div>
        ) : null}
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
            What is on in Princeton today, and the town facts you look up all year.
          </p>
          <p className="hero-summary">
            Public listings from the university, the library, the town and the Garden Theatre,
            read again every three hours. Garbage day by street, parking rules and the
            neighborhood map are further down.
          </p>
          <div className="daily-shortcuts" role="group" aria-label="Resident shortcuts">
            {heroShortcuts.map(({ label, value, url, icon: Icon }) => (
              <a href={url} key={label} {...externalLinkProps(url)}>
                <Icon size={17} aria-hidden="true" />
                <span>{label}</span>
                <strong>{value}</strong>
              </a>
            ))}
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
          {/* Library open/closed was one of the three named daily use cases and had no
              answer anywhere on the site. Computed from the posted weekly hours, which is
              the only form the library publishes: there is no API and no holiday feed. */}
          <a
            href={localRules.library.url}
            {...externalLinkProps(localRules.library.url)}
          >
            <span>Public library</span>
            <strong>{libraryOpen.label}</strong>
          </a>
          <a
            href={nextEvent?.url ?? "https://www.princeton.edu/events"}
            {...externalLinkProps(nextEvent?.url ?? "https://www.princeton.edu/events")}
          >
            <span>Next up today</span>
            <strong>{nextEvent ? nextEvent.title : "Check public calendars"}</strong>
          </a>
          <div>
            <span>Updated</span>
            <strong>{formatRefresh(liveData.generatedAt)}</strong>
            <small>Read again every three hours. Reload the page for the latest.</small>
          </div>
        </aside>
      </section>

      {alertCount || alertsUnavailable ? (
        <section className="section alert-band" aria-labelledby="alerts-heading">
          <div className="section-heading split">
            <div>
              <p className="eyebrow">Active alerts</p>
              <h2 id="alerts-heading">
                {alertsUnavailable
                  ? "Alert status could not be checked."
                  : "Active weather alerts for Princeton."}
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

      <section className="section today-grid" id="today" aria-labelledby="today-heading">
        <div className="section-heading">
          <p className="eyebrow">What is on</p>
          <h2 id="today-heading">Everything happening in Princeton, one day at a time.</h2>
          <p>
            Pick a day and see everything public that is on it, from morning story time to the
            last film. Filter to the evening when you are deciding where to go tonight.
          </p>
        </div>
        <div className="agenda-controls">
        {days.length ? (
          <div className="control-row day-row" role="group" aria-label="Pick a day">
            {days.map((day, index) => (
              <button
                key={day.iso}
                type="button"
                className={day.iso === activeDay ? "is-active" : ""}
                onClick={() => {
                  setSelectedDay(day.iso);
                  setShowWholeDay(false);
                }}
                aria-current={day.iso === activeDay ? "true" : undefined}
              >
                {index === 0 ? "Today" : `${day.weekday} ${day.label}`}
                <span className="day-count">{day.count}</span>
              </button>
            ))}
          </div>
        ) : null}
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
          <button
            type="button"
            className={eveningOnly ? "is-active" : ""}
            onClick={() => setEveningOnly((current) => !current)}
            aria-pressed={eveningOnly}
          >
            <Moon size={17} aria-hidden="true" />
            Evening
          </button>
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
        </div>
        <div className="results-meta" aria-live="polite">
          Showing {visibleEvents.length} of {filteredEvents.length} listings
          {activeDayMeta ? ` for ${activeDayMeta.weekday} ${activeDayMeta.label}` : ""}
          {eveningOnly ? ", 5 PM onward" : ""}
        </div>
        {liveData.eventsArePlaceholder ? (
          <p className="agenda-placeholder-note" role="status">
            The Princeton event feeds did not load. The entries below link to each official
            calendar, so you can check today's listings at the source.
          </p>
        ) : null}
        {/* Tracked runs sit above the list because their dates are weeks out, past the
            point where date order alone would ever show them on this page. */}
        {liveData.trackedSeries?.length ? (
          <div className="tracked-strip">
            {liveData.trackedSeries.map((series) => (
              <a
                className="tracked-card"
                href={safeHref(series.url) ?? undefined}
                key={series.id}
                {...externalLinkProps(series.url)}
              >
                <p className="tracked-eyebrow">{series.label}</p>
                <h3>{series.name}</h3>
                <p>
                  {series.startLabel} to {series.endLabel}, {series.count}{" "}
                  {series.count === 1 ? "performance" : "performances"} at {series.venue}.
                </p>
                {series.next ? (
                  <p className="tracked-next">
                    Next: {series.next.title} on {series.next.dateLabel} at{" "}
                    {series.next.timeLabel}.
                  </p>
                ) : null}
                <span>
                  Festival page and tickets <ExternalLink size={15} aria-hidden="true" />
                </span>
              </a>
            ))}
          </div>
        ) : null}
        <div
          className="agenda-list"
          key={`agenda-${activeDay}-${filter}-${query}-${eveningOnly}-${liveData.generatedAt}`}
        >
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
            <div className="empty-state">
              {activeDayMeta
                ? `Nothing public is listed for ${activeDayMeta.weekday} ${activeDayMeta.label} under these filters.`
                : "No matching items in the current public-data snapshot."}
            </div>
          )}
        </div>
        {!showWholeDay && filteredEvents.length > visibleEvents.length ? (
          <button type="button" className="day-more" onClick={() => setShowWholeDay(true)}>
            Show all {filteredEvents.length} listings
          </button>
        ) : null}
      </section>

      <section className="section culture-band" id="culture" aria-labelledby="culture-heading">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">Culture</p>
            <h2 id="culture-heading">What is playing at the Garden Theatre.</h2>
          </div>
          <p>
            Showtimes come from the cinema's own ticketing system and also sit in the day list
            above. McCarter, the art museum and the Arts Council run their own calendars.
          </p>
        </div>
        {gardenTheatre ? (
          <div className="garden-theatre">
            <div className="garden-head">
              <Film size={19} aria-hidden="true" />
              <div>
                <strong>Now playing at the Garden Theatre</strong>
                <small>{gardenTheatre.address}</small>
              </div>
              <a
                href={gardenTheatre.source}
                {...externalLinkProps(gardenTheatre.source)}
              >
                Tickets and full schedule
              </a>
            </div>
            <div className="garden-days">
              {gardenTheatre.days.slice(0, 3).map((day) => (
                <div className="garden-day" key={day.day}>
                  <span>{day.day}</span>
                  <ul>
                    {day.screenings.map((film) => (
                      <li key={film.slug}>
                        <a href={film.url} {...externalLinkProps(film.url)}>
                          {film.title}
                        </a>
                        <b>
                          {film.times
                            .map((slot) =>
                              slot.badges?.length ? `${slot.time} ${slot.badges.join(" ")}` : slot.time,
                            )
                            .join("  ·  ")}
                        </b>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <small className="garden-note">{gardenTheatre.note}</small>
          </div>
        ) : null}
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
            <a
              href="https://artmuseum.princeton.edu/exhibitions-events"
              {...externalLinkProps("https://artmuseum.princeton.edu/exhibitions-events")}
            >
              University Art Museum (free)
            </a>
          </div>
        </div>
      </section>

      <section className="section practical" id="practical" aria-labelledby="practical-heading">
        <div className="section-heading">
          <p className="eyebrow">Town services</p>
          <h2 id="practical-heading">Garbage, parking, schools and permits.</h2>
          <p>
            Start with the street lookup below when you need garbage day, bulk pickup rules,
            or the yard-waste section for a Princeton street.
          </p>
        </div>
        {wasteToolCollapsed ? (
        <section className="waste-tool is-collapsed" id="waste" aria-labelledby="waste-heading">
          <div className="waste-copy">
            <p className="eyebrow">Garbage pickup by street</p>
            <h3 id="waste-heading">
              {titleCase(profileWasteMatch.street)}: garbage{" "}
              {profileWasteMatch.trashDay === "NOT INCLUDED"
                ? "is not on the town route"
                : `on ${profileWasteMatch.trashDay.charAt(0)}${profileWasteMatch.trashDay.slice(1).toLowerCase()}`}
              .
            </h3>
            <p>
              {profileYardSchedule
                ? `Yard section ${profileWasteMatch.yardSection}; next branch and log starts ${
                    upcomingYardDates(profileYardSchedule.branchAndLogs, wasteData.yardScheduleYear)
                      .slice(0, 3)
                      .join(", ") || `none left in ${wasteData.yardScheduleYear}`
                  }.`
                : "Yard section varies by block on this street; open the lookup for the block list."}{" "}
              Saved on this device from My Princeton.
            </p>
            <div className="waste-collapsed-actions">
              <button type="button" onClick={() => setWasteToolOpen(true)}>
                Open the full lookup
              </button>
              <a href="#my-princeton">Change street</a>
            </div>
          </div>
        </section>
        ) : (
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
        )}
        <div className="local-rules">
          <div className="local-rule">
            <ParkingCircle size={19} aria-hidden="true" />
            <strong>Parking, the rules that catch people out</strong>
            <p className="rule-headline">{localRules.parking.overnightBan}</p>
            <p className="rule-caveat">
            {localRules.parking.overnightCaveat} {localRules.parking.overnightPermit}
          </p>
            <dl>
              {localRules.parking.meterHours.map(([when, hours]) => (
                <div key={when}>
                  <dt>{when}</dt>
                  <dd>{hours}</dd>
                </div>
              ))}
            </dl>
            <p>{localRules.parking.note}</p>
            <p className="rule-change">{parkingRateLine}</p>
            <a href={localRules.parking.url} {...externalLinkProps(localRules.parking.url)}>
              Official parking page
            </a>
            <a
              href={localRules.parking.permitUrl}
              {...externalLinkProps(localRules.parking.permitUrl)}
            >
              On-street permits
            </a>
          </div>
          <div className="local-rule">
            <CalendarDays size={19} aria-hidden="true" />
            <strong>Princeton Public Schools</strong>
            <p className="rule-headline">{schoolLine.headline}</p>
            <p>{schoolLine.detail}</p>
            <a href={localRules.schools.url} {...externalLinkProps(localRules.schools.url)}>
              District calendar
            </a>
          </div>
          <p className="rules-verified">
            Parking and school dates were read off the official pages on{" "}
            {new Date(`${localRules.verifiedOn}T12:00:00Z`).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              timeZone: "America/New_York",
            })}
            . Rules change, so confirm anything that carries a fine.
          </p>
        </div>
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

      <section className="section my-princeton" id="my-princeton" aria-labelledby="my-princeton-heading">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">My Princeton</p>
            <h2 id="my-princeton-heading">Your local setup, saved on this device.</h2>
          </div>
          <p>
            Add your street and pick the modes that fit your week. It stays in your browser,
            and the page then shows your garbage day and the listings that match.
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

      <section className="section" id="move" aria-labelledby="move-heading">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">Move</p>
            <h2 id="move-heading">How to reach New York and Philadelphia, and where to park.</h2>
          </div>
          <p>
            Official schedules for the Dinky and NJ Transit, SEPTA fares through Trenton, and the
            two parking rules that catch new residents.
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

      <section className="section resident-checklist" id="new-resident" aria-labelledby="new-resident-heading">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">New to town?</p>
            <h2 id="new-resident-heading">First-week Princeton setup.</h2>
          </div>
          <p>
            What to set up in the first week: town alerts, your garbage day, a library card and
            a transit pattern that works from where you live. The two sections after this one,{" "}
            <a href="#perks">perks</a> and <a href="#explore">walks</a>, are for the first month.
            Save your street in <a href="#my-princeton">My Princeton</a> and the garbage tile at
            the top shows your day from then on.
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

      <section className="section resident-perks" id="perks" aria-labelledby="perks-heading">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">Resident perks</p>
            <h2 id="perks-heading">What a library card and a Princeton address get you.</h2>
          </div>
          <p>
            Two hours of garage parking, museum passes, free admission at the university art
            museum, and classes residents can audit.
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

      <section className="section explore" id="explore" aria-labelledby="explore-heading">
        <div>
          <p className="eyebrow">Explore</p>
          <h2 id="explore-heading">First-month Princeton walks.</h2>
          <p>
            Six walks that teach the town: the canal towpath, Institute Woods, the battlefield,
            Stony Brook, Community Park and the side streets off Nassau.
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

      <section className="section civic-section" id="civic" aria-labelledby="civic-heading">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">Neighborhood context</p>
            <h2 id="civic-heading">Census estimates and election results, by block group.</h2>
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
                ref={measureCivicMap}
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
                          transform={`translate(${marker.x.toFixed(3)} ${marker.y.toFixed(3)}) scale(${schoolMarkerScale.toFixed(4)})`}
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
                          {/* Invisible, and larger than the dot, so the touch target
                              clears 24px without changing the design. */}
                          <circle className="school-marker-hit" r={SCHOOL_HIT_PX} />
                          <circle className="school-marker-dot" r={SCHOOL_DOT_PX} />
                          {/* A mortarboard. The old marker was the letter S set in a
                              filled circle, which read as a dollar sign, the symbol the
                              wealth layer uses. */}
                          <path
                            className="school-marker-glyph"
                            d="M -6.2 -1.4 L 0 -4.6 L 6.2 -1.4 L 0 1.8 Z"
                          />
                          <path className="school-marker-band" d="M -3.6 0.3 V 3 Q 0 4.6 3.6 3 V 0.3" />
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
                  className={`civic-tooltip${civicTooltip.flip ? " is-flipped" : ""}`}
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
                  className={`civic-tooltip school-tooltip${civicTooltip.flip ? " is-flipped" : ""}`}
                  style={{
                    left: `${civicTooltip.x}px`,
                    top: `${civicTooltip.y}px`,
                  }}
                >
                  <strong>{hoveredSchool.name}</strong>
                  <span>{hoveredSchool.type}</span>
                  <b>{hoveredSchool.grades}</b>
                  <small>{hoveredSchool.address}</small>
                  {hoveredSchool.usNews ? (
                    <small className="school-tooltip-rank">
                      US News {hoveredSchool.usNews.edition}: #
                      {hoveredSchool.usNews.nationalRank.toLocaleString()} nationally, #
                      {hoveredSchool.usNews.stateRank} in New Jersey
                    </small>
                  ) : null}
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
            {crimeData ? (
              <div className="crime-panel">
                <ShieldCheck size={19} aria-hidden="true" />
                <h3>Reported crime in Princeton, {crimeData.year}</h3>
                <p>
                  Figures cover the whole municipality. They are shown per 100,000 residents
                  so Princeton, New Jersey, and the country can be compared on the same basis.
                </p>
                {[
                  ["violent-crime", "Violent crime"],
                  ["property-crime", "Property crime"],
                ].map(([key, label]) => {
                  const town = crimeData.princeton?.[key];
                  const state = crimeData.newJersey?.[key];
                  const usa = crimeData.national?.[key];
                  if (!town?.rate || !usa?.rate) return null;
                  const max = Math.max(town.rate, state?.rate ?? 0, usa.rate);
                  const share = Math.round((town.rate / usa.rate) * 100);
                  const bars = [
                    ["Princeton", town.rate, "is-town"],
                    ["New Jersey", state?.rate, ""],
                    ["United States", usa.rate, ""],
                  ];
                  return (
                    <div className="crime-metric" key={key}>
                      <div className="crime-metric-head">
                        <strong>{label}</strong>
                        <span>
                          {town.count} reported, {share}% of the national rate
                        </span>
                      </div>
                      {bars.map(([name, value, cls]) =>
                        typeof value === "number" ? (
                          <div className={`crime-bar ${cls}`} key={name}>
                            <span>{name}</span>
                            <i aria-hidden="true" style={{ width: `${Math.max(2, (value / max) * 100)}%` }} />
                            <b>{value.toLocaleString()}</b>
                          </div>
                        ) : null,
                      )}
                    </div>
                  );
                })}
                <p className="crime-caveat">{crimeData.caveat}</p>
                <div className="source-links compact">
                  {crimeData.sources.map((source) => (
                    <a href={source.url} key={source.url} {...externalLinkProps(source.url)}>
                      {source.name}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
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
                    {activeSchool.usNews ? (
                      <p className="school-rank">
                        US News {activeSchool.usNews.edition}: #
                        {activeSchool.usNews.nationalRank.toLocaleString()} of{" "}
                        {activeSchool.usNews.rankedNationally.toLocaleString()} nationally, #
                        {activeSchool.usNews.stateRank} of {activeSchool.usNews.rankedInState} in New
                        Jersey.
                      </p>
                    ) : null}
                    <a href={activeSchool.sourceUrl} {...externalLinkProps(activeSchool.sourceUrl)}>
                      Official school page
                    </a>
                    {activeSchool.usNews ? (
                      <>
                        <a
                          href={activeSchool.usNews.url}
                          {...externalLinkProps(activeSchool.usNews.url)}
                        >
                          US News listing
                        </a>
                        <a
                          href={activeSchool.usNews.methodologyUrl}
                          {...externalLinkProps(activeSchool.usNews.methodologyUrl)}
                        >
                          How that rank is built
                        </a>
                      </>
                    ) : null}
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

      <section className="section guides-section" id="guides" aria-labelledby="guides-heading">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">Guides</p>
            <h2 id="guides-heading">Stable pages for recurring Princeton questions.</h2>
          </div>
          <p>
            The homepage answers what is happening today. These pages answer the questions that
            stay the same: what a library card gets you, how to reach New York without a car,
            which day your street is collected.
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

      <section className="section faq-section" id="faq" aria-labelledby="faq-heading">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2 id="faq-heading">Common questions about this site.</h2>
          </div>
          <p>
            What this site is, who runs it, and where the data comes from.
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
            <a href="/about.html">About this site</a>
            {"  ·  "}
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
