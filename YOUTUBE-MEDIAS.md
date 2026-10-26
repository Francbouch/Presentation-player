# Calques Vidéo YouTube

## Utilisation

1. Dans la barre des outils, ouvrir **Média** (icône ▶), puis **Vidéo YouTube**.
2. Coller le lien dans **URL YouTube**, puis **Appliquer l’URL YouTube** (ou Entrée).
3. Le cadre affiche une miniature. Cliquer/glisser pour sélectionner et déplacer ;
   utiliser les poignées ou **Position et dimensions** pour le redimensionner.
4. Cocher **Interagir avec la vidéo** pour utiliser le lecteur officiel dans
   l’éditeur. **Revenir à la manipulation du calque** reste disponible au-dessus
   du lecteur et dans les propriétés. Échap quitte également ce mode quand le
   focus est dans les commandes de studio ; depuis une iframe, utiliser le bouton.
5. En **Test** et **Présentation**, les commandes YouTube sont directement
   accessibles : lecture, pause, progression, volume, sourdine, réglages,
   sous-titres disponibles et plein écran natif.

Le lien **Ouvrir sur YouTube** permet de consulter une vidéo que YouTube interdit
à l’intégration. **Remplacer la vidéo YouTube** sélectionne le champ URL sans
modifier la géométrie ou supprimer les autres réglages.

## Réglages

- Commandes visibles, lecture automatique, sourdine initiale, boucle.
- Pause lors du départ, retour au début ou au temps mémorisé pendant la lecture
  courante. Le temps courant et le volume manipulé dans le lecteur ne sont pas
  écrits dans le projet. Après actualisation, le temps de début configuré s’applique.
- Début et fin facultative en secondes, jusqu’à 86 400 ; une fin doit suivre le
  début. Les liens avec `t=1m30s` ou `start=90` initialisent également le début.
- Proportions 16:9 verrouillables ; le lecteur reste toujours en 16:9, avec des
  marges si le cadre a un autre format. Les dimensions, la rotation, l’ordre,
  l’opacité, la visibilité, les dossiers et le verrouillage sont ceux des calques
  existants. Agrandir les très petits cadres pour rendre les commandes lisibles.

L’autoplay est une tentative conforme aux règles du navigateur. Aucun déblocage
forcé du son : un refus propose un démarrage manuel. La boucle, les recherches
temporelles et l’arrêt à la fin configurée utilisent les commandes officielles
YouTube, sans modifier ni télécharger la vidéo. La fin est fournie au lecteur et
surveillée lorsqu’une fin personnalisée est définie.

Les pages quittées sont démontées : leurs lecteurs sont toujours arrêtés puis
libérés. Décocher la pause ne crée pas de lecture permanente en arrière-plan ;
la pause intervient au plus tard au démontage et peut aussi être imposée lorsque
les interactions sont bloquées par une autre vidéo. Les calques masqués par un
état ou un groupe sont également libérés.

## Chargement et transitions

En manipulation, les miniatures viennent du domaine officiel `i.ytimg.com` ;
les miniatures de la timeline de diapositives et de la bibliothèque de composants
restent des représentations locales sans lecteur réseau.

Les lecteurs sont créés uniquement pour la page active, proche du canevas visible,
ou pour une interaction explicitement demandée en édition. L’API est partagée
entre les lecteurs d’une même fenêtre. Les pages préparées en arrière-plan
restent des miniatures jusqu’à leur activation : elles ne jouent pas prématurément.

Une vidéo YouTube ne sert pas de transition MP4. Les transitions existantes sont
conservées. Une iframe externe ne peut pas être capturée comme un MP4 local :
l’instantané temporaire d’une page quittée représente le lecteur par sa miniature,
sans cloner ni relancer l’iframe. Ce remplacement peut être visible pendant le
fondu de la page source ; aucune capture de la vidéo YouTube n’est tentée.

Le plein écran natif YouTube est géré par le navigateur. Les calques studio ne
peuvent pas être superposés à ce plein écran externe. Revenir au plein écran de
la présentation pour retrouver toutes les superpositions de studio.

## Internet, restrictions et confidentialité

Une connexion Internet est nécessaire. Les vidéos privées, supprimées, limitées
par âge ou territoire, ou interdisant l’intégration peuvent rester inaccessibles.
Les blocages, erreurs et délais d’attente affichent un message et un lien externe,
sans immobiliser la navigation studio. Aucun compte Google ni clé API n’est
requis par studio ; les éventuelles conditions YouTube restent applicables.

