# studio-otomata — visuels de communication oto (LinkedIn)

Studio local de création de visuels dans la charte oto.cx : cartes « cas d'usage » animées, affiches « posts produit », plaquettes, bannières. Export MP4/GIF via Chrome headless + ffmpeg.

> **📍 Ce repo est la source de vérité du design Otomata.** Palette, typo, logos, tokens, charte formelle : tout est dans [`brand/`](brand/README.md), et c'est là qu'on met à jour. Les autres emplacements (`oto-websites/packages/ui`, `oto-dashboard/design-system`, le Drive `identite/`) sont des **consommateurs** — ils appliquent la charte, ils ne la définissent pas. En cas de divergence, `brand/` a raison.

## Structure

```
service/      # LE service web : API REST + IHM à gabarits (hébergé, cf. § Service web)
cards/        # générateur de cartes cas d'usage (studio + batch)
posts/        # affiches riso animées, une par post produit
plaquettes/   # one-pagers imprimables (plaquette commerciale)
site/         # visuels du site oto.cx (OG, héros, pictos)
banners/      # bannières statiques (couvertures de profil / page)
assets/       # fonts.css, icons.json, logos/ (marques tierces)
tools/        # publication (publer_schedule.py)
brand/        # logos & charte Otomata/Oto (cache local ; voir brand/README.md)
out/          # exports (ignoré), en miroir des sources :
              #   cards/ · posts/ · plaquettes/ · banners/ · articles/<slug>/
.gen/         # HTML générés + frames intermédiaires (ignoré)
```

## Cartes cas d'usage (`cards/`)

```bash
./run.sh                          # studio : formulaire + preview + export → http://localhost:7842
node cards/build-all.mjs [start count]   # batch : régénère les MP4+GIF des cas d'usage
```

