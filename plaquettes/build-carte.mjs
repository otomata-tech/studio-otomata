// Rend une carte imprimée : plaquettes/carte-voeux.html + un fichier de données -> PDF A6 + fond perdu.
// Usage : node plaquettes/build-carte.mjs <donnees.json> [sortie.pdf]
//
// Les données (titre, message, signataire…) vivent hors de ce dépôt public : elles portent des noms.
// Polices embarquées depuis assets/fonts.css — chez un imprimeur, une police non embarquée est
// remplacée sans avertissement. Contrôle : `pdffonts <sortie.pdf>` doit dire emb=yes partout.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(DIR, '..');
const GEN = join(ROOT, '.gen');

const [donnees, sortie] = process.argv.slice(2);
if (!donnees) { console.error('usage : node plaquettes/build-carte.mjs <donnees.json> [sortie.pdf]'); process.exit(1); }
const data = JSON.parse(readFileSync(donnees, 'utf8'));
const pdf = resolve(sortie || join(ROOT, 'out/plaquettes', basename(donnees, '.json') + '.pdf'));

const body = readFileSync(join(DIR, 'carte-voeux.html'), 'utf8')
  .replace('<!--__DATA__-->', `<script>window.__CARTE=${JSON.stringify(data)};</script>`)
  .replace('/* __FONTS__ */', readFileSync(join(ROOT, 'assets/fonts.css'), 'utf8'));
mkdirSync(GEN, { recursive: true });
mkdirSync(dirname(pdf), { recursive: true });
const page = join(GEN, 'carte-voeux.html');
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
