# Calque natif « Ligne du temps »

## Comment l’essayer dans studio.

1. Dans l’éditeur, cliquer sur **+ Ligne du temps** (icône de chronologie dans la barre d’ajout à gauche du canevas). Il s’agit d’un nouveau calque ; la timeline des diapositives en bas de l’application reste inchangée.
2. Sélectionner ce calque pour afficher **Disposition de la ligne du temps**, **Apparence**, **Étapes**, **Phases**, **Interactions** et **Progression, zoom et navigation**.
3. Dans **Étapes**, choisir une entrée et modifier son nom, sa description, son statut, sa date, son icône ou sa couleur. Utiliser Ajouter/Dupliquer/Supprimer, Monter/Descendre ou glisser une entrée devant une autre.
4. Dans **Phases**, créer les grandes sections, puis choisir **Phase de l’étape** pour y affecter les étapes. Les boutons des phases permettent de les déployer/réduire en lecture. Le réglage « au départ » est sauvegardé ; les ouvertures pendant la présentation sont temporaires.
5. Pour une fiche, choisir **Clic sur l’étape → Afficher une fiche au clic**. On peut importer/réutiliser une image et une vidéo. Les vidéos utilisent les contrôles du lecteur média existant ; seule la fiche ouverte charge ses médias vidéo.
6. Pour présenter progressivement, activer **Révélation progressive**, choisir le nombre initial, le type/durée d’apparition et le déclenchement par clic ou **barre d’espace**.
7. Cliquer sur **Tester les interactions** ou **Présentation**. Une étape peut être sélectionnée, ouvrir sa fiche ou zoomer. Les commandes proposent l’étape précédente/suivante, le zoom sur l’étape active et **Vue d’ensemble**. Les phases ont leur propre bouton de zoom.
8. Un **double-clic** sur le calque entre en édition interne : cliquer sur une étape la sélectionne pour ses propriétés et permet de modifier son titre dans le canevas. **Terminer l’édition interne** ou Échap quitte ce mode. En dehors de ce mode, déplacer/redimensionner le calque manipule la ligne entière.
9. Pour réutiliser la définition : dupliquer/copier-coller le calque, ou saisir un nom dans **Composant** et cliquer **Créer un composant**. La bibliothèque permet d’insérer d’autres instances.

Les trois étapes initiales sont génériques. Aucun contenu du projet « Lit cabinet » n’est imposé aux nouveaux documents.

## Fonctionnalités livrées

| Domaine | Fonctionnement |
|---|---|
| Calque unique | Position et dimensions proportionnelles à la diapositive 16:9, rotation, opacité, verrouillage d’édition, ordre, groupes, suppression, duplication, copier/coller et historique existants. Les étapes ne créent pas de calques indépendants. |
| Étapes | Identifiants stables locaux au composant ; nom, description, informations supplémentaires, statut, couleur facultative, icône texte/emoji, date/période libre, image, vidéo, phase, visibilité et clic. |
| Dispositions | Horizontale, verticale, zigzag ; espacement, marges, alignement transversal, points, ligne, titres au-dessus/en dessous/alternés, police et taille, dates/descriptions/icônes affichables. Les longues lignes défilent sans réduire automatiquement le texte. |
| Préréglages | Minimaliste, Professionnel, Présentation, Compact. Ils appliquent des valeurs modifiables, sans modèle rigide. Palette de couleurs du projet et polices existantes réutilisées. |
| Révélation | Nombre initial, clic sur Suivante, Espace, retour via Précédente ; apparition directe, fondu, glissement ou agrandissement léger. Le défilement interne accompagne les nouvelles étapes hors champ. |
| Sélection | Une étape active par défaut de fonctionnement (sélection exclusive) ; option de sélection multiple. Agrandissement, halo, couleur, opacité, gras ou atténuation des autres étapes, avec les réglages pertinents. |
| Fiches | Fenêtre près de l’étape, panneau latéral ou zone ancrée en bas ; fond, texte, bordure, coins, ombre, largeur/hauteur maximale et durée de fondu. Fermeture par bouton/Échap. Contenu défilable et contenu complet conservé. |
| Médias | Images PNG/JPG/JPEG/WebP et vidéos MP4/WebM via l’import existant ; choix parmi les médias du projet ; retrait d’une référence sans suppression du fichier. Import identique réutilisé par empreinte, sans doublon. Lecture automatique muette facultative pour la fiche ouverte uniquement. |
| Phases | Création, nom/couleur, affectation, ordre, état initial réduit ; résumé et ouverture au clic. Supprimer une phase propose de conserver ses étapes sans phase ; on peut les réaffecter avant suppression. |
| Progression | Trait animé sur le même tracé que les étapes, y compris en zigzag. Automatique selon le jalon actif/révélé ou position manuelle du trait. Aucun pourcentage réel d’achèvement n’est calculé ou affiché automatiquement. |
| Zoom | Étape ou phase, intensité/durée et retour à la vue d’ensemble ; la vue de phase filtre temporairement les autres phases. Transformations et défilement internes uniquement, sans changer le zoom de l’éditeur ni les données des étapes. |
| Compatibilité | Test et Présentation, états et groupes de visibilité, changements d’état sans fiche fantôme, lecteur vidéo réutilisé, miniatures des diapositives/états/composants, IndexedDB, ZIP, Undo/Redo et bibliothèque de composants. |

