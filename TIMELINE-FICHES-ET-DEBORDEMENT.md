# Timeline : transparence, débordement, fiches visuelles et centrage sur la diapositive

## Essayer dans studio.

### Fond transparent

Sélectionner **Ligne du temps**, ouvrir **Apparence de la ligne du temps**, cocher **Arrière-plan transparent**. Le fond coloré est conservé pour pouvoir revenir à son apparence précédente. L’opacité globale du calque reste indépendante ; lignes, points, textes et fiches gardent leur propre apparence.

### Grande ligne du temps et sélection hors page

Dans **Position et dimensions**, saisir par exemple **Largeur : 400 %**, **X : −100 %**, **Hauteur : 50 %**, **Y : 25 %** pour une grande Timeline horizontale. Les poignées et le déplacement à la souris fonctionnent également au-delà du cadre 16:9.

Utiliser **Ajuster la sélection** pour retrouver les poignées, puis le zoom et **Espace + glisser** pour se déplacer dans l’espace de travail. Le panneau Calques permet toujours de retrouver et sélectionner un élément hors champ. Les autres types de calques conservent leurs contraintes géométriques.

En Test et Présentation, seul le contenu à l’intérieur de la diapositive apparaît. Les commandes de navigation et de phases des Timelines qui dépassent la page restent accessibles dans le plan de la diapositive.

### Zoom et fiche ensemble

Choisir une étape dans **Étapes**. Dans **Fiche et interaction de l’étape**, activer indépendamment :

- **Zoomer sur l’étape**.
- **Afficher la fiche d’information**.

Les deux peuvent fonctionner ensemble. Le zoom commun doit être activé dans **Progression, zoom et navigation**. Le menu historique **Clic sur l’étape** reste disponible ; le changer rétablit le comportement de base correspondant. Les anciens projets conservent ces comportements tant que les nouvelles options ne sont pas utilisées.

### Disposition commune et individuelle des fiches

Dans la même section :

1. Choisir **Utiliser la disposition commune** ou **Personnaliser pour cette étape**.
2. Cliquer sur **Modifier la fiche dans la page**.
3. Faire glisser la barre **Déplacer la fiche** ou utiliser les huit poignées pour la dimensionner.
4. Cliquer sur **Terminer la fiche**, ou appuyer sur Échap.

Le bandeau précise si l’on modifie la disposition commune ou individuelle. Les quatre champs X, Y, largeur et hauteur en pourcentage offrent aussi une saisie précise. La disposition commune s’applique à toutes les étapes sans surcharge. La disposition individuelle reste inchangée lorsque la disposition commune évolue. **Réinitialiser la disposition individuelle** rétablit l’héritage.

La position et les dimensions sont relatives à la diapositive, sans dépendre de la position, de la rotation ou du zoom de la Timeline. Le contenu défile à l’intérieur si nécessaire. Images et vidéos gardent leur rapport d’aspect. Les vidéos ne jouent pas automatiquement pendant l’édition de la fiche. Un déplacement/redimensionnement constitue une opération Undo/Redo ; Échap pendant une manipulation l’annule. Les raccourcis Undo/Redo restent accessibles depuis la fiche.

Pour une ancienne Timeline sans disposition enregistrée, son placement automatique est conservé. L’ouverture de l’édition visuelle crée une disposition commune dans la page. Les anciens réglages de largeur/hauteur restent disponibles tant que ce placement automatique est utilisé ; les nouvelles dispositions utilisent les champs en pourcentage.

### Centrage fluide

Dans **Progression, zoom et navigation**, activer **Centrer automatiquement l’étape active**. L’animation précédente est conservée : activée par défaut, **700 ms**, plage **200–1500 ms**, courbes **Ease In-Out**, **Ease Out**, **Linear**, possibilité de désactivation et respect de la réduction des mouvements.

- Horizontale : centrage horizontal sur la diapositive.
- Verticale : centrage vertical sur la diapositive.
- Zigzag : centrage sur les deux axes.
- Avec un zoom : centrage sur les deux axes, en tenant compte de l’échelle et de la rotation du calque.

La première étape visible est centrée à l’entrée lorsque cette option est activée (sauf révélation initiale à zéro). Les sélections suivantes repartent de la position visuelle courante. Espace révèle une seule étape puis la centre, avant de reprendre la navigation de diapositive à la fin. Le précédent revient à l’étape correspondante. Les fiches configurées restent fixes dans la page. Aucune coordonnée du calque n’est réécrite pendant le test ou la présentation.

## Architecture et compatibilité

Format **32**, compatible avec les anciens formats pris en charge. Nouvelles propriétés facultatives :

- `timeline.design.backgroundTransparent` : booléen, sans remplacer le HEX de fond existant.
- `timeline.design.cardLayout` : rectangle commun `{x,y,width,height}` relatif à la diapositive.
- `timeline.steps[].cardLayout` : rectangle individuel facultatif ; `null` / absence = héritage.
- `timeline.steps[].zoomOnSelect` et `cardOnSelect` : booléens facultatifs, avec repli sur le champ historique `click`.

Les valeurs présentes sont validées strictement. La migration ne remplace ni étapes, ni phases, ni médias, ni métadonnées inconnues. IndexedDB, ses magasins et la logique transactionnelle ZIP existante sont conservés. Les grands cadres restent valides lors de duplication, copier/coller entre diapositives et réutilisation / publication des composants liés.

