// hass simulé reprenant les entités du salon (états modifiables via callService).

const now = () => new Date().toISOString();
const S = (state, attributes = {}) => ({ state, attributes, last_updated: now(), last_changed: now() });

const states = {
  "sun.sun": S("above_horizon", { elevation: 24.8, friendly_name: "Soleil" }),
  "weather.saint_remy_les_chevreuse": S("sunny", { temperature: 12.7, friendly_name: "Prévision" }),
  "input_select.mode_maison": S("Maison", { options: ["Matin", "Maison", "Soirée", "Nuit", "Absent"], friendly_name: "Mode maison" }),
  "light.lampe_salon": S("on", { brightness: 160, supported_color_modes: ["brightness"], friendly_name: "Ampoule connectée" }),
  "switch.lampe_bibliotheque": S("off", { friendly_name: "Lampe bibliothèque" }),
  "light.50pus8546_12_ambilight": S("off", { friendly_name: "50PUS8546/12 Ambilight", supported_color_modes: ["hs"] }),
  "cover.salon_jardin": S("open", { current_position: 100, supported_features: 15, device_class: "shutter", friendly_name: "Salon jardin" }),
  "cover.salon_rue": S("open", { current_position: 60, supported_features: 15, device_class: "shutter", friendly_name: "Salon rue" }),
  "cover.bow_window_gauche": S("unknown", { assumed_state: true, supported_features: 11, friendly_name: "Bow Window gauche" }),
  "cover.bow_window_centre": S("unknown", { assumed_state: true, supported_features: 11, friendly_name: "Bow Window centre" }),
  "cover.bow_window_droite": S("unknown", { assumed_state: true, supported_features: 11, friendly_name: "Bow Window droite" }),
  "button.salon_jardin_my_position": S("unknown", { friendly_name: "Salon jardin My position" }),
  "button.salon_rue_my_position": S("unknown", { friendly_name: "Salon rue My position" }),
  "button.bow_window_gauche_my_position": S("unknown", { friendly_name: "Bow Window gauche My" }),
  "button.bow_window_centre_my_position": S("unknown", { friendly_name: "Bow Window centre My" }),
  "button.bow_window_droite_my_position": S("unknown", { friendly_name: "Bow Window droite My" }),
  "media_player.salon": S("paused", {
    source_list: ["TV", "51 Chefs d'oeuvre Classiques", "BBC World Service", "Détente", "En mode 80", "Europe 1", "Feel Good Classics", "OUI FM"],
    volume_level: 0.19, is_volume_muted: false, media_title: "Songe d'une nuit d'été", media_artist: "Felix Mendelssohn-Bartholdy, Le grand orchestre",
    media_album_name: "51 Chefs d'oeuvre Classiques", media_duration: 143, media_position: 12, media_position_updated_at: now(), shuffle: false, repeat: "off",
    device_class: "speaker", friendly_name: "Salon", supported_features: 8321599,
  }),
  "media_player.50pus8546_12_35": S("unavailable", { device_class: "tv", friendly_name: "50PUS8546/12", supported_features: 153529 }),
  "switch.smart_switch_1911296320772790805648e1e91226ec_outlet_1": S("off", { friendly_name: "TV" }),
  "switch.smart_switch_1911296320772790805648e1e91226ec_outlet_2": S("off", { friendly_name: "Switch" }),
  "switch.smart_switch_1911296320772790805648e1e91226ec_outlet_3": S("off", { friendly_name: "PS5" }),
  "switch.smart_switch_1911296320772790805648e1e91226ec_outlet_4": S("on", { friendly_name: "Multiprise Outlet 4" }),
  "switch.unnamed_room_son_mode_nuit": S("off", { friendly_name: "Salon Son mode nuit" }),
  "switch.unnamed_room_amelioration_des_dialogues": S("off", { friendly_name: "Salon Amélioration des dialogues" }),
  "switch.salon_caisson_de_basses_active_2": S("on", { friendly_name: "Salon Caisson de basses activé" }),
  "switch.unnamed_room_loudness_4": S("on", { friendly_name: "Salon Loudness" }),
  "sensor.sonoff_snzb_02d_temperature_2": S("20.5", { unit_of_measurement: "°C", device_class: "temperature", friendly_name: "Salon Température" }),
  "sensor.sonoff_snzb_02d_humidite_2": S("59.0", { unit_of_measurement: "%", device_class: "humidity", friendly_name: "Salon Humidité" }),
  "scene.allumer_salon": S("2026-05-31T14:52:44", { friendly_name: "Allumer Salon", icon: "fas:couch" }),
  "scene.monter_rdc": S("x", { friendly_name: "Monter RDC" }),
  "scene.baisser_rdc": S("x", { friendly_name: "baisser RDC" }),
  "scene.my_rdc": S("x", { friendly_name: "My - RDC" }),
  "scene.nuit": S("x", { friendly_name: "Nuit" }),
};