L’ordre des étapes est la chronologie globale. Affecter une phase conserve les identifiants ; glisser une étape devant une étape d’une autre phase l’y réaffecte. Réordonner les phases déplace leurs blocs d’étapes. Supprimer une phase conserve ses étapes et l’ordre courant. Les identifiants internes sont locaux au calque : une copie a un nouvel identifiant de calque et ses références internes restent cohérentes.

## Clavier et priorité

- En Présentation, **Espace** révèle une étape tant qu’une ligne du temps visible, configurée et non bloquée en a encore une à révéler. Une seule consomme la frappe : dernière utilisée/focalisée, puis premier plan. Quand toutes sont révélées, la navigation des diapositives reprend.
- Cela fonctionne aussi avec une étape focalisée. Les autres boutons, champs et contrôles média conservent leur comportement natif. Les répétitions/modificateurs et champs de texte ne sont pas détournés.
- Le mode Test utilise la même révélation, sans ajouter une nouvelle navigation générale aux pages de l’éditeur.
- Les flèches sur une étape focalisée changent la sélection interne ; ailleurs, la navigation de présentation reste celle de studio. **F** garde sa fonction de plein écran hors des champs/contrôles média.
- **Échap** ferme une fiche et quitte le zoom/l’édition interne locale sans supprimer de données.
- Les préférences système de réduction des animations sont respectées, y compris pour le défilement.

## Données persistantes et état de lecture

Le nouveau type est `milestoneTimeline`, dans `page.layers`. Son objet `timeline` contient `steps`, `phases` et `design`. Les références image/vidéo utilisent les identifiants des médias existants.

Étape active, sélection multiple, nombre révélé, fiche ouverte, phases déployées et zoom sont des états React temporaires. Ils ne réécrivent pas le document. Un changement d’état de page ou de mode réinitialise cette lecture et ferme les fiches avant peinture. Quitter l’édition interne retire également son zoom et ses fiches temporaires. Masquer le calque le démonte proprement ; le réafficher ou revenir à une page reprend la configuration initiale. Les lecteurs des fiches sont arrêtés et nettoyés à la fermeture.

La visibilité est celle du système central des calques/états/groupes. Le composant n’impose pas sa présence au-dessus des vidéos. Il reçoit les mêmes options de visibilité vidéo que les autres calques ; si elles sont explicitement utilisées, il reste inerte pendant l’overlay.

Schéma **30**, migration additive depuis les versions antérieures. Aucun ajout de ligne du temps dans les anciens projets, aucune modification des identifiants existants, de la base `presentation-studio` ou de ses stores. Métadonnées inconnues conservées. ZIP validé avant restauration ; une configuration invalide conserve le projet courant. Les médias absents gardent une référence signalée, sans substitution automatique ; un média présent avec un type incompatible est rejeté.

## Développement progressif et sécurité

- État initial propre, base `04da1dc`, branche `codex/native-milestone-timeline`.
- Point initial : `safety/native-timeline-initial-20261025`.
- Sauvegarde Git complète vérifiée : `/workspace/backups/presentation-player-before-native-timeline.bundle`.
- Phase 1 : `6d626a1`, tag `safety/native-timeline-phase1-20261025`.
- Phase 2 : `2b6a058`, tag `safety/native-timeline-phase2-20261025`.
- Phase 3 : `cce7867`, tag `safety/native-timeline-phase3-20261025`.
- Point final après validation : `safety/native-timeline-phase4-20261025`.

Cette sauvegarde Git ne sauvegarde pas les présentations IndexedDB de Chrome sur l’ordinateur de l’utilisateur. Ces données sont inaccessibles ici. Aucun effacement/réinitialisation IndexedDB, service cloud, dépendance lourde ou déploiement en production n’a été ajouté.

## Fichiers

