// Description OpenAPI servie sur /openapi.json — c'est par elle qu'un agent découvre
// l'API (le connecteur `http` d'oto ne génère pas d'outils par route : il lit ce
// document avec `http_doc()` puis appelle `http_get`/`http_post`).
// Elle est DÉRIVÉE du registre de gabarits : un gabarit ajouté s'y décrit tout seul.
import * as templates from './templates.mjs';
import * as marques from './marques.mjs';

// Les valeurs autorisées sont données EN ENTIER, y compris pour les sous-champs d'une
// liste : une énumération tronquée fait inventer une valeur plausible, refusée ensuite
// (constaté en appelant l'API depuis un agent — « check » n'est pas une icône).
const enumValues = f => f.type === 'enum' ? ` — valeurs autorisées : ${f.options.join(', ')}` : '';

const champs = (fields, indent = '  ') => fields.map(f => {
  const head = `${indent}- \`${f.key}\` (${f.type === 'list' ? 'liste' : f.type}` +
    `${f.required ? ', requis' : ', optionnel'}` +
    `${f.min ? `, ${f.min} minimum` : ''}${f.max ? `, ${f.max} maximum` : ''})` +
    `${enumValues(f)}${f.hint ? ` — ${f.hint}` : ''}`;
  return f.type === 'list'
    ? `${head}\n${indent}  chaque entrée :\n${champs(f.item, indent + '    ')}`
    : head;
}).join('\n');

// La taille livrée d'un gabarit multi-formats dépend d'un champ : l'annoncer en une
// seule cote ferait produire un 4:5 à qui demande une couverture. On donne la table.
// La taille ANNONCÉE à un agent est celle du fichier livré : dimensions × échelle. Sans
// l'échelle, le contrat promettait du 1200×1500 pour un PNG qui sort en 2400×3000.
const px = s => `${s.width * (s.scale || 1)}×${s.height * (s.scale || 1)}`;
const taille = t => {
  if (!t.sizes) return `Taille : ${px(t.size)}.`;
  const tailles = Object.entries(t.sizes);
  // Une seule taille déclarée : aucun champ ne choisit, il n'y a rien à dire « selon ».
  // (La bannière affichait « Taille selon `undefined` » dans le contrat des agents.)
  if (tailles.length === 1) return `Taille : ${px(tailles[0][1])}.`;
  if (!t.size_field)
    throw new Error(`gabarit ${t.id} : plusieurs tailles déclarées sans size_field pour choisir`);
  return `Taille selon \`${t.size_field}\` : ` + tailles.map(([k, s]) => `${k} → ${px(s)}`).join(', ') + '.';
};

