# Livingroom Card — control the whole living room from a single card

*[Version française](README.fr.md)*

Custom Lovelace card, with no dependencies and a full visual editor.

- **Living ambient image**: the image changes with the state of the room (day/night, lamps, TV, covers, music,
  house mode) through rules evaluated in order, with a crossfade. Without an image, an animated illustration
  of the room is generated (sky following the sun, covers going down, lamp glow, TV + Ambilight, music notes).
- **Interactive hotspots** placed on the image: tap the lamp to turn it on, the TV for its details…
- **Scene bar** + **All off** button (with double-tap confirmation).
- **Tabs** (or stacked sections) with status badges:
  - *Lights*: swipe horizontally to dim, tap to toggle, long-press for details.
  - *Covers*: a drawn window you drag vertically, ▲ ■ ★ (Somfy My) ▼ buttons, group control.
  - *Media*: cover art, clickable progress, volume, Sonos favorites, sound settings (night mode, speech enhancement, subwoofer…),
    TV (turned on through its plug when it is off the network), Ambilight, TV sources.
  - *Devices*: plugs (TV, PS5, Switch…) with optional turn-off confirmation and power.
  - *Climate*: temperature/humidity with comfort level, 1 h trend and 24 h chart, outdoor weather, thermostat.
- Automatic switch to the Media tab when playback starts, remembered tab, haptic feedback,
  light/dark theme, “ambient” style (the blurred image tints the whole card).
- Interface in English and French (follows the Home Assistant language).

## Screenshots

![Living room card](https://raw.githubusercontent.com/Ergorock/livingroom_card/main/images/card.png)

![Visual editor: general](https://raw.githubusercontent.com/Ergorock/livingroom_card/main/images/editor-general.png)

![Visual editor: hotspots](https://raw.githubusercontent.com/Ergorock/livingroom_card/main/images/editor-hotspots.png)

![Visual editor: layout](https://raw.githubusercontent.com/Ergorock/livingroom_card/main/images/editor-layout.png)

## Installation

### HACS (custom repository)

1. HACS → ⋮ menu → *Custom repositories* → add `https://github.com/Ergorock/livingroom_card`, category **Dashboard**.
2. Install **Livingroom Card**, then reload your browser.

### Manual

1. Copy `livingroom-card.js` to `config/www/livingroom-card.js`.
2. *Settings → Dashboards → ⋮ → Resources*: add `/local/livingroom-card.js?v=1.0.0` (type *JavaScript module*).

> Each time you update the file, increment `?v=` in the resource URL: `/local/` is cached for 31 days.

## Quick start

- **Easiest**: in the editor's *General* tab, choose your living room area and click
  **Import the room's entities**. Then adjust names and icons tab by tab.
- **Or** paste `example-config.yaml` into the card's YAML editor and adapt it: it is the author's full setup
  (garden/street/bow-window covers with their My buttons, a Sonos speaker and its sound settings, Philips TV + Ambilight,
  TV/PS5/Switch power strip, floor lamp, bookcase lamp, Sonoff sensor, ground-floor scenes…).

## Images

Follow [PROMPTS.md](PROMPTS.md) (in French) to generate the 7 ambiences with ChatGPT, put them in `config/www/salon/`,
then in the editor → **Ambience** → **Generate the suggested rules**. The tab header shows live
which rule is active, and the 👁 button previews an image on the card for 6 s.

### Conditions available in rules

| Condition | True when… |
|---|---|
| `night` / `day` | the sun has set / risen (`sun.sun`) |
| `lights_on` / `lights_off` | at least one / none of the card's lights is on |
| `tv_on` | the TV (media_player) is on, or the TV plug if no TV is configured |
| `media_playing` | the main speaker is playing |
| `covers_closed` / `covers_open` | the average cover position is ≤ / ≥ `value` % (20 / 80 by default) |
| `mode` | the house mode equals `value` |
| `entity` | `entity` (or its `attribute`) is / is not `value` (comma-separated list), is active/inactive, above/below |

Each rule: `image`, optional CSS `filter`, `match: all | any`, `disabled`.

## Configuration reference

| Key | Purpose |
|---|---|
| `name`, `icon`, `area` | Title, icon, area used to automatically discover the lists left empty |
| `header.weather`, `header.mode`, `header.show_temperature` | Header chips (the house mode opens as a menu) |
| `layout.mode` | `tabs` or `stacked` |
| `layout.hero`, `layout.hero_style`, `layout.aspect_ratio` | Ambient image, `banner`/`ambient` style, aspect ratio (`3/2` by default) |
| `layout.wide`, `wide_breakpoint`, `wide_split` | Wide layout `auto`/`never`: image on the left and controls on the right once the card is wider than `wide_breakpoint` px (700), the image taking `wide_split` % (55) |
| `layout.default_tab`, `remember_tab`, `auto_media_tab` | Tab handling |
| `layout.show_summary`, `show_scenes`, `show_all_off`, `hide_unavailable`, `accent_color` | Display |
| `behavior.light_tap`, `hold`, `haptics`, `confirm_all_off`, `all_off.{lights,devices,media,covers}` | Interactions |
| `images.default`, `transition`, `position`, `night_dim`, `rules[]`, `overlays[]` | Ambient image |
| `hotspots[]` | `entity`, `x`, `y` (in %), `icon`, `name`, `show_name`, `tap_action` (`toggle`/`more-info`/`activate`), `color` |
| `lights[]` | `entity`, `name`, `icon`, `image`, `image_on`, `color` |
| `covers[]` | `entity`, `name`, `my_button` |
| `media` | `player`, `tv`, `tv_name`, `tv_power`, `ambilight`, `show_sources`, `sources[]`, `sound_controls[]` |
| `devices[]` | `entity`, `name`, `icon`, `power`, `confirm_off`, `image`, `image_on`, `color` |
| `scenes[]` | `entity` (scene, script, automation, button), `name`, `icon`, `color`, `confirm` |
| `climate` | `temperature`, `humidity`, `climate`, `comfort_min`, `comfort_max`, `graph`, `hours` |

## Development

`dev/index.html` is a test bench outside Home Assistant (mock hass with sample entities, buttons to simulate
night/TV/playback…). Start a static server at the root of the folder, for example:

```bash
python -m http.server 8791
```

then open `http://localhost:8791/dev/index.html`.
