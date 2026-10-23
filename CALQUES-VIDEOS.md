# Calques visibles pendant les vidéos

## Utilisation

Sélectionnez un calque dans **Calques**, puis ouvrez **Visibilité pendant les vidéos** dans ses propriétés :

- **Rester visible pendant les transitions vidéo entre pages** : conserve le calque de la page source pendant son MP4 sortant.
- **Rester visible pendant les vidéos déclenchées par boutons** : conserve le calque dans les vidéos plein cadre lancées par une action.

Les options sont indépendantes et désactivées par défaut. Pour un groupe, sélectionnez son nom dans les calques et utilisez la même section. L’option du groupe s’ajoute à celle de ses enfants ; un message indique cet héritage dans les propriétés individuelles. Un petit symbole ▷ signale les calques concernés.

Les éléments doivent être effectivement visibles au démarrage. Un état, un groupe de visibilité ou un dossier masqué continue de masquer ses éléments. Les boutons persistants gardent leur apparence, mais deviennent temporairement non interactifs. Ils retrouvent leurs actions à la fin ou à l’annulation de la vidéo.

Aucune correspondance n’est supposée entre les boutons de deux pages : la destination reprend ses propres calques et identifiants.

## Implémentation progressive

- **A — Modèle et interface** : champs facultatifs `videoVisibility.page` et `videoVisibility.action`, contrôles individuels/de groupe, indicateur, validation ZIP/IndexedDB ; version documentaire 26, noms de base et magasins inchangés.
- **B — Vidéos entre pages** : insertion du lecteur existant dans la pile commune des calques. Les mêmes nœuds restent montés ; seuls les calques admissibles passent au-dessus du MP4. La page destination est préparée puis promue sans reconstruction de ses images.
- **C — Actions vidéo** : même pile, instantané de la visibilité effective au démarrage, conservation jusqu’au décodage de l’état ou de la page finale, nettoyage par les mécanismes existants d’arrêt/erreur/remplacement.

Les vidéos intégrées dans un cadre multimédia conservent leur propre rendu et leur ordre de calques existants. Le nouveau réglage concerne les vidéos plein cadre qui masquaient précédemment la scène. Aucun second moteur vidéo, service ou dépendance n’est ajouté.

## Fichiers

- `src/videoLayers.js` : options, visibilité héritée, admission et instantané temporaire, validation.
- `src/VideoVisibilitySettings.jsx` : propriétés individuelles et de groupe.
- `src/LayerSettings.jsx`, `src/SelectionTools.jsx` : intégration et indicateur.
- `src/SlideView.jsx`, `src/InteractiveButtons.jsx`, `src/styles.css` : pile commune, géométrie inchangée, inertie sans atténuation.
- `src/Player.jsx` : transitions et actions vidéo en Présentation.
- `src/EditorVideoScene.jsx`, `src/Editor.jsx` : même rendu dans le mode Test et maintien source/destination pendant la préparation.
- `src/useSlideInteraction.js` : instantané au démarrage et maintien de la vidéo pendant le montage de sa page finale.
- `src/document.js`, `src/archive.js` : compatibilité et validation additive.
- `tests/video-overlays.spec.js` : 13 nouveaux scénarios. Les tests existants qui vérifient explicitement la version documentaire attendent désormais 26 ; les données de test d’anciennes versions restent anciennes.

## Sécurité

Travail sur `codex/video-layer-overlays`, à partir de `5f24e9f` avec dépôt initial propre. Points Git : `safety/video-overlays-initial-20261023`, `safety/video-overlays-phase-a`, `safety/video-overlays-phase-b`, `safety/video-overlays-phase-c`. Bundle initial vérifié : `/workspace/backups/presentation-player-before-video-overlays.bundle`.

Cette sauvegarde concerne le code. Je n’ai pas accès aux présentations IndexedDB de votre Chrome et n’en ai pas produit de sauvegarde. Les essais utilisent exclusivement des données fictives dans des contextes de navigateur de test. Aucune suppression/réinitialisation d’IndexedDB utilisateur, aucun déploiement en production.

## Vérifications

Les validations ont été exécutées avant de passer à chaque phase suivante : modèle/ZIP/historique, puis transitions/timeline/plein écran, puis actions/états/interruptions. Les nouveaux scénarios couvrent aussi PNG transparent, formes et lignes, héritage de groupe, dossiers et états masqués, redimensionnement, zoom, vidéos successives et boutons identiques entre pages. L’export/import ZIP réel vérifie les paramètres individuels et ceux d’un groupe.

Suite complète exécutée avec succès : **224 tests passés en 7,7 minutes**, compilation de production comprise. Après cette exécution, le dernier ajustement de sélection multiple est revérifié par la suite ciblée de 13 scénarios. **13 tests ciblés passés en 22,8 secondes**, avec une nouvelle compilation de production réussie.

La compilation produit un avertissement de taille du bundle JavaScript supérieur à 500 ko ; elle réussit. Les contrôles automatisés s’exécutent dans Chromium local. La validation d’un vrai projet dans votre Chrome et le déploiement Vercel ne sont pas effectués ici.