Les animations réutilisent la transformation native commune translation + échelle, sans nouvelle dépendance ni boucle JavaScript à chaque image. Les fiches et, si nécessaire, les commandes sont rendues dans le plan de la diapositive via les portails React existants. Les modes d’édition et de présentation sont séparés ; changer de contexte, masquer un calque ou changer de page nettoie ses affichages temporaires.

## Sauvegarde de sécurité

- État initial propre, basé sur `origin/main` **440bf72** (PR 38 intégrée).
- Branche dédiée : **codex/timeline-cards-and-overflow**.
- Point initial : **safety/timeline-completion-initial-20261025**.
- Archive Git complète vérifiée : `/workspace/backups/presentation-player-before-timeline-completion.bundle` ; vérification `/tmp/timeline-completion-backup.log`.
- Points intermédiaires : **dd0047d** (transparence / format), **6c5393e** (débordement), **d9147a4** (zoom + fiche), **cf4f3f4** (édition visuelle), **4e108b3** (centrage diapositive).

Cette sauvegarde protège le **code**, pas les présentations de Chrome : aucun accès au navigateur personnel de l’utilisateur et aucun export de ses données IndexedDB. Aucune suppression ni réinitialisation de données. Les tests utilisent uniquement des projets et médias de démonstration isolés.

Aucun déploiement automatique en production ni changement GitHub/Vercel ou d’authentification.

## Tests réellement exécutés pendant l’implémentation

Les compilations de production successives ont réussi.

- Transparence : **1 test réussi**, `/tmp/timeline-completion-phase1-final.log`.
- Débordement et manipulation : **12 tests réussis**, `/tmp/timeline-completion-phase2.log`.
- Zoom + fiche et régression native : **18 tests réussis**, `/tmp/timeline-completion-phase3.log`.
- Édition des fiches et priorité clavier multi-Timelines : **2 tests ciblés réussis après adaptation des sélecteurs aux portails**, `/tmp/timeline-completion-phase4-final.log`.
- Centrage diapositive, animations existantes et nouvelles interactions : **19 tests réussis**, `/tmp/timeline-completion-phase5-final.log`.
- Intégration finale dédiée : **12 tests réussis**, `/tmp/timeline-completion-final-targeted.log` : 24 étapes, médias réels de démonstration, fiches individuelles et communes, manipulation à la souris, commandes de phases, héritage des composants liés, copie, Undo/Redo, rechargement, transfert ZIP dans un autre contexte, ancienne archive v31, point cliquable même quand le cadre est entièrement hors page, plein écran, trois dispositions, réduction des mouvements et centrage avec rotation.

La validation complète utilise :

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:production
```

Le rapport de cette exécution est `/tmp/timeline-completion-full.log`. Le résultat final et celui de GitHub Actions figurent dans la pull request et la réponse de livraison.

## Fichiers modifiés

### Rendu, propriétés et géométrie

- `src/MilestoneTimeline.jsx`
- `src/MilestoneTimelineSettings.jsx`
- `src/MilestoneTimelineInteractions.jsx`
- `src/MilestoneTimelineAnimationSettings.jsx`
- `src/MilestoneTimelineThumbnail.jsx`
- `src/milestoneTimeline.js`
- `src/milestoneTimeline.css`
- `src/TimelineCardFrame.jsx` (nouveau)
- `src/TimelineCardLayoutSettings.jsx` (nouveau)
- `src/TimelineSlideControls.jsx` (nouveau)
- `src/InteractiveButtons.jsx`
- `src/LayerSettings.jsx`
- `src/Editor.jsx`
- `src/manipulation.js`
- `src/layerClipboard.js`
- `src/visualGroups.js`
- `src/componentsModel.js`
- `src/document.js`
- `src/archive.js`

### Tests

- `tests/timeline-completion.spec.js` (nouveau)
- `tests/timeline-centering.spec.js` : centrage mesuré sur la diapositive, sélecteur de fiche indépendante, format courant et scénario d’annulation adapté au centrage initial.
- `tests/milestone-timeline.spec.js` : médias et fermeture des fiches dans le nouveau plan indépendant, format courant.
- Assertions de version courante uniquement : `actions`, `background-model`, `button-appearance`, `button-shapes`, `buttons`, `editor-shortcuts`, `effects`, `fonts`, `layers`, `library-crop`, `media-frames`, `state-visibility`, `text`, `timeline`, `vector-lines`, `video-extra` (fichiers `.spec.js`). Les entrées historiques restent anciennes pour vérifier leur migration.

## Limites

- Pour protéger le navigateur contre des géométries invalides, positions bornées à **−2000 % / +2000 %**, dimensions entre **2 % et 2000 %**, uniquement pour les Timelines. Le zoom du canevas et son déplacement permettent d’atteindre les poignées hors champ.
- Les fiches configurées restent dans la diapositive ; largeur et hauteur de **4 % à 100 %**. La largeur minimale peut être trop petite pour un contenu confortable : agrandir la fiche ou laisser son défilement interne.
- Une disposition horizontale conserve son placement vertical sans zoom ; une verticale conserve son placement horizontal. Zigzag et zoom centrent les deux axes.
- Les anciennes fiches gardent leur placement automatique tant qu’une disposition commune/individuelle n’a pas été définie.
- Vérification automatisée sous Chromium avec médias de démonstration, pas sur le navigateur ni les projets privés de l’utilisateur. Safari et Firefox n’ont pas été exécutés. Pas de promesse de FPS pour des milliers d’étapes.
- L’avertissement Vite existant sur la taille du bundle demeure ; aucune bibliothèque lourde ajoutée.
