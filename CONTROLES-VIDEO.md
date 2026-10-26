# Commandes facultatives des calques vidéo

## Utilisation

1. Sélectionnez un rectangle ou un cercle contenant une vidéo locale.
2. Dans **Lecture vidéo**, cochez **Afficher les contrôles vidéo**.
3. En **Test** et en **Présentation**, utilisez les commandes du lecteur pour
   lire, mettre en pause, avancer, revenir en arrière, régler le volume,
   couper/rétablir le son ou ouvrir le plein écran si le navigateur le permet.

Dans l’éditeur, **Interagir avec la vidéo** ouvre temporairement les commandes,
même lorsque la case de présentation est décochée. Désactivez ce mode, appuyez
sur Échap ou cliquez sur **Revenir à la manipulation du calque** pour déplacer et
redimensionner normalement le cadre. Changer de sélection/page/mode ferme aussi
ce mode temporaire. Celui-ci n’est pas enregistré dans le projet.

## Intégration

- Commandes HTML5 natives pour les rectangles sans transformation interne.
- Pour un cercle, un déplacement interne, une rotation interne ou un zoom du
  contenu, une barre HTML légère pilote **le même élément vidéo**. Les commandes
  natives seraient recadrées avec l’image et pourraient devenir inaccessibles.
  La barre reste donc attachée au cadre, sans modifier le cadrage ni le fichier.
- Les commandes clavier sont réservées au lecteur lorsqu’il possède le focus ;
  ailleurs, les raccourcis de Studio continuent de fonctionner. Un clic ou un
  glissement sur les commandes ne déplace pas le calque ni la page.
- Le volume et la position de lecture sont temporaires. La sourdine, la boucle,
  la vitesse, l’autoplay et le comportement de fin enregistrés restent inchangés.
- Le réglage `frameMedia.playback.controls` est facultatif : absent = désactivé.
  Format39, migration additive depuis1–38, métadonnées et médias conservés.
  IndexedDB, ZIP, composants, duplication et historique utilisent les chemins
  existants ; aucune autre base, dépendance ou requête réseau ajoutée.
- Les lecteurs YouTube et les vidéos servant de transitions restent distincts.

## Limites

Les commandes natives et leur présentation exacte dépendent du navigateur et de
la taille du cadre. Donnez une taille suffisante aux petits cadres pour disposer
des commandes complètes. Le plein écran natif affiche la vidéo ; celui de la
barre de remplacement affiche le cadre. Les calques voisins de la diapositive
n’accompagnent pas le plein écran individuel du lecteur.

Les vidéos de ces cadres ne possèdent actuellement pas de plage début/fin :
`playback.end` désigne l’apparence à la fin (dernière image / première image /
masquer), pas une limite temporelle. Aucune plage ni réglage de transition ou de
vidéo de bouton n’a été changé par cette amélioration.

Les restrictions d’autoplay du navigateur continuent de s’appliquer, notamment
avec le son. Les formats lisibles dépendent des codecs du navigateur.

## Sécurité et validation

Branche dédiée ; état initial propre, tag `safety/video-controls-initial-20261026`
et bundle Git vérifié dans `/workspace/backups/`. Ce sont des sauvegardes de code,
pas des présentations IndexedDB du Chrome de l’utilisateur, auquel cet
environnement n’a pas accès. Aucun effacement de données ni déploiement produit.

Tests navigateur : `tests/local-video-controls.spec.js`, complétés par la suite
existante (cadres, cadrage, actions de fin, états, YouTube, ZIP, historique).
Les tests emploient exclusivement les médias synthétiques de `tests/fixtures`.
