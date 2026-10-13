// Contrôle d'accès du studio : QUI peut appeler QUOI, décidé sur le pair TCP et, pour les
// humains, sur le jeton Cloudflare Access.
//
// Pourquoi le service vérifie lui-même : Access ne protège que ce qui passe par Access. Le
// 13/10/2026, l'API privée répondait 200 en appelant l'origine en direct (IP de la box, Host
// forcé). Le snippet Caddy `(cloudflare_seulement)` ferme l'accès hors des plages Cloudflare,
// mais un tiers qui passe par SA propre zone Cloudflare y arrive encore. Seul le jeton signé
// par NOTRE équipe Access, pour NOTRE application, prouve qu'Access a laissé passer.
import { createPublicKey, verify } from 'node:crypto';

/* ---------- l'application Access ----------
   Relevés le 13/10/2026, rien de secret (l'AUD figure en clair dans chaque redirection vers
   l'écran de connexion) :
   - AUD : champ `aud` de GET /accounts/{compte}/access/apps/ace77468-868b-470f-a231-0abe127d2bad
     (app « studio.otomata.tech »), lu avec un jeton éphémère « Access: Apps and Policies Read »
     révoqué aussitôt (procédure : /data/infra/docs/cloudflare.md § Tokens API). Recréer l'app
     change l'AUD : il faut alors le relever à nouveau, sinon tout humain est refusé.
   - Émetteur : le domaine d'équipe Zero Trust, celui vers lequel studio.otomata.tech redirige
     pour la connexion, et qui publie les clés sous /cdn-cgi/access/certs. */
export const EMETTEUR = 'https://otomata-tech.cloudflareaccess.com';
export const AUD = 'e3d0829ae44d02381799a790bf965d3469fabb31888ee8d318d18ceef55fa74e';
export const DOMAINE = 'otomata.tech';
const CERTS = `${EMETTEUR}/cdn-cgi/access/certs`;

const TOLERANCE_S = 60;              // décalage d'horloge admis sur exp / nbf
const RECHARGE_MIN_MS = 30_000;      // un kid inconnu ne fait pas marteler Cloudflare
const AGE_MAX_MS = 12 * 3600_000;    // les clés retirées par une rotation finissent par sortir
const DELAI_CERTS_MS = 5_000;
const TAILLE_MAX = 16_384;           // un jeton Access fait ~1 Ko ; au-delà, on ne décode pas

/* ---------- la règle ---------- */

/** Ce qu'exige une requête, d'après son pair TCP et son chemin :
 *  - 'libre' : passe sans jeton ;
 *  - 'jeton' : exige un jeton Access valide ;
 *  - 'refus' : n'a rien à faire ici.
 *  Le pair TCP et lui seul : un en-tête (X-Forwarded-For…) se forge, une connexion non. */
export function exigence(pair, chemin) {
  // La sonde du déploiement (update.sh appelle 127.0.0.1:8100/healthz) : ne dit rien.
  if (chemin === '/healthz') return 'libre';
  const ip = normalise(pair);
  // Loopback = Caddy, donc Cloudflare. /brand est en bypass Access : aucun jeton n'arrive.
  if (estLoopback(ip)) return chemin === '/brand' || chemin.startsWith('/brand/') ? 'libre' : 'jeton';
  // Réseau privé : les agents (connecteur oto org:2:http:studio). Le port 8100 est fermé à
  // Internet par le groupe de sécurité, seul ce réseau l'atteint en direct.
  if (estPrive(ip)) return 'libre';
  return 'refus';
}

/** `::ffff:127.0.0.1` est l'écriture IPv6 d'une IPv4 (socket à double pile). */
const normalise = pair => String(pair || '').replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/i, '');

function octets(ip) {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  return m && m.slice(1).map(Number).every(n => n <= 255) ? m.slice(1).map(Number) : null;
}
const estLoopback = ip => ip === '::1' || octets(ip)?.[0] === 127;
/** 172.16.0.0/12 : 172.16.0.0 → 172.31.255.255. */
function estPrive(ip) {
  const o = octets(ip);
  return !!o && o[0] === 172 && o[1] >= 16 && o[1] <= 31;
}

/* ---------- le jeton ---------- */

/** Un vérificateur de jetons Access. `cles` rend un jeu de clés JWKS ({ keys: [...] }) ; il
 *  est injecté pour que les tests signent avec leur propre paire, sans toucher à la prod.
 *  `verifie(jeton)` ne lève jamais : { ok: true, email } ou { ok: false, raison }. */
