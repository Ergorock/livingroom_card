# Prompts ChatGPT pour les images d'ambiance

La carte affiche une image différente selon l'état du salon (jour, nuit, lampes, TV, volets, musique).
Pour que le fondu entre deux images soit bluffant, **toutes les images doivent avoir exactement le même cadrage**.
La méthode la plus fiable : générer une **image de base**, puis demander à ChatGPT de **modifier cette même image**
pour chaque ambiance (dans la même conversation).

## Réglages communs

- Format : **paysage 3:2 (1536 × 1024)**, qui correspond au réglage par défaut de la carte (`aspect_ratio: 3/2`).
- Enregistrez les fichiers dans `config/www/salon/` (ils seront servis sous `/local/salon/...`).
- Convertissez en JPG ou WebP (qualité 80 %, ~200–400 Ko) pour un chargement rapide sur tablette.
- Noms attendus par les « règles suggérées » de l'éditeur :

| Fichier | Ambiance |
|---|---|
| `salon_jour.jpg` | Image par défaut : jour, volets ouverts, tout éteint |
| `salon_nuit.jpg` | Nuit, lumières éteintes |
| `salon_nuit_lumieres.jpg` | Nuit, lampadaire et lampe de bibliothèque allumés |
| `salon_tv_jour.jpg` | TV allumée en journée |
| `salon_tv_nuit.jpg` | Ambiance cinéma : TV + Ambilight la nuit |
| `salon_volets_fermes.jpg` | Jour, volets fermés |
| `salon_musique.jpg` | Musique en lecture sur le Sonos |

---

## Étape 1 — L'image de base

### Option A (recommandée) : à partir d'une photo de votre salon

Joignez une photo de votre salon prise depuis l'endroit d'où vous voulez « voir » la pièce, puis :

```
Transforme cette photo de mon salon en illustration 3D stylisée, façon maquette « diorama » douce et premium,
pour servir de fond à un tableau de bord domotique.

Contraintes :
- Format paysage 3:2, 1536×1024.
- Garde fidèlement la disposition réelle : emplacement des fenêtres, du canapé, de la TV, des meubles et des lampes.
- Vue légèrement plongeante, caméra fixe, tout le mobilier entièrement visible (rien de coupé sur les bords).
- Style : rendu 3D doux, matériaux mats, couleurs naturelles chaleureuses, éclairage de jour neutre, ombres douces.
- Ambiance : jour, volets entièrement ouverts, lumière naturelle, toutes les lampes éteintes, écran de TV noir éteint.
- Aucune personne, aucun animal, aucun texte, aucun logo, aucun filigrane.
- Laisse un peu d'espace calme en haut et en bas de l'image (des informations y seront superposées).
```

### Option B : sans photo (description de votre salon)

```
Crée une illustration 3D stylisée, façon maquette « diorama » douce et premium, d'un salon de maison française,
pour servir de fond à un tableau de bord domotique.

Format paysage 3:2, 1536×1024. Vue de face légèrement plongeante, caméra fixe, tout le mobilier entièrement visible.

Contenu de la pièce :
- Au fond, un bow-window composé de trois fenêtres côte à côte, chacune équipée d'un volet roulant
  dont le coffre est visible en haut.
- Sur le mur de gauche, une fenêtre donnant sur le jardin (volet roulant) ; sur le mur de droite,
  une fenêtre donnant sur la rue (volet roulant).
- Un grand canapé confortable en tissu face à la TV, avec quelques coussins et un plaid.
- À côté du canapé, un lampadaire avec abat-jour en tissu.
- Sur la gauche, une bibliothèque garnie de livres colorés, avec une petite lampe posée dessus.
- À droite, un meuble TV bas en bois avec une TV Philips 50 pouces (bords fins) et une barre de son Sonos
  devant l'écran ; un caisson de basses discret à côté du meuble ; une PlayStation 5 et une Nintendo Switch
  sur le meuble.
- Une plante verte, un tapis, un parquet clair.

Style : rendu 3D doux, matériaux mats, couleurs naturelles chaleureuses, ombres douces.
Ambiance : jour, volets entièrement ouverts, ciel bleu visible, toutes les lampes éteintes, écran de TV noir.
Aucune personne, aucun animal, aucun texte, aucun logo, aucun filigrane.
Laisse un peu d'espace calme en haut et en bas de l'image.
```

> Enregistrez le résultat sous **`salon_jour.jpg`**. Si un détail ne convient pas, demandez la correction
> *avant* de générer les variantes : toutes les autres images en dépendront.

---

## Étape 2 — Les variantes (dans la même conversation)

Commencez **chaque** demande par ce préambule, puis ajoutez le paragraphe de l'ambiance voulue :

```
Modifie l'image de base précédente (salon_jour). Conserve EXACTEMENT le même cadrage, le même angle de caméra,
les mêmes meubles, les mêmes proportions, les mêmes positions et le même style de rendu.
Ne change QUE l'éclairage et les éléments décrits ci-dessous. Format 3:2, 1536×1024.
```

