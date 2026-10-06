// Rend une carte imprimée : plaquettes/<gabarit>.html + un fichier de données -> PDF avec fond perdu.
// Usage : node plaquettes/build-carte.mjs <gabarit> <donnees.json> [sortie.pdf]
//   gabarit : carte-voeux | carte-visite
//
// Les données (titre, message, coordonnées…) vivent hors de ce dépôt public : elles portent des noms.
// Polices embarquées depuis assets/fonts.css — chez un imprimeur, une police non embarquée est
// remplacée sans avertissement. Contrôle : `pdffonts <sortie.pdf>` doit dire emb=yes partout.
//
// Le build fournit aussi ce que le gabarit ne peut pas calculer seul :
//   - `marque` : les marks lus dans brand/logos/otomata (jamais recopiés), le nom, la phrase et l'adresse du merch ;
//   - `qrMatrice` : la grille du QR code de `qr` (texte libre, une vCard par exemple), via qrencode ;
//     le gabarit la dessine.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MARQUE } from '../brand/merch/pieces.mjs';

const DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(DIR, '..');
const GEN = join(ROOT, '.gen');

const [gabarit, donnees, sortie] = process.argv.slice(2);
if (!gabarit || !donnees) {
  console.error('usage : node plaquettes/build-carte.mjs <gabarit> <donnees.json> [sortie.pdf]');
  process.exit(1);
}
const source = join(DIR, gabarit + '.html');
if (!existsSync(source)) throw new Error(`gabarit inconnu : ${source}`);
const data = JSON.parse(readFileSync(donnees, 'utf8'));
const pdf = resolve(sortie || join(ROOT, 'out/plaquettes', basename(donnees, '.json') + '.pdf'));

const mark = v => readFileSync(join(ROOT, 'brand/logos/otomata', `otomata-mark${v}.svg`), 'utf8');
// le mark couleur sur fond clair, sa version encre sur fond saffran (sinon le disque s'y noie)
data.marque = { ...MARQUE, mark: mark(''), markEncre: mark('-mono-encre') };
if (data.qr) {
  // niveau de correction L : moins de modules, donc plus gros à l'impression (≈ 0,4 mm sur 22 mm) ;
  // le dessin garde des modules carrés pleins, il ne puise pas dans la marge de correction
  const q = spawnSync('qrencode', ['-t', 'ASCII', '-m', '0', '-l', 'L', '-o', '-', data.qr], { encoding: 'utf8' });
  if (q.status !== 0) throw new Error(`qrencode : ${q.stderr}`);
  // un module = deux caractères ; « 1 » = module sombre
  data.qrMatrice = q.stdout.trimEnd().split('\n').map(l => l.replace(/../g, c => c === '##' ? '1' : '0'));
}

const body = readFileSync(source, 'utf8')
  .replace('<!--__DATA__-->', `<script>window.__CARTE=${JSON.stringify(data)};</script>`)
  .replace('/* __FONTS__ */', readFileSync(join(ROOT, 'assets/fonts.css'), 'utf8'));
mkdirSync(GEN, { recursive: true });
mkdirSync(dirname(pdf), { recursive: true });
const page = join(GEN, gabarit + '.html');
writeFileSync(page, `<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><title>Otomata — carte</title></head><body>\n${body}\n</body></html>`);

const r = spawnSync('google-chrome-stable', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  // profil isolé, sinon Chrome ferme les fenêtres de l'utilisateur et le rendu échoue
  '--user-data-dir=/tmp/oto-build-chrome-carte',
  // sans budget de temps virtuel, l'impression part avant le chargement des fonts
  '--virtual-time-budget=8000',
  '--no-pdf-header-footer',
  `--print-to-pdf=${pdf}`,
  `file://${page}`,
], { stdio: 'ignore' });
const ok = r.status === 0 && existsSync(pdf) && statSync(pdf).size > 0;
console.log(`${ok ? '✓' : '✗'} ${pdf}`);
if (!ok) process.exit(1);
