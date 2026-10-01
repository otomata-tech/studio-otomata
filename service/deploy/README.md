# Déployer le studio

Cible retenue : **otomata-0** (`51.15.225.121`). Chrome 149 (`/usr/bin/google-chrome`) et
ffmpeg **y sont déjà installés**. Le service n'a **aucune dépendance npm** (Node natif seul) :
pas de `npm install`, pas de build, pas de `node_modules`. Déployer = mettre le dépôt à jour
et redémarrer.

## Ce que l'atelier photo exige EN PLUS

`POST /api/uploads/{id}/derivees` — recadrer, égaliser, retoucher une zone — **ne pose
aucune dépendance système** : tout le travail d'image se fait dans le Chrome déjà installé
pour les rendus, et les formules sont dans `service/photo-ops.js`. Rien à installer.

La seule condition est la clé du modèle d'image, et seulement pour la retouche :

| condition | pourquoi |
|---|---|
| `GEMINI_API_KEY` dans l'environnement du service | la seule passe IA. Sans elle, `GET /api/capacites` rend `{"photo":{"ia":false}}`, l'IHM masque la retouche, et l'API répond **503** avec le motif — le recadrage et l'égalisation continuent de marcher. La clé se pose en `EnvironmentFile=` root-only sur la box, **jamais dans l'unité versionnée ni dans le code**. |

**Mesuré SUR LA BOX le 15/09/2026**, photo de 2400×3000 :

| | durée | pointe du cgroup (plafond 1400 Mo) |
|---|---|---|
| recadrage + égalisation, Chrome froid | 6,1 s | 709 Mo |
| égalisation, Chrome déjà chaud | 2,5 s | — |
| retouche IA sur une zone | 27,2 s | **891 Mo** |

La retouche est le cas lourd : la page tient à la fois la photo égalisée et l'image rendue
par le modèle. 891 Mo laisse 36 % de marge, mais c'est le chiffre à surveiller si un jour on
traite plus grand — et la raison pour laquelle le masque flou tourne en fenêtre glissante
plutôt qu'en tampons pleins. Une passe emprunte la **même file** que les rendus, jamais en
parallèle : la pointe du service reste `max(rendu, photo)`, pas leur somme.

## Port

**8100** — libre sur otomata-0 au 02/09/2026 (vérifié : `ss -tlnp`). L'inscrire dans
`/opt/ports.conf` **avant** de démarrer, et répercuter dans `/data/infra/PORTS.md`
(le fichier du serveur est la source de vérité, le repo en est le miroir).

## Étapes

```bash
# 1. le code
git clone git@github.com:otomata-tech/studio-otomata.git /opt/oto-studio

# 2. l'unité
scp service/deploy/oto-studio.service otomata-0:/tmp/
ssh otomata-0 'sudo cp /tmp/oto-studio.service /etc/systemd/system/ && sudo systemctl daemon-reload'

# 3. démarrage + vérification des plafonds mémoire (ils ne sont PAS optionnels)
ssh otomata-0 'sudo systemctl enable --now oto-studio && \
  systemctl show oto-studio -p MemoryMax -p MemoryHigh -p MemorySwapMax && \
  curl -s localhost:8100/healthz'

# 4. Cloudflare Access AVANT le DNS (l'ordre compte : voir plus bas)
# 5. le vhost : recopier service/deploy/caddy-studio.snippet dans /data/infra/Caddyfile,
#    puis scp + caddy validate + systemctl reload caddy (procédure en tête de ce fichier)
# 6. le record DNS studio.oto.zone (proxied) — EN DERNIER
```

## Déploiement continu : la box tire, personne ne pousse

```bash
# une fois, sur otomata-0
ssh otomata-0 'cp /opt/oto-studio/service/deploy/oto-studio-update.{service,timer} /etc/systemd/system/ && \
  systemctl daemon-reload && systemctl enable --now oto-studio-update.timer && \
  systemctl list-timers oto-studio-update --no-pager'
```

Toutes les deux minutes, `update.sh` compare `HEAD` à `origin/main` ; s'ils diffèrent, il fait
un `merge --ff-only`, redémarre le service et **attend `/healthz`** avant de se déclarer bon
(sinon il crie dans le journal). Sans changement, il sort en une fraction de seconde.

**Pourquoi tirer plutôt que pousser.** Le port 22 est fermé depuis le 2026-07-04 et l'accès
passe par un tunnel Cloudflare qui exige une authentification navigateur. Un workflow GitHub
devrait donc détenir un **service token Access** — un secret entrant, à faire tourner, qui ouvre
un shell root sur la box. Un `git fetch` sortant ne demande rien à personne et n'ouvre rien.
C'est aussi ce qui évite la panne vécue le 2026-09-03 : le jeton Access du poste avait expiré,
plus de SSH, donc plus de déploiement possible — alors que la box, elle, pouvait très bien aller
chercher toute seule.

