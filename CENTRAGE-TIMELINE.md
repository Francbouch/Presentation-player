# Centrage animé de la ligne du temps

## Utilisation

1. Sélectionner le calque **Ligne du temps**.
2. Dans **Progression, zoom et navigation**, activer **Centrer automatiquement l’étape active**.
3. Laisser **Animation du déplacement** activée ; régler sa durée entre **200 et 1500 ms** et choisir **Ease In-Out**, **Ease Out** ou **Linear**.
4. Cliquer sur **Tester les interactions**, puis sélectionner une étape, utiliser les flèches lorsque l’étape a le focus, ou révéler les étapes avec Espace / Étape suivante.

Les valeurs proposées pour l’animation sont **700 ms / Ease In-Out**. Le centrage automatique reste désactivé par défaut, pour conserver l’apparence et le comportement des présentations existantes. Les réglages d’animation apparaissent seulement lorsque le centrage est activé.

## Comportement

- Une seule transformation `translate(x,y) scale(z)` anime le canevas interne. L’étape arrive au centre de la fenêtre interne du composant, quel que soit son emplacement sur la diapositive.
- Horizontal, vertical et zigzag utilisent les points de la géométrie existante.
- Le mouvement utilise l’API native Web Animations, sans nouvelle dépendance ni calcul JavaScript à chaque image.
- Une nouvelle sélection lit la matrice actuellement affichée avant d’annuler l’animation précédente ; une seule animation reste en cours.
- Le zoom et la translation suivent la même courbe et la même durée quand le centrage est actif. Le réglage de durée de zoom existant continue de servir lorsque le centrage est désactivé.
- Les fiches restent en dehors du canevas transformé : leurs dispositions existantes flottante, latérale ou basse sont conservées, sans translation ni agrandissement.
- Le redimensionnement est suivi par ResizeObserver ; les préférences de réduction des mouvements désactivent l’animation. Leur activation pendant une animation termine immédiatement le mouvement.
- Les animations sont annulées au changement de contexte, à la sortie du test et au démontage. L’édition normale ne centre pas automatiquement les étapes.
- Les coordonnées, dimensions et étapes enregistrées ne sont pas modifiées pendant les interactions.
- Le précédent de la révélation sélectionne l’étape précédente lorsque le centrage est actif ; l’ancien comportement reste inchangé sinon.

## Sauvegarde et sécurité

- Branche dédiée : `codex/timeline-smooth-centering`.
- État initial propre : `ca8f27b`, restauration `safety/timeline-centering-initial-20261025`.
- Archive Git complète vérifiée : `/workspace/backups/presentation-player-before-timeline-centering.bundle`.
- Aucun accès aux données du navigateur personnel : cette archive sauvegarde le code, **pas les présentations IndexedDB de l’utilisateur**. Aucune donnée personnelle supprimée ou réinitialisée.
- Schéma 31 ; quatre propriétés facultatives du design : `autoCenter`, `centerAnimated`, `centerDuration`, `centerEasing`. Les anciens documents restent identiques, à l’exception du numéro de version lors de migration. Les métadonnées inconnues sont conservées.
- Export/import ZIP et IndexedDB utilisent la logique existante, sans nouveau stockage ou média. Les valeurs présentes sont validées strictement.
- Aucun déploiement de production ni changement de la configuration Vercel/GitHub.

## Fichiers modifiés

- `src/MilestoneTimeline.jsx` : transformation unifiée, annulation, observation de taille, navigation précédente.
- `src/MilestoneTimelineAnimationSettings.jsx` : réglages conditionnels.
- `src/milestoneTimeline.js` : valeurs par défaut et validation des options facultatives.
- `src/milestoneTimeline.css` : fenêtre interne sans défilement concurrent lorsque le centrage est actif.
- `src/document.js`, `src/archive.js` : version 31 et prise en charge des anciens formats.
- `tests/timeline-centering.spec.js` : scénarios dédiés de navigateur et migration.
- Les tests existants avec une assertion de version courante passent de 30 à 31 ; leurs entrées de test de versions anciennes sont conservées.

## Vérifications

Les tests dédiés couvrent le centrage mesuré à moins de deux pixels dans les trois dispositions, les positions intermédiaires, la sélection précédente, les sauts et sélections rapides, l’absence de file d’animations, le zoom 180 %, les fiches, le redimensionnement, la révélation, le plein écran, la réduction des mouvements, les durées 200/700/1200 ms, les trois courbes, l’arrêt de l’animation, Undo/Redo, le rechargement, un véritable ZIP importé dans un autre contexte de navigateur, la migration non destructive de la version 30 et l’annulation au changement de page.

Résultat de la suite finale : à compléter après exécution.

## Limites

- Le centre est celui de la zone intérieure du calque Timeline ; le composant ne se déplace pas vers le centre global d’une diapositive si le calque est placé ailleurs.
- La fenêtre masque les portions du tracé hors champ pendant le centrage. Utiliser les flèches au focus d’une étape ou les commandes de révélation pour atteindre les étapes hors champ.
- La retouche d’une cible pendant une animation conserve la position affichée, mais une nouvelle courbe peut changer sa vitesse instantanée ; ce n’est pas une simulation physique de ressort.
- Vérification automatisée sous Chromium ; pas de mesure FPS exhaustive ni de validation sur les fichiers privés du navigateur de l’utilisateur, Safari ou Firefox.
- L’avertissement Vite existant sur la taille du bundle reste présent.
