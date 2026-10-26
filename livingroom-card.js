/**
 * Livingroom Card
 * Carte Lovelace "tout-en-un" pour piloter une pièce de vie : ambiance visuelle
 * qui change selon l'état des entités, points interactifs sur l'image, lumières,
 * volets, média (enceinte + TV), prises, scènes et climat — avec éditeur visuel.
 *
 * Aucune dépendance externe : Web Components + Shadow DOM.
 */

const CARD_VERSION = "1.0.0";
const CARD_TAG = "livingroom-card";
const EDITOR_TAG = "livingroom-card-editor";

/* ------------------------------------------------------------------ */
/* Valeurs par défaut                                                  */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG = {
  name: "Salon",
  icon: "mdi:sofa",
  area: "",
  header: { weather: "", mode: "", show_temperature: true },
  layout: {
    mode: "tabs",            // tabs | stacked
    hero: true,
    hero_style: "banner",    // banner | ambient
    wide: "auto",            // auto | never
    wide_breakpoint: 700,    // largeur (px) de la carte à partir de laquelle on passe en 2 colonnes
    wide_split: 55,          // part de l'image (%) en disposition large
    aspect_ratio: "3/2",
    default_tab: "auto",
    remember_tab: true,
    auto_media_tab: true,
    show_summary: true,
    show_scenes: true,
    show_all_off: true,
    hide_unavailable: false,
    accent_color: "",
  },
  behavior: {
    light_tap: "toggle",     // toggle | more-info
    hold: "more-info",       // more-info | none
    haptics: true,
    confirm_all_off: true,
    all_off: { lights: true, devices: false, media: true, covers: false },
  },
  images: {
    default: "",
    transition: 900,
    position: "center",
    night_dim: 0,
    rules: [],
    overlays: [],
  },
  hotspots: [],
  lights: [],
  covers: [],
  media: { player: "", tv: "", tv_power: "", ambilight: "", show_sources: true, sources: [], sound_controls: [] },
  devices: [],
  scenes: [],
  climate: { temperature: "", humidity: "", climate: "", comfort_min: 19, comfort_max: 23, graph: true, hours: 24 },
};

const TABS = [
  { id: "lights", icon: "mdi:lightbulb-group", label: "Lumières" },
  { id: "covers", icon: "mdi:window-shutter", label: "Volets" },
  { id: "media", icon: "mdi:music-box-multiple", label: "Média" },
  { id: "devices", icon: "mdi:power-socket-eu", label: "Appareils" },
  { id: "climate", icon: "mdi:thermometer", label: "Climat" },
];

const CONDITION_TYPES = [
  { value: "entity", label: "État d'une entité" },
  { value: "night", label: "Il fait nuit (soleil couché)" },
  { value: "day", label: "Il fait jour" },
  { value: "lights_on", label: "Au moins une lumière allumée" },
  { value: "lights_off", label: "Toutes les lumières éteintes" },
  { value: "tv_on", label: "TV allumée" },
  { value: "media_playing", label: "Musique / média en lecture" },
  { value: "covers_closed", label: "Volets fermés (moyenne ≤ seuil %)" },
  { value: "covers_open", label: "Volets ouverts (moyenne ≥ seuil %)" },
  { value: "mode", label: "Mode maison = valeur" },
];

const OPERATORS = [
  { value: "is", label: "est égal à" },
  { value: "is_not", label: "est différent de" },
  { value: "active", label: "est actif (on / ouvert / lecture…)" },
  { value: "inactive", label: "est inactif" },
  { value: "above", label: "est supérieur à" },
  { value: "below", label: "est inférieur à" },
];

const ACTIVE_STATES = ["on", "open", "opening", "closing", "playing", "home", "heat", "cool", "heat_cool", "auto", "dry", "fan_only", "active", "unlocked", "buffering"];
const OFF_LIKE = ["off", "standby", "unavailable", "unknown", "idle"];

const DOMAIN_ICONS = {
  light: ["mdi:lightbulb-outline", "mdi:lightbulb-on"],
  switch: ["mdi:power-socket-eu", "mdi:power-socket-eu"],
  input_boolean: ["mdi:toggle-switch-off-outline", "mdi:toggle-switch"],
  fan: ["mdi:fan-off", "mdi:fan"],
  cover: ["mdi:window-shutter", "mdi:window-shutter-open"],
  scene: ["mdi:palette", "mdi:palette"],
  script: ["mdi:script-text-play", "mdi:script-text-play"],
  button: ["mdi:gesture-tap-button", "mdi:gesture-tap-button"],
  media_player: ["mdi:speaker", "mdi:speaker-play"],
  automation: ["mdi:robot-off", "mdi:robot"],
};

const WEATHER_ICONS = {
  "clear-night": "mdi:weather-night", cloudy: "mdi:weather-cloudy", exceptional: "mdi:alert-circle-outline",
  fog: "mdi:weather-fog", hail: "mdi:weather-hail", lightning: "mdi:weather-lightning",
  "lightning-rainy": "mdi:weather-lightning-rainy", partlycloudy: "mdi:weather-partly-cloudy",
  pouring: "mdi:weather-pouring", rainy: "mdi:weather-rainy", snowy: "mdi:weather-snowy",
  "snowy-rainy": "mdi:weather-snowy-rainy", sunny: "mdi:weather-sunny", windy: "mdi:weather-windy",
  "windy-variant": "mdi:weather-windy-variant",
};

/* ------------------------------------------------------------------ */
/* Utilitaires                                                         */
/* ------------------------------------------------------------------ */

const clone = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
const isObj = (o) => o && typeof o === "object" && !Array.isArray(o);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function deepMerge(base, over) {
  const out = clone(base);
  if (!isObj(over)) return out;
  for (const [k, v] of Object.entries(over)) {
    if (isObj(v) && isObj(out[k])) out[k] = deepMerge(out[k], v);
    else if (v !== undefined && v !== null) out[k] = clone(v);
  }
  return out;
}

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function fireEvent(node, type, detail = {}) {
  const ev = new Event(type, { bubbles: true, composed: true });
  ev.detail = detail;
  node.dispatchEvent(ev);
  return ev;
}

const domainOf = (id) => (id || "").split(".")[0];
const objectIdOf = (id) => (id || "").split(".")[1] || "";

function isActiveState(st) {
  return !!st && ACTIVE_STATES.includes(st.state);
}

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

