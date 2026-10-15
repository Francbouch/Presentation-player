# Texte des boutons et raccourcis de l’éditeur

## Modifier le texte d’un bouton

Sélectionnez le bouton dans l’aperçu ou dans Calques. La section **Texte et typographie** utilise les mêmes commandes que les calques de texte : contenu multiligne, polices locales, taille en pixels, gras, italique, souligné, couleur et HEX, alignements horizontal et vertical, espacement des lettres, marges intérieures et interligne.

Le nom du calque sert à l’identifier ; le contenu affiché peut être différent. Un contenu vide permet de conserver uniquement l’image d’un bouton. Le texte est superposé aux images sans modifier les fichiers PNG. Sa taille n’agrandit pas le bouton. Les dimensions logiques sont celles du cadre 1920 × 1080 et suivent le même facteur d’échelle dans l’éditeur, le lecteur et le plein écran. Les coches et effets restent disponibles.

Les boutons anciens conservent leur rendu jusqu’à la modification de leur texte ou de sa typographie. Le contrôle de couleur est partagé dans Texte et typographie ; aucun deuxième sélecteur de texte n’est ajouté dans Apparence.

## Afficher d’autres boutons

1. Créez Blanc, Noyer et Charbon et désactivez **Calque visible** sur chacun.
2. Créez le bouton Choisir une finition.
3. Dans **Action au clic**, choisissez **Afficher / masquer des calques**.
4. Cochez les trois boutons dans Calques contrôlés et choisissez **Basculer la visibilité**.
5. Cliquez sur **Tester les interactions**, puis sur Choisir une finition : un clic les montre et le suivant les cache.

Pour un bouton Retour qui masque ces choix et affiche d’autres éléments, choisissez **Choisir pour chaque cible**. Chaque cible cochée reçoit alors sa propre commande Afficher, Masquer ou Basculer. Le système de visibilité reste commun aux boutons, textes, images et formes. Les états interactifs peuvent aussi définir cette visibilité. Un élément masqué est absent de la scène et ne reçoit ni clic ni focus ; il reste accessible dans la liste Calques en mode édition. Les changements de test ne sont pas sauvegardés et le lecteur démarre avec la visibilité configurée ou celle de son état initial.

## Copier, couper, coller

Sélectionnez un calque dans l’aperçu ou dans Calques, puis utilisez Ctrl+C, Ctrl+X et Ctrl+V. Sur Mac, utilisez Cmd. Le presse-papiers interne à la session réutilise les fichiers médias de la présentation. Passez à une autre page dans la timeline pour y coller.

La copie reçoit un identifiant neuf, un léger décalage et devient sélectionnée. Les propriétés, médias et effets sont conservés. Les références locales valides sont maintenues ; les cibles de visibilité absentes sont retirées, un état absent doit être choisi à nouveau. Une variante d’une autre page devient une référence au même média, sans dupliquer son fichier. La sélection par défaut d’un groupe n’est pas dupliquée. L’éditeur sélectionne actuellement un calque à la fois ; le presse-papiers suit cette sélection. Il n’échange pas de calques avec d’autres applications.

## Annuler et rétablir

- Ctrl+Z / Cmd+Z : annuler.
- Ctrl+Y, Ctrl+Maj+Z / Cmd+Maj+Z : rétablir.
- Les boutons ↶ Annuler et ↷ Rétablir de la barre d’outils montrent les raccourcis dans leur infobulle et sont désactivés quand aucune étape n’est disponible.

L’historique conserve 100 étapes pendant la session, avec les mêmes blobs médias partagés entre les étapes. Un déplacement, une rotation ou un redimensionnement à la souris vaut une étape. Un geste sur un curseur est regroupé, ainsi que les changements du sélecteur de couleur jusqu’à sa perte de focus. La saisie textuelle continue conserve son regroupement existant. Une nouvelle modification après Annuler efface la branche de rétablissement. Les changements restent automatiquement sauvegardés.

Les raccourcis de calques sont limités à l’espace de travail en mode édition, hors champs, éditeurs de texte et boîtes de dialogue. Dans un champ, les commandes natives de copie, collage et annulation restent disponibles. Le lecteur conserve ses commandes de navigation.

## Sauvegarde

Le format passe à la version 9 sans changer la base IndexedDB. Les fichiers et métadonnées existants sont préservés. Les textes de boutons et instructions de visibilité sont validés et inclus dans le ZIP ; l’historique et le presse-papiers restent limités à la session. Les imports USB sécurisés et la protection GitHub/Vercel sont conservés.
