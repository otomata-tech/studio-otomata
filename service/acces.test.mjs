// Tests du contrôle d'accès : `node --test 'service/*.test.mjs'`.
// Une paire RSA fabriquée ici signe les jetons, et un faux jeu de clés la publie : le
// vérificateur de la prod (clés de Cloudflare) n'est jamais sollicité.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { exigence, verificateur, EMETTEUR, AUD, DOMAINE } from './acces.mjs';

const KID = 'kid-de-test';
const paire = () => generateKeyPairSync('rsa', { modulusLength: 2048 });
const { privateKey, publicKey } = paire();
const jwks = { keys: [{ ...publicKey.export({ format: 'jwk' }), kid: KID, alg: 'RS256', use: 'sig' }] };

const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const maintenant = () => Math.floor(Date.now() / 1000);

function jeton(corps = {}, { entete = {}, cle = privateKey } = {}) {
  const t = maintenant();
  const h = b64({ alg: 'RS256', kid: KID, typ: 'JWT', ...entete });
  const p = b64({ iss: EMETTEUR, aud: [AUD], email: `alexis@${DOMAINE}`, iat: t, nbf: t, exp: t + 3600,
    type: 'app', ...corps });
  return `${h}.${p}.${sign('RSA-SHA256', Buffer.from(`${h}.${p}`), cle).toString('base64url')}`;
}

/** Un vérificateur branché sur le faux jeu de clés, qui compte ses chargements. */
function verif(opts = {}) {
  const etat = { appels: 0, journal: [] };
  const v = verificateur({
    emetteur: EMETTEUR, aud: AUD, domaine: DOMAINE,
    cles: async () => { etat.appels++; return opts.cles ? opts.cles() : jwks; },
    journal: m => etat.journal.push(m), ...opts.reglages
  });
  return { v, etat };
}

test('jeton valide : accepté, email rendu', async () => {
  const { v } = verif();
  assert.deepEqual(await v.verifie(jeton()), { ok: true, email: `alexis@${DOMAINE}` });
  assert.equal((await v.verifie(jeton({ aud: AUD }))).ok, true, 'aud en chaîne simple');
});

test('jetons refusés, chacun pour sa raison', async () => {
  const { v } = verif();
  const t = maintenant();
  const cas = {
    'jeton absent': undefined,
    'jeton mal formé': 'abc.def',
    'jeton illisible': 'pas.du.json',
    'jeton expiré': jeton({ exp: t - 3600 }),
    'jeton pas encore valide': jeton({ nbf: t + 3600 }),
    'audience inattendue': jeton({ aud: ['une-autre-app'] }),
    'émetteur inattendu': jeton({ iss: 'https://autre-equipe.cloudflareaccess.com' }),
    'compte hors domaine': jeton({ email: 'pirate@gmail.com' }),
    'exp absent': jeton({ exp: undefined }),
  };
  for (const [raison, j] of Object.entries(cas))
    assert.deepEqual(await v.verifie(j), { ok: false, raison }, raison);
  for (const email of [`x@${DOMAINE}.evil.com`, `x@evil${DOMAINE}`, `x@sous.${DOMAINE}`, undefined])
    assert.equal((await v.verifie(jeton({ email }))).raison, 'compte hors domaine', String(email));
});

test('tolérance d\'horloge : 30 s de retard passent, 2 min non', async () => {
  const { v } = verif();
  assert.equal((await v.verifie(jeton({ exp: maintenant() - 30 }))).ok, true);
  assert.equal((await v.verifie(jeton({ exp: maintenant() - 120 }))).ok, false);
});

test('signature : jeton altéré ou signé par une autre clé refusé', async () => {
  const { v } = verif();
  const [h, , s] = jeton().split('.');
  const faux = b64({ iss: EMETTEUR, aud: [AUD], email: `alexis@${DOMAINE}`, exp: maintenant() + 3600 });
  assert.equal((await v.verifie(`${h}.${faux}.${s}`)).raison, 'signature invalide');
  assert.equal((await v.verifie(jeton({}, { cle: paire().privateKey }))).raison, 'signature invalide');
});

