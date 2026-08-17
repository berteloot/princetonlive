import React, { useMemo, useState } from "react";
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

const navItems = ["Today", "Move", "Culture", "Practical", "Explore"];

const agenda = [
  {
    time: "4:30 PM",
    title: "Open university lecture",
    place: "Princeton campus",
    tag: "Free",
    mode: ["new", "culture"],
    source: "Princeton University Events",
    url: "https://www.princeton.edu/events",
  },
  {
    time: "6:00 PM",
    title: "Library workshop or community event",
    place: "Princeton Public Library",
    tag: "Resident",
    mode: ["family", "culture"],
    source: "Library Events",
    url: "https://princetonlibrary.libnet.info/events",
  },
  {
    time: "7:10 PM",
    title: "Garden Theatre showtime check",
    place: "Nassau Street",
    tag: "Indoors",
    mode: ["culture", "rain"],
    source: "Garden Theatre",
    url: "https://www.princetongardentheatre.org/",
  },
  {
    time: "8:00 PM",
    title: "McCarter performance window",
    place: "University Place",
    tag: "Arts",
    mode: ["culture"],
    source: "McCarter Theatre",
    url: "https://www.mccarter.org/events",
  },
];

const commuteCards = [
  {
    icon: Train,
    title: "NYC without the mistake",
    detail: "Dinky to Princeton Junction, then Northeast Corridor to NY Penn. Check transfer padding before you leave.",
    action: "Open NJ Transit",
    url: "https://www.njtransit.com/destinations/princeton-dinky",
  },
  {
    icon: Route,
    title: "Philly route logic",
    detail: "Use Princeton Junction to Trenton, then SEPTA toward Center City. Amtrak can be faster but less predictable for casual trips.",
    action: "Open SEPTA API",
    url: "https://api.septa.org/",
  },
  {
    icon: ParkingCircle,
    title: "Parking sanity check",
    detail: "Downtown meters, garages, and Princeton Junction lots each have different rules. Treat parking as part of the itinerary.",
    action: "Parking rules",
    url: "https://www.princetonnj.gov/203/Parking-in-Princeton",
  },
  {
    icon: Bus,
    title: "No-car Princeton",
    detail: "TigerTransit, FreeB, walking, biking, and Dinky routing deserve one calm map instead of five browser tabs.",
    action: "Getting around",
    url: "https://www.princetonnj.gov/578/Getting-Around-Princeton",
  },
];

const practicalTiles = [
  {
    icon: CloudRain,
    label: "Weather alerts",
    value: "NWS-ready",
    url: "https://www.weather.gov/",
  },
  {
    icon: AlertTriangle,
    label: "Town alerts",
    value: "Nixle",
    url: "https://www.princetonnj.gov/274/Emergency-Phone-Notifications",
  },
  {
    icon: Recycle,
    label: "Trash and recycling",
    value: "Address-aware later",
    url: "https://www.princetonnj.gov/",
  },
  {
    icon: BatteryCharging,
    label: "EV chargers",
    value: "Static first",
    url: "https://developer.nrel.gov/docs/transportation/alt-fuel-stations-v1/all/",
  },
  {
    icon: Landmark,
    label: "Municipal services",
    value: "One-tap links",
    url: "https://www.princetonnj.gov/",
  },
  {
    icon: Map,
    label: "GIS layers",
    value: "Parks, zoning, trails",
    url: "https://www.princetonnj.gov/1845/GIS-Maps-and-Apps",
  },
];

const exploreStops = [
  "D&R Canal towpath",
  "Institute Woods",
  "Princeton Battlefield",
  "Stony Brook paths",
  "Playgrounds with restrooms",
  "Historic district walks",
];

const sourcePlan = [
  ["University events", "RSS and public filters", "Strong"],
  ["Library events", "Communico calendar feeds", "Strong"],
  ["Weather and alerts", "National Weather Service API", "Strong"],
  ["Municipal GIS", "ArcGIS public feature services", "Strong"],
  ["Garden Theatre", "HTML showtime extraction", "Workable"],
  ["McCarter", "Cached listings scrape", "Watchful"],
  ["Transit", "GTFS plus official links", "Credentialed"],
  ["Trash/recycling", "Recycle Coach and municipal guidance", "Manual first"],
];

