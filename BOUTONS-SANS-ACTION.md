# Effets interactifs des boutons sans action

## Utilisation

Dans les propriétés du bouton :

1. Laisser **Actions → Type d’action → Aucune action**.
2. Ouvrir **Effets interactifs** et choisir les effets existants de survol, de clic et de sélection.
3. Pour une coche, ouvrir **Indicateur de sélection → Afficher une coche lorsque sélectionné**.
4. Essayer **Prévisualiser les effets du bouton**, **Tester les interactions** ou **Présentation**.

Un bouton indépendant sans action se sélectionne et se désélectionne au clic lorsqu’une coche ou un effet **Lorsque sélectionné** est configuré. Un effet **Au clic** seul reste temporaire ; il ne crée pas de sélection persistante ni d’action fonctionnelle.

Les groupes restent exclusifs : cliquer sur un autre bouton sans action du groupe change la sélection ; recliquer sur le bouton déjà choisi le conserve sélectionné, selon la règle existante des groupes. La sélection par défaut peut maintenant être définie pour un bouton sans action avec le contrôle déjà présent.

Le **contraste par assombrissement** conserve sa règle actuelle : il assombrit les autres boutons du même groupe. Un bouton indépendant n’a donc pas de voisins à assombrir. Aucun effet nouveau n’est ajouté.

Dans un groupe mixte lié aux états, la sélection correspondant à l’état réellement affiché garde sa priorité. Un bouton purement visuel ne change pas l’état, le fond, la visibilité des calques ou le paramétrage de lecture pour imposer sa sélection.

## Cause et correction

Trois restrictions liaient les effets aux actions :

- Le composant de bouton appliquait `disabled` lorsqu’`item.action` était absent : les clics/focus natifs ne pouvaient pas déclencher les effets.
- L’activation retournait immédiatement pour une action absente, sans gérer la sélection visuelle.
- Le rendu de la sélection et le choix d’un défaut de groupe limitaient les boutons personnalisés aux actions de fond/d’état.

Le lecteur autorise maintenant les interactions purement visuelles. La bascule indépendante est stockée dans l’état de lecture React du système existant ; les groupes réutilisent les sélections de groupes existantes. Aucune action fictive n’est créée. Un clic sans action ne passe pas par la logique fonctionnelle et n’annule pas une fin vidéo en attente.

Les animations CSS, les effets combinés et les préférences de réduction des animations sont réutilisés. En Édition, sélectionner/déplacer un calque ne déclenche pas ces effets. Les blocages du lecteur et l’inertie des overlays vidéo restent prioritaires. Les instantanés d’overlays conservent aussi la sélection visuelle indépendante pendant la vidéo.

Les boutons avec action conservent leur logique de sélection et d’exécution. Les actions ponctuelles et la navigation ne reçoivent pas de sélection persistante automatique.

## Données et sécurité

- Même schéma de document (29), mêmes champs de configuration, IndexedDB et ZIP. Aucune migration de données nécessaire.
- Les identifiants et les documents existants ne sont pas réécrits pour cette correction.
- Les réglages sont sauvegardés comme auparavant ; la sélection temporaire de lecture n’est pas exportée, comme les autres interactions du lecteur.
- Départ propre sur `408bcbe`, branche `codex/no-action-button-effects`, point initial `safety/no-action-effects-initial-20261024`.
- Sauvegarde Git complète vérifiée : `/workspace/backups/presentation-player-before-no-action-effects.bundle`.
- Aucun accès aux présentations réelles dans Chrome : la sauvegarde Git protège le code, pas ces données. Aucun effacement/réinitialisation IndexedDB ni déploiement en production.

## Fichiers modifiés

- `src/InteractiveButtons.jsx` : activation des boutons sans action, rendu des sélections et respect des blocages.
- `src/useSlideInteraction.js` : sélection visuelle indépendante, groupes, bascule et remise à zéro du mode de lecture.
- `src/SlideView.jsx`, `src/videoLayers.js` : transmission de la sélection visuelle et instantanés des overlays.
- `src/ButtonAppearanceSettings.jsx` : contrôle de sélection par défaut réutilisé et explication adaptée.
- `tests/no-action-effects.spec.js` : tests navigateur de la correction.

## Tests réellement exécutés

- Compilation de production réussie.
- Suite ciblée : **54 tests réussis** (boutons sans action, apparence, actions, actions supplémentaires vidéo et overlays vidéo).
- Suite complète : **277 tests réussis**, aucun échec, en 9,8 minutes, avec `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:production`.
- `git diff --check` : réussi.

La suite complète couvre aussi les actions fonctionnelles existantes, les actions supplémentaires vidéo, les overlays, les transitions, les états, les composants, la timeline, les notes, les outils d’édition et le stockage. Point final identifiable après validation : `safety/no-action-effects-validated-20261024`.

Les huit nouveaux scénarios couvrent : survol lumineux/agrandissement, clic temporaire, effets combinés, coche/bascule, contraste à 45 % du groupe, sélection par défaut et exclusive, édition sans déclenchement, Test, Présentation, clavier, plein écran, réduction des animations, états réels prioritaires, blocages vidéo/overlays, Undo/Redo, rechargement et import/export ZIP réel, ainsi qu’une fin vidéo intégrée préservée après un clic purement visuel.

Limites : vérification sur le Chromium de cet environnement avec des projets de test synthétiques ; aucun accès à la session Chrome personnelle ou à la production Vercel authentifiée. L’avertissement Vite préexistant sur les bundles dépassant 500 ko ne bloque pas la compilation.
