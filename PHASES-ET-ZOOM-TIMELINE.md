# Phases, zoom et navigation de la Ligne du temps

## Les cinq nouveautés

### 1. Titres des phases

Sélectionner le calque Ligne du temps, ouvrir **Phases**, puis les propriétés de la phase souhaitée.

- **Positionner le titre de la phase …** : la phase est réduite temporairement dans l’aperçu pour montrer sa bulle. Glisser son titre à la souris ; les coordonnées changent en direct sans déplacer la bulle ni le calque.
- Les champs **Décalage X/Y du titre de la phase … (px)** expriment le décalage local du haut du bloc de titre, centré horizontalement, depuis le centre de SA bulle.
- **Appliquer ce positionnement à toutes les phases** copie ponctuellement le même vecteur relatif, sans toucher aux titres des étapes. Chaque phase reste ensuite modifiable séparément.
- **Réinitialiser le titre de la phase …** supprime la surcharge et retrouve la position automatique.
- **Terminer le positionnement du titre de phase** quitte le mode. Les flèches déplacent le titre de 1 pixel local, ou 10 avec Maj. Échap annule un glisser en cours, puis quitte le mode. Chaque glisser validé produit un seul Undo.

Le système est celui des titres d’étapes, étendu aux phases : mêmes mesures, transformations inverses, annulation et historique. Le nom et ses informations associées se déplacent comme un seul bloc. Les coordonnées restent liées au centre de la bulle même après changement de taille.

### 2. Taille des bulles

Dans **Apparence de la ligne du temps** :

- **Taille des points** reste le contrôle existant pour les étapes.
- **Taille des bulles des phases (px)** règle uniquement les phases.

Dans chaque phase, activer **Taille personnalisée de la bulle de phase …** pour surcharger la taille globale. **Réinitialiser la taille de phase …**, ou désactiver cette option, rétablit l’héritage. Plage des phases : 10 à 240 pixels logiques.

La taille individuelle prime sur la globale ; le centre géométrique, les connexions et les étapes voisines ne sont pas déplacés. Lors du premier changement de taille d’étapes dans un ancien projet, l’ancienne taille des phases est conservée explicitement pour les rendre indépendantes.

### 3. Statut manuel

Dans les propriétés de la phase : **Statut de la phase … → À venir / En cours / Terminé**.

La bulle apparaît quand la phase est **réduite**. Son statut réutilise les couleurs de statut personnalisées de la Timeline. Les anciennes phases sans statut enregistré gardent leur couleur antérieure et affichent À venir ; choisir un statut enregistre la nouvelle apparence. Les nouvelles phases commencent à À venir.

Aucun calcul automatique depuis les étapes. Modifier une phase ne change pas ses étapes et inversement. Le statut ne change pas lors de la navigation, ne modifie pas la taille et ne déclenche pas un avancement automatique de la progression. La couleur de phase existante reste disponible notamment pour sa commande de navigation.

### 4. Hauteur après zoom

Dans **Progression, zoom et navigation**, sous le zoom : **Position verticale après zoom** (curseur et valeur 0–100 %).

- 0 % : centre de la bulle sur le bord haut de la diapositive.
- 25 % : quart supérieur, pour dégager de la place sous la bulle.
- 50 % : centre.
- 75 % : quart inférieur.
- 100 % : centre de la bulle sur le bord bas.

Dans **Fiche et interaction de l’étape**, quand le zoom de l’étape est activé, désactiver **Utiliser la position verticale globale du zoom** pour saisir sa position personnalisée. Réactiver l’option retire cette surcharge.

La cible est calculée dans la diapositive, y compris quand le calque est décentré ou tourné : translation et échelle utilisent la même animation. Avec centrage automatique, la durée du déplacement s’applique ; sinon, la durée du zoom interne s’applique. Les courbes Ease In-Out, Ease Out et Linear restent disponibles. Une sélection rapide repart de la matrice visuelle en cours et annule l’ancienne animation. La préférence système de réduction des mouvements est respectée.

La fiche reste sur son plan indépendant de la diapositive : elle ne bouge ni ne grossit avec la Timeline. Le calque garde ses coordonnées enregistrées.

Un zoom individuel explicite applique la hauteur de son étape, même dans un groupe parallèle. La révélation/navigation ou le zoom collectif d’un groupe garde le cadrage collectif existant à mi-hauteur ; le nouveau réglage ne le détourne pas.

Compatibilité : un ancien projet sans nouvelle propriété conserve son ancien cadrage lorsque le centrage automatique est désactivé. Renseigner la nouvelle position globale ou une surcharge d’étape active le nouveau cadrage individuel coordonné. Les nouvelles Timelines portent explicitement la valeur globale 50 %.

### 5. Boutons de navigation des phases

Ouvrir **Phases — Général** :

- **Afficher les boutons de navigation des phases** masque ou montre les commandes, sans supprimer les phases ni leurs bulles.
- **Positionner les boutons de phases** montre une poignée de déplacement dans la page. Les boutons cachés sont montrés temporairement pendant cette édition.
- Glisser la poignée **Déplacer les boutons de phases**. Le groupe reste ordonné et les actions de navigation sont désactivées pendant le geste.
- **Position X/Y des boutons de phases (%)** règle leur ancrage haut-gauche par rapport à la diapositive.
- **Terminer le positionnement des boutons de phases** quitte le mode.
- **Réinitialiser la position des boutons de phases** retrouve exactement le placement automatique existant, dans le cadre ou déporté pour une Timeline hors page.

