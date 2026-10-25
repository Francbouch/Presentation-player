# Étapes simultanées dans la Ligne du temps

## Utilisation

1. Sélectionner le calque **Ligne du temps**. Dans l’inspecteur, ouvrir **Étapes simultanées**.
2. Donner un nom au groupe, cocher au moins deux étapes et choisir **Créer un groupe d’étapes simultanées**. Une sélection non contiguë est réunie à la position chronologique de sa première étape ; les autres étapes gardent leur ordre relatif.
3. Pour partir sans contenu existant, **Créer un groupe vide** ouvre une préparation locale sans sauvegarder de groupe invalide. Choisir ensuite deux étapes ou **Créer un groupe avec deux nouvelles étapes**, puis compléter leurs propriétés.
4. Déployer **Groupe parallèle — …** pour renommer le groupe, sélectionner ses branches, ajouter une étape existante ou nouvelle, retirer une branche et réordonner les branches avec ↑/↓.
5. Régler l’espacement, le style (courbes, angles arrondis ou droites), la largeur, la couleur facultative, l’opacité et le rayon. Sans couleur personnalisée, les connexions suivent la couleur principale de la Timeline.
6. **Avancer/Reculer le groupe** déplace toute son unité chronologique. **Dissoudre le groupe — conserver les étapes** restitue une succession normale. Retirer une branche la place après le groupe. La suppression d’une étape reste disponible dans ses propriétés ; un groupe devenu singleton est automatiquement converti sans supprimer l’étape restante.
7. En édition, cliquer sur une connexion ouvre les propriétés de son groupe sans déplacer le calque. Le double-clic habituel permet toujours l’édition interne des étapes ; les propriétés individuelles, les fiches et **Positionner le titre** restent disponibles.

## Tester la lecture

Activer **Révélation progressive**, puis **Centrer automatiquement l’étape active**, dans les réglages existants. Le nombre d’étapes visibles au départ compte désormais les **unités chronologiques** : une étape isolée ou un groupe entier. Sans groupe, rien ne change.

Choisir **Tester les interactions**, puis cliquer dans une zone libre de la scène avant d’utiliser Espace. Chaque appui révèle une unité : toutes les bulles, titres et connexions d’un groupe apparaissent ensemble. Espace conserve son comportement normal lorsqu’un champ ou un bouton de commande possède le focus. En Présentation, la navigation reprend vers la page suivante une fois toutes les unités révélées.

Le groupe est centré sur le milieu de ses bulles réelles, sur les deux axes. Le centrage emploie la même animation configurable et la même reprise depuis la position visuelle courante. Cliquer sur une branche ouvre seulement sa fiche ; le centre du groupe reste stable. Les statuts ne sont jamais changés par la navigation.

### Priorité du zoom

- À l’arrivée sur un groupe par révélation, si le zoom interne est activé, le cadrage cible le groupe. Son agrandissement est limité pour tenir compte de son étendue et ne réduit pas les objets en dessous de leur échelle normale.
- Une interaction individuelle explicitement configurée pour zoomer sur une étape prend la priorité et centre cette bulle. La fiche peut apparaître simultanément.
- **Zoom sur le groupe actif** rétablit le cadrage collectif. **Zoom sur l’étape active** demande un cadrage individuel explicite. **Vue d’ensemble** retire le zoom.
- Sans interaction de zoom individuel, sélectionner une autre branche conserve le centre collectif.

Les fiches positionnées dans la page restent sur leur plan existant : elles ne suivent pas le déplacement des branches. Les titres restent ancrés à leur propre bulle ; l’application d’un décalage à tous les titres inclut les branches.

## Phases, données et sécurité

Une phase et un groupe parallèle sont deux notions distinctes. Un groupe ne peut contenir que des étapes de la même phase, ou toutes sans phase. Les sélections incohérentes produisent un avertissement. Changer la phase d’une branche demande explicitement si tout son groupe doit être réaffecté ; annuler ne modifie rien. Réduire une phase masque ses étapes, y compris les groupes, derrière son résumé existant.

Le format documentaire passe de 33 à **34**. Les anciens projets ne reçoivent aucun groupe ni réglage visuel par défaut. Les champs facultatifs `timeline.parallelGroups` et `timeline.chronology` référencent les identifiants stables des étapes ; ils ne dupliquent ni les étapes ni les médias. La validation rejette les références manquantes, doublons, phases incompatibles et réglages hors limites. Les métadonnées inconnues des objets conservés sont préservées.

