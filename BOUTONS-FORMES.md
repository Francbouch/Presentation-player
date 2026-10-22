# Formes des boutons

Sélectionnez un bouton, puis ouvrez **Forme** dans l’inspecteur. Choisissez Rectangle, Rectangle arrondi ou Cercle / Ellipse. Le bouton garde son identifiant, sa position, ses dimensions, son image, ses actions et ses réglages d’interaction.

Pour un cercle, choisissez **Cercle / Ellipse**, puis **Créer un cercle parfait**. Le diamètre peut être saisi en pixels logiques (diapositive de 1920 × 1080). Cette opération conserve le centre autant que possible et déplace le cadre si nécessaire pour qu’il reste dans la diapositive. Les dimensions ne sont pas modifiées par le seul changement de forme. Pour obtenir une ellipse, réglez séparément largeur et hauteur avec les contrôles existants. Maj pendant le redimensionnement conserve les proportions courantes ; la rotation conserve la silhouette.

Dans **Apparence**, utilisez les réglages existants de remplissage, transparence et opacité. La bordure dispose d’une activation indépendante et d’une opacité en plus de la couleur et de l’épaisseur. Le rayon des coins est proposé pour le rectangle arrondi. Position, dimensions, rotation et opacité générale restent à leur emplacement habituel, sans contrôles en double.

Pour le contenu, utilisez **Importer / remplacer l’image du bouton**, le choix dans la bibliothèque, ou déposez une image sur le bouton en mode positionnement. Un média choisi dans la bibliothèque reste lié à la même ressource ; son remplacement global fonctionne comme auparavant. Le dépôt d’une vidéo sur un bouton est refusé, sans toucher à son action. Les cadres multimédias gardent leur propre lecture vidéo.

Le cadrage existant reste disponible : double-cliquez sur le bouton ou cliquez sur **Ajuster l’image**, déplacez l’image dans son cadre fixe, réglez le zoom, l’ajustement et la rotation. Échap termine le cadrage. L’image et le texte sont masqués par la forme ; les fichiers d’origine ne sont pas modifiés. La bordure reste au-dessus de l’image.

En mode Test et Présentation, seule la silhouette réelle est cliquable, même lorsque le fond est transparent. Les coins extérieurs d’un cercle ou d’un rectangle arrondi laissent passer le clic. Le masque suit la rotation et l’agrandissement des effets. Le bouton reste accessible au clavier. En mode positionnement, son rectangle de sélection et ses poignées restent utilisables.

Les effets, la sélection, les états, les actions, les groupes et les composants réutilisent les mécanismes existants. Les nouveaux paramètres suivent IndexedDB, la duplication, le copier-coller, l’historique et l’export/import ZIP. Le schéma v17 ajoute `buttonShape` et les champs facultatifs `appearance.borderEnabled`, `appearance.borderOpacity`, `imageCrop.rotation`. Les anciens boutons sans ces propriétés conservent leur rendu : aucune forme n’est imposée lors de la migration et aucune donnée n’est effacée.
