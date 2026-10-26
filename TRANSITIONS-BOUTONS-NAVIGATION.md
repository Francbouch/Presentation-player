> Complément : le format 37 ajoute un fondu facultatif après vidéo et un contrôle de vitesse. Voir [Vidéo et durées Timeline](VIDEO-ET-DUREES-TIMELINE.md). Les résultats ci-dessous décrivent la validation initiale du format 36.

# Effets de transition des boutons de navigation

## Utilisation dans studio.

1. Sélectionner un bouton et ouvrir **Actions**.
2. Choisir **Naviguer vers une page**, puis sa **Page de destination**.
3. Choisir le **Type de transition** :
   - **Aucune — instantanée** : passage direct, sans utiliser le passage général de la Timeline.
   - **Effet animé** : paramètres ci-dessous.
   - **Vidéo de transition** : sélecteur et import de transition spécifique déjà présents dans studio.
4. En mode Effet, choisir **Fondu croisé**, **Fondu simple**, **Glissement**, **Zoom avant**, **Zoom arrière** ou **Balayage**.
5. Régler la durée de **100 à 3 000 ms** (600 ms par défaut lors de la première activation) et la courbe d’accélération. Les quatre valeurs correspondent à Ease In-Out, Ease Out, Ease In et Linear, avec les libellés français du contrôle existant.
6. Le sélecteur de direction apparaît uniquement pour Glissement et Balayage. Les directions Gauche/Droite/Haut/Bas reprennent le sens du moteur existant : côté d’entrée pour le glissement ; gauche vers droite, droite vers gauche, haut vers bas et bas vers haut pour le balayage.
7. **Tester l’action** prévisualise la navigation dans le canevas. **Revenir au mode édition** revient à la page d’origine du test. En Présentation, cliquer directement sur le bouton.

Le fondu simple peut passer par une couleur choisie. Sans couleur, il révèle volontairement le fond du cadre entre les pages ; il ne faut pas le confondre avec le fondu croisé, qui mélange directement les deux pages sans passage au noir.

Les trois modes sont exclusifs **à l’exécution** et leurs contrôles ne sont pas affichés simultanément. Passer d’un mode à un autre garde les réglages d’effet et le média précédents pour permettre de revenir au choix antérieur, mais ne les joue pas ensemble. Par exemple, une vidéo conservée ne joue pas lorsque le mode actif est Aucune ou Effet animé.

## Ce qui se passe pendant le passage

Le système identifie la page cible, monte et prépare ses images, puis utilise **le moteur d’animation commun de studio.** L’effet est limité au cadre 16:9 ; les panneaux et les commandes externes ne se déplacent pas.

Le fondu croisé anime réellement les deux plans : opacité décroissante de la page quittée et croissante de la page d’arrivée. Les deux plans sont composés dans un groupe isolé, avec `plus-lighter`, pour éviter la baisse de luminosité qu’entraînerait un double fondu sur un fond sombre. Les arrière-plans, textes, formes et autres calques appartiennent à ces plans.

Un instantané DOM temporaire fige l’apparence de départ avant le blocage des interactions : transformations et opacités en cours, cadres canvas/vidéo disponibles et positions de défilement sont conservés. Il reste uniquement en mémoire et n’est ni sauvegardé ni exporté. La page source réelle reste montée jusqu’au passage, pour préserver son état en cas d’annulation. Les vidéos disponibles sont figées sur leur image courante plutôt que relancées dans l’instantané.

La page cible est non interactive pendant la préparation et l’animation. Ses vidéos de calques ne démarrent pas avant sa promotion. Les animations et interactions natives de sa Timeline reprennent ensuite normalement. Ses états initiaux ou déjà consultés utilisent le même système de sélection que les autres navigations.

Les clics répétés sont filtrés dès la première demande, avant même un nouveau rendu React. Aucun second effet ne s’empile. **Annuler l’animation** garde la page source, nettoie les plans temporaires et débloque la navigation. Une image cible illisible ou trop lente conserve également la page source et affiche le message existant. Les réponses de chargement d’une transition annulée sont ignorées.

La préférence système de réduction des animations rend le passage direct une fois les ressources prêtes.

## Anciennes présentations et sauvegarde

Format documentaire **36**. Le champ facultatif `action.navigationTransition` contient un mode `none`, `effect` ou `video`, et, si configuré, les paramètres d’effet. Le média spécifique reste dans `action.transitionId` : aucune réécriture du stockage des vidéos.