test('algorithme : none et HS256 refusés', async () => {
  const { v } = verif();
  const [, p] = jeton().split('.');
  assert.match((await v.verifie(`${b64({ alg: 'none', kid: KID })}.${p}.`)).raison, /algorithme refusé/);
  assert.match((await v.verifie(jeton({}, { entete: { alg: 'HS256' } }))).raison, /algorithme refusé/);
});

test('clés en cache, rechargées sur kid inconnu, avec un délai minimal', async () => {
  let t = Date.now();
  const { v, etat } = verif({ reglages: { maintenant: () => t } });
  assert.equal((await v.verifie(jeton())).ok, true); await v.verifie(jeton());
  assert.equal(etat.appels, 1, 'un seul chargement pour deux jetons');
  const inconnu = jeton({}, { entete: { kid: 'autre' } });
  assert.equal((await v.verifie(inconnu)).raison, 'clé inconnue ou indisponible');
  assert.equal(etat.appels, 1, 'pas de rechargement dans le délai minimal');
  t += 31_000;
  await v.verifie(inconnu);
  assert.equal(etat.appels, 2, 'rechargement une fois le délai passé');
});

test('clés injoignables : refus et journal, jamais d\'ouverture', async () => {
  const { v, etat } = verif({ cles: async () => { throw new Error('réseau coupé'); } });
  assert.deepEqual(await v.verifie(jeton()), { ok: false, raison: 'clé inconnue ou indisponible' });
  assert.match(etat.journal[0], /clés Access injoignables \(réseau coupé\)/);
  const vide = verif({ cles: async () => ({ keys: [] }) });
  assert.equal((await vide.v.verifie(jeton())).ok, false);
});

test('clés périmées et rechargement impossible : refus', async () => {
  let t = Date.now(), panne = false;
  const { v } = verif({ reglages: { maintenant: () => t },
    cles: async () => { if (panne) throw new Error('panne'); return jwks; } });
  assert.equal((await v.verifie(jeton())).ok, true);
  panne = true; t += 13 * 3600_000;
  // Jeton daté de la même horloge avancée : seul l'âge des clés peut le faire refuser.
  const tard = Math.floor(t / 1000);
  assert.deepEqual(await v.verifie(jeton({ iat: tard, nbf: tard, exp: tard + 3600 })),
    { ok: false, raison: 'clé inconnue ou indisponible' });
});

test('règle : pair TCP × chemin', () => {
  const cas = [
    ['127.0.0.1', '/brand', 'libre'], ['127.0.0.1', '/brand/api', 'libre'],
    ['127.0.0.1', '/brand/logo/mark-256.png', 'libre'], ['::ffff:127.0.0.1', '/brand', 'libre'],
    ['127.0.0.1', '/brandx', 'jeton'], ['127.0.0.1', '/', 'jeton'], ['127.0.0.1', '/kit', 'jeton'],
    ['127.0.0.1', '/api/renders', 'jeton'], ['::1', '/openapi.json', 'jeton'],
    ['127.0.0.1', '/files/x/y.png', 'jeton'], ['127.0.0.1', '/r/abc', 'jeton'],
    ['172.16.16.5', '/api/renders', 'libre'], ['::ffff:172.16.16.5', '/', 'libre'],
    ['172.16.16.3', '/api/renders', 'refus'], ['172.16.16.11', '/kit', 'refus'],
    ['172.17.0.2', '/api/renders', 'refus'], ['172.19.0.5', '/', 'refus'], ['172.16.16.50', '/', 'refus'],
    ['172.32.0.1', '/api/renders', 'refus'], ['172.15.0.1', '/', 'refus'], ['10.0.0.1', '/', 'refus'],
    ['51.15.225.121', '/brand', 'refus'], ['162.158.1.1', '/api/renders', 'refus'], [undefined, '/', 'refus'],
    ['51.15.225.121', '/healthz', 'libre'], ['127.0.0.1', '/healthz', 'libre'],
  ];
  for (const [pair, chemin, attendu] of cas) assert.equal(exigence(pair, chemin), attendu, `${pair} ${chemin}`);
});
