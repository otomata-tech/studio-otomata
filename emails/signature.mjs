// La signature mail Otomata : le bloc HTML seul, partagé par la page à copier (build-signature.mjs)
// et par tout ce qui la pose ailleurs. HTML de mail : tableaux, styles en ligne,
// polices système — un client mail ne charge ni nos fontes ni une feuille de style.
// L'adresse vient du merch (brand/merch/pieces.mjs), le mark de la page publique /brand
// du studio : une image de signature doit être servie en https, une pièce jointe se perd au transfert.
import { MARQUE } from '../brand/merch/pieces.mjs';

// Nouvelle adresse depuis le 13/10/2026, pour les signatures posées désormais. Les signatures
// déjà envoyées pointent encore studio.oto.zone/brand/logo/mark-256.png : elles restent servies
// par la redirection 301 de l'ancien nom, gardée à vie côté infra (Caddyfile + Access).
const MARK = 'https://studio.otomata.tech/brand/logo/mark-256.png';
export const C = { ink: '#2c2112', mute: '#6c5e44', primary: '#f0b41e', bg: '#fefcf5' };
export const POLICE = 'Arial,Helvetica,sans-serif';

export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const lien = (url, texte, style = '') =>
  `<a href="${esc(url)}" style="color:${C.ink};text-decoration:none;${style}">${esc(texte)}</a>`;
const sep = `<span style="color:${C.primary};font-weight:700;">&nbsp;·&nbsp;</span>`;

/** Le bloc collé dans Gmail : le mark, un filet saffran, la personne, ses coordonnées et les liens.
 *  Pas de phrase de marque (retirée le 2026-10-06) : le mark et otomata.tech suffisent. */
export function signature(d) {
  for (const k of ['nom', 'fonction', 'email', 'tel']) if (!d[k]) throw new Error(`champ manquant : ${k}`);
  const site = `https://${MARQUE.adresse}`;
  const liens = [lien(site, MARQUE.adresse, `font-weight:700;border-bottom:2px solid ${C.primary};`),
    ...(d.liens || []).map(l => lien(l.url, l.texte))].join(sep);
  return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:${POLICE};color:${C.ink};">
  <tr>
    <td style="vertical-align:top;padding:2px 14px 0 0;">
      <a href="${site}"><img src="${MARK}" width="56" height="56" alt="Otomata" style="display:block;border:0;width:56px;height:56px;"></a>
    </td>
    <td style="vertical-align:top;border-left:3px solid ${C.primary};padding:0 0 0 14px;">
      <div style="font-size:16px;font-weight:700;line-height:20px;">${esc(d.nom)}</div>
      <div style="font-size:10px;line-height:14px;letter-spacing:1.5px;text-transform:uppercase;color:${C.mute};padding-top:2px;">${esc(d.fonction)}</div>
      <div style="font-size:13px;line-height:18px;padding-top:8px;">${lien('mailto:' + d.email, d.email)}${sep}${lien('tel:' + d.tel.replace(/\s/g, ''), d.tel)}</div>
      <div style="font-size:12px;line-height:17px;padding-top:6px;">${liens}</div>
    </td>
  </tr>
</table>`;
}

