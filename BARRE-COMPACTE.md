# Une seule barre supérieure

La barre de l’éditeur mesure 48 px. Elle réunit studio., Fichier, le nom du projet
et la page active, les modes Éditeur/Présentation, les commandes d’édition, le zoom,
les états, la vue des interactions, Annuler/Rétablir, le lancement et la sauvegarde.
Les noms des commandes restent accessibles et les icônes disposent d’infobulles.

En dessous de 1 100 px, les commandes secondaires se trouvent dans **Plus**.
Le menu Fichier, les modes, le lancement, les notifications et la sauvegarde restent
accessibles directement. Plus se ferme au clic extérieur ou avec Échap ; Tab permet
de parcourir ses commandes, y compris les contrôles de zoom.

La cloche indique les notifications. Cliquer dessus permet de lire les messages
complets et d’utiliser leurs commandes, notamment Réessayer la sauvegarde et la
réparation des médias. Les erreurs d’import, de sauvegarde et de police ouvrent
leur panneau flottant. Les avertissements de destination supprimée et les messages
d’interaction restent consultables sans ligne permanente au-dessus du canevas.
Leur logique de détection est inchangée.

## Mesures avant/après

Avec les dimensions de panneaux et de timeline par défaut :

| Fenêtre | Début du canevas avant → après | Hauteur de la zone avant → après | Hauteur de la diapositive avant → après |
| --- | --- | --- | --- |
| 1920 × 1080 | 214 → 48 px | 648 → 814 px | environ 600 → 706,5 px |
| 1440 × 1050 | 214 → 48 px | 618 → 784 px | 436,5 → 436,5 px |

**166 px de hauteur sont rendus au canevas.** La diapositive reste en 16:9.
À 1440 px, sa largeur disponible entre les panneaux limite déjà sa taille : la
hauteur récupérée augmente l’espace autour d’elle. À 1920 px, elle gagne environ
106,5 px de hauteur, soit près de 18 %. Les coordonnées réelles et le zoom manuel
ne changent pas. Le ResizeObserver existant recalcule l’ajustement automatique.

Des mesures à 320, 390, 768, 1024, 1099, 1100, 1250, 1440 et 1920 px ont vérifié
l’absence de débordement horizontal et le maintien d’une seule rangée de 48 px.

## Sécurité et validation

Branche `codex/compact-topbar`, créée depuis un dépôt propre. Point initial
`safety/compact-topbar-initial-20261023`, bundle Git vérifié :
`/workspace/backups/presentation-player-before-compact-topbar.bundle`.
Cette sauvegarde contient le code, pas les présentations du navigateur utilisateur.
Aucune migration, suppression IndexedDB ni modification GitHub/Vercel.
Aucun déploiement automatique en production.

Les contrôles et leurs gestionnaires sont réutilisés. Leurs rendus sont déplacés
avec des portails React ; les tests suivent la nouvelle position de l’indicateur
de page et des notifications. Les panneaux latéraux et la timeline restent inchangés.
Les erreurs sont identifiées aux mêmes points de capture qu’avant ; seule leur
présentation en notification est adaptée.