export function verificateur({ emetteur, aud, domaine, cles,
  maintenant = Date.now, rechargeMinMs = RECHARGE_MIN_MS, ageMaxMs = AGE_MAX_MS, journal = console.error }) {
  let parKid = new Map();
  let chargeA = -Infinity;     // dernière tentative, réussie ou non
  let reussiA = -Infinity;     // dernier chargement réussi
  let enCours = null;          // un seul chargement à la fois

  async function charge() {
    chargeA = maintenant();
    try {
      const jwks = await cles();
      if (!Array.isArray(jwks?.keys)) throw new Error('réponse sans « keys »');
      const neuves = new Map();
      for (const jwk of jwks.keys) {
        if (jwk.kty !== 'RSA' || typeof jwk.kid !== 'string' || (jwk.alg && jwk.alg !== 'RS256')) continue;
        neuves.set(jwk.kid, createPublicKey({ key: jwk, format: 'jwk' }));
      }
      if (!neuves.size) throw new Error('aucune clé RS256');
      parKid = neuves;
      reussiA = maintenant();
    } catch (e) {
      // Pas d'ouverture : sans clés, tout jeton est refusé. On le dit, c'est une panne.
      journal(`[accès] clés Access injoignables (${e.message}) : jetons refusés`);
    }
  }

  async function cle(kid) {
    const perime = maintenant() - reussiA > ageMaxMs;
    if ((perime || !parKid.has(kid)) && maintenant() - chargeA >= rechargeMinMs) {
      enCours ??= charge().finally(() => { enCours = null; });
      await enCours;
    }
    // Clés périmées et rechargement impossible : on refuse plutôt que de faire confiance à
    // un jeu qu'une rotation a peut-être déjà retiré.
    if (maintenant() - reussiA > ageMaxMs) return null;
    return parKid.get(kid) ?? null;
  }

  async function verifie(jeton) {
    try {
      if (!jeton) return refus('jeton absent');
      if (jeton.length > TAILLE_MAX) return refus('jeton trop long');
      const parts = jeton.split('.');
      if (parts.length !== 3) return refus('jeton mal formé');
      const [h, p, s] = parts;
      const entete = json(h), corps = json(p);
      if (!entete || !corps) return refus('jeton illisible');
      // RS256 et rien d'autre : ni « none », ni HS256 signé avec la clé publique.
      if (entete.alg !== 'RS256') return refus(`algorithme refusé (${entete.alg})`);
      if (typeof entete.kid !== 'string') return refus('kid absent');
      const k = await cle(entete.kid);
      if (!k) return refus('clé inconnue ou indisponible');
      if (!verify('RSA-SHA256', Buffer.from(`${h}.${p}`), k, Buffer.from(s, 'base64url')))
        return refus('signature invalide');

      const t = maintenant() / 1000;
      if (corps.iss !== emetteur) return refus('émetteur inattendu');
      const auds = Array.isArray(corps.aud) ? corps.aud : [corps.aud];
      if (!auds.includes(aud)) return refus('audience inattendue');
      if (typeof corps.exp !== 'number') return refus('exp absent');
      if (t > corps.exp + TOLERANCE_S) return refus('jeton expiré');
      if (corps.nbf !== undefined && (typeof corps.nbf !== 'number' || t < corps.nbf - TOLERANCE_S))
        return refus('jeton pas encore valide');
      const email = typeof corps.email === 'string' ? corps.email.toLowerCase() : '';
      if (!email.endsWith(`@${domaine}`)) return refus('compte hors domaine');
      return { ok: true, email };
    } catch (e) {
      return refus(`erreur de vérification (${e.message})`);
    }
  }

  return { verifie };
}

const refus = raison => ({ ok: false, raison });

function json(b64) {
  try {
    const v = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch { return null; }
}

async function certsCloudflare() {
  const r = await fetch(CERTS, { signal: AbortSignal.timeout(DELAI_CERTS_MS) });
  if (!r.ok) throw new Error(`HTTP ${r.status} sur ${CERTS}`);
  return r.json();
}

/** Le vérificateur de la prod : l'application « studio.otomata.tech », clés de Cloudflare. */
export const jetonAccess = verificateur({ emetteur: EMETTEUR, aud: AUD, domaine: DOMAINE, cles: certsCloudflare });
