# Le studio, côté service

### S'en servir depuis oto (agents)

Le studio est un **connecteur `http`** de l'org Otomata, instance **`org:2:http:studio`**
(`inst:169`, posée le 02/09/2026, visible de toute l'org). N'importe quel Claude branché sur
oto peut donc produire un visuel — pas seulement le studio dans un navigateur.

```
http_doc(_instance="org:2:http:studio")                    # le contrat : gabarits, champs,
                                                           # valeurs autorisées, marche à suivre
http_get(path="/api/templates/carte-cas-usage", …)         # le manifeste + un exemple complet
http_post(path="/api/renders", body={template, data, formats}, …)
http_get(path="/api/renders/<id>", …)                      # jusqu'à status = fini
                                                           # puis /files/<id>/<nom>
```

**Épingler l'instance à chaque appel** (`_instance=`) : le connecteur `http` est multi-compte
et la pose d'une clé d'org **exige** de nommer le compte (`409 account_required`). Un appel
sans épinglage devient ambigu dès qu'un second pont existe. Dans un projet oto, le lien vers
le connecteur porte l'`instance_ref` une fois pour toutes — comme le projet « Administration
& finances » le fait déjà pour désigner le bon Pennylane.

**Pourquoi le réseau privé et pas l'URL publique.** `studio.oto.zone` est fermé par Cloudflare
Access, qui exige **deux** en-têtes ; le connecteur `http` d'oto n'en pose **qu'un** (vérifié
dans `providers/http.py`). Un agent ne peut donc pas franchir Access, quoi qu'on configure. Il
passe par `http://172.16.16.3:8100`, l'adresse privée d'otomata-0 — sans Cloudflare, sans
secret à faire tourner, comme le pont Movinmotion. Les humains gardent Access, les machines le
réseau privé.

**Le contrat est servi, pas écrit à la main** : `/openapi.json` est dérivé du registre de
gabarits, valeurs d'énumération comprises. Un gabarit ajouté s'y décrit tout seul — il n'y a
pas de documentation à tenir à jour en parallèle.

**Les agents le trouvent par une procédure d'org, `visuel-otomata`** (org Otomata, posée le
11/09/2026) : c'est ce qu'un agent consulte en premier (`oto_procedure op=list`), dans n'importe
quel projet. Avant elle, le studio n'était documenté que dans le projet « Contenu LinkedIn » — et
un Claude qui travaillait ailleurs a refait un visuel en HTML à la main, hors charte. Un gabarit
ajouté apparaît seul dans le contrat ; le tableau « quel gabarit pour quoi » de la procédure, lui,
se complète à la main.

### La page `/brand` — la charte, en accès PUBLIC

`GET /brand` : le mark et ses déclinaisons, la palette, la typographie, les fichiers d'impression
du merch. Tout y est téléchargeable. C'est la page qu'on donne à un imprimeur, un presta ou un
partenaire — elle remplace l'envoi d'un PDF de charte par pièce jointe.

- `GET /brand/api` — le même en JSON.
- `GET /brand/logo/<variante>.svg` et `-<taille>.png` — le mark, servi depuis `brand/logos/otomata/`.
- `GET /brand/merch/<pièce>.png` — un fichier d'impression, **servi tel quel** depuis `brand/merch/print/`.
- `GET /brand/photo/<slug>.jpg` — un portrait publié de l'équipe (liste fermée ; `photos/sources/` reste privé).

**Un seul préfixe, et c'est le point** : une politique Cloudflare Access en **bypass** sur
`studio.oto.zone/brand` ouvre la charte au public en laissant le reste du studio fermé — le
générateur, les rendus, la galerie, l'API. Poser le bypass sur autre chose que ce préfixe
ouvrirait le pilote de rendu.

⚠️ **Le merch n'est PAS rendu à la demande.** Un PNG de 4000×4000 fait 16 Mpx, contre 1,8 pour
un visuel de post : c'est neuf fois le travail pour lequel le service est dimensionné, et le
résultat ne change jamais. Les fichiers d'impression sont donc **générés sur le poste et
versionnés** dans `brand/merch/print/`. Restent rendus à la demande les seuls PNG de logo,
plafonnés à 1024 px (1 Mpx), sur une liste fermée de tailles — une taille hors liste répond 404
sans rien fabriquer.

*(Le 2026-09-03, une panne de SSH survenue pendant un préchauffage a d'abord été mise sur le dos
de ces rendus. À tort : le jeton Cloudflare Access du tunnel avait expiré — `~/.cloudflared/`
n'avait plus que le `.lock`. Se méfier de « la box souffre » quand le symptôme est un timeout au
banner exchange : c'est le signe d'un ProxyCommand qui attend une authentification, pas d'une
machine chargée.)*

