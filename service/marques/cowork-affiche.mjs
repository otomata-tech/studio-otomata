// Le dessin des affiches du Cowork de l'IA, chargé dans Node.
//
// posts/cowork/affiche.js est un script de navigateur (il pose `window.CoworkIA`) : c'est la copie
// du bundle du design system, et elle doit le rester à l'octet près — on ne la réécrit donc pas en
// module. On l'exécute dans un contexte isolé qui lui fournit un `window`. Sans `document`, le dessin
// prend les couleurs de la charte qu'il porte (CHARTE) au lieu de les lire sur la page : le SVG
// produit ici est celui qu'il produirait dans une page sans jetons CSS.
//
// Une seule lecture pour tout le studio : gabarit `affiche-cowork`, kit /kit/cowork, charte
// /brand/cowork. Les énumérations (motifs, tons, formats) viennent d'ICI, donc du dessin : un ton
// ajouté au design system apparaît seul dans le formulaire et dans /openapi.json.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { FORMATS as IDENTITE } from '../../posts/identite-formats.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const DESSIN = 'posts/cowork/affiche.js';
export const FRAGMENT = 'posts/cowork/template-affiche.html';

const contexte = { window: {} };
vm.runInNewContext(readFileSync(join(ROOT, DESSIN), 'utf8'), contexte, { filename: DESSIN });
const CoworkIA = contexte.window.CoworkIA;
if (!CoworkIA?.FORMATS)
  throw new Error(`${DESSIN} ne porte pas CoworkIA.FORMATS : la copie du design system a perdu l'option format`);

export const { MOTIFS, TONS, FORMATS } = CoworkIA;

// Les formats du dessin que le studio sert, et l'emplacement LinkedIn de posts/identite-formats.mjs
// auquel chacun correspond — c'est cette table-là qui donne l'échelle de rendu et la cible, pour que
// le gabarit et le kit livrent les mêmes cotes que le kit Otomata. Les plafonds disent ce qui TIENT
// dans le format (lignes de titre, de pied, caractères d'une ligne de pied) : au-delà, le gabarit
// refuse plutôt que de rendre un texte qui déborde.
// `paysage` (3:2, l'affiche d'accueil du site) n'y est pas : le dessin ne le compose que pour le
// motif marseille — les quatre autres y passent sous le titre.
export const SERVIS = {
  carre:    { emplacement: 'post11', titre: 3, kicker: 2, pied: [2, 43] },
  portrait: { emplacement: 'post45', titre: 3, kicker: 2, pied: [2, 43] },
  apercu:   { emplacement: 'og',     titre: 3, kicker: 2, pied: [2, 60] },
  profil:   { emplacement: 'profil', titre: 2, kicker: 1, pied: [2, 44] },
  page:     { emplacement: 'page',   titre: 1, kicker: 0, pied: [1, 64] },
};
for (const [f, s] of Object.entries(SERVIS)) {
  const id = IDENTITE[s.emplacement];
  if (!FORMATS[f] || !id || FORMATS[f].W !== id.width || FORMATS[f].H !== id.height)
    throw new Error(`format ${f} du dessin (${FORMATS[f]?.W}×${FORMATS[f]?.H}) ≠ emplacement ${s.emplacement} `
      + `de posts/identite-formats.mjs (${id?.width}×${id?.height})`);
}

/** Les tailles de rendu, au sens du mécanisme `sizes` des gabarits : format → {width, height, scale, cible}. */
export const TAILLES = Object.fromEntries(Object.entries(SERVIS).map(([f, s]) => [f, IDENTITE[s.emplacement]]));

/** La chaîne SVG d'une affiche. Lève l'erreur du dessin telle quelle (ton, motif, format inconnus…). */
export const affiche = options => CoworkIA.affiche(options);

/** Le corps de page d'une affiche : polices + SVG. La page elle-même (doctype, <title>) est posée
 *  par l'appelant. */
export const corps = options => readFileSync(join(ROOT, FRAGMENT), 'utf8').replace('<!--__AFFICHE__-->', affiche(options));