export function openapi() {
  const list = templates.list();
  const detail = list.map(t => {
    const full = templates.get(t.id);
    return `### \`${t.id}\` — ${t.label}\nMarque : ${marques.get(t.marque).nom}.\n${t.description}\nFormats : ${t.formats.join(', ')}. ` +
      `${taille(t)}\nChamps de \`data\` :\n${champs(full.fields)}`;
  }).join('\n\n');

  return {
    openapi: '3.0.3',
    info: {
      title: 'oto studio',
      version: '1',
      description:
        'Produit des visuels dans la charte d\'une marque, à partir de gabarits fermés. Chaque gabarit ' +
        'dit sa marque : ' + marques.liste().map(m => `**${m.nom}** (\`${m.id}\`)`).join(', ') + '.\n\n' +
        'Marche à suivre : `POST /api/renders` avec un `template` et son `data`. La réponse ' +
        'porte **`page`** — une URL à donner telle quelle à la personne : elle affiche ' +
        'l\'attente, puis le visuel dès qu\'il est prêt. **C\'est ce qu\'il faut rendre**, ' +
        'plutôt que de faire patienter quelqu\'un pendant le rendu.\n\n' +
        'Le rendu se fait en tâche de fond : le travail sort en `status` **`en_cours`** ' +
        '(compter ~1 min pour une carte, 2 à 3 min pour une affiche animée). Pour suivre soi-même, ' +
        'relire `GET /api/renders/{id}` jusqu\'à `fini` (ou `échoué`, qui porte alors son ' +
        '`error`) ; les fichiers sont alors dans `files_url`, en URL absolues.\n\n' +
        'Un champ inconnu, un champ requis manquant ou un format que le gabarit ne sert pas ' +
        'sont REFUSÉS — il n\'y a pas de valeur de repli. **Tous les refus arrivent d\'un coup**, ' +
        'séparés par ` · ` : inutile de corriger une faute à la fois.\n\n' +
        '**Qui peut ouvrir `page` et `files_url`** : ces adresses sont derrière Cloudflare Access, ' +
        'ouvertes aux comptes `@otomata.tech`. Elles se partagent en interne (Slack, mail entre ' +
        'nous) ; envoyées à quelqu\'un d\'extérieur, elles tombent sur un écran de connexion. Pour ' +
        'l\'extérieur, télécharger le fichier et le joindre.\n\n' +
        '**Combien de temps** : les rendus sont purgés au-delà des 60 plus récents. Ce qui doit ' +
        'durer se télécharge. `DELETE /api/renders/{id}` retire un essai raté de la galerie, ' +
        'qui est commune.\n\n' +
        '## Gabarits disponibles\n\n' + detail
    },
    components: {
      schemas: {
        Zone: {
          type: 'object', required: ['x', 'y', 'w', 'h'],
          description: 'une zone en fractions de l\'image (0 → 1), coin haut-gauche',
          properties: {
            x: { type: 'number' }, y: { type: 'number' },
            w: { type: 'number' }, h: { type: 'number' }
          }
        }
      }
    },
    paths: {
      '/api/templates': {
        get: { summary: 'Les gabarits et leurs formats', responses: { 200: { description: 'liste' } } }
      },
      '/api/templates/{id}': {
        get: {
          summary: 'Le manifeste d\'un gabarit : ses champs, ses contraintes, un exemple complet',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'manifeste' }, 404: { description: 'gabarit inconnu' } }
        }
      },
      '/api/renders': {
        get: { summary: 'Les rendus récents, du plus récent au plus ancien', responses: { 200: { description: 'liste' } } },
        post: {
          summary: 'Lancer un rendu (rend la main tout de suite, le travail part en fond)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['template', 'data'],
                  properties: {
                    template: { type: 'string', description: 'id du gabarit', enum: list.map(t => t.id) },
                    data: { type: 'object', description: 'les champs du gabarit — cf. son manifeste' },
                    formats: {
                      type: 'array', items: { type: 'string', enum: ['mp4', 'gif', 'png'] },
                      description: 'défaut : ["mp4"]. Doit être servi par le gabarit.'
                    },
                    author: { type: 'string', description: 'qui demande — repris tel quel dans la galerie' }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'le travail créé, `status` = en_cours' }, 400: { description: 'données refusées' } }
        }
      },
      '/api/renders/{id}': {
        delete: {
          summary: 'Retirer un rendu de la galerie (commune) — irréversible',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'retiré' }, 404: { description: 'inconnu' } }
        },
        get: {
          summary: 'L\'état d\'un rendu : en_cours | fini | échoué',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'le travail' }, 404: { description: 'inconnu' } }
        }
      },
      '/api/uploads/{id}/derivees': {
        post: {
          summary: 'Travailler une photo déposée : recadrer, égaliser, retoucher une zone',
          description:
            'Rend un NOUVEAU dépôt, dérivé : l\'originale reste intacte, et l\'identifiant rendu ' +
            's\'utilise dans n\'importe quel gabarit qui attend une image.\n\n' +
            'Les zones (`recadre`, `zone`) sont en **fractions** de l\'image, 0 → 1, coin haut-gauche ' +
            '— jamais en pixels. `zone` se lit sur l\'image APRÈS recadrage.\n\n' +
            '⚠️ **La passe IA ne s\'applique jamais à toute l\'image.** Le modèle la régénère et ' +
            'réécrit les textes et les logos (mesuré : « STARTUP » → « STUNTLID »). Seule la `zone` ' +
            'demandée est reprise, fondue sur la photo égalisée ; le reste n\'est pas touché. D\'où ' +
            '`zone` OBLIGATOIRE dès que `ia: true`, et **pas de texte dans la zone**. Compter ~30 s.\n\n' +
            'Le recadrage et l\'égalisation sont toujours disponibles. Pour la retouche, ' +
            '`GET /api/capacites` dit si ce service a la clé du modèle d\'image.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' },
            description: 'l\'identifiant rendu par POST /api/uploads' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    recadre: { $ref: '#/components/schemas/Zone' },
                    egalise: { type: 'boolean', default: true,
                      description: 'passe déterministe : niveaux, contraste, couleurs, netteté' },
                    ia: { type: 'boolean', default: false, description: 'exige `zone`' },
                    zone: { $ref: '#/components/schemas/Zone' },
                    prompt: { type: 'string',
                      description: 'ce qu\'on veut changer dans la zone ; s\'ajoute à une consigne de retouche discrète' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'le dépôt dérivé : `id`, `url`, `largeur`, `hauteur`, `passes`, `modele`' },
            400: { description: 'zone absente ou hors cadre, image inconnue' },
            503: { description: 'clé du modèle d\'image absente de ce service' }
          }
        }
      },
      '/api/capacites': {
        get: {
          summary: 'Ce que ce service sait faire ici — aujourd\'hui `photo.ia` (clé du modèle d\'image)',
          responses: { 200: { description: 'les capacités' } }
        }
      },
      '/files/{id}/{nom}': {
        get: {
          summary: 'Un fichier produit (mp4, gif, png)',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'nom', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: { 200: { description: 'le fichier' }, 404: { description: 'absent' } }
        }
      },
      '/healthz': { get: { summary: 'Liveness', responses: { 200: { description: 'ok' } } } }
    }
  };
}
