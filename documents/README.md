# documents — le pipeline de production des PDF (notes, rapports, propositions, contrats, dossiers)

Ce dossier documente **comment Otomata produit ses documents PDF**, du texte à la pièce jointe. Les
fichiers du pipeline vivent sur le Drive partagé, dans `admin/legal/` (monté sur le poste en
`/mnt/otomata-shared/admin/legal/`) : c'est là que les sessions écrivent et génèrent. Ici vit la
**documentation** du pipeline, à côté de la charte dont il dépend (`../brand/`). Mis en place le
2026-10-13 à la demande d'Alexis : jusque-là, chaque gabarit se documentait dans son propre coin.

## La chaîne

```
texte markdown + frontmatter  ──pandoc──▶  HTML  ──gabarit + otomata.css──▶  weasyprint  ──▶  PDF
```

```bash
python3 /mnt/otomata-shared/admin/legal/md2pdf.py <fichier>.md [sortie.pdf]
```

- **Le texte** est un fichier `.md` rangé avec son sujet (le dossier du projet sur le Drive ou sur le
  poste, par exemple `strategy/bp-2026/`, `/data/cowork/`). Son frontmatter YAML choisit le gabarit et
  renseigne le titre, le sous-titre, le tag, le projet, la date. Le `.md` est la source : on ne retouche
  jamais un PDF, on régénère.
- **Le script** `md2pdf.py` : pandoc convertit le markdown en HTML (`--section-divs`), le gabarit
  l'habille, weasyprint imprime. Un placeholder sans valeur ou un gabarit inconnu est une erreur, pas un
  blanc. Le docstring du script fait foi pour les clés du frontmatter.
- **Le socle** `templates/otomata.css` : polices (Hanken Grotesk pour le corps, Bricolage Grotesque pour
  les titres, dans `templates/fonts/`, OFL), palette de la charte, typographie, tableaux, encarts
  (`.callout.*`), cases de chiffres (`.kpi-row` / `.kpi-box`), en-tête `.hero`, pied `.doc-footer`.
  Il reprend `../brand/theme/theme.css` et le mark `../brand/logos/otomata/` : **la charte se change dans
  `brand/`, puis se reporte dans `otomata.css`, une seule fois pour tous les gabarits.**
- **Les gabarits**, un sous-dossier par gabarit dans `templates/`, chacun avec son `*-template.html` et,
  quand il le faut, un README :

| gabarit | pour quoi | marque | style |
|---|---|---|---|
| `note` (défaut) | note de projet, compte rendu, mémo | Otomata | sobre : mark en marge haute, titre, filet saffran |
| `report` | rapport, étude, business plan, synthèse | Otomata | sobre, avec un en-tête `.hero` (tag, titre, sous-titre, filet, méta) |
| `proposition` | proposition commerciale (clé `validity` obligatoire) | Otomata | sobre, en-tête `.hero`, destinataire |
| `contract` | contrat, accord, pièces d'un dossier de financement | Otomata | sobre, titre centré, filet saffran, bloc de signatures Yousign |
| `acte` | PV de décisions, attestation, pouvoir | Otomata | sobre, sans logo |
| `oto` | documents du **produit** oto (l'open O) | oto | bande saffran à fond perdu en page 1, open O en négatif |
| `affiche` | documents du **Cowork de l'IA** qui doivent donner envie (executive summary, dossier de présentation) | Cowork | affiche risographie en bandeau de tête, encre bleu mer, chiffres clés, encart saffran |

**Les documents d'Otomata gardent leur style sobre** (décision d'Alexis du 2026-10-13) : le gabarit
`affiche` est celui du Cowork, il ne s'applique pas à un document Otomata.

## Qui fait autorité, et où

| quoi | autorité | copie / consommateur |
|---|---|---|
| palette, typo, marks, tokens | `../brand/` (ce dépôt) | `admin/legal/templates/otomata.css`, `templates/fonts/`, les marks SVG inclus dans les gabarits |
| l'affiche du Cowork (dessin, tons) | le design system « Cowork de l'IA » et `cowork.otomata.tech/src/components/Affiche.vue` (voir `../brand/README.md`) | `admin/legal/templates/affiche/affiche-template.html` : la même affiche, en SVG statique, ton `mer` |
| les jetons du Cowork | `../brand/cowork/tokens.json` | le dictionnaire `TONS` de `md2pdf.py` |
| le pipeline lui-même (script, gabarits, polices) | `admin/legal/` sur le Drive | aucune copie : les sessions y accèdent par le montage |
| cette documentation | ce fichier | le docstring de `md2pdf.py` et les README de gabarit redisent le détail de chacun |

## Règles

- **Un gabarit par usage, pas par document.** Un nouveau besoin se résout d'abord avec un composant du
  socle (encart, cases de chiffres, tableau) avant de créer un gabarit.
- **Créer un gabarit** = un sous-dossier dans `templates/`, un `*-template.html` qui charge
  `../otomata.css`, une entrée dans `TEMPLATES` et `DEFAULT_TAGS` de `md2pdf.py`, une ligne dans le
  docstring, une ligne dans le tableau ci-dessus. Rien d'autre ne bouge.
- **Pas de couleur en dur dans un gabarit** quand le socle a le jeton (`var(--saffran)`, `var(--encre)`…).
  Les couleurs d'une affiche passent par les dictionnaires de `md2pdf.py`, qui reprennent `brand/`.
- **Vérifier le PDF** avant de le livrer : `pdfinfo` (nombre de pages), `pdftotext` (aucun chiffre
  périmé, aucune mention de version), et un rendu `pdftoppm -r 60 -png` pour l'œil.
- **Partage** : un PDF envoyé à un tiers est figé dans `strategy/<dossier>/partages/<date>-<destinataire>/`
  ; la version courante reste à côté du `.md`.

## Limites du moteur (weasyprint)

- `mix-blend-mode` et les filtres SVG (`feTurbulence`) sont ignorés : pas de grain de papier, les
  superpositions passent par l'opacité.
- Les formules de style `@page` calent le décor sur la zone de contenu : changer une marge déplace un
  décor à fond perdu (voir le README du gabarit `oto`).
- JetBrains Mono (`--mono` du socle) n'est pas embarquée par `otomata.css` : les textes en mono sortent
  en DejaVu Sans Mono sauf dans le gabarit `oto`, qui l'embarque. À corriger dans le socle.
