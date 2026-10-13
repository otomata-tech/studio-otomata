// Les marques du studio. Une marque porte ses logos, sa charte (palette, typo, ce qui lui est propre)
// et son kit de visuels fixes ; les moteurs des pages /kit et /brand (kit.mjs, brand.mjs) et leurs
// routes sont communs.
//
// Adresses : la marque par défaut, Otomata, garde les siennes (/kit, /brand, /api/kit, /brand/api) ;
// une autre marque les prend sous son identifiant (/kit/cowork, /brand/cowork, /api/kit/cowork,
// /brand/cowork/api). ⚠️ Tout ce qui est sous /brand est PUBLIC (bypass Cloudflare Access sur le
// préfixe) : une marque ajoutée y publie sa charte, et rien d'autre.
//
// Forme d'une marque (cf. marques/otomata.mjs, marques/cowork.mjs) :
//   id, nom, fichiers (préfixe des noms de fichiers téléchargés),
//   logos   : { dossier, table: { clef: { fichier, nom, note, fond, tailles } } }
//   charte  : { titre, intro, sousTitreLogos, sousTitrePalette, palette(), typo | typo(),
//               empreinte(hash), extras(version) → sections propres, notes[] }
//   kit     : { titre, intro, identite(), visuels: { format: { width, height, scale, cible } },
//               html(format), diaporama?, photos?(version), sources[], donnees(), notes[] }
import { marque as otomata } from './marques/otomata.mjs';
import { marque as cowork } from './marques/cowork.mjs';

export const DEFAUT = otomata.id;
const MARQUES = new Map([otomata, cowork].map(m => [m.id, m]));

export const ids = () => [...MARQUES.keys()];

export function get(id) {
  const m = MARQUES.get(id);
  if (!m) throw Object.assign(new Error(`marque inconnue : ${id}`), { status: 404 });
  return m;
}

/** Le suffixe d'adresse d'une marque : '' pour la marque par défaut, '/cowork' pour les autres. */
export const chemin = m => (m.id === DEFAUT ? '' : `/${m.id}`);

/** Ce que l'IHM affiche pour passer d'une marque à l'autre. */
export const liste = () => [...MARQUES.values()].map(m => ({
  id: m.id, nom: m.nom, kit: `/kit${chemin(m)}`, charte: `/brand${chemin(m)}`,
}));