function App() {
  const [persona, setPersona] = useState("new");
  const [query, setQuery] = useState("");

  const filteredAgenda = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return agenda.filter((item) => {
      const personaMatch =
        persona === "all" || item.mode.includes(persona) || item.mode.includes("culture");
      const textMatch =
        !normalized ||
        `${item.title} ${item.place} ${item.tag} ${item.source}`
          .toLowerCase()
          .includes(normalized);
      return personaMatch && textMatch;
    });
  }, [persona, query]);

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="PrincetonLive home">
          <span className="brand-mark">PL</span>
          <span>
            PrincetonLive
            <small>Independent resident guide</small>
          </span>
        </a>
        <nav aria-label="Primary navigation">
          {navItems.map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`}>
              {item}
            </a>
          ))}
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-media" aria-hidden="true">
          <img
            src="https://www.princeton.edu/sites/default/files/styles/half_2x/public/20161006_CL_DJA_028.jpg?itok=AGbX2ltx"
            alt=""
          />
        </div>
        <div className="hero-copy">
          <p className="eyebrow">Orange and black, resident-first</p>
          <h1>Know what Princeton knows.</h1>
          <p>
            A calm civic notebook for new residents: commute, culture, lectures,
            parking, alerts, errands, public life, and the small decisions that
            turn Princeton into a usable home.
          </p>
          <div className="identity-note" aria-label="Brand positioning note">
            <span aria-hidden="true" />
            <strong>Princeton spirit without official-university confusion.</strong>
          </div>
          <div className="hero-actions">
            <a className="primary-action" href="#today">
              Start with today <ChevronRight size={18} aria-hidden="true" />
            </a>
            <a className="secondary-action" href="#sources">
              Data plan
            </a>
          </div>
        </div>
        <aside className="daily-brief" aria-label="Today snapshot">
          <div>
            <span>Princeton, NJ</span>
            <strong>Resident mode</strong>
          </div>
          <div>
            <span>Best first habit</span>
            <strong>Check transit before culture</strong>
          </div>
          <div>
            <span>Weather fallback</span>
            <strong>Library, lectures, cinema</strong>
          </div>
          <div>
            <span>Local signal</span>
            <strong>Orange alerts, black type, quiet confidence</strong>
          </div>
        </aside>
      </section>

      <section className="section intro-band">
        <div>
          <p className="eyebrow">Positioning</p>
          <h2>Not a town-info dashboard. A local life concierge.</h2>
        </div>
        <p>
          PrincetonLive answers the new-resident question hiding underneath ten
          different tabs: what should I know today so I can live Princeton well?
        </p>
      </section>

      <section className="section identity-system" aria-labelledby="identity-heading">
        <div>
          <p className="eyebrow">Visual System</p>
          <h2 id="identity-heading">A Princeton cue, not a Princeton costume.</h2>
        </div>
        <div className="identity-panels">
          <article className="identity-panel color-panel">
            <span className="panel-kicker">Palette</span>
            <h3>Orange for signals. Black for trust.</h3>
            <p>
              PrincetonLive uses Princeton orange as a high-signal accent, then
              gives the working interface room to breathe with warm civic
              neutrals.
            </p>
            <div className="swatches" aria-label="PrincetonLive palette">
              <span style={{ "--swatch": "#ee7f2d" }}>Orange</span>
              <span style={{ "--swatch": "#0b0b0b" }}>Black</span>
              <span style={{ "--swatch": "#f4efe6" }}>Paper</span>
              <span style={{ "--swatch": "#2f6958" }}>Civic</span>
            </div>
          </article>
          <article className="identity-panel tiger-panel">
            <span className="panel-kicker">Mascot Energy</span>
            <h3>Alert, quick, and a little spirited.</h3>
            <p>
              The tiger influence shows up as motion and hierarchy: crisp
              diagonal signal bars, fast-to-scan cards, and sharp orange
              moments where a resident needs to act.
            </p>
            <div className="signal-bars" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </article>
        </div>
      </section>

      <section className="section today-grid" id="today">
        <div className="section-heading">
          <p className="eyebrow">Today</p>
          <h2>One agenda across town and university life.</h2>
        </div>
        <div className="control-row" aria-label="Agenda filters">
          {[
            ["new", "New here", Sparkles],
            ["family", "Family", Users],
            ["rain", "Rain plan", Umbrella],
            ["all", "All", CalendarDays],
          ].map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              className={persona === value ? "is-active" : ""}
              onClick={() => setPersona(value)}
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
            placeholder="Search lectures, films, library, McCarter..."
          />
        </label>
        <div className="agenda-list">
          {filteredAgenda.map((item) => (
            <a className="agenda-card" href={item.url} key={item.title}>
              <time>{item.time}</time>
              <div>
                <h3>{item.title}</h3>
                <p>{item.place}</p>
              </div>
              <span>{item.tag}</span>
              <ExternalLink size={16} aria-hidden="true" />
            </a>
          ))}
        </div>
      </section>

      <section className="section" id="move">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">Move</p>
            <h2>Commute decisions before calendar decisions.</h2>
          </div>
          <p>
            First version favors reliable route logic and official handoffs;
            live GTFS and credentialed feeds can layer in after the static MVP.
          </p>
        </div>
        <div className="commute-grid">
          {commuteCards.map(({ icon: Icon, title, detail, action, url }) => (
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

      <section className="culture-band" id="culture">
        <div className="section-heading">
          <p className="eyebrow">Culture</p>
          <h2>Public intellectual life, theater, films, and library life in one place.</h2>
        </div>
        <div className="culture-layout">
          <div className="culture-map" aria-hidden="true">
            <span className="pin pin-library"><Library size={18} /></span>
            <span className="pin pin-film"><Film size={18} /></span>
            <span className="pin pin-theater"><Theater size={18} /></span>
            <span className="pin pin-campus"><BookOpen size={18} /></span>
            <span className="route-line" />
          </div>
          <div className="culture-copy">
            <h3>Tonight in Princeton</h3>
            <p>
              The product edge is not inventing events. It is joining the
              university, library, Garden Theatre, McCarter, museum, Richardson,
              Lewis Center, and local arts into a single resident-grade agenda.
            </p>
            <div className="mini-stats">
              <span>Free tonight</span>
              <span>Open to public</span>
              <span>Indoors if raining</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section practical" id="practical">
        <div className="section-heading">
          <p className="eyebrow">Practical Life</p>
          <h2>The boring stuff, made findable before it becomes annoying.</h2>
        </div>
        <div className="tile-grid">
          {practicalTiles.map(({ icon: Icon, label, value, url }) => (
            <a className="utility-tile" href={url} key={label}>
              <Icon size={21} aria-hidden="true" />
              <span>{label}</span>
              <strong>{value}</strong>
            </a>
          ))}
        </div>
      </section>

      <section className="section explore" id="explore">
        <div>
          <p className="eyebrow">Explore</p>
          <h2>First-month walks for becoming oriented.</h2>
          <p>
            The explore layer starts with parks, trails, public art, historic
            districts, playgrounds, restrooms, and parking. It can become a
            resident map powered by Princeton GIS.
          </p>
        </div>
        <div className="walk-list">
          {exploreStops.map((stop, index) => (
            <div key={stop}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{stop}</strong>
              {index % 2 === 0 ? <Trees size={18} /> : <Bike size={18} />}
            </div>
          ))}
        </div>
      </section>

      <section className="section source-plan" id="sources">
        <div className="section-heading split">
          <div>
            <p className="eyebrow">Feasibility</p>
            <h2>Source plan for the live version.</h2>
          </div>
          <p>
            Static launch first, then cached live feeds where the public source
            is strong enough to respect users and source owners.
          </p>
        </div>
        <div className="source-table" role="table" aria-label="Source plan">
          {sourcePlan.map(([source, method, status]) => (
            <div className="source-row" role="row" key={source}>
              <span role="cell">{source}</span>
              <span role="cell">{method}</span>
              <strong role="cell">{status}</strong>
            </div>
          ))}
        </div>
      </section>

      <footer>
        <div>
          <strong>PrincetonLive</strong>
          <span>Turning a famous place into a usable home.</span>
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
