// La marque Otomata : ses logos, sa charte (palette lue dans brand/theme/theme.css), son kit
// (le gabarit `kit-identite` aux formats de posts/identite-formats.mjs, plus le diaporama de
// profil), ses portraits et ses fichiers de merch. Le moteur des pages /kit et /brand est
// commun aux marques (service/kit.mjs, service/brand.mjs) : ici, seulement ce qui est à elle.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as templates from '../templates.mjs';
import { FORMATS } from '../../posts/identite-formats.mjs';
import { PIECES } from '../../brand/merch/pieces.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const THEME = join(ROOT, 'brand/theme/theme.css');
const PHOTOS_DIR = join(ROOT, 'brand/photos');

// Le logo, ses déclinaisons et les tailles qu'on livre. Les SVG viennent de brand/,
// source de vérité : ils ne sont PAS recopiés ici, seulement servis et rastérisés.
// Les tailles s'arrêtent là où la variante cesse d'être lisible — le mark complet
// n'est pas proposé en 16 px, son décalage y devient un cheveu.
const LOGOS = {
  'mark':       { fichier: 'otomata-mark.svg', nom: 'Le mark', fond: 'clair',
                  note: 'ombre dure + anneau saffran décalé + disque cerné', tailles: [1024, 512, 256, 128] },
  'compact':    { fichier: 'otomata-mark-compact.svg', nom: 'Compact', fond: 'clair',
                  note: 'disque cerné seul — sous 32 px et sur les surfaces rognées en cercle', tailles: [512, 256, 128, 64, 32, 16] },
  'mono-encre': { fichier: 'otomata-mark-mono-encre.svg', nom: 'Monochrome encre', fond: 'clair',
                  note: 'une seule couleur, pour fond clair', tailles: [1024, 512, 256] },
  'mono-blanc': { fichier: 'otomata-mark-mono-blanc.svg', nom: 'Monochrome clair', fond: 'sombre',
                  note: 'une seule couleur, pour fond sombre', tailles: [1024, 512, 256] },
};

// Les cinq images du DIAPORAMA de profil (option Premium : 5 maximum, 1584×396, PNG,
// 8 Mo par image). Elles défilent en boucle et chacune doit tenir seule — personne ne
// regarde un profil en attendant la suivante. D'où : une idée par image, et l'adresse
// répétée sur chacune.
const DIAPO = [
  { mark: 'otomata', kicker: 'Otomata', titre: 'Studio IA basé à Marseille.', pied: '<b>otomata.tech</b>' },
  { mark: 'aucun', titre: 'On met vos agents au travail.', pied: '<b>otomata.tech</b>' },
  { mark: 'aucun', titre: 'Vos données, vos procédures, vos comptes — accessibles à vos agents.', pied: '<b>otomata.tech</b>' },
  { mark: 'oto', kicker: 'oto', titre: 'La toolbox pour créer des agents.', pied: '<b>oto.cx</b>' },
  { mark: 'otomata', titre: 'Parlons-en.', pied: 'Marseille · <b>otomata.tech</b>' },
];

// Les portraits publiés au nom d'Otomata — déjà servis par otomata.tech/equipe/.
// `sources/` (les photos d'origine, avant harmonisation) n'est PAS exposé : ce sont
// des originaux de travail, pas des livrables.
const PHOTOS = [
  { slug: 'alexis-laporte', nom: 'Alexis Laporte', role: 'Président' },
  { slug: 'sarah-soumahoro', nom: 'Sarah Soumahoro', role: 'RAF' },
];

/** La palette vient de brand/theme/theme.css, jamais d'une copie : c'est le fichier
 *  que les consommateurs importent, et la page publique doit dire la même chose. */