function fmtNum(v, digits = 1) {
  const n = parseFloat(v);
  return isNaN(n) ? "—" : n.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Normalise une entrée de liste : "light.x" ou {entity: "light.x", ...}. */
function normItem(it) {
  return typeof it === "string" ? { entity: it } : { ...(it || {}) };
}

/* ------------------------------------------------------------------ */
/* Découverte automatique depuis une pièce                             */
/* ------------------------------------------------------------------ */

function discoverArea(hass, areaId) {
  const out = { lights: [], covers: [], media: {}, devices: [], scenes: [], climate: {} };
  if (!hass || !areaId || !hass.entities) return out;
  const devices = hass.devices || {};
  const entries = Object.values(hass.entities).filter((e) => {
    const area = e.area_id || (devices[e.device_id] || {}).area_id;
    return area === areaId && hass.states[e.entity_id] && !e.hidden && !e.hidden_by && !e.disabled_by;
  });
  const visible = entries.filter((e) => !e.entity_category);
  const nameOf = (e) => (hass.states[e.entity_id].attributes.friendly_name || e.entity_id);
  const byDomain = (d) => visible.filter((e) => domainOf(e.entity_id) === d);

  // Média
  const players = byDomain("media_player").sort(
    (a, b) => (hass.states[b.entity_id].attributes.supported_features || 0) - (hass.states[a.entity_id].attributes.supported_features || 0)
  );
  const tv = players.find((e) => hass.states[e.entity_id].attributes.device_class === "tv");
  const speaker = players.find((e) => e !== tv && hass.states[e.entity_id].attributes.device_class !== "tv");
  const mediaDevices = new Set(players.map((p) => p.device_id).filter(Boolean));
  if (speaker) out.media.player = speaker.entity_id;
  if (tv) {
    out.media.tv = tv.entity_id;
    const amb = byDomain("light").find((e) => (tv.device_id && e.device_id === tv.device_id) || /ambilight/i.test(e.entity_id));
    if (amb) out.media.ambilight = amb.entity_id;
  }
  const tvPower = byDomain("switch").find((e) => /^(tv|télé|tele|télévision|television)$/i.test(String(nameOf(e)).trim()));
  if (tvPower) out.media.tv_power = tvPower.entity_id;
  if (speaker && speaker.device_id) {
    out.media.sound_controls = entries
      .filter((e) => e.device_id === speaker.device_id && domainOf(e.entity_id) === "switch" &&
        /nuit|night|dialog|loudness|caisson|sub/i.test(e.entity_id + " " + nameOf(e)))
      .map((e) => e.entity_id);
  }

  // Lumières
  const lightRe = /lamp|lampe|lumi|light|led|guirlande|spot|applique|lustre|plafonnier/i;
  for (const e of byDomain("light")) {
    if (e.entity_id === out.media.ambilight || /dnd/i.test(e.entity_id)) continue;
    out.lights.push({ entity: e.entity_id });
  }
  for (const e of byDomain("switch")) {
    if (lightRe.test(e.entity_id + " " + nameOf(e)) && !mediaDevices.has(e.device_id)) out.lights.push({ entity: e.entity_id });
  }
  const lightIds = new Set(out.lights.map((l) => l.entity));

  // Volets
  for (const e of byDomain("cover")) {
    if (/_low_speed$/.test(e.entity_id)) continue;
    const item = { entity: e.entity_id };
    const my = `button.${objectIdOf(e.entity_id)}_my_position`;
    if (hass.states[my]) item.my_button = my;
    out.covers.push(item);
  }

  // Appareils / prises
  for (const e of byDomain("switch")) {
    if (lightIds.has(e.entity_id) || mediaDevices.has(e.device_id)) continue;
    out.devices.push({ entity: e.entity_id });
  }

  // Scènes et scripts
  for (const e of [...byDomain("scene"), ...byDomain("script")]) out.scenes.push({ entity: e.entity_id });

  // Climat
  for (const e of byDomain("sensor")) {
    const dc = hass.states[e.entity_id].attributes.device_class;
    if (dc === "temperature" && !out.climate.temperature) out.climate.temperature = e.entity_id;
    if (dc === "humidity" && !out.climate.humidity) out.climate.humidity = e.entity_id;
  }
  const climate = byDomain("climate")[0];
  if (climate) out.climate.climate = climate.entity_id;
  return out;
}

/** Fusionne la config utilisateur avec les défauts et la découverte par pièce. */
function resolveConfig(hass, raw) {
  const cfg = deepMerge(DEFAULT_CONFIG, raw || {});
  for (const k of ["lights", "covers", "devices", "scenes", "hotspots"]) cfg[k] = (cfg[k] || []).map(normItem);
  if (cfg.area && hass) {
    const d = discoverArea(hass, cfg.area);
    for (const k of ["lights", "covers", "devices", "scenes"]) if (!raw || !raw[k]) cfg[k] = d[k];
    for (const k of Object.keys(d.media)) if (!(raw && raw.media && raw.media[k])) cfg.media[k] = d.media[k];
    for (const k of Object.keys(d.climate)) if (!(raw && raw.climate && raw.climate[k])) cfg.climate[k] = d.climate[k];
  }
  if (!cfg.header.weather && hass && raw && raw.header === undefined) {
    cfg.header.weather = Object.keys(hass.states).find((id) => id.startsWith("weather.")) || "";
  }
  return cfg;
}

/* ------------------------------------------------------------------ */
/* Contexte d'ambiance et moteur de règles d'images                     */
/* ------------------------------------------------------------------ */

function computeContext(hass, cfg) {
  const st = (id) => (id ? hass.states[id] : undefined);
  const sun = st("sun.sun");
  const hour = new Date().getHours();
  const night = sun ? sun.state === "below_horizon" : hour < 7 || hour >= 20;
  const elevation = sun && sun.attributes.elevation !== undefined ? sun.attributes.elevation : night ? -10 : 30;

  const lights = cfg.lights.map((l) => st(l.entity)).filter(Boolean);
  const lightsOn = lights.filter((s) => s.state === "on");
  const brightness = lightsOn.length
    ? lightsOn.reduce((a, s) => a + (s.attributes.brightness !== undefined ? s.attributes.brightness / 255 : 1), 0) / lightsOn.length
    : 0;

  const positions = [];
  for (const c of cfg.covers) {
    const s = st(c.entity);
    if (!s) continue;
    if (s.attributes.current_position !== undefined) positions.push(Number(s.attributes.current_position));
    else if (s.state === "open") positions.push(100);
    else if (s.state === "closed") positions.push(0);
  }
  const coverAvg = positions.length ? Math.round(positions.reduce((a, b) => a + b, 0) / positions.length) : null;

  const tv = st(cfg.media.tv);
  const tvPower = st(cfg.media.tv_power);
  let tvOn = false;
  if (tv && tv.state !== "unavailable") tvOn = !OFF_LIKE.includes(tv.state);
  else if (!tv && tvPower) tvOn = tvPower.state === "on";
  const player = st(cfg.media.player);
  const playing = !!player && player.state === "playing";
  const amb = st(cfg.media.ambilight);
  const mode = st(cfg.header.mode);

  return {
    night, elevation, hour, lights, lightsOn: lightsOn.length, lightCount: lights.length, brightness,
    coverAvg, coverPositions: positions, tvOn, playing, player, tv,
    ambilightOn: !!amb && amb.state === "on", mode: mode ? mode.state : "",
  };
}

function evalCondition(hass, ctx, c) {
  const type = c.condition || "entity";
  const thr = c.value !== undefined && c.value !== "" ? Number(c.value) : undefined;
  switch (type) {
    case "night": return ctx.night;
    case "day": return !ctx.night;
    case "lights_on": return ctx.lightsOn > 0;
    case "lights_off": return ctx.lightsOn === 0;
    case "tv_on": return ctx.tvOn;
    case "media_playing": return ctx.playing;
    case "covers_closed": return ctx.coverAvg !== null && ctx.coverAvg <= (thr ?? 20);
    case "covers_open": return ctx.coverAvg !== null && ctx.coverAvg >= (thr ?? 80);
    case "mode": return String(ctx.mode).toLowerCase() === String(c.value ?? "").toLowerCase();
    case "entity": {
      const s = hass.states[c.entity];
      if (!s) return false;
      const val = c.attribute ? s.attributes[c.attribute] : s.state;
      const op = c.operator || "is";
      const values = String(c.value ?? "").split(",").map((v) => v.trim()).filter((v) => v !== "");
      switch (op) {
        case "is": return values.includes(String(val));
        case "is_not": return !values.includes(String(val));
        case "active": return ACTIVE_STATES.includes(String(val));
        case "inactive": return !ACTIVE_STATES.includes(String(val));
        case "above": return parseFloat(val) > parseFloat(values[0]);
        case "below": return parseFloat(val) < parseFloat(values[0]);
        default: return false;
      }
    }
    default: return false;
  }
}

function evalRule(hass, ctx, rule) {
  const conds = rule.conditions || [];
  if (!conds.length) return false;
  return rule.match === "any" ? conds.some((c) => evalCondition(hass, ctx, c)) : conds.every((c) => evalCondition(hass, ctx, c));
}

/** Détermine l'image d'ambiance : première règle satisfaite, sinon image par défaut. */
function computeScene(hass, cfg) {
  const ctx = computeContext(hass, cfg);
  const rules = cfg.images.rules || [];
  for (let i = 0; i < rules.length; i++) {
    if (rules[i].disabled) continue;
    if (evalRule(hass, ctx, rules[i])) {
      return { ctx, index: i, image: rules[i].image || cfg.images.default, filter: rules[i].filter || "", name: rules[i].name || `Règle ${i + 1}` };
    }
  }
  return { ctx, index: -1, image: cfg.images.default, filter: "", name: "Image par défaut" };
}

/** Règles d'ambiance proposées, alignées avec les noms de fichiers du guide des prompts. */
function suggestedRules(folder = "/local/salon/") {
  const f = folder.endsWith("/") ? folder : folder + "/";
  return [
    { name: "Cinéma (TV la nuit)", image: f + "salon_tv_nuit.jpg", match: "all", conditions: [{ condition: "tv_on" }, { condition: "night" }] },
    { name: "TV en journée", image: f + "salon_tv_jour.jpg", match: "all", conditions: [{ condition: "tv_on" }] },
    { name: "Soirée lumières", image: f + "salon_nuit_lumieres.jpg", match: "all", conditions: [{ condition: "night" }, { condition: "lights_on" }] },
    { name: "Nuit", image: f + "salon_nuit.jpg", match: "all", conditions: [{ condition: "night" }] },
    { name: "Volets fermés", image: f + "salon_volets_fermes.jpg", match: "all", conditions: [{ condition: "covers_closed", value: 20 }] },
    { name: "Musique", image: f + "salon_musique.jpg", match: "all", conditions: [{ condition: "media_playing" }] },
    { name: "Absent", image: f + "salon_jour.jpg", filter: "grayscale(0.7) brightness(0.8)", match: "all", conditions: [{ condition: "mode", value: "Absent" }] },
  ];
}

/* ------------------------------------------------------------------ */
/* Illustration de secours (aucune image configurée)                   */
/* ------------------------------------------------------------------ */

function skyColors(elevation) {
  if (elevation > 10) return ["#6fb3ff", "#cfe8ff"];
  if (elevation > 0) return ["#ff9a6b", "#ffd59a"];
  if (elevation > -6) return ["#4b3b78", "#e0807a"];
  return ["#0b1230", "#1f2a55"];
}

function renderIllustration(ctx, cfg) {
  const [skyTop, skyBottom] = skyColors(ctx.elevation);
  const dark = ctx.night || (ctx.coverAvg !== null && ctx.coverAvg < 15);
  const warm = ctx.lightsOn > 0;
  const wall = dark ? (warm ? "#3b2d26" : "#1b1f2e") : "#e9e1d6";
  const wall2 = dark ? (warm ? "#2a201c" : "#141826") : "#d9cfc1";
  const floor = dark ? "#2a1f19" : "#b98c63";
  const nWin = clamp(cfg.covers.length || 1, 1, 3);
  const positions = ctx.coverPositions.length ? ctx.coverPositions : [ctx.night ? 0 : 100];
  const winW = nWin === 1 ? 170 : nWin === 2 ? 130 : 96;
  const gap = 18;
  const total = nWin * winW + (nWin - 1) * gap;
  const startX = 300 - total / 2 - 40;
  const lamp1 = ctx.lights[0] && ctx.lights[0].state === "on";
  const lamp1b = lamp1 && ctx.lights[0].attributes.brightness !== undefined ? ctx.lights[0].attributes.brightness / 255 : 1;
  const lamp2 = ctx.lights[1] && ctx.lights[1].state === "on";
  const stars = ctx.elevation < -6
    ? Array.from({ length: 14 }, (_, i) => `<circle cx="${(i * 47) % 600}" cy="${(i * 29) % 120 + 20}" r="${i % 3 ? 0.9 : 1.4}" fill="#fff" opacity="${0.4 + (i % 4) / 6}"/>`).join("")
    : "";

  let windows = "";
  for (let i = 0; i < nWin; i++) {
    const x = startX + i * (winW + gap);
    const pos = clamp(positions[i] !== undefined ? positions[i] : positions[0], 0, 100);
    const shutterH = (130 * (100 - pos)) / 100;
    windows += `
      <g>
        <rect x="${x - 6}" y="44" width="${winW + 12}" height="146" rx="4" fill="${dark ? "#2b2f3d" : "#f6f2ec"}"/>
        <rect x="${x}" y="50" width="${winW}" height="130" fill="url(#sky)" clip-path="url(#wclip${i})"/>
        <clipPath id="wclip${i}"><rect x="${x}" y="50" width="${winW}" height="130"/></clipPath>
        <g clip-path="url(#wclip${i})">${stars}</g>
        <line x1="${x + winW / 2}" y1="50" x2="${x + winW / 2}" y2="180" stroke="${dark ? "#2b2f3d" : "#f6f2ec"}" stroke-width="5"/>
        <rect class="shutter" x="${x}" y="50" width="${winW}" height="${shutterH}" fill="url(#slats)"/>
        <rect x="${x - 10}" y="40" width="${winW + 20}" height="10" rx="3" fill="${dark ? "#3a3f50" : "#cfc5b8"}"/>
      </g>`;
  }

  const tvScreen = ctx.tvOn
    ? `<rect x="452" y="196" width="118" height="68" rx="3" fill="url(#tvscreen)"/>`
    : `<rect x="452" y="196" width="118" height="68" rx="3" fill="#0d0f14"/>`;
  const ambilight = ctx.tvOn && (ctx.ambilightOn || !cfg.media.ambilight)
    ? `<ellipse cx="511" cy="230" rx="105" ry="62" fill="url(#ambi)" class="pulse"/>`
    : "";
  const notes = ctx.playing
    ? `<g class="notes" fill="${dark ? "#ffd38a" : "#7a5cff"}">
         <text x="120" y="210" font-size="20" class="n1">♪</text>
         <text x="150" y="190" font-size="16" class="n2">♫</text>
         <text x="100" y="185" font-size="14" class="n3">♪</text>
       </g>`
    : "";

  return `
  <svg viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${skyTop}"/><stop offset="1" stop-color="${skyBottom}"/></linearGradient>
      <linearGradient id="wallg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${wall}"/><stop offset="1" stop-color="${wall2}"/></linearGradient>
      <pattern id="slats" width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill="${dark ? "#4a4f60" : "#c9c2b6"}"/><rect width="8" height="1.4" y="6.6" fill="${dark ? "#353a49" : "#a9a194"}"/>
      </pattern>
      <radialGradient id="glow1"><stop offset="0" stop-color="#ffcf7a" stop-opacity="${0.85 * lamp1b}"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/></radialGradient>
      <radialGradient id="glow2"><stop offset="0" stop-color="#ffb35c" stop-opacity="0.7"/><stop offset="1" stop-color="#ffb35c" stop-opacity="0"/></radialGradient>
      <radialGradient id="ambi"><stop offset="0.45" stop-color="#7f5cff" stop-opacity="0.75"/><stop offset="1" stop-color="#3fd0ff" stop-opacity="0"/></radialGradient>
      <linearGradient id="tvscreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a7bd5"/><stop offset="1" stop-color="#8e44ad"/></linearGradient>
      <linearGradient id="sofa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dark ? "#3c4a5c" : "#5b7a99"}"/><stop offset="1" stop-color="${dark ? "#2a3442" : "#46617d"}"/></linearGradient>
    </defs>
    <rect width="600" height="400" fill="url(#wallg)"/>
    ${windows}
    <rect y="300" width="600" height="100" fill="${floor}"/>
    <rect y="300" width="600" height="4" fill="#000" opacity=".12"/>
    <!-- Bibliothèque -->
    <g opacity="${dark && !lamp2 ? 0.7 : 1}">
      <rect x="18" y="120" width="70" height="180" rx="3" fill="${dark ? "#3b2a20" : "#8a6446"}"/>
      ${[150, 190, 230, 270].map((y) => `<rect x="22" y="${y}" width="62" height="4" fill="${dark ? "#2a1d16" : "#6e4f37"}"/>`).join("")}
      ${[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4].map((c) => `<rect x="${26 + c * 11}" y="${126 + r * 40}" width="8" height="${20 + ((r + c) % 3) * 3}" fill="${["#c0504d", "#4f81bd", "#9bbb59", "#f2c14e", "#8064a2"][(r + c) % 5]}" opacity=".85"/>`).join("")).join("")}
      <path d="M44 112 h24 l-5 -16 h-14 z" fill="${lamp2 ? "#ffe0a3" : dark ? "#555" : "#e8e1d4"}"/>
    </g>
    ${lamp2 ? `<circle cx="56" cy="104" r="70" fill="url(#glow2)"/>` : ""}
    <!-- Lampadaire -->
    ${lamp1 ? `<circle cx="150" cy="150" r="130" fill="url(#glow1)"/>` : ""}
    <rect x="148" y="150" width="4" height="150" fill="${dark ? "#555" : "#4a4a4a"}"/>
    <ellipse cx="150" cy="300" rx="22" ry="5" fill="${dark ? "#444" : "#3f3f3f"}"/>
    <path d="M128 152 h44 l-10 -34 h-24 z" fill="${lamp1 ? "#ffe6b0" : dark ? "#5a5a5a" : "#efe7da"}"/>
    <!-- Canapé -->
    <rect x="176" y="236" width="230" height="56" rx="16" fill="url(#sofa)"/>
    <rect x="186" y="214" width="210" height="44" rx="14" fill="url(#sofa)"/>
    <rect x="168" y="244" width="30" height="52" rx="12" fill="url(#sofa)"/>
    <rect x="384" y="244" width="30" height="52" rx="12" fill="url(#sofa)"/>
    <rect x="200" y="226" width="44" height="30" rx="8" fill="${dark ? "#8a6b4f" : "#f2b880"}" opacity=".9"/>
    <rect x="182" y="292" width="8" height="10" fill="#222"/><rect x="392" y="292" width="8" height="10" fill="#222"/>
    <!-- Meuble TV + TV -->
    ${ambilight}
    <rect x="430" y="276" width="162" height="26" rx="4" fill="${dark ? "#2d241e" : "#6b4e3a"}"/>
    <rect x="446" y="190" width="130" height="80" rx="5" fill="#111"/>
    ${tvScreen}
    <rect x="506" y="270" width="10" height="7" fill="#111"/>
    <rect x="460" y="282" width="40" height="8" rx="3" fill="#1b1b1b"/>
    ${notes}
    <!-- Plante -->
    <rect x="410" y="276" width="16" height="24" rx="3" fill="${dark ? "#4a3a30" : "#c06b3e"}"/>
    <path d="M418 278 C 400 250, 404 236, 418 222 C 432 236, 436 250, 418 278 Z" fill="${dark ? "#2f5a3d" : "#4f9d69"}"/>
    ${ctx.night && !warm && !ctx.tvOn ? `<rect width="600" height="400" fill="#05070f" opacity=".35"/>` : ""}
  </svg>`;
}

/* ------------------------------------------------------------------ */
/* Styles                                                               */
/* ------------------------------------------------------------------ */

const CARD_STYLES = `
:host { display: block; container: lrc / inline-size; --lrc-radius: var(--ha-card-border-radius, 24px); --lrc-accent: var(--lrc-accent-color, var(--accent-color, #ff9800));
  --lrc-light: #ffb74d; --lrc-cover: #5c9dff; --lrc-media: #9b6bff; --lrc-device: #3ecf8e; --lrc-climate: #ff7a59;
  --lrc-tile: color-mix(in srgb, var(--primary-text-color) 6%, transparent);
  --lrc-tile-hover: color-mix(in srgb, var(--primary-text-color) 10%, transparent);
  --lrc-muted: var(--secondary-text-color); }
* { box-sizing: border-box; }
ha-card { position: relative; overflow: hidden; border-radius: var(--lrc-radius); isolation: isolate; background: var(--ha-card-background, var(--card-background-color, #fff)); }
button { font: inherit; color: inherit; }
.ambient { position: absolute; inset: -60px; z-index: -1; background-size: cover; background-position: center; filter: blur(48px) saturate(1.5); opacity: .45; transition: background-image .8s; pointer-events: none; }
.style-ambient .tile, .style-ambient .chip, .style-ambient .tabs { backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }

/* Hero */
.hero { position: relative; width: 100%; overflow: hidden; background: #111; user-select: none; -webkit-user-select: none; }
.hero .layer { position: absolute; inset: 0; opacity: 0; transition: opacity var(--lrc-fade, 900ms) ease; }
.hero .layer.show { opacity: 1; }
.hero .layer img { width: 100%; height: 100%; object-fit: cover; display: block; }
.hero .illus { position: absolute; inset: 0; }
.hero .illus svg { width: 100%; height: 100%; display: block; }
.hero .illus .shutter { transition: height .8s ease; }
.hero .illus .pulse { animation: pulse 4s ease-in-out infinite; transform-origin: 511px 230px; }
.hero .illus .notes text { animation: float 3s ease-in-out infinite; }
.hero .illus .notes .n2 { animation-delay: 1s; } .hero .illus .notes .n3 { animation-delay: 2s; }
@keyframes pulse { 0%,100% { opacity: .75; } 50% { opacity: 1; } }
@keyframes float { 0% { transform: translateY(6px); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateY(-22px); opacity: 0; } }
.overlay { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; pointer-events: none; transition: opacity .6s ease; }
.scrim { position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,0) 32%, rgba(0,0,0,0) 62%, rgba(0,0,0,.65) 100%); }
.night-dim { position: absolute; inset: 0; background: #000; pointer-events: none; transition: opacity .8s; }
.hero-top { position: absolute; top: 0; left: 0; right: 0; display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; padding: 14px 14px 0; color: #fff; z-index: 3; }
.title { display: flex; align-items: center; gap: 10px; flex: 0 0 auto; max-width: 55%; }
.title ha-icon { --mdc-icon-size: 26px; filter: drop-shadow(0 1px 3px rgba(0,0,0,.5)); }
.title .name { font-size: 1.35rem; font-weight: 700; letter-spacing: .2px; text-shadow: 0 1px 4px rgba(0,0,0,.45); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hchips { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; position: relative; min-width: 0; }
.hchip { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 999px; background: rgba(0,0,0,.32); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,.18); font-size: .82rem; font-weight: 600; color: #fff; cursor: pointer; white-space: nowrap; }
.hchip ha-icon { --mdc-icon-size: 16px; }
.menu { position: absolute; top: calc(100% + 6px); right: 0; min-width: 160px; background: var(--card-background-color, #222); color: var(--primary-text-color); border-radius: 14px; padding: 6px; box-shadow: 0 10px 30px rgba(0,0,0,.35); z-index: 10; }
.menu button { display: flex; width: 100%; align-items: center; gap: 8px; padding: 9px 12px; border: 0; background: none; border-radius: 10px; cursor: pointer; text-align: left; }
.menu button:hover, .menu button.sel { background: var(--lrc-tile-hover); }
.menu button.sel { font-weight: 700; color: var(--lrc-accent); }
.hero-bottom { position: absolute; left: 0; right: 0; bottom: 0; padding: 0 14px 12px; color: #fff; z-index: 3; pointer-events: none; }
.summary { font-size: .88rem; font-weight: 500; text-shadow: 0 1px 3px rgba(0,0,0,.6); display: flex; flex-wrap: wrap; gap: 4px 12px; }
.summary span { display: inline-flex; align-items: center; gap: 4px; }
.summary ha-icon { --mdc-icon-size: 16px; }
.hotspots { position: absolute; inset: 0; z-index: 2; }
.hs { position: absolute; transform: translate(-50%, -50%); display: flex; align-items: center; gap: 6px; padding: 0; border: 0; background: none; cursor: pointer; touch-action: manipulation; }
.hs .dot { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; background: rgba(0,0,0,.38); border: 1.5px solid rgba(255,255,255,.55); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); color: #fff; transition: transform .2s, background .3s, box-shadow .3s; }
.hs .dot ha-icon { --mdc-icon-size: 20px; }
.hs.on .dot { background: color-mix(in srgb, var(--hs-color, var(--lrc-light)) 75%, transparent); border-color: #fff; box-shadow: 0 0 0 6px color-mix(in srgb, var(--hs-color, var(--lrc-light)) 30%, transparent), 0 0 24px var(--hs-color, var(--lrc-light)); }
.hs:active .dot { transform: scale(.9); }
.hs .lbl { padding: 3px 8px; border-radius: 8px; background: rgba(0,0,0,.45); color: #fff; font-size: .75rem; font-weight: 600; white-space: nowrap; }
.hs.unavail { opacity: .45; }

/* Scènes */
.scenes { display: flex; gap: 8px; overflow-x: auto; padding: 12px 14px 4px; scrollbar-width: none; scroll-snap-type: x proximity; }
.scenes::-webkit-scrollbar { display: none; }
.chip { flex: 0 0 auto; scroll-snap-align: start; display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; border: 1px solid var(--divider-color, rgba(127,127,127,.25)); background: var(--lrc-tile); cursor: pointer; font-size: .88rem; font-weight: 600; white-space: nowrap; transition: background .2s, transform .15s, border-color .2s; touch-action: manipulation; user-select: none; -webkit-user-select: none; }
.chip ha-icon { --mdc-icon-size: 18px; color: var(--chip-color, var(--lrc-accent)); }
.chip:hover { background: var(--lrc-tile-hover); }
.chip:active { transform: scale(.96); }
.chip.on { background: color-mix(in srgb, var(--chip-color, var(--lrc-accent)) 20%, transparent); border-color: color-mix(in srgb, var(--chip-color, var(--lrc-accent)) 60%, transparent); }
.chip.done { background: color-mix(in srgb, var(--lrc-device) 25%, transparent); border-color: var(--lrc-device); }
.chip.armed, .tile.armed, .btn.armed { animation: shake .4s; border-color: var(--error-color, #e53935) !important; background: color-mix(in srgb, var(--error-color, #e53935) 18%, transparent) !important; }
.chip.danger ha-icon { color: var(--error-color, #e53935); }
@keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }

/* Onglets */
.tabs { display: flex; gap: 4px; margin: 10px 14px 0; padding: 4px; border-radius: 16px; background: var(--lrc-tile); }
.tab { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; border: 0; border-radius: 12px; background: none; cursor: pointer; color: var(--lrc-muted); transition: background .2s, color .2s; position: relative; touch-action: manipulation; }
.tab ha-icon { --mdc-icon-size: 22px; }
.tab .tl { font-size: .72rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.tab.sel { background: var(--card-background-color, var(--ha-card-background, #fff)); color: var(--primary-text-color); box-shadow: 0 2px 8px rgba(0,0,0,.12); }
.tab.sel ha-icon { color: var(--tab-color); }
.tab .badge { position: absolute; top: 3px; right: calc(50% - 22px); min-width: 17px; height: 17px; padding: 0 5px; border-radius: 9px; background: var(--tab-color); color: #fff; font-size: .66rem; font-weight: 700; display: grid; place-items: center; }

/* Panneaux */
.panel { padding: 12px 14px 14px; }
.section-h { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 4px 2px 10px; }
.section-h .st { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 1rem; }
.section-h .st ha-icon { color: var(--sec-color, var(--lrc-accent)); --mdc-icon-size: 20px; }
.stacked .panel + .panel { padding-top: 4px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
.tile { position: relative; overflow: hidden; display: flex; align-items: center; gap: 10px; min-height: 64px; padding: 10px 12px; border-radius: 18px; background: var(--lrc-tile); border: 1px solid transparent; cursor: pointer; transition: background .25s, border-color .25s, transform .15s; touch-action: pan-y; user-select: none; -webkit-user-select: none; }
.tile:hover { background: var(--lrc-tile-hover); }
.tile:active { transform: scale(.98); }
.tile .fill { position: absolute; inset: 0 auto 0 0; width: calc(var(--val, 0) * 1%); background: color-mix(in srgb, var(--tile-color) 22%, transparent); transition: width .25s ease; pointer-events: none; }
.tile.dragging .fill { transition: none; }
.tile .ic { position: relative; flex: 0 0 auto; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: color-mix(in srgb, var(--primary-text-color) 8%, transparent); color: var(--lrc-muted); transition: background .25s, color .25s, box-shadow .25s; overflow: hidden; }
.tile .ic img { width: 100%; height: 100%; object-fit: cover; }
.tile.on { border-color: color-mix(in srgb, var(--tile-color) 35%, transparent); }
.tile.on .ic { background: color-mix(in srgb, var(--tile-color) 25%, transparent); color: var(--tile-color); box-shadow: 0 0 18px color-mix(in srgb, var(--tile-color) 45%, transparent); }
.tile .tx { position: relative; min-width: 0; display: flex; flex-direction: column; }
.tile .nm { font-weight: 600; font-size: .92rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tile .stt { font-size: .8rem; color: var(--lrc-muted); white-space: nowrap; }
.tile.unavail { opacity: .45; cursor: default; }
.tile.big { flex-direction: column; align-items: flex-start; min-height: 104px; }
.btn { display: inline-grid; place-items: center; min-width: 40px; height: 40px; padding: 0 10px; border-radius: 12px; border: 1px solid var(--divider-color, rgba(127,127,127,.25)); background: var(--lrc-tile); cursor: pointer; transition: background .2s, transform .15s; touch-action: manipulation; }
.btn:hover { background: var(--lrc-tile-hover); }
.btn:active { transform: scale(.94); }
.btn ha-icon { --mdc-icon-size: 20px; }
.btn.primary { background: var(--btn-color, var(--lrc-accent)); color: #fff; border-color: transparent; }
.btn.sm { min-width: 34px; height: 34px; border-radius: 10px; }
.btn.active { background: color-mix(in srgb, var(--btn-color, var(--lrc-accent)) 22%, transparent); color: var(--btn-color, var(--lrc-accent)); border-color: color-mix(in srgb, var(--btn-color, var(--lrc-accent)) 45%, transparent); }
.btns { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.hint { font-size: .78rem; color: var(--lrc-muted); margin: 8px 2px 0; }
.empty { text-align: center; color: var(--lrc-muted); padding: 18px; font-size: .9rem; }

/* Volets */
.covers { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.cover { padding: 10px; border-radius: 18px; background: var(--lrc-tile); display: flex; flex-direction: column; gap: 8px; }
.cover .ch { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; }
.cover .ch .nm { min-width: 0; font-weight: 600; font-size: .9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cover .ch .pv { flex: 0 0 auto; white-space: nowrap; font-size: .8rem; color: var(--lrc-muted); font-variant-numeric: tabular-nums; }
.win { position: relative; height: 96px; border-radius: 12px; overflow: hidden; background: linear-gradient(180deg, var(--sky1), var(--sky2)); border: 3px solid color-mix(in srgb, var(--primary-text-color) 18%, transparent); cursor: ns-resize; touch-action: none; }
.win.noset { cursor: default; touch-action: pan-y; }
.win .sl { position: absolute; left: 0; right: 0; top: 0; height: calc(100% - var(--val, 100) * 1%); background: repeating-linear-gradient(180deg, color-mix(in srgb, var(--primary-text-color) 55%, #888) 0 6px, color-mix(in srgb, var(--primary-text-color) 40%, #666) 6px 7.5px); transition: height .5s ease; box-shadow: 0 2px 6px rgba(0,0,0,.25); }
.win.dragging .sl { transition: none; }
.win .bar { position: absolute; left: 0; right: 0; top: calc(100% - var(--val, 100) * 1%); height: 4px; margin-top: -2px; background: var(--lrc-cover); opacity: 0; transition: opacity .2s; }
.win:hover .bar, .win.dragging .bar { opacity: 1; }
.win .unk { position: absolute; inset: 0; display: grid; place-items: center; color: #fff; font-size: .78rem; font-weight: 600; text-shadow: 0 1px 2px #000; background: repeating-linear-gradient(135deg, rgba(0,0,0,.08) 0 8px, transparent 8px 16px); }
.cover .btns { flex-wrap: nowrap; gap: 4px; justify-content: space-between; }
.cover .btns .btn { flex: 1 1 0; min-width: 0; padding: 0; }
.allbar { display: flex; gap: 6px; align-items: center; }

/* Média */
.media { position: relative; border-radius: 20px; overflow: hidden; padding: 14px; background: var(--lrc-tile); isolation: isolate; }
.media .art-bg { position: absolute; inset: -30px; z-index: -1; background-size: cover; background-position: center; filter: blur(40px) saturate(1.6); opacity: .35; }
.media .top { display: flex; gap: 14px; align-items: center; }
.media .art { flex: 0 0 auto; width: 84px; height: 84px; border-radius: 14px; background: color-mix(in srgb, var(--lrc-media) 25%, transparent) center/cover no-repeat; display: grid; place-items: center; color: var(--lrc-media); box-shadow: 0 6px 18px rgba(0,0,0,.25); }
.media .art ha-icon { --mdc-icon-size: 38px; }
.media .meta { min-width: 0; flex: 1; }
.media .ttl { font-weight: 700; font-size: 1.02rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.media .art-name { color: var(--lrc-muted); font-size: .86rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.media .src { margin-top: 4px; font-size: .74rem; font-weight: 600; color: var(--lrc-media); text-transform: uppercase; letter-spacing: .5px; }
.prog { position: relative; height: 22px; margin-top: 10px; cursor: pointer; touch-action: none; }
.prog .track { position: absolute; left: 0; right: 0; top: 9px; height: 4px; border-radius: 2px; background: color-mix(in srgb, var(--primary-text-color) 15%, transparent); overflow: hidden; }
.prog .done { height: 100%; width: calc(var(--val, 0) * 1%); background: var(--lrc-media); }
.times { display: flex; justify-content: space-between; font-size: .72rem; color: var(--lrc-muted); font-variant-numeric: tabular-nums; margin-top: -4px; }
.mctrl { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 8px 0 6px; }
.mctrl .btn { border-radius: 50%; width: 44px; height: 44px; padding: 0; }
.mctrl .btn.play { width: 58px; height: 58px; background: var(--lrc-media); color: #fff; border: 0; box-shadow: 0 6px 18px color-mix(in srgb, var(--lrc-media) 45%, transparent); }
.mctrl .btn.play ha-icon { --mdc-icon-size: 30px; }
.mctrl .btn.ghost { border-color: transparent; background: none; }
.mctrl .btn.ghost.active { color: var(--lrc-media); }
.vol { display: flex; align-items: center; gap: 10px; }
.slider { position: relative; flex: 1; height: 36px; border-radius: 12px; background: color-mix(in srgb, var(--primary-text-color) 10%, transparent); overflow: hidden; cursor: pointer; touch-action: none; }
.slider .sf { position: absolute; inset: 0 auto 0 0; width: calc(var(--val, 0) * 1%); background: var(--sl-color, var(--lrc-media)); opacity: .85; transition: width .2s; }
.slider.dragging .sf { transition: none; }
.slider .sv { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: .8rem; font-weight: 700; font-variant-numeric: tabular-nums; }
.subh { font-size: .74rem; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: var(--lrc-muted); margin: 14px 2px 8px; }
.hscroll { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
.hscroll::-webkit-scrollbar { display: none; }
.tvrow { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
.tvrow .tile { flex: 1 1 140px; }

/* Climat */
.climate { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.cbox { padding: 14px 14px 40px; border-radius: 18px; background: var(--lrc-tile); position: relative; overflow: hidden; cursor: pointer; }
.cbox .lbl { font-size: .78rem; color: var(--lrc-muted); font-weight: 600; display: flex; align-items: center; gap: 4px; }
.cbox .lbl ha-icon { --mdc-icon-size: 16px; }
.cbox .big { font-size: 2rem; font-weight: 700; line-height: 1.1; margin-top: 4px; font-variant-numeric: tabular-nums; }
.cbox .big small { font-size: 1rem; font-weight: 600; color: var(--lrc-muted); }
.cbox .tag { display: inline-block; margin-top: 6px; padding: 2px 8px; border-radius: 8px; font-size: .74rem; font-weight: 700; background: color-mix(in srgb, var(--tag-color) 20%, transparent); color: var(--tag-color); }
.cbox svg.spark { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: 46px; opacity: .9; pointer-events: none; }
.cbox.wide { padding-bottom: 14px; grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 10px; cursor: default; }
.thermo { display: flex; align-items: center; gap: 8px; }
.thermo .tv { font-size: 1.5rem; font-weight: 700; min-width: 72px; text-align: center; font-variant-numeric: tabular-nums; }

.toast { position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%) translateY(20px); background: var(--primary-text-color); color: var(--card-background-color, #fff); padding: 8px 14px; border-radius: 12px; font-size: .84rem; font-weight: 600; opacity: 0; transition: opacity .25s, transform .25s; pointer-events: none; z-index: 20; max-width: 90%; text-align: center; }
.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
.warn { padding: 12px 14px; color: var(--error-color, #e53935); font-size: .88rem; }
@container lrc (max-width: 420px) { .tab .tl { display: none; } .tab { padding: 10px 4px; } .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .covers { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
`;

/* ------------------------------------------------------------------ */
/* La carte                                                             */
/* ------------------------------------------------------------------ */

class LivingroomCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement(EDITOR_TAG);
  }

  static getStubConfig(hass) {
    const areas = hass && hass.areas ? Object.values(hass.areas) : [];
    const salon = areas.find((a) => /salon|séjour|sejour|living/i.test(a.name || a.area_id)) || areas[0];
    return { name: salon ? salon.name : "Salon", area: salon ? salon.area_id : "" };
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._sigs = {};
    this._layer = 0;
    this._currentImage = null;
    this._lockUntil = 0;
    this._armed = null;
    this._history = null;
    this._failed = new Set();
    this._onPreview = (e) => this._previewImage(e.detail);
    this._bindGestures();
  }

  setConfig(config) {
    if (!config) throw new Error("Configuration invalide");
    this._raw = config;
    this._cfg = null;
    this._built = false;
    this._sigs = {};
    this._history = null;
    if (this._hass) this._build();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._raw) return;
    if (!this._built) this._build();
    else this._update();
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    window.addEventListener("lrc-preview", this._onPreview);
    if (this._hass && this._raw && !this._built) this._build();
    this._startTicker();
  }

  disconnectedCallback() {
    window.removeEventListener("lrc-preview", this._onPreview);
    clearInterval(this._ticker);
    this._ticker = null;
  }

  getCardSize() {
    return 9;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: "auto" };
  }

  /* ---------- Construction ---------- */

  _build() {
    const hass = this._hass;
    this._cfg = resolveConfig(hass, this._raw);
    const cfg = this._cfg;
    const L = cfg.layout;
    const tabs = this._availableTabs();
    if (!this._tab || !tabs.find((t) => t.id === this._tab)) this._tab = this._initialTab(tabs);
    this._wasPlaying = computeContext(hass, cfg).playing;

    const accent = L.accent_color ? `--lrc-accent-color:${esc(L.accent_color)};` : "";
    // Disposition large : image à gauche, commandes à droite, dès que la carte dépasse le seuil
    const bp = clamp(Number(L.wide_breakpoint) || 700, 400, 3000);
    const split = clamp(Number(L.wide_split) || 55, 30, 75);
    const wideCss = L.hero && L.wide !== "never" ? `
      @container lrc (min-width: ${bp}px) {
        .layout { display: grid; grid-template-columns: minmax(0, ${split}fr) minmax(0, ${100 - split}fr); align-items: start; }
        .col-a { padding-bottom: 14px; }
        .col-b { padding-top: 4px; }
        .col-b .tabs { margin-top: 14px; }
      }` : "";
    this.shadowRoot.innerHTML = `
      <style>${CARD_STYLES}${wideCss}</style>
      <ha-card class="style-${esc(L.hero_style)} mode-${esc(L.mode)} ${L.mode === "stacked" ? "stacked" : ""}" style="${accent}">
        ${L.hero_style === "ambient" ? `<div class="ambient"></div>` : ""}
        <div class="layout"><div class="col-a">
        ${L.hero ? `
        <div class="hero" style="aspect-ratio:${esc(L.aspect_ratio || "3/2")};--lrc-fade:${Number(cfg.images.transition) || 0}ms">
          <div class="illus"></div>
          <div class="layer" data-l="0"><img alt=""></div>
          <div class="layer" data-l="1"><img alt=""></div>
          <div class="overlays"></div>
          <div class="night-dim" style="opacity:0"></div>
          <div class="scrim"></div>
          <div class="hotspots"></div>
          <div class="hero-top"></div>
          <div class="hero-bottom"><div class="summary"></div></div>
        </div>` : `<div class="hero-top flat"></div>`}
        ${L.show_scenes ? `<div class="scenes"></div>` : ""}
        </div><div class="col-b">
        ${L.mode === "tabs" && tabs.length > 1 ? `<div class="tabs"></div>` : ""}
        <div class="panels"></div>
        </div></div>
        <div class="toast"></div>
      </ha-card>`;
    if (!L.hero) {
      const flat = this.shadowRoot.querySelector(".hero-top.flat");
      flat.style.cssText = "position:relative;color:var(--primary-text-color);padding:14px 14px 0;display:flex;justify-content:space-between;gap:8px;align-items:flex-start";
    }
    this._layer = 0;
    this._currentImage = null;
    this._built = true;
    this._update(true);
    this._fetchHistory();
  }

  _availableTabs() {
    const c = this._cfg;
    const has = {
      lights: c.lights.length > 0,
      covers: c.covers.length > 0,
      media: !!(c.media.player || c.media.tv || c.media.tv_power),
      devices: c.devices.length > 0,
      climate: !!(c.climate.temperature || c.climate.humidity || c.climate.climate),
    };
    return TABS.filter((t) => has[t.id]);
  }

  _initialTab(tabs) {
    const L = this._cfg.layout;
    if (L.remember_tab) {
      try {
        const saved = localStorage.getItem(`lrc-tab-${this._cfg.name}`);
        if (saved && tabs.find((t) => t.id === saved)) return saved;
      } catch (e) { /* stockage indisponible */ }
    }
    if (L.default_tab && L.default_tab !== "auto" && tabs.find((t) => t.id === L.default_tab)) return L.default_tab;
    const ctx = computeContext(this._hass, this._cfg);
    if (L.auto_media_tab && (ctx.playing || ctx.tvOn) && tabs.find((t) => t.id === "media")) return "media";
    return tabs.length ? tabs[0].id : null;
  }

  /* ---------- Mise à jour ---------- */

  _sig(ids) {
    const h = this._hass;
    return ids.filter(Boolean).map((id) => {
      const s = h.states[id];
      return s ? `${id}:${s.state}:${s.last_updated}` : `${id}:-`;
    }).join("|");
  }

  _changed(key, sig) {
    if (this._sigs[key] === sig) return false;
    this._sigs[key] = sig;
    return true;
  }

  _allEntityIds() {
    const c = this._cfg;
    const ids = [
      ...c.lights.map((x) => x.entity), ...c.covers.map((x) => x.entity), ...c.covers.map((x) => x.my_button),
      ...c.devices.map((x) => x.entity), ...c.devices.map((x) => x.power), ...c.scenes.map((x) => x.entity),
      ...c.hotspots.map((x) => x.entity), ...c.images.overlays.map((x) => x.entity),
      ...(c.images.rules || []).flatMap((r) => (r.conditions || []).map((x) => x.entity)),
      c.media.player, c.media.tv, c.media.tv_power, c.media.ambilight, ...(c.media.sound_controls || []),
      c.climate.temperature, c.climate.humidity, c.climate.climate, c.header.weather, c.header.mode, "sun.sun",
    ];
    return [...new Set(ids.filter(Boolean))];
  }

  _update(force = false) {
    if (!this._built || !this._hass) return;
    const root = this.shadowRoot;
    const cfg = this._cfg;
    const allSig = this._sig(this._allEntityIds());
    if (!force && this._sigs.all === allSig) return;
    this._sigs.all = allSig;
    if (force) this._sigs = { all: allSig };

    const scene = computeScene(this._hass, cfg);
    const ctx = scene.ctx;

    // Bascule automatique vers l'onglet média au lancement d'une lecture
    if (cfg.layout.auto_media_tab && cfg.layout.mode === "tabs" && ctx.playing && !this._wasPlaying &&
        this._availableTabs().find((t) => t.id === "media")) {
      this._tab = "media";
    }
    this._wasPlaying = ctx.playing;

    if (cfg.layout.hero) {
      this._updateHero(scene);
      const hs = root.querySelector(".hotspots");
      if (hs && this._changed("hotspots", this._sig(cfg.hotspots.map((h) => h.entity)))) hs.innerHTML = this._renderHotspots();
      const sum = root.querySelector(".summary");
      if (sum) sum.innerHTML = cfg.layout.show_summary ? this._renderSummary(ctx) : "";
    }
    const top = root.querySelector(".hero-top");
    if (top && !this._modeOpen) top.innerHTML = this._renderHeroTop(ctx);

    const sc = root.querySelector(".scenes");
    if (sc && this._changed("scenes", this._sig(cfg.scenes.map((s) => s.entity)) + ctx.lightsOn + ctx.playing)) sc.innerHTML = this._renderScenes(ctx);

    const tabsEl = root.querySelector(".tabs");
    if (tabsEl) tabsEl.innerHTML = this._renderTabs(ctx);

    this._renderPanels(ctx);
  }

  _renderPanels(ctx, force = false) {
    const root = this.shadowRoot;
    const panels = root.querySelector(".panels");
    if (!panels) return;
    if (Date.now() < this._lockUntil && !force) {
      clearTimeout(this._lockTimer);
      this._lockTimer = setTimeout(() => this._renderPanels(computeContext(this._hass, this._cfg), true), this._lockUntil - Date.now() + 30);
      return;
    }
    ctx = ctx || computeContext(this._hass, this._cfg);
    const ids = this._cfg.layout.mode === "stacked" ? this._availableTabs().map((t) => t.id) : [this._tab].filter(Boolean);
    const sig = ids.join(",") + "#" + this._sigs.all + "#" + (this._history ? this._history.t : 0);
    if (!force && this._sigs.panels === sig) return;
    this._sigs.panels = sig;
    if (!ids.length) {
      panels.innerHTML = `<div class="empty">Aucune entité configurée. Ouvrez l'éditeur visuel pour choisir une pièce ou ajouter des entités.</div>`;
      return;
    }
    panels.innerHTML = ids.map((id) => `<div class="panel" data-panel="${id}">${this._renderPanel(id, ctx)}</div>`).join("");
  }

  _renderPanel(id, ctx) {
    switch (id) {
      case "lights": return this._renderLights(ctx);
      case "covers": return this._renderCovers(ctx);
      case "media": return this._renderMedia(ctx);
      case "devices": return this._renderDevices(ctx);
      case "climate": return this._renderClimate(ctx);
      default: return "";
    }
  }

  /* ---------- Hero ---------- */

  _updateHero(scene) {
    const root = this.shadowRoot;
    const cfg = this._cfg;
    const preview = this._preview && this._preview.until > Date.now() ? this._preview : null;
    const image = preview ? preview.image : scene.image;
    const filter = preview ? preview.filter || "" : scene.filter;
    const illus = root.querySelector(".illus");

    if (!image || this._failed.has(image)) {
      if (illus && (!illus.innerHTML || this._changed("illus", this._sigs.all + image))) {
        illus.innerHTML = renderIllustration(scene.ctx, cfg) + (image
          ? `<div style="position:absolute;left:14px;top:52px;max-width:70%;color:#fff;font-size:.72rem;background:rgba(0,0,0,.55);padding:3px 8px;border-radius:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Image introuvable : ${esc(image)}</div>`
          : "");
      }
      root.querySelectorAll(".layer").forEach((l) => l.classList.remove("show"));
      this._currentImage = null;
      const amb = root.querySelector(".ambient");
      if (amb) amb.style.backgroundImage = "";
    } else {
      if (illus && illus.innerHTML) illus.innerHTML = "";
      this._showImage(image, filter);
    }

    // Calques superposés (lueur de lampe, écran TV…)
    const ov = root.querySelector(".overlays");
    if (ov) {
      const items = (cfg.images.overlays || []).filter((o) => o.image);
      if (ov.children.length !== items.length) {
        ov.innerHTML = items.map((o) => `<img class="overlay" alt="" src="${esc(o.image)}" style="mix-blend-mode:${esc(o.blend || "screen")};opacity:0">`).join("");
      }
      items.forEach((o, i) => {
        const s = this._hass.states[o.entity];
        let op = 0;
        if (s && isActiveState(s)) {
          op = o.opacity !== undefined && o.opacity !== "" ? Number(o.opacity) : 1;
          if (o.use_brightness && s.attributes.brightness !== undefined) op *= 0.25 + 0.75 * (s.attributes.brightness / 255);
        }
        if (ov.children[i]) ov.children[i].style.opacity = String(op);
      });
    }

    const dim = root.querySelector(".night-dim");
    if (dim) {
      const d = Number(cfg.images.night_dim) || 0;
      dim.style.opacity = scene.ctx.night && scene.ctx.lightsOn === 0 && !scene.ctx.tvOn ? String(d / 100) : "0";
    }
  }

  _showImage(src, filter) {
    const root = this.shadowRoot;
    const key = src + "|" + filter;
    if (this._currentImage === key) return;
    this._currentImage = key;
    const layers = root.querySelectorAll(".layer");
    if (layers.length < 2) return;
    const next = layers[1 - this._layer];
    const cur = layers[this._layer];
    const img = next.querySelector("img");
    const pos = this._cfg.images.position || "center";
    const swap = () => {
      if (this._currentImage !== key) return;
      img.style.objectPosition = pos;
      img.style.filter = filter || "";
      next.classList.add("show");
      cur.classList.remove("show");
      this._layer = 1 - this._layer;
      const amb = root.querySelector(".ambient");
      if (amb) amb.style.backgroundImage = `url("${src.replace(/"/g, "%22")}")`;
    };
    img.onload = swap;
    img.onerror = () => {
      if (this._currentImage !== key) return;
      this._failed.add(src);
      this._currentImage = null;
      this._sigs.illus = null;
      this._updateHero(computeScene(this._hass, this._cfg));
    };
    if (img.getAttribute("src") === src && img.complete && img.naturalWidth) swap();
    else img.src = src;
  }

  _previewImage(detail) {
    if (!detail || !this._built) return;
    this._preview = { image: detail.image || this._cfg.images.default, filter: detail.filter || "", until: Date.now() + (detail.duration || 6000) };
    this._updateHero(computeScene(this._hass, this._cfg));
    clearTimeout(this._previewTimer);
    this._previewTimer = setTimeout(() => {
      this._preview = null;
      this._updateHero(computeScene(this._hass, this._cfg));
    }, (detail.duration || 6000) + 50);
  }

  _renderHeroTop(ctx) {
    const cfg = this._cfg;
    const h = this._hass;
    const chips = [];
    if (cfg.header.show_temperature && cfg.climate.temperature && h.states[cfg.climate.temperature]) {
      const t = h.states[cfg.climate.temperature];
      chips.push(`<span class="hchip" data-g data-tap="more-info" data-entity="${esc(cfg.climate.temperature)}"><ha-icon icon="mdi:home-thermometer-outline"></ha-icon>${fmtNum(t.state)}°</span>`);
    }
    if (cfg.header.show_temperature && cfg.climate.humidity && h.states[cfg.climate.humidity]) {
      chips.push(`<span class="hchip" data-g data-tap="more-info" data-entity="${esc(cfg.climate.humidity)}"><ha-icon icon="mdi:water-percent"></ha-icon>${fmtNum(h.states[cfg.climate.humidity].state, 0)}%</span>`);
    }
    if (cfg.header.weather && h.states[cfg.header.weather]) {
      const w = h.states[cfg.header.weather];
      const icon = WEATHER_ICONS[w.state] || "mdi:weather-partly-cloudy";
      chips.push(`<span class="hchip" data-g data-tap="more-info" data-entity="${esc(cfg.header.weather)}"><ha-icon icon="${icon}"></ha-icon>${fmtNum(w.attributes.temperature)}°</span>`);
    }
    if (cfg.header.mode && h.states[cfg.header.mode]) {
      const m = h.states[cfg.header.mode];
      const opts = m.attributes.options || [];
      chips.push(`<span class="hchip" data-g data-tap="mode-menu" data-hold="more-info" data-entity="${esc(cfg.header.mode)}"><ha-icon icon="mdi:home-account"></ha-icon>${esc(m.state)}<ha-icon icon="mdi:chevron-down"></ha-icon></span>`);
      if (this._modeOpen) {
        chips.push(`<div class="menu">${opts.map((o) => `<button class="${o === m.state ? "sel" : ""}" data-g data-tap="select-mode" data-value="${esc(o)}" data-entity="${esc(cfg.header.mode)}">${esc(o)}</button>`).join("")}</div>`);
      }
    }
    return `
      <div class="title" data-g data-tap="none"><ha-icon icon="${esc(cfg.icon)}"></ha-icon><span class="name">${esc(cfg.name)}</span></div>
      <div class="hchips">${chips.join("")}</div>`;
  }

  _renderSummary(ctx) {
    const parts = [];
    if (ctx.lightCount) {
      parts.push(ctx.lightsOn
        ? `<span><ha-icon icon="mdi:lightbulb-on"></ha-icon>${ctx.lightsOn} allumée${ctx.lightsOn > 1 ? "s" : ""}</span>`
        : `<span><ha-icon icon="mdi:lightbulb-off-outline"></ha-icon>Lumières éteintes</span>`);
    }
    if (ctx.coverAvg !== null) {
      const txt = ctx.coverAvg >= 95 ? "Volets ouverts" : ctx.coverAvg <= 5 ? "Volets fermés" : `Volets à ${ctx.coverAvg} %`;
      parts.push(`<span><ha-icon icon="mdi:window-shutter${ctx.coverAvg >= 95 ? "-open" : ""}"></ha-icon>${txt}</span>`);
    }
    if (ctx.playing && ctx.player) {
      const a = ctx.player.attributes;
      parts.push(`<span><ha-icon icon="mdi:play-circle"></ha-icon>${esc(a.media_title || a.source || "Lecture")}${a.media_artist ? " · " + esc(String(a.media_artist).split(",")[0]) : ""}</span>`);
    }
    if (ctx.tvOn) parts.push(`<span><ha-icon icon="mdi:television"></ha-icon>TV allumée</span>`);
    const devOn = this._cfg.devices.filter((d) => isActiveState(this._hass.states[d.entity])).length;
    if (devOn) parts.push(`<span><ha-icon icon="mdi:power-plug"></ha-icon>${devOn} appareil${devOn > 1 ? "s" : ""}</span>`);
    return parts.join("");
  }

  _renderHotspots() {
    const h = this._hass;
    const holdAttr = this._cfg.behavior.hold === "more-info" ? `data-hold="more-info"` : "";
    return this._cfg.hotspots.map((hs) => {
      const s = h.states[hs.entity];
      if (!s && !hs.entity) return "";
      const d = domainOf(hs.entity);
      const on = isActiveState(s);
      const icon = hs.icon || (s && s.attributes.icon) || (DOMAIN_ICONS[d] || ["mdi:circle"])[on ? 1 : 0];
      const color = hs.color || (d === "light" ? "var(--lrc-light)" : d === "cover" ? "var(--lrc-cover)" : d === "media_player" ? "var(--lrc-media)" : "var(--lrc-device)");
      const name = hs.name || (s ? s.attributes.friendly_name : hs.entity);
      const tap = hs.tap_action || (d === "cover" || d === "media_player" || d === "sensor" || d === "climate" ? "more-info" : "toggle");
      const unav = !s || s.state === "unavailable";
      return `<button class="hs ${on ? "on" : ""} ${unav ? "unavail" : ""}" style="left:${Number(hs.x) || 50}%;top:${Number(hs.y) || 50}%;--hs-color:${esc(color)}"
        data-g data-tap="${esc(tap)}" ${holdAttr} data-entity="${esc(hs.entity)}" title="${esc(name)}">
        <span class="dot"><ha-icon icon="${esc(icon)}"></ha-icon></span>${hs.show_name ? `<span class="lbl">${esc(name)}</span>` : ""}</button>`;
    }).join("");
  }

  /* ---------- Scènes ---------- */

  _renderScenes(ctx) {
    const cfg = this._cfg;
    const h = this._hass;
    const out = [];
    if (cfg.layout.show_all_off) {
      out.push(`<button class="chip danger" data-g data-tap="all-off" ${cfg.behavior.confirm_all_off ? `data-confirm="Toucher encore pour tout éteindre"` : ""} data-key="all-off"><ha-icon icon="mdi:power"></ha-icon>Tout éteindre</button>`);
    }
    for (const sc of cfg.scenes) {
      const s = h.states[sc.entity];
      if (!s && cfg.layout.hide_unavailable) continue;
      const d = domainOf(sc.entity);
      const icon = sc.icon || (s && s.attributes.icon && !String(s.attributes.icon).startsWith("fas:") ? s.attributes.icon : (DOMAIN_ICONS[d] || ["mdi:play"])[0]);
      const name = sc.name || (s ? s.attributes.friendly_name : sc.entity);
      const running = d === "script" && s && s.state === "on";
      out.push(`<button class="chip ${running ? "on" : ""}" style="${sc.color ? `--chip-color:${esc(sc.color)}` : ""}" data-g data-tap="activate" data-hold="more-info" data-entity="${esc(sc.entity)}" ${sc.confirm ? `data-confirm="Confirmer « ${esc(name)} » ?"` : ""} data-key="sc-${esc(sc.entity)}"><ha-icon icon="${esc(icon)}"></ha-icon>${esc(name)}</button>`);
    }
    return out.join("");
  }

  /* ---------- Onglets ---------- */

  _renderTabs(ctx) {
    const h = this._hass;
    const c = this._cfg;
    const colors = { lights: "var(--lrc-light)", covers: "var(--lrc-cover)", media: "var(--lrc-media)", devices: "var(--lrc-device)", climate: "var(--lrc-climate)" };
    return this._availableTabs().map((t) => {
      let badge = "";
      if (t.id === "lights" && ctx.lightsOn) badge = ctx.lightsOn;
      if (t.id === "devices") { const n = c.devices.filter((d) => isActiveState(h.states[d.entity])).length; if (n) badge = n; }
      if (t.id === "media" && (ctx.playing || ctx.tvOn)) badge = "▶";
      let label = t.label;
      if (t.id === "covers" && ctx.coverAvg !== null) label = `${ctx.coverAvg} %`;
      if (t.id === "climate" && c.climate.temperature && h.states[c.climate.temperature]) label = `${fmtNum(h.states[c.climate.temperature].state)}°`;
      return `<button class="tab ${t.id === this._tab ? "sel" : ""}" style="--tab-color:${colors[t.id]}" data-g data-tap="tab" data-tab="${t.id}" title="${esc(t.label)}">
        <ha-icon icon="${t.icon}"></ha-icon><span class="tl">${esc(label)}</span>${badge !== "" ? `<span class="badge">${badge}</span>` : ""}</button>`;
    }).join("");
  }

  _sectionHeader(id, extra = "") {
    if (this._cfg.layout.mode !== "stacked") return extra ? `<div class="section-h"><span></span>${extra}</div>` : "";
    const t = TABS.find((x) => x.id === id);
    const colors = { lights: "var(--lrc-light)", covers: "var(--lrc-cover)", media: "var(--lrc-media)", devices: "var(--lrc-device)", climate: "var(--lrc-climate)" };
    return `<div class="section-h" style="--sec-color:${colors[id]}"><span class="st"><ha-icon icon="${t.icon}"></ha-icon>${t.label}</span>${extra}</div>`;
  }

  _visible(list) {
    const h = this._hass;
    return list.filter((it) => !(this._cfg.layout.hide_unavailable && (!h.states[it.entity] || h.states[it.entity].state === "unavailable")));
  }

  /* ---------- Lumières ---------- */

  _renderLights(ctx) {
    const h = this._hass;
    const B = this._cfg.behavior;
    const items = this._visible(this._cfg.lights);
    const anyOn = ctx.lightsOn > 0;
    const header = this._sectionHeader("lights", items.length > 1
      ? `<button class="btn sm ${anyOn ? "active" : ""}" style="--btn-color:var(--lrc-light)" data-g data-tap="lights-all" data-value="${anyOn ? "off" : "on"}" title="${anyOn ? "Tout éteindre" : "Tout allumer"}"><ha-icon icon="${anyOn ? "mdi:lightbulb-group-off" : "mdi:lightbulb-group"}"></ha-icon></button>`
      : "");
    const tiles = items.map((l) => {
      const s = h.states[l.entity];
      const d = domainOf(l.entity);
      const on = s && s.state === "on";
      const unav = !s || s.state === "unavailable";
      const dimmable = s && d === "light" && (s.attributes.supported_color_modes || []).some((m) => m !== "onoff");
      const pct = on ? (s.attributes.brightness !== undefined ? Math.round((s.attributes.brightness / 255) * 100) : 100) : 0;
      const name = l.name || (s ? s.attributes.friendly_name : l.entity);
      const icon = l.icon || (s && s.attributes.icon) || DOMAIN_ICONS.light[on ? 1 : 0];
      const img = on ? l.image_on || l.image : l.image;
      const state = unav ? "Indisponible" : on ? (dimmable ? `${pct} %` : "Allumée") : "Éteinte";
      const tap = B.light_tap === "more-info" ? "more-info" : "toggle";
      return `<div class="tile ${on ? "on" : ""} ${unav ? "unavail" : ""}" style="--tile-color:${esc(l.color || "var(--lrc-light)")};--val:${dimmable ? pct : on ? 100 : 0}"
          data-g data-tap="${unav ? "more-info" : tap}" ${B.hold === "more-info" ? `data-hold="more-info"` : ""} ${dimmable && !unav ? `data-drag="brightness" data-axis="x"` : ""} data-entity="${esc(l.entity)}">
        <div class="fill"></div>
        <div class="ic">${img ? `<img src="${esc(img)}" alt="">` : `<ha-icon icon="${esc(icon)}"></ha-icon>`}</div>
        <div class="tx"><span class="nm">${esc(name)}</span><span class="stt" data-val>${state}</span></div>
      </div>`;
    }).join("");
    const dimHint = items.some((l) => domainOf(l.entity) === "light") ? `<div class="hint">Astuce : glissez horizontalement sur une lampe pour régler la luminosité, appui long pour plus d'options.</div>` : "";
    return header + `<div class="grid">${tiles}</div>` + (this._cfg.layout.mode === "tabs" ? dimHint : "");
  }

  /* ---------- Volets ---------- */

  _renderCovers(ctx) {
    const h = this._hass;
    const items = this._visible(this._cfg.covers);
    const [s1, s2] = skyColors(ctx.elevation);
    const hasMy = items.some((c) => c.my_button);
    const allBtns = items.length > 1 ? `<div class="allbar">
        <button class="btn sm" data-g data-tap="covers-all" data-value="open" title="Tout ouvrir"><ha-icon icon="mdi:arrow-up"></ha-icon></button>
        <button class="btn sm" data-g data-tap="covers-all" data-value="stop" title="Tout arrêter"><ha-icon icon="mdi:stop"></ha-icon></button>
        <button class="btn sm" data-g data-tap="covers-all" data-value="close" title="Tout fermer"><ha-icon icon="mdi:arrow-down"></ha-icon></button>
        ${hasMy ? `<button class="btn sm" data-g data-tap="covers-all" data-value="my" title="Position favorite (My)"><ha-icon icon="mdi:star-outline"></ha-icon></button>` : ""}
      </div>` : "";
    const header = this._sectionHeader("covers", allBtns);
    const cards = items.map((c) => {
      const s = h.states[c.entity];
      const name = c.name || (s ? s.attributes.friendly_name : c.entity);
      const unav = !s || s.state === "unavailable";
      const hasPos = s && s.attributes.current_position !== undefined;
      const canSet = s && ((s.attributes.supported_features || 0) & 4) === 4 && hasPos;
      const pos = hasPos ? Number(s.attributes.current_position) : s && s.state === "open" ? 100 : s && s.state === "closed" ? 0 : null;
      const moving = s && (s.state === "opening" || s.state === "closing");
      const label = unav ? "Indisponible" : moving ? (s.state === "opening" ? "Ouverture…" : "Fermeture…") : pos === null ? "Inconnu" : pos >= 100 ? "Ouvert" : pos <= 0 ? "Fermé" : `${pos} %`;
      return `<div class="cover ${unav ? "unavail" : ""}">
        <div class="ch"><span class="nm">${esc(name)}</span><span class="pv" data-val>${label}</span></div>
        <div class="win ${canSet ? "" : "noset"}" style="--sky1:${s1};--sky2:${s2};--val:${pos === null ? 50 : pos}"
          data-g ${canSet ? `data-drag="position" data-axis="y"` : ""} data-tap="more-info" data-entity="${esc(c.entity)}">
          <div class="sl"></div><div class="bar"></div>${pos === null && !unav ? `<div class="unk">Position non remontée</div>` : ""}
        </div>
        <div class="btns">
          <button class="btn sm" data-g data-tap="call" data-svc="cover.open_cover" data-entity="${esc(c.entity)}" title="Ouvrir"><ha-icon icon="mdi:arrow-up"></ha-icon></button>
          <button class="btn sm" data-g data-tap="call" data-svc="cover.stop_cover" data-entity="${esc(c.entity)}" title="Stop"><ha-icon icon="mdi:stop"></ha-icon></button>
          ${c.my_button ? `<button class="btn sm" data-g data-tap="call" data-svc="button.press" data-entity="${esc(c.my_button)}" title="Position favorite (My)"><ha-icon icon="mdi:star-outline"></ha-icon></button>` : ""}
          <button class="btn sm" data-g data-tap="call" data-svc="cover.close_cover" data-entity="${esc(c.entity)}" title="Fermer"><ha-icon icon="mdi:arrow-down"></ha-icon></button>
        </div>
      </div>`;
    }).join("");
    const hint = this._cfg.layout.mode === "tabs" && items.some((c) => { const s = h.states[c.entity]; return s && s.attributes.current_position !== undefined; })
      ? `<div class="hint">Astuce : faites glisser verticalement dans la fenêtre pour régler précisément la position.</div>` : "";
    return header + `<div class="covers">${cards}</div>` + hint;
  }

  /* ---------- Média ---------- */

  _mediaPosition(s) {
    const a = s.attributes;
    if (a.media_position === undefined) return 0;
    let p = Number(a.media_position);
    if (s.state === "playing" && a.media_position_updated_at) p += (Date.now() - new Date(a.media_position_updated_at).getTime()) / 1000;
    return a.media_duration ? Math.min(p, a.media_duration) : p;
  }

  _renderMedia(ctx) {
    const h = this._hass;
    const m = this._cfg.media;
    let html = this._sectionHeader("media");
    const p = h.states[m.player];
    if (p) {
      const a = p.attributes;
      const playing = p.state === "playing";
      const unav = p.state === "unavailable";
      const pic = a.entity_picture_local || a.entity_picture || "";
      const vol = a.volume_level !== undefined ? Math.round(a.volume_level * 100) : 0;
      const dur = Number(a.media_duration) || 0;
      const pos = this._mediaPosition(p);
      const title = a.media_title || (p.state === "off" || p.state === "idle" ? "Rien en lecture" : a.source || a.friendly_name);
      const artist = a.media_artist || a.media_album_name || a.friendly_name || "";
      html += `<div class="media">
        ${pic ? `<div class="art-bg" style="background-image:url('${esc(pic)}')"></div>` : ""}
        <div class="top">
          <div class="art" style="${pic ? `background-image:url('${esc(pic)}')` : ""}" data-g data-tap="more-info" data-entity="${esc(m.player)}">${pic ? "" : `<ha-icon icon="mdi:music"></ha-icon>`}</div>
          <div class="meta">
            <div class="ttl">${esc(title)}</div>
            <div class="art-name">${esc(artist)}</div>
            <div class="src">${esc(a.friendly_name || "")}${a.source ? " · " + esc(a.source) : ""}${unav ? " · indisponible" : ""}</div>
          </div>
        </div>
        ${dur ? `<div class="prog" data-g data-drag="seek" data-axis="x" data-entity="${esc(m.player)}" style="--val:${(pos / dur) * 100}" data-dur="${dur}">
            <div class="track"><div class="done"></div></div></div>
          <div class="times"><span data-pos>${formatTime(pos)}</span><span>${formatTime(dur)}</span></div>` : ""}
        <div class="mctrl">
          <button class="btn ghost ${a.shuffle ? "active" : ""}" data-g data-tap="shuffle" data-entity="${esc(m.player)}" title="Aléatoire"><ha-icon icon="mdi:shuffle-variant"></ha-icon></button>
          <button class="btn" data-g data-tap="call" data-svc="media_player.media_previous_track" data-entity="${esc(m.player)}" title="Précédent"><ha-icon icon="mdi:skip-previous"></ha-icon></button>
          <button class="btn play" data-g data-tap="call" data-svc="media_player.media_play_pause" data-entity="${esc(m.player)}" title="Lecture / pause"><ha-icon icon="${playing ? "mdi:pause" : "mdi:play"}"></ha-icon></button>
          <button class="btn" data-g data-tap="call" data-svc="media_player.media_next_track" data-entity="${esc(m.player)}" title="Suivant"><ha-icon icon="mdi:skip-next"></ha-icon></button>
          <button class="btn ghost ${a.repeat && a.repeat !== "off" ? "active" : ""}" data-g data-tap="repeat" data-entity="${esc(m.player)}" title="Répéter"><ha-icon icon="${a.repeat === "one" ? "mdi:repeat-once" : a.repeat === "all" ? "mdi:repeat" : "mdi:repeat-off"}"></ha-icon></button>
        </div>
        <div class="vol">
          <button class="btn sm" data-g data-tap="mute" data-entity="${esc(m.player)}" title="Muet"><ha-icon icon="${a.is_volume_muted ? "mdi:volume-off" : vol < 30 ? "mdi:volume-low" : vol < 70 ? "mdi:volume-medium" : "mdi:volume-high"}"></ha-icon></button>
          <div class="slider" style="--val:${vol}" data-g data-drag="volume" data-axis="x" data-entity="${esc(m.player)}"><div class="sf"></div><span class="sv" data-val>${vol} %</span></div>
          <button class="btn sm" data-g data-tap="call" data-svc="media_player.volume_down" data-entity="${esc(m.player)}" title="Volume -"><ha-icon icon="mdi:minus"></ha-icon></button>
          <button class="btn sm" data-g data-tap="call" data-svc="media_player.volume_up" data-entity="${esc(m.player)}" title="Volume +"><ha-icon icon="mdi:plus"></ha-icon></button>
        </div>`;
      const sources = (m.sources && m.sources.length ? m.sources : a.source_list || []).filter(Boolean);
      if (m.show_sources && sources.length) {
        html += `<div class="subh">Favoris & sources</div><div class="hscroll">${sources.map((src) =>
          `<button class="chip ${src === a.source ? "on" : ""}" style="--chip-color:var(--lrc-media)" data-g data-tap="source" data-value="${esc(src)}" data-entity="${esc(m.player)}"><ha-icon icon="${src === "TV" ? "mdi:television" : /fm|radio|europe|bbc|inter|rtl/i.test(src) ? "mdi:radio" : "mdi:playlist-music"}"></ha-icon>${esc(src)}</button>`).join("")}</div>`;
      }
      const sc = (m.sound_controls || []).filter((id) => h.states[id]);
      if (sc.length) {
        html += `<div class="subh">Réglages du son</div><div class="hscroll">${sc.map((id) => {
          const s = h.states[id];
          const on = s.state === "on";
          const nm = String(s.attributes.friendly_name || id).replace(new RegExp("^" + (a.friendly_name || "") + "\\s*", "i"), "");
          const icon = /nuit|night/i.test(id) ? "mdi:weather-night" : /dialog/i.test(id) ? "mdi:account-voice" : /caisson|sub/i.test(id) ? "mdi:speaker" : /loud/i.test(id) ? "mdi:equalizer" : /surround/i.test(id) ? "mdi:surround-sound" : "mdi:tune";
          return `<button class="chip ${on ? "on" : ""}" style="--chip-color:var(--lrc-media)" data-g data-tap="toggle" data-hold="more-info" data-entity="${esc(id)}"><ha-icon icon="${icon}"></ha-icon>${esc(nm)}</button>`;
        }).join("")}</div>`;
      }
      html += `</div>`;
    }

    // Rangée TV
    const tvTiles = [];
    if (m.tv || m.tv_power) {
      const tvName = (h.states[m.tv] && h.states[m.tv].attributes.friendly_name) || "TV";
      tvTiles.push(`<div class="tile ${ctx.tvOn ? "on" : ""}" style="--tile-color:var(--lrc-media)" data-g data-tap="tv-power" data-hold="more-info" data-entity="${esc(m.tv || m.tv_power)}">
        <div class="ic"><ha-icon icon="mdi:television${ctx.tvOn ? "" : "-off"}"></ha-icon></div>
        <div class="tx"><span class="nm">${esc(m.tv_name || tvName)}</span><span class="stt">${ctx.tvOn ? "Allumée" : "Éteinte"}</span></div></div>`);
    }
    if (m.ambilight && h.states[m.ambilight]) {
      const s = h.states[m.ambilight];
      const on = s.state === "on";
      tvTiles.push(`<div class="tile ${on ? "on" : ""} ${s.state === "unavailable" ? "unavail" : ""}" style="--tile-color:#7f5cff" data-g data-tap="toggle" data-hold="more-info" data-entity="${esc(m.ambilight)}">
        <div class="ic"><ha-icon icon="mdi:television-ambient-light"></ha-icon></div>
        <div class="tx"><span class="nm">Ambilight</span><span class="stt">${s.state === "unavailable" ? "Indisponible" : on ? "Allumé" : "Éteint"}</span></div></div>`);
    }
    if (p && (p.attributes.source_list || []).includes("TV")) {
      tvTiles.push(`<div class="tile ${p.attributes.source === "TV" ? "on" : ""}" style="--tile-color:var(--lrc-media)" data-g data-tap="source" data-value="TV" data-entity="${esc(m.player)}">
        <div class="ic"><ha-icon icon="mdi:surround-sound"></ha-icon></div>
        <div class="tx"><span class="nm">Son de la TV</span><span class="stt">${p.attributes.source === "TV" ? "Actif" : "Basculer"}</span></div></div>`);
    }
    if (tvTiles.length) html += `<div class="tvrow">${tvTiles.join("")}</div>`;
    const tv = h.states[m.tv];
    if (tv && ctx.tvOn && (tv.attributes.source_list || []).length) {
      html += `<div class="subh">Sources TV</div><div class="hscroll">${tv.attributes.source_list.map((src) =>
        `<button class="chip ${src === tv.attributes.source ? "on" : ""}" style="--chip-color:var(--lrc-media)" data-g data-tap="source" data-value="${esc(src)}" data-entity="${esc(m.tv)}"><ha-icon icon="mdi:import"></ha-icon>${esc(src)}</button>`).join("")}</div>`;
    }
    return html || `<div class="empty">Aucun lecteur configuré.</div>`;
  }

  /* ---------- Appareils ---------- */

  _renderDevices() {
    const h = this._hass;
    const B = this._cfg.behavior;
    const items = this._visible(this._cfg.devices);
    const tiles = items.map((dv) => {
      const s = h.states[dv.entity];
      const d = domainOf(dv.entity);
      const on = isActiveState(s);
      const unav = !s || s.state === "unavailable";
      const name = dv.name || (s ? s.attributes.friendly_name : dv.entity);
      const icon = dv.icon || (s && s.attributes.icon) || (DOMAIN_ICONS[d] || ["mdi:power"])[on ? 1 : 0];
      const img = on ? dv.image_on || dv.image : dv.image;
      const pw = dv.power && h.states[dv.power] ? ` · ${fmtNum(h.states[dv.power].state, 0)} ${esc(h.states[dv.power].attributes.unit_of_measurement || "W")}` : "";
      const stt = unav ? "Indisponible" : (on ? "Allumé" : "Éteint") + pw;
      const confirm = dv.confirm_off && on ? `data-confirm="Toucher encore pour éteindre"` : "";
      const tap = d === "button" || d === "input_button" ? "activate" : unav ? "more-info" : "toggle";
      return `<div class="tile big ${on ? "on" : ""} ${unav ? "unavail" : ""}" style="--tile-color:${esc(dv.color || "var(--lrc-device)")}"
          data-g data-tap="${tap}" ${B.hold === "more-info" ? `data-hold="more-info"` : ""} ${confirm} data-key="dv-${esc(dv.entity)}" data-entity="${esc(dv.entity)}">
        <div class="ic">${img ? `<img src="${esc(img)}" alt="">` : `<ha-icon icon="${esc(icon)}"></ha-icon>`}</div>
        <div class="tx"><span class="nm">${esc(name)}</span><span class="stt">${stt}</span></div>
      </div>`;
    }).join("");
    return this._sectionHeader("devices") + `<div class="grid">${tiles}</div>`;
  }

  /* ---------- Climat ---------- */

  _spark(points, color, min, max) {
    if (!points || points.length < 2) return "";
    const t0 = points[0][0];
    const t1 = points[points.length - 1][0];
    const lo = Math.min(min ?? Infinity, ...points.map((p) => p[1]));
    const hi = Math.max(max ?? -Infinity, ...points.map((p) => p[1]));
    const span = hi - lo || 1;
    const xy = points.map(([t, v]) => [((t - t0) / (t1 - t0 || 1)) * 100, 44 - ((v - lo) / span) * 36]);
    const line = xy.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
    return `<svg class="spark" viewBox="0 0 100 46" preserveAspectRatio="none">
      <path d="${line} L100,46 L0,46 Z" fill="${color}" opacity=".16"/>
      <path d="${line}" fill="none" stroke="${color}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
  }

  _trend(points) {
    if (!points || points.length < 2) return "";
    const last = points[points.length - 1];
    const ref = points.find((p) => p[0] >= last[0] - 3600 * 1000) || points[0];
    const delta = last[1] - ref[1];
    if (delta > 0.2) return `<ha-icon icon="mdi:trending-up" title="+${fmtNum(delta)} en 1 h"></ha-icon>`;
    if (delta < -0.2) return `<ha-icon icon="mdi:trending-down" title="${fmtNum(delta)} en 1 h"></ha-icon>`;
    return `<ha-icon icon="mdi:trending-neutral" title="Stable"></ha-icon>`;
  }

  _renderClimate() {
    const h = this._hass;
    const c = this._cfg.climate;
    const hist = (this._history && this._history.data) || {};
    const boxes = [];
    const t = h.states[c.temperature];
    if (t) {
      const v = parseFloat(t.state);
      const min = Number(c.comfort_min);
      const max = Number(c.comfort_max);
      const [tag, color] = isNaN(v) ? ["—", "var(--lrc-muted)"] : v < min ? ["Frais", "#4fa3ff"] : v > max ? ["Chaud", "#ff7043"] : ["Confortable", "#3ecf8e"];
      boxes.push(`<div class="cbox" data-g data-tap="more-info" data-entity="${esc(c.temperature)}">
        <div class="lbl"><ha-icon icon="mdi:thermometer"></ha-icon>Température ${this._trend(hist[c.temperature])}</div>
        <div class="big">${fmtNum(t.state)}<small>${esc(t.attributes.unit_of_measurement || "°C")}</small></div>
        <span class="tag" style="--tag-color:${color}">${tag}</span>
        ${c.graph ? this._spark(hist[c.temperature], "var(--lrc-climate)") : ""}</div>`);
    }
    const hu = h.states[c.humidity];
    if (hu) {
      const v = parseFloat(hu.state);
      const [tag, color] = isNaN(v) ? ["—", "var(--lrc-muted)"] : v < 40 ? ["Sec", "#ffb74d"] : v > 60 ? ["Humide", "#4fa3ff"] : ["Idéal", "#3ecf8e"];
      boxes.push(`<div class="cbox" data-g data-tap="more-info" data-entity="${esc(c.humidity)}">
        <div class="lbl"><ha-icon icon="mdi:water-percent"></ha-icon>Humidité ${this._trend(hist[c.humidity])}</div>
        <div class="big">${fmtNum(hu.state, 0)}<small>%</small></div>
        <span class="tag" style="--tag-color:${color}">${tag}</span>
        ${c.graph ? this._spark(hist[c.humidity], "#4fa3ff", 0, 100) : ""}</div>`);
    }
    const w = h.states[this._cfg.header.weather];
    if (w) {
      boxes.push(`<div class="cbox wide" data-g data-tap="more-info" data-entity="${esc(this._cfg.header.weather)}" style="cursor:pointer">
        <div><div class="lbl"><ha-icon icon="mdi:home-export-outline"></ha-icon>Extérieur</div>
        <div class="big" style="font-size:1.5rem">${fmtNum(w.attributes.temperature)}<small>°</small></div></div>
        <ha-icon icon="${WEATHER_ICONS[w.state] || "mdi:weather-partly-cloudy"}" style="--mdc-icon-size:44px;color:var(--lrc-climate)"></ha-icon>
        ${t && !isNaN(parseFloat(t.state)) && w.attributes.temperature !== undefined ? `<div class="lbl">Écart ${fmtNum(parseFloat(t.state) - w.attributes.temperature)}°</div>` : ""}</div>`);
    }
    const cl = h.states[c.climate];
    if (cl) {
      const target = cl.attributes.temperature;
      const step = cl.attributes.target_temp_step || 0.5;
      boxes.push(`<div class="cbox wide">
        <div><div class="lbl"><ha-icon icon="mdi:thermostat"></ha-icon>${esc(cl.attributes.friendly_name || "Chauffage")}</div>
        <div class="btns" style="margin-top:6px">${(cl.attributes.hvac_modes || []).map((md) =>
          `<button class="btn sm ${cl.state === md ? "active" : ""}" style="--btn-color:var(--lrc-climate)" data-g data-tap="hvac" data-value="${esc(md)}" data-entity="${esc(c.climate)}" title="${esc(md)}"><ha-icon icon="${{ off: "mdi:power", heat: "mdi:fire", cool: "mdi:snowflake", auto: "mdi:thermostat-auto", heat_cool: "mdi:sun-snowflake-variant", dry: "mdi:water-off", fan_only: "mdi:fan" }[md] || "mdi:thermostat"}"></ha-icon></button>`).join("")}</div></div>
        ${target !== undefined && target !== null ? `<div class="thermo">
          <button class="btn" data-g data-tap="temp-step" data-value="${-step}" data-entity="${esc(c.climate)}"><ha-icon icon="mdi:minus"></ha-icon></button>
          <span class="tv" data-val>${fmtNum(target)}°</span>
          <button class="btn" data-g data-tap="temp-step" data-value="${step}" data-entity="${esc(c.climate)}"><ha-icon icon="mdi:plus"></ha-icon></button></div>` : ""}
      </div>`);
    }
    return this._sectionHeader("climate") + (boxes.length ? `<div class="climate">${boxes.join("")}</div>` : `<div class="empty">Aucun capteur configuré.</div>`);
  }

  async _fetchHistory() {
    const c = this._cfg.climate;
    const ids = [c.temperature, c.humidity].filter((id) => id && this._hass.states[id]);
    if (!ids.length || !this._hass.callWS) return;
    if (this._history && Date.now() - this._history.t < 10 * 60 * 1000) return;
    this._history = { t: Date.now(), data: (this._history && this._history.data) || {} };
    try {
      const start = new Date(Date.now() - (Number(c.hours) || 24) * 3600 * 1000).toISOString();
      const res = await this._hass.callWS({
        type: "history/history_during_period", start_time: start, entity_ids: ids,
        minimal_response: true, no_attributes: true, significant_changes_only: false,
      });
      const data = {};
      for (const id of ids) {
        data[id] = (res[id] || []).map((p) => [
          p.lu !== undefined ? p.lu * 1000 : new Date(p.last_updated || p.last_changed).getTime(),
          parseFloat(p.s !== undefined ? p.s : p.state),
        ]).filter((p) => !isNaN(p[1]));
        const cur = parseFloat(this._hass.states[id].state);
        if (!isNaN(cur)) data[id].push([Date.now(), cur]);
      }
      this._history = { t: Date.now(), data };
      this._sigs.panels = null;
      this._renderPanels();
    } catch (e) {
      /* historique indisponible : on affiche la carte sans graphique */
    }
  }

  _startTicker() {
    if (this._ticker) return;
    this._ticker = setInterval(() => {
      if (!this._built || !this._hass) return;
      const p = this._hass.states[this._cfg.media.player];
      if (p && p.state === "playing") {
        const prog = this.shadowRoot.querySelector(".prog:not(.dragging)");
        if (prog) {
          const dur = Number(prog.dataset.dur) || 1;
          const pos = this._mediaPosition(p);
          prog.style.setProperty("--val", String((pos / dur) * 100));
          const lbl = this.shadowRoot.querySelector("[data-pos]");
          if (lbl) lbl.textContent = formatTime(pos);
        }
      }
      if (this._history && Date.now() - this._history.t > 10 * 60 * 1000) this._fetchHistory();
    }, 1000);
  }

  /* ---------- Gestes : tap, appui long, glisser ---------- */

  _bindGestures() {
    const root = this.shadowRoot;
    let g = null;
    root.addEventListener("pointerdown", (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      const el = e.target.closest("[data-g]");
      if (!el) return;
      g = { el, x: e.clientX, y: e.clientY, id: e.pointerId, moved: false, drag: false, held: false };
      if (el.dataset.hold) {
        g.timer = setTimeout(() => {
          if (!g || g.moved || g.drag) return;
          g.held = true;
          this._haptic("medium");
          this._exec(el.dataset.hold, el);
        }, 500);
      }
    });
    root.addEventListener("pointermove", (e) => {
      if (!g || e.pointerId !== g.id) return;
      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) g.moved = true;
      const vertical = g.el.dataset.axis === "y";
      const main = Math.abs(vertical ? dy : dx);
      const cross = Math.abs(vertical ? dx : dy);
      if (!g.drag && g.el.dataset.drag && main > 8 && main > cross * 1.2) {
        g.drag = true;
        try { g.el.setPointerCapture(e.pointerId); } catch (err) { /* pointeur déjà relâché */ }
        g.el.classList.add("dragging");
        this._lockUntil = Date.now() + 60000;
      }
      if (g.drag) {
        e.preventDefault();
        g.value = this._dragValue(g.el, e);
      }
    });
    const end = (e, cancelled) => {
      if (!g || e.pointerId !== g.id) return;
      const cur = g;
      g = null;
      clearTimeout(cur.timer);
      if (cur.drag) {
        cur.el.classList.remove("dragging");
        if (!cancelled) {
          if (cur.value === undefined) cur.value = this._dragValue(cur.el, e);
          this._commitDrag(cur.el, cur.value);
        }
        this._lockUntil = Date.now() + 1500;
        return;
      }
      if (cancelled || cur.held || cur.moved) return;
      const tap = cur.el.dataset.tap;
      if (!tap || tap === "none") return;
      if (cur.el.dataset.confirm && !(this._armed && this._armed.key === cur.el.dataset.key)) {
        this._arm(cur.el);
        return;
      }
      this._disarm();
      this._haptic("light");
      this._exec(tap, cur.el);
    };
    root.addEventListener("pointerup", (e) => end(e, false));
    root.addEventListener("pointercancel", (e) => end(e, true));
    root.addEventListener("contextmenu", (e) => { if (e.target.closest("[data-hold],[data-drag]")) e.preventDefault(); });
    root.addEventListener("click", (e) => {
      if (this._modeOpen && !e.target.closest(".menu") && !e.target.closest('[data-tap="mode-menu"]')) {
        this._modeOpen = false;
        this._refreshTop();
      }
    });
  }

  _dragValue(el, e) {
    const r = el.getBoundingClientRect();
    let ratio = el.dataset.axis === "y" ? (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width;
    ratio = clamp(ratio, 0, 1);
    const kind = el.dataset.drag;
    let v = kind === "position" ? Math.round(100 - ratio * 100) : Math.round(ratio * 100);
    if (kind === "brightness") v = Math.max(v, 1);
    el.style.setProperty("--val", String(v));
    const lbl = el.querySelector("[data-val]") || (el.closest(".cover, .tile") || el).querySelector("[data-val]");
    if (lbl) {
      if (kind === "seek") {
        const p = this.shadowRoot.querySelector("[data-pos]");
        if (p) p.textContent = formatTime((v / 100) * (Number(el.dataset.dur) || 0));
      } else lbl.textContent = kind === "position" ? (v >= 100 ? "Ouvert" : v <= 0 ? "Fermé" : `${v} %`) : `${v} %`;
    }
    return v;
  }

  _commitDrag(el, v) {
    const id = el.dataset.entity;
    switch (el.dataset.drag) {
      case "brightness": return this._call("light", "turn_on", { entity_id: id, brightness_pct: v });
      case "position": return this._call("cover", "set_cover_position", { entity_id: id, position: v });
      case "volume": return this._call("media_player", "volume_set", { entity_id: id, volume_level: v / 100 });
      case "seek": return this._call("media_player", "media_seek", { entity_id: id, seek_position: (v / 100) * (Number(el.dataset.dur) || 0) });
    }
  }

  _arm(el) {
    this._disarm();
    el.classList.add("armed");
    this._armed = { el, key: el.dataset.key };
    this._toast(el.dataset.confirm);
    this._haptic("warning");
    this._armTimer = setTimeout(() => this._disarm(), 3000);
  }

  _disarm() {
    clearTimeout(this._armTimer);
    if (this._armed && this._armed.el) this._armed.el.classList.remove("armed");
    this._armed = null;
  }

  _haptic(type) {
    if (this._cfg && this._cfg.behavior.haptics) fireEvent(this, "haptic", type);
  }

  _toast(msg) {
    const t = this.shadowRoot.querySelector(".toast");
    if (!t || !msg) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  _refreshTop() {
    const top = this.shadowRoot.querySelector(".hero-top");
    if (top) top.innerHTML = this._renderHeroTop(computeContext(this._hass, this._cfg));
  }

  /* ---------- Actions ---------- */

  _call(domain, service, data) {
    try {
      const p = this._hass.callService(domain, service, data);
      if (p && p.catch) p.catch((err) => this._toast(`Erreur : ${err && err.message ? err.message : service}`));
      return p;
    } catch (err) {
      this._toast(`Erreur : ${err.message || service}`);
    }
  }

  _toggle(id) {
    const d = domainOf(id);
    const s = this._hass.states[id];
    if (["light", "switch", "fan", "input_boolean", "automation", "siren", "humidifier", "cover", "media_player"].includes(d)) return this._call(d, "toggle", { entity_id: id });
    if (d === "scene" || d === "script") return this._call(d, "turn_on", { entity_id: id });
    if (d === "button" || d === "input_button") return this._call(d, "press", { entity_id: id });
    if (d === "lock") return this._call("lock", s && s.state === "locked" ? "unlock" : "lock", { entity_id: id });
    return this._call("homeassistant", "toggle", { entity_id: id });
  }

  _exec(action, el) {
    const id = el.dataset.entity;
    const h = this._hass;
    const cfg = this._cfg;
    switch (action) {
      case "toggle": return this._toggle(id);
      case "more-info": return id && fireEvent(this, "hass-more-info", { entityId: id });
      case "call": {
        const [d, s] = el.dataset.svc.split(".");
        return this._call(d, s, { entity_id: id });
      }
      case "activate": {
        const d = domainOf(id);
        const svc = d === "button" || d === "input_button" ? "press" : d === "automation" ? "trigger" : "turn_on";
        this._call(d, svc, { entity_id: id });
        el.classList.add("done");
        setTimeout(() => el.classList.remove("done"), 1200);
        return this._toast(`${el.textContent.trim()} ✓`);
      }
      case "tab": {
        this._tab = el.dataset.tab;
        if (cfg.layout.remember_tab) { try { localStorage.setItem(`lrc-tab-${cfg.name}`, this._tab); } catch (e) { /* ignoré */ } }
        const tabsEl = this.shadowRoot.querySelector(".tabs");
        if (tabsEl) tabsEl.innerHTML = this._renderTabs(computeContext(h, cfg));
        this._lockUntil = 0;
        return this._renderPanels(null, true);
      }
      case "mode-menu":
        this._modeOpen = !this._modeOpen;
        return this._refreshTop();
      case "select-mode":
        this._modeOpen = false;
        this._call(domainOf(id), "select_option", { entity_id: id, option: el.dataset.value });
        return this._refreshTop();
      case "source": return this._call("media_player", "select_source", { entity_id: id, source: el.dataset.value });
      case "shuffle": return this._call("media_player", "shuffle_set", { entity_id: id, shuffle: !h.states[id].attributes.shuffle });
      case "repeat": {
        const cur = h.states[id].attributes.repeat || "off";
        return this._call("media_player", "repeat_set", { entity_id: id, repeat: { off: "all", all: "one", one: "off" }[cur] || "off" });
      }
      case "mute": return this._call("media_player", "volume_mute", { entity_id: id, is_volume_muted: !h.states[id].attributes.is_volume_muted });
      case "tv-power": return this._tvPower();
      case "lights-all": {
        const svc = el.dataset.value === "off" ? "turn_off" : "turn_on";
        return cfg.lights.forEach((l) => this._call(domainOf(l.entity) === "light" ? "light" : "homeassistant", svc, { entity_id: l.entity }));
      }
      case "covers-all": {
        const v = el.dataset.value;
        if (v === "my") return cfg.covers.filter((c) => c.my_button).forEach((c) => this._call("button", "press", { entity_id: c.my_button }));
        const ids = cfg.covers.map((c) => c.entity);
        return this._call("cover", { open: "open_cover", close: "close_cover", stop: "stop_cover" }[v], { entity_id: ids });
      }
      case "all-off": return this._allOff();
      case "hvac": return this._call("climate", "set_hvac_mode", { entity_id: id, hvac_mode: el.dataset.value });
      case "temp-step": {
        const cl = h.states[id];
        const t = Number(cl.attributes.temperature) + Number(el.dataset.value);
        const lbl = el.parentElement.querySelector("[data-val]");
        if (lbl) lbl.textContent = `${fmtNum(t)}°`;
        clearTimeout(this._tempTimer);
        this._lockUntil = Date.now() + 1500;
        this._tempTarget = t;
        this._tempTimer = setTimeout(() => this._call("climate", "set_temperature", { entity_id: id, temperature: this._tempTarget }), 700);
        return;
      }
      default: return;
    }
  }

  _tvPower() {
    const m = this._cfg.media;
    const ctx = computeContext(this._hass, this._cfg);
    const tv = this._hass.states[m.tv];
    if (ctx.tvOn) {
      if (tv && tv.state !== "unavailable") this._call("media_player", "turn_off", { entity_id: m.tv });
      else if (m.tv_power) this._call("switch", "turn_off", { entity_id: m.tv_power });
    } else {
      const pw = this._hass.states[m.tv_power];
      if (pw && pw.state !== "on") this._call(domainOf(m.tv_power), "turn_on", { entity_id: m.tv_power });
      if (tv && tv.state !== "unavailable") this._call("media_player", "turn_on", { entity_id: m.tv });
      else if (!m.tv_power) this._toast("TV injoignable");
    }
  }

  _allOff() {
    const cfg = this._cfg;
    const h = this._hass;
    const o = cfg.behavior.all_off || {};
    const on = (id) => h.states[id] && isActiveState(h.states[id]);
    if (o.lights) cfg.lights.filter((l) => on(l.entity)).forEach((l) => this._call(domainOf(l.entity) === "light" ? "light" : "homeassistant", "turn_off", { entity_id: l.entity }));
    if (o.devices) cfg.devices.filter((d) => on(d.entity)).forEach((d) => this._call("homeassistant", "turn_off", { entity_id: d.entity }));
    if (o.media) {
      if (cfg.media.player && h.states[cfg.media.player] && h.states[cfg.media.player].state === "playing") this._call("media_player", "media_pause", { entity_id: cfg.media.player });
      if (cfg.media.tv && on(cfg.media.tv)) this._call("media_player", "turn_off", { entity_id: cfg.media.tv });
      if (cfg.media.ambilight && on(cfg.media.ambilight)) this._call("light", "turn_off", { entity_id: cfg.media.ambilight });
    }
    if (o.covers && cfg.covers.length) this._call("cover", "close_cover", { entity_id: cfg.covers.map((c) => c.entity) });
    this._toast("Tout est éteint");
  }
}

/* ------------------------------------------------------------------ */
/* Éditeur visuel                                                       */
/* ------------------------------------------------------------------ */

const EDITOR_TABS = [
  { id: "general", icon: "mdi:cog", label: "Général" },
  { id: "images", icon: "mdi:image-multiple", label: "Ambiance" },
  { id: "hotspots", icon: "mdi:gesture-tap", label: "Points" },
  { id: "lights", icon: "mdi:lightbulb-group", label: "Lumières" },
  { id: "covers", icon: "mdi:window-shutter", label: "Volets" },
  { id: "media", icon: "mdi:music", label: "Média" },
  { id: "devices", icon: "mdi:power-socket-eu", label: "Appareils" },
  { id: "scenes", icon: "mdi:palette", label: "Scènes" },
  { id: "climate", icon: "mdi:thermometer", label: "Climat" },
  { id: "behavior", icon: "mdi:tune-variant", label: "Comportement" },
];

const LABELS = {
  name: "Nom affiché", icon: "Icône", area: "Pièce (découverte automatique)", weather: "Météo", mode: "Mode maison (input_select)",
  show_temperature: "Afficher température / humidité dans l'en-tête", entity: "Entité", image: "Image", image_on: "Image quand allumé",
  color: "Couleur (CSS)", my_button: "Bouton « My » (position favorite)", player: "Enceinte / lecteur principal", tv: "TV (media_player)",
  tv_power: "Prise / alimentation TV", tv_name: "Nom de la TV", ambilight: "Ambilight / lumière TV", show_sources: "Afficher les favoris / sources",
  sources: "Favoris à afficher (vide = tous)", sound_controls: "Réglages du son (interrupteurs)", power: "Capteur de puissance (W)",
  confirm_off: "Confirmer avant d'éteindre", confirm: "Demander confirmation", temperature: "Capteur de température", humidity: "Capteur d'humidité",
  climate: "Thermostat (climate)", comfort_min: "Confort min (°C)", comfort_max: "Confort max (°C)", graph: "Afficher le graphique",
  hours: "Historique (heures)", mode_layout: "Disposition", hero: "Afficher l'image d'ambiance", hero_style: "Style",
  aspect_ratio: "Format de l'image", wide: "Disposition en paysage / grand écran",
  wide_breakpoint: "Largeur de carte à partir de laquelle passer en 2 colonnes", wide_split: "Part de l'image en 2 colonnes", default_tab: "Onglet par défaut", remember_tab: "Mémoriser le dernier onglet",
  auto_media_tab: "Basculer sur Média quand la lecture démarre", show_summary: "Résumé sur l'image", show_scenes: "Barre de scènes",
  show_all_off: "Bouton « Tout éteindre »", hide_unavailable: "Masquer les entités indisponibles", accent_color: "Couleur d'accent (CSS)",
  light_tap: "Toucher une lampe", hold: "Appui long", haptics: "Retour haptique (app mobile)", confirm_all_off: "Confirmer « Tout éteindre »",
  lights: "Éteindre les lumières", devices: "Éteindre les appareils", media: "Mettre en pause / éteindre la TV", covers: "Fermer les volets",
  default: "Image par défaut", transition: "Durée du fondu (ms)", position: "Cadrage de l'image", night_dim: "Assombrir la nuit (%)",
  x: "Position horizontale (%)", y: "Position verticale (%)", tap_action: "Action au toucher", show_name: "Afficher le nom",
  blend: "Mode de fusion", opacity: "Opacité", use_brightness: "Opacité selon la luminosité", condition: "Type de condition",
  operator: "Opérateur", value: "Valeur(s) — séparées par des virgules", attribute: "Attribut (optionnel)", filter: "Filtre CSS (optionnel)",
  match: "Logique", folder: "Dossier des images",
};

const HELPERS = {
  area: "Remplit automatiquement lumières, volets, média, prises, scènes et capteurs de la pièce si les listes sont vides.",
  image: "Chemin /local/… (dossier config/www) ou URL. Format conseillé 3:2 (1536×1024).",
  filter: "Ex. : grayscale(0.7) brightness(0.8) — appliqué à l'image de cette règle.",
  sources: "Laissez vide pour afficher tous les favoris de l'enceinte.",
  blend: "« screen » rend le noir transparent : idéal pour des calques de lueur sur fond noir.",
  night_dim: "Assombrit l'image la nuit quand tout est éteint.",
  tv_power: "Utilisée pour allumer la TV lorsqu'elle est hors réseau (ex. prise de la multiprise).",
};

const EDITOR_STYLES = `
:host { display: block; }
.etabs { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 14px; }
.etab { display: inline-flex; align-items: center; gap: 6px; padding: 7px 11px; border-radius: 10px; border: 1px solid var(--divider-color); background: none; color: var(--primary-text-color); cursor: pointer; font: inherit; font-size: .85rem; }
.etab ha-icon { --mdc-icon-size: 18px; }
.etab.sel { background: var(--primary-color); border-color: var(--primary-color); color: var(--text-primary-color, #fff); }
.box { border: 1px solid var(--divider-color); border-radius: 12px; padding: 12px; margin-bottom: 12px; }
.box h3 { margin: 0 0 10px; font-size: 1rem; display: flex; align-items: center; gap: 8px; }
.box h3 ha-icon { --mdc-icon-size: 20px; color: var(--primary-color); }
.box p.help { margin: -4px 0 10px; color: var(--secondary-text-color); font-size: .85rem; line-height: 1.4; }
.item { border: 1px solid var(--divider-color); border-radius: 10px; margin-bottom: 8px; overflow: hidden; }
.item-h { display: flex; align-items: center; gap: 8px; padding: 8px 10px; cursor: pointer; background: color-mix(in srgb, var(--primary-text-color) 4%, transparent); }
.item-h .t { flex: 1; min-width: 0; font-weight: 600; font-size: .9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-h .s { color: var(--secondary-text-color); font-size: .78rem; font-weight: 400; margin-left: 6px; }
.item-h .active { color: var(--success-color, #43a047); font-size: .74rem; font-weight: 700; margin-left: 6px; }
.item-b { padding: 10px; }
.ib { display: inline-grid; place-items: center; width: 32px; height: 32px; border-radius: 8px; border: 0; background: none; cursor: pointer; color: var(--secondary-text-color); }
.ib:hover { background: color-mix(in srgb, var(--primary-text-color) 8%, transparent); color: var(--primary-text-color); }
.ib ha-icon { --mdc-icon-size: 20px; }
.ib.del:hover { color: var(--error-color); }
.row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.act { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; border: 1px solid var(--primary-color); background: none; color: var(--primary-color); cursor: pointer; font: inherit; font-size: .88rem; font-weight: 600; }
.act.fill { background: var(--primary-color); color: var(--text-primary-color, #fff); }
.act ha-icon { --mdc-icon-size: 18px; }
.thumb { width: 100%; max-height: 160px; object-fit: cover; border-radius: 8px; margin-top: 6px; display: block; background: #0002; }
.cond { border-left: 3px solid var(--primary-color); padding: 6px 0 6px 10px; margin: 8px 0; position: relative; }
.cond .ib { position: absolute; top: 4px; right: 0; }
.status { padding: 8px 12px; border-radius: 10px; background: color-mix(in srgb, var(--primary-color) 12%, transparent); font-size: .88rem; margin-bottom: 10px; }
.placer { position: relative; width: 100%; border-radius: 10px; overflow: hidden; cursor: crosshair; background: #111; }
.placer img, .placer .illus, .placer .illus svg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.placer .mk { position: absolute; transform: translate(-50%, -50%); width: 26px; height: 26px; border-radius: 50%; background: rgba(0,0,0,.5); border: 2px solid #fff; display: grid; place-items: center; color: #fff; font-size: .7rem; font-weight: 700; pointer-events: none; }
.placer .mk.sel { background: var(--primary-color); transform: translate(-50%, -50%) scale(1.25); }
.muted { color: var(--secondary-text-color); font-size: .82rem; }
ha-form { display: block; }
`;

class LivingroomCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._tab = "general";
    this._open = {};
    this._forms = [];
  }

  setConfig(config) {
    if (this._config && JSON.stringify(config) === JSON.stringify(this._config)) return;
    this._config = clone(config) || {};
    this._render();
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    this._forms.forEach((f) => { f.hass = hass; });
    if (first) {
      this._loadHaComponents().then(() => this._render());
    } else {
      this._refreshStatus();
    }
  }

  async _loadHaComponents() {
    // Force le chargement de ha-form et des sélecteurs d'entités dans l'éditeur
    if (customElements.get("ha-form") && customElements.get("ha-entity-picker")) return;
    try {
      const helpers = await window.loadCardHelpers();
      const card = await helpers.createCardElement({ type: "entities", entities: [] });
      if (card && card.constructor.getConfigElement) await card.constructor.getConfigElement();
    } catch (e) { /* hors Home Assistant */ }
  }

  get _cfg() {
    return resolveConfig(this._hass, this._config);
  }

  _commit(mutator, rerender = false) {
    const c = clone(this._config) || {};
    mutator(c);
    this._config = this._clean(c);
    fireEvent(this, "config-changed", { config: this._config });
    if (rerender) this._render();
    else this._refreshStatus();
  }

  _clean(o) {
    if (Array.isArray(o)) return o.map((x) => this._clean(x));
    if (!isObj(o)) return o;
    const out = {};
    for (const [k, v] of Object.entries(o)) {
      if (v === undefined || v === null || v === "") continue;
      out[k] = this._clean(v);
    }
    return out;
  }

  _section(key) {
    return { ...(DEFAULT_CONFIG[key] || {}), ...((this._config || {})[key] || {}) };
  }

  _form(schema, data, onChange) {
    const f = document.createElement("ha-form");
    f.hass = this._hass;
    f.data = data;
    f.schema = schema;
    f.computeLabel = (s) => s.label || LABELS[s.name] || s.name;
    f.computeHelper = (s) => s.helper || HELPERS[s.name] || "";
    f.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      onChange(ev.detail.value, f);
    });
    this._forms.push(f);
    return f;
  }

  _el(tag, attrs = {}, html = "") {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") e.className = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    if (html) e.innerHTML = html;
    return e;
  }

  _box(title, icon, help) {
    const b = this._el("div", { class: "box" }, `<h3><ha-icon icon="${icon}"></ha-icon>${esc(title)}</h3>${help ? `<p class="help">${help}</p>` : ""}`);
    return b;
  }

  _render() {
    if (!this._config) return;
    this._forms = [];
    const root = this.shadowRoot;
    root.innerHTML = `<style>${EDITOR_STYLES}</style>`;
    const nav = this._el("div", { class: "etabs" });
    for (const t of EDITOR_TABS) {
      nav.appendChild(this._el("button", {
        class: `etab ${t.id === this._tab ? "sel" : ""}`,
        onclick: () => { this._tab = t.id; this._render(); },
      }, `<ha-icon icon="${t.icon}"></ha-icon>${t.label}`));
    }
    root.appendChild(nav);
    const body = this._el("div");
    root.appendChild(body);
    const fn = {
      general: this._tabGeneral, images: this._tabImages, hotspots: this._tabHotspots, lights: this._tabLights,
      covers: this._tabCovers, media: this._tabMedia, devices: this._tabDevices, scenes: this._tabScenes,
      climate: this._tabClimate, behavior: this._tabBehavior,
    }[this._tab];
    fn.call(this, body);
  }

  /* ---------- Onglet Général ---------- */

  _tabGeneral(body) {
    const b = this._box("Identité", "mdi:sofa");
    b.appendChild(this._form([
      { name: "name", selector: { text: {} } },
      { name: "icon", selector: { icon: {} } },
    ], { name: this._config.name ?? DEFAULT_CONFIG.name, icon: this._config.icon ?? DEFAULT_CONFIG.icon }, (v) => this._commit((c) => { c.name = v.name; c.icon = v.icon; })));
    body.appendChild(b);

    const a = this._box("Pièce", "mdi:floor-plan",
      "Choisissez la pièce : la carte détecte automatiquement ses entités. Utilisez « Importer » pour figer la liste détectée et la personnaliser ensuite onglet par onglet.");
    a.appendChild(this._form([{ name: "area", selector: { area: {} } }], { area: this._config.area || "" }, (v) => this._commit((c) => { c.area = v.area; }, true)));
    const row = this._el("div", { class: "row", style: "margin-top:10px" });
    row.appendChild(this._el("button", { class: "act fill", onclick: () => this._importArea() }, `<ha-icon icon="mdi:auto-fix"></ha-icon>Importer les entités de la pièce`));
    a.appendChild(row);
    body.appendChild(a);

    const h = this._box("En-tête", "mdi:page-layout-header");
    const header = this._section("header");
    h.appendChild(this._form([
      { name: "weather", selector: { entity: { domain: "weather" } } },
      { name: "mode", selector: { entity: { domain: ["input_select", "select"] } } },
      { name: "show_temperature", selector: { boolean: {} } },
    ], header, (v) => this._commit((c) => { c.header = v; })));
    body.appendChild(h);
  }

  _importArea() {
    const area = this._config.area;
    if (!area) return alert("Choisissez d'abord une pièce.");
    const d = discoverArea(this._hass, area);
    const has = ["lights", "covers", "devices", "scenes"].some((k) => (this._config[k] || []).length);
    if (has && !confirm("Remplacer les listes actuelles (lumières, volets, appareils, scènes) par celles détectées ?")) return;
    this._commit((c) => {
      c.lights = d.lights; c.covers = d.covers; c.devices = d.devices; c.scenes = d.scenes;
      c.media = { ...(c.media || {}), ...d.media };
      c.climate = { ...(c.climate || {}), ...d.climate };
    }, true);
  }

  /* ---------- Listes génériques ---------- */

  _list(body, key, opts) {
    const items = (this._config[key] || []).map(normItem);
    const box = this._box(opts.title, opts.icon, opts.help);
    items.forEach((it, i) => box.appendChild(this._listItem(key, items, it, i, opts)));
    const add = this._el("div", { style: "margin-top:8px" });
    add.appendChild(this._form([{ name: "entity", label: opts.addLabel || "Ajouter une entité", selector: { entity: opts.filter ? { filter: opts.filter } : {} } }], { entity: "" }, (v) => {
      if (!v.entity) return;
      this._open[key] = items.length;
      this._commit((c) => { c[key] = [...(c[key] || []).map(normItem), { ...(opts.defaults || {}), entity: v.entity }]; }, true);
    }));
    box.appendChild(add);
    if (opts.extra) opts.extra(box);
    body.appendChild(box);
  }

  _listItem(key, items, it, i, opts) {
    const s = this._hass && this._hass.states[it.entity];
    const name = it.name || (s ? s.attributes.friendly_name : it.entity) || "(sans entité)";
    const open = this._open[key] === i;
    const wrap = this._el("div", { class: "item" });
    const head = this._el("div", { class: "item-h" }, `
      <ha-icon icon="${esc(it.icon || (s && s.attributes.icon) || (DOMAIN_ICONS[domainOf(it.entity)] || ["mdi:circle-medium"])[0])}"></ha-icon>
      <span class="t">${esc(name)}<span class="s">${esc(it.entity || "")}</span></span>`);
    const mk = (icon, title, fn, cls = "") => {
      const btn = this._el("button", { class: `ib ${cls}`, title, onclick: (e) => { e.stopPropagation(); fn(); } }, `<ha-icon icon="${icon}"></ha-icon>`);
      head.appendChild(btn);
    };
    if (i > 0) mk("mdi:arrow-up", "Monter", () => this._move(key, i, -1));
    if (i < items.length - 1) mk("mdi:arrow-down", "Descendre", () => this._move(key, i, 1));
    mk("mdi:delete-outline", "Supprimer", () => this._commit((c) => { c[key] = items.filter((_, j) => j !== i); this._open[key] = -1; }, true), "del");
    mk(open ? "mdi:chevron-up" : "mdi:chevron-down", "Détails", () => { this._open[key] = open ? -1 : i; this._render(); });
    head.addEventListener("click", () => { this._open[key] = open ? -1 : i; this._render(); });
    wrap.appendChild(head);
    if (open) {
      const b = this._el("div", { class: "item-b" });
      b.appendChild(this._form(opts.schema(it), it, (v) => this._commit((c) => {
        const list = (c[key] || []).map(normItem);
        list[i] = v;
        c[key] = list;
      })));
      if (opts.itemExtra) opts.itemExtra(b, it, i);
      wrap.appendChild(b);
    }
    return wrap;
  }

  _move(key, i, dir) {
    this._commit((c) => {
      const list = (c[key] || []).map(normItem);
      const [x] = list.splice(i, 1);
      list.splice(i + dir, 0, x);
      c[key] = list;
      this._open[key] = i + dir;
    }, true);
  }

  /* ---------- Onglets de listes ---------- */

  _tabLights(body) {
    this._list(body, "lights", {
      title: "Lumières", icon: "mdi:lightbulb-group", filter: [{ domain: ["light", "switch", "input_boolean"] }],
      help: "Les lampes variables se règlent en glissant sur la tuile. Vous pouvez remplacer l'icône par une image (allumée / éteinte).",
      schema: () => [
        { name: "entity", selector: { entity: { filter: [{ domain: ["light", "switch", "input_boolean"] }] } } },
        { name: "name", selector: { text: {} } },
        { name: "icon", selector: { icon: {} } },
        { name: "image", selector: { text: {} } },
        { name: "image_on", selector: { text: {} } },
        { name: "color", selector: { text: {} } },
      ],
    });
  }

  _tabCovers(body) {
    this._list(body, "covers", {
      title: "Volets", icon: "mdi:window-shutter", filter: [{ domain: "cover" }],
      help: "Glissez verticalement dans la fenêtre dessinée pour régler la position. Le bouton « My » (Somfy) est détecté automatiquement à l'import.",
      schema: () => [
        { name: "entity", selector: { entity: { domain: "cover" } } },
        { name: "name", selector: { text: {} } },
        { name: "my_button", selector: { entity: { domain: ["button", "script", "scene"] } } },
      ],
    });
  }

  _tabDevices(body) {
    const flt = [{ domain: ["switch", "input_boolean", "fan", "button", "input_button", "light", "humidifier", "vacuum"] }];
    this._list(body, "devices", {
      title: "Appareils & prises", icon: "mdi:power-socket-eu", filter: flt,
      help: "Consoles, TV, multiprise… Activez la confirmation pour éviter de couper une console par erreur.",
      schema: () => [
        { name: "entity", selector: { entity: { filter: flt } } },
        { name: "name", selector: { text: {} } },
        { name: "icon", selector: { icon: {} } },
        { name: "power", selector: { entity: { domain: "sensor" } } },
        { name: "confirm_off", selector: { boolean: {} } },
        { name: "image", selector: { text: {} } },
        { name: "image_on", selector: { text: {} } },
        { name: "color", selector: { text: {} } },
      ],
    });
  }

  _tabScenes(body) {
    const flt = [{ domain: ["scene", "script", "automation", "button", "input_button"] }];
    this._list(body, "scenes", {
      title: "Scènes & raccourcis", icon: "mdi:palette", filter: flt,
      help: "Affichées en barre défilante sous l'image. Appui long = détails de l'entité.",
      schema: () => [
        { name: "entity", selector: { entity: { filter: flt } } },
        { name: "name", selector: { text: {} } },
        { name: "icon", selector: { icon: {} } },
        { name: "color", selector: { text: {} } },
        { name: "confirm", selector: { boolean: {} } },
      ],
    });
  }

  _tabHotspots(body) {
    const cfg = this._cfg;
    const items = (this._config.hotspots || []).map(normItem);
    const sel = this._open.hotspots ?? -1;
    const box = this._box("Placement sur l'image", "mdi:crosshairs-gps",
      sel >= 0 ? "Cliquez sur l'image pour placer le point sélectionné." : "Ouvrez un point ci-dessous puis cliquez sur l'image pour le positionner.");
    const placer = this._el("div", { class: "placer", style: `aspect-ratio:${cfg.layout.aspect_ratio || "3/2"}` });
    const scene = this._hass ? computeScene(this._hass, cfg) : { image: cfg.images.default };
    if (scene.image) placer.appendChild(this._el("img", { src: scene.image, alt: "" }));
    else if (this._hass) placer.appendChild(this._el("div", { class: "illus" }, renderIllustration(scene.ctx, cfg)));
    items.forEach((h, i) => placer.appendChild(this._el("div", { class: `mk ${i === sel ? "sel" : ""}`, style: `left:${Number(h.x) || 50}%;top:${Number(h.y) || 50}%` }, String(i + 1))));
    placer.addEventListener("click", (e) => {
      if (sel < 0) return;
      const r = placer.getBoundingClientRect();
      const x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10;
      const y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10;
      this._commit((c) => { const l = (c.hotspots || []).map(normItem); l[sel] = { ...l[sel], x, y }; c.hotspots = l; }, true);
    });
    box.appendChild(placer);
    body.appendChild(box);
    this._list(body, "hotspots", {
      title: "Points interactifs", icon: "mdi:gesture-tap",
      help: "Des pastilles posées sur l'image (lampe, TV, fenêtre…) : toucher = action, appui long = détails. Elles s'illuminent quand l'entité est active.",
      defaults: { x: 50, y: 50 },
      schema: () => [
        { name: "entity", selector: { entity: {} } },
        { name: "name", selector: { text: {} } },
        { name: "icon", selector: { icon: {} } },
        { name: "show_name", selector: { boolean: {} } },
        { name: "tap_action", selector: { select: { mode: "dropdown", options: [{ value: "toggle", label: "Basculer" }, { value: "more-info", label: "Détails (more-info)" }, { value: "activate", label: "Activer (scène / script / bouton)" }] } } },
        { name: "x", selector: { number: { min: 0, max: 100, step: 0.5, mode: "slider" } } },
        { name: "y", selector: { number: { min: 0, max: 100, step: 0.5, mode: "slider" } } },
        { name: "color", selector: { text: {} } },
      ],
    });
  }

  /* ---------- Onglet Ambiance (images) ---------- */

  _tabImages(body) {
    const images = this._section("images");
    const status = this._el("div", { class: "status", id: "status" });
    body.appendChild(status);

    const g = this._box("Image de base", "mdi:image", "Sans image, une illustration animée du salon est générée automatiquement à partir de l'état des entités (ciel, volets, lampes, TV, musique).");
    g.appendChild(this._form([
      { name: "default", selector: { text: {} } },
      { name: "transition", selector: { number: { min: 0, max: 3000, step: 100, mode: "slider", unit_of_measurement: "ms" } } },
      { name: "position", selector: { select: { mode: "dropdown", options: ["center", "top", "bottom", "left", "right"].map((v) => ({ value: v, label: { center: "Centré", top: "Haut", bottom: "Bas", left: "Gauche", right: "Droite" }[v] })) } } },
      { name: "night_dim", selector: { number: { min: 0, max: 80, step: 5, mode: "slider", unit_of_measurement: "%" } } },
    ], images, (v) => this._commit((c) => { c.images = { ...(c.images || {}), ...v }; })));
    if (images.default) g.appendChild(this._el("img", { class: "thumb", src: images.default, alt: "" }));
    body.appendChild(g);

    // Règles
    const rules = images.rules || [];
    const rb = this._box("Règles d'ambiance", "mdi:image-auto-adjust",
      "Évaluées dans l'ordre : la <b>première</b> règle dont les conditions sont remplies choisit l'image. Utilisez « Aperçu » pour tester une image sur la carte.");
    rules.forEach((r, i) => rb.appendChild(this._ruleItem(rules, r, i)));
    const row = this._el("div", { class: "row", style: "margin-top:8px" });
    row.appendChild(this._el("button", { class: "act", onclick: () => {
      this._open.rules = rules.length;
      this._commit((c) => { c.images = { ...(c.images || {}), rules: [...rules, { name: `Règle ${rules.length + 1}`, image: "", match: "all", conditions: [{ condition: "night" }] }] }; }, true);
    } }, `<ha-icon icon="mdi:plus"></ha-icon>Ajouter une règle`));
    rb.appendChild(row);

    const sug = this._el("div", { style: "margin-top:12px" });
    let folder = "/local/salon/";
    sug.appendChild(this._form([{ name: "folder", selector: { text: {} } }], { folder }, (v) => { folder = v.folder; }));
    sug.appendChild(this._el("button", { class: "act fill", style: "margin-top:8px", onclick: () => {
      if (rules.length && !confirm("Remplacer les règles existantes par le jeu de règles suggéré ?")) return;
      this._commit((c) => { c.images = { ...(c.images || {}), default: (c.images && c.images.default) || folder.replace(/\/?$/, "/") + "salon_jour.jpg", rules: suggestedRules(folder) }; }, true);
    } }, `<ha-icon icon="mdi:auto-fix"></ha-icon>Générer les règles suggérées (7 ambiances)`));
    sug.appendChild(this._el("p", { class: "muted" }, "Correspond aux fichiers décrits dans PROMPTS.md : salon_jour, salon_nuit, salon_nuit_lumieres, salon_tv_jour, salon_tv_nuit, salon_volets_fermes, salon_musique."));
    rb.appendChild(sug);
    body.appendChild(rb);

    // Calques
    const ob = this._box("Calques superposés", "mdi:layers-triple",
      "Images transparentes (PNG) ou sur fond noir (fusion « screen ») qui apparaissent par-dessus l'ambiance quand une entité est active : halo d'une lampe, écran TV allumé…");
    const overlays = images.overlays || [];
    overlays.forEach((o, i) => {
      const open = this._open.overlays === i;
      const s = this._hass && this._hass.states[o.entity];
      const it = this._el("div", { class: "item" });
      const head = this._el("div", { class: "item-h", onclick: () => { this._open.overlays = open ? -1 : i; this._render(); } },
        `<ha-icon icon="mdi:layers"></ha-icon><span class="t">${esc(s ? s.attributes.friendly_name : o.entity || "Calque")}<span class="s">${esc(o.image || "")}</span></span>`);
      head.appendChild(this._el("button", { class: "ib del", title: "Supprimer", onclick: (e) => { e.stopPropagation(); this._commit((c) => { c.images = { ...(c.images || {}), overlays: overlays.filter((_, j) => j !== i) }; }, true); } }, `<ha-icon icon="mdi:delete-outline"></ha-icon>`));
      it.appendChild(head);
      if (open) {
        const b = this._el("div", { class: "item-b" });
        b.appendChild(this._form([
          { name: "entity", selector: { entity: {} } },
          { name: "image", selector: { text: {} } },
          { name: "blend", selector: { select: { mode: "dropdown", options: ["screen", "normal", "lighten", "overlay", "soft-light", "plus-lighter", "multiply"] } } },
          { name: "opacity", selector: { number: { min: 0, max: 1, step: 0.05, mode: "slider" } } },
          { name: "use_brightness", selector: { boolean: {} } },
        ], { blend: "screen", opacity: 1, ...o }, (v) => this._commit((c) => { const l = [...overlays]; l[i] = v; c.images = { ...(c.images || {}), overlays: l }; })));
        it.appendChild(b);
      }
      ob.appendChild(it);
    });
    ob.appendChild(this._el("button", { class: "act", onclick: () => {
      this._open.overlays = overlays.length;
      this._commit((c) => { c.images = { ...(c.images || {}), overlays: [...overlays, { entity: "", image: "", blend: "screen", opacity: 1, use_brightness: true }] }; }, true);
    } }, `<ha-icon icon="mdi:plus"></ha-icon>Ajouter un calque`));
    body.appendChild(ob);
    this._refreshStatus();
  }

  _ruleItem(rules, r, i) {
    const open = this._open.rules === i;
    const setRules = (fn, rerender = false) => this._commit((c) => {
      const l = clone(rules);
      fn(l);
      c.images = { ...(c.images || {}), rules: l };
    }, rerender);
    const wrap = this._el("div", { class: "item" });
    const summary = (r.conditions || []).map((c) => (CONDITION_TYPES.find((t) => t.value === (c.condition || "entity")) || {}).label || "").join(r.match === "any" ? " OU " : " ET ");
    const head = this._el("div", { class: "item-h", onclick: () => { this._open.rules = open ? -1 : i; this._render(); } },
      `<ha-icon icon="${r.disabled ? "mdi:image-off-outline" : "mdi:image-filter-hdr"}"></ha-icon>
       <span class="t">${i + 1}. ${esc(r.name || "Règle")}<span class="active" data-rule="${i}"></span><span class="s">${esc(summary)}</span></span>`);
    const mk = (icon, title, fn, cls = "") => head.appendChild(this._el("button", { class: `ib ${cls}`, title, onclick: (e) => { e.stopPropagation(); fn(); } }, `<ha-icon icon="${icon}"></ha-icon>`));
    mk("mdi:eye-outline", "Aperçu sur la carte", () => fireEvent(window, "lrc-preview", { image: r.image, filter: r.filter, duration: 6000 }));
    if (i > 0) mk("mdi:arrow-up", "Monter", () => { this._open.rules = i - 1; setRules((l) => l.splice(i - 1, 0, l.splice(i, 1)[0]), true); });
    if (i < rules.length - 1) mk("mdi:arrow-down", "Descendre", () => { this._open.rules = i + 1; setRules((l) => l.splice(i + 1, 0, l.splice(i, 1)[0]), true); });
    mk("mdi:delete-outline", "Supprimer", () => { this._open.rules = -1; setRules((l) => l.splice(i, 1), true); }, "del");
    wrap.appendChild(head);
    if (!open) return wrap;

    const b = this._el("div", { class: "item-b" });
    b.appendChild(this._form([
      { name: "name", selector: { text: {} } },
      { name: "image", selector: { text: {} } },
      { name: "filter", selector: { text: {} } },
      { name: "match", selector: { select: { mode: "list", options: [{ value: "all", label: "Toutes les conditions (ET)" }, { value: "any", label: "Au moins une condition (OU)" }] } } },
      { name: "disabled", label: "Désactiver cette règle", selector: { boolean: {} } },
    ], { match: "all", ...r }, (v) => setRules((l) => { l[i] = { ...l[i], ...v, conditions: l[i].conditions }; })));
    if (r.image) b.appendChild(this._el("img", { class: "thumb", src: r.image, alt: "" }));
    (r.conditions || []).forEach((c, ci) => {
      const cw = this._el("div", { class: "cond" });
      cw.appendChild(this._el("button", { class: "ib del", title: "Retirer la condition", onclick: () => setRules((l) => l[i].conditions.splice(ci, 1), true) }, `<ha-icon icon="mdi:close"></ha-icon>`));
      cw.appendChild(this._form(this._condSchema(c), { condition: "entity", operator: "is", ...c }, (v, form) => {
        const typeChanged = (v.condition || "entity") !== (c.condition || "entity");
        setRules((l) => { l[i].conditions[ci] = v; }, typeChanged);
      }));
      b.appendChild(cw);
    });
    b.appendChild(this._el("button", { class: "act", onclick: () => setRules((l) => { l[i].conditions = [...(l[i].conditions || []), { condition: "entity", operator: "is", entity: "", value: "on" }]; }, true) },
      `<ha-icon icon="mdi:plus"></ha-icon>Ajouter une condition`));
    wrap.appendChild(b);
    return wrap;
  }

  _condSchema(c) {
    const type = c.condition || "entity";
    const s = [{ name: "condition", selector: { select: { mode: "dropdown", options: CONDITION_TYPES } } }];
    if (type === "entity") {
      s.push({ name: "entity", selector: { entity: {} } });
      s.push({ name: "operator", selector: { select: { mode: "dropdown", options: OPERATORS } } });
      if (!["active", "inactive"].includes(c.operator)) s.push({ name: "value", selector: { text: {} } });
      s.push({ name: "attribute", selector: { text: {} } });
    } else if (type === "covers_closed" || type === "covers_open") {
      s.push({ name: "value", label: "Seuil (%)", selector: { number: { min: 0, max: 100, step: 5, mode: "slider" } } });
    } else if (type === "mode") {
      const ent = this._cfg.header.mode;
      const opts = ent && this._hass && this._hass.states[ent] ? this._hass.states[ent].attributes.options || [] : [];
      s.push({ name: "value", label: "Mode", selector: opts.length ? { select: { mode: "dropdown", options: opts, custom_value: true } } : { text: {} } });
    }
    return s;
  }

  _refreshStatus() {
    const st = this.shadowRoot.getElementById("status");
    if (!st || !this._hass) return;
    const scene = computeScene(this._hass, this._cfg);
    st.innerHTML = `<b>Ambiance actuelle :</b> ${esc(scene.name)}${scene.image ? ` — <code>${esc(scene.image)}</code>` : " — illustration générée"}`;
    this.shadowRoot.querySelectorAll("[data-rule]").forEach((el) => { el.textContent = Number(el.dataset.rule) === scene.index ? "● ACTIVE" : ""; });
  }

  /* ---------- Onglet Média ---------- */

  _tabMedia(body) {
    const media = this._section("media");
    const p = this._hass && this._hass.states[media.player];
    const sourceList = p ? p.attributes.source_list || [] : [];
    const b = this._box("Enceinte", "mdi:speaker");
    b.appendChild(this._form([
      { name: "player", selector: { entity: { domain: "media_player" } } },
      { name: "show_sources", selector: { boolean: {} } },
      { name: "sources", selector: sourceList.length ? { select: { multiple: true, mode: "dropdown", options: sourceList, custom_value: true } } : { text: { multiple: true } } },
      { name: "sound_controls", selector: { entity: { domain: "switch", multiple: true } } },
    ], media, (v) => this._commit((c) => { c.media = { ...(c.media || {}), ...v }; }, (v.player || "") !== (media.player || ""))));
    body.appendChild(b);
    const t = this._box("Télévision", "mdi:television");
    t.appendChild(this._form([
      { name: "tv", selector: { entity: { domain: "media_player" } } },
      { name: "tv_name", selector: { text: {} } },
      { name: "tv_power", selector: { entity: { domain: ["switch", "input_boolean", "script"] } } },
      { name: "ambilight", selector: { entity: { domain: "light" } } },
    ], media, (v) => this._commit((c) => { c.media = { ...(c.media || {}), ...v }; })));
    body.appendChild(t);
  }

  /* ---------- Onglet Climat ---------- */

  _tabClimate(body) {
    const b = this._box("Climat", "mdi:thermometer", "La tendance (↑ ↓) et la courbe sont calculées depuis l'historique.");
    b.appendChild(this._form([
      { name: "temperature", selector: { entity: { domain: "sensor", device_class: "temperature" } } },
      { name: "humidity", selector: { entity: { domain: "sensor", device_class: "humidity" } } },
      { name: "climate", selector: { entity: { domain: "climate" } } },
      { name: "comfort_min", selector: { number: { min: 10, max: 30, step: 0.5, mode: "box", unit_of_measurement: "°C" } } },
      { name: "comfort_max", selector: { number: { min: 10, max: 30, step: 0.5, mode: "box", unit_of_measurement: "°C" } } },
      { name: "graph", selector: { boolean: {} } },
      { name: "hours", selector: { number: { min: 1, max: 168, step: 1, mode: "box", unit_of_measurement: "h" } } },
    ], this._section("climate"), (v) => this._commit((c) => { c.climate = v; })));
    body.appendChild(b);
  }

  /* ---------- Onglet Comportement ---------- */

  _tabBehavior(body) {
    const layout = this._section("layout");
    const l = this._box("Disposition", "mdi:view-dashboard-edit");
    l.appendChild(this._form([
      { name: "mode", label: "Organisation", selector: { select: { mode: "list", options: [{ value: "tabs", label: "Onglets (compact)" }, { value: "stacked", label: "Tout afficher (sections empilées)" }] } } },
      { name: "hero", selector: { boolean: {} } },
      { name: "hero_style", selector: { select: { mode: "list", options: [{ value: "banner", label: "Bannière" }, { value: "ambient", label: "Ambiante (l'image floutée colore toute la carte)" }] } } },
      { name: "wide", selector: { select: { mode: "list", options: [{ value: "auto", label: "Automatique : image à gauche, commandes à droite quand la carte est assez large" }, { value: "never", label: "Toujours empilé (image au-dessus)" }] } } },
      { name: "wide_breakpoint", selector: { number: { min: 400, max: 1600, step: 20, mode: "slider", unit_of_measurement: "px" } } },
      { name: "wide_split", selector: { number: { min: 30, max: 75, step: 5, mode: "slider", unit_of_measurement: "%" } } },
      { name: "aspect_ratio", selector: { select: { mode: "dropdown", custom_value: true, options: [{ value: "3/2", label: "3:2 (images ChatGPT 1536×1024)" }, { value: "16/9", label: "16:9" }, { value: "2/1", label: "2:1 (panoramique)" }, { value: "4/3", label: "4:3" }, { value: "1/1", label: "1:1" }] } } },
      { name: "default_tab", selector: { select: { mode: "dropdown", options: [{ value: "auto", label: "Automatique" }, ...TABS.map((t) => ({ value: t.id, label: t.label }))] } } },
      { name: "remember_tab", selector: { boolean: {} } },
      { name: "auto_media_tab", selector: { boolean: {} } },
      { name: "show_summary", selector: { boolean: {} } },
      { name: "show_scenes", selector: { boolean: {} } },
      { name: "show_all_off", selector: { boolean: {} } },
      { name: "hide_unavailable", selector: { boolean: {} } },
      { name: "accent_color", selector: { text: {} } },
    ], layout, (v) => this._commit((c) => { c.layout = v; })));
    body.appendChild(l);

    const behavior = this._section("behavior");
    const bb = this._box("Interactions", "mdi:gesture-tap-hold");
    bb.appendChild(this._form([
      { name: "light_tap", selector: { select: { mode: "dropdown", options: [{ value: "toggle", label: "Allumer / éteindre" }, { value: "more-info", label: "Ouvrir les détails" }] } } },
      { name: "hold", selector: { select: { mode: "dropdown", options: [{ value: "more-info", label: "Ouvrir les détails" }, { value: "none", label: "Rien" }] } } },
      { name: "haptics", selector: { boolean: {} } },
      { name: "confirm_all_off", selector: { boolean: {} } },
    ], behavior, (v) => this._commit((c) => { c.behavior = { ...(c.behavior || {}), ...v, all_off: behavior.all_off }; })));
    body.appendChild(bb);

    const ab = this._box("« Tout éteindre » agit sur…", "mdi:power");
    ab.appendChild(this._form([
      { name: "lights", selector: { boolean: {} } },
      { name: "devices", selector: { boolean: {} } },
      { name: "media", selector: { boolean: {} } },
      { name: "covers", selector: { boolean: {} } },
    ], { ...DEFAULT_CONFIG.behavior.all_off, ...(behavior.all_off || {}) }, (v) => this._commit((c) => { c.behavior = { ...(c.behavior || {}), all_off: v }; })));
    body.appendChild(ab);
  }
}

if (!customElements.get(CARD_TAG)) customElements.define(CARD_TAG, LivingroomCard);
if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, LivingroomCardEditor);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === CARD_TAG)) {
  window.customCards.push({
    type: CARD_TAG,
    name: "Salon — carte tout-en-un",
    description: "Ambiance visuelle dynamique, points interactifs, lumières, volets, média, appareils, scènes et climat dans une seule carte.",
    preview: true,
    documentationURL: "https://github.com/Ergorock/livingroom_card",
  });
}

console.info(`%c LIVINGROOM-CARD %c v${CARD_VERSION} `, "background:#ff9800;color:#fff;font-weight:700;border-radius:4px 0 0 4px;padding:2px 4px", "background:#333;color:#fff;border-radius:0 4px 4px 0;padding:2px 4px");
