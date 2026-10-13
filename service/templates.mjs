// Registre des gabarits : ce que l'IHM affiche en formulaire, et ce que l'API accepte.
// Un gabarit = un manifeste de champs + une fonction qui rend l'HTML complet.
// Ajouter un gabarit = ajouter une entrée ici. Rien n'est découvert dynamiquement :
// un gabarit qu'on ne peut pas décrire en champs n'a rien à faire dans le studio.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FORMATS, CLES, livre } from '../posts/identite-formats.mjs';
import * as uploads from './uploads.mjs';
import * as cowork from './marques/cowork-affiche.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const read = p => readFileSync(join(ROOT, p), 'utf8');
const iconPath = f => {
  const m = read(`assets/logos/${f}`).match(/<path[^>]*\sd="([^"]+)"/);
  if (!m) throw new Error(`logo illisible : ${f}`);
  return m[1];
};

const ICONS = read('assets/icons.json');
const ICON_KEYS = Object.keys(JSON.parse(ICONS));
const TINTS = ['terra', 'saffron', 'olive', 'cobalt'];

// Du JSON posé DANS un <script> n'est pas du JSON : le parseur HTML ferme la balise
// au premier `</script>` rencontré, même à l'intérieur d'une chaîne. Une valeur de
// formulaire contenant `</script>` reprendrait donc la main sur la page — qui est
// rendue depuis `file://`, avec ce que ça implique. Neutraliser `<` suffit et couvre
// aussi `<!--`. À faire à CHAQUE injection, pas seulement sur les champs suspects.
const inScript = value =>
  (typeof value === 'string' ? value : JSON.stringify(value)).replace(/</g, '\\u003c');

// Même piège que `inScript`, autre contexte : une valeur de formulaire posée dans le
// <title> peut le refermer et ouvrir un <script>. Le titre vient toujours des données,
// il s'échappe donc toujours.
const inText = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function page(title, body) {
  return `<!doctype html>\n<html lang="fr"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${inText(title)}</title></head><body>\n${body}\n</body></html>`;
}

/* ---------- carte « cas d'usage » ---------- */

const carte = {
  id: 'carte-cas-usage',
  label: 'Carte cas d\'usage',
  description: 'Une demande en langage courant, les outils qu\'oto enchaîne, le résultat. Animée, carrée.',
  size: { width: 1080, height: 1080 },
  fps: 18,
  formats: ['mp4', 'gif', 'png'],
  fields: [
    { key: 'num', label: 'Numéro', type: 'text', required: true, hint: 'deux chiffres, ex. 07' },
    { key: 'kicker', label: 'Catégorie', type: 'text', required: true, hint: 'un mot, en capitales sur la carte' },
    { key: 'msg', label: 'La demande', type: 'textarea', required: true,
      hint: 'la phrase telle qu\'on la dirait à un agent — pas un titre marketing' },
    {
      // `required` ET `min` : sans `required`, une liste absente échappe au contrôle
      // (la validation saute les champs vides non requis) et `min` ne serait jamais lu.
      key: 'tools', label: 'Outils enchaînés', type: 'list', required: true, min: 1, max: 4,
      hint: 'l\'ordre est celui de l\'animation',
      item: [
        { key: 'icon', label: 'Icône', type: 'enum', options: ICON_KEYS, required: true },
        { key: 'tint', label: 'Teinte', type: 'enum', options: TINTS, required: true },
        { key: 'ns', label: 'Espace', type: 'text', required: true, hint: 'ex. oto' },
        { key: 'name', label: 'Nom de l\'outil', type: 'text', required: true,
          hint: '⚠️ vérifier qu\'il existe encore côté backend avant publication' },
        { key: 'label', label: 'Ce qu\'il fait', type: 'text', required: true },
        { key: 'res', label: 'Résultat', type: 'text', required: true, hint: 'court, chiffré' }
      ]
    },
    { key: 'final', label: 'La chute', type: 'textarea', required: true,
      hint: 'une phrase ; <b>…</b> autorisé pour le chiffre' }
  ],
  // Le formulaire s'ouvre pré-rempli : un champ vide ne dit pas ce qu'on attend
  // (ton de la demande, granularité d'un résultat). Premier cas d'usage publié.
  // ⚠️ FILTRÉ sur les champs déclarés : le fichier source porte aussi un `slug`, que
  // le gabarit n'expose pas. Servir l'exemple brut donnait un exemple que la
  // validation refuse — un service qui se contredit lui-même.
  get example() {
    const clefs = new Set(['num', 'kicker', 'msg', 'tools', 'final']);
    const src = JSON.parse(read('cards/usecases.json'))[0];
    return Object.fromEntries(Object.entries(src).filter(([k]) => clefs.has(k)));
  },
  build(data) {
    const tpl = read('cards/template-body.html');
    const inject = `<script>window.__ICONS=${inScript(ICONS)};window.__UC=${inScript(data)};</script>`;
    const body = tpl
      .replace('<!--__DATA__-->', inject)
      .replace('/* __FONTS__ */', read('assets/fonts.css'))
      .replace('__CLAUDE__', iconPath('logo_claude.svg'))
      .replace('__MISTRAL__', iconPath('logo_mistralai.svg'))
      .replace('__OPENAI__', iconPath('logo_openai.svg'));
    return page(`oto — ${data.kicker}`, body);
  }
};

