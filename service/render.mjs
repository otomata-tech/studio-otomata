// Moteur de rendu : HTML animé (window.__seek déterministe) -> PNG / MP4 / GIF.
// Un seul Chrome persistant, une seule file : les rendus sont SÉRIALISÉS (pointe
// mesurée ~900 Mo de RSS par rendu — deux en parallèle sur une petite box, c'est le gel).
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = process.env.STUDIO_CHROME || 'google-chrome-stable';
const CDP_PORT = Number(process.env.STUDIO_CDP_PORT || 9366);
const PROFILE = process.env.STUDIO_CHROME_PROFILE || '/tmp/oto-studio-chrome';
// Chrome au repos coûte ~200 Mo pour rien. Sur une box partagée, on le rend après
// un temps sans rendu : le premier rendu suivant paie ~2 s de démarrage, et le reste
// du temps le service ne pèse que son Node.
const IDLE_MS = Number(process.env.STUDIO_CHROME_IDLE_MS || 600_000);

let ws, sessionId, msgId = 0, ready = null, proc = null, idleTimer = null;
const pending = new Map();
// Erreurs JS levées par la page en cours de rendu. Un gabarit qui plante à moitié
// rend quand même une image — amputée, mais qui ressemble à un succès. (01/10)
let pageErrors = [];

function send(method, params = {}, withSession = false) {
  const id = ++msgId;
  ws.send(JSON.stringify(withSession ? { id, sessionId, method, params } : { id, method, params }));
  return new Promise((res, rej) => pending.set(id, { res, rej }));
}
const ss = (method, params) => send(method, params, true);

async function boot() {
  // --user-data-dir isolé OBLIGATOIRE : sans lui Chrome partage le profil du
  // navigateur de bureau, ferme ses fenêtres et fait échouer le rendu.
  proc = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--no-default-browser-check', '--no-sandbox', `--user-data-dir=${PROFILE}`,
    `--remote-debugging-port=${CDP_PORT}`, '--force-device-scale-factor=1', 'about:blank'],
    { stdio: 'ignore' });

  let url;
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      url = (await r.json()).webSocketDebuggerUrl;
      if (url) break;
    } catch { /* pas encore debout */ }
    await sleep(150);
  }
  if (!url) throw new Error(`Chrome n'a pas ouvert son port de debug (${CHROME}, port ${CDP_PORT})`);

  ws = new WebSocket(url);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      pageErrors.push(d.exception?.description || d.text);
      return;
    }
    if (!m.id || !pending.has(m.id)) return;
    const p = pending.get(m.id);
    pending.delete(m.id);
    m.error ? p.rej(new Error(m.error.message)) : p.res(m.result);
  });
  ws.addEventListener('close', () => { ready = null; });

  // Pas de width/height ici : avec un profil isolé Chrome répond « Target position
  // can only be set for new windows ». La taille se pose par Emulation, au rendu.
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  ({ sessionId } = await send('Target.attachToTarget', { targetId, flatten: true }));
  await ss('Page.enable');
  await ss('Runtime.enable');
}

function chrome() {
  clearTimeout(idleTimer);
  if (!ready) ready = boot().catch(e => { ready = null; throw e; });
  return ready;
}

/** Rend Chrome après IDLE_MS sans rendu. Le prochain appel le relance. */
function armIdle() {
  clearTimeout(idleTimer);
  if (!IDLE_MS) return;
  idleTimer = setTimeout(async () => {
    const p = proc, sock = ws;
    ready = null; proc = null; sessionId = undefined;
    // `Browser.close` est la seule fermeture fiable : le process qu'on a lancé n'est
    // pas forcément celui qui survit (Chrome refork), donc un SIGTERM dessus peut ne
    // rien tuer du tout — vérifié, les process restaient. Le kill n'est qu'un filet.
    try { await send('Browser.close'); } catch { /* déjà parti */ }
    try { sock?.close(); } catch { /* déjà fermé */ }
    setTimeout(() => { try { p?.kill('SIGKILL'); } catch { /* rien à tuer */ } }, 2000).unref?.();
    console.error('[studio] Chrome rendu après inactivité');
  }, IDLE_MS);
  idleTimer.unref?.();
}

