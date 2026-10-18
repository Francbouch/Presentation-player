# Bibliothèque d’images et cadrage des boutons

## Bibliothèque

Cliquez sur **Médias**, l’icône de dossier dans la barre d’outils gauche. Le panneau garde son défilement propre : la scène reste au centre, les propriétés à droite et la timeline en bas.

**Importer des images** accepte plusieurs PNG, JPG, JPEG et WebP. Vous pouvez aussi déposer les fichiers directement dans la bibliothèque. Les octets sont copiés et vérifiés avant sauvegarde ; une clé USB n’est plus nécessaire après une importation réussie. Un lot invalide n’est pas installé partiellement. Le message indique le résultat. Les fichiers identiques déjà disponibles sont réutilisés lors d’une importation par la bibliothèque ; aucun nouveau média n’est alors créé.

Les images importées depuis les propriétés sont également visibles dans la bibliothèque. Les imports directs existants restent des ressources indépendantes ; pour partager explicitement une même image, utilisez **Choisir dans la bibliothèque**. Les vidéos restent accessibles dans la section **Vidéos du projet** et dans leurs contrôles de transitions et d’actions habituels.

La recherche, le filtre par dossier et le tri par nom, date d’importation ou taille fonctionnent en grille et en liste. Le curseur **Miniatures** règle leur taille. Les anciennes images sans date sont classées avant/après les images datées suivant le tri, sans inventer une date historique. Un clic sélectionne l’image, un double-clic ou **Aperçu agrandi** ouvre son aperçu.

Pour créer un dossier, saisissez son nom puis cliquez sur **Créer un dossier**. Sélectionnez une image et utilisez **Classer dans** pour la déplacer. Filtrez un dossier pour accéder à son renommage et sa suppression. Supprimer un dossier renvoie ses images dans **Non classées**, après confirmation. Cela ne supprime aucun fichier et ne modifie aucun lien dans les pages.

Le bouton du nombre d’utilisations affiche les liens concernés avec leurs noms. Une image utilisée ne peut pas être supprimée. Une image inutilisée peut être supprimée après confirmation ; les commandes Annuler / Rétablir restent disponibles. Aucun nettoyage automatique ne supprime les ressources détachées.

## Choisir une image existante

Les propriétés d’un bouton proposent **Changer l’image de ce bouton uniquement**. Les arrière-plans, variantes, états, actions et calques d’image offrent aussi un accès à la bibliothèque. Dans le sélecteur, parcourez les dossiers, recherchez, sélectionnez, puis cliquez sur **Utiliser cette image**. Échap ou la fermeture annule le choix. Un aperçu ne change pas la présentation.

Le sélecteur réutilise l’identifiant du média : utiliser une image sur plusieurs boutons ou pages ne crée pas plusieurs copies de son fichier.

## Cadrer l’image d’un bouton

Sélectionnez un bouton contenant une image, puis ouvrez **Cadrage de l’image** dans ses propriétés. **Image entière** conserve l’image complète ; **Remplir le cadre** recadre selon les proportions du bouton. Les deux modes gardent les proportions de l’image.

Double-cliquez sur le bouton dans l’éditeur ou cliquez sur **Ajuster l’image**. Le cadre pointillé indique la zone fixe. Glissez l’image à l’intérieur du cadre. Le curseur de zoom va de 10 à 500 %. Les flèches permettent aussi un déplacement précis lorsque le cadre de cadrage possède le focus. **Terminer** ou **Échap** revient au positionnement normal du bouton.

**Recentrer** remet uniquement la position au centre. **Réinitialiser le cadrage** remet le mode Image entière, le zoom à 100 % et la position au centre. **Copier le cadrage / Coller le cadrage** transfère seulement le mode, le zoom et la position. Pour un autre format de bouton, les offsets restent proportionnels à son cadre : le même réglage peut donc montrer une autre portion de l’image.

Chaque bouton possède ses réglages propres. Le cadre, ses coordonnées, sa rotation, le texte, les actions, la coche et les effets ne sont pas modifiés. Le découpage respecte les coins arrondis. Les fichiers originaux et leur transparence restent intacts. Le même composant rend les images en édition, en Test et en Présentation.

Un déplacement continu et un réglage continu du zoom sont regroupés dans l’historique. **Ctrl+Z / Cmd+Z** annule et **Ctrl+Y / Ctrl+Maj+Z / Cmd+Maj+Z** rétablit. L’historique reste propre à la session, comme auparavant.

## Remplacer partout

Sélectionnez l’image dans Médias puis **Remplacer partout…**. Importez le nouveau fichier. La confirmation montre l’original, l’aperçu du nouveau fichier, les utilisations et un avertissement si les proportions diffèrent. Annuler ne change rien.

Après confirmation, la ressource garde son identifiant, son nom dans la bibliothèque et son dossier. Toutes les références suivent le nouveau fichier : images de boutons, calques, arrière-plans, variantes, états et actions. Les dimensions des éléments et leurs cadrages sont conservés. Vérifiez le résultat lorsque les proportions changent.

L’écriture du remplacement précède le changement en mémoire. En cas d’échec, le fichier original reste en place. L’opération est une seule étape d’historique : Annuler restaure également les octets de l’ancien fichier, Rétablir remet le nouveau. Les instantanés nécessaires sont conservés tant qu’ils appartiennent à l’historique des 100 étapes.

## Sauvegarde, compatibilité et performances

Tout reste dans le navigateur, sans serveur, cloud, abonnement ou envoi de médias. Les médias restent dans IndexedDB ; les préférences d’espace de travail restent séparées. Les informations d’espace disponible et les avertissements de stockage existants sont conservés.

Le format v11 ajoute les dossiers et les cadrages facultatifs. Les documents v1 à v10 sont conservés avec leurs identifiants, médias et métadonnées. L’inspection du modèle existant montre des références `imageId` / `mediaId` et des variantes ; les URL `blob:` sont produites temporairement pour l’affichage, pas sauvegardées comme liens. La migration ne remplace donc pas les identifiants et ne copie pas les fichiers. Les boutons sans cadrage gardent leur rendu historique.

Les noms, dossiers, dates connues, dimensions et cadrages sont inclus dans les ZIP avec les fichiers originaux. Une ressource partagée n’est exportée qu’une fois. Les validations du ZIP, la restauration transactionnelle et la récupération du projet précédent sont conservées. Les dossiers ou cadrages invalides sont refusés avant restauration.

Les miniatures sont produites à la demande près de la partie visible de la liste, avec deux décodages simultanés au maximum. Elles gardent les proportions et la transparence, sont temporaires et ne créent pas de copies permanentes dans IndexedDB. Leurs URL sont libérées à la sortie de la zone visible ou à la fermeture du panneau. Les aperçus originaux ne sont affichés que sur demande.
