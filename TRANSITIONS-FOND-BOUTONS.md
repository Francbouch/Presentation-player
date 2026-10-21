# Transitions du fond d’écran par bouton

Dans les propriétés d’un bouton, sélectionner **Actions → Changer l’arrière-plan**. La section **Transition du fond d’écran** propose :

- Instantané, fondu croisé, glissement, zoom doux et balayage.
- Durée par curseur et champ numérique : 100 à 2 000 ms, 600 ms au premier réglage.
- Courbe linéaire, progressive au début, à la fin ou aux deux extrémités.
- Direction gauche/droite/haut/bas pour glissement et balayage.

« Tester l’action » ou « Tester les interactions » permet de voir le résultat dans l’éditeur. Les mêmes réglages s’appliquent dans le lecteur et en plein écran. Les préférences système de réduction des animations sont respectées.

## Comportement

Le moteur existant de transitions est réutilisé sur les seules images de fond. Le fond sortant reste visible et immobile. L’image entrante est décodée avant le début de l’animation. Aucun titre, bouton ni autre calque n’est entraîné dans l’effet. Une erreur conserve l’affichage précédent et produit un message ; un nouveau clic permet de réessayer.

Les clics restent actifs. Une demande remplace immédiatement celle qui attend encore son décodage. Quand une animation a déjà commencé, elle se termine, puis seule la dernière demande reçue est exécutée : les demandes intermédiaires sont remplacées. Il n’y a donc jamais d’empilement d’animations ni de retour tardif à un ancien choix. Une sortie du mode Test, une navigation, une action d’état ou une vidéo annule les demandes de fond encore en cours.

Les anciens boutons restent instantanés : aucun effet n’est ajouté automatiquement. Les transitions entre pages, les MP4 et les transitions entre états conservent leurs réglages. Le fondu au noir n’est pas proposé pour les fonds afin de conserver le fond sortant pendant toute la révélation.

## Données

Format 14, migration additive depuis les versions antérieures. Les réglages sont portés par `button.backgroundEffect`, séparément des cibles d’action locales. Ils sont copiés avec le bouton, conservés dans IndexedDB et les ZIP et hérités par les instances de composants, sauf propriété personnalisée localement. Les médias restent partagés par identifiant, sans duplication ni envoi réseau. Les réglages invalides sont rejetés avant restauration du ZIP.

Les tests couvrent notamment : isolation des animations aux fonds, clics rapides, décodage lent/échoué et reprise, effets/directions, plein écran, réduction des animations, interruption par navigation, duplication, composants, migration et véritable transfert ZIP entre navigateurs.
