# États visuels et groupes de visibilité

## Mode d’emploi

1. Ouvrez **États** dans la barre supérieure (ou l’icône États à gauche). La grille représente les états de la diapositive active. Les badges distinguent l’état initial, la sélection pour modification et l’état actif en lecture.
2. Cliquez sur une carte pour modifier ses propriétés à droite. Les miniatures se recalculent à partir du rendu commun de la présentation : fonds, calques, boutons, textes, formes et cadrages. Les vidéos ont un aperçu fixe de leur première image ; elles ne jouent pas dans les cartes.
3. Les propriétés réutilisent les contrôles existants : nom, fond/variante/image de bibliothèque, visibilité de chaque calque, bouton actif, duplication, suppression, état initial et transitions par défaut/spécifiques. Le menu de chaque carte donne accès aux opérations usuelles. La suppression avertit si des boutons ou passages utilisent l’état. Les boutons concernés restent présents et leur destination absente est signalée.
4. **Comparer les états** permet de choisir deux états (ou la configuration de la page), avec vues côte à côte et liste des différences effectives de fond, visibilité, bouton actif et groupes. La comparaison ne modifie rien.
5. Double-cliquez une carte pour l’ouvrir immédiatement dans le canevas en **mode Test**, sans exécuter d’action de bouton. Les commandes de prévisualisation des passages conservent les animations configurées et leur état de départ. Revenez à « Positionner les boutons » pour manipuler les objets.
6. Dans **États → Groupes de visibilité**, créez un groupe, nommez-le et cochez ses calques/boutons. Choisissez sa visibilité de départ. Un calque appartient au maximum à un groupe de visibilité pour éviter des règles contradictoires ; les dossiers et groupes de transformation restent indépendants.
7. Sélectionnez un bouton dans l’éditeur : **Actions → Type d’action → Afficher / masquer des groupes**. Pour chaque groupe, choisissez « Ne pas modifier », « Afficher », « Masquer » ou « Basculer ». Une même action peut afficher Matériaux et masquer Motorisation et Accessoires.
8. Pour adapter les groupes à un état, sélectionnez sa carte et utilisez **Groupes au départ de cet état**. Les actions modifient cette configuration seulement pendant la lecture. Un changement d’état, y compris après une vidéo, rétablit les valeurs du nouvel état. Les actions de groupes conservent l’état actif et sa sélection de boutons.

Le menu de carte permet aussi de réordonner les états. La recherche ne supprime aucun état. « Sans action entrante connue » est informatif : un état peut être utilisé autrement, notamment comme état initial ou par prévisualisation.

## Règles de visibilité

Les couches de calcul sont distinctes du document :

- La visibilité de base et les réglages/actions historiques restent inchangés.
- Pour un membre d’un nouveau groupe, la configuration runtime du groupe prime sur la visibilité de base ou d’état du membre.
- Une future surcharge animée peut être appliquée par la fonction de calcul commune, sans écraser les réglages enregistrés. Aucune timeline/keyframe n’est développée ici.
- Un dossier masqué reste prioritaire sur tous ses descendants, y compris les cadres vidéo. Les commandes de groupe ne déverrouillent pas les objets ou dossiers.
- Les éléments cachés ne sont pas cliquables ; les vidéos intégrées cachées sont mises en pause par le contrôleur existant. Les nouvelles commandes de groupes sont ignorées pendant une transition visuelle en cours pour éviter qu’une ancienne configuration de transition les écrase.

Les anciens projets ne possédant aucun groupe gardent leurs règles historiques. Aucun état existant n’est converti ou supprimé automatiquement. Les nouveaux groupes ne sont pas des groupes de sélection visuelle de boutons ni des groupes géométriques.

## Sauvegardes et références

Schéma 22, compatible avec les versions 1 à 21. Champs facultatifs : `page.visibilityGroups`, `state.groupVisibility`, action `visibilityGroups.operations`. Identifiants stables, références remappées lors de la duplication d’une page, médias réutilisés. IndexedDB conserve ses noms de base et de magasins. Les ZIP incluent ces paramètres et les valident avant toute restauration. Les cibles de groupe supprimées restent diagnostiquables ; une commande comportant une cible absente n’applique aucune opération partielle.

Une copie de bouton vers une autre page ne crée pas de groupes portant arbitrairement le même nom. Une cible absente est signalée et doit être reconfigurée.

État Git initial propre sur `91ce459`, branche `codex/visual-states-visibility`. Sauvegarde : tag `safety/visual-states-initial-20261022` et bundle `/workspace/backups/presentation-player-before-visual-states.bundle`, vérifiés par restauration dans un dépôt nu temporaire et `git fsck --full`. Points intermédiaires par phase, sans fusion ni déploiement de production.

**Les données IndexedDB de votre Chrome sont inaccessibles ici. Aucun ZIP de votre présentation personnelle n’a été créé. Exportez-la depuis Fichier → Sauvegarder mon projet avant la mise à jour. La sauvegarde Git protège uniquement le code.**

## Validation et limites

Phase 1 : compilation et 15 tests ciblés réussis. Phase 2 : compilation et 9 tests des groupes/états/vidéos réussis sur la version finale de cette phase ; 11 tests des groupes et composants également exécutés avec succès pendant son développement. Les nouveaux tests vérifient les miniatures différentes, sélection, duplication, recherche, comparaison, groupes exclusifs par appartenance, bascule sans changement d’état, configurations initiales par état, trois groupes dans une action, dossier masqué, cadre vidéo en pause, copie de page, références invalides, rechargement et vrai aller-retour ZIP. Le test historique de suppression d’un état vidéo accepte maintenant explicitement la confirmation requise.

Les miniatures réutilisent le moteur React, chargent les médias progressivement et partagent un cache réduit par Blob, avec extraction vidéo séquentielle et libération des ressources. Elles montrent un état fixe, sans jouer les animations ou vidéos. Pas de prévisualisation agrandie au survol ni de persistance optionnelle des groupes entre états. Le maximum reste 100 états par page et 200 groupes de visibilité. Le comportement et les performances sur la machine de l’utilisateur ne peuvent pas être mesurés depuis cet environnement.

Validation finale locale : **183 tests de production réussis**, compilation réussie. Après l’ajustement visuel du bouton d’ajout et les assertions supplémentaires (mise à jour des miniatures, renommage, suppression, schéma des groupes), les **4 nouveaux tests complets** ont été réexécutés avec succès. Le contrôle GitHub exécute également toute la suite sur la version de la pull request.