Le lecteur officiel et sa miniature contactent les services YouTube/Google.
Aucune vidéo n’est téléchargée par studio ou ajoutée à IndexedDB/au ZIP. Les
médias locaux privés ne sont pas envoyés à YouTube. L’éditeur utilise le domaine
d’intégration `youtube-nocookie.com` et n’ajoute aucune télémétrie propre.

Les fichiers HTML ouverts directement en `file://`, les politiques de navigateur,
les bloqueurs ou l’absence de référence d’origine peuvent empêcher YouTube de
fonctionner. Utiliser l’adresse HTTPS habituelle de studio ; l’export ZIP conserve
les liens mais ne rend pas les vidéos disponibles hors ligne.

## Sécurité et données

- Modèle `type: 'youtube'`, configuration `layer.youtube`, format de document **38**.
- Domaines/protocoles/identifiants validés. Liens watch, youtu.be, embed, shorts,
  live et liens d’intégration officiels acceptés ; un identifiant valide est
  enregistré avec l’URL canonique HTTPS. Aucune URL arbitraire ne devient une iframe.
- URL d’intégration construite uniquement sur `www.youtube-nocookie.com`.
- Script API limité à `www.youtube.com`, images à `i.ytimg.com`, connexion au
  lecteur sur les deux domaines YouTube nécessaires. Pas de joker ni d’unsafe-eval.
- La politique `no-referrer` générale reste intacte. Seule l’iframe utilise
  `strict-origin-when-cross-origin` et fournit l’origine au lecteur officiel,
  nécessaires à l’identification de l’intégration (notamment erreur YouTube 153).
- Les permissions du lecteur sont limitées à autoplay, médias protégés, plein
  écran et image dans l’image. Caméra/micro/géolocalisation restent interdits.
- IndexedDB, révisions concurrentes, restauration ZIP atomique et sauvegarde
  précédente restent les mécanismes existants. Les versions 1–37 restent acceptées.
  Métadonnées, identifiants, liens, options, historique et géométrie sont conservés.

Avant modification : dépôt propre, branche `codex/youtube-media-layers` depuis
`9ac5600`, tag `safety/youtube-initial-20261026`, bundle Git complet vérifié dans
`/workspace/backups/presentation-player-before-youtube.bundle`. Cette sauvegarde
concerne le code, **pas** les présentations privées du Chrome de l’utilisateur.
Aucune réinitialisation de données et aucun déploiement de production demandé.

## Fichiers principaux et validation

- `youtubeModel.js` : modèle, validation, URL, proportions et isolation clavier.
- `youtubeAPI.js` : chargement unique officiel et erreurs.
- `YouTubeSurface.jsx`, `YouTubeSettings.jsx` : lecteur, cache de session et propriétés.
- `document.js`, `archive.js` : format 38 et compatibilité additive.
- `App.jsx`, `Editor.jsx`, `LayerSettings.jsx`, `InteractiveButtons.jsx`,
  `SlideView.jsx`, `Player.jsx` : intégration aux calques, pages et raccourcis.
- `FrozenPageView.jsx`, `VisualAnimation.jsx`, `TimelineThumbnail.jsx` : transitions
  et miniatures sans lecteurs dupliqués ni dépendance réseau bloquant les pages.
- `layers.css`, `vercel.json` : interface et autorisations de contenu ciblées.
- `tests/youtube.spec.js` et assertions de version des tests existants.

Les tests automatisés injectent une simulation de l’API officielle et une iframe
réellement située sur un autre domaine. Ils vérifient les commandes transmises,
le focus, le plein écran, les erreurs, les transitions, le cycle de vie, les
proportions, l’historique et un vrai export/import ZIP. **Ils ne prouvent pas la
lecture réelle d’un flux YouTube ni le rendu des sous-titres du fournisseur.**

L’accès direct au script officiel et au domaine d’intégration a été tenté dans
cet environnement et refusé par son proxy réseau (HTTP 403, y compris lors d’une
vérification hors sandbox). La lecture réelle, le volume sonore et les réglages
natifs du fournisseur devront donc être vérifiés depuis Chrome sur l’adresse
HTTPS de studio. Les résultats exacts de compilation et de régression sont
rapportés dans la pull request. Navigateurs autres que Chromium : non exécutés.
