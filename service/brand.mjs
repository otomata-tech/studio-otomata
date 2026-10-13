// La charte d'une marque, en accès PUBLIC : le logo et ses déclinaisons, la palette, la typo, et
// ce qui est propre à la marque (portraits et merch pour Otomata, tons d'affiche pour le Cowork).
// Tout ce qui est ici est fait pour être donné à un tiers — un imprimeur, un presta, un
// partenaire — sans lui ouvrir le générateur.
//
// D'où le préfixe unique `/brand` : une seule politique Cloudflare Access à poser en
// bypass, et le reste du studio (le générateur, les rendus, la galerie) reste fermé.
// ⚠️ Ce module ne doit rien exposer d'autre que la charte : tout ce qu'il rend est public.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logoSvg, logoPng } from './kit.mjs';
import { chemin, liste as marques } from './marques.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const empreinte = m => {
  const h = createHash('sha1');
  for (const l of Object.values(m.logos.table)) h.update(readFileSync(join(ROOT, m.logos.dossier, l.fichier)));
  m.charte.empreinte(h);
  return h.digest('hex').slice(0, 8);
};

export function etat(m) {
  const v = empreinte(m);
  const base = `/brand${chemin(m)}`;
  const c = m.charte;
  return {
    marque: { id: m.id, nom: m.nom, fichiers: m.fichiers },
    marques: marques().map(({ id, nom, charte }) => ({ id, nom, charte })),
    version: v,
    titre: c.titre,
    intro: c.intro,
    sous_titres: { logos: c.sousTitreLogos, palette: c.sousTitrePalette },
    logos: Object.entries(m.logos.table).map(([clef, l]) => ({
      clef, nom: l.nom, note: l.note, fond: l.fond,
      svg: `${base}/logo/${clef}.svg?v=${v}`,
      png: l.tailles.map(t => ({ taille: t, url: `${base}/logo/${clef}-${t}.png?v=${v}` })),
    })),
    palette: c.palette(),
    typo: typeof c.typo === 'function' ? c.typo() : c.typo,
    notes: c.notes,
    ...c.extras(v),
  };
}

export { logoSvg, logoPng };