- `src/milestoneTimeline.js` : modèle, préréglages, ordre, géométrie partagée, calcul du parcours et validation.
- `src/MilestoneTimeline.jsx`, `src/milestoneTimeline.css` : rendu, lecture temporaire, édition interne, fiches, progression, zoom, focus et défilement.
- `src/MilestoneTimelineSettings.jsx`, `src/MilestoneTimelineInteractions.jsx`, `src/MilestoneTimelineAnimationSettings.jsx` : interface de configuration.
- `src/MilestoneTimelineThumbnail.jsx`, `src/TimelineThumbnail.jsx`, `src/ComponentLibrary.jsx` : aperçus statiques utilisant la même géométrie, sans vidéos de fiches chargées.
- `src/Editor.jsx`, `src/LayerSettings.jsx`, `src/Workspace.jsx`, `src/InteractiveButtons.jsx`, `src/SlideView.jsx` : ajout, sélection, propriétés, édition interne et rendu comme calque normal.
- `src/useSlideInteraction.js`, `src/Player.jsx` : registre temporaire, priorité Espace et intégration de la navigation existante.
- `src/FrameSurface.jsx` : option de contrôles natifs sur le lecteur existant (désactivée par défaut pour tous les anciens cadres).
- `src/document.js`, `src/archive.js` : schéma/migration/validation, sauvegarde et ZIP existants conservés.
- `src/componentsModel.js`, `src/projectColors.js`, `src/fonts.js`, `src/imageLibrary.js` : composants, liens de palette, chargement des polices et références médias.
- `tests/milestone-timeline.spec.js` : 14 scénarios composites. Autres tests modifiés : assertions de version actuelle 29 → 30 uniquement.

## Tests réellement exécutés

- Phase 1 : compilation et **7 tests réussis** (nouveau composant + calques existants), puis **2 tests natifs réussis** après intégration de la palette.
- Phase 2 : **4 tests natifs réussis** après correction du double-clic ; les **9 tests d’actions existantes** ont également été exécutés avec succès pendant cette phase.
- Phase 3 : compilation et **15 tests réussis** (composant + lecteur existant), dont priorité de plusieurs chronologies, Espace, zoom, progression et réduction des animations. La variante avec une étape focalisée a été vérifiée lors de la phase suivante.
- Phase 4 : compilation et **24 tests d’intégration réussis** (composant, bibliothèque, organisation), puis **13 tests natifs réussis** après les dernières vérifications de défilement et d’accessibilité.
- Inspection visuelle d’une capture réelle de 24 étapes en zigzag.
- Suite complète de production : **290 tests réussis**, aucun échec, en **10,4 minutes**, avec compilation réussie.
- Après la relecture finale et le renforcement du retour Test/édition interne : nouvelle compilation et **14 tests natifs réussis**, dont le nouveau scénario de réinitialisation du zoom/des fiches et de suppression d’une phase zoomée. Commande : `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:production -- tests/milestone-timeline.spec.js`.
- `git diff --check` : réussi.

La suite globale a donc été exécutée avec 290 cas, puis les 14 cas natifs ont été rejoués après la dernière correction, dont un cas supplémentaire. Le lancement global final n’a pas été répété localement avec 291 cas ; la pull request relance cette suite complète sur GitHub.

Commande complète : `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:production`.

## Limites et vérifications non effectuées

- Vérifié sur le Chromium de cet environnement avec des données synthétiques, sans accès à la session Chrome personnelle ou au Vercel authentifié de l’utilisateur.
- Les aperçus des longs titres/descriptions sont abrégés pour garder une mise en page lisible ; le titre accessible et les fiches conservent le contenu complet. Les très petits calques nécessitent un agrandissement pour utiliser confortablement leurs commandes.
- Le placement des étapes est automatique. Elles se réordonnent, mais ne se déplacent pas librement comme des points vectoriels indépendants. Le zoom vise une étape ou une phase, pas une plage arbitraire tracée à la souris.
- Les clics d’étapes sélectionnent, ouvrent une fiche ou zooment ; ils n’exécutent pas les actions générales des boutons vers d’autres pages/calques.
- La taille lisible et le défilement priment sur l’affichage simultané de toutes les étapes dans un petit cadre. 24 étapes ont été testées ; aucune promesse de fréquence d’images pour plusieurs milliers d’étapes. Les bornes de validation (5 000 étapes, 1 000 phases par composant) protègent les imports et ne sont pas une garantie de performance.
- Avertissement Vite préexistant sur les bundles dépassant 500 ko ; compilation réussie, aucune dépendance ajoutée.
