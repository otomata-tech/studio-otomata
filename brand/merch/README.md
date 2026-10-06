# merch — les fichiers d'impression

```bash
node brand/merch/build-merch.mjs      # → brand/merch/print/otomata-<pièce>.png (à commiter)
node brand/merch/build-planche.mjs    # → .gen/merch-planche.png (la planche à montrer, jetable)
```

Quatorze fichiers, tous en **PNG transparent**, côté long **4000 px**, dans `print/`.

## Ce que le merch dit — arrêté le 2026-09-04

**L'adresse devant, la phrase derrière.**

| Pose | Ce qu'elle porte | Où elle va |
|---|---|---|
| **ligne** | le mark, puis **`otomata.tech`** | poitrine (cœur), mug, casquette |
| **dos** | le mark en grand, **OTOMATA**, un filet, puis **`STUDIO DE CONCEPTION D’AGENTS IA`** | dos de t-shirt, tote bag |
| **bande** | le **glyphe colonne**, vertical | bas de vêtement, couture latérale, ourlet |
| **mark** | le mark seul | sticker rond, broderie |
| **mot** | **OTOMATA** seul | bandeau (gourde, casquette) |

La phrase du dos est **descriptive à dessein**. Dans le dos d'un inconnu, un clin d'œil interne
(« un seul branchement ») ne se comprend pas ; un fait, si. **Le 2026-10-06, elle est passée de
« La boîte à outils des agents » à « Studio de conception d'agents IA »** : la première décrivait
oto, le produit ; le merch porte la marque de la société. C'est aussi la phrase des cartes de
visite (`plaquettes/carte-visite.html`), qui la lisent ici. Les trois textes vivent en tête de
`pieces.mjs` — les changer les change partout, y compris sur la planche.

C'est la **forme de la zone** qui décide de la pose, pas le goût : une poitrine est large et
basse, la pièce du dos y deviendrait un timbre-poste ; un dos est carré, la ligne s'y perdrait.

### Le glyphe colonne

Une zone haute et étroite ne prend ni le mark ni une ligne de texte : `otomata.tech` tourné d'un
quart de tour y donne un ruban de 6:1 acceptable, la phrase du dos un ruban de **21:1**, illisible.
D'où un motif dessiné pour cette forme-là — **cinq disques cernés dont l'anneau décalé pivote d'un
cinquième de tour à chaque étage**, un automate qui tourne. Ses proportions sont celles du mark
(anneau 3 % plus grand que le disque, décalé de 15,6 % de son rayon, cerne à 6,4 %), pas des
valeurs inventées.

⚠️ **Ce n'est pas le mark et il ne le remplace jamais.** Le mark a une ombre dure et n'existe qu'en
une occurrence ; la colonne est un motif, au même titre qu'une trame. Elle vit dans `pieces.mjs` —
si elle sert ailleurs qu'au merch, c'est à `brand/logos/otomata/` qu'elle devra déménager.

## Choisir le fichier : c'est la couleur du textile qui décide

| Textile | Poitrine (cœur) | Dos / grande face | Bas, vertical | Mark seul | Nom seul |
|---|---|---|---|---|---|
| **clair** — blanc, crème, gris clair | `otomata-ligne-couleur.png` | `otomata-dos-couleur.png` | `otomata-bande-couleur.png` | `otomata-mark-couleur.png` | `otomata-mot-couleur.png` |
| **saffran ou jaune** — le hoodie jaune citron | `otomata-ligne-encre.png` | `otomata-dos-encre.png` | `otomata-bande-encre.png` | `otomata-mark-encre.png` | — |
| **foncé** — noir, encre, marine | `otomata-ligne-blanc.png` | `otomata-dos-blanc.png` | `otomata-bande-blanc.png` | `otomata-mark-blanc.png` | `otomata-mot-blanc.png` |

Pour les objets : **mug** → `ligne` (la surface s'enroule, la pièce du dos n'y tient pas) ·
**tote** → `dos` · **sticker rond** → `mark` · **sticker rectangle** → `ligne` · **gourde** → `mot`.

⚠️ **Sur un textile jaune, le mark en couleur se noie** : son disque saffran et le fond se
confondent, il ne reste que le cerne. C'est pour ça que la version encre existe — pas par goût.

⚠️ **Sur un textile foncé, la version couleur perd son cerne et son ombre**, qui sont en encre.
La version blanche garde le décalage parce que c'est le **vide** entre le disque et l'anneau qui
le porte, pas une seconde couleur.