Autosauvegarde, IndexedDB, sauvegardes ZIP, duplication, copier/coller et historique utilisent leurs mécanismes existants. Aucun changement de base, de store, de logique CAS, de révision, d’authentification ou de configuration Vercel. Aucune donnée réelle n’est effacée ou réinitialisée, aucun déploiement en production.

Branche : `codex/timeline-parallel-branches`.
Point initial : `safety/timeline-parallel-initial-20261025`, sur `10b66b0`.
Bundle Git complet vérifié : `/workspace/backups/presentation-player-before-parallel-branches.bundle`.
Cette sauvegarde concerne le **code**, pas les présentations privées du navigateur Chrome de l’utilisateur, auxquelles cet environnement n’a pas accès.

## Fichiers

- `src/timelineParallel.js` : unités chronologiques, groupes, validation, mutations sans perte, centre géométrique et tracés.
- `src/milestoneTimeline.js` : ordre, géométrie commune aux trois dispositions, progression et validation intégrée.
- `src/TimelineParallelSettings.jsx`, `src/MilestoneTimelineSettings.jsx` : gestion des groupes et intégration aux commandes d’étapes et de phases.
- `src/TimelineParallelPaths.jsx`, `src/MilestoneTimeline.jsx` : connexions, révélation, progression, navigation, centrage, fiches et zoom.
- `src/MilestoneTimelineThumbnail.jsx`, `src/milestoneTimeline.css` : miniatures et présentation visuelle.
- `src/document.js`, `src/archive.js` : format 34 et compatibilité des versions précédentes.
- `tests/timeline-parallel.spec.js` : tests dédiés ; les assertions de version des tests existants suivent le format 34 sans modifier leurs anciens documents d’entrée.

## Validation et limites

Les tests emploient des présentations synthétiques dans des contextes Chromium isolés, pas les données de l’utilisateur. Les résultats complets sont indiqués dans la pull request.

Les dispositions agrandissent leur espace interne pour les branches ; elles ne rétrécissent pas automatiquement les titres. En zigzag, les branches sont perpendiculaires à la rangée locale et les rangées disposent d’un espace supplémentaire. Les titres longs gardent le recadrage existant : ajuster leur position si nécessaire.

Le cadrage collectif ne garantit pas que des dizaines de branches très espacées tiennent toutes dans la diapositive à une taille lisible : le zoom de groupe ne descend pas sous 100 %. Le défilement, les dimensions du calque et l’espacement permettent d’ajuster la vue. Le composant reste découpé par la page en Présentation ; le débordement de son cadre reste manipulable en édition.

Pas de groupes parallèles imbriqués, ni de calcul de durées réelles ou de dépendances de projet. Pas de déplacement manuel indépendant d’une bulle : la géométrie est partagée. L’espacement s’ajuste dans les propriétés du groupe. La préparation d’un groupe vide n’est pas persistée avant qu’au moins deux étapes soient définies.

La taille des bulles reste le réglage commun existant de la Timeline. Le zoom individuel explicite prend volontairement priorité sur le centre collectif. Les limites de sécurité existantes restent 5 000 étapes par Timeline ; aucune limite supplémentaire de quatre branches n’est introduite.

Seul Chromium est disponible pour la validation automatique ici. Safari, Firefox, les fichiers privés du navigateur de l’utilisateur et les mesures de fluidité sur son ordinateur ne sont pas testables depuis cet environnement.

### Vérifications exécutées avant validation complète

| Phase | Vérifications réellement exécutées | Résultat |
| --- | --- | --- |
| 1 — Modèle et gestion | Création, validation stricte, dissolution sans perte, conversion d’un singleton, conflit de phases ; compilation | Réussies |
| 2 — Rendu | 2, 3 et 4 branches dans chaque disposition ; compilation ; captures Chromium horizontale et verticale inspectées | Réussies |
| 3 — Interactions | `timeline-parallel`, `timeline-titles`, `timeline-centering`, `timeline-completion`, `milestone-timeline` | **61 tests réussis, 2,5 min** |
| 4 — Intégration | Tests supplémentaires de médias, phases, états et visibilité ; groupe vide préparatoire, ajout existant et suppression | **2 tests réussis, 5,7 s** |

Journaux locaux : `/tmp/timeline-parallel-regression.log`, `/tmp/timeline-parallel-integration.log`. La commande finale de production est `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:production` ; son journal est `/tmp/timeline-parallel-full.log`. Son résultat final et celui de GitHub sont rapportés dans la pull request, sans les anticiper ici.
