// Le kit de marque : les visuels FIXES d'une marque, ceux qu'on télécharge.
// L'IHM voisine est un GÉNÉRATEUR — on y remplit un formulaire et le rendu part dans une
// galerie purgée au-delà de 60 travaux. Un logo de page LinkedIn n'a rien à faire là :
// il ne change pas, il ne se remplit pas, et il doit rester à la même adresse.
//
// D'où ce module : mêmes gabarits et mêmes données que le studio, mais rendus une fois et
// gardés en cache sous une empreinte des sources. Le dessin change → l'empreinte change →
// les visuels se refont d'eux-mêmes au prochain accès.
//
// Le moteur est commun aux marques (service/marques.mjs) : chacune dit ses visuels, ses logos,
// ses données ; chacune a son dossier de cache, out/kit/<marque>/.
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from './render.mjs';
import { chemin as cheminMarque, liste as marques } from './marques.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const cache = m => join(ROOT, 'out', 'kit', m.id);
const dossierLogos = m => join(ROOT, m.logos.dossier);

const empreinte = m => {
  const h = createHash('sha1').update(JSON.stringify(m.kit.donnees()));
  for (const s of m.kit.sources) h.update(readFileSync(join(ROOT, s)));
  // les SVG entrent dans l'empreinte : un mark retouché doit refaire ses PNG
  for (const l of Object.values(m.logos.table)) h.update(readFileSync(join(dossierLogos(m), l.fichier)));
  return h.digest('hex').slice(0, 8);
};

// Ce que la page du kit dit pour toutes les marques (mêmes emplacements LinkedIn, même cache),
// avant les notes propres à la marque.
const NOTES_COMMUNES = [
  '<b>Le premier affichage rend les visuels</b> — quelques secondes par format, une seule fois : ensuite ils '
    + 'sont servis depuis le cache, à la même adresse.',
  '<b>Zones que LinkedIn masque, déjà prises en compte :</b> la photo de profil et le logo de page recouvrent '
    + 'le bas-gauche des couvertures, et le rognage mobile mange les bords — d\'où le contenu groupé au centre '
    + 'plutôt qu\'aux angles.',
  '<b>La couverture de page est en 4200×700.</b> L\'ancienne cote 1128×191, encore partout dans les guides, a '
    + 'le même ratio 6:1 mais rend flou.',
];

const chemin = (m, f, v, apercu, ext = 'png') => join(cache(m), `${f}-${v}${apercu ? '-apercu' : ''}.${ext}`);

/** Ce que la page affiche : un visuel par format, sa cible, sa cote livrée, ses URL. */
export function etat(m) {
  const v = empreinte(m);
  const base = `/kit${cheminMarque(m)}`;
  const { visuels, diaporama } = m.kit;
  return {
    marque: { id: m.id, nom: m.nom, fichiers: m.fichiers },
    marques: marques(),
    version: v,
    titre: m.kit.titre,
    intro: m.kit.intro,
    identite: m.kit.identite(),
    notes: [...NOTES_COMMUNES, ...m.kit.notes],
    logos: Object.entries(m.logos.table).map(([clef, l]) => ({
      clef, nom: l.nom, note: l.note, fond: l.fond,
      svg: `${base}/logo/${clef}.svg?v=${v}`,
      png: l.tailles.map(t => ({ taille: t, url: `${base}/logo/${clef}-${t}.png?v=${v}` })),
    })),
    photos: m.kit.photos ? m.kit.photos(v) : [],
    diaporama: diaporama ? diaporama.images.map((d, i) => ({
      n: i + 1, titre: d.titre,
      livre: `${diaporama.taille.width * diaporama.taille.scale}×${diaporama.taille.height * diaporama.taille.scale}`,
      fichier: `${base}/diapo/${i + 1}.png?v=${v}`,
      apercu: `${base}/diapo/${i + 1}-apercu.png?v=${v}`,
    })) : [],
    visuels: Object.entries(visuels).map(([f, s]) => ({
      format: f,
      cible: s.cible,
      page_css: `${s.width}×${s.height}`,
      rendu: `${s.scale}×`,
      livre: `${s.width * s.scale}×${s.height * s.scale}`,
      fichier: `${base}/${f}.png?v=${v}`,
      // Le JPEG, quand la marque en livre un à côté du PNG (cf. render.mjs, option `jpeg`).
      ...(m.kit.jpeg ? { fichier_jpg: `${base}/${f}.jpg?v=${v}` } : {}),
      apercu: `${base}/${f}-apercu.png?v=${v}`,
      en_cache: existsSync(chemin(m, f, v)),
    })),
  };
}

// Deux onglets ouverts sur la page, c'est douze requêtes d'un coup : sans ce registre,
// chacune lancerait son propre rendu du même visuel et la file du moteur les empilerait.
const enCours = new Map();
const uneFois = (cle, produire) => {
  if (!enCours.has(cle)) enCours.set(cle, produire().finally(() => enCours.delete(cle)));
  return enCours.get(cle);
};

/** Chemin d'un visuel du kit, rendu à la demande au premier accès. */
export function visuel(m, format, { apercu = false, ext = 'png' } = {}) {
  // `Object.hasOwn` : le format vient de l'URL — `constructor` ou `toString` ne doivent pas trouver de quoi indexer.
  if (!Object.hasOwn(m.kit.visuels, format)) throw Object.assign(new Error(`format inconnu : ${format}`), { status: 404 });
  if (ext === 'jpg' && (!m.kit.jpeg || apercu))
    throw Object.assign(new Error(`pas de JPEG dans le kit ${m.nom}`), { status: 404 });
  const v = empreinte(m);
  const voulu = chemin(m, format, v, apercu, ext);
  if (existsSync(voulu)) return Promise.resolve(voulu);
  return uneFois(`${m.id}-${format}-${v}`, () => produire(m, format, v)).then(() => voulu);
}