⚠️ `--ff-only` est délibéré : si quelqu'un a édité le checkout à la main, la mise à jour
**s'arrête** au lieu d'écraser. Le journal (`journalctl -u oto-studio-update`) le dit.

⚠️ **Retour arrière automatique.** Si `/healthz` reste muet 40 s après le redémarrage, le script
**repose le commit précédent** et redémarre. Sans ça, un commit qui casse le démarrage laisse le
studio par terre et le minuteur retente le même commit toutes les deux minutes, sans alerte
(remarque d'infra le 2026-09-03, motif repris de `/data/infra/scripts/auth-mailer/deploy.sh`).
Codes de sortie : `0` déployé ou rien à faire, `1` échec puis retour arrière réussi — le dépôt
reste en avance et le passage suivant retentera, donc **c'est le dépôt qu'il faut corriger** —,
`2` ni la nouvelle ni l'ancienne version ne répondent, intervention nécessaire.

⚠️ Conséquence à assumer : **tout push sur `main` part en ligne dans les deux minutes.** C'est
le régime « main = preprod » du reste de la plateforme, appliqué à un outil interne.

## L'ordre n'est pas négociable

Le service **n'a aucune authentification**. Tant que la politique Cloudflare Access n'est
pas posée, le nom `studio.oto.zone` ne doit pas résoudre : créer le DNS d'abord, c'est
publier un pilote de rendu ouvert. C'est la règle déjà écrite pour `mucho.oto.zone`, pour
exactement la même raison.

### La politique Access, concrètement

Dans Zero Trust → Access → Applications, une application **self-hosted** :

| champ | valeur |
|---|---|
| domaine | `studio.oto.zone` (chemin vide : toute l'app, IHM **et** API) |
| politique | *Allow* sur `Emails` → les comptes d'Otomata qui doivent produire des visuels |
| durée de session | 24 h suffit (l'IHM ne garde aucun état côté navigateur) |

⚠️ **Access ne sert PAS aux agents, et ne le peut pas** (tranché le 02/09/2026). Il exige
deux en-têtes ; le connecteur `http` d'oto n'en pose qu'un (`providers/http.py` : le mode
`header` a un seul couple `header_name`/`token`). Un jeton de service ne changerait rien à
ça. Les agents passent donc par le **réseau privé** (`http://172.16.16.3:8100`), pas par ce
vhost — cf. `service/README.md`. Ne pas ouvrir l'API en anonyme pour « faire marcher »
un chemin qui n'a pas lieu d'être.

## État

**Posé le 2026-09-02 sur otomata-0** : checkout `/opt/oto-studio`, unité active et activée
au démarrage, port **8100** inscrit dans `/opt/ports.conf`, vhost `studio.oto.zone` fermé
par Cloudflare Access, connecteur `http` d'org (`org:2:http:studio`) sur l'adresse privée.

Mesures réelles sur la box (à jour du passage des images intermédiaires en JPEG) :

| rendu | durée | cgroup |
|---|---|---|
| carte, PNG + MP4 (121 images, 1080²) | **43 s** | 406 Mo |
| affiche, MP4 (300 images, 1200×1500) | **2 min 21 s** (avant : 4 min 39 s) | 336 Mo |

`memory.events` **tout à zéro** dans les deux cas — ni plafond touché, ni swap, ni kill.
⚠️ Une affiche animée demande donc plus de deux minutes : c'est un travail de fond, l'IHM
et l'API le disent (`status` = `en_cours`), personne n'attend devant une requête bloquée.

## Ce que le service coûte à la box

| | |
|---|---|
| au repos | un Node (~40 Mo). Chrome est **rendu après 10 min** sans rendu (`STUDIO_CHROME_IDLE_MS`) |
| en rendu | **336 à 406 Mo** de cgroup mesurés SUR LA BOX, **un seul rendu à la fois** (file interne, pas une convention). ⚠️ Le « ~900 Mo » annoncé au départ était le RSS d'un process sur un poste à 28 cœurs — Chrome y ouvre bien plus de renderers ; il ne valait pas pour cette machine |
| plafond | `MemoryMax=1400M` — au-delà le rendu est tué, la box ne bouge pas |
| disque | les travaux sont purgés au-delà des **60** plus récents (`STUDIO_KEEP`) |

⚠️ **Ce que les plafonds ne couvrent pas** : ils bornent ce service, pas la somme. Les deux
gels de cette box (30/06, 06/08) sont des accidents de **concurrence** — un build de
déploiement peut prendre 2 Go dans `user.slice` pendant qu'un rendu tourne. Si les rendus
deviennent fréquents, poser un verrou partagé avec `/opt/deploy/*.sh`, ou déplacer le
service sur oto-platform.

## Journal

`journalctl -u oto-studio -f`. Les échecs de rendu sont aussi **visibles dans l'IHM**
(galerie, état `échoué` avec son message) : c'est le premier endroit où regarder.