/* ---------- affiche animée « la scène recule » ---------- */

const affiche = {
  id: 'affiche-recul',
  label: 'Affiche animée — la scène recule',
  description: 'Format LinkedIn 4:5. La scène occupe toute la hauteur pendant l\'animation, ' +
    'puis recule pour laisser monter la phrase de chute. Pas de zone morte, contenus plus gros.',
  size: { width: 1200, height: 1500 },
  fps: 25,
  formats: ['mp4', 'gif', 'png'],
  fields: [
    { key: 'mention', label: 'Mention', type: 'text', required: false,
      hint: 'en haut à droite, ex. « Claude Code · 7 août 2026 »' },
    { key: 'kicker', label: 'Ligne de contexte', type: 'text', required: true,
      hint: 'une ligne, sous l\'en-tête ; <b>…</b> autorisé pour le chiffre' },
    {
      key: 'cards', label: 'Cartes de la scène', type: 'list', required: true, min: 2, max: 4,
      hint: 'elles apparaissent dans l\'ordre, la première est mise en avant',
      item: [
        { key: 'title', label: 'Titre', type: 'text', required: true, hint: 'court, en capitales sur la carte' },
        { key: 'tag', label: 'Étiquette', type: 'text', required: false, hint: 'à droite du titre, ex. « session 2 »' },
        { key: 'body', label: 'Contenu', type: 'textarea', required: true,
          hint: 'une ligne par ligne affichée (8 maximum) — frappées l\'une après l\'autre' }
      ]
    },
    { key: 'phrase', label: 'La chute', type: 'text', required: true,
      hint: 'la première ligne de la phrase clé' },
    { key: 'kick', label: 'La chute, second temps', type: 'text', required: false,
      hint: 'la ligne qui tombe après — c\'est elle qu\'on retient' }
  ],
  example: {
    mention: 'Claude Code · 2 septembre 2026',
    kicker: '<b>11 sessions ouvertes</b> — trois avancent en parallèle.',
    cards: [
      { title: 'refonte', tag: 'chef', body: '> où en est la prospection ?\nsession 2 → 42 contacts\nsession 3 → audit terminé' },
      { title: 'prospection', tag: 'session 2', body: 'fr_search → 42 ETI\nhunter → 38 emails\nfolk → +42' },
      { title: 'mission', tag: 'session 3', body: 'relecture du contrat\nconflit détecté art. 7\nremonté au chef' }
    ],
    phrase: 'Ce n\'est plus une session.',
    kick: 'C\'est une équipe.'
  },
  build(data) {
    const tpl = read('posts/template-affiche.html');
    const inject = `<script>window.__AFF=${inScript(data)};</script>`;
    const body = tpl
      .replace('<!--__DATA__-->', inject)
      .replace('/* __FONTS__ */', read('assets/fonts.css'));
    return page(`oto — ${data.kicker}`, body);
  }
};

/* ---------- kit d'identité (la carte de visite, tous formats LinkedIn) ---------- */