async function produire(m, format, v) {
  const { width, height, scale } = m.kit.visuels[format];
  await rendre(m, `.travail-${format}`, chemin(m, format, v),
    { html: m.kit.html(format), width, height, scale, formats: ['png'], jpeg: m.kit.jpeg || 0 },
    chemin(m, format, v, false, 'jpg'));
  reduire(chemin(m, format, v), chemin(m, format, v, true));
  purge(m, v);
}

/** Une image du diaporama, rendue à la demande. */
export function diapo(m, n, { apercu = false } = {}) {
  const d = m.kit.diaporama;
  if (!d) throw Object.assign(new Error(`pas de diaporama pour ${m.nom}`), { status: 404 });
  if (!Number.isInteger(n) || n < 1 || n > d.images.length)
    throw Object.assign(new Error(`image de diaporama inconnue : ${n} (1 à ${d.images.length})`), { status: 404 });
  const v = empreinte(m);
  const voulu = join(cache(m), `diapo-${n}-${v}${apercu ? '-apercu' : ''}.png`);
  if (existsSync(voulu)) return Promise.resolve(voulu);
  return uneFois(`${m.id}-diapo-${n}-${v}`, () => produireDiapo(m, n, v)).then(() => voulu);
}

async function produireDiapo(m, n, v) {
  const d = m.kit.diaporama;
  const plein = join(cache(m), `diapo-${n}-${v}.png`);
  await rendre(m, `.travail-diapo-${n}`, plein, { html: d.images[n - 1].html(), ...d.taille, formats: ['png'] });
  reduire(plein, join(cache(m), `diapo-${n}-${v}-apercu.png`));
  purge(m, v);
}

/** Rend une page dans un dossier de travail, puis pose le PNG (et le JPEG demandé) à sa place définitive. */
async function rendre(m, travail, cible, job, cibleJpg) {
  const dir = join(cache(m), travail);
  mkdirSync(cache(m), { recursive: true });
  const { files } = await render({ ...job, dir });
  renameSync(join(dir, 'visuel.png'), cible);
  if (job.jpeg) renameSync(join(dir, files.jpg), cibleJpg);
  rmSync(dir, { recursive: true, force: true });
}

/** Aperçu léger : la page en montre une dizaine, servir les pleins formats pour un
 *  écran de 900 px ferait attendre pour rien. `min(900,iw)` — jamais agrandir. */
function reduire(source, cible) {
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', source,
    '-vf', "scale='min(900,iw)':-2:flags=lanczos", cible]);
  if (r.status !== 0) throw new Error(`ffmpeg a échoué sur l'aperçu de ${source}`);
}

/** Le SVG d'une variante, servi depuis brand/ sans copie. */
export function logoSvg(m, clef) {
  if (!Object.hasOwn(m.logos.table, clef)) throw Object.assign(new Error(`variante inconnue : ${clef}`), { status: 404 });
  return join(dossierLogos(m), m.logos.table[clef].fichier);
}

/** Le rapport hauteur / largeur d'un SVG, lu sur son viewBox : un logo large (mark + nom) se
 *  rastérise à sa forme, pas dans un carré. Un SVG sans viewBox lève une erreur. */
function ratio(svg, fichier) {
  const vb = /viewBox="([^"]+)"/.exec(svg);
  if (!vb) throw new Error(`logo sans viewBox, impossible à rastériser à sa forme : ${fichier}`);
  const [, , w, h] = vb[1].trim().split(/[\s,]+/).map(Number);
  return h / w;
}

/** Le PNG d'une variante à une taille (sa LARGEUR), rastérisé à la demande. Transparent : un logo
 *  qui arrive avec un fond blanc n'est pas posable sur autre chose que du blanc. */
export function logoPng(m, clef, taille) {
  const l = Object.hasOwn(m.logos.table, clef) ? m.logos.table[clef] : null;
  if (!l) throw Object.assign(new Error(`variante inconnue : ${clef}`), { status: 404 });
  if (!l.tailles.includes(taille))
    throw Object.assign(new Error(`taille non servie pour ${clef} : ${taille} (servies : ${l.tailles.join(', ')})`), { status: 404 });
  const v = empreinte(m);
  const png = join(cache(m), `logo-${clef}-${taille}-${v}.png`);
  if (existsSync(png)) return Promise.resolve(png);
  return uneFois(`${m.id}-logo-${clef}-${taille}-${v}`, () => produireLogo(m, clef, taille, png, v)).then(() => png);
}

async function produireLogo(m, clef, taille, png, v) {
  const svg = readFileSync(join(dossierLogos(m), m.logos.table[clef].fichier), 'utf8');
  const largeur = taille, hauteur = Math.round(taille * ratio(svg, m.logos.table[clef].fichier));
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>` +
    `html,body{margin:0;padding:0;width:${largeur}px;height:${hauteur}px;overflow:hidden;background:transparent}` +
    `svg{display:block;width:${largeur}px;height:${hauteur}px}</style></head><body>${svg}</body></html>`;
  await rendre(m, `.travail-logo-${clef}-${taille}`, png,
    { html, width: largeur, height: hauteur, formats: ['png'], transparent: true });
  purge(m, v);
}

/** Les fichiers d'une empreinte précédente ne servent plus à personne. */
function purge(m, v) {
  for (const f of readdirSync(cache(m)))
    if (/\.(png|jpg)$/.test(f) && !f.includes(`-${v}`)) rmSync(join(cache(m), f), { force: true });
}
