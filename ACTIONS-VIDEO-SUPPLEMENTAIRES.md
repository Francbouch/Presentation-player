# Actions supplémentaires des boutons vidéo

Dans les propriétés du bouton, ouvrir **Actions**, choisir **Contrôler les vidéos des calques** ou **Lancer une vidéo**, puis utiliser **Action supplémentaire (facultative)**.

- **Aucune** : comportement historique, aucune propriété ajoutée aux anciens boutons.
- **Calques** : choisir Afficher, Masquer ou Basculer séparément pour chaque calque ou bouton.
- **Groupes de visibilité** : commandes sur les groupes indépendants de l’onglet États, via le système existant de visibilité.
- **Groupes de calques** : commandes sur les membres des groupes géométriques, sans les confondre avec les groupes de visibilité.
- **Changer l’arrière-plan** : seulement pour Contrôler les vidéos des calques ; choix de l’image principale, d’une variante ou d’une image de la bibliothèque via le sélecteur existant.

Choisir **Au clic du bouton** (par défaut) ou **Après la fin de la vidéo**. Au clic, l’action accompagne le démarrage effectif des lecteurs préparés ; elle n’attend jamais la fin des vidéos. Le bouton déclencheur peut se masquer sans empêcher son action vidéo.

## Ordre et interruptions

Pour une commande vidéo intégrée de lecture/reprise, l’action de fin attend les événements `ended` réels de **tous** les lecteurs ciblés. Les callbacks existants sont réutilisés, sans minuterie de durée vidéo. Pause, arrêt et boucle rendent le choix de fin indisponible et affichent une explication. Un ancien réglage de fin conservé sur une commande incompatible ne s’exécute pas.

L’activation d’un état après la vidéo reste une configuration séparée. Si elle accompagne l’action supplémentaire de fin, l’ordre est : **état cible, puis action supplémentaire**. Pour les vidéos intégrées, le résultat composé passe dans la transition d’état existante ; pour Lancer une vidéo, le résultat principal est préparé sous la dernière image vidéo, puis la surcharge est appliquée avant le retrait de la vidéo. Une visibilité supplémentaire conserve l’identifiant de l’état ; un changement de fond suit les règles existantes de changement de fond.

Pause/interruption, erreur, remplacement par une nouvelle commande, changement de page ou sortie du lecteur annulent la demande de fin des vidéos intégrées. Arrêter ou remplacer une vidéo plein écran annule également son action de fin. Les événements d’un ancien lecteur ne déclenchent pas une nouvelle action. Un événement synthétique `ended` sans fin réelle est ignoré par les deux lecteurs.

## Règles conservées et limites

- Les groupes de visibilité restent prioritaires sur les surcharges individuelles ; un dossier parent masqué reste prioritaire. Pour un membre contrôlé par un groupe de visibilité, agir sur ce groupe pour changer sa visibilité effective.
- Masquer un calque vidéo conserve le comportement préexistant : son lecteur est conservé mais mis en pause. Cette interruption annule son action de fin. Aucun nouveau lecteur invisible continuant à jouer n’est créé.
- Une vidéo masquée/indisponible au lancement ne démarre pas. Si une vidéo ciblée manque, les autres peuvent jouer mais la demande de fin commune est annulée.
- Pour **Lancer une vidéo → Passer à une autre page**, les cibles de l’action supplémentaire appartiennent à la page source : l’action s’y applique avant le départ. Elle ne cible pas les objets de la page suivante.
- Les cibles supprimées restent des identifiants détectables et produisent un avertissement. Aucun remplacement par nom ou par une autre cible. Une action supplémentaire invalide est ignorée, sans empêcher la vidéo principale lisible de se lancer.
- Une seule action supplémentaire est proposée par bouton, avec plusieurs cibles possibles. Pas de moteur de séquences indépendant.
- Le schéma passe de 28 à 29, de façon additive. L’absence d’`action.extra` signifie aucune action supplémentaire. Les métadonnées inconnues restent conservées.
- Les nouveaux réglages suivent l’historique, la sauvegarde IndexedDB et l’export/import ZIP existants. Les références sont remappées lors de la duplication de page, d’une sélection et des composants ; les références locales absentes restent signalées lors d’un collage sur une autre page.

## Sécurité

État Git initial propre ; branche `codex/video-supplementary-actions`, point initial `safety/video-extra-initial-20261024` sur `e27e920`, sauvegarde Git complète vérifiée : `/workspace/backups/presentation-player-before-video-extra.bundle`.

Cette sauvegarde protège le code, **pas les présentations IndexedDB de Chrome sur l’ordinateur de l’utilisateur**. Ces données sont inaccessibles ici. Aucun effacement/réinitialisation IndexedDB, changement d’origine ou déploiement en production.

## Fichiers

- `src/VideoExtraSettings.jsx` : panneau compact et avertissements.
- `src/videoExtra.js` : règles, validation, remappage et patch de visibilité partagé avec les actions ordinaires.
- `src/ActionSettings.jsx` : intégration sans duplication des contrôles principaux.
- `src/useSlideInteraction.js` : exécution, composition des actions de fin et annulations, via les lecteurs et états existants.
- `src/ActionVideo.jsx` : vérification de la fin naturelle du lecteur existant.
- `src/actions.js`, `src/document.js`, `src/archive.js` : validation, migration additive, médias ZIP et duplication de page.
- `src/layerClipboard.js`, `src/visualGroups.js`, `src/componentsModel.js` : références de copier/coller, duplication et composants.
- `src/imageLibrary.js` : usages des images de fond supplémentaires dans la bibliothèque.
- `tests/video-extra.spec.js` : scénarios de la nouvelle fonction ; autres tests : assertions de version mises à jour (29).

## Vérifications

Commandes réellement exécutées sur la version finale du code :

1. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:production` : compilation réussie, **267 tests réussis**, deux échecs d’assertions de version dans les modèles de cadres et de lignes (elles attendaient encore 28 au lieu de 29), en 9,2 minutes. Les **21 nouveaux scénarios** ont tous réussi dans cette suite.
2. Après correction de ces deux attentes : `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:production -- tests/media-frames.spec.js tests/vector-lines.spec.js --grep 'modèle'` : nouvelle compilation réussie, **2 tests réussis**, aucun échec.
3. `git diff --check` : réussi.

Les 269 scénarios ont donc été vérifiés avec succès au total après correction ; il ne s’agit pas d’un unique lancement local avec 269 résultats verts. La pull request relance la suite entière sur GitHub.

Couverture : visibilité des calques et des deux types de groupes, fonds, clic/fin, Test/Présentation, état puis surcharge, transition d’état animée, pause/arrêt/interruption, masquage du bouton et de sa vidéo, fin de plusieurs vidéos exactement une fois, références supprimées, anciennes présentations, remappage de copies, Undo/Redo, rechargement IndexedDB et véritable aller-retour ZIP (avec import invalide rejeté sans remplacement).

La suite existante a aussi vérifié plein écran, transitions MP4/CSS, overlays, cadrage, effets, composants, notes, textes, timeline, stockage, conflits et ZIP. Avertissement Vite préexistant sur la taille du bundle (> 500 ko), sans échec de compilation.

Limite de vérification : navigateur Chromium de cet environnement et données de test synthétiques. Pas d’accès aux données Chrome réelles de l’utilisateur ni de test authentifié sur son Vercel de production.