const identite = {
  id: 'kit-identite',
  label: 'Kit d\'identité',
  description: 'La carte de visite de la marque, déclinée dans les formats LinkedIn : post 4:5, ' +
    'post carré, aperçu de lien, couvertures de profil et de page, avatar. Statique, ' +
    'un format par rendu — le champ « Format » décide aussi de la taille livrée.',
  // `size` reste la taille de référence (post 4:5) ; c'est `sizes` + `size_field` qui
  // disent au serveur quoi rendre vraiment, selon la valeur du champ Format.
  size: { width: FORMATS.post45.width, height: FORMATS.post45.height },
  sizes: FORMATS,
  size_field: 'format',
  fps: 25,
  // Aucune animation dans ce gabarit (pas de window.__seek) : png seul, et le
  // contrôle des formats côté serveur refusera mp4/gif avec un message clair.
  formats: ['png'],
  fields: [
    { key: 'format', label: 'Format', type: 'enum', options: CLES, required: true,
      hint: CLES.map(f => `${f} = ${livre(f)} (${FORMATS[f].cible})`).join(' · ') },
    { key: 'nom', label: 'Le nom', type: 'text', required: true,
      hint: 'en très grand sur les posts, en marque sur les bandeaux — ex. OTOMATA' },
    { key: 'baseline', label: 'Baseline des posts', type: 'text', required: true,
      hint: 'la ligne sous le nom, rendue en capitales ; <b>…</b> autorisé' },
    { key: 'phrase', label: 'Phrase des bandeaux', type: 'text', required: true,
      hint: 'ce que portent l\'aperçu de lien et les deux couvertures — une phrase, pas un slogan de deck' },
    { key: 'url', label: 'Adresse', type: 'text', required: true, hint: 'ex. otomata.tech' }
  ],
  example: {
    format: 'post45',
    nom: 'OTOMATA',
    baseline: '<b>Studio de conception d’agents IA</b><br>Marseille',
    phrase: 'Studio de conception d’agents IA, à\u00a0Marseille.',
    url: 'otomata.tech'
  },
  build(data) {
    const tpl = read('posts/template-identite.html');
    const inject = `<script>window.__ID=${inScript(data)};</script>`;
    const body = tpl
      .replace('<!--__DATA__-->', inject)
      .replace('/* __FONTS__ */', read('assets/fonts.css'));
    return page(`${data.nom} — ${data.format}`, body);
  }
};

/* ---------- bannière 1584×396 (couverture, et images du diaporama Premium) ---------- */

// Les marks vivent dans brand/ : on les INJECTE inline, sans copie dans le gabarit.
const MARKS = {
  otomata: 'brand/logos/otomata/otomata-mark.svg',
  oto: 'brand/logos/oto/oto-dashboard-mark.svg',
};

const banniere = {
  id: 'banniere',
  label: 'Bannière LinkedIn',
  description: 'Format 1584×396 : couverture de profil, et les cinq images du diaporama Premium. ' +
    'Une idée par bannière — un mark, une phrase, une adresse.',
  size: { width: 1584, height: 396 },
  sizes: { standard: { width: 1584, height: 396, scale: 2, cible: 'couverture / diaporama de profil' } },
  fps: 25,
  formats: ['png'],
  fields: [
    { key: 'mark', label: 'Mark', type: 'enum', options: ['otomata', 'oto', 'aucun'], required: true,
      hint: 'otomata = le disque saffran ; oto = l\'open O du produit ; aucun = la phrase seule, plus grande' },
    { key: 'kicker', label: 'Sur-titre', type: 'text', required: false,
      hint: 'court, en capitales mono au-dessus du titre — ex. le nom de la marque' },
    { key: 'titre', label: 'La phrase', type: 'text', required: true,
      hint: 'UNE idée ; la taille s\'ajuste seule, de 62 à 34 px, selon la longueur' },
    { key: 'pied', label: 'Pied', type: 'text', required: false,
      hint: 'l\'adresse, en mono ; <b>…</b> autorisé' }
  ],
  example: {
    mark: 'otomata',
    kicker: 'Otomata',
    titre: 'Studio IA basé à Marseille.',
    pied: '<b>otomata.tech</b>'
  },
  build(data) {
    const tpl = read('posts/template-banniere.html');
    const mark = data.mark && data.mark !== 'aucun' ? read(MARKS[data.mark]) : '';
    const body = tpl
      .replace('<!--__MARK__-->', mark)
      .replace('<!--__DATA__-->', `<script>window.__BAN=${inScript(data)};</script>`)
      .replace('/* __FONTS__ */', read('assets/fonts.css'));
    return page(`Otomata — ${data.titre}`, body);
  }
};

/* ---------- faux output d'agent ---------- */

