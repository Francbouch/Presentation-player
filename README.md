# Studio — Présentation interactive

Application React + Vite en JavaScript. Le lecteur existant est conservé ; un éditeur visuel gère les pages, les médias, les variantes et les sauvegardes.

La [phase 1 de l’éditeur de calques](docs/CALQUES-PHASE-1.md) ajoute des images transparentes, du texte simple, des formes et les boutons existants dans un ordre commun. Sélection, déplacement, poignées de taille et rotation, opacité, visibilité, verrouillage et annuler/rétablir sont accessibles visuellement. Le format v3 conserve les projets et ZIP v1/v2 ; les actions avancées, la mise en forme avancée du texte et la timeline attendent les phases suivantes.

La [phase 2 des actions de boutons](docs/ACTIONS-PHASE-2.md) ajoute le changement de fond, la visibilité de plusieurs calques, la lecture vidéo avec une fin configurable, la navigation directe et les états nommés. Le panneau **Action au clic** est dans les propriétés du bouton à droite. Cette phase introduit le format **v4**, compatible avec les documents et ZIP v1/v2/v3. Les déploiements et l’adresse Vercel sont conservés.

La [phase 3 du texte avancé](docs/TEXTE-PHASE-3.md) ajoute la saisie au double-clic, les polices locales, styles rapides, réglages typographiques, hauteur automatique, alignements et guides. Le format courant est **v5**, compatible avec les projets et ZIP v1 à v4. Le texte utilise le même rendu dans l’éditeur et le lecteur ; la timeline attend la phase 4.

Le [guide de mise en ligne privée sur Vercel](docs/DEPLOIEMENT-PRIVE.md) explique les étapes sans terminal, le transfert du projet par ZIP, les limites du stockage navigateur et les validations requises avant toute publication. Les déploiements Git automatiques sont activés uniquement pour `main`, après vérification de Vercel Authentication avec All Deployments. Les changements restent revus via une pull request avant fusion ; les branches de travail ne déclenchent pas de déploiement automatique.

## Utiliser l’application sans modifier le code

1. Ouvrez l’application : le mode **Éditeur** apparaît avec trois pages de démonstration.
2. Cliquez sur une miniature pour choisir une page, ou sur **Ajouter une page**.
3. Cliquez sur **Importer / remplacer l’image** et choisissez un PNG, JPG, JPEG ou WebP sur votre ordinateur. Les nouvelles images remplacent aussi le texte décoratif de démonstration. Vous pouvez retirer ce texte séparément.
4. Si vous souhaitez une vidéo entre cette page et la suivante, cliquez sur **Importer / remplacer la transition MP4**. Ce bouton accepte également WebM. Le lecteur vidéo de l’éditeur permet de la prévisualiser.
5. Utilisez **Dupliquer la page**, **Monter**, **Descendre** ou **Supprimer la page** pour organiser votre présentation. La transition reste attachée à sa page de départ.
6. Dans **Variantes d’image**, cliquez sur **Ajouter une variante**, choisissez son image et donnez-lui un nom (Blanc, Noyer, Charbon…). Chaque variante peut être remplacée ou supprimée indépendamment.
7. Cliquez sur **Lancer la présentation** pour démarrer depuis la page sélectionnée et demander le plein écran. L’onglet **Présentation** ouvre aussi le lecteur ; son bouton ⛶ ou la touche F active le plein écran si nécessaire.
8. Pour retourner à l’éditeur, quittez le plein écran avec Échap ou F et cliquez sur **Revenir à l’éditeur**, ou utilisez **Quitter la présentation** directement en plein écran.

Les images restent dans un cadre 16:9, sans déformation : des marges sont ajoutées si le format de votre image est différent. Les boutons de variantes apparaissent automatiquement dans le lecteur et le choix reste actif pendant la session. Les champs texte de l’éditeur n’interceptent aucune commande de présentation.

## Créer des boutons interactifs

