// API du studio + service de l'IHM. Écoute en LOOPBACK : l'exposition passe par
// Caddy, et l'authentification par Cloudflare Access devant le vhost — il n'y a
// volontairement aucune auth applicative ici (même patron que mucho.oto.zone).
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import * as templates from './templates.mjs';
import { openapi } from './openapi.mjs';
import { render } from './render.mjs';
import * as kit from './kit.mjs';
import * as brand from './brand.mjs';
import * as marques from './marques.mjs';
import * as otomata from './marques/otomata.mjs';
import * as uploads from './uploads.mjs';
import * as photos from './photos.mjs';

const DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(DIR, '..');
const WORK = join(ROOT, 'out', 'service');
const PORT = Number(process.env.STUDIO_PORT || 8100);
const HOST = process.env.STUDIO_HOST || '127.0.0.1';
const KEEP = Number(process.env.STUDIO_KEEP || 60);   // travaux gardés dans la galerie
// L'adresse par laquelle un HUMAIN atteint ce service. Elle n'a rien à voir avec celle
// par laquelle un agent l'appelle (réseau privé) : un agent qui rend un lien doit rendre
// celui qu'on peut ouvrir dans un navigateur, pas son propre chemin d'accès.
const PUBLIC_URL = (process.env.STUDIO_PUBLIC_URL || 'https://studio.otomata.tech').replace(/\/+$/, '');

mkdirSync(WORK, { recursive: true });

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mp4': 'video/mp4', '.gif': 'image/gif',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

/* ---------- état des travaux : sur disque, pour survivre au redémarrage ---------- */

const jobPath = id => join(WORK, id, 'job.json');
const saveJob = j => writeFileSync(jobPath(j.id), JSON.stringify(j, null, 2));
const readJob = id => JSON.parse(readFileSync(jobPath(id), 'utf8'));