const output = {
  id: 'output-agent',
  label: 'Faux output d\'agent',
  description: 'Format LinkedIn 4:5. Une capture d\'agent à la charte : la demande, puis la réponse. '
    + 'Rien d\'autre — pas de titre ni de chute, c\'est le post qui les porte. La taille du texte '
    + 'descend toute seule jusqu\'à ce que le pavé tienne.',
  size: { width: 1200, height: 1500, scale: 2 },
  fps: 25,
  formats: ['png'],
  fields: [
    { key: 'fenetre', label: 'Barre de titre', type: 'text', required: false,
      hint: 'à droite de la fenêtre, ex. « claude — opus-5 — ~/projets/app »' },
    { key: 'demande', label: 'La demande', type: 'textarea', required: true,
      hint: 'la ligne tapée par la personne, précédée d\'un chevron saffran ; <b>…</b> autorisé' },
    { key: 'meta', label: 'Ligne d\'état', type: 'text', required: false,
      hint: 'sous la demande, ex. « ✻ Thinking… (4m 12s · 63 tool uses) » — laisser vide pour l\'omettre' },
    { key: 'reponse', label: 'La réponse', type: 'textarea', required: true,
      hint: 'UNE LIGNE = UN PARAGRAPHE ; <b>…</b> et <i>…</i> autorisés. La puce se pose seule sur le premier.' }
  ],
  // Exemple neutre à dessein : cet exemple part sur un dépôt PUBLIC, il ne peut pas
  // porter le texte d'un post qui n'est pas encore paru.
  example: {
    fenetre: 'claude — opus-5 — ~/projets/app',
    demande: 'renomme la colonne « statut » en « état »',
    meta: '✻ Thinking… (2m 04s · 31 tool uses · 44.8k tokens)',
    reponse: 'Deux choses avant de renommer, dont une qui change la demande.\n'
      + '<b>La colonne s\'appelle déjà « état » en base.</b> C\'est la vue qui affiche « statut », '
      + 'depuis un alias posé en mars. Renommer la colonne ne changerait donc rien à l\'écran.\n'
      + '<b>Trois exports la lisent par son nom.</b> Deux sont à nous, le troisième est le fichier '
      + 'que le client reçoit chaque lundi — il casserait sans que rien ne le signale avant mardi.\n'
      + 'Ce que je peux faire sans risque : changer l\'alias de la vue. Une ligne, réversible.\n'
      + '<i>Dis-moi si c\'est l\'écran que tu voulais changer, ou la base.</i>'
  },
  build(data) {
    const tpl = read('posts/template-output.html');
    const body = tpl
      .replace('<!--__DATA__-->', `<script>window.__OUT=${inScript(data)};</script>`)
      .replace('/* __FONTS__ */', read('assets/fonts.css'));
    return page(`oto — ${data.demande.replace(/<[^>]+>/g, '').slice(0, 60)}`, body);
  }
};

/* ---------- annonce (adhésion, événement, partenariat) ---------- */

// Les logos de TIERS vivent dans assets/partenaires/. Le dossier est lu au démarrage :
// ajouter un partenaire = y déposer un fichier, pas modifier ce code. Le champ reste
// décrit en enum, donc l'IHM sait toujours l'afficher.
const PARTENAIRES = Object.fromEntries(
  readdirSync(join(ROOT, 'assets/partenaires'))
    .filter(f => /\.(svg|png)$/i.test(f))
    .sort()
    .map(f => [f.replace(/\.(svg|png)$/i, ''), `assets/partenaires/${f}`]));

// Un logo tiers est posé tel quel, en data-URI : on ne le recolore pas, on ne le
// recompose pas — c'est la marque de quelqu'un d'autre.
const dataUri = rel => {
  const bin = readFileSync(join(ROOT, rel));
  const mime = rel.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
  return `data:${mime};base64,${bin.toString('base64')}`;
};

