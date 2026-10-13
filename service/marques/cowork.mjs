// La marque « Cowork de l'IA » : un lieu Otomata à Marseille 6e, ouverture au printemps 2027.
//
// Ce qui fait autorité, et d'où ça vient :
// - le dessin des affiches et les jetons : le design system « Cowork de l'IA » publié sur Claude
//   Design, dont posts/cowork/affiche.js et brand/cowork/tokens.json sont des copies ;
// - le logo (« le soleil sur la mer », arrêté le 13/10/2026) : brand/logos/cowork/, servi sans copie.
//
// Le kit et la charte reprennent les mécanismes d'Otomata (service/kit.mjs, service/brand.mjs) ; ce
// module ne porte que ce qui est à la marque.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as templates from '../templates.mjs';
import * as dessin from './cowork-affiche.mjs';
import { FORMATS } from '../../posts/identite-formats.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const TOKENS = 'brand/cowork/tokens.json';
const LOGOS_DIR = 'brand/logos/cowork';

// Les logos du lieu. `logo` et `logo-sur-sombre` sont larges (mark + nom, texte vectorisé) : leurs
// tailles sont des LARGEURS, la hauteur suit le viewBox. Plafond à 1024 px de large, comme pour Otomata.
const LOGOS = {
  'mark':            { fichier: 'cowork-mark.svg', nom: 'Le mark', fond: 'clair',
                       note: 'le soleil sur la mer, anneau saffran décalé — complet, il tient jusqu’au favicon (16 px)',
                       tailles: [1024, 512, 256, 128, 64, 32, 16] },
  'compact':         { fichier: 'cowork-mark-compact.svg', nom: 'Compact', fond: 'clair',
                       note: 'le disque seul, pour les surfaces rognées en cercle (avatar, pastille)', tailles: [512, 256, 128, 64] },
  'mono-encre':      { fichier: 'cowork-mark-mono-encre.svg', nom: 'Monochrome encre', fond: 'clair',
                       note: 'une seule couleur, pour fond clair', tailles: [1024, 512, 256] },
  'mono-blanc':      { fichier: 'cowork-mark-mono-blanc.svg', nom: 'Monochrome clair', fond: 'sombre',
                       note: 'une seule couleur, pour fond sombre', tailles: [1024, 512, 256] },
  'logo':            { fichier: 'cowork-logo.svg', nom: 'Le logo', fond: 'clair',
                       note: 'le mark et le nom en bleu mer, pour fond clair — tailles en largeur', tailles: [1024, 512, 256] },
  'logo-sur-sombre': { fichier: 'cowork-logo-sur-sombre.svg', nom: 'Le logo, sur fond sombre', fond: 'sombre',
                       note: 'le nom en crème — tailles en largeur', tailles: [1024, 512, 256] },
};

/* ---------- les jetons du design system ---------- */

const jetons = () => JSON.parse(readFileSync(join(ROOT, TOKENS), 'utf8'));

/** Les couleurs, alias résolus (`color-encre` vaut `{color-cobalt}`). Un alias qui ne mène nulle part
 *  lève une erreur : la charte publique ne montre pas une pastille vide. */