1. Sélectionnez une page, puis trouvez la section **Boutons interactifs** sous l’aperçu.
2. Cliquez sur **Ajouter un bouton**, ou **+ Bouton** dans la barre des calques. L’ajout est limité à 500 calques et boutons par page ; les anciennes pages qui en contiennent davantage sont conservées.
3. Sélectionnez le bouton dans la liste ou directement sur la page. Le panneau de propriétés permet de lui donner un nom et d’importer son image PNG, JPG/JPEG ou WebP. Sans image, son nom sert de repère visuel.
4. Dans **Arrière-plan au clic**, choisissez l’image principale ou une variante existante. Vous pouvez aussi cliquer sur **Importer un arrière-plan pour ce bouton** pour choisir une autre image sur votre ordinateur.
5. Cliquez sur **Positionner dans l’aperçu**, puis glissez le bouton avec la souris. Glissez la poignée en bas à droite du bouton sélectionné pour changer sa taille. Les quatre champs de position et de dimensions permettent également un réglage en pourcentage ; les touches fléchées déplacent le bouton ou règlent la poignée sélectionnée (Maj accélère le réglage).
6. Cliquez sur **Tester les interactions** au-dessus de l’aperçu : les clics sur les boutons affichent immédiatement leurs arrière-plans. Ils ne déplacent plus les boutons. **Tester ce bouton** dans les propriétés offre le même aperçu.
7. Le menu **Arrière-plan affiché par défaut** détermine l’image initiale de cette page dans le lecteur. Choisissez une variante ou une image déjà associée à un bouton, ou importez un arrière-plan par défaut. **Afficher l’arrière-plan par défaut** remet l’aperçu dans son état initial.
8. **Afficher un indicateur sur le bouton actif** active ou désactive le léger contour indiquant le dernier bouton utilisé. Le contour de sélection pour le placement reste visible dans l’éditeur.
9. Utilisez **Dupliquer le bouton**, **Supprimer le bouton** ou les boutons de remplacement d’image pour le modifier. Un bouton sans arrière-plan associé est inactif pendant la présentation, mais peut toujours être sélectionné et placé dans l’éditeur.

Toutes les positions et dimensions sont stockées entre 0 et 1 relativement au cadre 16:9. Les boutons gardent donc la même position en plein écran et sur différentes résolutions, même quand l’image d’arrière-plan comporte des marges. Les images des boutons conservent leurs proportions. Le placement est sauvegardé automatiquement à la fin du geste ; les autres réglages le sont dès leur modification.

Dans le lecteur, un bouton change uniquement le fond de la page : les autres boutons restent disponibles. Espace sur un bouton qui a le focus l’active sans faire avancer la présentation. La navigation et les transitions vidéo restent inchangées. Supprimer une variante utilisée par un bouton retire son association ; si cette variante était l’arrière-plan par défaut, l’image principale redevient le défaut.

## Sauvegarder et transférer

Chaque modification est automatiquement enregistrée dans **IndexedDB**, y compris les images et les vidéos. Attendez le message **Sauvegardé dans ce navigateur** avant de fermer l’onglet. Les fichiers ne sont jamais placés dans localStorage ni envoyés vers un service cloud ; Supabase n’est pas utilisé.

- **Sauvegarder mon projet** télécharge `presentation-studio.zip`, contenant `presentation.json` et le dossier `medias/`. Faites-le à la fin de chaque séance pour garder une copie indépendante. La date affichée indique seulement la génération du ZIP : vérifiez que le fichier est bien conservé dans votre dossier sécurisé.
- Sur un autre ordinateur, ouvrez l’application, cliquez sur **Importer un ZIP**, choisissez ce fichier et confirmez la restauration. Cette opération remplace la présentation actuelle ; exportez-la d’abord si vous voulez la conserver.
- Les boutons, leurs images, leurs associations, leurs positions, leurs dimensions et l’arrière-plan par défaut sont inclus dans le ZIP. Le format est maintenant en version 2 ; les ZIP et les sauvegardes IndexedDB de la version 1 restent lisibles et sont migrés sans perdre les pages existantes.
- Un ZIP invalide est rejeté avant toute modification. Les références de médias, les types, les tailles et les sommes CRC du ZIP sont vérifiés. Limites d’import : 1 Go de ZIP, 2 Go décompressés, 500 pages, 2 000 médias et 100 variantes par page.
- Les médias du ZIP sont testés pour vérifier leur lisibilité. Le remplacement du projet et une copie locale du projet précédent sont enregistrés dans une seule transaction. Une erreur de stockage conserve le projet existant. **Récupérer le projet précédent** permet de revenir à cette copie après une restauration ; elle reste dans le même navigateur et n’est pas une sauvegarde indépendante.
- Les confirmations de suppression/restauration permettent de **Sauvegarder mon projet puis continuer** avant l’opération.
- **Protéger le stockage local** demande une autorisation de stockage persistant à Chrome. Un refus n’efface pas le projet ; un accord n’empêche ni la suppression manuelle ni la perte de l’ordinateur.
- Les onglets concurrents sont détectés : un onglet obsolète ne peut plus écraser silencieusement un projet plus récent. Une version de données inconnue ou un record illisible n’est jamais remplacé par des démos.
- Le statut affiche un avertissement si le stockage est presque plein ou si la sauvegarde échoue. Un bouton permet de réessayer ; le ZIP peut toujours conserver les modifications présentes en mémoire.