const annonce = {
  id: 'annonce',
  label: 'Annonce — adhésion, événement, installation',
  description: 'Format LinkedIn 4:5, pour une nouvelle qui se lit de loin : adhésion, événement, installation, '
    + 'partenariat. Un titre énorme dont un mot porte le saffran, le mark qui déborde du cadre, les informations '
    + 'pratiques en lignes à pictos, et les partenaires en pied — par leur logo, ou par leur nom s\'il n\'est '
    + 'pas dans nos fichiers. Statique.',
  size: { width: 1200, height: 1500, scale: 2 },
  fps: 25,
  formats: ['png'],
  fields: [
    { key: 'eyebrow', label: 'Bandeau haut', type: 'text', required: false,
      hint: 'en capitales mono à gauche, ex. « Studio IA · Marseille »' },
    { key: 'badge', label: 'Badge daté', type: 'text', required: false,
      hint: 'pastille encre en haut à droite, ex. « Sept. 2026 »' },
    { key: 'sur', label: 'Sur-titre', type: 'text', required: false,
      hint: 'une ligne mono au-dessus du titre' },
    { key: 'titre', label: 'Le titre', type: 'text', required: true,
      hint: 'affiché EN CAPITALES ; mettre <b>…</b> autour du ou des mots à passer en saffran' },
    { key: 'sous', label: 'Sous-titre', type: 'textarea', required: false,
      hint: 'deux lignes maximum ; <i>…</i> pour la partie secondaire' },
    { key: 'partenaires', label: 'Partenaires', type: 'list', required: false, max: 3,
      hint: 'en pied, à droite de notre nom. Un LOGO s\'il est dans assets/partenaires/, sinon un NOM en toutes lettres',
      item: [
        { key: 'logo', label: 'Logo', type: 'enum', options: Object.keys(PARTENAIRES), required: false,
          hint: 'laisser vide pour citer le partenaire par son nom' },
        { key: 'nom', label: 'Nom (sans logo)', type: 'text', required: false,
          hint: 'ex. « Now » — affiché en capitales dans un cadre fin' },
        { key: 'sous', label: 'Sous le nom', type: 'text', required: false,
          hint: 'ex. « Coworking · Marseille »' },
        { key: 'fond', label: 'Fond de la carte', type: 'text', required: false,
          hint: 'couleur hex ; blanc par défaut. INDISPENSABLE pour un logo blanc sur transparent, '
            + 'qui disparaîtrait sinon — prendre alors la couleur de la marque concernée.' }
      ] },
    { key: 'lignes', label: 'Informations', type: 'list', required: false, max: 4,
      hint: 'date, lieu, qui — une ligne par information, avec son picto',
      item: [
        { key: 'icone', label: 'Picto', type: 'enum', options: ICON_KEYS, required: true },
        { key: 'texte', label: 'Texte', type: 'text', required: true, hint: '<b>…</b> autorisé' }
      ] },
    { key: 'mot', label: 'Nom en pied', type: 'text', required: false, hint: 'par défaut OTOMATA' },
    { key: 'sig', label: 'Signature', type: 'text', required: false, hint: 'sous le nom, en mono' },
    { key: 'url', label: 'Adresse', type: 'text', required: false, hint: 'en bas à droite' }
  ],
  example: {
    eyebrow: 'Studio IA · Marseille',
    badge: 'Sept. 2026',
    sur: 'Nouvelle étape',
    titre: 'On rejoint <b>la bande</b>.',
    sous: 'Cadrage, formation, outils concrets. <i>Pour les PME et les ETI de la région.</i>',
    lignes: [
      { icone: 'map-pin', texte: '<b>Marseille</b>, 55 rue Grignan' },
      { icone: 'users', texte: 'Alexis Laporte &amp; Sarah Soumahoro' }
    ],
    mot: 'OTOMATA', sig: 'Studio IA · Marseille', url: 'otomata.tech'
  },
  build(data) {
    const tpl = read('posts/template-annonce.html');
    // Un partenaire, c'est un logo OU un nom. Ni l'un ni l'autre : on refuse plutôt que de
    // poser un cadre vide dans le pied.
    const vides = (data.partenaires || []).filter(p => !p.logo && !p.nom);
    if (vides.length)
      throw Object.assign(new Error('partenaire sans logo ni nom : renseigner l\'un des deux'), { status: 400 });
    const d = { ...data,
      partenaires: (data.partenaires || []).map(p => p.logo
        ? { src: dataUri(PARTENAIRES[p.logo]), fond: p.fond }
        : { nom: p.nom, sous: p.sous }) };
    const inject = `<script>window.__ICONS=${inScript(ICONS)};window.__ANN=${inScript(d)};</script>`;
    const body = tpl
      .replace('<!--__MARK__-->', read('brand/logos/otomata/otomata-mark.svg'))
      .replace('<!--__DATA__-->', inject)
      .replace('/* __FONTS__ */', read('assets/fonts.css'));
    return page(`Otomata — ${data.titre.replace(/<[^>]+>/g, '')}`, body);
  }
};

/* ---------- photo encadrée ---------- */

