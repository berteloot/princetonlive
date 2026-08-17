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

const translations = {
  en: {
    meta: {
      title: "PrincetonLive",
      description: "PrincetonLive is a daily operating guide for becoming a Princetonian.",
    },
    brandSub: "Independent resident guide",
    nav: {
      today: "Today",
      move: "Move",
      culture: "Culture",
      practical: "Practical",
      explore: "Explore",
    },
    languageLabel: "Language",
    hero: {
      eyebrow: "Orange and black, resident-first",
      title: "Know what Princeton knows.",
      body: "A calm civic notebook for new residents: commute, culture, lectures, parking, alerts, errands, public life, and the small decisions that turn Princeton into a usable home.",
      note: "Princeton spirit without official-university confusion.",
      primary: "Start with today",
      secondary: "Data plan",
      snapshotLabel: "Today snapshot",
      brief: [
        ["Princeton, NJ", "Resident mode"],
        ["Best first habit", "Check transit before culture"],
        ["Weather fallback", "Library, lectures, cinema"],
        ["Local signal", "Orange alerts, black type, quiet confidence"],
      ],
    },
    intro: {
      eyebrow: "Positioning",
      title: "Not a town-info dashboard. A local life concierge.",
      body: "PrincetonLive answers the new-resident question hiding underneath ten different tabs: what should I know today so I can live Princeton well?",
    },
    identity: {
      eyebrow: "Visual System",
      title: "A Princeton cue, not a Princeton costume.",
      paletteKicker: "Palette",
      paletteTitle: "Orange for signals. Black for trust.",
      paletteBody: "PrincetonLive uses Princeton orange as a high-signal accent, then gives the working interface room to breathe with warm civic neutrals.",
      swatchesLabel: "PrincetonLive palette",
      swatches: ["Orange", "Black", "Paper", "Civic"],
      tigerKicker: "Mascot Energy",
      tigerTitle: "Alert, quick, and a little spirited.",
      tigerBody: "The tiger influence shows up as motion and hierarchy: crisp diagonal signal bars, fast-to-scan cards, and sharp orange moments where a resident needs to act.",
    },
    today: {
      eyebrow: "Today",
      title: "One agenda across town and university life.",
      filtersLabel: "Agenda filters",
      searchLabel: "Search agenda",
      searchPlaceholder: "Search lectures, films, library, McCarter...",
      filters: [
        ["new", "New here"],
        ["family", "Family"],
        ["rain", "Rain plan"],
        ["all", "All"],
      ],
      agenda: [
        ["4:30 PM", "Open university lecture", "Princeton campus", "Free", "Princeton University Events"],
        ["6:00 PM", "Library workshop or community event", "Princeton Public Library", "Resident", "Library Events"],
        ["7:10 PM", "Garden Theatre showtime check", "Nassau Street", "Indoors", "Garden Theatre"],
        ["8:00 PM", "McCarter performance window", "University Place", "Arts", "McCarter Theatre"],
      ],
    },
    move: {
      eyebrow: "Move",
      title: "Commute decisions before calendar decisions.",
      body: "First version favors reliable route logic and official handoffs; live GTFS and credentialed feeds can layer in after the static MVP.",
      cards: [
        ["NYC without the mistake", "Dinky to Princeton Junction, then Northeast Corridor to NY Penn. Check transfer padding before you leave.", "Open NJ Transit"],
        ["Philly route logic", "Use Princeton Junction to Trenton, then SEPTA toward Center City. Amtrak can be faster but less predictable for casual trips.", "Open SEPTA API"],
        ["Parking sanity check", "Downtown meters, garages, and Princeton Junction lots each have different rules. Treat parking as part of the itinerary.", "Parking rules"],
        ["No-car Princeton", "TigerTransit, FreeB, walking, biking, and Dinky routing deserve one calm map instead of five browser tabs.", "Getting around"],
      ],
    },
    culture: {
      eyebrow: "Culture",
      title: "Public intellectual life, theater, films, and library life in one place.",
      cardTitle: "Tonight in Princeton",
      body: "The product edge is not inventing events. It is joining the university, library, Garden Theatre, McCarter, museum, Richardson, Lewis Center, and local arts into a single resident-grade agenda.",
      stats: ["Free tonight", "Open to public", "Indoors if raining"],
    },
    practical: {
      eyebrow: "Practical Life",
      title: "The boring stuff, made findable before it becomes annoying.",
      tiles: [
        ["Weather alerts", "NWS-ready"],
        ["Town alerts", "Nixle"],
        ["Trash and recycling", "Address-aware later"],
        ["EV chargers", "Static first"],
        ["Municipal services", "One-tap links"],
        ["GIS layers", "Parks, zoning, trails"],
      ],
    },
    explore: {
      eyebrow: "Explore",
      title: "First-month walks for becoming oriented.",
      body: "The explore layer starts with parks, trails, public art, historic districts, playgrounds, restrooms, and parking. It can become a resident map powered by Princeton GIS.",
      stops: [
        "D&R Canal towpath",
        "Institute Woods",
        "Princeton Battlefield",
        "Stony Brook paths",
        "Playgrounds with restrooms",
        "Historic district walks",
      ],
    },
    sources: {
      eyebrow: "Feasibility",
      title: "Source plan for the live version.",
      body: "Static launch first, then cached live feeds where the public source is strong enough to respect users and source owners.",
      label: "Source plan",
      rows: [
        ["University events", "RSS and public filters", "Strong"],
        ["Library events", "Communico calendar feeds", "Strong"],
        ["Weather and alerts", "National Weather Service API", "Strong"],
        ["Municipal GIS", "ArcGIS public feature services", "Strong"],
        ["Garden Theatre", "HTML showtime extraction", "Workable"],
        ["McCarter", "Cached listings scrape", "Watchful"],
        ["Transit", "GTFS plus official links", "Credentialed"],
        ["Trash/recycling", "Recycle Coach and municipal guidance", "Manual first"],
      ],
    },
    footer: {
      line: "Turning a famous place into a usable home.",
      top: "Back to top",
    },
  },
  fr: {
    meta: {
      title: "PrincetonLive en francais",
      description: "PrincetonLive est le guide quotidien pour devenir Princetonien.",
    },
    brandSub: "Guide residentiel independant",
    nav: {
      today: "Aujourd'hui",
      move: "Se deplacer",
      culture: "Culture",
      practical: "Pratique",
      explore: "Explorer",
    },
    languageLabel: "Langue",
    hero: {
      eyebrow: "Orange et noir, pense pour les residents",
      title: "Savoir ce que Princeton sait.",
      body: "Un carnet civique calme pour les nouveaux residents : trajets, culture, conferences, stationnement, alertes, courses, vie publique et petites decisions qui transforment Princeton en lieu vraiment habitable.",
      note: "L'esprit Princeton, sans confusion avec un site officiel de l'Universite.",
      primary: "Commencer par aujourd'hui",
      secondary: "Plan des donnees",
      snapshotLabel: "Instantane du jour",
      brief: [
        ["Princeton, NJ", "Mode resident"],
        ["Premier bon reflexe", "Verifier le transport avant la culture"],
        ["Plan pluie", "Bibliotheque, conferences, cinema"],
        ["Signal local", "Alertes orange, texte noir, confiance calme"],
      ],
    },
    intro: {
      eyebrow: "Positionnement",
      title: "Pas un tableau d'information municipal. Un concierge de vie locale.",
      body: "PrincetonLive repond a la question que le nouveau resident garde ouverte dans dix onglets : que dois-je savoir aujourd'hui pour bien vivre Princeton ?",
    },
    identity: {
      eyebrow: "Systeme visuel",
      title: "Un clin d'oeil Princeton, pas un costume Princeton.",
      paletteKicker: "Palette",
      paletteTitle: "Orange pour les signaux. Noir pour la confiance.",
      paletteBody: "PrincetonLive utilise l'orange Princeton comme accent de haute priorite, puis laisse l'interface respirer avec des neutres civiques et chaleureux.",
      swatchesLabel: "Palette PrincetonLive",
      swatches: ["Orange", "Noir", "Papier", "Civique"],
      tigerKicker: "Energie du tigre",
      tigerTitle: "Alerte, rapide, avec un peu d'elan.",
      tigerBody: "L'influence du tigre apparait dans le mouvement et la hierarchie : barres diagonales nettes, cartes faciles a scanner et moments orange quand un resident doit agir.",
    },
    today: {
      eyebrow: "Aujourd'hui",
      title: "Un seul agenda entre la ville et l'universite.",
      filtersLabel: "Filtres de l'agenda",
      searchLabel: "Rechercher dans l'agenda",
      searchPlaceholder: "Rechercher conferences, films, bibliotheque, McCarter...",
      filters: [
        ["new", "Nouveau ici"],
        ["family", "Famille"],
        ["rain", "Plan pluie"],
        ["all", "Tout"],
      ],
      agenda: [
        ["16h30", "Conference universitaire ouverte", "Campus de Princeton", "Gratuit", "Evenements Princeton University"],
        ["18h00", "Atelier ou evenement a la bibliotheque", "Princeton Public Library", "Resident", "Evenements bibliotheque"],
        ["19h10", "Verification des seances du Garden Theatre", "Nassau Street", "Interieur", "Garden Theatre"],
        ["20h00", "Creneau de spectacle McCarter", "University Place", "Arts", "McCarter Theatre"],
      ],
    },
    move: {
      eyebrow: "Se deplacer",
      title: "Les choix de trajet avant les choix de calendrier.",
      body: "La premiere version privilegie une logique d'itineraire fiable et des renvois officiels ; les flux GTFS en direct et les donnees avec identifiants pourront venir apres le MVP statique.",
      cards: [
        ["NYC sans erreur bete", "Dinky jusqu'a Princeton Junction, puis Northeast Corridor vers NY Penn. Verifiez la marge de correspondance avant de partir.", "Ouvrir NJ Transit"],
        ["Logique de trajet vers Philly", "Princeton Junction vers Trenton, puis SEPTA vers Center City. Amtrak peut etre plus rapide, mais moins previsible pour un trajet simple.", "Ouvrir l'API SEPTA"],
        ["Stationnement sans stress", "Les horodateurs du centre, les parkings et Princeton Junction ont chacun leurs regles. Integrez le stationnement a l'itineraire.", "Regles de stationnement"],
        ["Princeton sans voiture", "TigerTransit, FreeB, marche, velo et Dinky meritent une carte calme plutot que cinq onglets.", "Se deplacer"],
      ],
    },
    culture: {
      eyebrow: "Culture",
      title: "Vie intellectuelle publique, theatre, films et bibliotheque au meme endroit.",
      cardTitle: "Ce soir a Princeton",
      body: "L'avantage produit n'est pas d'inventer des evenements. Il consiste a reunir l'universite, la bibliotheque, Garden Theatre, McCarter, le musee, Richardson, Lewis Center et les arts locaux dans un agenda utile aux residents.",
      stats: ["Gratuit ce soir", "Ouvert au public", "A l'interieur s'il pleut"],
    },
    practical: {
      eyebrow: "Vie pratique",
      title: "Les choses ennuyeuses, trouvables avant de devenir irritantes.",
      tiles: [
        ["Alertes meteo", "Pret NWS"],
        ["Alertes municipales", "Nixle"],
        ["Dechets et recyclage", "Par adresse plus tard"],
        ["Bornes EV", "Statique d'abord"],
        ["Services municipaux", "Liens en un clic"],
        ["Couches SIG", "Parcs, zonage, sentiers"],
      ],
    },
    explore: {
      eyebrow: "Explorer",
      title: "Promenades du premier mois pour se reperer.",
      body: "La couche exploration commence par les parcs, sentiers, art public, quartiers historiques, aires de jeux, toilettes et stationnement. Elle peut devenir une carte residentielle alimentee par le SIG de Princeton.",
      stops: [
        "Chemin de halage du canal D&R",
        "Institute Woods",
        "Princeton Battlefield",
        "Sentiers de Stony Brook",
        "Aires de jeux avec toilettes",
        "Promenades dans les quartiers historiques",
      ],
    },
    sources: {
      eyebrow: "Faisabilite",
      title: "Plan des sources pour la version live.",
      body: "Lancement statique d'abord, puis flux live mis en cache lorsque la source publique est assez solide pour respecter les utilisateurs et les proprietaires des sources.",
      label: "Plan des sources",
      rows: [
        ["Evenements universitaires", "RSS et filtres publics", "Solide"],
        ["Evenements bibliotheque", "Flux calendrier Communico", "Solide"],
        ["Meteo et alertes", "API National Weather Service", "Solide"],
        ["SIG municipal", "Services publics ArcGIS", "Solide"],
        ["Garden Theatre", "Extraction HTML des seances", "Faisable"],
        ["McCarter", "Listings caches par scraping", "A surveiller"],
        ["Transport", "GTFS et liens officiels", "Avec identifiants"],
        ["Dechets/recyclage", "Recycle Coach et consignes municipales", "Manuel d'abord"],
      ],
    },
    footer: {
      line: "Transformer un lieu celebre en maison utilisable.",
      top: "Retour en haut",
    },
  },
  es: {
    meta: {
      title: "PrincetonLive en espanol",
      description: "PrincetonLive es la guia diaria para convertirse en princetoniano.",
    },
    brandSub: "Guia independiente para residentes",
    nav: {
      today: "Hoy",
      move: "Moverse",
      culture: "Cultura",
      practical: "Vida practica",
      explore: "Explorar",
    },
    languageLabel: "Idioma",
    hero: {
      eyebrow: "Naranja y negro, primero el residente",
      title: "Saber lo que Princeton sabe.",
      body: "Un cuaderno civico y tranquilo para nuevos residentes: traslados, cultura, charlas, estacionamiento, alertas, mandados, vida publica y las pequenas decisiones que convierten Princeton en un hogar usable.",
      note: "Espiritu Princeton sin confundirse con un sitio oficial de la Universidad.",
      primary: "Empezar por hoy",
      secondary: "Plan de datos",
      snapshotLabel: "Resumen de hoy",
      brief: [
        ["Princeton, NJ", "Modo residente"],
        ["Primer buen habito", "Revisar transporte antes de cultura"],
        ["Plan si llueve", "Biblioteca, charlas, cine"],
        ["Senal local", "Alertas naranjas, texto negro, confianza tranquila"],
      ],
    },
    intro: {
      eyebrow: "Posicionamiento",
      title: "No es un tablero municipal. Es un concierge de vida local.",
      body: "PrincetonLive responde a la pregunta que un nuevo residente mantiene abierta en diez pestanas: que debo saber hoy para vivir bien Princeton?",
    },
    identity: {
      eyebrow: "Sistema visual",
      title: "Una pista Princeton, no un disfraz Princeton.",
      paletteKicker: "Paleta",
      paletteTitle: "Naranja para senales. Negro para confianza.",
      paletteBody: "PrincetonLive usa el naranja Princeton como acento de alta senal y deja que la interfaz respire con neutros civicos y calidos.",
      swatchesLabel: "Paleta PrincetonLive",
      swatches: ["Naranja", "Negro", "Papel", "Civico"],
      tigerKicker: "Energia del tigre",
      tigerTitle: "Alerta, rapido y con un poco de espiritu.",
      tigerBody: "La influencia del tigre aparece en el movimiento y la jerarquia: barras diagonales nitidas, tarjetas faciles de escanear y momentos naranjas cuando un residente debe actuar.",
    },
    today: {
      eyebrow: "Hoy",
      title: "Una sola agenda entre la ciudad y la universidad.",
      filtersLabel: "Filtros de agenda",
      searchLabel: "Buscar en la agenda",
      searchPlaceholder: "Buscar charlas, peliculas, biblioteca, McCarter...",
      filters: [
        ["new", "Nuevo aqui"],
        ["family", "Familia"],
        ["rain", "Plan lluvia"],
        ["all", "Todo"],
      ],
      agenda: [
        ["4:30 PM", "Charla universitaria abierta", "Campus de Princeton", "Gratis", "Eventos de Princeton University"],
        ["6:00 PM", "Taller o evento comunitario en la biblioteca", "Princeton Public Library", "Residente", "Eventos de biblioteca"],
        ["7:10 PM", "Revisar funciones del Garden Theatre", "Nassau Street", "Interior", "Garden Theatre"],
        ["8:00 PM", "Ventana de funcion en McCarter", "University Place", "Artes", "McCarter Theatre"],
      ],
    },
    move: {
      eyebrow: "Moverse",
      title: "Decisiones de traslado antes de decisiones de calendario.",
      body: "La primera version prioriza logica de rutas confiable y enlaces oficiales; los feeds GTFS en vivo y con credenciales pueden sumarse despues del MVP estatico.",
      cards: [
        ["NYC sin equivocarse", "Dinky hasta Princeton Junction y luego Northeast Corridor hacia NY Penn. Revisa el margen de conexion antes de salir.", "Abrir NJ Transit"],
        ["Logica de ruta a Philly", "Princeton Junction a Trenton y luego SEPTA hacia Center City. Amtrak puede ser mas rapido, pero menos predecible para viajes simples.", "Abrir API de SEPTA"],
        ["Estacionar con cabeza", "Los parquimetros del centro, garajes y lotes de Princeton Junction tienen reglas distintas. Incluye el estacionamiento en el itinerario.", "Reglas de parking"],
        ["Princeton sin auto", "TigerTransit, FreeB, caminar, bicicleta y Dinky merecen un mapa claro en vez de cinco pestanas.", "Como moverse"],
      ],
    },
    culture: {
      eyebrow: "Cultura",
      title: "Vida intelectual publica, teatro, cine y biblioteca en un solo lugar.",
      cardTitle: "Esta noche en Princeton",
      body: "La ventaja del producto no es inventar eventos. Es unir la universidad, la biblioteca, Garden Theatre, McCarter, el museo, Richardson, Lewis Center y las artes locales en una agenda util para residentes.",
      stats: ["Gratis esta noche", "Abierto al publico", "Interior si llueve"],
    },
    practical: {
      eyebrow: "Vida practica",
      title: "Lo aburrido, facil de encontrar antes de que moleste.",
      tiles: [
        ["Alertas meteorologicas", "Listo para NWS"],
        ["Alertas municipales", "Nixle"],
        ["Basura y reciclaje", "Por direccion despues"],
        ["Cargadores EV", "Primero estatico"],
        ["Servicios municipales", "Enlaces de un toque"],
        ["Capas GIS", "Parques, zonificacion, senderos"],
      ],
    },
    explore: {
      eyebrow: "Explorar",
      title: "Caminatas del primer mes para orientarse.",
      body: "La capa de exploracion empieza con parques, senderos, arte publico, distritos historicos, juegos infantiles, banos y estacionamiento. Puede convertirse en un mapa residencial alimentado por el GIS de Princeton.",
      stops: [
        "Sendero del canal D&R",
        "Institute Woods",
        "Princeton Battlefield",
        "Caminos de Stony Brook",
        "Juegos infantiles con banos",
        "Paseos por distritos historicos",
      ],
    },
    sources: {
      eyebrow: "Factibilidad",
      title: "Plan de fuentes para la version en vivo.",
      body: "Lanzamiento estatico primero; luego feeds en vivo en cache cuando la fuente publica sea lo bastante solida para respetar a usuarios y duenos de fuentes.",
      label: "Plan de fuentes",
      rows: [
        ["Eventos universitarios", "RSS y filtros publicos", "Solido"],
        ["Eventos de biblioteca", "Feeds del calendario Communico", "Solido"],
        ["Clima y alertas", "API del National Weather Service", "Solido"],
        ["GIS municipal", "Servicios publicos de ArcGIS", "Solido"],
        ["Garden Theatre", "Extraccion HTML de funciones", "Viable"],
        ["McCarter", "Listados cacheados por scraping", "Vigilar"],
        ["Transito", "GTFS mas enlaces oficiales", "Con credenciales"],
        ["Basura/reciclaje", "Recycle Coach y guia municipal", "Manual primero"],
      ],
    },
    footer: {
      line: "Convertir un lugar famoso en un hogar usable.",
      top: "Volver arriba",
    },
  },
};