Les anciens boutons **sans ce champ** gardent exactement leur choix historique : vidéo si `transitionId` est défini, sinon passage instantané. Aucun effet animé n’est ajouté automatiquement. Les nouveaux boutons commencent explicitement en mode Aucune. Changer de mode ne supprime pas les fichiers médias.

Les chemins existants de navigation, de lecture vidéo, de fin sur l’image décodée, d’autosauvegarde IndexedDB, d’historique, de duplication, de copie et de ZIP sont réutilisés. Les réglages incorrects sont rejetés avant remplacement du projet. Les métadonnées historiques restent conservées.

État initial Git propre sur `16fef98`, après fusion de la PR 42. Branche dédiée : `codex/button-page-transitions`. Point initial : `safety/button-page-transitions-initial-20261026`. Bundle complet vérifié : `/workspace/backups/presentation-player-before-button-page-transitions.bundle`, résultat dans `/tmp/button-page-transitions-backup.log`.

Cette sauvegarde protège le code, **pas les présentations privées de Chrome**, auxquelles cet environnement n’a pas accès. Aucun effacement ni aucune réinitialisation d’IndexedDB. Aucune fusion ni publication en production effectuée ici. Conserver un ZIP du projet depuis le menu Fichier avant d’adopter une nouvelle version.

## Fichiers

- `src/navigationTransition.js` : modes, paramètres, défauts et validation.
- `src/NavigationTransitionSettings.jsx`, `src/ActionSettings.jsx` : interface, réutilisation des réglages vidéo et de l’aperçu existants.
- `src/visualEffects.js`, `src/VisualAnimation.jsx`, `src/visualEffects.css` : extension du moteur commun, fondu des deux plans, composition et effets supplémentaires.
- `src/FrozenPageView.jsx` : instantané runtime, médias figés et restauration du défilement.
- `src/useSlideInteraction.js`, `src/Player.jsx`, `src/Editor.jsx`, `src/SlideView.jsx` : navigation et verrouillage partagés entre Test et Présentation, préparation et promotion de la cible.
- `src/document.js`, `src/archive.js`, `src/actions.js` : format 36, compatibilité et validation.
- `tests/navigation-effects.spec.js` : tests dédiés. Les assertions de version des tests précédents suivent le format 36 ; les deux anciens scénarios qui choisissent/importent une vidéo sélectionnent désormais le mode Vidéo explicitement.

## Vérifications réellement exécutées

- Compilation de production réussie.
- Premier lot : 17 réussites et 2 échecs de fondu croisé. La vérification a permis de corriger le jeu de données de couleur (images partagées entre pages) et d’isoler la composition additive du fond du cadre.
- Lot dédié suivant : **19 tests réussis, 29,5 s**. Le fondu croisé est vérifié par opacités et pixels, pour l’arrière-plan et les formes, dans les modes Test et Présentation.
- Régression actions/effets/arrière-plans : **53 tests réussis, 2,4 min**. Cela comprend les quatre directions de glissement et de balayage, les quatre courbes, les zooms, le fondu coloré, les images lentes/illisibles, l’annulation, les anciennes vidéos, les clics répétés, la destination avec vidéo/Timeline/états, et un vrai ZIP restauré dans un autre contexte.

Journaux : `/tmp/navigation-effects-build.log`, `/tmp/navigation-effects-targeted2.log`, `/tmp/navigation-effects-regression.log`. Le dernier lot dédié ajoute le cas de défilement source : `/tmp/navigation-effects-final-targeted.log`. Le résultat de la validation complète et de GitHub est indiqué dans la pull request ; son journal local est `/tmp/navigation-effects-full.log`.

## Limites

- Un instantané fige la page quittée pendant l’effet ; il ne duplique pas sa lecture interactive ou vidéo en direct. Les médias qui ne sont pas encore décodés ne peuvent pas fournir d’image vidéo à figer.
- Le fondu simple expose volontairement une couleur ou le fond du cadre. Pour éviter ce passage intermédiaire, choisir Fondu croisé.
- Aucun nouveau contrôle de vitesse de vidéo n’a été inventé : les propriétés réellement présentes avant ce changement sont conservées.
- Chromium est disponible et testé ici, avec la composition `plus-lighter`. Safari, Firefox, les projets privés de l’utilisateur et les performances sur son ordinateur ne sont pas testables depuis cet environnement.

Dernier lot dédié après conservation des défilements et des transformations individuelles : **29 tests réussis (43,9 s)**, journal `/tmp/navigation-effects-final-targeted.log`. Compilation et `git diff --check` réussis avant soumission à la validation complète.