const entities = {};
const dev = { sonos: "dev_sonos", tv: "dev_tv", plug: "dev_plug" };
for (const id of Object.keys(states)) {
  entities[id] = { entity_id: id, area_id: id.startsWith("sun.") || id.startsWith("weather.") || id.startsWith("input_select") ? null : "salon",
    device_id: /unnamed_room|caisson|media_player.salon/.test(id) ? dev.sonos : /50pus/.test(id) ? dev.tv : /smart_switch/.test(id) ? dev.plug : null,
    entity_category: null };
}

const listeners = [];
const hass = {
  states, entities, devices: {}, language: "fr",
  areas: { salon: { area_id: "salon", name: "Salon" }, cuisine: { area_id: "cuisine", name: "Cuisine" } },
  callService(domain, service, data) {
    console.log("callService", domain, service, data);
    const ids = [].concat(data.entity_id || []);
    for (const id of ids) {
      const s = states[id];
      if (!s) continue;
      const a = { ...s.attributes };
      let st = s.state;
      const d = id.split(".")[0];
      if (service === "toggle") st = st === "on" ? "off" : d === "cover" ? (st === "open" ? "closed" : "open") : "on";
      if (service === "turn_on") st = "on";
      if (service === "turn_off") st = "off";
      if (data.brightness_pct !== undefined) { a.brightness = Math.round(data.brightness_pct * 2.55); st = "on"; }
      if (d === "light" && st === "on" && a.brightness === undefined) a.brightness = 255;
      if (service === "open_cover") { st = "open"; if (a.current_position !== undefined) a.current_position = 100; }
      if (service === "close_cover") { st = "closed"; if (a.current_position !== undefined) a.current_position = 0; }
      if (service === "set_cover_position") { a.current_position = data.position; st = data.position > 0 ? "open" : "closed"; }
      if (service === "media_play_pause") { st = st === "playing" ? "paused" : "playing"; a.media_position_updated_at = now(); }
      if (service === "media_pause") st = "paused";
      if (service === "volume_set") a.volume_level = data.volume_level;
      if (service === "volume_mute") a.is_volume_muted = data.is_volume_muted;
      if (service === "select_source") a.source = data.source;
      if (service === "shuffle_set") a.shuffle = data.shuffle;
      if (service === "repeat_set") a.repeat = data.repeat;
      if (service === "media_seek") { a.media_position = data.seek_position; a.media_position_updated_at = now(); }
      if (service === "select_option") st = data.option;
      states[id] = { state: st, attributes: a, last_updated: now(), last_changed: now() };
    }
    window.hass = { ...hass, states: { ...states } };
    window.onHassChange && window.onHassChange(window.hass);
    return Promise.resolve();
  },
  callWS(msg) {
    if (msg.type !== "history/history_during_period") return Promise.resolve({});
    const out = {};
    const t0 = Date.now() / 1000 - 24 * 3600;
    for (const id of msg.entity_ids) {
      const base = id.includes("temp") ? 20 : 57;
      out[id] = Array.from({ length: 48 }, (_, i) => ({ lu: t0 + i * 1800, s: String((base + Math.sin(i / 6) * (id.includes("temp") ? 1.2 : 4) + i * 0.02).toFixed(1)) }));
    }
    return Promise.resolve(out);
  },
};
window.hass = hass;

window.sim = (what) => {
  const set = (id, st, attrs = {}) => { states[id] = { state: st, attributes: { ...states[id].attributes, ...attrs }, last_updated: now() }; };
  if (what === "night") {
    const n = states["sun.sun"].state === "above_horizon";
    set("sun.sun", n ? "below_horizon" : "above_horizon", { elevation: n ? -14 : 24.8 });
  }
  if (what === "tv") {
    const on = states["media_player.50pus8546_12_35"].state === "on";
    set("media_player.50pus8546_12_35", on ? "unavailable" : "on", { source_list: ["HDMI 1", "HDMI 2", "Netflix", "YouTube"], source: "HDMI 1" });
    set("light.50pus8546_12_ambilight", on ? "off" : "on");
  }
  if (what === "play") set("media_player.salon", states["media_player.salon"].state === "playing" ? "paused" : "playing", { media_position_updated_at: now() });
  if (what === "lamp") set("light.lampe_salon", states["light.lampe_salon"].state === "on" ? "off" : "on", { brightness: 160 });
  if (what === "covers") {
    const p = states["cover.salon_jardin"].attributes.current_position ? 0 : 100;
    set("cover.salon_jardin", p ? "open" : "closed", { current_position: p });
    set("cover.salon_rue", p ? "open" : "closed", { current_position: p });
  }
  if (what === "images") {
    const has = !!(window.config.images && window.config.images.default);
    window.config = { ...window.config, images: has ? { ...window.config.images, default: "", rules: [] } : window.EXAMPLE_CONFIG.images };
    window.card.setConfig(window.config);
  }
  if (what === "stacked") {
    const m = (window.config.layout || {}).mode === "stacked" ? "tabs" : "stacked";
    window.config = { ...window.config, layout: { ...(window.config.layout || {}), mode: m } };
    window.card.setConfig(window.config);
  }
  window.hass = { ...hass, states: { ...states } };
  window.onHassChange(window.hass);
};

