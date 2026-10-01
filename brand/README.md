# brand — logos & charte Otomata / Oto

## 📍 Ce dossier est la source de vérité du design Otomata

**Pour toute question de charte — palette, typo, logos, tokens — c'est ici qu'on regarde, et ici qu'on met à jour.** Les autres emplacements (le monorepo `oto-websites`, le design-system du dashboard, le Drive `identite/`) en sont des **consommateurs** : ils appliquent la charte, ils ne la définissent pas.

Concrètement :
- une évolution de charte se fait **d'abord ici**, puis se propage aux consommateurs ;
- en cas de divergence entre ce dossier et un autre emplacement, **c'est ce dossier qui a raison** ;
- avant de recopier une charte trouvée ailleurs sur le disque ou sur le Drive, vérifier ici — plusieurs copies périmées circulent (voir l'avertissement sur le README du Drive, plus bas).

*(Historiquement l'inverse : ce dossier était un cache des repos d'origine. Inversé le 2026-08-12 — trop de copies divergentes, aucune ne faisant autorité.)*

**2026-08-27 — `oto-dashboard/design-system/` a été archivé, sa part de MARQUE est ici.** Décision :
le futur design system du produit sera celui du nouveau front, donc les 180 fichiers du design
system dashboard (maquettes d'écrans en JSX/HTML, UI kit, readme d'outillage) n'avaient plus de
raison d'être maintenus. Ce qui relève de la marque Otomata a été consolidé ici — tokens,
guidelines, composants de marque et explorations d'identité y étaient déjà à l'identique depuis le
12/08 ; s'y ajoutent ce jour le brief de direction artistique, les quatre maquettes d'exploration
et le point d'entrée des tokens. Le reste est supprimé d'`oto-dashboard` et vit dans son historique
git.

## Deux marques distinctes

| | **Otomata** (société) | **Oto** (produit / assistant) |
|---|---|---|
| Sites | otomata.tech | oto.cx (ex-oto.ninja), docs.oto.cx, oto.zone, dashboards |
| Couleur d'identité | **saffran `#f0b41e`** (le violet a été retiré le 2026-09-03) | **saffran `#f0b41e`** |
| Mark | **`otomata-mark.svg`** — disque saffran cerné d'encre, **ombre dure** en bas-droite et **anneau saffran décalé** en haut-gauche. Arrêté le **2026-09-03** ; avant : glyphe violet (éclair/zigzag), et plus tôt disque orange dégradé | **« open O »**, le rond cassé jaune — anneau ouvert, ouverture en haut-droite, caps arrondis (`OtoMark`, états breathe/think/talk) ; **seul mark d'oto sur toutes ses surfaces** (oto.cx, docs.oto.cx, dashboards, page de connexion) ; disque olive (oto.zone). L'anneau quatre couleurs est **retiré** depuis le 2026-09-13 |

⚠️ Ne pas confondre : la **charte produit `@otomata/ui`** (fond crème + saffran, ci-dessous) est le socle commun.

**2026-09-03 — le mark Otomata est le disque saffran décalé, l'open O reste à oto.** Les deux
marques partagent le saffran et se distinguent par la forme : **disque plein** pour la société,
**anneau ouvert** pour le produit.

⚠️ **Les trois couches font partie du mark** — l'ombre dure (sans flou ni radius), le disque
cerné d'encre, l'anneau saffran décalé. Ce ne sont pas des effets d'affiche à ajouter au goût du
support : c'est le mark, et c'est cette version-là qui a été retenue contre le disque nu. Ordre
de dessin imposé : ombre, anneau, disque. *(Une version antérieure de ce README, le même jour,
affirmait le contraire — corrigé.)*

**Le mark complet tient jusqu'à 16 px** — vérifié en planche : l'ombre porte le relief, l'anneau
reste perceptible. C'est donc lui le favicon. `otomata-mark-compact.svg` (le disque cerné seul) ne
sert que là où le support **rogne en cercle** — un avatar LinkedIn, une pastille ronde : l'ombre et
l'anneau y tomberaient hors du visible. Ce n'est pas un second logo, c'est la version rognable.

**Le violet `#863bff` a disparu de la plateforme.** Il n'était déjà affiché nulle part —
`otomata-logo-violet.svg` n'était référencé par aucun site, et le `favicon.svg` violet qui traînait
dans `otomata.tech/public/` **comme** dans `mento.cc/public/` n'était déclaré par aucune des deux
pages. Les fichiers ont été supprimés le 2026-09-03, ici comme dans `oto-websites` et `slider/`.

`otomata.tech` sert désormais **un seul fichier**, `public/logo-otomata.svg` (le mark complet),
déclaré à la fois comme `rel="icon"` et comme `logo` du JSON-LD.

## Publiée en ligne

La charte est servie par le studio sur **`studio.oto.zone/brand`** — mark et déclinaisons,
palette lue dans `theme/theme.css`, typographie, fichiers d'impression du merch, tout
téléchargeable. C'est cette page qu'on donne à un tiers, plutôt qu'un PDF en pièce jointe.
Le code : `studio-otomata/service/brand.mjs` + `service/web/brand.html`.

## Arborescence

### `charte/` — la charte formelle (document présentable)
- `charte-graphique.pdf` / `.html` — **charte graphique Otomata**, le document à envoyer à un tiers (presta, imprimeur, client). Aligné sur la palette `@otomata/ui`. Source : Drive `identite/`.
- `palette.svg` — planche de la palette

⚠️ **Le `README.md` qui accompagne la charte sur le Drive est périmé** : il décrit l'ancienne palette (orange `#E67E22`, bleu `#3498DB`, vert `#27AE60`, anthracite `#2C3E50`), abandonnée depuis. C'est `charte-graphique.html` (mai 2026) qui fait foi, et il utilise bien saffran/crème/encre. Ne pas appliquer le README du Drive.

### `slider/` — charte de slides Otomata
Charte maison pour le moteur [`otomata-tech/slider`](https://github.com/otomata-tech/slider) : `tokens.json` (palette reprise de `theme/theme.css`) + logos (**le mark Otomata et l'open O d'oto** ; le glyphe violet en est parti le 2026-09-03). Le moteur ignore `chartes/*` sauf son placeholder `blank`, donc la charte vit ici et s'y monte par lien symbolique — voir `slider/README.md`. Avant, aucune charte Otomata n'existait : tout deck sortant sous notre nom était re-charté à la main.

### `theme/` — charte canonique
- `THEME.md` / `theme.css` — **tokens de référence `@otomata/ui`** (palette + typo). Source : `oto-websites/packages/ui/`.
- `dashboard-tokens/` — tokens du design-system dashboard (colors/fonts/typography/spacing) + `styles.css`, le point d'entrée qui les `@import`. Source : `oto-dashboard/design-system/tokens/` + `styles.css`. ⚠️ **Depuis le 2026-08-27 ce n'est plus une copie mais l'ORIGINAL** : `oto-dashboard/design-system/` a été archivé (voir plus bas), et les tokens *vivants* du dashboard sont désormais son `frontend/src/assets/console.css`.

### `logos/otomata/` — marque société
**Quatre fichiers, pas un de plus** (nettoyé le 2026-09-03 : tout ce qui portait une identité
abandonnée est parti, l'historique git le garde) :
- `otomata-mark.svg` — **LE mark** : ombre dure + anneau saffran décalé + disque `#f0b41e` cerné d'encre `#2c2112`
- `otomata-mark-compact.svg` — le disque cerné seul, pour les surfaces **rognées en cercle** (avatar, pastille)
- `otomata-mark-mono-encre.svg` / `otomata-mark-mono-blanc.svg` — monochromes (fond clair / fond sombre) : l'ombre y disparaît, c'est le **vide** entre disque et anneau qui porte le décalage

Supprimés : `otomata-logo-violet.svg`, `otomata-mark-orange.svg`, `otomata-deck-disc.svg`,
`otomata-og.jpg`, `icon.svg`, `favicon.svg`. Aucun n'était référencé ailleurs que par ce README.

### `logos/oto/` — marque produit
**Le mark d'oto est l'open O, le rond cassé jaune, partout** : oto.cx, docs.oto.cx, les
dashboards, la page de connexion. Un seul dessin, `oto-dashboard-mark.svg` ; tous les rasters en
sont **rendus**, jamais retouchés à la main.
- `oto-dashboard-mark.svg` — **« open O » saffran** : LE mark, source de tout ce qui suit
- `oto-mark-16.png`, `oto-mark-32.png`, `oto-mark-48.png` — favicons, fond transparent ; l'ouverture reste lisible à 16 px (vérifié en planche, fond clair et fond sombre)
- `oto-mark.ico` — les trois mêmes en un favicon multi-taille 16/32/48
- `oto-mark-apple-touch-180.png` — apple-touch-icon, **fond crème `#fefcf5` opaque** : iOS remplit la transparence en noir
- `oto-mark-192.png`, `oto-mark-512.png` — icônes du webmanifest (Android, PWA), fond transparent
- `oto-zone-mark.svg` — disque olive (oto.zone)
- `oto-infra-mark.svg` — **« oto infra »** (13/09/2026) : l'open O saffran et un tracé de pouls vert `#a8c926` sur une pastille encre `#2c2112`. Il représente la supervision et l'exploitation, pas le produit. C'est le seul mark d'oto qui porte son fond, et c'est ce qui le garde lisible sur fond clair comme sombre (planche vérifiée : net à 32 px ; à 16 px l'anneau tient, le pouls devient une tache verte). Déclinaisons rendues : `oto-infra-mark.ico` (16/32/48), `-32`, `-192`, `-512`, `-apple-touch-180` et `-carre-1024`, carrés pleins sans arrondi (`rx="0"`), car iOS et Slack appliquent le leur. Consommateurs : l'administration Kuma `uptime.tuls.me`, servie par nginx (`infra/scripts/uptime-tuls-me/deployer-marque.sh`), et l'app Slack des alertes `#status-sla`
- `oto-icons-sprite.svg` — sprite d'icônes des sites oto

Régénérer après une évolution du mark — Inkscape, car ImageMagick délègue le SVG à
`rsvg-convert`, absent du poste :

```bash
cd brand/logos/oto
for s in 16 32 48 192 512; do inkscape oto-dashboard-mark.svg --export-type=png --export-filename=oto-mark-$s.png --export-width=$s --export-height=$s; done
inkscape oto-dashboard-mark.svg --export-type=png --export-filename=oto-mark-apple-touch-180.png --export-width=180 --export-height=180 --export-background='#fefcf5' --export-background-opacity=1
magick oto-mark-16.png oto-mark-32.png oto-mark-48.png oto-mark.ico
```

**2026-09-13 — l'anneau quatre couleurs est retiré.** `oto-mark-4colors.svg` (quatre quartiers
dégradés safran/terracotta/olive/cobalt, dit « mark oto.ninja ») était encore le favicon d'oto.cx et
de docs.oto.cx — donc aussi le logo de la page de connexion, qui lit `https://oto.cx/favicon.svg`.
Supprimé : hors de ce README, aucun fichier ne le référençait par son chemin. C'est le dessin qui
part ; terracotta, olive et cobalt restent des tokens des sites. L'ancien `oto-mark-512.png`
n'était pas un rendu du SVG (ouverture et caps décalés) : il a été re-rendu avec les autres.

### `photos/` — portraits de l'équipe
Les portraits publiés au nom d'Otomata (`alexis-laporte.jpg`, `sarah-soumahoro.jpg`, 1024×1024, fond bleu nuit commun) + leurs sources d'origine, et surtout **la procédure pour harmoniser un nouveau portrait** avec la série : `harmonise-portrait.py` (retouche du décor par modèle d'image — remplacement de fond, élargissement du cadre) et son mode d'emploi dans `photos/README.md`, dont les contrôles à faire avant publication. Servis en ligne depuis `oto-websites/sites/otomata.tech/public/equipe/`.

### `merch/` — les fichiers d'impression
`build-merch.mjs` produit quatorze PNG transparents dont le côté long fait 4000 px, **recadrés au
contenu** — une marge transparente se paierait en centimètres de visuel perdus à l'impression.
**L'adresse devant, la phrase derrière** : quatre poses (`ligne` = mark + `otomata.tech` pour la
poitrine et le mug ; `dos` = mark en grand + OTOMATA + « LA BOÎTE À OUTILS DES AGENTS » ; le mark
ou le nom seuls ; `bande` = le **glyphe colonne**, cinq disques dont l'anneau décalé pivote, dessiné
pour les zones hautes et étroites où aucun texte ne tient), chacune en version claire, encre ou
blanche. **Quel fichier prendre
dépend de la couleur du textile**, et c'est ce que dit `merch/README.md` : sur un vêtement jaune
le mark en couleur se noie, sur un vêtement foncé il perd son cerne. La table des pièces vit dans
`merch/pieces.mjs`, partagée avec le studio ; `build-planche.mjs` monte les mêmes fichiers sur des
silhouettes pour la planche qu'on montre avant de commander.

### `charte-doc/` — documentation
- `DESIGN-BRIEF.md` — **le *pourquoi* de la direction artistique** (« Manuscrit chaud », direction « 2a » : sidebar encre, cartes chaudes, rayons 8px/pill, Lucide, Familjen Grotesk + Spline Sans Mono). Ses §0-3 font autorité ; ses §4-8 inventorient le design system du dashboard de 2026 et sont de l'histoire.
- `guidelines/` — cartes HTML du design-system (brand-logo, brand-iconography, color-*, type-*, spacing-*)
- `brand-components/` — composants React de marque (`OtoMark`, `Medallion`, `Avatar`) + prompts
- `direction-exploration/direction-retenue.html` — la direction appliquée (« 2a »). Les pistes écartées, les comparatifs d'icônes et de polices et leurs captures ont été supprimés le 2026-09-03 : la direction est arrêtée, et le `DESIGN-BRIEF` en porte le pourquoi.

⚠️ **Ce dépôt est public : aucun nom de personne ne doit y entrer.** (Les maquettes d'exploration
qui portaient un utilisateur d'exemple nommé ont été supprimées le 2026-09-03.)

## Palette `@otomata/ui` (résumé)

**Neutres** — bg `#fefcf5` · surface `#ffffff` · encre `#2c2112` · mute `#6c5e44` · hairline `#dccfa8`
**Primary** (saffran) — `#f0b41e` · soft `#fbe7a8` · ink `#5a3b03`
**Sémantique** — vert chartreuse `#a8c926` (success) · rouge vermillon `#e84b16` (alerte) · bleu cobalt `#2a87d8` (info)

**Typo** — Bricolage Grotesque (display) · Hanken Grotesk (sans) · JetBrains Mono (mono). *(Fonts embarquées : `../fonts.css`.)*

Esthétique : moderne analytique, chaud, solaire. Voile jaune léger sur le fond = signature de l'écosystème.

## Consommateurs (où la charte est appliquée)

Ces emplacements **implémentent** la charte définie ici. Une évolution part d'ici et se propage vers eux ; l'inverse — recopier depuis un consommateur — est ce qui a produit les divergences constatées.

| Consommateur | Ce qu'il applique | Correspond ici à |
|---|---|---|
| `oto-websites/packages/ui/` | tokens `@otomata/ui` (`THEME.md`, `src/theme.css`), consommés en `"*"` local par `web/`, `extension/` et les `sites/*` | `theme/` |
| `oto-dashboard/frontend/src/assets/console.css` | les tokens dashboard *vivants* (`:root`), consommés en `var(--…)` par les vues console | `theme/dashboard-tokens/` |
| Drive `otomata-shared/identite/` | la charte formelle diffusée aux tiers | `charte/` |
| `oto-websites/sites/*/public/`, `oto-cli/logo.svg` | logos en production | `logos/` |
| `oto-websites/web/public/` (oto.cx), `oto-websites/sites/docs.oto.cx/public/`, `oto-dashboard/frontend/public/` | favicons d'oto, **copies à l'octet** : `favicon.svg` ← `oto-dashboard-mark.svg`, `favicon-NxN.png` ← `oto-mark-N.png`, `favicon.ico` ← `oto-mark.ico` (oto.cx et docs.oto.cx, depuis le 2026-09-13), `apple-touch-icon.png` ← `oto-mark-apple-touch-180.png` (celui du dashboard depuis le 2026-09-13 : en préprod, en prod au prochain tag de manage.oto.cx), `android-chrome-NxN.png` ← `oto-mark-N.png` | `logos/oto/` |
| `auth.oto.cx` (Logto, page de connexion) | logo et favicon = l'**URL** `https://oto.cx/favicon.svg` : suit oto.cx sans copie | `logos/oto/oto-dashboard-mark.svg` |
| `auth.oto.cx` (Logto, page de connexion) | couleurs : `primaryColor` safran `#f0b41e`, texte du bouton principal encre `#2c2112`, liens et marques de focus (libellé et contour de champ, anneaux) `#5a3b03`, posés par le **bloc CSS charte** ajouté en fin de `customCss` de Logto ; ses sélecteurs se revérifient après chaque mise à jour de Logto. Détail et retour arrière : `otomata-tech/infra`, `docs/logto-oto-dedicated.md` § « Charte de la page de connexion » | `theme/` (saffran, encre, primary ink) |
| `oto-backend/oto_mcp/brand.py` | l'open O **inliné** à l'octet (pages auto-portées, `/favicon.svg` et `/favicon.ico` de mcp.oto.cx) : une évolution du mark s'y reporte à la main | `logos/oto/oto-dashboard-mark.svg` |
| Drive `admin/legal/templates/` | les **gabarits PDF** de md2pdf (pandoc + weasyprint), sur un socle commun `otomata.css` — mark inliné, palette d'impression, Hanken/Bricolage embarquées en `@font-face` avec leur `OFL.txt`. Depuis le 11/09/2026, un gabarit **`oto`** à l'identité du produit : l'open O au lieu du disque, décor saffran en fond de page, JetBrains Mono embarquée. **Une évolution de l'open O s'y reporte aussi** : il y est inliné, pas lu dans `logos/oto/` | `logos/otomata/`, `logos/oto/`, `theme/` |
| `otomata-tech/slider/chartes/` | chartes de slides — **ne contient que `blank`, aucune charte Otomata à ce jour** | — |

⚠️ **Sur un support imprimé, la charte ne s'applique pas telle quelle** (arrêté le 2026-09-06 avec
la session legal, sur les gabarits de contrat) : le fond reste **blanc**, jamais le crème `#fefcf5`
— un aplat de fond sur un document imprimé et signé coûte de l'encre et grise les photocopies. Et
le saffran `#f0b41e` ne sert **qu'en aplat** : en texte sur blanc il tombe à ~1,9:1 de contraste,
l'accent lisible est `#5a3b03`. Le reste — mark complet, formes dures sans dégradé ni radius,
encre `#2c2112`, filets `#dccfa8` — s'applique à l'identique.

⚠️ **Une webfont n'existe pas pour un moteur d'impression** : weasyprint ne va rien chercher en
ligne. Une police de charte doit être embarquée (`@font-face` + `--base-url`) ou installée sur le
poste, sinon le document sort en repli **sans que rien ne le signale**. C'était le cas des gabarits
legal, qui déclaraient `'Inter'` — installée nulle part — depuis le début.

Vérifier la dérive — **sur les valeurs**, au 2026-08-27 : aucune.

```bash
diff -q brand/theme/theme.css /data/oto/oto-websites/packages/ui/src/theme.css
```

⚠️ **Le second `diff` d'avant le 2026-08-27 n'a plus de cible** : il comparait
`theme/dashboard-tokens/` à `oto-dashboard/design-system/tokens/`, dossier supprimé. Les tokens
dashboard n'ont plus de miroir mécanique — leur vie est dans `console.css`, et une évolution de
charte s'y porte à la main depuis ici.

⚠️ **Ne pas comparer les `THEME.md`** : la copie d'`oto-websites` porte en tête un encart « source de vérité = studio-otomata/brand » que l'original n'a pas — ils divergent donc d'un bloc, volontairement. Ce sont `theme.css` et les tokens qui portent les valeurs, et eux doivent rester strictement identiques.
