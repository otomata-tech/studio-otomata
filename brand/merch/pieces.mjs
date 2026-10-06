// Les pièces de merch : ce qu'elles portent, et surtout SUR QUEL TEXTILE elles vont —
// c'est la seule chose à savoir au moment de téléverser.
// Partagé par le build local (build-merch.mjs) et par le studio (service/brand.mjs) :
// une seule source, sinon la page publique annoncerait des fichiers que le build ne
// produit pas.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const svg = f => readFileSync(join(ROOT, 'brand/logos/otomata', f), 'utf8');

const ENCRE = '#2c2112', CREME = '#fefcf5', SAFFRAN = '#f0b41e';

// Ce que le merch dit, arrêté le 2026-09-04 : l'adresse devant, la phrase derrière.
// La phrase est descriptive à dessein — dans le dos d'un inconnu, un clin d'œil ne se
// comprend pas, un fait si. Le 2026-10-06, elle dit ce que fait la SOCIÉTÉ (« la boîte à
// outils des agents » décrivait oto, le produit) — la même que sur les cartes de visite.
const ADRESSE = 'otomata.tech';
const NOM = 'OTOMATA';
const PHRASE = 'STUDIO DE CONCEPTION D’AGENTS IA';
// Repris par les cartes imprimées (plaquettes/build-carte.mjs) : une seule source.
export const MARQUE = { adresse: ADRESSE, nom: NOM, phrase: PHRASE };

// « OTOMATA » en Bricolage Grotesque 600 / wdth 90 / letter-spacing -.035em occupe
// 3,84 × sa font-size en largeur, la phrase en JetBrains Mono 24,1 ×. Mesuré sur le
// rendu : c'est ce qui permet de caler les lignes les unes sur les autres sans tâtonner.
// La phrase est en chasse fixe (0,6 em + 0,16 em d'interlettrage par signe) : un autre
// texte se recalcule, signes × 0,748 + 0,16 — 32 signes ici.
const RATIO_NOM = 3.84;
const RATIO_PHRASE = 24.1;
// Le centre optique du mark n'est pas celui de sa boîte : le disque est à cy=60/128,
// l'ombre déborde en bas. Un lockup calé sur la boîte penche visuellement.
const RECENTRE = 0.031;

/** Le glyphe COLONNE — inventé le 2026-09-04, pour les endroits hauts et étroits (bas de
 *  vêtement, couture latérale) où ni le mark ni une ligne de texte ne tiennent : le texte
 *  tourné y donnait un ruban de 21:1, illisible.
 *
 *  Cinq disques cernés dont l'anneau décalé pivote d'un cinquième de tour à chaque étage —
 *  un automate qui tourne. Les proportions sont celles du mark (anneau 3 % plus grand que
 *  le disque, décalé de 15,6 % de son rayon, cerne à 6,4 %), pas des valeurs inventées.
 *
 *  ⚠️ Ce n'est PAS le mark et il ne le remplace jamais : le mark a une ombre dure et une
 *  seule occurrence. La colonne est un motif, au même titre qu'une trame. */