function listJobs(limit = KEEP) {
  return readdirSync(WORK)
    .filter(d => existsSync(jobPath(d)))
    .map(readJob)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

/** Purge les travaux au-delà des KEEP plus récents : sur une box, une galerie qui
 *  ne se vide jamais finit par remplir le disque (une carte ≈ 100 Ko à 2 Mo). */
function purge() {
  const all = readdirSync(WORK)
    .filter(d => existsSync(jobPath(d)))
    .map(id => ({ id, at: readJob(id).created_at }))
    .sort((a, b) => a.at.localeCompare(b.at));
  for (const { id } of all.slice(0, Math.max(0, all.length - KEEP)))
    rmSync(join(WORK, id), { recursive: true, force: true });
}

/** Un travail tel qu'on le rend au dehors : avec les liens qu'un humain peut ouvrir.
 *  `page` existe dès la création — elle affiche l'attente, puis le visuel. */
const withLinks = j => ({
  ...j,
  page: `${PUBLIC_URL}/r/${j.id}`,
  files_url: Object.fromEntries(
    Object.entries(j.files || {}).map(([k, name]) => [k, `${PUBLIC_URL}/files/${j.id}/${name}`]))
});

const previews = new Map();   // aperçus éphémères : id -> { html, at }

/* ---------- routes ---------- */

const routes = [
  ['GET', /^\/healthz$/, () => ({ ok: true })],

  // Lu par `http_doc()` du connecteur http d'oto : c'est ce document, et lui seul,
  // qui dit à un agent quoi appeler et avec quels champs.
  ['GET', /^\/openapi\.json$/, () => openapi()],

  ['GET', /^\/api\/templates$/, () => ({ templates: templates.list() })],

  ['GET', /^\/api\/templates\/([\w-]+)$/, ([id]) => {
    const { build, ...manifest } = templates.get(id);
    return manifest;
  }],

  ['POST', /^\/api\/previews$/, async (_, body) => {
    const tpl = templates.get(body.template);
    templates.validate(tpl, body.data);
    const id = randomBytes(8).toString('hex');
    previews.set(id, { html: construire(tpl, body.data), at: Date.now() });
    for (const [k, v] of previews) if (Date.now() - v.at > 6e5) previews.delete(k);
    return { id, url: `/previews/${id}` };
  }],

  ['GET', /^\/previews\/([0-9a-f]+)$/, ([id], _b, res) => {
    const p = previews.get(id);
    if (!p) throw Object.assign(new Error('aperçu expiré'), { status: 404 });
    res.writeHead(200, { 'Content-Type': MIME['.html'] });
    res.end(p.html);
  }],

  /* ---------- déposer une image ----------
     Corps BINAIRE, pas de JSON : une image passée en base64 dans les données d'un travail
     gonflerait `job.json` et chaque réponse de la galerie. Le travail ne garde que l'id. */
  ['POST', /^\/api\/uploads$/, (_a, buf, _res, req) => {
    const recu = uploads.depose(buf, req.headers['content-type']);
    uploads.purge();
    return recu;
  }, { brut: true, limite: 12e6 }],

  /* ---------- travailler une image ----------
     Le résultat est un NOUVEAU dépôt, dérivé de la source, que tous les gabarits acceptent :
     l'originale reste disponible, et rien n'oblige à repasser par le gabarit photo. */
  ['POST', /^\/api\/uploads\/([0-9a-f]{16}\.(?:jpg|png|webp))\/derivees$/,
    ([id], body) => photos.travaille(id, body || {})],

  // Ce que ce service sait faire ICI : la clé du modèle d'image est une condition
  // d'environnement, pas du code. L'IHM n'offre pas ce qui échouerait sur cette machine.
  ['GET', /^\/api\/capacites$/, () => ({ photo: photos.capacites() })],

  ['GET', /^\/uploads\/([0-9a-f]{16}\.(?:jpg|png|webp))$/, ([id], _b, res) => {
    if (!uploads.existe(id)) throw Object.assign(new Error('image inconnue'), { status: 404 });
    const buf = readFileSync(uploads.chemin(id));
    res.writeHead(200, { 'Content-Type': MIME[extname(id)], 'Content-Length': buf.length,
      'Cache-Control': 'public, max-age=86400' });
    res.end(buf);
  }],

  ['GET', /^\/api\/renders$/, () => ({ renders: listJobs().map(withLinks) })],

  ['GET', /^\/api\/renders\/([\w-]+)$/, ([id]) => {
    if (!existsSync(jobPath(id))) throw Object.assign(new Error('rendu inconnu'), { status: 404 });
    return withLinks(readJob(id));
  }],

  // La page de suivi : une seule adresse à donner, dès le lancement. Elle montre
  // l'attente puis le visuel — c'est ce qu'un agent rend à un humain.
  ['GET', /^\/r\/([\w-]+)$/, (_a, _b, res) => serveWeb('r.html', res)],

  ['POST', /^\/api\/renders$/, async (_, body) => {
    const tpl = templates.get(body.template);

    // Les formats sont contrôlés AVEC les champs, pas après : le contrat promet que
    // tous les refus arrivent d'un coup, et une vérification en aval le démentait
    // (les fautes de champs masquaient le format non servi).
    const formats = body.formats?.length ? body.formats : ['mp4'];
    const refus = formats.filter(f => !tpl.formats.includes(f))
      .map(f => `format non servi par ce gabarit : ${f} (servis : ${tpl.formats.join(', ')})`);
    try { templates.validate(tpl, body.data); }
    catch (e) { refus.push(...(e.refus || [e.message])); }
    if (refus.length) throw Object.assign(new Error(refus.join(' · ')), { status: 400, refus });

    // L'HTML se construit AVANT de créer le travail : un gabarit qui refuse ses données à la
    // construction répond 400, sans laisser un job.json « en_cours » que /r/<id> attendrait à vie.
    const html = construire(tpl, body.data);
    const id = `${new Date().toISOString().slice(0, 10)}-${tpl.id}-${randomBytes(3).toString('hex')}`;
    const job = {
      id, template: tpl.id, template_label: tpl.label, formats, data: body.data,
      author: body.author || null, status: 'en_cours', created_at: new Date().toISOString(),
      files: {}, error: null, ms: null
    };
    mkdirSync(join(WORK, id), { recursive: true });
    saveJob(job);
    purge();

    // On rend en tâche de fond : la file du moteur sérialise, la réponse ne l'attend pas.
    // Un gabarit multi-formats (`sizes` + `size_field`) rend la taille que ses données
    // désignent : sans ça, le studio produirait un 4:5 pour une couverture de page.
    const choix = body.data?.[tpl.size_field];
    const dim = (tpl.sizes && Object.hasOwn(tpl.sizes, choix) ? tpl.sizes[choix] : null) ?? tpl.size;
    render({
      html, dir: join(WORK, id),
      width: dim.width, height: dim.height, scale: dim.scale ?? 1, fps: tpl.fps, formats,
      jpeg: tpl.jpeg || 0
    }).then(({ files, ms }) => {
      saveJob({ ...readJob(id), status: 'fini', files, ms, finished_at: new Date().toISOString() });
    }).catch(err => {
      saveJob({ ...readJob(id), status: 'échoué', error: String(err.message || err),
        finished_at: new Date().toISOString() });
    });

    return withLinks(job);
  }],

  // Retirer un rendu : la galerie est partagée, un essai raté ne doit pas y rester
  // faute de moyen de le nettoyer. Signalé en faisant appeler l'API par un agent.
  ['DELETE', /^\/api\/renders\/([\w-]+)$/, ([id]) => {
    if (!existsSync(jobPath(id))) throw Object.assign(new Error('rendu inconnu'), { status: 404 });
    rmSync(join(WORK, id), { recursive: true, force: true });
    return { ok: true, id, deleted: true };
  }],

  ['GET', /^\/files\/([\w-]+)\/([\w.-]+)$/, ([id, name], _b, res) => {
    const p = join(WORK, id, basename(name));
    if (!existsSync(p)) throw Object.assign(new Error('fichier absent'), { status: 404 });
    const buf = readFileSync(p);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream',
      'Content-Length': buf.length });
    res.end(buf);
  }],

  /* ---------- la charte et le kit, par marque ----------
     Routes générées pour chaque marque de service/marques.mjs : Otomata garde ses adresses
     historiques (/brand, /kit…), une autre marque les prend sous son identifiant (/brand/cowork,
     /kit/cowork…). Les photos et le merch d'Otomata, propres à la marque, suivent. */
  ...marques.ids().flatMap(id => routesMarque(marques.get(id))),
  ['GET', /^\/brand\/photo\/([a-z-]+)\.jpg$/, ([slug], _b, res) => servirFichier(res, otomata.photo(slug), 'image/jpeg')],
  ['GET', /^\/brand\/merch\/([a-z0-9-]+)\.png$/, async ([id], _b, res) => servirFichier(res, await otomata.merch(id), MIME['.png'])],
  ['GET', /^\/api\/marques$/, () => ({ marques: marques.liste() })],

  ['GET', /^\/$/, (_a, _b, res) => serveWeb('index.html', res)],
  ['GET', /^\/([\w.-]+\.(?:css|js|html|svg))$/, ([f], _b, res) => serveWeb(f, res)]
];