Le stockage appartient à ce navigateur et à cette adresse de l’application. Changer de navigateur/adresse, effacer les données du site ou utiliser une fenêtre privée peut empêcher de retrouver les données. Un ZIP permet de les restaurer. Le fichier HTML autonome contient l’application et ses démos ; vos créations restent dans IndexedDB et doivent être transférées avec le ZIP.

## Commandes du lecteur

- **Espace** ou **flèche droite** : page suivante.
- **Flèche gauche** : précédente.
- **F** ou **⛶** : activer/quitter le plein écran ; **Échap** permet aussi de quitter.
- La transition vidéo est lue automatiquement sans son. La prochaine image est préchargée dès l’arrivée sur la page et montée/décodée pendant la vidéo.
- À la fin de la vidéo, le lecteur conserve sa dernière image jusqu’à ce que la diapositive suivante soit prête, puis effectue une **coupure instantanée**. Le même élément image déjà décodé est conservé lors de cette bascule ; aucun fondu, fondu croisé, zoom ou autre animation CSS n’est appliqué.
- Sans vidéo, en arrière ou si la vidéo ne peut pas être lue, la prochaine page apparaît directement dès que son image est prête. La page actuelle reste visible pendant une éventuelle attente. Une vidéo bloquée pendant plus de huit secondes déclenche également ce passage direct.
- Les commandes restent bloquées pendant la vidéo et la préparation de la page suivante. Une attente prolongée affiche un bouton **Annuler**. Si l’image ne peut pas être décodée, la page actuelle est conservée et un message invite à remplacer l’image dans l’éditeur.
- Le MP4 de démonstration a également été régénéré sans le fondu noir qui était encodé dans son contenu. Les anciennes copies exactes de ce fichier démo stockées dans IndexedDB ou dans un ZIP sont reconnues par leur SHA-256 et mises à jour. Les autres vidéos importées conservent leur contenu : une séquence noire déjà encodée dans une vidéo reste naturellement une partie de cette vidéo.
- Les boutons sont accessibles avec Tab et Espace. Quand un bouton a le focus, Espace active ce bouton.

## Développement

Node.js 20.19+ ou 22.12+ requis (validé avec Node 24).

```sh
npm install
npm run dev
```

Vite utilise le port 5173 par défaut. Le cache npm `.npm-cache/` est ignoré par Git. Aucun secret ni service externe n’est requis.

```sh
npm run build
npm run preview
```

Le build se trouve dans `dist/`. La prévisualisation utilise le port 4173.

```sh
npm run export:html
```

Génère `dist/presentation-player.html`, une version autonome avec l’éditeur, le lecteur et les médias de démonstration intégrés. Ouvrez-la dans un navigateur de bureau récent autorisant JavaScript et IndexedDB pour les fichiers locaux. Les restrictions de stockage du navigateur sont signalées dans l’interface.

## Tests navigateur

```sh
npx playwright install chromium
npm test
```

Pour vérifier le build de production avec les en-têtes prévus pour Vercel :

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:production
```

Le serveur de test local reproduit les fichiers et en-têtes déclarés ; il ne reproduit pas la plateforme Vercel ni son authentification. Le workflow GitHub vérifie le build et les tests avant les revues, mais son exécution distante doit être confirmée une fois le code intégré au dépôt.

Dans cet environnement, Chromium est déjà installé :

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test
```

