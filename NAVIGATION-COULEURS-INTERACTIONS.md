# Zoom, couleurs et vue des interactions

## Utilisation

- **Vue des interactions**, en haut : schéma calculé à partir des pages, états, boutons, actions, médias et passages. Double-clic ou Entrée sur un bloc pour ouvrir son élément. Un état ouvre son aperçu en mode Test via le système d’états existant ; aucune action de bouton n’est exécutée. Pour reprendre les modifications, choisissez « Positionner les boutons ».
- Dans le schéma : glisser le fond déplace la vue ; molette zoome autour de la souris ; glisser un bloc ou utiliser les flèches le déplace. Les boutons permettent d’ajuster, recentrer ou réorganiser. Les filtres isolent les catégories. Les positions sont des préférences locales, sans modifier les actions et sans être incluses dans le ZIP.
- **Ctrl + molette** au-dessus du canevas : zoom centré sur le curseur. Les panneaux gardent leur défilement. Le pourcentage est saisissable entre 5 et 400 %. Ctrl/Cmd + 0 ajuste la page, Ctrl/Cmd + 1 affiche 100 %, Shift + 2 cadre la sélection (avec son rectangle englobant après rotation).
- **Espace maintenu + glisser**, en mode Édition : main temporaire. Les coordonnées du projet restent inchangées. Les champs de saisie, le mode Test et la Présentation gardent leurs commandes habituelles.
- Près de chaque couleur : **◉ Pipette** ouvre la pipette native de Chrome/Edge sur ordinateur (HTTPS ou localhost). Prélevez un pixel affiché, ou Échap pour annuler. L’aperçu/loupe appartient au navigateur ; la valeur HEX est affichée dans le contrôle après le prélèvement. Le RGB est appliqué seul, sans changer l’opacité, le cadrage ni les fichiers originaux. Le navigateur autorise lui-même ce prélèvement ; aucune capture n’est envoyée.
- **▦ Palette** : ajoutez la couleur actuelle aux favoris, nommez-la, réordonnez les pastilles et modifiez les couleurs. Les 16 dernières couleurs utilisées par les contrôles intégrés restent disponibles.
- **Valeur** copie une couleur. **Lier** relie uniquement la propriété actuellement ouverte à la couleur du projet. Modifier une couleur dans la palette met à jour ses utilisations liées. Une modification manuelle de cette propriété détache son lien. Les autres propriétés, notamment les opacités, sont conservées.
- Pour un style partagé : liez d’abord une couleur sur l’objet, puis créez ou mettez à jour son style réutilisable. Les valeurs de style conservent les références de couleur. Priorité : surcharge locale / lien local, puis style lié, puis apparence enregistrée. Les couleurs elles-mêmes ne référencent aucun objet ou style, donc aucune dépendance circulaire.
- Supprimer une couleur demande confirmation et conserve sa dernière valeur sur les objets et styles avant de détacher les références.

## Données et sécurité

Schéma 21, migration additive des versions 1 à 20, noms de base et de magasins IndexedDB inchangés. Palette, noms, favoris, ordre, couleurs récentes et références sont inclus dans le ZIP ; références et formats sont validés avant restauration. Aucun service payant, média distant, changement de configuration Vercel ou déploiement de production.

État Git initial propre, branche `codex/navigation-colors-interactions`, base `4f96cce`. Sauvegarde : `safety/navigation-colors-initial-20261022` et bundle `/workspace/backups/presentation-player-before-navigation-colors.bundle`, vérifiés par import dans un dépôt nu temporaire et `git fsck --full`. Restauration dans un autre dossier :

```
git clone --branch safety/navigation-colors-initial-20261022 /workspace/backups/presentation-player-before-navigation-colors.bundle restauration
```

Points intermédiaires : `safety/navigation-phase1-validated`, `safety/navigation-phase2-validated`, `safety/navigation-phase3-validated`.

**Les données IndexedDB de votre Chrome sont inaccessibles dans cet environnement. Aucun ZIP de votre présentation personnelle n’a été produit. La sauvegarde Git protège uniquement le code.** Exportez vos projets depuis Fichier → Sauvegarder mon projet avant la mise à jour.

## Vérifications et limites

Les tests automatisés contrôlent l’ancrage du zoom, la main, les raccourcis, la géométrie, les palettes/styles, la conservation des propriétés voisines, IndexedDB/rechargement, ZIP réel, les projections du graphe, les filtres, le déplacement et l’ouverture des éléments.

La sélection physique d’un pixel dans la pipette native et son interface système ne sont pas automatisables dans le Chromium sans interface de cette machine. Les tests simulent sa réponse et son annulation et vérifient leur application dans l’éditeur. Le prélèvement réel sur vos formes, images, vidéos et cadres devra être essayé dans Chrome. Hors navigateurs compatibles, un message propose les valeurs HEX et les pastilles ; il n’y a pas de contournement des restrictions ni de pipette raster alternative. La loupe native remplace une loupe personnalisée avec HEX continu.

Le schéma ne crée pas d’actions, ne répare pas les références invalides, n’offre pas encore de keyframes et utilise une organisation simple par catégories. Les positions locales ne sont pas partagées entre ordinateurs. Pour les très grands projets, utiliser les filtres évite un schéma trop dense.
