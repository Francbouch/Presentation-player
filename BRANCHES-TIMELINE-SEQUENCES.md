# Branches parallèles à plusieurs étapes

## Exemple : cinq étapes pendant un transport

1. Sélectionnez votre Ligne du temps et ouvrez **Étapes simultanées**.
2. Regroupez les deux premières étapes, ou cliquez sur **Créer un groupe avec deux nouvelles étapes**. Un groupe existant convient aussi.
3. Dans le groupe, ouvrez **Branches et étapes successives**. Renommez la première branche « Travaux internes » et la seconde « Logistique ».
4. Sélectionnez les étapes pour modifier leurs noms et propriétés habituels. Nommez la première « Documents techniques » et celle de Logistique « Transport maritime ».
5. Dans la première branche, cliquez quatre fois sur **Ajouter une étape à cette branche**. Renommez ces nouvelles étapes comme souhaité. La branche Logistique conserve sa seule étape.
6. Activez **Révélation progressive** et choisissez zéro étape visible au départ si vous souhaitez commencer avec une Timeline vide.
7. Lancez le mode Test ou Présentation. Espace révèle ensemble les premières étapes des branches, puis les suivantes rang par rang. Le Transport reste visible. Après le dernier rang, Espace passe à l’étape suivante de la chronologie.

## Organisation et révélation

Chaque branche possède un ID stable, un nom réservé à l’éditeur et une liste ordonnée d’ID d’étapes. Les étapes, fiches et médias restent dans leurs emplacements existants, sans duplication.

Les boutons Monter/Descendre réorganisent les étapes ; le menu Déplacer change leur branche. Une étape existante hors groupe peut être ajoutée depuis le menu correspondant. Les branches peuvent être ajoutées, renommées et réordonnées. Les espacements des étapes et des branches sont indépendants.

Par défaut, la première étape de chaque branche a le rang 1, la deuxième le rang 2, etc. Les mêmes rangs apparaissent simultanément. Les rangs personnalisés n’ont aucun lien avec les coordonnées ou les dates. Ils doivent rester croissants dans chaque branche ; un déplacement ou un changement de rang ajuste les suivants si nécessaire. **Rétablir les rangs automatiques** retire les personnalisations.

Les anciens groupes ne sont pas convertis au chargement : ils gardent leur géométrie et leur révélation simultanée. Ouvrir le panneau ne modifie pas les données. Une modification de structure initialise explicitement les branches, sans recréer les étapes existantes.

## Suppression et historique

**Retirer — conserver dans la Timeline** détache une étape après le groupe. **Supprimer l’étape** demande confirmation et supprime sa fiche ; ses fichiers médias restent dans le projet. Supprimer une branche contenant des étapes demande confirmation et conserve ces étapes et fiches après le groupe. Un groupe réduit à une seule étape redevient une étape normale. Une branche vide est autorisée pour préparer sa structure.

Chaque opération utilise l’historique et la sauvegarde existants. Les réglages, ID et fiches sont conservés par rechargement, duplication, copier/coller et ZIP. Le format 41 accepte les versions antérieures sans conversion implicite des groupes ni suppression de métadonnées. Aucun changement du nom de la base IndexedDB ou du stockage.

## Rendu et limites

Les branches possèdent une entrée et une sortie communes. Les étapes se suivent sur leurs chemins ; une branche courte couvre la largeur du groupe sans fausses bulles. Les connexions apparaissent avec les étapes qu’elles desservent. Le centrage collectif vise uniquement les nouvelles étapes de même rang ; un rang individuel centre sa propre étape. Les fiches éditables, titres et durées A/B/C restent indépendants. Les statuts ne sont jamais modifiés par Espace.

Les dates et durées ne définissent pas la longueur du chemin de connexion. Les barres A/B peuvent donc avoir une autre longueur, y compris se chevaucher. Les longues séquences agrandissent le canevas interne et utilisent le cadrage/défilement existant ; aucun zoom arrière automatique n’est ajouté.

Un groupe reste dans une seule phase, comme dans le modèle existant. Les groupes imbriqués et les branches qui se croisent entre phases ne sont pas pris en charge. Les noms des branches ne sont pas affichés au public. Les positions des bulles restent automatiques selon la disposition et les espacements existants ; cette amélioration n’ajoute pas de placement libre individuel des bulles.

## Sécurité

État Git initial propre, branche dédiée et point de restauration `safety/timeline-sequences-initial-20261026`. Bundle Git complet vérifié : `/workspace/backups/presentation-player-before-branch-sequences.bundle`. Cela sauvegarde le code, pas les présentations privées stockées dans Chrome, auxquelles cet environnement n’a pas accès. Aucun effacement de données, changement de protection Vercel ni déploiement automatique.