const evalJs = (expr, awaitPromise = false) =>
  ss('Runtime.evaluate', { expression: expr, awaitPromise, returnByValue: true })
    .then(r => r.result?.value);

let chain = Promise.resolve();

/**
 * Exécuter une page dans le Chrome du service et rendre ce qu'elle produit.
 *
 * Passe par la MÊME file que les rendus, et c'est le point : le Chrome est unique et
 * sérialisé parce que deux travaux lourds en parallèle gèlent une petite box. Un atelier
 * photo qui ouvrirait son propre Chrome ferait exactement ce que cette file interdit.
 *
 * La page doit exposer `window.__fait`, une promesse rendant une valeur sérialisable.
 */
export function dansChrome(fichier) {
  const run = () => executePage(fichier).finally(armIdle);
  chain = chain.then(run, run);
  return chain;
}

async function executePage(fichier) {
  await chrome();
  await ss('Page.navigate', { url: `file://${fichier}` });
  // Sonder plutôt que dormir : une photo de 7 Mpx se décode en bien moins que le délai
  // qu'il faudrait poser pour être tranquille dans tous les cas.
  let prete = false;
  for (let i = 0; i < 200 && !prete; i++) {
    prete = await evalJs('document.readyState === "complete" && !!window.__fait');
    if (!prete) await sleep(50);
  }
  if (!prete) throw new Error('la page de traitement n\'a pas démarré (10 s)');
  const r = await evalJs('window.__fait.then(v => ({ v })).catch(e => ({ e: String(e && e.message || e) }))', true);
  if (r?.e) throw new Error(r.e);
  return r?.v;
}

/**
 * Rend un HTML dans le dossier `dir`. `formats` ⊂ {png, mp4, gif}.
 * Sérialisé : chaque appel attend la fin du précédent, y compris après un échec.
 */
export function render(job) {
  const run = () => doRender(job).finally(armIdle);
  chain = chain.then(run, run);
  return chain;
}

