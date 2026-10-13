/* ─── studio-otomata ─────────────────────────────────────────────────────────────────────────────────────
   COPIE du bundle du design system « Cowork de l’IA » publié sur Claude Design
   (https://claude.ai/artifact/NHNVP9oFub3DLSPXVHPCbj, fichier components/bundle.js, synchronisé le 13/10/2026).
   LE DESIGN SYSTEM FAIT AUTORITÉ sur ce dessin : une évolution s’y décide, puis se recopie ici à l’octet.
   Deux différences avec la version publiée au 13/10/2026, ajoutées par le studio et à reporter sur le design
   system (cf. service/README.md, § « L’affiche du Cowork de l’IA ») :
   - l’option `format` (carre, paysage, portrait, apercu, profil, page) et la table FORMATS. `hero: true` reste
     accepté et vaut `paysage` ; carre et paysage rendent le même SVG qu’avant, à l’octet ;
   - le ton `mer` refusé avec un autre motif que `soleil` (la double impression y vire au vert).
   Seule copie dans ce dépôt : le gabarit `affiche-cowork`, le kit /kit/cowork et la charte /brand/cowork
   la lisent toutes ici, par service/marques/cowork-affiche.mjs.
   ───────────────────────────────────────────────────────────────────────────────────────────────────── */
/* Cowork de l’IA — l’affiche « risographie » en SVG, portée de cowork.otomata.tech (src/components/Affiche.vue).
   CoworkIA.affiche(options) rend la chaîne SVG d’une affiche : aplat de couleur, tartan tramé en mode produit,
   formes doublées d’une copie décalée (calage), grand titre crème à ombre d’encre, grain de papier.
   Les couleurs sont lues sur les jetons --color-* de la page (tokens.css) et écrites en dur dans le SVG,
   pour qu’il s’exporte tel quel ; hors page, les valeurs de la charte servent. */
