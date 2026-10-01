# otomata — charte maison

Charte de slides à l'identité Otomata / Oto : fond crème, encre brune, saffran. Utiliser pour tout deck sortant sous notre nom (contrairement aux `chartes/<client>/`, qui portent l'identité du client).

## Installation

Le repo `slider` ignore `chartes/*` sauf `blank` : les chartes vivent hors du moteur et sont montées dedans. Celle-ci vit ici, dans la source de vérité du design, et se monte par lien symbolique :

```bash
ln -sfn /data/studio/otomata/brand/slider \
        /data/github/otomata-tech/slider/chartes/otomata
```

Puis `--charte otomata` (ou la résolution multi-chemin via `SLIDER_THEMES_PATH`, voir l'`INSTALL.md` du moteur).

Vivant ici, la charte suit la palette sans re-synchronisation : les valeurs de `tokens.json` sont celles de `../theme/theme.css`. Les modifier ici sans les changer dans `theme.css` recréerait la divergence qu'on vient d'éliminer.

## Deux marques, ne pas confondre

| | Otomata (société) | Oto (produit) |
|---|---|---|
| Couleur | **saffran `#f0b41e`** | **saffran `#f0b41e`** |
| Logo ici | `assets/logo/otomata-mark.svg` (disque cerné) | `assets/logo/oto-dashboard-mark.svg` (« open O ») |

La palette du `tokens.json` est le socle commun (saffran). Depuis le 2026-09-03 les **deux marques partagent le saffran** et se distinguent par la forme — disque plein pour la société, anneau ouvert pour le produit ; le violet corporate a été retiré partout.

## Particularités

- **`radii` à 0** — la charte riso n'a pas d'angles arrondis. Ombres portées dures, sans flou ni radius.
- **Trois fontes** — Bricolage Grotesque (titres, axes variables, `wdth` 90), Hanken Grotesk (texte), JetBrains Mono (eyebrows en capitales, `letter-spacing` 0.16em). Les trois sont sur Google Fonts, rien à embarquer dans `assets/fonts/`.
- **Pas de photo de couverture par défaut** — déposer la photo sous `assets/photo/` et renseigner `defaults.cover_photo` au cas par cas.