- `cards/studio.html` — l'UI (formulaire + preview + export)
- `cards/server.mjs` — serveur (studio + endpoint /render)
- `cards/template-body.html` — le gabarit animé de la carte (le design, figé)
- `cards/usecases.json` — les cas d'usage (presets, chiffres = placeholders à remplacer par un vrai run oto)
- ⚠️ Les `ns`/`name` des outils cités dérivent : le backend consolide régulièrement (verbe → paramètre `op=`), sans toucher ce fichier. 30 des 64 outils cités s'étaient ainsi retrouvés fantômes (corrigé le 28/08/2026). Avant de republier les cartes, revérifier chaque `name` contre le backend (`grep -rhoE 'def [a-z_]+\(' oto-backend/oto_mcp/tools/*.py` ou `oto_list_my_tools`).

## Posts produit (`posts/`) — affiches riso animées

Affiches 1200×1500 (4:5 LinkedIn) dans la charte « riso » : tokens `@otomata/ui` THEME.md + grain papier (SVG feTurbulence), halo solaire saffran, ombres portées dures sans radius, décalage d'encrage saffran (titres, câbles), tampons/étiquettes désaxés.

```bash
node posts/build-post.mjs <slug>   # rend posts/<slug>.html → out/<slug>.mp4 + .gif
```

- `posts/otocx.html` — post lancement oto.cx (« L'OS pour vous et votre agent »)
- `posts/connectors.html` — post nouveaux connecteurs, en 2 actes : tuiles logos (grille→bandeau par morph) puis carte conversation façon cas d'usage ; les concepts oto (chips PROCÉDURE/TABLEAU, projet en ligne finale) encadrent les connecteurs — montrer l'apport d'oto, pas des connecteurs MCP « natifs ». ⚠️ Prédate le pattern « scène qui recule » ci-dessous — sa `.phrase` est une zone flex séparée, toujours réservée. Ne pas copier cette partie du fichier pour un nouveau post.
- `posts/cross-session.html` — post cross-session messaging : trois fenêtres de terminal reliées par des fils, contenu métier réel (sessions interrogées via SendMessage puis anonymisées)
- `posts/lien-verifiable.html` — post data.oto.zone : un identifiant réel (200) vs un identifiant inventé (404) sur `/acco/<id>`, la preuve qu'un permalien est vérifiable
- `posts/boucle-usage.html` — post agents qui signalent d'eux-mêmes un outil en échec (fil réponse illisible → correctif → comportement changé pour toute la flotte)
- `posts/datastore-provenance.html` — post traçabilité des tableaux agentiques : chaque valeur porte sa source
- `posts/cinq-questions.html` — post rentrée : cinq questions à poser avant de signer avec un vendeur d'agent IA (accès, traçabilité, mémoire des méthodes, droits, silence sur échec)
- `posts/zero-absence.html` — post donnée manquante codée en zéro (API Recherche Entreprises, cas Norauto) vs donnée absente déclarée
- `posts/open-data-fr.html` — post catalogue : 8 domaines d'open data FR servis par oto (tuiles → bandeau d'icônes par morph, comme `connectors.html`, mais suit le pattern « scène qui recule »), puis une requête qui croise 4 sources
- `posts/template-banniere.html` — **bannière 1584×396** : la couverture de profil, et les cinq images du **diaporama Premium**. Le titre s'ajuste seul (62 → 34 px) selon sa longueur ; le mark est injecté depuis `brand/` (Otomata ou l'open O d'oto). Statique, servi par le gabarit `banniere` du studio.
- `posts/template-identite.html` — **kit d'identité** (la carte de visite de la société) : disque saffran cerné d'encre, `OTOMATA` en encrage décalé. **Statique et multi-formats** — aucun `__seek`, un fragment unique dont le format vient des données, rendu par `build-kit.mjs` ou par le service (gabarit `kit-identite`), jamais par `build-post.mjs`.
- `posts/template-output.html` — **faux output d'agent** : la demande, puis la réponse, dans une fenêtre à **ombre dure** (c'est elle qui distingue une citation d'une vraie capture d'écran). Statique, servi par le gabarit `output-agent` du studio. Il ne porte **ni titre ni chute** : le texte est la pièce à conviction, la légende est dans le post. La taille du corps **descend seule** (22 → 11 px) jusqu'à ce que le pavé tienne — sinon c'est le dernier paragraphe, celui qui porte la question, qui se fait couper.
- `posts/photo-cadre.html` — **photo encadrée** : une vraie photo posée dans la charte (mention en mono, filet, ombre dure, couche saffran décalée, pied de marque). Elle n'est **ni recadrée ni retouchée**, et elle se dimensionne **en CSS** — un calcul JavaScript après décodage arrivait parfois après la capture, et le rendu variait de quelques pixels. Servi par le gabarit `photo-cadre` ; l'image se dépose d'abord sur `POST /api/uploads`.
- `posts/template-annonce.html` — **annonce** (adhésion, événement, partenariat) : un titre en capitales dont un mot porte le saffran, le mark qui **déborde du cadre**, les logos de tiers sur cartes et les informations pratiques en lignes à pictos. Statique, servi par le gabarit `annonce`. Composition reprise d'un visuel de Sarah (09/2026). Les logos de tiers vivent dans `assets/partenaires/` — **leur README porte les interdits de la charte French Tech**, dont l'absence d'ombre portée sur ces cartes-là. Un partenaire sans fichier dans `assets/partenaires/` — un lieu, une petite structure — se cite **par son nom** dans un cadre fin (champ `nom` + `sous`), plutôt que par un logo approximatif ; un partenaire sans logo ni nom est refusé en 400. Le mark revient en petit devant le nom du pied.
- Même pattern que les cartes : `window.__seek(t)` déterministe (styles calculés depuis t, pas de transitions CSS) + capture CDP + ffmpeg
- Affiche statique one-shot : `google-chrome-stable --headless=new --screenshot --window-size=1200,1500 --force-device-scale-factor=2`
- Direction éditoriale (validée) : une seule idée et une phrase clé par visuel ; pas de « slide de deck » ; les illustrations d'usage mobilisent procédures/tableaux/projets

### La scène occupe tout, puis recule (pattern validé)