const agendaUrls = [
  "https://www.princeton.edu/events",
  "https://princetonlibrary.libnet.info/events",
  "https://www.princetongardentheatre.org/",
  "https://www.mccarter.org/events",
];

const agendaModes = [
  ["new", "culture"],
  ["family", "culture"],
  ["culture", "rain"],
  ["culture"],
];

const filterIcons = {
  new: Sparkles,
  family: Users,
  rain: Umbrella,
  all: CalendarDays,
};

const commuteIcons = [Train, Route, ParkingCircle, Bus];
const commuteUrls = [
  "https://www.njtransit.com/destinations/princeton-dinky",
  "https://api.septa.org/",
  "https://www.princetonnj.gov/203/Parking-in-Princeton",
  "https://www.princetonnj.gov/578/Getting-Around-Princeton",
];

const practicalIcons = [CloudRain, AlertTriangle, Recycle, BatteryCharging, Landmark, Map];
const practicalUrls = [
  "https://www.weather.gov/",
  "https://www.princetonnj.gov/274/Emergency-Phone-Notifications",
  "https://www.princetonnj.gov/",
  "https://developer.nrel.gov/docs/transportation/alt-fuel-stations-v1/all/",
  "https://www.princetonnj.gov/",
  "https://www.princetonnj.gov/1845/GIS-Maps-and-Apps",
];