## Le recadrage, et pourquoi il compte

Le rendu se fait sur un canevas trop grand, puis l'image est **recadrée au contenu**. Leur outil
cadre le fichier dans la zone d'impression du vêtement : une marge transparente se paie donc en
centimètres de visuel perdus. Les fichiers d'avant le 2026-09-04 en portaient **37 %**.

La part du canevas qu'occupe le contenu dépend de la pose *et* du mark — le SVG réserve lui-même
de l'air autour de l'ombre et de l'anneau. Plutôt qu'un calage à la main, qui casse à la première
retouche du mark, le build fait une **passe de mesure** : il rend petit, mesure ce que le recadrage
laisse, puis refait le rendu à l'échelle voulue. La réduction finale ne fait donc que réduire,
jamais agrandir un raster, et le build **échoue** si le côté long ne tombe pas sur 4000 px.

Conséquence : **les dimensions ne sont pas dans la table des pièces**, seulement dans les fichiers.
`service/brand.mjs` les lit dans l'en-tête PNG — la page publique annonce le fichier, pas une
intention.

⚠️ **Les fichiers sont versionnés, et c'est délibéré.** Un fichier d'impression ne change jamais :
le faire fabriquer à la demande par la box coûte jusqu'à 16 Mpx par image, là où le service est
calibré pour du 1200×1500 (1,8 Mpx) — un travail lourd, répété, pour un résultat identique. Le
poste les génère, git les transporte, le studio les sert tels quels sur **`/brand`**. 4 Mo au
total pour quatorze fichiers.

*(Rectification : une version de ce paragraphe attribuait à ces rendus une panne SSH de la box
le 2026-09-03. C'était faux — le jeton Cloudflare Access du tunnel avait expiré, la box n'a
jamais été en cause. La raison de versionner tient sans cet argument.)*

## La planche de propositions

`build-planche.mjs` monte les mêmes fichiers sur des **silhouettes dessinées** — t-shirt devant et
dos, tote, mug, stickers — et sort une affiche à montrer avant de commander. Ce sont des dessins,
pas des photos truquées : une fausse photo produit donne une idée fausse du rendu textile.

Elle n'est **pas versionnée** : c'est un document de discussion, régénéré en dix secondes, là où
les fichiers d'impression sont des livrables stables.

## Ce que Spreadshirt attend

- **PNG** — c'est le seul format qu'ils acceptent avec un fond transparent, et un fichier
  d'impression sans transparence pose un rectangle blanc sur le vêtement.
- **200 dpi**, résolution maximale **4000 × 4000 px**, fichier **≤ 10 Mo**. Nos fichiers font
  0,1 à 0,5 Mo : la marge est confortable.
- Viser 4000 px sur le côté long permet d'agrandir le visuel sur n'importe quelle zone
  d'impression sans reperdre en qualité.

⚠️ **Vérifié le 2026-09-03 sur deux sources concordantes, mais PAS à la source** : le centre
d'aide de Spreadshirt refuse l'accès automatisé (403, puis page vide). **Les dimensions de la
zone d'impression en cm ne sont donc pas confirmées ici** — elles varient par produit et par
coupe, et leur outil les affiche au moment du téléversement. S'y fier, pas à une cote recopiée.

## Ce qui a déjà été commandé (avril 2026)

Mug contrasté blanc/jaune · autocollant blanc mat 10 × 10 cm · sweat à capuche unisexe **jaune
citron**. D'où l'importance de la ligne « saffran ou jaune » ci-dessus : le hoodie est
exactement le cas où le mark en couleur ne tient pas.

## Ajouter une pièce

Une entrée dans `PIECES` (`pieces.mjs`) : sa **pose**, quel SVG de `brand/logos/otomata/` elle
prend, sa couleur d'encre, et **sur quel textile elle va**. Aucune dimension à donner — le build
s'en charge. Les marks ne sont jamais recopiés ici : ils sont lus dans `brand/logos/otomata/`,
qui fait autorité.

*(`otomata-otomata-*.png` a été renommé `otomata-dos-*.png` le 2026-09-04, en même temps que ces
pièces ont gagné la phrase : le doublon dans le nom ne disait rien, et « dos » dit où ça va.)*

*(Les anciens designs — `tshirt-design`, `tshirt-otomata` et leurs planches — ont été supprimés
le 2026-09-03 : ils étaient sur la palette anthracite `#2c3e50` abandonnée en mai 2026 et
portaient un mark qui n'existe plus. L'historique git les garde.)*
