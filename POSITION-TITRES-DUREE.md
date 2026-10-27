# Appliquer la position des titres de durée

Sélectionnez la Ligne du temps, puis l’étape source. Ouvrez **Dates et durée de l’étape → C — Étiquette de dates**.

Cliquez sur **Positionner l’étiquette de durée** pour déplacer le texte dans la page, ou activez **Personnaliser le style C de l’étape** pour saisir ses décalages X/Y. Cliquez ensuite sur **Appliquer ce positionnement à tous les titres de durée** dans les propriétés ou la barre de positionnement.

La commande copie uniquement les décalages locaux de l’étiquette C par rapport au centre de chaque bulle, vers toutes les étapes de cette Timeline, y compris celles des phases fermées ou des groupes parallèles. Chaque étiquette conserve sa position relative lors des transformations et reste ensuite modifiable indépendamment. Un seul Annuler restaure toutes les anciennes positions ; Rétablir réapplique la copie.

Les textes des barres A/B ne disposent pas de positions X/Y indépendantes : ils restent automatiques. La commande ne change ni leurs longueurs, ni les dates, les styles, la visibilité ou les titres principaux. Les étapes sans dates ni estimation reçoivent le décalage sans qu’un texte ou une durée soit inventé. Les réglages sont sauvegardés et exportés dans les champs existants, sans changement de format.

## Sécurité

Branche dédiée, état initial propre, tag `safety/duration-label-position-initial-20261026` et bundle Git complet vérifié dans `/workspace/backups/presentation-player-before-duration-position.bundle`. Cette sauvegarde concerne le code, pas les présentations privées du navigateur utilisateur, auxquelles cet environnement n’a pas accès. Aucune réinitialisation IndexedDB ni mise en production.