/** Les routes de la charte (PUBLIQUE, sous /brand) et du kit d'une marque. Le préfixe de la
 *  marque par défaut est vide : /brand, /kit — les adresses d'avant le multi-marques. */
function routesMarque(m) {
  const p = marques.chemin(m).replace(/\//g, '\\/');
  const re = motif => new RegExp(`^${motif}$`);
  const png = async (res, fichier) => servirFichier(res, await fichier, MIME['.png']);
  return [
    // ⚠️ PUBLIC : la page, son JSON et les logos. Rien d'autre ne doit entrer sous /brand.
    ['GET', re(`\\/brand${p}`), (_a, _b, res) => serveWeb('brand.html', res)],
    ['GET', re(`\\/brand${p}\\/api`), () => brand.etat(m)],
    ['GET', re(`\\/brand${p}\\/logo\\/([a-z-]+)\\.svg`), ([clef], _b, res) =>
      servirFichier(res, brand.logoSvg(m, clef), MIME['.svg'])],
    ['GET', re(`\\/brand${p}\\/logo\\/([a-z-]+?)-(\\d{1,4})\\.png`), ([clef, taille], _b, res) =>
      png(res, brand.logoPng(m, clef, Number(taille)))],

    /* Le kit : des visuels FIXES, à une adresse stable, hors de la galerie qui se purge — le
       générateur sert à fabriquer, le kit à retrouver. Rendus à la demande au premier accès,
       puis servis depuis le cache (cf. kit.mjs). Logos : SVG servis depuis brand/ (pas de
       copie), PNG rastérisés à la demande et transparents. */
    ['GET', re(`\\/kit${p}`), (_a, _b, res) => serveWeb('kit.html', res)],
    ['GET', re(`\\/api\\/kit${p}`), () => kit.etat(m)],
    ['GET', re(`\\/kit${p}\\/diapo\\/(\\d)(-apercu)?\\.png`), ([n, apercu], _b, res) =>
      png(res, kit.diapo(m, Number(n), { apercu: !!apercu }))],
    ['GET', re(`\\/kit${p}\\/logo\\/([a-z-]+)\\.svg`), ([clef], _b, res) =>
      servirFichier(res, kit.logoSvg(m, clef), MIME['.svg'])],
    ['GET', re(`\\/kit${p}\\/logo\\/([a-z-]+?)-(\\d{1,4})\\.png`), ([clef, taille], _b, res) =>
      png(res, kit.logoPng(m, clef, Number(taille)))],
    ['GET', re(`\\/kit${p}\\/([a-z0-9]+?)(-apercu)?\\.png`), ([format, apercu], _b, res) =>
      png(res, kit.visuel(m, format, { apercu: !!apercu }))],
    ['GET', re(`\\/kit${p}\\/([a-z0-9]+)\\.jpg`), async ([format], _b, res) =>
      servirFichier(res, await kit.visuel(m, format, { ext: 'jpg' }), MIME['.jpg'])],
  ];
}

/** Un fichier de la charte ou du kit. Son URL porte l'empreinte des sources (`?v=`) : ce que
 *  ce chemin renvoie ne changera pas, on peut donc le laisser en cache côté navigateur. */
function servirFichier(res, chemin, type) {
  const buf = readFileSync(chemin);
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': buf.length,
    'Cache-Control': 'public, max-age=86400' });
  res.end(buf);
}

