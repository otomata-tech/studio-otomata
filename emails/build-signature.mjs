// Signature mail Otomata, la page à copier-coller dans Gmail (le bloc lui-même : signature.mjs).
// Usage : node emails/build-signature.mjs <donnees.json> [...]  -> out/emails/signature-<nom>.html (+ .png)
//
// Les données sont celles de la carte de visite (out/plaquettes/carte-visite-<x>.json : nom, fonction,
// email, tel) plus `liens` [{texte, url}] — elles vivent hors de ce dépôt public.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { signature, esc, C, POLICE } from './signature.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'out/emails');

const fichiers = process.argv.slice(2);
if (!fichiers.length) { console.error('usage : node emails/build-signature.mjs <donnees.json> [...]'); process.exit(1); }

/** La page qu'on ouvre pour copier : la signature seule dans un cadre, et un bouton qui la met
 *  dans le presse-papiers en HTML — Gmail ne colle que du rendu, pas du code source. */
const page = (d, sig) => `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Signature — ${esc(d.nom)}</title>
<style>
  body { margin: 0; padding: 40px; background: ${C.bg}; font-family: ${POLICE}; color: ${C.ink}; }
  .cadre { display: inline-block; background: #fff; padding: 24px 28px; border: 1px solid ${C.ink}; box-shadow: 5px 5px 0 ${C.primary}; }
  .aide { margin-top: 28px; max-width: 560px; font-size: 13px; line-height: 1.6; color: ${C.mute}; }
  button { margin-top: 20px; font: 700 13px ${POLICE}; padding: 9px 16px; background: ${C.primary}; color: ${C.ink};
    border: 1px solid ${C.ink}; box-shadow: 3px 3px 0 ${C.ink}; cursor: pointer; }
  #etat { margin-left: 12px; font-size: 13px; }
</style></head><body>
<div class="cadre"><div id="signature">${sig}</div></div>
<div><button id="copier">Copier la signature</button><span id="etat"></span></div>
<div class="aide">Gmail → Paramètres → Voir tous les paramètres → Général → Signature : créer ou
  choisir la signature, coller dans l'éditeur, puis « Enregistrer les modifications » en bas de page.</div>
<script>
  document.getElementById('copier').onclick = async () => {
    const etat = document.getElementById('etat');
    const html = document.getElementById('signature').innerHTML;
    try {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([document.getElementById('signature').innerText], { type: 'text/plain' }),
      })]);
      etat.textContent = 'Copiée — à coller dans Gmail.';
    } catch (e) {
      etat.textContent = 'Copie refusée par le navigateur (' + e.message + ') : sélectionner le cadre et copier à la main.';
    }
  };
</script></body></html>`;

mkdirSync(OUT, { recursive: true });
for (const f of fichiers) {
  const d = JSON.parse(readFileSync(f, 'utf8'));
  const nom = basename(f, '.json').replace(/^carte-visite-/, '');
  const html = join(OUT, `signature-${nom}.html`);
  writeFileSync(html, page(d, signature(d)));
  // aperçu : la signature seule, à l'échelle 2
  const png = join(OUT, `signature-${nom}.png`);
  const r = spawnSync('google-chrome-stable', ['--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--no-first-run', '--no-default-browser-check', '--user-data-dir=/tmp/oto-build-chrome-signature',
    '--virtual-time-budget=6000', '--force-device-scale-factor=2', '--window-size=700,260',
    `--screenshot=${png}`, `file://${html}`], { stdio: 'ignore' });
  console.log(`${r.status === 0 ? '✓' : '✗'} ${html}`);
  if (r.status !== 0) process.exit(1);
}