const photoCadre = {
  id: 'photo-cadre',
  label: 'Photo encadrée',
  description: 'Format LinkedIn 4:5. Une vraie photo posée dans la charte : mention en mono, filet, ombre dure, '
    + 'couche saffran décalée, pied de marque. Le gabarit ne touche PAS à la photo — ce sont ses proportions '
    + 'qui décident de la taille du cadre. Elle se dépose d\'abord sur POST /api/uploads (corps binaire, '
    + 'Content-Type image/jpeg|png|webp), qui rend l\'identifiant à mettre dans `photo`.',
  size: { width: 1200, height: 1500, scale: 2 },
  fps: 25,
  formats: ['png'],
  fields: [
    { key: 'photo', label: 'Photo', type: 'image', required: true,
      hint: 'jpeg, png ou webp, 12 Mo maximum. Le gabarit la pose telle quelle : pour la recadrer '
        + 'ou la retoucher, passer par POST /api/uploads/{id}/derivees (dans l\'IHM, l\'atelier s\'ouvre au dépôt de la photo).' },
    { key: 'mention', label: 'Mention', type: 'text', required: false,
      hint: 'la ligne mono au-dessus de la photo — ex. « Le Grand Bain · 14 septembre 2026 · Palais du Pharo »' },
    { key: 'decor', label: 'Décor', type: 'enum', options: ['registration', 'plat'], required: false,
      hint: 'registration = couche saffran décalée et léger dévers, la grammaire du mark ; plat = filet et ombre seuls' },
    { key: 'mot', label: 'Nom en pied', type: 'text', required: false, hint: 'par défaut OTOMATA' },
    { key: 'sig', label: 'Signature', type: 'text', required: false, hint: 'sous le nom, en mono' },
    { key: 'url', label: 'Adresse', type: 'text', required: false, hint: 'en bas à droite' }
  ],
  // Pas de photo dans l'exemple : une image d'exemple pèserait dans le dépôt et ne dirait rien
  // de plus. Le reste montre le ton attendu.
  example: {
    mention: 'Le Grand Bain · 14 septembre 2026 · Palais du Pharo', decor: 'registration',
    mot: 'OTOMATA', sig: 'Studio IA · Marseille', url: 'otomata.tech'
  },
  build(data) {
    const d = { ...data, src: uploads.dataUri(data.photo),
      style: data.decor === 'plat' ? '' : 'registration' };
    delete d.photo; delete d.decor;
    const body = read('posts/photo-cadre.html')
      .replace('<!--__MARK__-->', read('brand/logos/otomata/otomata-mark.svg'))
      .replace('<!--__DATA__-->', `<script>window.__PC=${inScript(d)};</script>`)
      .replace('/* __FONTS__ */', read('assets/fonts.css'));
    return page(`oto — ${data.mention || 'photo'}`, body);
  }
};

/* ---------- affiche du Cowork de l'IA (seconde marque) ---------- */

// Le dessin est celui du design system « Cowork de l'IA » (posts/cowork/affiche.js), exécuté dans
// Node : les énumérations du formulaire sont les siennes, pas une copie.
const lignes = v => (typeof v === 'string' ? v.split('\n').map(l => l.trim()).filter(Boolean) : []);

const MOTIFS_DITS = {
  marseille: 'la Garde, Notre-Dame, le fort Saint-Jean et la mer',
  chiffre: 'un grand chiffre tramé (champ « Chiffre » obligatoire)',
  bol: 'un bol fumant — le déjeuner',
  soleil: 'un soleil levant sur la mer',
  bulles: 'deux bulles de dialogue, ? et !',
};

