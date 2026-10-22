# Manipulation des objets

Les gestes fonctionnent en mode Édition sur les formes, images, boutons, cadres vidéo, sélections multiples, groupes et instances de composants. Les raccourcis du lecteur et du mode Test sont conservés.

| Geste | Résultat |
| --- | --- |
| Poignée de coin | Redimensionnement libre |
| Shift + poignée | Proportions de départ |
| Alt + poignée | Redimensionnement autour du centre |
| Shift + Alt + poignée | Proportions et centre fixe |
| Glisser le corps | Déplacement libre |
| Shift + glisser le corps | Axe horizontal ou vertical dominant, conservé pendant le geste |
| Alt + glisser le corps | Déplacement d’une copie ; l’original reste en place |
| Shift + Alt + glisser le corps | Copie déplacée sur un axe |
| Shift + rotation | Pas de 15° |
| Flèche | 1 pixel de la diapositive (1920 × 1080) |
| Shift + flèche | 10 pixels de la diapositive |
| Ctrl/Cmd pendant le glissement | Désactiver temporairement le magnétisme |
| Échap pendant un geste | Annuler le geste ou le dessin |
| Ctrl+Z / Ctrl+Y | Annuler / rétablir |

**Alt est désormais réservé à la duplication et au redimensionnement centré.** Il ne désactive plus le magnétisme. Les proportions et le centrage priment sur l’accrochage pendant un redimensionnement contraint. Le magnétisme du déplacement contraint ne s’applique qu’à l’axe autorisé.

Shift + clic conserve la sélection multiple. Si la souris glisse, Shift contraint le mouvement. Alt sur une poignée ne crée jamais de copie. Lorsqu’Alt est activé pendant un déplacement, la duplication reste engagée jusqu’à la fin de ce geste.

Les modificateurs peuvent être pressés ou relâchés pendant le glissement : la géométrie est recalée sur la position actuelle sans déplacement de la souris. Si le redimensionnement libre a changé le rapport avant l’activation de Shift, le rapport de départ est rejoint progressivement sur les 12 premiers pixels de mouvement à l’écran, pour éviter un saut. Le centre est celui de l’objet au moment où Alt est activé. La rotation contrainte s’accroche au pas de 15° le plus proche.

## Créer les formes

Les boutons **+ Rectangle** et **+ Cercle** ajoutent immédiatement un carré ou un cercle de **200 × 200 pixels logiques**. Les anciens objets ne changent pas de dimensions.

Pour dessiner directement sur la diapositive, utilisez **Création sur le canevas**, au-dessus de la scène, et choisissez **Dessiner un rectangle** ou **Dessiner un cercle** :

- Un clic crée une forme de 200 × 200 px à cet endroit.
- Un glissement définit librement sa largeur et sa hauteur.
- Shift crée un carré ou un cercle parfait.
- Alt dessine depuis le centre ; Shift + Alt combine les deux.
- Échap annule sans ajouter de calque.

Une seule forme est créée au relâchement, puis l’outil revient à la sélection. Les dimensions minimales et les limites de la diapositive sont respectées.

## Précision et conservation

Les calculs convertissent la souris dans les coordonnées de la scène, indépendamment du zoom. Les objets pivotés utilisent leurs axes locaux pour le redimensionnement. Les groupes partagent une transformation et restent dans les limites ; les objets verrouillés ne sont pas modifiés.

Le cadrage interne et les fichiers des médias restent intacts pendant les transformations. Une copie reçoit de nouveaux identifiants et réutilise les médias partagés. Les références internes, groupes, états et composants sont copiés avec le mécanisme existant.

Chaque glissement correspond à une seule étape d’historique. Les répétitions des flèches sont regroupées jusqu’au relâchement et à une courte pause ; un clic sur un autre outil clôt ce groupe. Les flèches dans un champ ou un texte éditable restent natives. Sur une poignée de coin focalisée, elles gardent le redimensionnement accessible au clavier.

Aucun nouveau champ de document, aucune migration de format, aucun effacement IndexedDB, aucune dépendance et aucune modification GitHub/Vercel. Les transformations utilisent la sauvegarde et le ZIP existants.

## Vérifications

Les tests couvrent les modificateurs pendant le geste, le centre fixe, la rotation, le dessin, l’absence de doubles créations, les copies et leur annulation, les pixels logiques, la saisie native, les éléments verrouillés, les groupes/composants, les cadres vidéo, les zooms, les objets pivotés, l’export/import ZIP et l’annulation par Échap. Le test existant d’accrochage utilise désormais Ctrl plutôt qu’Alt.

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:production
```