Sur une affiche animée qui finit par une phrase clé, réserver dès le départ la place de cette phrase laisse une **zone morte visible pendant toute l'animation**. Faire l'inverse :

1. la scène occupe **toute** la hauteur disponible (scène + zone de chute) pendant l'animation ;
2. juste avant la fin, elle **recule** — `transform: scale(k)` avec `transform-origin: 50% 0%`, k ≈ 0.76 ;
3. la chute monte dans la place ainsi libérée, positionnée en `absolute bottom` d'un `.stage` commun.

`transform` n'affecte pas le layout, donc la chute doit être en position absolue dans le conteneur, pas dans le flux. Deux bénéfices : plus de zone morte, et **les contenus sont plus gros pendant l'animation** — décisif quand le visuel est lu au pouce sur un fil LinkedIn. Voir `posts/cross-session.html` (`T.zoomOut`, `ZOOM`).

⚠️ **La chute doit apparaître APRÈS la fin complète du recul, jamais pendant.** Si `T.phrase` démarre alors que `T.zoomOut` est encore en cours, il existe une fenêtre où la scène est encore grande **et** la chute déjà visible — un aperçu tronqué (miniature LinkedIn, scrub vidéo) peut tomber pile dessus et donner l'impression que l'animation est cassée (« collé », vu sur `open-data-fr.html` le 28/08). Caler `T.phrase ≥ T.zoomOut + T.zoomDur` (une centaine de ms de marge), pas un simple petit décalage après `T.zoomOut`.

### Kit d'identité (`posts/template-identite.html`) — tous les formats LinkedIn

```bash
node posts/build-kit.mjs            # tout le kit → out/posts/identite/<format>.png
node posts/build-kit.mjs og profil  # un ou plusieurs formats
```

Un **seul** fragment : le format vient des données (`window.__ID.format`, à défaut `?f=`) et
pose `data-f` sur `<body>` ; chaque format a sa propre mise en page et son propre texte (une
affiche porte le nom en grand, un bandeau porte la marque puis la phrase — jamais deux titres
en display qui se battent). **Le même fragment est servi par le studio** (gabarit
`kit-identite`, cf. `service/README.md`) : le nom, la baseline, la phrase et l'adresse y sont
des champs de formulaire.

Le disque que dessine le fragment **est** le mark Otomata — ombre dure, anneau saffran
décalé, disque cerné d'encre (`brand/logos/otomata/otomata-mark.svg`, arrêté le 03/09/2026).
Le format `avatar` en utilise la **variante compacte** (disque cerné seul) : LinkedIn rogne
en cercle, l'ombre et l'anneau tomberaient hors du visible.

`posts/identite-formats.mjs` porte la table des formats et **fait autorité pour les deux**
chemins de rendu. Ajouter un format = une entrée dans cette table + un bloc
`body[data-f="…"]` dans le fragment ; il apparaît alors seul dans le studio.

| `f` | page CSS | rendu | cible LinkedIn |
|---|---|---|---|
| `post45` | 1200×1500 | 2× → 2400×3000 | post portrait 4:5 (celui qui prend le plus de fil) |
| `post11` | 1200×1200 | 2× → 2400×2400 | post carré |
| `og` | 1200×627 | 2× → 2400×1254 | aperçu de lien / Open Graph |
| `profil` | 1584×396 | 2× → 3168×792 | couverture de profil |
| `page` | 1050×175 | 4× → 4200×700 | couverture de page entreprise |
| `avatar` | 400×400 | 2× → 800×800 | avatar / logo, **affiché en rond** |