La palette et la typo sont **lues dans `brand/theme/theme.css`**, pas recopiées : la page publique
dit forcément la même chose que les tokens que les sites importent. (Depuis le 13/10/2026, ce qui est
propre à Otomata — logos, palette, portraits, merch, notes — vit dans `service/marques/otomata.mjs` ;
`brand.mjs` n'est plus que le moteur commun aux marques, cf. § « Deux marques ».)

### La page `/kit` — les visuels fixes de la marque

L'IHM de la racine est un **générateur** : on remplit, on rend, et le rendu part dans une
galerie purgée au-delà des 60 derniers travaux. Un logo de page LinkedIn n'a rien à y faire —
il ne se remplit pas, il ne change pas, et il doit rester à la même adresse. D'où `/kit` :

- `GET /kit` — la page : un visuel par emplacement LinkedIn, sa cote livrée, son PNG à télécharger.
- `GET /api/kit` — le même en JSON (formats, cotes, URL, ce qui est déjà en cache).
- `GET /kit/<format>.png` — le visuel plein format ; `-apercu.png` sa version réduite (900 px).
- `GET /kit/logo/<variante>.svg` — le mark, servi **depuis `brand/`** (pas de copie) : `mark`, `compact`, `mono-encre`, `mono-blanc`.
- `GET /kit/logo/<variante>-<taille>.png` — le même rastérisé et **transparent**, aux tailles déclarées dans `LOGOS` (une taille hors liste est refusée en 404 plutôt que rendue au hasard).
- `GET /kit/diapo/<1-5>.png` — les cinq images du **diaporama de profil** (option Premium ; `-apercu.png` idem).

Le kit rend **à la demande au premier accès** (quelques secondes par format, sérialisées par
la file du moteur), puis sert depuis `out/kit/`. Les fichiers portent une **empreinte des
sources** (dessin + table des formats + données) : la charte change → l'empreinte change → les
visuels se refont seuls, sans purge à faire à la main. Les données sont l'`example` du gabarit
`kit-identite` : une seule source, sinon la page du kit et le formulaire montreraient deux
identités qui divergent en silence.

⚠️ **`out/` est gitignoré** : sur la box, le cache est vide après un déploiement, et c'est le
premier visiteur qui paie le rendu. C'est voulu — un binaire généré n'a pas à vivre dans le
dépôt — mais ça veut dire qu'il ne faut pas s'étonner du délai au premier chargement après
chaque `git pull`.

Le favicon (`service/web/favicon.svg`) est **le mark complet** : vérifié à 16 px, l'ombre porte le
relief et l'anneau reste perceptible. La variante compacte ne sert qu'aux surfaces **rognées en
cercle** (l'avatar du kit), où l'ombre et l'anneau tomberaient hors du visible.

⚠️ **Un PNG de logo doit être transparent**, sinon il n'est posable que sur du blanc. D'où l'option
`transparent` du moteur (`Emulation.setDefaultBackgroundColorOverride`) — et **elle vit sur la
session Chrome, pas sur le rendu** : `render.mjs` la remet à zéro à la fin, faute de quoi les
visuels suivants sortiraient troués. Vérifié par un test qui rend un visuel juste après un logo.

⚠️ **Le diaporama est une option Premium du PROFIL personnel** (5 images, 1584×396, PNG, 8 Mo
chacune), pas de la page entreprise — qui garde sa couverture unique en 4200×700. Les cinq
défilent en boucle : chacune tient seule et répète l'adresse, personne n'attend l'image suivante.

### Deux marques : Otomata et le Cowork de l'IA

Depuis le 13/10/2026 le studio sert une seconde marque, **le Cowork de l'IA** (un lieu Otomata à
Marseille 6e, ouverture au printemps 2027, cowork.otomata.tech). Une **marque** porte ses logos, sa
charte (palette, typo, ce qui lui est propre) et son kit ; les moteurs et les pages sont communs :

| pièce | rôle |
|---|---|
| `service/marques.mjs` | le registre des marques, et la règle des adresses |
| `service/marques/otomata.mjs` | Otomata : logos, palette lue dans `theme.css`, kit `kit-identite` + diaporama, portraits, merch |
| `service/marques/cowork.mjs` | le Cowork : logos de `brand/logos/cowork/`, palette et typo lues dans `brand/cowork/tokens.json`, les quatre tons d'affiche, le kit |
| `service/marques/cowork-affiche.mjs` | le dessin des affiches (`posts/cowork/affiche.js`) exécuté dans Node, et ses énumérations |
| `service/kit.mjs`, `service/brand.mjs` | les moteurs du kit et de la charte, paramétrés par une marque |
| `web/kit.html`, `web/brand.html` | une page pour toutes les marques : elles lisent leur marque dans l'adresse |

**Adresses.** Otomata garde les siennes, inchangées. Le Cowork prend les mêmes sous son identifiant :

| | Otomata | Cowork de l'IA |
|---|---|---|
| charte (PUBLIQUE) | `/brand`, `/brand/api`, `/brand/logo/…` | `/brand/cowork`, `/brand/cowork/api`, `/brand/cowork/logo/<variante>.svg` et `-<taille>.png` |
| kit | `/kit`, `/api/kit`, `/kit/<format>.png`, `/kit/logo/…`, `/kit/diapo/…` | `/kit/cowork`, `/api/kit/cowork`, `/kit/cowork/<format>.png` (et `-apercu.png`), `/kit/cowork/logo/…` |

`GET /api/marques` donne la liste à l'IHM, qui a un sélecteur de marque au-dessus du gabarit : il
filtre les gabarits (chaque gabarit porte un champ `marque`) et fait suivre les liens du kit et de la
charte. Le lien `/#cowork` ouvre le générateur sur la marque.

⚠️ **`/brand/cowork` est public**, comme tout `/brand` (bypass Cloudflare Access sur le préfixe) : c'est
voulu. Ce qui y est servi : la page, son JSON, les logos. Les quatre affiches d'exemple des tons sont
des **SVG produits dans Node et posés dans le JSON** — aucune route publique ne déclenche un rendu
Chrome, hors les PNG de logo sur liste fermée de tailles (même règle qu'Otomata).

**Les logos larges** (`cowork-logo.svg`, mark + nom) se rastérisent à leur forme : la taille demandée
est une largeur, la hauteur suit le `viewBox` (1024 → 1024×339). Un SVG sans `viewBox` lève une erreur.

### L'affiche du Cowork de l'IA

**Ce qui fait autorité** : le design system « Cowork de l'IA » publié sur Claude Design
(<https://claude.ai/artifact/NHNVP9oFub3DLSPXVHPCbj>) pour le dessin et les jetons ;
`brand/logos/cowork/` pour le logo. Le dépôt en garde **une copie de chaque**, lue partout :
`posts/cowork/affiche.js` (le bundle, à l'octet, sous un en-tête qui dit d'où il vient) et
`brand/cowork/tokens.json`. Une évolution se décide sur le design system, puis se recopie ici.

**Le dessin tourne dans Node, pas dans la page.** `affiche.js` est un script de navigateur
(`window.CoworkIA`) : on l'exécute dans un contexte `vm` qui lui fournit un `window`, et le gabarit
pose le SVG obtenu dans `posts/cowork/template-affiche.html` (polices + cadre). Deux effets : aucune
donnée de formulaire n'entre dans un `<script>` (le dessin échappe lui-même ses textes), et les
énumérations du formulaire — motifs, tons, formats — **sont celles du dessin** : un ton ajouté au
design system apparaît seul dans l'IHM et dans `/openapi.json`.

**L'option `format`, ajoutée par le studio le 13/10/2026, est à reporter sur le design system.** Le
bundle publié ne connaissait que le carré (1200×1200) et `hero` (3:2, 1200×760). La copie ajoute une
table `FORMATS` — `carre`, `paysage` (= `hero`), `portrait` 1200×1500, `apercu` 1200×627, `profil`
1584×396, `page` 1050×175 — qui place kicker, motif, titre et pied pour chaque cadre, la mer étendue
à toute la largeur, la taille du titre bornée aussi en hauteur sur les formats bas, et un pied qui
accepte une liste de lignes. `CoworkIA.FORMATS` est exporté. **API rétro-compatible, et carré comme
3:2 rendent le même SVG qu'avant, à l'octet** (722 combinaisons comparées chaîne pour chaîne). Le
diff se retrouve en comparant `components/bundle.js` du design system à `affiche.js` privé de son
en-tête.

⚠️ **Le 3:2 (`paysage`/`hero`) n'est composé que pour le motif marseille** : les quatre autres motifs y
gardent leurs cotes du carré et passent sous le titre. C'est le dessin d'origine, gardé tel quel ; le
gabarit ne propose donc pas ce format.

**Le gabarit `affiche-cowork`** : format (`carre`, `portrait`, `apercu`, `profil`, `page`, aux cotes des
emplacements de `posts/identite-formats.mjs` — vérifié au démarrage), motif, ton, titre (1 à 3 lignes),
kicker, pied, chiffre. Ce qui dépend du format (lignes de titre, de kicker, de pied, longueur d'une
ligne de pied) ou d'un autre champ (le chiffre n'existe qu'avec le motif `chiffre`, et y est
obligatoire) passe par le crochet **`check(data)`** du gabarit, que `validate` appelle : ses refus
arrivent avec les autres, en 400.

**Le kit Cowork** reprend les six emplacements LinkedIn : post 4:5, carré et aperçu de lien en affiche
« marseille » ton soleil (comme l’accueil du site) ; couvertures de profil et de page en affiche couchée, soleil levant à droite,
titre et pied hors de la zone de la photo, ton mer ; avatar = le mark **compact** sur crème. Ses visuels passent
par le gabarit (mêmes contrôles que le formulaire).

⚠️ **Le ton `mer` ne va qu'avec le motif `soleil`** : sur le fond cobalt, la double impression
saffran ou terra (mode produit) des autres motifs vire au vert sale. Le dessin lève une erreur, le
gabarit refuse en 400 (règle reportée au design system). Le kit prend donc le ton `soleil` pour ses
affiches marseille, comme l'affiche d'accueil du site.

⚠️ **Les affiches pèsent lourd : un JPEG à côté du PNG.** Le grain de papier est un bruit pixel par
pixel : un 4:5 rendu 2× pèse ~9 Mo en PNG, la couverture de page ~3,4 Mo — au-delà des **3 Mo** que
LinkedIn accepte pour une couverture de page. Le gabarit et le kit Cowork livrent donc aussi un
**JPEG qualité 90** (option `jpeg` du moteur : une seconde capture, `files.jpg`), et le kit le sert
sous `/kit/cowork/<format>.jpg`. Le PNG reste la version sans perte. *(Un premier essai réduisait le
PNG à 256 couleurs : ~2× moins lourd, mais encore 4,7 à 6 Mo pour un 4:5 — abandonné au profit du JPEG.)*

### Les gabarits

Un gabarit = une entrée dans `service/templates.mjs` (manifeste de champs + construction
de l'HTML) et un fichier de dessin. **Rien n'est découvert dynamiquement** : un gabarit
qu'on ne sait pas décrire en champs n'entre pas dans le studio. En contrepartie, l'ajouter
suffit — il apparaît seul dans le formulaire, dans `/openapi.json`, et donc chez les agents,
sans une ligne de front ni de documentation à écrire à côté.

| gabarit | format | ce qu'il porte |
|---|---|---|
| `carte-cas-usage` | 1080×1080 | une demande en langage courant, les outils qu'oto enchaîne, le résultat |
| `affiche-recul` | 1200×1500 | le pattern validé : la scène occupe tout, puis **recule** pour laisser monter la chute |
| `kit-identite` | 6 formats | la carte de visite de la marque : post 4:5, carré, aperçu de lien, couvertures de profil et de page, avatar |
| `banniere` | 1584×396 | une couverture, ou l'une des cinq images du diaporama Premium : un mark, une phrase, une adresse |
| `affiche-cowork` | 5 formats | **marque Cowork de l'IA** : l'affiche risographie (motif, ton, titre, kicker, pied), en carré, 4:5, aperçu de lien, couvertures de profil et de page |

**Un gabarit peut porter plusieurs tailles.** `kit-identite` déclare `sizes` (valeur du
champ → `{width, height, scale}`) et `size_field` (le champ enum qui choisit) ; le serveur rend
`sizes[data[size_field]]` plutôt que `size`, `/openapi.json` annonce la table entière, et l'IHM
met son cadre d'aperçu au bon ratio. `size` reste la taille de référence, celle qu'on montre
quand aucun format n'est encore choisi. Sans ce mécanisme, demander une couverture de page
rendait un 4:5 — silencieusement.

⚠️ **La table des formats du kit vit dans `posts/identite-formats.mjs`**, importée à la fois
par le gabarit et par le build local (`posts/build-kit.mjs`). Une seconde copie ici et les deux
dériveraient : le studio livrerait des cotes fausses sans que rien n'échoue.

⚠️ **Les titres dépendent de Google Fonts au moment du rendu.** `assets/fonts.css` n'embarque
que Familjen Grotesk et JetBrains Mono ; Bricolage Grotesque et Hanken Grotesk arrivent par le
`<link>` en tête du fragment. Un rendu sans réseau sortant sort donc avec une fonte de
substitution — vrai pour `affiche-recul` comme pour `kit-identite`.

Trois pièges rencontrés en écrivant le second, à connaître avant d'en écrire un troisième :

- **L'image fixe n'est pas la dernière image.** Une animation qui finit par un fondu ne
  rend que le fond si on capture la fin. Le gabarit désigne son instant : `window.__STILL`.
- **`let top` au niveau global casse tout le script** — collision avec `window.top`, et la
  page sort vide sans erreur au rendu. Vaut pour `name`, `length`, `status`, `self`.
- **La durée dépend du texte** quand il est frappé. Elle se borne en accélérant la frappe,
  jamais en coupant du texte (12 s pour trois cartes, 16,5 s pour quatre cartes pleines).
