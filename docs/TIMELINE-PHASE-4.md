# Timeline visuelle — phase 4

La timeline en bas de l’éditeur remplace la liste verticale des pages. Cliquer sur une miniature sélectionne la page dans l’aperçu. Glisser la carte vers une autre position : le trait violet indique l’insertion. La zone à droite permet de déposer à la fin ; le bord du ruban fait défiler pendant le déplacement.

Le bouton ⋯ ou un clic droit ouvre les actions Ajouter avant/après, Dupliquer, Renommer, Supprimer. La suppression demande confirmation. Annuler/Rétablir utilise le même historique de session que les calques et le texte. Cet historique n’est pas conservé après actualisation. Les identifiants des pages restent stables au déplacement ; une duplication crée de nouveaux identifiants.

Le curseur règle la taille des cartes. Replier libère l’espace de travail. La sélection reste visible par défilement automatique. Le panneau peut être replié ; sa hauteur dépend de la taille des miniatures, sans poignée de hauteur indépendante.

## Passages et vidéos

Cliquer entre deux pages ouvre les propriétés du passage. Importer MP4/WebM ou sélectionner une vidéo déjà importée ; choisir Vidéo ou Passage instantané. Retirer l’association conserve la configuration comme transition non associée, et conserve le fichier. Le bouton Prévisualiser montre le départ, la vidéo, puis l’arrivée. Revenir au mode édition rétablit le départ. Arrêter la vidéo annule la prévisualisation. Aucun fondu CSS n’est ajouté.

Une transition est enregistrée dans `document.transitions` : `id`, `fromId`, `toId`, `mediaId`, `mode` (`video` ou `instant`). Les endpoints peuvent être null (association retirée) ou désigner une page supprimée (configuration conservée). Une paire complète ne peut apparaître deux fois. Le lecteur ne consulte plus le champ historique `page.transitionId` pour sa navigation habituelle : il exige une paire ordonnée correspondant aux deux pages du passage courant. Les transitions spécifiques des actions interactives restent explicitement configurées et indépendantes.

Après un déplacement, une paire non adjacente est signalée dans Transitions non associées. Elle ne sera pas jouée sur un autre passage. Remettre les pages dans l’ordre la réactive. Le panneau permet aussi de la réassocier à un passage existant ou de supprimer sa configuration. Si le passage choisi avait déjà une configuration, celle-ci est détachée et conservée, sans effacement silencieux. Les fichiers restent dans la bibliothèque locale, y compris après suppression d’une configuration ou d’une page. Ils figurent dans le ZIP. Aucun nettoyage automatique de médias n’est effectué.

Une destination de bouton supprimée devient nulle et conserve `missingPageId` pour afficher un avertissement. Elle ne pointe jamais vers une autre page. Choisir une nouvelle destination supprime l’avertissement actif.

Présenter depuis cette diapositive commence sur la sélection actuelle ; Présenter depuis le début commence sur la première. Les raccourcis et la protection pendant lecture restent inchangés.

## Sauvegardes et migration

Le document passe en version 6 ; IndexedDB reste `presentation-studio`, version de base 1, store `documents`. Les versions de document 1 à 5 sont migrées sans effacer les médias, calques, textes, actions, états ou métadonnées. Chaque ancien `page.transitionId` est associé à la paire source/destination qui existait au moment de la migration. Une transition de dernière page reste non associée ; elle n’est pas automatiquement attribuée à une page ajoutée plus tard.

Les ZIP 1 à 5 restent importables. Les ZIP 6 incluent les associations actives et non associées, l’ordre, les médias et toutes les phases précédentes. Validation des références vidéo, IDs de configuration uniques, modes et paires avant remplacement atomique avec copie du projet précédent. Les données illisibles/futures restent intactes. Sauvegarde automatique, conflits entre onglets et avertissements quota demeurent actifs.

## Performances et limites

Les miniatures sont des canvas 480 × 270 maximum ; une petite image WebP est générée une fois par Blob utilisé. Les images proches du ruban visible sont traitées en file séquentielle, puis réutilisées. Aucun décodage vidéo dans la timeline. Les URL des miniatures sont libérées en quittant l’éditeur ou lorsque le média sort de la bibliothèque ; les URL pleine résolution restent gérées par le cache existant. Les miniatures représentent les arrière-plans, calques et visibilité initiale ; les retours à la ligne du texte y sont simplifiés, et le décor textuel des démonstrations n’est pas reproduit. L’aperçu central et le lecteur restent les références exactes.

La durée est disponible pour les vidéos nouvellement importées ; les anciennes peuvent afficher seulement leur nom, afin de ne pas ouvrir toutes les vidéos pour obtenir leurs métadonnées. Les prévisualisations sont muettes comme le lecteur.

Les limites ZIP existantes restent inchangées (1 Go archive, 2 Go décompressés, 500 pages, 2 000 médias) ; les vidéos Blender de plusieurs gigaoctets ne sont pas validées par ce travail. Les opérations n’ajoutent aucune copie de Blob quand un média existant est sélectionné. IndexedDB réécrit le document dans sa transaction existante : aucune promesse d’écriture différentielle de gros fichiers.

La configuration Vercel, l’URL de production et la protection d’accès sont inchangées. Une branche de travail n’est pas publiée ; revue GitHub avant fusion dans main.

## Validation effectuée

Compilation de production réussie. Suite complète : 57/57 tests Chromium réussis. Après ajout de l’annulation asynchrone de prévisualisation, les 19 tests d’actions et timeline ont été exécutés à nouveau et réussis, incluant un nouveau scénario (58 tests distincts validés au total). Sélection, glisser-déposer réel, numéros, ajout avant/après, duplication, suppression confirmée, annuler/rétablir, import MP4/WebM, réassociation, lancement depuis la sélection et depuis le début, destinations déplacées/supprimées, rechargement IndexedDB, migrations 1–5 et ZIP 6 sont couverts. Un test retarde le décodage de l’image réellement montée pour contrôler la dernière frame, et un autre annule après la fin de la vidéo. Les données de timeline corrompues sont rejetées sans remplacement du projet.

45 pages vérifiées dans Chromium avec une fenêtre de 1280 × 800 ; capture visuelle inspectée. Fichier HTML autonome vérifié par HTTP interne avec ses assets embarqués : timeline, prévisualisation MP4, retour édition, cadre entièrement visible au-dessus du ruban et aucune erreur navigateur. L’ouverture `file://` n’a pas été exécutée dans l’environnement cloud, où elle est bloquée par la politique du navigateur. Aucune prétention de test sur le compte Vercel réel, de déploiement en production, de test multi-gigaoctets ou de validation de toutes les polices sur d’autres systèmes.
