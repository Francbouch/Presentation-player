# Cadres multimédias

## Utilisation

1. Sélectionnez une forme ou une image. Dans **Bordure**, activez la bordure puis réglez sa couleur, son épaisseur (0 à 100 px) et son opacité. Le trait est intérieur au cadre. Pour un rectangle, les coins arrondis se règlent dans **Remplissage**.
2. Pour une forme transparente, choisissez **Remplissage → Transparent / Aucun remplissage**. La bordure garde sa propre opacité. Le calque reste sélectionnable dans Calques.
3. Ajoutez un **Cercle** ou un **Rectangle**. Dans **Contenu multimédia**, importez un fichier ou choisissez une ressource existante. Vous pouvez aussi déposer un fichier sur la forme ou glisser une image/vidéo depuis Médias. Images : PNG/JPEG/WebP. Vidéos : MP4/WebM décodables par le navigateur.
4. Double-cliquez sur le cadre ou utilisez **Modifier le contenu** : glissez pour déplacer le média à l’intérieur du cadre fixe. **Cadrage du contenu** propose échelle, rotation, position, Remplir, Ajuster, Centrer et Réinitialiser. Échap termine l’ajustement. Une manipulation glissée correspond à une seule annulation.
5. Pour une vidéo, **Lecture vidéo** propose démarrage automatique, boucle, son, vitesse (0,5× à 2×) et comportement de fin. Les valeurs initiales sont : démarrage manuel, muet, une lecture à vitesse normale et **Conserver la dernière image**. Le bouton d’aperçu sur le cadre permet une lecture contrôlée pendant l’édition.
6. Pour trois bulles, créez trois cercles et insérez une vidéo dans chacun. Ajoutez un bouton. Dans **Actions**, choisissez **Contrôler les vidéos des calques**, cochez les trois noms et conservez **Recommencer et lire depuis le début**. **Tester l’action** lance les trois vidéos. Un nouveau clic recommence les trois, même après leur fin.
7. Les autres commandes sont **Reprendre la lecture**, **Mettre en pause**, **Arrêter et remettre au début**. Les durées des vidéos peuvent être différentes : chaque cadre applique sa propre fin indépendamment.

## Architecture et conservation

- Les types de calques existants sont conservés. Une forme reçoit un `frameMedia` facultatif : identifiant de média, type, cadrage interne et paramètres de lecture. `border`, `fillMode`, `fillOpacity` et `cornerRadius` sont également facultatifs. Les anciens calques gardent leur géométrie et leurs valeurs initiales.
- Format de document **15**, compatible avec les formats 1 à 14. Migration additive sans effacement IndexedDB ni changement de base, d’origine ou de configuration Vercel. Métadonnées inconnues conservées.
- Les médias de cadres appartiennent à la bibliothèque existante : réutilisation par identifiant, détection de fichiers identiques, remplacement global des images liées et aucune copie binaire lors des duplications.
- Les réglages utilisent l’historique et la sauvegarde existants. La lecture, la position temporelle et le masquage temporaire ne sont pas enregistrés dans le projet ni dans Undo/Redo.
- Le ZIP conserve les médias et toutes les propriétés. Validation des références, types, valeurs et fichiers avant restauration. Les références d’actions vers les cadres sont remappées lors des copies de sélections, pages et composants.
- `FrameSurface` maintient les lecteurs de la page montée et capture l’image de fin dans un canvas temporaire. Aucun fichier supplémentaire n’est stocké. Les ressources disparaissent avec la page. Les miniatures de timeline ne chargent pas de vidéos : elles affichent un symbole de lecture ; les cadres image affichent leur cadrage.
- `useSlideInteraction` réutilise les actions et la visibilité existantes. Les vidéos masquées restent montées mais sont mises en pause. Une commande de lecture ne force pas leur visibilité. Les commandes en attente sont annulées lors d’un remplacement, d’une navigation ou d’une sortie du Test.

## Limites techniques

- Plusieurs lecteurs HTML peuvent démarrer ensemble, mais leur synchronisation exacte à l’image près ne peut pas être garantie. Les lecteurs attendent leurs données et leur repositionnement avant de recevoir `play()` dans la même opération.
- Une vidéo illisible n’empêche pas les autres de démarrer. L’attente des données est bornée à 5 secondes et celle du repositionnement à 2 secondes. Les refus de lecture et formats non pris en charge sont signalés.
- Le son et la lecture automatique restent soumis aux règles du navigateur. Le mode muet est recommandé pour les lancements groupés.
- La capture finale conserve une image décodée en mémoire, proportionnelle à la résolution vidéo. Si la capture est indisponible, le lecteur reste monté sur son image finale. Aucun fondu ni retour automatique au début en mode « Conserver ».
- Les cadres multimédias sont proposés pour cercles et rectangles (dont rectangles arrondis). Les lignes restent des formes sans contenu multimédia ; elles acceptent remplissage et bordure.
- Aucune nouvelle timeline à keyframes ni dépendance externe n’a été ajoutée.

## Vérification

Les nouveaux tests navigateur couvrent bordures, transparence, cadrage et déplacement interne, import/dépôt, médias partagés, vidéo en cercle, lancement de trois lecteurs, pause/reprise/arrêt, fins figée/première image/masquage, boucle, état masqué, erreur isolée, plein écran, annulation, rechargement IndexedDB et véritable export/import ZIP dans un autre contexte navigateur. Les tests de modèle vérifient migration, validation, duplication, remappage des actions et composants.

Commande complète :

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:production
```