const colonne = (disque, cerne, anneau) => {
  const n = 5, r = 35, pas = 84, d = r * 0.156, trait = r * 0.064;
  const etages = [];
  for (let i = 0; i < n; i++) {
    const y = 45 + i * pas;
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    etages.push(
      `<circle cx="${(50 + d * Math.cos(a)).toFixed(2)}" cy="${(y + d * Math.sin(a)).toFixed(2)}" r="${r}"
         fill="none" stroke="${anneau}" stroke-width="${trait.toFixed(2)}"/>`,
      `<circle cx="50" cy="${y}" r="${(r * 0.968).toFixed(2)}" fill="${disque}"` +
        (cerne ? ` stroke="${cerne}" stroke-width="${trait.toFixed(2)}"/>` : '/>'));
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 ${45 + (n - 1) * pas + 45}"
    role="img" aria-label="Otomata">${etages.join('')}</svg>`;
};

// Une entrée = un fichier d'impression.
//   `pose`  — dos (mark, nom, phrase), ligne (mark + adresse), bande (le glyphe colonne,
//             pour un ourlet), mark seul, nom seul
//   `sur`   — sur QUELLE couleur de textile le fichier va : la seule chose qui compte
//             au moment de téléverser.
// Les dimensions ne sont pas ici : le build recadre au contenu puis ramène le côté long
// à 4000 px (cf. build-merch.mjs).
export const PIECES = [
  { id: 'dos-couleur', pose: 'dos', mark: 'otomata-mark.svg', encre: ENCRE, ombre: SAFFRAN,
    sur: 'textiles clairs — la pièce principale : dos de t-shirt, tote bag' },
  { id: 'dos-encre', pose: 'dos', mark: 'otomata-mark-mono-encre.svg', encre: ENCRE, ombre: null,
    sur: 'textiles saffran ou jaunes' },
  { id: 'dos-blanc', pose: 'dos', mark: 'otomata-mark-mono-blanc.svg', encre: CREME, ombre: null,
    sur: 'textiles foncés' },

  { id: 'ligne-couleur', pose: 'ligne', mark: 'otomata-mark.svg', encre: ENCRE, ombre: SAFFRAN,
    sur: 'textiles clairs — poitrine (cœur), mug, casquette' },
  { id: 'ligne-encre', pose: 'ligne', mark: 'otomata-mark-mono-encre.svg', encre: ENCRE, ombre: null,
    sur: 'textiles saffran ou jaunes — poitrine (cœur)' },
  { id: 'ligne-blanc', pose: 'ligne', mark: 'otomata-mark-mono-blanc.svg', encre: CREME, ombre: null,
    sur: 'textiles foncés — poitrine (cœur)' },

  { id: 'bande-couleur', pose: 'bande', glyphe: [SAFFRAN, ENCRE, SAFFRAN],
    sur: 'textiles clairs — bas de vêtement à la verticale (ourlet, couture latérale)' },
  { id: 'bande-encre', pose: 'bande', glyphe: [ENCRE, null, ENCRE],
    sur: 'textiles saffran ou jaunes — bas de vêtement à la verticale' },
  { id: 'bande-blanc', pose: 'bande', glyphe: [CREME, null, CREME],
    sur: 'textiles foncés — bas de vêtement à la verticale' },

  { id: 'mark-couleur', pose: 'mark', mark: 'otomata-mark.svg',
    sur: 'textiles clairs (blanc, crème, gris clair) — sticker rond, broderie' },
  { id: 'mark-encre', pose: 'mark', mark: 'otomata-mark-mono-encre.svg',
    sur: 'textiles saffran ou jaunes, où le mark en couleur se noierait' },
  { id: 'mark-blanc', pose: 'mark', mark: 'otomata-mark-mono-blanc.svg',
    sur: 'textiles foncés (noir, encre, marine)' },

  { id: 'mot-couleur', pose: 'mot', encre: ENCRE, ombre: SAFFRAN,
    sur: 'textiles clairs — le nom seul, en bandeau (gourde, casquette)' },
  { id: 'mot-blanc', pose: 'mot', encre: CREME, ombre: null,
    sur: 'textiles foncés — le nom seul' },
];

// U est une unité de PROPORTION, pas une taille : le build recadre au contenu puis ramène
// le côté long à 4000 px, en rendant à l'échelle qu'il faut pour y arriver. Ce qui se règle
// ici, c'est le rapport entre le mark, le texte et l'air qui les sépare — rien d'autre.
const U = 1000;
const CANEVAS = {
  dos:   { w: 1.8, h: 2.1 },
  ligne: { w: 4.6, h: 1.5 },
  // La bande est verticale par construction : le glyphe colonne fait 1:5, prêt à poser le
  // long d'un ourlet.
  bande: { w: 0.5, h: 2.6 },
  mark:  { w: 1.2, h: 1.2 },
  mot:   { w: 4.6, h: 1.6 },
};

export const canevas = p => ({
  w: Math.round(U * CANEVAS[p.pose].w), h: Math.round(U * CANEVAS[p.pose].h),
});

export const page = (p, echelle = 1) => {
  const c = canevas(p);
  const w = Math.round(c.w * echelle), h = Math.round(c.h * echelle);
  const u = U * echelle;
  const px = n => `${Math.round(n)}px`;

  const bande = p.pose === 'bande';
  const ligne = p.pose === 'ligne', dos = p.pose === 'dos';
  const texte = ligne ? ADRESSE : (dos || p.pose === 'mot') ? NOM : '';
  // Le nom règle la largeur de la pièce du dos ; la phrase et le filet s'alignent dessus.
  const large = 1.35 * u;
  const fonte = p.pose === 'mot' ? u
    : dos ? large / RATIO_NOM
    : 0.5 * u;                                   // l'adresse, en ligne : minuscules, plus étroite
  const decal = fonte * 0.06;

  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..800&family=JetBrains+Mono:wght@500&display=swap">
<style>
  html,body{margin:0;padding:0;width:${w}px;height:${h}px;overflow:hidden;background:transparent}
  body{display:flex;flex-direction:${ligne ? 'row' : 'column'};align-items:center;justify-content:center;
       gap:${px(u * (ligne ? 0.18 : 0.02))}}
  .m{width:${px(u)};height:${px(u)};display:${p.mark ? 'block' : 'none'};flex:none}
  .g{width:${px(u * 0.5)};display:${p.glyphe ? 'block' : 'none'}}
  .g svg{width:100%;height:auto;display:block}
  .m svg{width:100%;height:100%;display:block}
  .mot{display:${texte ? 'block' : 'none'};white-space:nowrap;
    font-family:"Bricolage Grotesque",sans-serif;font-optical-sizing:auto;
    font-variation-settings:"wdth" 90;font-weight:600;letter-spacing:-.035em;
    font-size:${px(fonte)};line-height:.9;color:${p.encre || 'transparent'};
    ${p.mark && ligne ? `margin-top:${px(-u * RECENTRE)};` : ''}
    ${p.ombre ? `text-shadow:${px(decal)} ${px(decal)} 0 ${p.ombre};` : ''}}
  /* Le filet et la phrase n'existent qu'au dos : c'est la seule pièce qui a la place
     de dire quelque chose. */
  .filet{display:${dos ? 'block' : 'none'};width:${px(large)};height:${px(u * 0.009)};
    background:${p.encre};margin:${px(u * 0.075)} 0 ${px(u * 0.055)}}
  .phrase{display:${dos ? 'block' : 'none'};white-space:nowrap;
    font-family:"JetBrains Mono",monospace;font-weight:500;letter-spacing:.16em;
    font-size:${px(large / RATIO_PHRASE)};color:${p.encre};text-indent:.16em}
</style></head><body>
  <div class="m">${p.mark ? svg(p.mark) : ''}</div>
  <div class="g">${p.glyphe ? colonne(...p.glyphe) : ''}</div>
  <div class="mot">${texte}</div>
  <div class="filet"></div>
  <div class="phrase">${PHRASE}</div>
</body></html>`;
};
