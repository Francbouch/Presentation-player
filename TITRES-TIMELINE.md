# Positionnement libre des titres Timeline

## Dans studio.

1. Sélectionner le calque **Ligne du temps**, puis une étape dans **Étapes**.
2. Ouvrir **Position du titre** et cliquer sur **Positionner le titre**.
3. Faire glisser le bloc de titre encadré. Les valeurs X/Y de l’inspecteur et du bandeau sont mises à jour pendant le déplacement. La position est sauvegardée au relâchement de la souris.
4. Utiliser les flèches pour un réglage de **1 pixel local**, ou **Maj + flèches** pour **10 pixels locaux**.
5. Cliquer sur **Appliquer ce positionnement à tous les titres** pour copier les deux décalages à toutes les étapes de cette Timeline.
6. Cliquer sur **Terminer le positionnement du titre**, ou appuyer sur Échap.

Échap pendant un glisser l’annule ; un second Échap quitte le mode. Les titres peuvent aussi être sélectionnés directement pendant ce mode. Le composant ne se déplace pas et les interactions de présentation sont suspendues. Son déplacement normal redevient disponible en quittant ce mode.

Les champs **Décalage horizontal X du titre (px)** et **Décalage vertical Y du titre (px)** permettent une saisie précise. **Réinitialiser la position du titre** supprime la personnalisation de cette étape et rétablit son placement automatique.

L’application globale est une action explicite, réversible en **une seule opération Undo**. Chaque titre peut ensuite être retouché indépendamment. Les autres Timelines de la page ne sont pas modifiées.

## Repère local

Le décalage est relatif au **centre de la bulle**, dans les coordonnées locales de la Timeline, exprimées sur la base logique 1920 × 1080 de studio.

- X positif : vers la droite locale.
- Y positif : vers le bas local.
- Le point d’ancrage du bloc de titre est son **haut, au centre horizontal**.

Exemple : `{x:20,y:60}` place cet ancrage à 20 pixels à droite et 60 pixels sous le centre de chaque bulle. Appliquer ces valeurs à toutes les étapes **ne copie pas une position absolue de page** : chaque titre reste attaché à sa propre bulle.

Le bloc comprend le nom et les informations déjà affichées sous ce nom (date, description et statut), afin de conserver leur organisation et leur style. Les limites de lignes existantes sont conservées.

Le calcul de déplacement inverse la rotation du calque et tient compte du zoom du canevas ainsi que du zoom interne de la Timeline. Le titre reste un enfant de la bulle dans le canevas animé : centrage, zoom, révélation et déplacement utilisent la transformation existante, sans animation parallèle contradictoire.

La position personnalisée ne dépend pas de la taille de la bulle ni de la disposition horizontale, verticale ou zigzag. Elle est conservée lors du changement de disposition, du grossissement des points et des changements de phase. Un repère léger relie la bulle à l’ancrage du titre personnalisé pendant son édition.

## Compatibilité et sécurité

- Branche : `codex/timeline-title-position`.
- Base propre : `origin/main` **f777f9e**, comprenant la PR 39 et ses fonctions récentes.
- Point initial : `safety/timeline-title-position-initial-20261025`.
- Archive Git complète vérifiée : `/workspace/backups/presentation-player-before-timeline-titles.bundle` ; vérification `/tmp/timeline-title-backup.log`.

Cette archive protège le **code uniquement**. Aucun accès aux projets IndexedDB du Chrome personnel de l’utilisateur, aucune sauvegarde de ces données prétendue, aucune suppression ni réinitialisation de stockage.

Format **33**, propriété facultative `timeline.steps[].titleOffset = {x,y}`. Aucun décalage n’est créé à l’ouverture du mode ni ajouté automatiquement aux anciens projets. La migration conserve les étapes, phases, styles, métadonnées et médias, sans les réinitialiser. Les valeurs présentes sont validées avant lecture ou import. Le retour au mode automatique retire uniquement le décalage personnalisé.

