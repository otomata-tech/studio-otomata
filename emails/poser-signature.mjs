// Pose la signature Otomata directement dans le Gmail d'un membre du domaine, en admin Workspace.
// Usage : node emails/poser-signature.mjs <compte-de-service> <donnees.json> [...]
//   ex.   node emails/poser-signature.mjs signatures@otomata-workspace.iam.gserviceaccount.com out/plaquettes/carte-visite-sarah.json
//
// Délégation à l'échelle du domaine SANS clé : on ne télécharge jamais de clé du compte de service.
// Le compte gcloud actif (un admin) fait signer le JWT par le compte de service (IAM Credentials,
// signJwt), avec `sub` = la boîte visée ; le jeton obtenu ne porte que gmail.settings.basic —
// les réglages, pas le courrier. Prérequis, une fois :
//   1. le compte de service existe, l'API IAM Credentials et l'API Gmail sont activées sur son projet ;
//   2. le compte gcloud actif a le rôle « Créateur de jetons du compte de service » sur lui ;
//   3. dans la console d'admin, Sécurité → Contrôle des API → Délégation à l'échelle du domaine :
//      l'ID client du compte de service, scope https://www.googleapis.com/auth/gmail.settings.basic
//
// La boîte visée est le champ `email` de la fiche ; la signature, le même bloc que la page à copier.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { signature } from './signature.mjs';

const SCOPE = 'https://www.googleapis.com/auth/gmail.settings.basic';
const [compte, ...fichiers] = process.argv.slice(2);
if (!compte || !fichiers.length) {
  console.error('usage : node emails/poser-signature.mjs <compte-de-service> <donnees.json> [...]');
  process.exit(1);
}

const json = async (r, quoi) => {
  const corps = await r.json();
  if (!r.ok) throw new Error(`${quoi} : ${r.status} ${JSON.stringify(corps.error || corps)}`);
  return corps;
};

const g = spawnSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' });
if (g.status !== 0) throw new Error(`gcloud : ${g.stderr}`);
const admin = g.stdout.trim();

/** Un jeton d'accès aux réglages Gmail de `boite`, signé par le compte de service au nom de l'admin. */
async function jeton(boite) {
  const now = Math.floor(Date.now() / 1000);
  const { signedJwt } = await json(await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${compte}:signJwt`, {
      method: 'POST',
      headers: { authorization: `Bearer ${admin}`, 'content-type': 'application/json' },
      body: JSON.stringify({ payload: JSON.stringify({
        iss: compte, sub: boite, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 600,
      }) }),
    }), 'signJwt');
  const { access_token } = await json(await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signedJwt }),
  }), `jeton pour ${boite} (délégation autorisée dans la console d'admin ?)`);
  return access_token;
}

for (const f of fichiers) {
  const d = JSON.parse(readFileSync(f, 'utf8'));
  const boite = d.email;
  const url = `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(boite)}/settings/sendAs/${encodeURIComponent(boite)}`;
  const t = await jeton(boite);
  const r = await json(await fetch(url, {
    method: 'PATCH',
    headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
    body: JSON.stringify({ signature: signature(d) }),
  }), `signature de ${boite}`);
  console.log(`✓ ${boite} — signature posée (${r.signature.length} caractères)`);
}
