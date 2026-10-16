# Visibilité d’un bouton dans tous les états

1. Sélectionnez le bouton sur la scène ou dans **Calques**.
2. Dans ses propriétés, ouvrez **Visibilité → Appliquer à tous les états**.
3. Choisissez **Afficher dans tous les états** ou **Masquer dans tous les états**.

Seul ce bouton est modifié, pour les états existants de la page sélectionnée. La configuration de la page sans état et les actions des boutons ne changent pas. Le compteur indique immédiatement combien d’états l’affichent. Si l’état initial le masque, il disparaît de la scène mais reste sélectionnable dans **Calques**.

L’opération complète s’annule avec **Ctrl+Z** (ou Cmd+Z) et se rétablit avec **Ctrl+Y**, Ctrl+Maj+Z ou Cmd+Maj+Z. Les commandes Annuler / Rétablir de la barre supérieure conviennent aussi.

Vous pouvez ensuite créer des exceptions : dans **États interactifs**, ouvrez un état et changez **Visibilité des calques** uniquement pour ce bouton. Les autres états conservent leurs valeurs. **Tester les interactions** ou **Présentation** montre la visibilité de l’état actif ; les actions d’affichage, masquage et bascule continuent à fonctionner pendant la lecture.

## Futurs états

Les nouveaux boutons sont visibles par défaut dans tous les états existants. Pour eux, **Appliquer aussi aux nouveaux états** est activée avec **Afficher**. Les boutons existants gardent leurs réglages précédents. Lorsqu’elle est activée, choisissez **Afficher** ou **Masquer** dans **Visibilité des nouveaux états**. Une commande groupée met aussi cette préférence à jour lorsqu’elle est activée.

Cette préférence sert seulement à créer un nouvel état avec **Ajouter un état**. Elle ne réécrit jamais les états existants ni leurs exceptions. La désactiver laisse tous les réglages existants intacts. Un état dupliqué conserve les réglages de l’état copié.

Les réglages sont sauvegardés automatiquement dans IndexedDB et inclus dans les ZIP. Le format v10 conserve les projets v1 à v9 sans changer la base de données ni supprimer leurs médias ou métadonnées. Les paramètres de visibilité illisibles sont refusés sans remplacer le projet actuel. Les groupes, effets, transitions et configuration GitHub/Vercel restent inchangés.