function palette() {
  const css = readFileSync(THEME, 'utf8');
  const pris = new Map();
  for (const [, nom, val] of css.matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{3,8})/g))
    if (!pris.has(nom)) pris.set(nom, val);
  const groupe = (titre, clefs) => ({
    titre, tons: clefs.filter(k => pris.has(k)).map(k => ({ nom: k, hex: pris.get(k) })),
  });
  return [
    groupe('Neutres', ['bg', 'paper-2', 'paper-3', 'surface', 'ink', 'ink-soft', 'mute', 'faint', 'hair']),
    groupe('Saffran', ['primary', 'primary-soft', 'primary-ink']),
    groupe('Accent', ['accent', 'accent-soft']),
    // Les trois familles d'état de la charte : fort, partiel, faible.
    groupe('États', ['strong-bg', 'strong-mid', 'strong-ink', 'partial-bg', 'partial-mid', 'partial-ink', 'weak-bg', 'weak-mid', 'weak-ink']),
  ].filter(g => g.tons.length);
}

const TYPO = [
  { role: 'Display', famille: 'Bricolage Grotesque', usage: 'titres et chiffres héros — wdth 90, weight 600, letter-spacing négatif' },
  { role: 'Sans', famille: 'Hanken Grotesk', usage: 'corps de texte' },
  { role: 'Mono', famille: 'JetBrains Mono', usage: 'eyebrows, étiquettes, adresses — capitales, letter-spacing 0.16em' },
];

/** Dimensions réelles d'un PNG : l'en-tête IHDR, aux octets 16→24. La table des pièces
 *  ne les porte plus — le build recadre au contenu, donc seul le fichier sait ce qu'il
 *  mesure, et la page publique doit annoncer le fichier, pas une intention. */
function dimensionsPng(chemin) {
  if (!existsSync(chemin))
    throw new Error(`fichier d'impression absent : ${chemin} — le régénérer avec « node brand/merch/build-merch.mjs » et le commiter`);
  const t = readFileSync(chemin).subarray(16, 24);
  return `${t.readUInt32BE(0)}×${t.readUInt32BE(4)}`;
}

const pngMerch = id => join(ROOT, 'brand/merch/print', `otomata-${id}.png`);

/** Un portrait publié, servi depuis brand/photos/. Liste fermée : un slug inconnu
 *  répond 404 plutôt que d'ouvrir le dossier — `sources/` reste privé. */
export function photo(slug) {
  if (!PHOTOS.some(p => p.slug === slug))
    throw Object.assign(new Error(`portrait inconnu : ${slug}`), { status: 404 });
  return join(PHOTOS_DIR, `${slug}.jpg`);
}

/** Un fichier d'impression, servi tel quel depuis brand/merch/print/.
 *  Il n'est PAS rendu à la demande : 4000 px de côté long font jusqu'à 16 Mpx, là où le
 *  service est calibré pour du 1200×1500 — un travail lourd, répété, pour un fichier qui
 *  ne change jamais. Le poste les génère avec `node brand/merch/build-merch.mjs`, git les
 *  transporte. */
export function merch(id) {
  const p = PIECES.find(x => x.id === id);
  if (!p) throw Object.assign(new Error(`pièce inconnue : ${id}`), { status: 404 });
  const png = pngMerch(id);
  if (!existsSync(png))
    throw Object.assign(new Error(
      `fichier d'impression absent : ${id} — le régénérer avec « node brand/merch/build-merch.mjs » et le commiter`),
      { status: 404 });
  return Promise.resolve(png);
}

const photosPubliees = v => PHOTOS.map(ph => ({ ...ph, url: `/brand/photo/${ph.slug}.jpg?v=${v}` }));

// Les données du kit officiel sont l'exemple du gabarit : une seule source, sinon la page
// du kit et le formulaire montreraient deux identités qui divergent en silence.
const identite = () => templates.get('kit-identite');