const afficheCowork = {
  id: 'affiche-cowork',
  marque: 'cowork',
  label: 'Affiche du Cowork de l’IA',
  description: 'L’affiche risographie du Cowork de l’IA : aplat, tartan tramé, motif doublé d’une copie décalée, '
    + 'grand titre crème à ombre d’encre, pied en capitales mono. On la règle (motif, ton, textes, format), on ne '
    + 'la redessine pas. Prix toujours « HT », lieu « Marseille 6e » et jamais d’adresse, pas d’emoji, aucun chiffre '
    + 'inventé. Statique, un format par rendu.',
  size: { width: cowork.TAILLES.carre.width, height: cowork.TAILLES.carre.height },
  sizes: cowork.TAILLES,
  size_field: 'format',
  fps: 25,
  formats: ['png'],
  // Grain de papier pixel par pixel : un PNG de 4:5 pèse ~9 Mo, au-delà de ce que LinkedIn prend.
  // Chaque rendu livre donc aussi un JPEG qualité 90, à côté du PNG (cf. render.mjs, option `jpeg`).
  jpeg: 90,
  fields: [
    { key: 'format', label: 'Format', type: 'enum', options: Object.keys(cowork.TAILLES), required: true,
      hint: Object.entries(cowork.TAILLES).map(([f, s]) => `${f} = ${s.width * s.scale}×${s.height * s.scale} (${s.cible})`).join(' · ') },
    { key: 'motif', label: 'Motif', type: 'enum', options: cowork.MOTIFS, required: true,
      hint: cowork.MOTIFS.map(m => `${m} = ${MOTIFS_DITS[m] || m}`).join(' · ') },
    { key: 'ton', label: 'Ton', type: 'enum', options: Object.keys(cowork.TONS), required: true,
      hint: 'soleil = fond saffran clair · terre = fond terra clair · mer = fond bleu mer, titre saffran (avec le motif soleil SEULEMENT) · olive = fond olive clair' },
    { key: 'titre', label: 'Titre', type: 'textarea', required: true,
      hint: 'UNE LIGNE PAR LIGNE affichée : 1 à 3 lignes courtes et parlées (22 caractères au plus) — ex. « Le cas » / « du vendredi ». '
        + 'La taille suit la ligne la plus longue. Profil : 2 lignes au plus ; page : 1.' },
    { key: 'kicker', label: 'Kicker', type: 'textarea', required: false,
      hint: 'en minuscules, au-dessus du titre : 2 lignes au plus (36 caractères par ligne). Profil : 1 ligne ; page : aucun.' },
    { key: 'pied', label: 'Pied', type: 'textarea', required: false,
      hint: 'lieu, date ou prix, mis en capitales mono — ex. « Vendredi · 12 h 30 – 17 h · gratuit ». '
        + 'Une ligne, deux au plus (la seconde pour l’adresse) ; page : une seule.' },
    { key: 'chiffre', label: 'Chiffre', type: 'text', required: false,
      hint: 'avec le motif « chiffre » seulement, et alors obligatoire : 3 caractères au plus, ex. « 10 ». Jamais un chiffre inventé.' },
  ],
  // Le cas du vendredi : une offre réelle du lieu (grille du site cowork.otomata.tech).
  example: {
    format: 'carre',
    motif: 'bol',
    ton: 'terre',
    titre: 'Le cas\ndu vendredi',
    kicker: 'un problème réel au déjeuner,\nl’après-midi pour avancer',
    pied: 'Vendredi · 12 h 30 – 17 h · gratuit',
  },
  // Ce que les champs seuls ne disent pas : les plafonds dépendent du format choisi, et le chiffre
  // dépend du motif. Appelé par `validate`, avec les autres refus.
  check(data) {
    const refus = [];
    const s = Object.hasOwn(cowork.SERVIS, data.format) ? cowork.SERVIS[data.format] : null;
    if (!s) return refus;   // format absent ou hors liste : déjà refusé par le contrôle des champs
    const titre = lignes(data.titre), kicker = lignes(data.kicker), pied = lignes(data.pied);
    if (typeof data.titre === 'string' && !titre.length) refus.push('titre : au moins une ligne non vide');
    if (titre.length > s.titre) refus.push(`titre : ${s.titre} ligne(s) au plus en format ${data.format} (reçu ${titre.length})`);
    for (const l of titre) if (l.length > 22) refus.push(`titre : ligne trop longue (22 caractères au plus) : « ${l} »`);
    if (kicker.length > s.kicker)
      refus.push(s.kicker ? `kicker : ${s.kicker} ligne(s) au plus en format ${data.format}` : `kicker : pas de place en format ${data.format}`);
    for (const l of kicker) if (l.length > 36) refus.push(`kicker : ligne trop longue (36 caractères au plus) : « ${l} »`);
    if (pied.length > s.pied[0]) refus.push(`pied : ${s.pied[0]} ligne(s) au plus en format ${data.format}`);
    for (const l of pied) if (l.length > s.pied[1])
      refus.push(`pied : ligne trop longue en format ${data.format} (${s.pied[1]} caractères au plus) : « ${l} »`);
    // Le dessin lève la même erreur : sur le cobalt, la double impression des autres motifs vire au vert sale.
    if (data.ton === 'mer' && data.motif !== 'soleil' && cowork.MOTIFS.includes(data.motif))
      refus.push(`ton « mer » : seulement avec le motif « soleil » (motif reçu : ${data.motif}) — sur le fond bleu, `
        + 'la double impression des autres motifs vire au vert. Prendre un autre ton, ou le motif soleil.');
    const chiffre = data.chiffre;
    if (data.motif === 'chiffre' && (chiffre === undefined || chiffre === null || chiffre === ''))
      refus.push('chiffre : obligatoire avec le motif « chiffre »');
    if (data.motif !== 'chiffre' && chiffre !== undefined && chiffre !== null && chiffre !== '')
      refus.push(`chiffre : seulement avec le motif « chiffre » (motif reçu : ${data.motif})`);
    if (data.motif === 'chiffre' && typeof chiffre === 'string' && chiffre !== '' && !chiffre.trim())
      refus.push('chiffre : vide (des espaces seulement)');
    if (typeof chiffre === 'string' && chiffre.trim().length > 3) refus.push(`chiffre : 3 caractères au plus (reçu « ${chiffre} »)`);
    return refus;
  },
  /** Les options du dessin, depuis les données du formulaire. Exporté pour le kit, qui passe par ici. */
  options(data) {
    const o = { format: data.format, motif: data.motif, ton: data.ton, titre: lignes(data.titre) };
    if (lignes(data.kicker).length) o.kicker = lignes(data.kicker);
    if (lignes(data.pied).length) o.pied = lignes(data.pied);
    if (data.motif === 'chiffre') o.chiffre = data.chiffre.trim();
    return o;
  },
  build(data) {
    return page(`Cowork de l’IA — ${lignes(data.titre).join(' ')}`, cowork.corps(this.options(data)));
  }
};