window.EXAMPLE_CONFIG = {
  type: "custom:livingroom-card",
  name: "Salon",
  icon: "mdi:sofa",
  header: { weather: "weather.saint_remy_les_chevreuse", mode: "input_select.mode_maison", show_temperature: true },
  layout: { mode: "tabs", hero_style: "banner" },
  images: { default: "", rules: [] },
  hotspots: [
    { entity: "light.lampe_salon", x: 25, y: 38, icon: "mdi:floor-lamp" },
    { entity: "switch.lampe_bibliotheque", x: 9, y: 26, icon: "mdi:bookshelf" },
    { entity: "media_player.50pus8546_12_35", x: 85, y: 57, icon: "mdi:television", tap_action: "more-info" },
    { entity: "media_player.salon", x: 76, y: 72, icon: "mdi:soundbar", tap_action: "more-info" },
  ],
  lights: [
    { entity: "light.lampe_salon", name: "Lampadaire", icon: "mdi:floor-lamp" },
    { entity: "switch.lampe_bibliotheque", name: "Bibliothèque", icon: "mdi:bookshelf" },
  ],
  covers: [
    { entity: "cover.salon_jardin", name: "Jardin", my_button: "button.salon_jardin_my_position" },
    { entity: "cover.salon_rue", name: "Rue", my_button: "button.salon_rue_my_position" },
    { entity: "cover.bow_window_gauche", name: "Bow gauche", my_button: "button.bow_window_gauche_my_position" },
    { entity: "cover.bow_window_centre", name: "Bow centre", my_button: "button.bow_window_centre_my_position" },
    { entity: "cover.bow_window_droite", name: "Bow droite", my_button: "button.bow_window_droite_my_position" },
  ],
  media: {
    player: "media_player.salon", tv: "media_player.50pus8546_12_35", tv_name: "TV Philips",
    tv_power: "switch.smart_switch_1911296320772790805648e1e91226ec_outlet_1", ambilight: "light.50pus8546_12_ambilight",
    sound_controls: ["switch.unnamed_room_son_mode_nuit", "switch.unnamed_room_amelioration_des_dialogues", "switch.salon_caisson_de_basses_active_2", "switch.unnamed_room_loudness_4"],
  },
  devices: [
    { entity: "switch.smart_switch_1911296320772790805648e1e91226ec_outlet_1", name: "TV", icon: "mdi:television" },
    { entity: "switch.smart_switch_1911296320772790805648e1e91226ec_outlet_3", name: "PS5", icon: "mdi:sony-playstation", confirm_off: true },
    { entity: "switch.smart_switch_1911296320772790805648e1e91226ec_outlet_2", name: "Switch", icon: "mdi:nintendo-switch", confirm_off: true },
    { entity: "switch.smart_switch_1911296320772790805648e1e91226ec_outlet_4", name: "Prise 4", icon: "mdi:power-socket-eu" },
  ],
  scenes: [
    { entity: "scene.allumer_salon", name: "Allumer", icon: "mdi:sofa" },
    { entity: "scene.monter_rdc", name: "Ouvrir RDC", icon: "mdi:arrow-up-bold-box-outline" },
    { entity: "scene.baisser_rdc", name: "Fermer RDC", icon: "mdi:arrow-down-bold-box-outline" },
    { entity: "scene.my_rdc", name: "My RDC", icon: "mdi:star-outline" },
    { entity: "scene.nuit", name: "Nuit", icon: "mdi:weather-night", color: "#7f5cff" },
  ],
  climate: { temperature: "sensor.sonoff_snzb_02d_temperature_2", humidity: "sensor.sonoff_snzb_02d_humidite_2", comfort_min: 19, comfort_max: 22 },
};