IndexedDB, sauvegarde automatique, historique, duplication, copier/coller, composants liés et ZIP réutilisent leurs mécanismes existants. Les décalages restent dans la configuration JSON ; aucun nouveau fichier média ou service ajouté. GitHub/Vercel et l’authentification restent inchangés ; aucun déploiement en production effectué.

## Fichiers modifiés

- `src/timelineTitlePosition.js` : modèle, validation, coordonnées, application ciblée/globale et lecture du placement automatique.
- `src/TimelineStepTitle.jsx` : rendu, déplacement local, capture du pointeur, annulation, flèches et repère.
- `src/TimelineTitleSettings.jsx` : commandes, valeurs en direct et barre de mode.
- `src/MilestoneTimeline.jsx` : intégration du mode, sélection, phases, focus, défilement et interaction avec les fiches.
- `src/MilestoneTimelineSettings.jsx` : propriétés de l’étape.
- `src/MilestoneTimelineThumbnail.jsx` : décalages personnalisés dans le dessin des miniatures.
- `src/milestoneTimeline.js` : validation des décalages facultatifs.
- `src/milestoneTimeline.css` : styles de positionnement et bandeau.
- `src/InteractiveButtons.jsx` : empêcher la manipulation du calque pendant le positionnement de ses titres.
- `src/document.js`, `src/archive.js` : format 33, acceptation et migration des anciens formats.
- `tests/timeline-titles.spec.js` : onze scénarios dédiés.
- Assertions du numéro de version courant dans les tests existants : `actions`, `background-model`, `button-appearance`, `button-shapes`, `buttons`, `editor-shortcuts`, `effects`, `fonts`, `layers`, `library-crop`, `media-frames`, `milestone-timeline`, `state-visibility`, `text`, `timeline-centering`, `timeline-completion`, `timeline`, `vector-lines`, `video-extra` (fichiers `.spec.js`). Les entrées d’anciens formats restent anciennes pour vérifier leur compatibilité.

## Tests exécutés

Compilation de production réussie et **11 tests dédiés réussis (20,9 secondes)** : `/tmp/timeline-titles-final-check.log`.

Ces tests vérifient :

- Mode sans modification automatique du document, glisser et valeurs en direct, bulles et calque immobiles.
- Flèches, retour au déplacement normal du composant, annulation de glisser et sortie par Échap.
- Application à tous par décalages relatifs, Undo/Redo en une opération, individualisation et réinitialisation.
- Rotation à 30° et zoom du canevas à 25 %, 50 % et 100 %, avec mesure du déplacement à l’écran.
- Trois dispositions, phases et points agrandis.
- Centrage animé, mesure de l’attachement du titre pendant l’animation, zoom à 180 %, révélation, fiche et plein écran.
- Rechargement, copie entre diapositives, véritable export/import ZIP dans un autre contexte de navigateur, ancien ZIP v32 et métadonnées conservées.
- Isolation de deux Timelines, validation des valeurs et migration additive.
- Placement au-dessus, phase réduite puis ouverte temporairement pour l’édition, absence de saut initial et précision avec zoom interne.

La validation complète est exécutée avec :

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:production
```

Rapport complet : `/tmp/timeline-titles-full.log`. Le résultat final de cette suite et des contrôles GitHub figure dans la pull request et la réponse de livraison.

## Limites

- Le déplacement concerne le bloc de titre existant, pas chaque ligne de métadonnées séparément. Il ne crée aucun calque.
- Les règles existantes de recadrage de la Timeline et de la diapositive restent applicables : pour un titre très éloigné de sa bulle, agrandir le cadre ou utiliser les outils de zoom/déplacement existants.
- Bornes de protection : X ±38 400 et Y ±21 600 pixels locaux, afin de refuser les valeurs infinies ou corrompues.
- La barre de mode est dans le plan de la diapositive ; si elle est hors champ à fort zoom, l’inspecteur conserve les commandes et Échap reste disponible.
- Tests automatisés sous Chromium avec projets isolés ; Safari et Firefox et les données privées de l’utilisateur n’ont pas été testés. Aucune garantie de FPS pour des milliers d’étapes.
- L’avertissement Vite existant sur la taille du bundle demeure. Aucune nouvelle dépendance ajoutée.