⚠️ **La couverture de page est passée à 4200×700** (vérifié le 03/09/2026 sur deux sources
secondaires ; pas de page d'aide LinkedIn officielle trouvée). L'ancienne cote 1128×191, encore
partout dans les guides, a **exactement le même ratio 6:1** — d'où la page CSS en 1050×175
rendue 4× : elle sert les deux, la seconde en surqualité.

⚠️ Zones masquées, à ne pas remplir : sur `profil` et `page`, la photo/le logo recouvre le
bas-gauche (rien d'important avant x≈300 en 1584, x≈170 en 1050) **et** le rognage mobile mange
les côtés — d'où le groupe centré et l'URL rapatriée dans le bloc de texte plutôt qu'au bord.

⚠️ `avatar` porte un **`O` en réserve dans le disque**. Ce mark n'existe pas dans `brand/` :
c'est une création de ce kit, à y ranger s'il est adopté — et à ne pas confondre avec l'« open O »
saffran, qui est le mark du **produit** oto.

## Visuels du site — section cas d'usage d'oto.cx (`site/cas-usage/`)

Images de la section `/cas-usage` d'oto.cx, dans la charte **du site** (crème, minuscules, hairlines, squiggle, 4 accents),
pas dans la riso des posts. **Une règle de lecture commune** : trait plein encre pour ce qui est mesuré ou connu, saffran
pointillé pour ce que l'agent déduit ou produit.

| fichier | rôle |
|---|---|
| `commun.js` | le vocabulaire : palette (claire, ou encre avec `&t=encre`), étiquettes, cotes, cadres, tableau, icônes, le toit |
| `scenes.js` | les scènes : moments du récit par secteur (560×320), héros de secteur (560×580), en-tête de l'explorateur. Les moments communs à plusieurs secteurs (trouver, vendre, encaisser, se faire connaître) sont des **scènes paramétrées** : un nouveau secteur réutilise le motif et change le vocabulaire |
| `cas.js` | une illustration par cas d'usage (480×300) : les entrées du client à gauche, la sortie de l'agent à droite. Un cas valable pour plusieurs secteurs reste **neutre** ; seuls les cas propres au BTP parlent chantier |
| `i18n.js` | la langue (`?l=en`) : chaque libellé passe par `T()`, table reprise des surcouches anglaises du site. **Une traduction manquante lève une erreur**, et `verifier-i18n.mjs` bloque le build avant tout rendu anglais. Les images de partage ont leurs phrases entières par langue (`TEXTES` dans `visuels.html`) |
| `moments.html` | rend une scène : `?v=<secteur>-NN`, `hero-<secteur>`, `hero-explorateur`, `cas-<slug>` |
| `visuels.html` | images de partage (`og-index`, `og-<secteur>`, 1200×630) et les premiers héros (index, btp) |
| `pictos/`, `pictos/fonctions/` | secteurs et fonctions, SVG `currentColor` (viewBox 32, trait 2), à inliner |

```bash
site/cas-usage/build.sh /data/oto/oto-website/web/public/cas-usage   # rend tout, puis dépose (chemin absolu)
```

- Chaque visuel à texte existe en français et en anglais (`en/` sous le dépôt, mêmes noms). Quand une langue allonge un libellé, la mise en page s'adapte à la longueur **traduite**, sans bouger le français publié.
- Le dépôt ne pose que ce que le site sert. **Un fichier déjà publié n'est jamais remplacé** (identique : rien ; différent : signalé et laissé) : le supprimer du site d'abord
  pour le redéposer (les moments BTP publiés datent d'avant la factorisation dans `commun.js`, leurs barres de valeur diffèrent de quelques pixels).
- Les héros sont des images et pas des SVG : un SVG chargé en `<img>` n'a pas accès aux polices de la page.
- Ajouter un secteur : ses moments dans `SCENES`, son dessin dans `HAUTS`, son image de partage dans `OG_SECTEURS`, son nombre de moments dans `build.sh`.
- ⚠️ Aucun logo ni nom de client, aucun chiffre de gain, **aucune mention de maturité** (retirée du site le 24/09/2026). Une réalisation se cite dans le texte de la page, jamais dans l'image.

## Bannières (`banners/`) — couvertures statiques

Images fixes dans la même charte riso, pour les couvertures de profil et de page.

```bash
google-chrome-stable --headless=new --disable-gpu --hide-scrollbars --no-first-run \
  --user-data-dir=/tmp/oto-build-chrome-banner --virtual-time-budget=8000 \
  --force-device-scale-factor=2 --window-size=<W>,<H> \
  --screenshot=out/banners/<slug>.png "file://$PWD/banners/<slug>.html"
```

- `banners/linkedin.html` — couverture de profil LinkedIn, 1584×396 (rendu 2× → 3168×792)
- `--virtual-time-budget` est nécessaire : sans lui le screenshot part avant le chargement des fonts
- Zones à respecter sur LinkedIn : la photo de profil recouvre le bas-gauche (rien d'important avant x≈300), et le rognage mobile mange les côtés — garder le texte porteur au centre

### Logos de marques (`assets/logos/`)
- `cdn.simpleicons.org/<slug>` : reddit (`#FF4500`), zoho (`#E42527`) — **salesforce absent** → SVG Wikimedia Commons ; LightOn → SVG du CDN de lighton.ai, livré `fill="white"` → recolorer en encre `#2c2112`
- Le backend oto passe par logo.dev (token env `LOGODEV_TOKEN`) — non disponible localement, ne pas compter dessus ici

## Service web (`service/`) — l'IHM et l'API hébergées

Le studio destiné à **quelqu'un d'autre que celui qui écrit les gabarits** : on choisit un
gabarit, on remplit un formulaire dérivé de son manifeste, on regarde, on exporte. Rien ne
peut sortir de la charte — un gabarit qu'on ne sait pas décrire en champs n'entre pas.

```bash
node service/server.mjs          # → http://127.0.0.1:8100 (STUDIO_PORT, STUDIO_HOST)
```

| pièce | rôle |
|---|---|
| `service/render.mjs` | moteur : un Chrome persistant, une **file sérialisée**, ffmpeg. Pointe mesurée **~900 Mo de RSS** par rendu — deux en parallèle sur une petite box, c'est le gel. |
| `service/templates.mjs` | registre des gabarits : manifeste de champs + construction de l'HTML + validation. **Ajouter un gabarit = ajouter une entrée ici**, rien n'est découvert dynamiquement. |
| `service/server.mjs` | API REST + service des fichiers + IHM statique. |
| `service/uploads.mjs` | les images déposées, stockées **hors des travaux** (`out/uploads/`) : un `job.json` ne garde qu'un identifiant, sinon la galerie relirait une image en base64 toutes les 15 s. L'identifiant est l'empreinte du contenu. |
| `service/photos.mjs` | l'**atelier photo** : recadrer, égaliser, et retoucher **une zone** au modèle d'image. Le résultat est un dépôt dérivé, réutilisable par tous les gabarits ; l'originale reste intacte. |
| `service/photo-ops.js` | les **formules d'image**, en arithmétique pure sur des pixels RGBA (niveaux liés, sigmoïde, HSL, masque flou en fenêtre glissante). Tourne dans le Chrome du service, et tel quel dans Node pour être comparé à sa référence. |
| `service/web/index.html` | l'IHM : formulaire **dérivé du manifeste**, aperçu, galerie des rendus avec leur statut. |
| `service/brand.mjs` + `web/brand.html` | la page **`/brand`** : la charte en accès **public** (mark, palette lue dans `brand/theme/theme.css`, typo, fichiers d'impression du merch). Préfixe unique pour qu'un seul bypass Cloudflare Access l'ouvre sans ouvrir le générateur. |
| `service/kit.mjs` + `web/kit.html` | la page **`/kit`** : les visuels FIXES de la marque (un par emplacement LinkedIn), rendus au premier accès puis gardés en cache sous une empreinte des sources. L'IHM est un générateur ; le kit, un endroit où retrouver. |

**API** — `GET /api/templates` · `GET /api/templates/:id` (manifeste + `example`) · `GET /api/kit` ·
`POST /api/previews` → une URL d'aperçu HTML éphémère (10 min) ·
`POST /api/renders` {template, data, formats} → le travail, rendu **en tâche de fond** ·
`GET /api/renders` (galerie) · `GET /api/renders/:id` · `GET /files/:id/:nom` · `GET /healthz` ·
`POST /api/uploads` (corps **binaire**) → l'identifiant d'une image ·
`POST /api/uploads/:id/derivees` {recadre, egalise, ia, zone, prompt} → une photo dérivée ·
`GET /api/capacites` (ce que le service sait faire ici).
Le code HTTP ne se dérive **jamais** du corps : un travail porte son propre `status` métier
(`en_cours` / `fini` / `échoué`), les échecs passent par une exception portant son code.

**Auth : aucune, volontairement.** Le service écoute en **loopback** ; l'exposition passe par
Caddy et l'authentification par **Cloudflare Access** devant le vhost — même patron que
`mucho.oto.zone` (cf. `/data/infra/Caddyfile`). ⚠️ Conséquence directe : **le record DNS ne se
crée qu'une fois la politique Access posée**, jamais avant.

Repères mesurés sur ce poste (28 cœurs) : une carte en PNG ≈ 1 s ; la même en PNG + MP4
(121 images) ≈ 13 s. Sur un vCPU de box, compter plusieurs fois plus.

**Chrome est rendu après 10 min sans rendu** (`STUDIO_CHROME_IDLE_MS`) et repart au suivant :
au repos le service ne pèse que son Node. Les travaux sont purgés au-delà des 60 plus
récents (`STUDIO_KEEP`).

**Déploiement** (unité systemd avec ses plafonds mémoire, vhost Caddy, ordre d'installation) :
`service/deploy/README.md`. ⚠️ Les trois lignes `Memory*` de l'unité ne sont pas
décoratives — sur otomata-0, `system.slice` n'a aucune limite.

### L'atelier photo — recadrer, égaliser, et une zone confiée au modèle

Une photo d'événement arrive rarement prête : mal cadrée, sous-exposée, terne. L'atelier
(bouton **« Retoucher »** à côté d'une photo déposée, ou `POST /api/uploads/:id/derivees`)
fait trois choses, dans cet ordre, et rend **un nouveau dépôt** — l'originale ne bouge pas.

1. **Recadrer** — une zone tracée à la souris, transmise en **fractions** de l'image (0 → 1),
   jamais en pixels : ce qu'on désigne à l'écran vaut sur le fichier pleine résolution.
2. **Égaliser** — passe déterministe, celle qui fait l'essentiel du travail : étirement des
   niveaux, sigmoïde de contraste, brillance et saturation en HSL, masque flou.
3. **Retoucher une zone** au modèle d'image, avec une consigne libre.

**Tout passe par le Chrome du service, pas par un outil à installer.** Le studio n'a aucune
dépendance : mettre ImageMagick sur la box pour cela aurait ajouté un binaire système à un
service qui n'en demande aucun, et `sharp` un binding natif à recompiler par architecture.
Le canvas fait le recadrage (`drawImage`) et le composite masqué (`blur` + `destination-in`) ;
les quatre opérations de la passe déterministe sont écrites en arithmétique sur les pixels
dans `service/photo-ops.js`, parce que les filtres CSS (`contrast()`, `saturate()`) ne sont
**pas** la sigmoïde ni le `modulate` d'ImageMagick et auraient donné un autre rendu.

Ces formules ont été **mesurées** contre ImageMagick 7.1.2, pas devinées : `-auto-level` est
un étirement **lié** (min/max pris sur les trois canaux ensemble, sinon les couleurs virent),
`-modulate` travaille en **HSL**, la sigmoïde s'applique en **sRGB sans linéarisation**, et le
facteur 2 du seuil d'`-unsharp` est bien celui d'IM. Écart du livrable final : **0,35 %**,
dont 0,14 % de simple ré-encodage JPEG — quand la passe elle-même en produit 4,26 %. Le
redressement EXIF est fait par Chrome au décodage, vérifié identique à `-auto-orient`.
Le masque flou tourne en **fenêtre glissante** (253 Ko au lieu de 172 Mo de tampons). Mesuré
sur la box : égalisation d'une photo de 7 Mpx **2,5 s**, retouche IA **27 s** (le modèle),
pointe de **891 Mo** sur les 1400 autorisés. Une passe emprunte la même file que les rendus,
jamais en parallèle.

⚠️ **Pourquoi la zone est obligatoire pour la passe IA.** Mesuré le 15/09/2026 sur la photo
du Grand Bain : le modèle **régénère toute l'image et réécrit les textes**, malgré la
consigne de tout conserver — badge « STARTUP » → « STUNTLID », t-shirt « otomata.tech » →
« ctamalatach », logos du fond déformés. Sa sortie entière est inutilisable. On n'en garde
donc que la zone demandée, fondue par un masque adouci (flou de 18 px) sur la photo égalisée,
après remise à la taille EXACTE de la base — sinon le composite décale la zone. Mesure du
résultat : **13,9 % d'écart dans la zone, 0,11 % hors zone** — le bruit de recompression JPEG.
Corollaire pour qui s'en sert : **pas de texte dans la zone**.

### S'en servir depuis oto (agents)

Le studio est un connecteur `http` de l'org Otomata (instance `org:2:http:studio`) : n'importe quel Claude branché sur oto peut produire un visuel, pas seulement le studio dans un navigateur. Appels, épinglage d'instance et raison du réseau privé : **[`service/README.md`](service/README.md)**.

## Pré-requis
`google-chrome` + `ffmpeg` (déjà présents sur ce poste), et rien d'autre : **aucune
dépendance npm, aucun `node_modules`**. `GEMINI_API_KEY` dans l'environnement débloque la
seule retouche IA de l'atelier photo ; sans elle, l'atelier recadre et égalise, et l'API
répond 503 avec le motif au lieu d'échouer obscurément.

## Exports
Les exports sortent dans `out/<famille>/` — `out/cards/`, `out/posts/`, `out/plaquettes/`, `out/articles/<slug>/` (illustrations statiques d'articles, sources dans `article-<slug>/`). Les scripts créent leur sous-dossier eux-mêmes. LinkedIn : préférer le **MP4** (le GIF natif y est souvent rendu statique).

**Fond de visio** — `node posts/build-fond-visio.mjs` → `out/visio/fond-visio-otomata.{mp4,png}` (1920×1080, boucle de 12 s). ⚠️ **Google Meet n'accepte qu'une image fixe** en fond personnalisé (ses fonds animés sont ceux de Google) : le PNG pour Meet, le MP4 pour Zoom et Teams, ou pour Meet via une caméra virtuelle (OBS). Le centre reste vide et immobile — c'est là qu'on est assis, et un fond qui bouge derrière la tête fait hésiter le détourage.

## Gotchas (rendu Chrome headless, cet environnement)
- **Toujours** lancer Chrome avec un `--user-data-dir` **isolé** (ex. `/tmp/oto-build-chrome`). Sans ça, il partage le profil par défaut du navigateur GUI → ferme les fenêtres de l'utilisateur **et** fait échouer le rendu.
- `Target.createTarget` : **ne pas** passer `width`/`height` (erreur « Target position can only be set for new windows » avec un profil isolé). Fixer la taille via `Emulation.setDeviceMetricsOverride`.
- Le sandbox de l'agent **tue les serveurs/process de fond longs** (exit 144). Lancer `server.mjs` soi-même dans un terminal ; les batchs finis (`build-all.mjs`, `build-post.mjs`) passent en tâche de fond OK.

## Publication
Publer (SaaS) — voir `tools/publer_schedule.py`. Connecteur oto à venir : `otomata-tech/otomata-private#60`.
Gotcha : le plan Publer **trial refuse la publication** (job `complete` mais `payload.failures`) → plan payant requis.

## Licence & marques
Code sous [MIT](LICENSE). Les logos tiers (`assets/logos/` : Salesforce, LightOn, Reddit, Zoho, Anthropic/Claude, OpenAI, Mistral, Google Gemini…) sont des marques de leurs propriétaires respectifs, utilisées ici à titre nominatif dans des visuels de communication — ils ne sont pas couverts par la licence MIT.
