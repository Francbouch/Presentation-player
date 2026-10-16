# Nouvel espace de travail

L’éditeur utilise maintenant toute la fenêtre. La scène reste dans une zone centrale 16:9, avec sa propre surface de zoom. Les propriétés, les calques et la timeline ont chacun leur propre défilement ; consulter un long réglage ne fait plus partir la diapositive hors de l’écran.

## Organisation

- La barre supérieure conserve Éditeur / Présentation et le statut de sauvegarde. La barre du document regroupe son nom affiché, Annuler, Rétablir et Lancer la présentation. Le menu **Fichier**, en haut à gauche, regroupe **Sauvegarder mon projet**, **Importer un ZIP**, **Protéger le stockage local** et **Récupérer le projet précédent** (disponible après une restauration). Il conserve les confirmations existantes, les informations de stockage et la date du dernier ZIP. Ouvrez-le au clic, avec Entrée ou les flèches ; naviguez avec ↑ / ↓, Début / Fin, puis Entrée. Échap, Tabulation ou un clic ailleurs le ferment.
- À gauche, les outils vectoriels ajoutent textes, images, rectangles, cercles, lignes et boutons. Chaque icône possède un nom accessible et une infobulle. Sélection revient au positionnement.
- Le bouton Calques ouvre ou ferme la liste secondaire. La sélection dans la liste et sur la scène est synchronisée. Les icônes d’œil et de cadenas restent disponibles. Glissez une ligne sur une autre pour changer l’ordre ; un double clic sélectionne son nom dans l’inspecteur pour le renommer.
- Médias montre les ressources du projet, leurs formats et leurs tailles, sans transfert vers un serveur. Les contrôles existants de remplacement et de réutilisation restent dans les propriétés.
- À droite, l’inspecteur montre en premier le calque sélectionné, avec les mêmes contrôles réutilisés. Les sections Texte, Position et dimensions, Visibilité, Apparence, Effets, Indicateur, Groupe et Actions se replient indépendamment. Les réglages généraux de page, variantes et états restent accessibles plus bas et via les outils Page / États. Sans sélection, l’inspecteur commence par la page. Une image sélectionnée n’affiche pas les propriétés des boutons.
- Une transition sélectionnée dans la timeline ouvre son formulaire dans l’inspecteur, et non sous la timeline. Sélectionner un calque ou une page ferme ce contexte.
- La timeline est un panneau inférieur indépendant, rétractable. Ses miniatures, transitions, menus, réorganisation et prévisualisations sont conservés.

## Adapter l’espace

Déplacez les séparateurs entre les panneaux pour modifier leur largeur, et celui au-dessus de la timeline pour modifier sa hauteur. Les séparateurs sont également utilisables au clavier avec les flèches. La fermeture du panneau gauche et la réduction de la timeline rendent automatiquement de l’espace à la scène.

**Ajuster à l’écran** affiche la scène entière. Les commandes − / + zooment l’affichage. **100 %** utilise la référence 1920 × 1080 ; la zone centrale défile alors si nécessaire. Le zoom ne change jamais les coordonnées sauvegardées. Déplacement, rotation et poignées de taille utilisent toujours les limites réelles de la scène à l’écran.

Les largeurs, la hauteur de timeline, l’ouverture du panneau gauche et les sections repliées sont enregistrées dans `localStorage`, sous `studio.workspace.v1`. Seules ces préférences d’interface y sont écrites : les médias et présentations restent dans IndexedDB. Le zoom revient à Ajuster au chargement. Une indisponibilité du stockage des préférences n’empêche pas l’éditeur de fonctionner. La position réduite de la timeline reste propre à l’affichage courant.

Sur petit écran, les calques utilisent un tiroir fermable. Sur téléphone, la scène et les propriétés sont réparties verticalement pour rester visibles ensemble. Le panneau de médias peut se fermer pour dégager la scène.

## Fonctions conservées

Tester les interactions reste au-dessus de la scène, avec le retour en mode édition. Les raccourcis de calques, l’historique, les actions et états, les transitions vidéo et visuelles, la récupération des fichiers USB, les sauvegardes et ZIP ne changent pas de format. Cette refonte ne change ni la version du document, ni les données existantes, ni la configuration GitHub/Vercel.

Le texte de demande reçu s’arrêtait au début de la section 6. Le mode de test existant a donc été conservé intégralement.