### `salon_nuit.jpg`
```
C'est la nuit. Le ciel derrière les fenêtres est bleu nuit avec quelques étoiles, les volets sont à moitié baissés.
Toutes les lampes sont éteintes et la TV est éteinte. La pièce est sombre, éclairée seulement par une faible
lumière bleutée de clair de lune venant des fenêtres. Les meubles restent lisibles en silhouettes.
```

### `salon_nuit_lumieres.jpg`
```
C'est le soir, il fait nuit dehors (ciel bleu nuit), volets à moitié baissés.
Le lampadaire à côté du canapé est allumé et diffuse une lumière chaude et dorée (2700 K) avec un halo doux
au plafond et au sol. La petite lampe sur la bibliothèque est aussi allumée, plus faiblement.
Ambiance cosy et chaleureuse, ombres douces. La TV reste éteinte.
```

### `salon_tv_jour.jpg`
```
En journée, volets ouverts. La TV est allumée et affiche une image lumineuse et colorée (paysage naturel flou,
sans aucun texte ni logo). Le système Ambilight projette sur le mur derrière la TV un léger halo coloré
assorti à l'image. Les lampes restent éteintes.
```

### `salon_tv_nuit.jpg`
```
Ambiance cinéma la nuit : il fait nuit dehors, les volets sont entièrement fermés.
Toutes les lampes sont éteintes. La TV est allumée et affiche une scène de film aux tons bleus et violets
(sans texte ni logo). L'Ambilight projette un grand halo lumineux bleu-violet intense sur le mur derrière la TV,
qui se reflète légèrement sur le canapé et le parquet. Le reste de la pièce est dans la pénombre.
```

### `salon_volets_fermes.jpg`
```
En journée, mais tous les volets roulants sont complètement fermés. De fins rais de lumière du jour filtrent
entre les lames des volets. La pièce est dans une pénombre douce et neutre. Lampes et TV éteintes.
```

### `salon_musique.jpg`
```
Fin d'après-midi, volets ouverts, lumière chaude et dorée de coucher de soleil entrant par les fenêtres.
La barre de son Sonos diffuse de la musique : ajoute de discrètes notes de musique stylisées et lumineuses
qui flottent au-dessus de la barre de son. Le lampadaire est allumé faiblement. Ambiance détente.
```

> Pour l'ambiance **« Absent »**, inutile de générer une image : la règle suggérée réutilise `salon_jour.jpg`
> avec un filtre CSS (`grayscale(0.7) brightness(0.8)`).

---

## Étape 3 (facultative) — Calques de lueur

Les calques se superposent à l'image d'ambiance quand une entité est active, avec une opacité qui suit la
luminosité de la lampe. Avec le mode de fusion **`screen`**, le noir devient transparent : il suffit donc de
générer la lueur seule **sur fond noir pur**.

### `glow_lampadaire.png`
```
Modifie l'image de base. Conserve exactement le même cadrage. Remplace TOUT par du noir pur (#000000),
sauf la lumière émise par le lampadaire : abat-jour lumineux et halo doré chaud qui se diffuse autour
(mur, plafond, sol), exactement à la position du lampadaire dans l'image de base. Aucun autre élément visible.
```

### `glow_ambilight.png`
```
Modifie l'image de base. Conserve exactement le même cadrage. Remplace TOUT par du noir pur (#000000),
sauf l'écran de la TV allumé (lumineux) et le halo Ambilight bleu-violet projeté sur le mur derrière la TV,
exactement à la position de la TV dans l'image de base. Aucun autre élément visible.
```

Puis, dans l'éditeur → **Ambiance → Calques superposés** : entité `light.lampe_salon`, image
`/local/salon/glow_lampadaire.png`, fusion `screen`, « Opacité selon la luminosité » activée.

---

## Étape 4 (facultative) — Vignettes d'appareils

Les tuiles Appareils / Lumières acceptent une image à la place de l'icône (`image` et `image_on`).

```
Icône d'application carrée 1024×1024, style 3D doux et premium cohérent avec une illustration de salon :
une console PlayStation 5 blanche posée verticalement, légère lueur bleue, fond transparent,
aucun texte, aucun logo.
```

Déclinez avec : « une console Nintendo Switch avec Joy-Con rouge et bleu », « une TV à écran plat éteinte »,
« la même TV allumée avec un halo coloré »… Pour l'état allumé/éteint, générez deux versions
(éteinte : couleurs désaturées, sans lueur).

---

## Astuces

- **Les images se décalent légèrement d'une variante à l'autre ?** Rappelez dans la demande :
  « superposable pixel à pixel avec l'image de base ». Si un décalage persiste, régénérez uniquement
  cette variante.
- **Placer les points interactifs** : dans l'éditeur → onglet **Points**, ouvrez un point puis cliquez
  directement sur l'image pour le positionner.
- **Tester une image** sans attendre la nuit : bouton 👁 « Aperçu » à côté de chaque règle.
