# Guides, groupes et composants

## Utilisation

- **Magnétisme** au-dessus de la scène active les guides pour les boutons, textes, images et formes. Maintenir **Alt** libère le mouvement. La tolérance est de six pixels écran, quel que soit le zoom. Les distances indiquées utilisent une diapositive logique de 1920 × 1080.
- **Maj + clic** ajoute ou retire un élément. On peut aussi tracer un rectangle sur une zone vide ou utiliser **Ctrl/Cmd+A**. Les champs de saisie conservent leurs raccourcis habituels. Les éléments invisibles ne sont pas inclus par le rectangle ou Tout sélectionner ; les éléments verrouillés ne sont pas transformés.
- L’inspecteur propose **Alignement**, le référentiel Sélection/Diapositive, la distribution à partir de trois éléments et l’opacité commune. Une propriété différente affiche « Valeurs multiples ». Les positions restent limitées à la zone autorisée par le document ; pour un élément pivoté près d’un bord, cette limite peut contraindre l’alignement sur la diapositive.
- **Grouper**, ou **Ctrl/Cmd+G**, crée un groupe visuel. **Ctrl/Cmd+Maj+G** dissocie sans déplacer le contenu. Le cadre commun permet de déplacer, redimensionner proportionnellement et pivoter. Le redimensionnement change les blocs de texte sans modifier leur police.
- Double-cliquer un groupe permet de modifier ses éléments individuellement. Le panneau Calques donne également un accès direct à chaque enfant. Échap ou un clic à l’extérieur quitte cette édition. La section « Contenu du groupe » permet d’ajouter ou retirer des éléments. Un groupe visuel ne remplace jamais un groupe de sélection interactive de boutons.
- Sélectionner un bouton ou un groupe, saisir un nom sous **Composant**, puis **Créer un composant**. Le bouton **◇ Composants** à gauche ouvre la bibliothèque avec recherche, aperçu, renommage et insertion.
- Les propriétés ordinaires d’une instance restent modifiables. Les propriétés visuelles modifiées localement sont listées dans l’inspecteur. Les actions, les cibles, les groupes de sélection interactive et la visibilité restent locaux.
- **Modifier le composant maître** ouvre une instance existante pour l’édition. Ajuster les propriétés et, pour un groupe, son contenu, puis **Appliquer au maître et aux instances**. Les autres instances héritent des propriétés qui ne sont pas personnalisées. L’ensemble de cette session d’édition constitue une étape d’historique ; les imports de médias gardent leurs transactions propres.
- **Réinitialiser au style du composant** rétablit l’apparence, le texte, l’image et le cadrage hérités. Les actions et la visibilité restent inchangées. **Détacher du composant** conserve le rendu actuel et coupe le lien.
- Supprimer un maître utilisé demande confirmation : les instances deviennent indépendantes, leurs médias et leurs actions restent présents.

## Modèle et compatibilité

Format 13, migration additive depuis les formats précédents. `visualGroups` et `componentInstances` sont des métadonnées de page ; `components` contient les maîtres au niveau du projet. Les feuilles conservent leurs identifiants, leur géométrie absolue et le moteur de lecture actuel. Les guides et la sélection sont temporaires et ne sont jamais exportés.

Les médias restent des ressources partagées par identifiant. Les maîtres ne contiennent aucun Blob supplémentaire. La bibliothèque compte aussi les images utilisées par un maître. Copier un ensemble remappe ses références internes ; les références externes absentes de la destination sont désactivées. Les états sont associés par identifiant, jamais par nom. Les règles de visibilité existantes sont conservées.

Les images, le cadrage et les propriétés du maître/instances sont inclus dans IndexedDB et le ZIP. Les structures du format 13 sont validées avant restauration. Aucun changement de base IndexedDB, d’origine ou de configuration Vercel.

Limites choisies pour cette version : groupes et composants imbriqués non proposés ; insertion par bouton depuis la bibliothèque (pas de glisser-déposer) ; l’édition du maître utilise une instance existante et une commande explicite de publication. Retirer un élément du maître ouvre une confirmation avant de le supprimer dans les instances. Une option permet de le conserver comme élément indépendant. Les références devenues invalides ne sont désactivées qu’après confirmation ; les fichiers médias restent conservés. Les transitions automatiques entre états ne font pas partie de cette modification.

## Validation

Tests ciblés : tolérance du magnétisme aux différents zooms, limites pivotées, Alt, sélection à la souris/Maj/rectangle/clavier, verrouillage, alignement, groupe, transformation commune et annulation unique ; héritage par propriété, styles locaux, dimensions, actions vidéo/états entre pages, modification de structure, détachement, rechargement et vrai transfert ZIP entre navigateurs.

Commande de régression : `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:production`.