function getInitialLanguage() {
  const params = new URLSearchParams(window.location.search);
  const lang = params.get("lang") || params.get("tl") || params.get("_x_tr_tl");
  return lang === "fr" || lang === "es" ? lang : "en";
}

function App() {
  const [language, setLanguage] = useState(getInitialLanguage);
  const [persona, setPersona] = useState("new");
  const [query, setQuery] = useState("");
  const t = translations[language];

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t.meta.title;
    const metaDescription = document.querySelector('meta[name="description"]');
    metaDescription?.setAttribute("content", t.meta.description);
  }, [language, t.meta.description, t.meta.title]);

  const selectLanguage = (nextLanguage) => {
    setLanguage(nextLanguage);
    const url = new URL(window.location.href);
    if (nextLanguage === "en") {
      url.searchParams.delete("lang");
    } else {
      url.searchParams.set("lang", nextLanguage);
    }
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const navItems = [
    ["today", t.nav.today],
    ["move", t.nav.move],
    ["culture", t.nav.culture],
    ["practical", t.nav.practical],
    ["explore", t.nav.explore],
  ];

  const agenda = t.today.agenda.map(([time, title, place, tag, source], index) => ({
    time,
    title,
    place,
    tag,
    source,
    mode: agendaModes[index],
    url: agendaUrls[index],
  }));

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
  }, [agenda, persona, query]);

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="PrincetonLive home">
          <span className="brand-mark">PL</span>
          <span>
            PrincetonLive
            <small>{t.brandSub}</small>
          </span>
        </a>
        <div className="header-controls">
          <nav aria-label="Primary navigation">
            {navItems.map(([id, label]) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
          </nav>
          <div className="language-switcher" aria-label={t.languageLabel}>
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
          <p className="eyebrow">{t.hero.eyebrow}</p>
          <h1>{t.hero.title}</h1>
          <p>{t.hero.body}</p>
          <div className="identity-note" aria-label="Brand positioning note">
            <span aria-hidden="true" />
            <strong>{t.hero.note}</strong>
          </div>
          <div className="hero-actions">
            <a className="primary-action" href="#today">
              {t.hero.primary} <ChevronRight size={18} aria-hidden="true" />
            </a>
            <a className="secondary-action" href="#sources">
              {t.hero.secondary}
            </a>
          </div>
        </div>
        <aside className="daily-brief" aria-label={t.hero.snapshotLabel}>
          {t.hero.brief.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </aside>
      </section>

      <section className="section intro-band">
        <div>
          <p className="eyebrow">{t.intro.eyebrow}</p>
          <h2>{t.intro.title}</h2>
        </div>
        <p>{t.intro.body}</p>
      </section>

      <section className="section identity-system" aria-labelledby="identity-heading">
        <div>
          <p className="eyebrow">{t.identity.eyebrow}</p>
          <h2 id="identity-heading">{t.identity.title}</h2>
        </div>
        <div className="identity-panels">
          <article className="identity-panel color-panel">
            <span className="panel-kicker">{t.identity.paletteKicker}</span>
            <h3>{t.identity.paletteTitle}</h3>
            <p>{t.identity.paletteBody}</p>
            <div className="swatches" aria-label={t.identity.swatchesLabel}>
              {[
                ["#ee7f2d", t.identity.swatches[0]],
                ["#0b0b0b", t.identity.swatches[1]],
                ["#f4efe6", t.identity.swatches[2]],
                ["#2f6958", t.identity.swatches[3]],
              ].map(([swatch, label]) => (
                <span style={{ "--swatch": swatch }} key={label}>
                  {label}
                </span>
              ))}
            </div>
          </article>
          <article className="identity-panel tiger-panel">
            <span className="panel-kicker">{t.identity.tigerKicker}</span>
            <h3>{t.identity.tigerTitle}</h3>
            <p>{t.identity.tigerBody}</p>
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
          <p className="eyebrow">{t.today.eyebrow}</p>
          <h2>{t.today.title}</h2>
        </div>
        <div className="control-row" aria-label={t.today.filtersLabel}>
          {t.today.filters.map(([value, label]) => {
            const Icon = filterIcons[value];
            return (
              <button
                key={value}
                type="button"
                className={persona === value ? "is-active" : ""}
                onClick={() => setPersona(value)}
              >
                <Icon size={17} aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">{t.today.searchLabel}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.today.searchPlaceholder}
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
            <p className="eyebrow">{t.move.eyebrow}</p>
            <h2>{t.move.title}</h2>
          </div>
          <p>{t.move.body}</p>
        </div>
        <div className="commute-grid">
          {t.move.cards.map(([title, detail, action], index) => {
            const Icon = commuteIcons[index];
            return (
              <a href={commuteUrls[index]} className="feature-card" key={title}>
                <Icon size={24} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{detail}</p>
                <span>
                  {action} <ChevronRight size={16} aria-hidden="true" />
                </span>
              </a>
            );
          })}
        </div>
      </section>

      <section className="culture-band" id="culture">
        <div className="section-heading">
          <p className="eyebrow">{t.culture.eyebrow}</p>
          <h2>{t.culture.title}</h2>
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
            <h3>{t.culture.cardTitle}</h3>
            <p>{t.culture.body}</p>
            <div className="mini-stats">
              {t.culture.stats.map((stat) => (
                <span key={stat}>{stat}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section practical" id="practical">
        <div className="section-heading">
          <p className="eyebrow">{t.practical.eyebrow}</p>
          <h2>{t.practical.title}</h2>
        </div>
        <div className="tile-grid">
          {t.practical.tiles.map(([label, value], index) => {
            const Icon = practicalIcons[index];
            return (
              <a className="utility-tile" href={practicalUrls[index]} key={label}>
                <Icon size={21} aria-hidden="true" />
                <span>{label}</span>
                <strong>{value}</strong>
              </a>
            );
          })}
        </div>
      </section>

      <section className="section explore" id="explore">
        <div>
          <p className="eyebrow">{t.explore.eyebrow}</p>
          <h2>{t.explore.title}</h2>
          <p>{t.explore.body}</p>
        </div>
        <div className="walk-list">
          {t.explore.stops.map((stop, index) => (
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
            <p className="eyebrow">{t.sources.eyebrow}</p>
            <h2>{t.sources.title}</h2>
          </div>
          <p>{t.sources.body}</p>
        </div>
        <div className="source-table" role="table" aria-label={t.sources.label}>
          {t.sources.rows.map(([source, method, status]) => (
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
          <span>{t.footer.line}</span>
        </div>
        <a href="#top">
          <Navigation size={16} aria-hidden="true" />
          {t.footer.top}
        </a>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
