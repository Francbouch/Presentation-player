# Transitions visuelles personnalisables

## Entre diapositives

Dans la timeline, cliquer sur le passage entre deux miniatures. Type de passage : Passage instantané, Effet visuel ou Vidéo. Un effet visuel propose Coupe instantanée, Fondu croisé, Fondu au noir, Glissement, Révélation et Zoom subtil. La dissolution supplémentaire est volontairement omise : elle ferait doublon avec le fondu, ou nécessiterait un rendu par pixels plus coûteux.

Régler la durée (50 à 10 000 ms, valeur initiale 500 ms), l’accélération et, pour le glissement/la révélation, le bord de départ. Prévisualiser cette transition ferme le panneau et recentre l’aperçu, puis utilise le même moteur que le lecteur. Annuler l’animation conserve le départ. Un mode vidéo n’exécute jamais les effets visuels, même si une ancienne configuration d’effet reste mémorisée. Le fichier vidéo n’est pas supprimé lors d’un changement de mode.

Les passages gardent leurs IDs et leur paire ordonnée d’IDs de pages. Le système de transitions non associées, de réassociation et d’annulation reste celui de la timeline.

## Entre états

Sélectionner la page puis ouvrir États interactifs. Le panneau Transitions entre états contient un effet par défaut pour cette page et des passages spécifiques. Ajouter un passage, choisir son départ et son arrivée, puis ses paramètres. Une configuration spécifique remplace le réglage par défaut, y compris une Coupe instantanée spécifique. Les sens aller et retour sont indépendants.

Configuration de la page représente l’arrière-plan/visibilité ordinaires, avant tout état ; les autres options référencent les identifiants stables des états. Le lecteur commence à l’état initial configuré. Prévisualiser un passage applique d’abord son départ, puis joue son arrivée dans le mode test. Prévisualiser l’état utilise le réglage par défaut depuis la configuration ordinaire. Les tests ne modifient pas la sauvegarde ; les modifications explicites des paramètres, elles, sont enregistrées.

Un bouton dont l’action est Changer un état applique automatiquement ces réglages. Demander l’état déjà actif ne rejoue rien. Les boutons et calques communs gardent leurs éléments DOM et leurs coordonnées ; le changement de fond anime deux images superposées, les visibilités modifiées sont animées par opacité. Les calques communs ne glissent pas avec le fond. L’indicateur actif prend sa valeur finale au commit. Un changement manuel du fond ou de visibilité replace la vue dans une configuration personnalisée, afin qu’une action d’état puisse rétablir le résultat prévu.

## Moteur et fiabilité

`visualEffects.js` contient les paramètres, leur validation et un moteur Web Animations commun au lecteur, à la prévisualisation de pages et aux états. Aucun paquet d’animation ajouté. Animation d’opacité/transform, clip-path pour la révélation. Zoom limité à 2,5 % pour le départ et 3,5 % pour l’arrivée. Fondu croisé : le départ reste opaque derrière l’arrivée, ce qui évite un noir involontaire à mi-parcours. Le noir est volontaire uniquement pour Fondu au noir.

Le lecteur prépare et décode l’image montée dans la vue d’arrivée avant de lancer un effet. Il promeut cette même vue et ce même élément image en fin d’animation. Pour les états, l’image d’arrivée montée est également décodée avant l’animation puis conservée au commit. Aucun effet n’est ajouté aux fins de MP4. Les médias emploient les URL stables du cache existant.

Les clics/raccourcis de navigation sont ignorés pendant l’effet. Une garde synchrone empêche les doubles déclenchements avant le rendu React. Les contrôles de mode/plein écran sont bloqués jusqu’à la fin. L’annulation des pages et le retour au mode édition pendant un test restaurent le départ ; les effets d’état peuvent être annulés par Afficher l’arrière-plan par défaut dans l’éditeur. Une vidéo interactive non verrouillée est arrêtée avant une transition d’état ; une vidéo verrouillée ignore les nouvelles demandes.

Attente d’image limitée à 15 secondes ; erreurs signalées en conservant la vue précédente. Un garde-fou termine une animation si son événement de fin manque, après la durée plus 1,5 seconde. Les animations et leurs minuteries sont annulées au démontage ; les attentes de décodage sont bornées à 15 secondes. Les dernières frames de MP4 restent gérées par le mécanisme précédent.

## Données et compatibilité

Schéma de document 7, même base IndexedDB `presentation-studio` et même store/version de base. Les anciens documents et ZIP 1 à 6 sont migrés de manière additive : effets `none`, durée 500 ms, aucune paire d’états. Les modes/fichiers MP4 et WebM et les associations de timeline sont conservés.

Une transition de timeline peut maintenant avoir `mode: visual` et `effect: {type,duration,direction,easing}`. Chaque page possède `stateEffects: {default,pairs:[{fromId,toId,effect}]}`. La duplication remappe les IDs d’états de ces paires. La suppression d’un état retire ses passages spécifiques, sans les attribuer à un autre état. La validation refuse les types inconnus, paramètres hors limites, IDs d’états manquants, paires identiques et paires dupliquées avant restauration. Données futures/illisibles non remplacées. ZIP inclut les paramètres et médias existants. Annuler/Rétablir et contrôles de révision/quota restent actifs.

Configuration GitHub/Vercel, URL de production et protection d’accès inchangées. Revue GitHub avant fusion dans main.

## Validation effectuée

Compilation de production réussie. La suite complète finale a exécuté 69 tests Chromium : 69 réussis, aucun échec ni test ignoré.

Les tests inspectent les animations réellement en cours (opacité à mi-parcours, matrices de déplacement/zoom, clip-path), le plein écran 16:9, la conservation de l’image d’arrivée montée et des boutons communs, les états identiques, les clics répétés, les paires aller/retour et leur priorité, les erreurs de décodage, le délai de 15 secondes (horloge contrôlée), l’annulation, les sauvegardes après rechargement, la duplication des IDs, les ZIP et migrations IndexedDB 6 → 7. Une prévisualisation après un ancien test de variante vérifie le reset de la vue initiale et le déblocage final. Un test de pixels vérifie le fondu d’un calque sortant vers un PNG transparent, sans changement du fond au commit ; un autre contrôle que le zoom ne déborde pas dans les bandes noires du plein écran. Les tests existants de MP4, texte, calques, confidentialité, quota et conflits restent validés.

Le fichier HTML autonome a été testé par HTTP interne avec ses assets embarqués : prévisualisation de page, indicateur du bouton initial, transition entre états, DOM du bouton commun conservé et aucune erreur navigateur. Capture de l’animation inspectée. L’ouverture `file://` n’est pas testée dans le navigateur cloud, où cette adresse est bloquée. Aucun test n’est revendiqué sur le compte Vercel réel. La cadence GPU sur des médias 4K/8K et des projets de plusieurs gigaoctets n’a pas été mesurée ; les limites ZIP et les polices locales des phases précédentes restent inchangées.
