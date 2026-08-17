import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  BatteryCharging,
  Bike,
  BookOpen,
  Bus,
  CalendarDays,
  ChevronRight,
  CloudRain,
  ExternalLink,
  Film,
  Landmark,
  Library,
  Map,
  Navigation,
  ParkingCircle,
  Recycle,
  Route,
  Search,
  Sparkles,
  Theater,
  Train,
  Trees,
  Umbrella,
  Users,
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

const agendaFilters = [
  ["all", "All", CalendarDays],
  ["new", "New here", Sparkles],
  ["family", "Family", Users],
  ["rain", "Rain plan", Umbrella],
  ["culture", "Culture", Theater],
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

function App() {
  const [language, setLanguage] = useState(getInitialLanguage);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [liveData, setLiveData] = useState(fallbackData);

  useEffect(() => {
    fetch(`/live-data.json?v=${Date.now()}`)
      .then((response) => (response.ok ? response.json() : fallbackData))
      .then((data) => setLiveData({ ...fallbackData, ...data }))
      .catch(() => setLiveData(fallbackData));
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
          <h1>Know what matters before you leave.</h1>
          <p>
            Weather, alerts, public events, transit decisions, town services, and useful local
            links in one resident-first daily guide.
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
          <a href={liveData.weather.sourceUrl}>
            <span>Weather</span>
            <strong>
              {liveData.weather.temperature ? `${liveData.weather.temperature}°F, ` : ""}
              {liveData.weather.shortForecast}
            </strong>
          </a>
          <a href="https://www.weather.gov/phi/">
            <span>Alerts</span>
            <strong>{alertCount ? `${alertCount} active weather alert${alertCount === 1 ? "" : "s"}` : "No active NWS alerts"}</strong>
          </a>
          <a href={nextEvent?.url ?? "https://www.princeton.edu/events"}>
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
              <a className="agenda-card" href={event.url} key={`${event.url}-${index}`}>
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

      <section className="section weather-band" aria-labelledby="weather-heading">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">Weather & alerts</p>
            <h2 id="weather-heading">Plan the next few hours.</h2>
          </div>
          <p>{liveData.weather.detailedForecast}</p>
        </div>
        <div className="alert-strip">
          {liveData.alerts.length ? (
            liveData.alerts.slice(0, 3).map((alert) => (
              <a href={alert.url} key={alert.id}>
                <AlertTriangle size={18} aria-hidden="true" />
                <strong>{alert.event}</strong>
                <span>{alert.headline}</span>
              </a>
            ))
          ) : (
            <div>
              <CloudRain size={18} aria-hidden="true" />
              <strong>No active National Weather Service alerts for Princeton.</strong>
              <span>{liveData.weather.wind}</span>
            </div>
          )}
        </div>
      </section>

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
            <a href={url} className="feature-card" key={title}>
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
            <a className="utility-tile" href={url} key={label}>
              <Icon size={21} aria-hidden="true" />
              <span>{label}</span>
              <strong>{value}</strong>
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
            <a href="https://www.princeton.edu/events">Princeton University events</a>
            <a href="https://princetonlibrary.libnet.info/events">Princeton Public Library</a>
            <a href="https://www.princetongardentheatre.org/">Garden Theatre</a>
            <a href="https://www.mccarter.org/events">McCarter Theatre</a>
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
          <span>Public Princeton signals, organized for daily resident life.</span>
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