export const marque = {
  id: 'otomata',
  nom: 'Otomata',
  // Le préfixe des fichiers téléchargés : otomata-mark.svg, otomata-post45.png…
  fichiers: 'otomata',
  logos: { dossier: 'brand/logos/otomata', table: LOGOS },

  charte: {
    titre: 'Otomata · charte de marque',
    intro: 'Le mark, la palette, la typographie et les fichiers d\'impression. Cette page est publique : '
      + 'elle est faite pour être donnée telle quelle à un imprimeur, un presta ou un partenaire. '
      + 'Tout y est téléchargeable, rien n\'y demande de compte.',
    sousTitreLogos: 'SVG, et PNG transparents',
    sousTitrePalette: 'tokens <code>@otomata/ui</code>',
    palette,
    typo: TYPO,
    empreinte(h) {
      h.update(readFileSync(THEME));
      h.update(JSON.stringify(PIECES.map(p => [p.id, p.pose, p.mark, p.mot, p.ombre, p.sur])));
      for (const p of PIECES) h.update(dimensionsPng(pngMerch(p.id)));
      for (const ph of PHOTOS) h.update(readFileSync(join(PHOTOS_DIR, `${ph.slug}.jpg`)));
    },
    extras: v => ({
      photos: photosPubliees(v),
      merch: PIECES.map(p => ({
        id: p.id, sur: p.sur, taille: dimensionsPng(pngMerch(p.id)),
        url: `/brand/merch/${p.id}.png?v=${v}`,
        fond: /blanc/.test(p.id) ? 'sombre' : /encre/.test(p.id) ? 'saffran' : 'clair',
      })),
    }),
    notes: [
      '<b>Choisir un fichier de merch, c\'est regarder la couleur du textile.</b> Sur un vêtement jaune, le mark '
        + 'en couleur se noie — son disque et le fond se confondent ; sur un vêtement foncé, il perd son cerne et '
        + 'son ombre, qui sont en encre. Les versions monochromes gardent le décalage parce que c\'est le <b>vide</b> '
        + 'entre le disque et l\'anneau qui le porte.',
      '<b>Le mark tient jusqu\'à 16 px.</b> En dessous de 32, l\'anneau décalé devient un cheveu : la variante '
        + '<b>compacte</b> est là pour les surfaces rognées en cercle — avatar, pastille.',
      '<b>Spreadshirt</b> : PNG (seul format à porter la transparence), 200 dpi, 4000 × 4000 px maximum, 10 Mo '
        + 'maximum. Les dimensions de la zone d\'impression en centimètres dépendent du produit — leur outil les '
        + 'affiche au téléversement, s\'y fier plutôt qu\'à une cote recopiée.',
      '<b>Les portraits forment une série</b> : même fond, même lumière, même cadrage, obtenus par la procédure '
        + 'd\'harmonisation de <code>brand/photos/</code>. Un portrait ajouté sans y passer casse la série — deux '
        + 'photos de deux studios ne se ressemblent jamais.',
    ],
  },

  kit: {
    titre: 'oto · kit de marque',
    intro: 'Les visuels fixes de l\'identité, un par emplacement LinkedIn. Rien à remplir : on télécharge.',
    identite: () => { const d = identite().example; return `${d.nom} — ${d.phrase} — ${d.url}`; },
    visuels: FORMATS,
    html: format => identite().build({ ...identite().example, format }),
    diaporama: {
      taille: { width: 1584, height: 396, scale: 2 },
      images: DIAPO.map(d => ({ titre: d.titre.replace(/<[^>]+>/g, ''), html: () => templates.get('banniere').build(d) })),
    },
    photos: photosPubliees,
    sources: ['posts/template-identite.html', 'posts/template-banniere.html'],
    donnees: () => [FORMATS, identite().example, DIAPO],
    notes: [
      '<b>Le diaporama est une option Premium du profil PERSONNEL</b> — pas de la page entreprise, qui garde sa '
        + 'couverture unique. Cinq images maximum, 1584×396, PNG, 8 Mo par image ; elles défilent en boucle, donc '
        + 'chacune tient seule et répète l\'adresse.',
      '<b>Les PNG de logo sont transparents</b>, et le damier derrière l\'aperçu le montre. Le mark complet n\'est '
        + 'pas proposé sous 128 px : en dessous, son anneau décalé devient un cheveu et son ombre un épaississement '
        + '— c\'est la variante <b>compact</b> qu\'il faut, jusqu\'à 16 px.',
    ],
  },
};