function couleurs() {
  const brut = new Map(jetons().color.tokens.map(t => [t.name, t]));
  const resout = (v, vus = []) => {
    const m = /^\{([\w-]+)\}$/.exec(v);
    if (!m) return v;
    if (!brut.has(m[1]) || vus.includes(m[1])) throw new Error(`${TOKENS} : alias de couleur introuvable ou circulaire : ${v}`);
    return resout(brut.get(m[1]).value, [...vus, m[1]]);
  };
  return new Map([...brut.values()].map(t => [t.name.replace(/^color-/, ''), {
    hex: resout(t.value), usage: t.usage, alias: /^\{/.test(t.value) ? t.value.slice(1, -1).replace(/^color-/, '') : null,
  }]));
}

// L'ordre de lecture de la palette. Toute couleur du fichier doit y être rangée : un jeton ajouté au
// design system et absent d'ici lève une erreur au lieu de disparaître de la charte.
const GROUPES = [
  ['La page', ['fond', 'texte', 'texte-doux', 'encre', 'encre-filet', 'accent']],
  ['Le papier, posé sur la page', ['papier', 'papier-texte', 'papier-texte-doux', 'papier-encre', 'papier-filet', 'papier-accent']],
  ['Papier et encre brune', ['bg', 'surface', 'paper-2', 'paper-3', 'hair', 'hair-soft', 'ink', 'ink-soft', 'mute', 'faint']],
  ['Saffran', ['saffron', 'saffron-soft', 'saffron-ink', 'on-saffron']],
  ['Terra', ['terra', 'terra-soft', 'terra-ink']],
  ['Olive', ['olive', 'olive-vif', 'olive-soft', 'olive-ink']],
  ['Bleu mer', ['cobalt', 'cobalt-vif', 'cobalt-soft', 'cobalt-ink']],
];

function palette() {
  const c = couleurs();
  const ranges = new Set(GROUPES.flatMap(([, n]) => n));
  const orphelins = [...c.keys()].filter(n => !ranges.has(n));
  if (orphelins.length) throw new Error(`${TOKENS} : couleurs sans groupe dans la charte : ${orphelins.join(', ')}`);
  return GROUPES.map(([titre, noms]) => ({
    titre,
    tons: noms.map(n => {
      if (!c.has(n)) throw new Error(`${TOKENS} : la couleur ${n} a disparu`);
      const { hex, usage, alias } = c.get(n);
      return { nom: alias ? `${n} = ${alias}` : n, hex, usage };
    }),
  }));
}

// Le rôle de chaque famille ; la liste des familles, elle, vient du fichier de jetons.
const ROLES = {
  'Bricolage Grotesque': ['Display', 'titres d’affiche, de page et de rubrique — graisse 800, approche serrée, pas d’italique'],
  'Hanken Grotesk': ['Sans', 'tout le texte courant : corps 16 px, prose 17 px, chapô 20 px'],
  'JetBrains Mono': ['Mono', 'repères : surtitres, moments du programme, pied d’affiche — capitales espacées de 0,12 à 0,16 em ; le nom du lieu près du mark, en minuscules'],
};
const typo = () => jetons().type.fonts.map(f => {
  if (!ROLES[f.family]) throw new Error(`${TOKENS} : famille sans rôle dans la charte : ${f.family}`);
  const [role, usage] = ROLES[f.family];
  return { role, famille: f.family, usage };
});

/** Les quatre tons d'affiche : la combinaison de jetons que le dessin fixe pour chacun, et une affiche
 *  d'exemple. Le SVG est produit ici, dans Node, et servi dans le JSON : la page publique le montre sans
 *  qu'aucun rendu Chrome ne puisse être déclenché depuis l'extérieur. */
// Le ton mer ne va qu'avec le soleil (règle du dessin) ; le ton soleil porte marseille, comme l'accueil du site.
const EXEMPLES_TONS = { soleil: 'marseille', terre: 'bol', mer: 'soleil', olive: 'bulles' };
const ROLES_TON = { fond: 'fond', trame: 'trame (points)', tartan: 'tartan (hachures)', trait: 'trait', titre: 'titre', ombre: 'ombre du titre' };
function tons() {
  const c = couleurs();
  return Object.entries(dessin.TONS).map(([nom, t]) => ({
    nom,
    couleurs: Object.entries(t).map(([role, jeton]) => {
      if (!c.has(jeton)) throw new Error(`le ton ${nom} du dessin cite une couleur absente de ${TOKENS} : ${jeton}`);
      return { role: ROLES_TON[role] || role, jeton, hex: c.get(jeton).hex };
    }),
    svg: dessin.affiche({ format: 'carre', ton: nom, motif: EXEMPLES_TONS[nom] || dessin.MOTIFS[0], titre: [nom] }),
  }));
}

/* ---------- le kit : les visuels fixes ---------- */

// Les visuels du kit sont des affiches, rendues par le gabarit `affiche-cowork` (mêmes contrôles que le
// formulaire). Leur format vient de la table des emplacements du dessin (SERVIS), l'avatar mis à part.
const LIEU = 'Marseille 6e · ouverture printemps 2027';
const SITE = 'cowork.otomata.tech';
const AFFICHE_KIT = { motif: 'marseille', ton: 'soleil', titre: 'Le Cowork\nde l’IA',
  kicker: 'coworking · formation\ncas du vendredi', pied: `${LIEU}\n${SITE}` };
const BANDEAU_KIT = { motif: 'soleil', ton: 'mer', titre: 'Le Cowork de l’IA' };
const KIT = {
  post45: { ...AFFICHE_KIT },
  post11: { ...AFFICHE_KIT },
  og:     { ...AFFICHE_KIT },
  profil: { ...BANDEAU_KIT, pied: `${LIEU}\n${SITE}` },
  page:   { ...BANDEAU_KIT, pied: `${LIEU} · ${SITE}` },
};
const formatDuDessin = Object.fromEntries(Object.entries(dessin.SERVIS).map(([f, s]) => [s.emplacement, f]));

function htmlKit(emplacement) {
  if (emplacement === 'avatar') return avatar();
  const gabarit = templates.get('affiche-cowork');
  if (!Object.hasOwn(KIT, emplacement) || !Object.hasOwn(formatDuDessin, emplacement))
    throw new Error(`kit Cowork : aucun visuel pour l’emplacement ${emplacement}`);
  const data = { ...KIT[emplacement], format: formatDuDessin[emplacement] };
  if (!data.format) throw new Error(`kit Cowork : aucun visuel pour l’emplacement ${emplacement}`);
  templates.validate(gabarit, data);
  return gabarit.build(data);
}

/** L'avatar : LinkedIn le rogne en cercle, d'où le mark COMPACT (le disque seul), posé sur le crème
 *  avec une marge — le cerne du disque ne doit pas toucher le bord du rognage. */
function avatar() {
  const { width, height } = FORMATS.avatar;
  const svg = readFileSync(join(ROOT, LOGOS_DIR, LOGOS.compact.fichier), 'utf8');
  const cote = Math.round(width * 0.88);
  return `<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><title>Cowork de l’IA — avatar</title><style>`
    + `html,body{margin:0;padding:0;width:${width}px;height:${height}px;overflow:hidden;background:#fefcf5}`
    + `svg{display:block;width:${cote}px;height:${cote}px;margin:${(height - cote) / 2}px ${(width - cote) / 2}px}`
    + `</style></head><body>${svg}</body></html>`;
}

for (const f of Object.keys(FORMATS))
  if (f !== 'avatar' && !KIT[f]) throw new Error(`kit Cowork : l’emplacement ${f} de posts/identite-formats.mjs n’a pas de visuel`);

export const marque = {
  id: 'cowork',
  nom: 'Cowork de l’IA',
  fichiers: 'cowork',
  logos: { dossier: LOGOS_DIR, table: LOGOS },

  charte: {
    titre: 'Cowork de l’IA · charte de marque',
    intro: 'Le logo, la palette, la typographie et les quatre tons d’affiche du Cowork de l’IA, un lieu Otomata '
      + 'à Marseille 6e (ouverture au printemps 2027). Cette page est publique : elle se donne telle quelle à un '
      + 'imprimeur, un presta ou un partenaire. Tout y est téléchargeable.',
    sousTitreLogos: 'SVG, et PNG transparents',
    sousTitrePalette: 'jetons du design system « Cowork de l’IA »',
    palette,
    typo,
    empreinte(h) {
      h.update(readFileSync(join(ROOT, TOKENS)));
      h.update(readFileSync(join(ROOT, dessin.DESSIN)));
    },
    extras: () => ({
      tons: tons(),
      polices: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700..800&family=JetBrains+Mono:wght@700&display=swap',
      generateur: { url: '/#affiche-cowork', libelle: 'Faire une affiche dans le générateur',
        note: 'réservé à l’équipe Otomata (connexion demandée)' },
    }),
    notes: [
      '<b>La page en bleu mer, le papier crème</b> : la page du site est en bleu mer <code>#1f6dba</code>, texte crème ; '
        + 'les blocs posés dessus (cartes, encadrés, formulaires) sont du papier crème à encre foncée. Le saffran n’y sert '
        + 'qu’au décor (filets, puces, soulignés) : sur le bleu, il ne tient pas en texte. Les autres couleurs de la charte '
        + 's’expriment dans les affiches.',
      '<b>Le logo, c’est le soleil sur la mer.</b> Le mark complet tient jusqu’au favicon (16 px). La variante '
        + '<b>compacte</b> (le disque seul) sert aux surfaces rognées en cercle, où l’anneau décalé tomberait hors du visible.',
      '<b>L’affiche se règle, elle ne se redessine pas</b> : un motif, un ton, un titre court, un pied. Pas de cinquième '
        + 'ton, pas de dégradé, pas de photo dans l’affiche, pas plus de trois lignes de titre.',
      '<b>Le ton</b> : un prix s’écrit toujours avec « HT » et son unité (« 200 € HT / mois »). Le lieu se dit '
        + '« Marseille 6e », jamais une adresse. Jamais d’emoji, jamais de chiffre ni de témoignage inventé.',
      '<b>Les titres d’affiche viennent de Google Fonts</b> (Bricolage Grotesque, JetBrains Mono) : un SVG d’affiche '
        + 'ouvert sur une machine qui n’a pas ces polices sort en fonte de substitution. Pour l’imprimé, préférer le PNG.',
    ],
  },

  kit: {
    titre: 'Cowork de l’IA · kit de marque',
    intro: 'Les visuels fixes du Cowork de l’IA, un par emplacement LinkedIn, dans le langage des affiches. '
      + 'Rien à remplir : on télécharge.',
    identite: () => `Le Cowork de l’IA — ${LIEU} — ${SITE}`,
    visuels: FORMATS,
    html: htmlKit,
    // Comme le gabarit : un JPEG qualité 90 à côté de chaque PNG — le PNG du 4:5 pèse ~9 Mo, celui de
    // la couverture de page dépasse les 3 Mo que LinkedIn accepte.
    jpeg: 90,
    sources: [dessin.DESSIN, dessin.FRAGMENT],
    donnees: () => [FORMATS, KIT, dessin.SERVIS, 'jpeg-90'],
    notes: [
      '<b>Les bannières sont des affiches couchées</b> : tartan, soleil levant, titre crème à ombre d’encre, lieu et '
        + 'adresse en pied. Elles se composent pour leur cadre — le titre et le pied restent hors de la zone de la photo '
        + 'de profil, le soleil est décoratif et peut être rogné sur mobile.',
      '<b>L’avatar est le mark compact</b> : LinkedIn l’affiche en rond.',
      '<b>PNG ou JPEG ?</b> Le grain de papier rend les PNG lourds (jusqu’à ~9 Mo pour le 4:5). Pour LinkedIn, prendre '
        + 'le <b>JPEG</b> : la couverture de page y est limitée à 3 Mo. Le PNG reste la version sans perte (impression).',
      '<b>Une affiche à vous</b> (un événement, une offre) se fait dans le générateur, gabarit « Affiche du Cowork de l’IA ».',
    ],
  },
};