Les commandes personnalisées restent fixes dans la page pendant le défilement, le centrage, le zoom, en Test et en Présentation/plein écran. Il ne s’agit pas de nouveaux calques. Les boutons et leurs actions restent ceux du composant existant ; les noms longs et les nombreuses phases utilisent un défilement horizontal. Un glisser est une seule action Undo ; Échap annule un geste en cours, puis quitte le positionnement. Les flèches déplacent le groupe en pixels logiques de page (Maj = 10).

Depuis le format 37, masquer les boutons libère l’espace réservé au bandeau dans le cadre. Les coordonnées propres aux bulles et les données des phases restent intactes. Le groupe personnalisé conserve son positionnement indépendant dans la page.

## Données et sécurité

Format documentaire **35**. Nouvelles propriétés facultatives :

- `phase.titleOffset`, `phase.dotSize`, `phase.status` ;
- `timeline.design.phaseDotSize`, `zoomVerticalPosition`, `phaseNavigationVisible`, `phaseNavigationPosition` ;
- `step.zoomVerticalPosition` facultatif, prioritaire sur le réglage global.

Les anciennes données gardent leurs champs et métadonnées. Les réglages invalides sont rejetés avant restauration. Les chemins existants d’autosauvegarde, IndexedDB, ZIP, duplication, copier/coller et Undo/Redo sont réutilisés ; aucune nouvelle base, aucun cloud, aucune dépendance ajoutée.

État initial Git propre, sur `6836b31` (fusion de la PR 41). Branche : `codex/timeline-phase-controls`. Point initial : `safety/timeline-phase-controls-initial-20261026`. Bundle Git complet créé et vérifié : `/workspace/backups/presentation-player-before-phase-controls.bundle`, résultat dans `/tmp/phase-controls-backup.log`.

Cette sauvegarde couvre le **code**, pas les présentations privées de Chrome, auxquelles cet environnement n’a pas accès. Avant d’adopter une nouvelle version, conserver un ZIP depuis **Fichier → Sauvegarder mon projet**. Aucune donnée n’a été effacée ou réinitialisée ; aucune fusion ni publication en production n’est effectuée ici.

## Fichiers modifiés

- `src/timelinePhases.js` : validation des options, tailles/statuts, cibles et coordonnées de navigation.
- `src/timelineTitlePosition.js`, `src/TimelineTitleSettings.jsx`, `src/MilestoneTimeline.jsx` : réutilisation du positionnement des titres, édition de phase et cadrage animé.
- `src/TimelinePhaseSettings.jsx`, `src/TimelinePhaseNavigationSettings.jsx`, `src/TimelineZoomPosition.jsx` : nouveaux contrôles de propriétés.
- `src/TimelinePhaseControls.jsx` : groupe de commandes sur le plan de page, gestes, annulation et clavier.
- `src/MilestoneTimelineSettings.jsx`, `src/MilestoneTimelineInteractions.jsx`, `src/MilestoneTimelineAnimationSettings.jsx` : intégration dans les panneaux existants.
- `src/milestoneTimeline.js`, `src/MilestoneTimelineThumbnail.jsx`, `src/milestoneTimeline.css`, `src/InteractiveButtons.jsx` : rendu, tailles, statuts, progression indépendante et protection contre le déplacement accidentel du calque.
- `src/document.js`, `src/archive.js` : version 35 et conservation des versions précédentes.
- `tests/timeline-phases.spec.js` : 12 tests composites dédiés ; les assertions de version des autres tests suivent le format 35 sans convertir les anciens documents d’entrée.

## Validation réelle et limites

Compilation réussie. Premier lot dédié : **10 tests réussis (27,8 s)**. Régression initiale : **75 réussis et 1 échec de test** (le test attendait de pouvoir cliquer normalement sur une commande intentionnellement désactivée) ; le contrôle a été corrigé pour vérifier explicitement la désactivation et l’absence d’action. Lot dédié final : **12 tests réussis (34,2 s)**, couvrant les cinq fonctions, l’annulation, le plein écran, les positions 0/25/50/75/100 %, les trois dispositions, la rotation, les branches parallèles, la reprise d’animation, le rechargement et un vrai ZIP dans un autre contexte navigateur.

Journaux : `/tmp/timeline-phases-build.log`, `/tmp/timeline-phases-regression.log`, `/tmp/timeline-phases-final-targeted.log`. La validation complète de production est lancée séparément ; son résultat final est consigné dans la pull request et `/tmp/timeline-phases-full.log`, sans l’anticiper dans ce document.

Limites :

- Les bulles de phases sont les résumés des phases réduites, pas de nouvelles bulles permanentes pour les phases déployées.
- Le bloc de titre entier est déplacé, pas chacune de ses lignes séparément.
- 0 et 100 % placent le **centre** de la bulle sur un bord : une partie de la bulle peut donc être découpée par la page. Même principe pour des commandes placées sur les bords ; les champs et la réinitialisation restent accessibles dans l’inspecteur.
- Les positions personnalisées des boutons sont des coordonnées de page ; leur position automatique antérieure est conservée tant qu’on ne la personnalise pas.
- Chromium est testé ici. Safari, Firefox, les projets privés de l’utilisateur et les performances de son ordinateur ne sont pas accessibles depuis cet environnement.