window.CoworkIA = (function () {
  var CHARTE = {
    bg: '#fefcf5', ink: '#2c2112', saffron: '#f0b41e', 'saffron-soft': '#fbe7a8',
    terra: '#e84b16', 'terra-soft': '#f7cdbb', 'terra-ink': '#621b04',
    olive: '#8aa620', 'olive-soft': '#e6eec0', 'olive-ink': '#3e4c0c',
    cobalt: '#1f6dba', 'cobalt-vif': '#2a87d8', 'cobalt-ink': '#0b2e54'
  };
  function couleur(nom) {
    var v = '';
    if (typeof document !== 'undefined' && document.documentElement) {
      v = getComputedStyle(document.documentElement).getPropertyValue('--color-' + nom).trim();
    }
    return v || CHARTE[nom];
  }

  // Chaque ton = un fond, une encre de trame, une encre de tartan, une encre de trait, la couleur du titre et de son ombre.
  var TONS = {
    soleil: { fond: 'saffron-soft', trame: 'cobalt', tartan: 'terra-soft', trait: 'cobalt-ink', titre: 'bg', ombre: 'cobalt-ink' },
    terre: { fond: 'terra-soft', trame: 'terra', tartan: 'saffron-soft', trait: 'ink', titre: 'bg', ombre: 'terra-ink' },
    mer: { fond: 'cobalt', trame: 'cobalt-ink', tartan: 'cobalt-vif', trait: 'bg', titre: 'saffron', ombre: 'cobalt-ink' },
    olive: { fond: 'olive-soft', trame: 'olive', tartan: 'saffron-soft', trait: 'olive-ink', titre: 'bg', ombre: 'olive-ink' }
  };
  var MOTIFS = ['marseille', 'chiffre', 'bol', 'soleil', 'bulles'];

  // Les formats : la taille du dessin et la place de chaque élément. `carre` et `paysage` (l’ancien `hero`)
  // reprennent les cotes d’origine à l’identique ; les autres sont composés pour leur cadre, jamais étirés.
  //   kicker : centre x, ligne de base de la première ligne, taille, pas entre lignes ; null = pas de place
  //   titre  : centre x, largeur disponible, taille maximale, ligne de base de la dernière ligne, décalage de l’ombre ;
  //            `haut` (formats bas) : limite haute du titre sans kicker — la taille baisse alors aussi pour tenir en hauteur,
  //            sous le kicker s’il y en a un
  //   pied   : centre x, ligne de base de la dernière ligne, taille
  //   motif  : [tx, ty, k] = translate(tx ty) scale(k) posé sur le dessin du motif tel qu’il est fait pour le carré ;
  //            pour marseille, la transformation de son propre groupe. Un motif absent garde ses cotes du carré.
  var FORMATS = {
    carre: { W: 1200, H: 1200,
      kicker: { x: 600, y: 120, taille: 44, pas: 52 },
      titre: { x: 600, largeur: 1060, max: 150, bas: 970, ombre: 8 },
      pied: { x: 600, y: 1130, taille: 34 },
      motif: { marseille: [0, 260, 1.5] } },
    paysage: { W: 1200, H: 760,
      kicker: { x: 600, y: 92, taille: 44, pas: 52 },
      titre: { x: 600, largeur: 1060, max: 150, bas: 650, ombre: 8 },
      pied: { x: 600, y: 726, taille: 34 },
      motif: { marseille: [200, 150, 1] } },
    portrait: { W: 1200, H: 1500,
      kicker: { x: 600, y: 150, taille: 44, pas: 52 },
      titre: { x: 600, largeur: 1060, max: 150, bas: 1250, ombre: 8 },
      pied: { x: 600, y: 1420, taille: 34 },
      motif: { marseille: [0, 360, 1.5], chiffre: [-60, 160, 1.1], bol: [-90, 130, 1.15], soleil: [0, 200, 1], bulles: [-60, 140, 1.1] } },
    apercu: { W: 1200, H: 627,
      kicker: { x: 870, y: 110, taille: 34, pas: 40 },
      titre: { x: 870, largeur: 600, max: 120, bas: 440, ombre: 7, haut: 60 },
      pied: { x: 600, y: 592, taille: 24 },
      motif: { marseille: [-20, 245, 0.72], chiffre: [-157, -62, 0.75], bol: [-132, -40, 0.72], soleil: [-120, -21, 0.7], bulles: [-75, -17, 0.62] } },
    profil: { W: 1584, H: 396,
      kicker: { x: 720, y: 96, taille: 32, pas: 38 },
      titre: { x: 720, largeur: 760, max: 112, bas: 232, ombre: 7, haut: 40 },
      pied: { x: 720, y: 348, taille: 24 },
      motif: { marseille: [1150, 62, 0.6], chiffre: [1090, -35, 0.5], bol: [1095, -35, 0.5], soleil: [1065, 22, 0.55], bulles: [1153, 2, 0.4] } },
    page: { W: 1050, H: 175, kicker: null,
      titre: { x: 540, largeur: 560, max: 72, bas: 100, ombre: 5, haut: 22 },
      pied: { x: 540, y: 152, taille: 14 },
      motif: { marseille: [830, 20, 0.3], chiffre: [803, -29, 0.25], bol: [805, -29, 0.25], soleil: [815, 5, 0.28], bulles: [840, -6, 0.19] } }
  };

  // Le Marseille du décor d’otomata.tech (MarseilleScene.vue) : la Garde, Notre-Dame, le fort Saint-Jean, un voilier.
  var GARDE = 'M320 192 C 390 180, 440 124, 498 98 C 524 86, 562 86, 588 98 C 640 120, 700 160, 800 170 L800 194 L320 194 Z';
  var BASILIQUE = 'M500 95 L506 86 L514 86 L514 64 L526 64 L526 26 L528 26 L528 16 L533 9 L538 16 L538 26 L540 26 L540 64 L548 64 A9 9 0 0 1 566 64 L574 64 L574 86 L584 86 L590 95 Z';
  var FORT = 'M89 205 L92 195 L105 195 L107 183 L128 183 L128 149 L176 149 L176 183 L198 183 L198 166 L196 166 L200 159 L210 159 L214 166 L212 166 L212 183 L216 183 L218 195 L258 195 L262 205 Z';
  var VOILIER = 'M485 242 L485 303 L436 303 C 452 282, 470 260, 485 242 Z M432 309 L528 309 C 523 317, 515 321, 505 321 L453 321 C 444 321, 437 316, 432 309 Z';
  // De -220 à 1020 dans le repère du décor ; un format plus large que ce que le décor couvre étend la mer
  // par pas entiers de 40, pour garder la phase des vagues.
  function vague(y, amp, x0, x1) {
    var d = 'M' + x0 + ' ' + y;
    for (var x = x0; x < x1; x += 40) d += ' q 20 ' + -amp + ' 40 0';
    return d;
  }
  function etendue(debut, fin, mini, maxi) {
    var x0 = mini - 40 * Math.max(0, Math.ceil((mini - debut) / 40));
    return [x0, x0 + 40 * Math.ceil((Math.max(maxi, fin) - x0) / 40)];
  }

  var DISPLAY = "font-family:'Bricolage Grotesque','Hanken Grotesk',system-ui,sans-serif";
  var MONO = "font-family:'JetBrains Mono',ui-monospace,Menlo,monospace";
  var MUL = 'style="mix-blend-mode:multiply"';
  var compteur = 0;

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function affiche(o) {
    if (!TONS[o.ton]) throw new Error('Affiche : ton « ' + o.ton + ' » inconnu (soleil, terre, mer, olive).');
    if (MOTIFS.indexOf(o.motif) < 0) throw new Error('Affiche : motif « ' + o.motif + ' » inconnu (' + MOTIFS.join(', ') + ').');
    // Sur le fond cobalt du ton mer, la double impression saffran ou terra (mode produit) des autres motifs vire au
    // vert sale : le ton mer ne se combine qu’avec le soleil, comme sur le site.
    if (o.ton === 'mer' && o.motif !== 'soleil') throw new Error('Affiche : le ton « mer » ne va qu’avec le motif « soleil » (reçu : ' + o.motif + ').');
    if (!o.titre || !o.titre.length) throw new Error('Affiche : il faut un titre (liste de lignes).');
    if (o.motif === 'chiffre' && !o.chiffre) throw new Error('Affiche : le motif « chiffre » demande un chiffre.');

    if (o.hero && o.format && o.format !== 'paysage') throw new Error('Affiche : hero vaut le format paysage, pas « ' + o.format + ' ».');
    var format = o.format || (o.hero ? 'paysage' : 'carre');
    var f = Object.prototype.hasOwnProperty.call(FORMATS, format) ? FORMATS[format] : null;
    if (!f) throw new Error('Affiche : format « ' + format + ' » inconnu (' + Object.keys(FORMATS).join(', ') + ').');
    if (o.kicker && o.kicker.length && !f.kicker) throw new Error('Affiche : le format « ' + format + ' » n’a pas de place pour un kicker.');
    var place = f.motif[o.motif];
    if (o.motif === 'marseille' && !place) throw new Error('Affiche : le format « ' + format + ' » ne place pas le motif marseille.');

    var id = 'cowork-affiche-' + (++compteur);
    var W = f.W, H = f.H;
    var t = {};
    Object.keys(TONS[o.ton]).forEach(function (k) { t[k] = couleur(TONS[o.ton][k]); });
    var saffron = couleur('saffron'), terra = couleur('terra'), cobalt = couleur('cobalt'), creme = couleur('bg');
    var s = [];

    s.push('<defs>',
      '<pattern id="' + id + '-points" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(18)"><circle cx="7" cy="7" r="3.4" fill="' + t.trame + '"/></pattern>',
      '<pattern id="' + id + '-fins" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(18)"><circle cx="4.5" cy="4.5" r="2.1" fill="' + t.trait + '"/></pattern>',
      '<pattern id="' + id + '-hachures" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="12" fill="' + t.tartan + '"/></pattern>',
      '<filter id="' + id + '-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 0.17  0 0 0 0 0.13  0 0 0 0 0.07  0 0 0 -1.6 1.05"/></filter>',
      '</defs>');

    // Fond et tartan : bandes verticales tramées, bandes horizontales hachurées, pointillés.
    s.push('<rect width="' + W + '" height="' + H + '" fill="' + t.fond + '"/>');
    var bandesV = [], bandesH = [], i;
    for (i = 0; i < Math.ceil(W / 230); i++) bandesV.push(i * 230 + 40);
    for (i = 0; i < Math.ceil(H / 210); i++) bandesH.push(i * 210 + 70);
    s.push('<g ' + MUL + ' opacity=".55">' + bandesV.map(function (x) { return '<rect x="' + x + '" y="0" width="92" height="' + H + '" fill="url(#' + id + '-points)"/>'; }).join('') + '</g>');
    s.push('<g ' + MUL + ' opacity=".8">' + bandesH.map(function (y) { return '<rect x="0" y="' + y + '" width="' + W + '" height="64" fill="url(#' + id + '-hachures)"/>'; }).join('') + '</g>');
    s.push('<g stroke="' + t.trait + '" stroke-width="3" stroke-dasharray="2 7" opacity=".55">' + bandesH.map(function (y) { return '<line x1="0" x2="' + W + '" y1="' + (y - 10) + '" y2="' + (y - 10) + '"/>'; }).join('') + '</g>');

    if (o.kicker && o.kicker.length) {
      s.push('<text x="' + f.kicker.x + '" y="' + f.kicker.y + '" text-anchor="middle" fill="' + t.trait + '" style="' + DISPLAY + ';font-weight:700;font-size:' + f.kicker.taille + 'px;letter-spacing:-0.01em">' +
        o.kicker.map(function (k, j) { return '<tspan x="' + f.kicker.x + '" dy="' + (j === 0 ? 0 : f.kicker.pas) + '">' + esc(k) + '</tspan>'; }).join('') + '</text>');
    }

    var trait = ' stroke="' + t.trait + '" stroke-width="3" stroke-linejoin="round"';
    // Hors marseille, un format qui déplace le motif l’enveloppe d’un groupe ; `p` sert à retrouver, dans le repère
    // du motif, les bords du dessin que la mer doit atteindre.
    var cadre = place && o.motif !== 'marseille';
    var p = place || [0, 0, 1];
    if (cadre) s.push('<g transform="translate(' + p[0] + ' ' + p[1] + ') scale(' + p[2] + ')">');
    if (o.motif === 'marseille') {
      var mer = etendue(-p[0] / p[2], (W - p[0]) / p[2], -220, 1020);
      s.push('<g transform="translate(' + p[0] + ' ' + p[1] + ') scale(' + p[2] + ')">',
        '<g transform="translate(7 6)" ' + MUL + '><path d="' + GARDE + '" fill="' + saffron + '"/><path d="' + BASILIQUE + '" fill="' + saffron + '"/><path d="' + FORT + '" fill="' + saffron + '"/></g>',
        '<path d="' + GARDE + '" fill="url(#' + id + '-fins)" stroke="' + t.trait + '" stroke-width="3"/>',
        '<path d="' + BASILIQUE + '" fill="' + creme + '"' + trait + '/>',
        '<path d="' + FORT + '" fill="' + creme + '"' + trait + '/>',
        '<path d="' + vague(205, 10, mer[0], mer[1]) + ' L' + mer[1] + ' 380 L' + mer[0] + ' 380 Z" fill="' + cobalt + '" ' + MUL + ' opacity=".85"/>',
        [232, 258, 286, 316, 346].map(function (y) { return '<path d="' + vague(y, 7, mer[0], mer[1]) + '" fill="none" stroke="' + creme + '" stroke-width="3" opacity=".8"/>'; }).join(''),
        '<g transform="translate(-560 -30)"><path d="' + VOILIER + '" fill="' + terra + '" ' + MUL + ' transform="translate(6 5)"/><path d="' + VOILIER + '" fill="' + creme + '"' + trait + '/></g>',
        '<circle cx="700" cy="60" r="44" fill="' + saffron + '" ' + MUL + '/>',
        '<circle cx="694" cy="56" r="44" fill="none" stroke="' + t.trait + '" stroke-width="3"/>',
        '</g>');
    } else if (o.motif === 'chiffre') {
      var styleChiffre = 'style="' + DISPLAY + ';font-weight:800;font-size:620px;letter-spacing:-0.06em';
      s.push('<text x="610" y="690" dx="14" dy="12" text-anchor="middle" fill="' + terra + '" ' + styleChiffre + ';mix-blend-mode:multiply">' + esc(o.chiffre) + '</text>',
        '<text x="610" y="690" text-anchor="middle" fill="url(#' + id + '-fins)" stroke="' + t.trait + '" stroke-width="5" ' + styleChiffre + '">' + esc(o.chiffre) + '</text>');
    } else if (o.motif === 'bol') {
      var bol = 'M-300 0 A300 230 0 0 0 300 0 Z';
      s.push('<g transform="translate(600 520)">',
        '<path d="' + bol + '" fill="' + saffron + '" ' + MUL + ' transform="translate(12 10)"/>',
        '<path d="' + bol + '" fill="url(#' + id + '-fins)" stroke="' + t.trait + '" stroke-width="5"/>',
        '<rect x="-330" y="-14" width="660" height="22" rx="11" fill="' + creme + '" stroke="' + t.trait + '" stroke-width="5"/>',
        [-140, 0, 140].map(function (x) { return '<path d="M' + x + ' -60 c -40 -50, 40 -90, 0 -150 c -30 -45, 30 -80, 0 -120" fill="none" stroke="' + t.trait + '" stroke-width="7" stroke-linecap="round"/>'; }).join(''),
        '</g>');
    } else if (o.motif === 'soleil') {
      var rayons = [0, 25, 50, 75, 100, 125, 150, 175].map(function (a) {
        var r = (a * Math.PI) / 180 + Math.PI;
        return '<line x1="' + Math.cos(r) * 300 + '" y1="' + Math.sin(r) * 300 + '" x2="' + Math.cos(r) * 380 + '" y2="' + Math.sin(r) * 380 + '"/>';
      }).join('');
      // La mer du soleil couvre tout le bas du dessin, quel que soit le format : bornes en repère du motif.
      var large = etendue(-p[0] / p[2] - 600, (W - p[0]) / p[2] - 600, -600, 600);
      var houle = '';
      for (i = 0; i < (large[1] - large[0]) / 40; i++) houle += ' q 20 -10 40 0';
      s.push('<g transform="translate(600 560)">',
        '<circle r="250" fill="' + saffron + '"/>',
        '<circle r="250" fill="url(#' + id + '-points)" opacity=".35"/>',
        '<g stroke="' + t.trait + '" stroke-width="7" stroke-linecap="round">' + rayons + '</g>',
        '<rect x="' + large[0] + '" y="40" width="' + (large[1] - large[0]) + '" height="' + Math.max(600, (H - p[1]) / p[2] - 600) + '" fill="' + t.fond + '"/>',
        [70, 110, 150].map(function (y) { return '<path d="M' + large[0] + ' ' + y + houle + '" fill="none" stroke="' + t.trait + '" stroke-width="5"/>'; }).join(''),
        '</g>');
    } else if (o.motif === 'bulles') {
      var signe = 'style="' + DISPLAY + ';font-weight:800;font-size:220px"';
      s.push('<g transform="translate(14 12)" ' + MUL + '><rect x="170" y="230" width="560" height="300" rx="150" fill="' + saffron + '"/></g>',
        '<rect x="170" y="230" width="560" height="300" rx="150" fill="url(#' + id + '-fins)" stroke="' + t.trait + '" stroke-width="5"/>',
        '<path d="M300 520 L260 620 L380 528" fill="url(#' + id + '-fins)" stroke="' + t.trait + '" stroke-width="5" stroke-linejoin="round"/>',
        '<rect x="520" y="400" width="520" height="280" rx="140" fill="' + creme + '" stroke="' + t.trait + '" stroke-width="5"/>',
        '<path d="M900 670 L960 760 L840 676" fill="' + creme + '" stroke="' + t.trait + '" stroke-width="5" stroke-linejoin="round"/>',
        '<text x="450" y="420" text-anchor="middle" fill="' + t.trait + '" ' + signe + '>?</text>',
        '<text x="780" y="580" text-anchor="middle" fill="' + terra + '" ' + signe + '>!</text>');
    }
    if (cadre) s.push('</g>');

    // Grand titre : sa taille suit la ligne la plus longue (≈ 0,5 em par caractère en Bricolage 800), plafonnée
    // par le format (150 dans le carré).
    var plusLongue = Math.max.apply(null, o.titre.map(function (l) { return l.length; }));
    var taille = Math.min(f.titre.max, Math.floor(f.titre.largeur / (plusLongue * 0.5)));
    if (f.titre.haut !== undefined) {
      // Hauteur d’une ligne de base à l’autre : 0,92 em ; hauteur des capitales de la première ligne : ≈ 0,75 em.
      var haut = o.kicker && o.kicker.length ? f.kicker.y + (o.kicker.length - 1) * f.kicker.pas + f.kicker.taille * 0.6 : f.titre.haut;
      taille = Math.min(taille, Math.floor((f.titre.bas - haut) / (0.92 * (o.titre.length - 1) + 0.75)));
    }
    var ligne = taille * 0.92;
    var yTitre = f.titre.bas - (o.titre.length - 1) * ligne;
    var styleTitre = 'style="' + DISPLAY + ';font-weight:800;letter-spacing:-0.035em;paint-order:stroke"';
    s.push('<g>',
      o.titre.map(function (l, j) { return '<text x="' + (f.titre.x + f.titre.ombre) + '" y="' + (yTitre + j * ligne + f.titre.ombre) + '" text-anchor="middle" fill="' + t.ombre + '" font-size="' + taille + '" ' + styleTitre + '>' + esc(l) + '</text>'; }).join(''),
      o.titre.map(function (l, j) { return '<text x="' + f.titre.x + '" y="' + (yTitre + j * ligne) + '" text-anchor="middle" fill="' + t.titre + '" stroke="' + t.ombre + '" stroke-width="3" font-size="' + taille + '" ' + styleTitre + '>' + esc(l) + '</text>'; }).join(''),
      '</g>');

    // Le pied : une ligne, ou une liste de lignes (un bandeau y met le lieu, puis l’adresse).
    var pieds = o.pied ? [].concat(o.pied) : [];
    pieds.forEach(function (l, j) {
      var y = f.pied.y - (pieds.length - 1 - j) * Math.round(f.pied.taille * 1.35);
      s.push('<text x="' + f.pied.x + '" y="' + y + '" text-anchor="middle" fill="' + t.trait + '" style="' + MONO + ';font-weight:700;font-size:' + f.pied.taille + 'px;letter-spacing:0.16em">' + esc(l.toLocaleUpperCase('fr')) + '</text>');
    });
    s.push('<rect width="' + W + '" height="' + H + '" filter="url(#' + id + '-grain)" opacity=".22" ' + MUL + '/>');

    var label = (o.kicker || []).concat(o.titre, pieds.length ? pieds : ['']).join(' — ');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label) +
      '" style="display:block;width:100%;height:auto;background:' + creme + '">' + s.join('') + '</svg>';
  }

  return { affiche: affiche, TONS: TONS, MOTIFS: MOTIFS, FORMATS: FORMATS };
})();
