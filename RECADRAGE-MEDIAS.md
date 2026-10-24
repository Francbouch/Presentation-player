# Correction du cadrage des médias dans les formes

## Cause

Le lecteur plaçait l’image ou la vidéo dans un élément de largeur et hauteur `100 %` du masque, puis utilisait `object-fit: cover`. Un cercle donnait donc une première boîte carrée qui cachait les côtés du média rectangulaire. Le déplacement et la rotation déplaçaient ensuite cette boîte déjà recadrée. Les fichiers originaux restaient intacts, mais leurs pixels extérieurs n’étaient plus accessibles à travers ce rendu.

Le même calcul existait pour les images de boutons disposant d’un cadrage.

## Correction

Le média est ajusté proportionnellement à partir de ses dimensions intrinsèques (`naturalWidth/naturalHeight`, `videoWidth/videoHeight`). Sa largeur, son ratio, sa position, sa rotation et son zoom sont indépendants du masque. Cover et Contain utilisent la taille réelle du masque, observée sans dépendre du zoom du canevas ou de la rotation du calque. La découpe intervient uniquement au niveau du masque final.

Pendant le cadrage, le même élément image/vidéo est révélé hors du masque avec son contour rectangulaire complet. Le contour du masque reste fixe et visible. Le média peut aussi être saisi dans sa partie visible à l’extérieur du masque. Les flèches et le déplacement à la souris conservent les coordonnées relatives au cadre. Les anciennes limites de déplacement de ±200 % sont élargies pour pouvoir atteindre les bords des médias agrandis. Le curseur d’échelle existant permet de redimensionner le contenu indépendamment de la forme.

Aucune copie de vidéo, aucun redémarrage à chaque déplacement, aucun nouveau moteur de lecture. Les réglages de durée, vitesse, boucle, événements et actions ne changent pas.

## Utilisation

1. Sélectionner le cercle, rectangle ou bouton contenant le média.
2. Cliquer sur **Modifier le contenu** pour une forme, ou **Ajuster l’image** pour un bouton ; le double-clic fonctionne également.
3. Faire glisser le média derrière le masque fixe. Les limites complètes du média sont affichées.
4. Régler **Échelle du contenu** (ou **Zoom de l’image** du bouton), puis cliquer sur **Terminer** ou appuyer sur **Échap**.

**Centrer/Recentrer** et les commandes Cover/Contain existantes sont conservés. Hors cadrage, seul le contenu à l’intérieur du masque reste visible.

## Fichiers modifiés

- `src/mediaGeometry.js` : ajustement proportionnel et transformation du média original, partagés par formes et boutons.
- `src/useMaskDimensions.js` : observation de la taille réelle du masque ; nettoyage de l’observateur à la sortie.
- `src/FrameSurface.jsx` : dimensions intrinsèques des images, vidéos et dernière image figée ; conservation du même lecteur.
- `src/ButtonSurface.jsx` : même géométrie pour les images de boutons cadrées ; les images historiques sans réglage de cadrage gardent leur présentation existante.
- `src/InteractiveButtons.jsx`, `src/ImageCrop.jsx`, `src/layers.css` : aperçu complet, contour du masque et passage édition/rendu masqué.
- `src/FrameSettings.jsx`, `src/mediaFrames.js`, `src/imageLibrary.js` : aide et limites de déplacement cohérentes.
- `src/document.js`, `src/archive.js` : version documentaire 27, compatibilité additive et validation des nouvelles limites.
- `tests/intrinsic-crop.spec.js` : neuf scénarios de régression, dont vérification des pixels réellement affichés.
- `tests/fixtures/crop-landscape.mp4`, `tests/fixtures/crop-portrait.mp4` : vidéos de test synthétiques, sans média utilisateur. FFmpeg a servi à leur création ; les tests ne nécessitent pas son installation.
- Les assertions de version documentaire des tests existants attendent désormais 27 ; les fixtures d’anciennes versions restent anciennes.

## Compatibilité et sécurité

Les valeurs de cadrage déjà enregistrées ne sont ni recalculées ni réinitialisées. Les unités X/Y restent proportionnelles au masque. L’affichage des pixels jusque-là cachés est corrigé à partir de ces mêmes valeurs. Les médias sont conservés octet pour octet, ce que vérifie notamment l’export ZIP d’une image de test.

Format 27 : prise en charge des déplacements au-delà des anciennes limites, avec conservation des métadonnées inconnues. Les noms de base IndexedDB et des magasins ne changent pas. Historique, copies, calques, groupes, états, overlays et transitions restent gérés par leur logique existante.

Branche dédiée `codex/intrinsic-media-crop`, basée sur `a036a99` (dépôt initial propre). Point de restauration : `safety/intrinsic-crop-initial-20261023`. Bundle Git initial vérifié : `/workspace/backups/presentation-player-before-intrinsic-crop.bundle`.

Cette sauvegarde protège le code. Je n’ai pas accès aux données IndexedDB de votre Chrome et n’en ai pas créé d’export. Tous les essais portent sur des données fictives dans des navigateurs de test isolés. Aucune réinitialisation des données utilisateur ni déploiement en production.

## Tests réellement exécutés

- **30 tests ciblés réussis**, compilation de production comprise : `intrinsic-crop`, `media-frames`, `library-crop`, `button-shapes`.
- Images 16:9, portrait et carrée dans un cercle ; rectangle non carré et bouton elliptique.
- Vidéos 16:9 et portrait : ratio, identité du lecteur, conservation du temps courant et absence de nouveau chargement pendant le cadrage.
- Déplacements X/Y, échelle, taille de forme, zoom du canevas, mode Présentation.
- Undo/Redo, duplication, copier/coller entre pages, rechargement et véritable export/import ZIP ; octets originaux préservés.
- Contrôle de pixels : un bord d’image inaccessible avec le précédent rendu est effectivement visible après déplacement ; les portions hors masque sont visibles pendant l’édition.
- Inspection visuelle d’une capture de l’éditeur avec le média rectangulaire complet et le cercle de cadrage.

**235 tests de la suite complète réussis en 8,0 minutes**, avec compilation de production réussie. Après la finition de la saisie hors masque, **22 tests ciblés supplémentaires réussis**, avec une nouvelle compilation de production.

## Limites

Le cadrage reste borné à l’échelle existante de 10 % à 500 %. Les parties dépassant la fenêtre visible du canevas peuvent nécessiter un zoom arrière ou un déplacement de la vue. Le masque n’affiche pas ces parties en dehors du mode de cadrage. Les essais automatisés ont été exécutés sous Chromium ; ils ne remplacent pas une vérification de votre propre projet dans Chrome.

La compilation conserve l’avertissement préexistant de taille du bundle JavaScript supérieur à 500 ko ; elle réussit.