/** L'HTML d'un gabarit. Une erreur levée à la construction vient des données (un dessin qui
 *  refuse une combinaison, un partenaire sans logo ni nom) : c'est un 400, pas une panne. */
function construire(tpl, data) {
  try { return tpl.build(data); }
  catch (e) {
    if (e.status) throw e;
    throw Object.assign(new Error(`construction impossible : ${e.message}`), { status: 400 });
  }
}

function serveWeb(name, res) {
  const p = join(DIR, 'web', basename(name));
  if (!existsSync(p)) throw Object.assign(new Error('introuvable'), { status: 404 });
  // `no-cache` : l'IHM change à chaque déploiement, et un onglet ou un cache resté sur
  // l'ancienne page masque les nouveaux outils (vécu : l'atelier photo « introuvable »).
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'text/plain', 'Cache-Control': 'no-cache' });
  res.end(readFileSync(p));
}

/* ---------- serveur ---------- */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    // Défense en profondeur : `new URL` résout `/brand/%2e%2e/api/renders` (ou `\..\`) en
    // `/api/renders` — un chemin public qui ouvrirait une route fermée si Cloudflare ne
    // normalisait pas avant nous. Un chemin brut qui n'est pas déjà sa forme résolue est refusé.
    const brut = req.url.split('?')[0];
    if (/\.\.|%2e|\\/i.test(brut) || brut !== url.pathname)
      throw Object.assign(new Error('chemin refusé'), { status: 400 });
    // `/brand/` et `/kit/cowork/` : la barre finale renvoie vers l'adresse sans barre.
    if (req.method === 'GET' && url.pathname.length > 1 && url.pathname.endsWith('/')) {
      res.writeHead(301, { Location: url.pathname.replace(/\/+$/, '') + url.search });
      return res.end();
    }
    for (const [method, re, handler, opts] of routes) {
      if (req.method !== method) continue;
      const m = url.pathname.match(re);
      if (!m) continue;

      let body = null;
      if (method === 'POST') {
        if (opts?.brut) body = await readBrut(req, opts.limite);
        else {
          const raw = await readBody(req);
          try { body = raw ? JSON.parse(raw) : {}; }
          catch { throw Object.assign(new Error('corps JSON illisible'), { status: 400 }); }
        }
      }
      const out = await handler(m.slice(1), body, res, req);
      if (res.headersSent) return;   // le handler a servi lui-même (fichier, HTML)
      // Toujours 200 : le code HTTP ne se dérive JAMAIS du corps (un job porte son
      // propre `status` métier, qui n'est pas un code de réponse). Les échecs passent
      // par une exception portant `.status`.
      res.writeHead(200, { 'Content-Type': MIME['.json'] });
      return res.end(JSON.stringify(out));
    }
    res.writeHead(404, { 'Content-Type': MIME['.json'] });
    res.end(JSON.stringify({ error: 'route inconnue' }));
  } catch (err) {
    const status = err.status || 500;
    if (!res.headersSent) {
      res.writeHead(status, { 'Content-Type': MIME['.json'] });
      res.end(JSON.stringify({ error: String(err.message || err) }));
    }
    if (status >= 500) console.error(`[studio] ${req.method} ${url.pathname} →`, err);
  }
});

/** Corps binaire, en Buffers : `b += c` concatène en TEXTE et corrompt une image. */
function readBrut(req, max = 12e6) {
  return new Promise((resolve, reject) => {
    const morceaux = []; let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > max) {
        reject(Object.assign(new Error(`image trop lourde (maximum ${Math.round(max / 1e6)} Mo)`), { status: 413 }));
        req.destroy(); return;
      }
      morceaux.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(morceaux)));
    req.on('error', reject);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let b = '', size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > 1e6) { reject(Object.assign(new Error('corps trop gros'), { status: 413 })); req.destroy(); return; }
      b += c;
    });
    req.on('end', () => resolve(b));
    req.on('error', reject);
  });
}

server.listen(PORT, HOST, () => console.error(`[studio] prêt → http://${HOST}:${PORT}`));
