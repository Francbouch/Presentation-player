# Phase 3 — texte avancé

L’éditeur de calques, les boutons et états de la phase 2, les médias, les sauvegardes et le lecteur sont conservés. La timeline de la phase 4 n’est pas développée ici. Aucune dépendance ou police distante n’est ajoutée.

## Écrire directement sur la page

1. Choisissez une diapositive et cliquez sur **+ Texte**. Le bloc apparaît et est sélectionné dans les calques.
2. Double-cliquez sur le bloc pour écrire directement sur la page. Un contour pointillé indique la saisie ; les poignées sont retirées pour éviter de déplacer le texte.
3. Espace insère un espace, Entrée ajoute une ligne et les flèches déplacent le curseur. Ctrl+A sélectionne le texte du bloc ; Ctrl+C et Ctrl+V copient/collent du texte brut. Les raccourcis Cmd équivalents utilisent le comportement natif sur Mac.
4. Appuyez sur **Échap** ou cliquez dans les propriétés pour terminer la saisie. Les poignées réapparaissent. Vous pouvez aussi écrire dans **Contenu du texte**, à droite.
5. Attendez **Sauvegardé dans ce navigateur** avant de fermer ou actualiser. La saisie est affichée immédiatement ; les écritures IndexedDB sont regroupées après une pause de 250 ms. Un avertissement de fermeture protège les modifications encore en attente.

Le texte reste du texte brut : coller un extrait d’une page web n’ajoute pas de HTML, de scripts ou de mise en forme étrangère. La limite existante de 10 000 caractères par bloc est conservée.

## Mise en forme

Dans les propriétés du texte, vous pouvez régler :

- **Style rapide** : Grand titre, Sous-titre, Texte normal, Petite annotation, Étiquette technique. Les réglages restent personnalisables ensuite. Le style ne remplace pas votre couleur ou votre contenu.
- **Police** : Arial, Système, Verdana, Trebuchet, Georgia ou Monospace, avec des remplacements locaux fiables. Aucune police n’est téléchargée. Sur un autre ordinateur, une police indisponible peut être remplacée et modifier les glyphes ; le choix et les proportions restent enregistrés.
- **Taille**, **Gras**, **Italique**, **Souligné**, couleur au sélecteur ou en **HEX**. Les couleurs HEX courtes sont développées lors de la sortie du champ ; une valeur invalide ne remplace pas la couleur enregistrée.
- Alignement gauche/centré/droite, alignement vertical haut/centre/bas, interligne, espacement des lettres et marges intérieures.
- **Afficher en majuscules**, sans modifier le contenu original.
- **Retour automatique à la ligne**, désactivable pour une ligne non repliée.
- Opacité, rotation, ordre, visibilité et verrouillage avec les propriétés de calque habituelles.

## Taille du bloc et placement

**Adapter la hauteur au contenu** agrandit ou réduit la hauteur suivant le texte. Cela fonctionne aussi pour une annotation initialement masquée puis affichée par un bouton ou un état, sans enregistrer les effets d’un test.

Sans cette option, le bloc garde sa taille. Un repère **!** signale un contenu coupé. Activez la hauteur automatique, agrandissez le bloc ou réduisez la taille de police. Un bloc ne dépasse pas le bas de la diapositive : s’il n’y a pas assez de place, déplacez-le vers le haut. Des marges trop grandes ou le retour à la ligne désactivé peuvent aussi provoquer un dépassement.

Glissez le bloc pour le déplacer, ses poignées pour le redimensionner et **↻** pour le faire pivoter. Modifier manuellement sa hauteur réactive la taille fixe. Les touches fléchées ajustent la position quand vous êtes en sélection, jamais pendant la saisie. Maj accélère ce réglage.

**Aligner le bloc sur la page** propose les bords et les centres horizontal/vertical. Des guides cyan et un léger ajustement apparaissent près des axes de la diapositive ou d’autres calques pendant le déplacement. Un texte verrouillé ne peut pas être déplacé ou modifié au double-clic ; déverrouillez-le dans les propriétés.

## Boutons, états et présentation

Le texte est un calque ordinaire. Les boutons peuvent continuer à l’afficher, le masquer ou basculer sa visibilité. Les états peuvent définir ses visibilités. Les vidéos et la navigation conservent leur fonctionnement.

Le même composant affiche les textes dans l’éditeur, le test, le lecteur et le plein écran. La mise en page s’effectue dans un cadre logique 1920 × 1080, puis est mise à l’échelle. Le navigateur ne recalcule donc pas les retours à la ligne à partir d’une largeur différente à chaque fenêtre. Une observation du redimensionnement ajuste l’échelle avant affichage ; les positions restent proportionnelles au 16:9.

Les textes décoratifs de démonstration ou les mots dessinés dans une image Canva ne deviennent pas des blocs éditables. Vous pouvez retirer le texte de démonstration avec le bouton existant, puis ajouter vos propres calques de texte.

## Sauvegardes et compatibilité

Le format courant du document et du ZIP est **v5**. IndexedDB conserve son nom, son magasin et sa version de base. Les documents/ZIP v1, v2, v3 et v4 restent compatibles. Les anciens textes reçoivent des réglages correspondant au rendu précédent : Arial, taille proportionnelle équivalente à 48 dans le cadre de référence, interligne 1,25, alignement gauche, aucune marge et taille fixe. Leurs contenus, couleurs, identifiants, positions, actions, états et médias ne sont pas supprimés.

Tous les paramètres de texte sont inclus dans les ZIP. Une configuration de texte invalide, même déclarée dans un ancien format, est rejetée avant remplacement. Une version future ou des données enregistrées illisibles restent intactes, sans réinitialisation.

Les saisies continues sont regroupées en une opération **Annuler / Rétablir**. Une annulation supprime aussi la sauvegarde différée correspondante ; un ancien timer ne peut pas réécrire le texte annulé. Les sauvegardes, conflits entre onglets, reprises après quota et copies avant restauration restent ceux des phases précédentes.

## Mise à jour et vérification

La branche se valide sur GitHub. Après les vérifications vertes et fusion dans `main`, Vercel met automatiquement à jour la même adresse avec la protection **All Deployments** existante. L’exécution distante et la présence du panneau de typographie sur le site doivent être confirmées après déploiement. Conservez un ZIP avant la mise à jour.

Le fichier HTML autonome téléchargeable permet de tester une copie dans Chrome récent. Son emballage est vérifié via HTTP local dans l’environnement de développement ; l’ouverture directe des fichiers locaux est bloquée par la politique du navigateur de cet environnement. Les restrictions propres à votre navigateur concernant JavaScript et IndexedDB peuvent être signalées par l’application.

La vérification comporte les tests existants et huit tests de texte : double-clic, saisie multiligne et presse-papiers, typographie et styles, manipulation et guides, mise en page identique entre modes et fenêtres, visibilité par actions/états, sauvegarde regroupée/annulation/ressources stables, ZIP et migration v4, données invalides conservées. Les mesures de lignes et proportions attendent la fin du redimensionnement natif du navigateur. Les projets de plusieurs gigaoctets et les polices installées sur d’autres systèmes ne sont pas validés ici.