// Chaque gabarit dit sa marque : l'IHM ne montre que ceux de la marque choisie. Posée en place
// (pas par copie) : `carte` lit son exemple par un accesseur, qu'une copie figerait au démarrage.
for (const t of [carte, affiche, identite, banniere, output, annonce, photoCadre]) t.marque = 'otomata';

const TEMPLATES = new Map([carte, affiche, identite, banniere, output, annonce, photoCadre, afficheCowork]
  .map(t => [t.id, t]));

// L'index reste léger : ni le constructeur ni l'exemple (le manifeste unitaire les porte).
export const list = () => [...TEMPLATES.values()].map(
  ({ build, example, fields, check, options, ...rest }) => rest);

export function get(id) {
  const t = TEMPLATES.get(id);
  if (!t) throw Object.assign(new Error(`gabarit inconnu : ${id}`), { status: 404 });
  return t;
}

/** Valide les données contre le manifeste.
 *
 *  Deux règles que le contrat promet et qu'il faut donc tenir :
 *  - un champ INCONNU est refusé. Sans ça, une faute de frappe sur un nom de champ
 *    produit un visuel silencieusement amputé — l'échec le plus coûteux, parce qu'il
 *    ressemble à un succès. (Trouvé en faisant appeler l'API par un agent, 02/09.)
 *  - TOUS les refus sont rendus d'un coup. Un agent qui cumule trois fautes doit les
 *    voir ensemble, pas faire trois allers-retours.
 */
export function validate(template, data) {
  const refus = [];

  const check = (fields, values, path) => {
    const où = k => (path ? `${path}.${k}` : k);
    if (values === null || typeof values !== 'object' || Array.isArray(values)) {
      refus.push(`${path || 'data'} doit être un objet`);
      return;
    }

    const connus = new Set(fields.map(f => f.key));
    for (const k of Object.keys(values))
      if (!connus.has(k))
        refus.push(`champ inconnu : ${où(k)} (attendus : ${[...connus].join(', ')})`);

    for (const f of fields) {
      const v = values[f.key];
      if (v === undefined || v === null || v === '') {
        if (f.required) refus.push(`champ manquant : ${où(f.key)}`);
        continue;
      }
      // Un texte reçu en liste (le contenu d'une carte, ligne par ligne) passait la
      // validation, faisait planter le gabarit et sortait un PNG sans scène. (01/10)
      if ((f.type === 'text' || f.type === 'textarea') && typeof v !== 'string')
        refus.push(`${où(f.key)} doit être un texte` +
          (f.type === 'textarea' ? ' (une ligne par saut de ligne \\n, pas une liste)' : ''));
      if (f.type === 'enum' && !f.options.includes(v))
        refus.push(`valeur refusée pour ${où(f.key)} : ${v} (attendues : ${f.options.join(', ')})`);
      // Une image est un identifiant de dépôt, jamais son contenu : on vérifie qu'il désigne
      // un fichier réel plutôt que de laisser le rendu sortir un cadre vide.
      if (f.type === 'image' && !uploads.existe(v))
        refus.push(`image inconnue pour ${où(f.key)} : ${v} — la déposer d'abord sur POST /api/uploads`);
      if (f.type === 'list') {
        if (!Array.isArray(v)) { refus.push(`${où(f.key)} doit être une liste`); continue; }
        if (f.min && v.length < f.min) refus.push(`${où(f.key)} : au moins ${f.min} entrée(s)`);
        if (f.max && v.length > f.max) refus.push(`${où(f.key)} : au plus ${f.max} entrées`);
        v.forEach((item, i) => check(f.item, item, `${où(f.key)}[${i}]`));
      }
    }
  };

  check(template.fields, data, '');
  // Les règles qui croisent plusieurs champs (un plafond qui dépend du format, un champ qui dépend
  // d'un autre) : le gabarit les porte, et leurs refus arrivent avec les autres.
  if (template.check && data && typeof data === 'object' && !Array.isArray(data))
    refus.push(...template.check(data));
  if (refus.length)
    throw Object.assign(new Error(refus.join(' · ')), { status: 400, refus });
  return data;
}
