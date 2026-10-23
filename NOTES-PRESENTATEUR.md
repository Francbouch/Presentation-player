# Notes et vue Présentateur

## Utilisation

Cliquez sur **Notes**, près de la timeline. La fenêtre flottante s’ouvre à gauche de la diapositive, sans réduire le canevas. Glissez son en-tête pour la déplacer et sa poignée inférieure droite pour modifier sa largeur et sa hauteur. Les flèches du clavier fonctionnent aussi lorsque l’en-tête ou la poignée a le focus. Le menu ⋯ propose « Réinitialiser la position ». La position et la taille sont mémorisées dans les préférences locales de l’interface, indépendamment du projet. Écrivez plusieurs paragraphes, utilisez les puces et les boutons Gras/Italique (notation légère `**gras**`, `*italique*`). Pendant un import de média, la saisie et la mise en forme sont temporairement désactivées pour protéger le texte contre une écriture concurrente. Le texte est automatiquement associé à l’identifiant de la page sélectionnée et sauvegardé par le mécanisme IndexedDB existant. Les raccourcis de texte restent natifs. Fermer la fenêtre conserve son texte et sa position ; le canevas garde toujours toute sa hauteur.

**Vue Présentateur**, près de Notes, ouvre la présentation publique dans une deuxième fenêtre. Les notes, le chronomètre avec pause et remise à zéro, l’aperçu privé et les commandes restent dans la fenêtre initiale. Déplacez manuellement la fenêtre publique sur l’autre écran. Activez son plein écran avec ⛶ ou F dans cette fenêtre. Partagez uniquement cette fenêtre au public. Le navigateur peut refuser le plein écran demandé depuis la fenêtre privée : le bouton de la fenêtre publique reste disponible.

Si les fenêtres contextuelles sont bloquées, un message l’explique. Le lecteur apparaît dans la fenêtre privée : son plein écran ne contient aucune note, mais partager toute la fenêtre montrerait les notes. Autorisez les fenêtres contextuelles, revenez à l’éditeur puis relancez pour travailler sur deux écrans. Fermer la fenêtre publique arrête les commandes privées et affiche une indication de relance.

## Architecture et confidentialité

Le schéma passe de 23 à 24, sans changement de base ou de magasin IndexedDB. Le champ facultatif `page.notes` contient du texte, vide pour une ancienne page. Les identifiants, médias, états, métadonnées inconnues et mécanismes de révision sont conservés. Les données de notes invalides sont refusées explicitement. Le ZIP conserve le texte; duplication, suppression et historique suivent le modèle de page existant. Aucun service distant, dépendance ou bibliothèque de texte supplémentaire.

La fenêtre publique accueille le lecteur existant par un portail React : un seul moteur possède les interactions, les vidéos et la navigation. L’aperçu privé reçoit sa sélection réelle, reste inerte pour éviter les clics accidentels sans assombrir les boutons, et ne pilote aucun cycle d’animation ou lecteur multimédia. Les notes suivent la page effectivement affichée, après la fin d’une transition. L’aperçu privé n’est pas une retransmission vidéo : les MP4 jouent dans la fenêtre publique. Les notes ne sont jamais transmises au rendu de SlideView ou des miniatures.

Les notes utilisent React pour afficher leur texte : aucun HTML fourni par le projet n’est exécuté. Leur mise en forme légère n’altère pas les calques de texte de la présentation. Les notes font partie du projet ZIP confidentiel, qui n’est pas une publication publique.

## Sauvegarde de sécurité

État initial propre, branche `codex/presenter-notes` créée depuis `origin/main` (`ff61b38`). Tag initial `safety/presenter-notes-initial-20261023`; bundle complet vérifié dans `/workspace/backups/presentation-player-before-presenter-notes.bundle`. Point de restauration de phase A : `safety/presenter-notes-phase-a-validated-20261023`.

Cette sauvegarde Git contient le code, pas les présentations du Chrome de l’utilisateur. Ces données ne sont pas accessibles ici et n’ont pas été sauvegardées ni réinitialisées. Exporter son propre ZIP avant une mise à jour reste conseillé.

## Validation

La phase A a été compilée et son test navigateur réel a réussi avant le démarrage de la phase B : deux pages distinctes, texte français, copier/coller, fermeture/réouverture, actualisation, export/import ZIP et absence de notes en présentation. Une vérification du modèle a confirmé la duplication des notes avec un nouvel identifiant.

Les tests supplémentaires couvrent les fenêtres distinctes et bloquées, la navigation publique/privée, le chronomètre, la fermeture de fenêtre, l’aperçu des états interactifs, le MP4 de transition, le plein écran et le cycle duplication/réorganisation/suppression/Undo/Redo.

Le placement physique sur deux moniteurs et les politiques spécifiques d’un navigateur ou d’une extension ne sont pas testables automatiquement dans cet environnement. Aucun déploiement en production.
