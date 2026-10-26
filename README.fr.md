# Livingroom Card — piloter tout le salon depuis une seule carte

*[English version](README.md)*

Carte Lovelace personnalisée, sans dépendance, avec éditeur visuel complet.

- **Image d'ambiance vivante** : l'image change selon l'état du salon (jour/nuit, lampes, TV, volets, musique,
  mode maison) grâce à des règles évaluées dans l'ordre, avec fondu enchaîné. Sans image, une illustration
  animée du salon est générée (ciel selon le soleil, volets qui descendent, halo des lampes, TV + Ambilight, notes de musique).
- **Points interactifs** posés sur l'image : toucher la lampe pour l'allumer, la TV pour ses détails…
- **Barre de scènes** + bouton **Tout éteindre** (avec confirmation par double appui).
- **Onglets** (ou sections empilées) avec badges d'état :
  - *Lumières* : glisser horizontalement pour varier, toucher pour basculer, appui long pour les détails.
  - *Volets* : fenêtre dessinée qu'on fait glisser verticalement, boutons ▲ ■ ★ (My Somfy) ▼, commande groupée.
  - *Média* : pochette, progression cliquable, volume, favoris Sonos, réglages du son (mode nuit, dialogues, caisson…),
    TV (allumage via la prise si elle est hors réseau), Ambilight, sources TV.
  - *Appareils* : prises (TV, PS5, Switch…) avec confirmation d'extinction optionnelle et puissance.
  - *Climat* : température/humidité avec niveau de confort, tendance sur 1 h et courbe sur 24 h, météo extérieure, thermostat.
- Bascule automatique sur l'onglet Média quand une lecture démarre, mémorisation de l'onglet, retour haptique,
  thème clair/sombre, style « ambiant » (l'image floutée teinte toute la carte).

L'interface est disponible en français et en anglais (elle suit la langue de Home Assistant).

## Captures d'écran

![Carte du salon](https://raw.githubusercontent.com/Ergorock/livingroom_card/main/images/card.png)

![Éditeur visuel : général](https://raw.githubusercontent.com/Ergorock/livingroom_card/main/images/editor-general.png)

![Éditeur visuel : points interactifs](https://raw.githubusercontent.com/Ergorock/livingroom_card/main/images/editor-hotspots.png)

![Éditeur visuel : disposition](https://raw.githubusercontent.com/Ergorock/livingroom_card/main/images/editor-layout.png)

## Installation

### HACS (dépôt personnalisé)

1. HACS → menu ⋮ → *Dépôts personnalisés* → ajoutez `https://github.com/Ergorock/livingroom_card`, catégorie **Dashboard**.
2. Installez **Livingroom Card**, puis rechargez le navigateur.

### Manuelle

1. Copiez `livingroom-card.js` dans `config/www/livingroom-card.js`.
2. *Paramètres → Tableaux de bord → ⋮ → Ressources* : ajoutez `/local/livingroom-card.js?v=1.0.0` (type *Module JavaScript*).

> À chaque mise à jour du fichier, incrémentez `?v=` dans l'URL de la ressource : `/local/` est mis en cache 31 jours.

## Démarrage rapide

- **Le plus simple** : dans l'onglet *Général* de l'éditeur, choisissez la pièce **Salon** et cliquez sur
  **Importer les entités de la pièce**. Ajustez ensuite noms et icônes onglet par onglet.
- **Ou** collez `example-config.yaml` dans l'éditeur YAML de la carte : il est déjà rempli avec vos entités
  (volets jardin/rue/bow-window avec leurs boutons My, Sonos « Salon » et ses réglages, TV Philips + Ambilight,
  multiprise TV/PS5/Switch, lampadaire, bibliothèque, capteur Sonoff, scènes RDC…).

## Images

Suivez [PROMPTS.md](PROMPTS.md) pour générer les 7 ambiances avec ChatGPT, déposez-les dans `config/www/salon/`,
puis dans l'éditeur → **Ambiance** → **Générer les règles suggérées**. L'en-tête de l'onglet indique en direct
quelle règle est active, et le bouton 👁 prévisualise une image sur la carte pendant 6 s.

### Conditions disponibles dans les règles

| Condition | Vraie quand… |
|---|---|
| `night` / `day` | le soleil est couché / levé (`sun.sun`) |
| `lights_on` / `lights_off` | au moins une / aucune lumière de la carte n'est allumée |
| `tv_on` | la TV (media_player) est allumée, ou la prise TV si aucune TV n'est configurée |
| `media_playing` | l'enceinte principale est en lecture |
| `covers_closed` / `covers_open` | la position moyenne des volets est ≤ / ≥ `value` % (20 / 80 par défaut) |
| `mode` | le mode maison vaut `value` |
| `entity` | `entity` (ou son `attribute`) est / n'est pas `value` (liste séparée par des virgules), est actif/inactif, supérieur/inférieur à |

Chaque règle : `image`, `filter` CSS optionnel, `match: all | any`, `disabled`.

## Référence de configuration

| Clé | Rôle |
|---|---|
| `name`, `icon`, `area` | Titre, icône, pièce utilisée pour la découverte automatique des listes non renseignées |
| `header.weather`, `header.mode`, `header.show_temperature` | Puces de l'en-tête (le mode maison s'ouvre en menu) |
| `layout.mode` | `tabs` ou `stacked` |
| `layout.hero`, `layout.hero_style`, `layout.aspect_ratio` | Image d'ambiance, style `banner`/`ambient`, format (`3/2` par défaut) |
| `layout.wide`, `wide_breakpoint`, `wide_split` | Disposition large `auto`/`never` : image à gauche et commandes à droite dès que la carte dépasse `wide_breakpoint` px (700), l'image occupant `wide_split` % (55) |
| `layout.default_tab`, `remember_tab`, `auto_media_tab` | Gestion des onglets |
| `layout.show_summary`, `show_scenes`, `show_all_off`, `hide_unavailable`, `accent_color` | Affichage |
| `behavior.light_tap`, `hold`, `haptics`, `confirm_all_off`, `all_off.{lights,devices,media,covers}` | Interactions |
| `images.default`, `transition`, `position`, `night_dim`, `rules[]`, `overlays[]` | Ambiance visuelle |
| `hotspots[]` | `entity`, `x`, `y` (en %), `icon`, `name`, `show_name`, `tap_action` (`toggle`/`more-info`/`activate`), `color` |
| `lights[]` | `entity`, `name`, `icon`, `image`, `image_on`, `color` |
| `covers[]` | `entity`, `name`, `my_button` |
| `media` | `player`, `tv`, `tv_name`, `tv_power`, `ambilight`, `show_sources`, `sources[]`, `sound_controls[]` |
| `devices[]` | `entity`, `name`, `icon`, `power`, `confirm_off`, `image`, `image_on`, `color` |
| `scenes[]` | `entity` (scène, script, automatisation, bouton), `name`, `icon`, `color`, `confirm` |
| `climate` | `temperature`, `humidity`, `climate`, `comfort_min`, `comfort_max`, `graph`, `hours` |

## Développement

`dev/index.html` est un banc de test hors Home Assistant (hass simulé avec vos entités, boutons pour simuler
nuit/TV/lecture…). Lancez un serveur statique à la racine du dossier, par exemple :

```bash
python -m http.server 8791
```

puis ouvrez `http://localhost:8791/dev/index.html`.