Les tests vérifient la gestion des pages, les sauvegardes après rechargement, les variantes, l’import PNG/JPEG/WebP/MP4/WebM, le lecteur et le plein écran, la restauration ZIP dans un navigateur vierge, les fichiers invalides, les erreurs de quota simulées et l’affichage mobile. Ils couvrent aussi l’ajout des boutons, le déplacement à la souris, le redimensionnement par poignée, les arrière-plans et leur défaut, l’indicateur désactivable, les proportions en plein écran/mobile, les boutons sans navigation accidentelle, les associations après duplication et les anciennes sauvegardes. Les tests de transition retiennent volontairement le décodage de l’image suivante pour vérifier la dernière frame vidéo, la coupure sans animation et sans remplacement de l’élément image, ainsi que la récupération après une image illisible. Des captures et mesures de pixels vérifient que la fin de la démo et la page suivante ne deviennent pas noires.

## Architecture

- `src/App.jsx` : modes Éditeur / Présentation et statut de sauvegarde.
- `src/Editor.jsx` : opérations visuelles sur les pages et les médias.
- `src/Player.jsx` : lecteur, clavier, plein écran et transitions.
- `src/demoMedia.js` : mise à jour du seul ancien MP4 de démonstration contenant un fondu noir encodé.
- `src/SlideView.jsx` : aperçu partagé et boutons de variantes.
- `src/InteractiveButtons.jsx` : superposition des boutons, gestes de placement/redimensionnement et raccourcis accessibles.
- `src/LayerSettings.jsx` et `src/layers.css` : barre d’outils, liste des calques et propriétés ; tous les éléments partagent la surface de manipulation et de rendu.
- `src/TextBlock.jsx`, `src/TextSettings.jsx`, `src/textModel.js` et `src/text.css` : saisie directe en texte brut, typographie, rendu commun à échelle proportionnelle, hauteur automatique, styles et validation versionnée.
- `src/ButtonSettings.jsx` : liste et panneau de propriétés des boutons, associations et arrière-plan par défaut.
- `src/useSlideInteraction.js` : exécution des actions et états temporaires communs à l’éditeur et au lecteur, indépendants de la configuration sauvegardée.
- `src/actions.js`, `src/ActionSettings.jsx` et `src/ActionVideo.jsx` : modèle et validation des actions, configuration visuelle et lecture vidéo indépendante des transitions.
- `src/document.js` : modèle sérialisable, import de médias et démos initiales.
- `src/storage.js` et `src/usePresentation.js` : transactions IndexedDB, sauvegardes ordonnées et URLs Blob libérées après utilisation.
- `src/archive.js` : format ZIP versionné et validation avant restauration.
- `src/slides.jsx` : composants personnalisés des trois démos. D’autres composants peuvent être ajoutés au registre sans modifier le lecteur.

Une page contient `id`, `title`, `imageId`, `transitionId`, `variants`, `buttons`, `defaultBackground`, `showActiveButton` et un éventuel `demoTemplate`. Une variante contient `id`, `name` et `mediaId`. Un bouton contient `id`, `name`, `imageId`, `target`, `x`, `y`, `width` et `height`. Une cible d’arrière-plan référence l’image principale (`kind: main`), une variante (`kind: variant`, `variantId`) ou un média importé (`kind: media`, `mediaId`). Les médias sont des Blobs séparés de cette configuration. Les duplications partagent les fichiers initiaux mais possèdent leurs propres références, variantes et boutons ; remplacer un média d’une copie ne modifie pas l’original. Les références aux variantes sont remappées lors de la duplication d’une page. Les médias qui ne sont plus utilisés sont retirés lors de la sauvegarde, y compris ceux des boutons et des arrière-plans importés.

La [timeline visuelle (phase 4)](docs/TIMELINE-PHASE-4.md) organise les diapositives et leurs transitions par paires d’identifiants stables. Les vidéos devenues non associées sont conservées et peuvent être réassignées dans l’éditeur.