async function doRender({ html, dir, width, height, fps = 25, formats, scale = 1, transparent = false, jpeg = 0 }) {
  await chrome();
  mkdirSync(dir, { recursive: true });
  const htmlPath = `${dir}/page.html`;
  writeFileSync(htmlPath, html);

  const started = Date.now();
  await ss('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false });
  // Un PNG de logo doit être détourable : sans cet override, Chrome peint un fond
  // blanc opaque sous la page. L'override vit sur la session, pas sur le rendu : on le
  // pose donc à CHAQUE rendu, dans un sens ou dans l'autre. Le retirer en fin de rendu
  // ne suffisait pas — un rendu qui échoue en route le laissait, et les visuels
  // suivants sortaient troués.
  await ss('Emulation.setDefaultBackgroundColorOverride',
    transparent ? { color: { r: 0, g: 0, b: 0, a: 0 } } : {});
  pageErrors = [];
  await ss('Page.navigate', { url: `file://${htmlPath}?capture=1` });
  await sleep(900);
  await evalJs('document.fonts.ready.then(()=>1)', true);
  if (pageErrors.length)
    throw new Error(`le gabarit a planté sur ces données : ${pageErrors[0].split('\n')[0]}`);

  const files = {};
  const clip = { x: 0, y: 0, width, height, scale: 1 };

  if (formats.includes('png')) {
    // L'instant de l'image fixe est celui que le gabarit désigne (`__STILL`) — la
    // dernière image ne convient pas quand l'animation finit par un fondu : on ne
    // capturerait que le fond. À défaut, la dernière image, jamais un temps
    // arbitrairement grand (les styles sont calculés depuis `t`, hors bornes ne
    // garantit rien).
    if (await evalJs('typeof window.__seek === "function"'))
      await evalJs('window.__seek(window.__STILL ?? ((window.__DURATION || 6800) - 1))');
    const { data } = await ss('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: true });
    writeFileSync(`${dir}/visuel.png`, Buffer.from(data, 'base64'));
    files.png = 'visuel.png';
    // `jpeg` (une qualité, ex. 90) : la même image en JPEG, à côté du PNG. Un visuel à grain de papier
    // pixel par pixel (les affiches du Cowork) pèse ~9 Mo en PNG — au-delà de ce que LinkedIn accepte
    // (3 Mo pour une couverture de page) ; en JPEG, deux à trois fois moins.
    if (jpeg) {
      const { data: jpg } = await ss('Page.captureScreenshot',
        { format: 'jpeg', quality: jpeg, clip, captureBeyondViewport: true });
      writeFileSync(`${dir}/visuel.jpg`, Buffer.from(jpg, 'base64'));
      files.jpg = 'visuel.jpg';
    }
  }

  const wantsFilm = formats.includes('mp4') || formats.includes('gif');
  if (wantsFilm) {
    if (!(await evalJs('typeof window.__seek === "function"')))
      throw new Error('ce gabarit n\'est pas animé (pas de window.__seek) — demande le format png');

    const duration = await evalJs('window.__DURATION') || 6800;
    const frames = Math.round(duration / 1000 * fps);
    const fdir = `${dir}/frames`;
    rmSync(fdir, { recursive: true, force: true });
    mkdirSync(fdir, { recursive: true });

    // Images intermédiaires en JPEG, pas en PNG : elles ne servent qu'à nourrir
    // l'encodeur, qui recompresse en H.264 derrière. Compresser sans perte 300 images
    // de 1,8 Mpx pour les jeter ensuite coûte l'essentiel du temps de rendu.
    // Le PNG final, lui, reste sans perte — c'est un livrable, pas un intermédiaire.
    for (let f = 0; f < frames; f++) {
      await ss('Runtime.evaluate', { expression: `window.__seek(${Math.round(f / fps * 1000)})` });
      const { data } = await ss('Page.captureScreenshot',
        { format: 'jpeg', quality: 94, clip, captureBeyondViewport: true });
      writeFileSync(`${fdir}/frame_${String(f).padStart(4, '0')}.jpg`, Buffer.from(data, 'base64'));
    }

    // Les JPEG sont en pleine échelle (0-255) : sans conversion explicite, le MP4 sortait en
    // yuvj420p marqué « pc », que les lecteurs et LinkedIn lisent comme une échelle réduite :
    // le crème virait au blanc et les teintes saturaient (constaté sur le cas d'usage n° 2, 23/10).
    const mp4 = `${dir}/visuel.mp4`;
    ffmpeg(['-framerate', String(fps), '-i', `${fdir}/frame_%04d.jpg`,
      '-vf', 'scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p',
      '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'iec61966-2-1',
      '-c:v', 'libx264', '-crf', '18', '-movflags', '+faststart', mp4]);
    files.mp4 = 'visuel.mp4';

    if (formats.includes('gif')) {
      const pal = `${fdir}/palette.png`;
      ffmpeg(['-i', mp4, '-vf', 'fps=18,scale=640:-1:flags=lanczos,palettegen=stats_mode=diff', pal]);
      ffmpeg(['-i', mp4, '-i', pal, '-lavfi',
        'fps=18,scale=640:-1:flags=lanczos,paletteuse=dither=bayer:bayer_scale=3', `${dir}/visuel.gif`]);
      files.gif = 'visuel.gif';
    }
    rmSync(fdir, { recursive: true, force: true });
    if (!formats.includes('mp4')) { rmSync(mp4, { force: true }); delete files.mp4; }
  }

  rmSync(htmlPath, { force: true });
  return { files, ms: Date.now() - started };
}

function ffmpeg(args) {
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { encoding: 'utf8' });
  if (r.error) throw new Error(`ffmpeg introuvable : ${r.error.message}`);
  if (r.status !== 0) throw new Error(`ffmpeg a échoué : ${(r.stderr || '').slice(0, 400)}`);
}
