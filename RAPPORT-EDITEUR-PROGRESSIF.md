# Développement progressif de l’éditeur

## Sécurité et points de restauration

L’état initial était propre : aucun fichier modifié ou non suivi à inclure, déplacer ou écraser. Le travail est isolé sur `codex/editor-five-phases`, depuis le commit de production `b6ff530`. Aucun merge ni déploiement en production n’est effectué.

Le repère initial est `safety/editor-five-phases-initial-20261022`. Une sauvegarde Git autonome est disponible dans `/workspace/backups/presentation-player-before-five-phases.bundle`. `git bundle verify` a vérifié son intégrité et la présence de l’historique complet. Cette sauvegarde peut servir à recréer un dépôt avec `git clone /chemin/vers/la-sauvegarde.bundle dossier-de-restauration`, sans modifier le dépôt actuel.

**Ce sont des sauvegardes du code. Les données IndexedDB du Chrome de l’utilisateur ne sont pas accessibles depuis cet environnement et n’ont pas été sauvegardées ici.** Avant d’utiliser la mise à jour, exporter la présentation avec **Fichier → Sauvegarder mon projet**. Les tests de stockage et ZIP emploient leurs propres contextes de navigateur ; ils ne touchent pas au Chrome de l’utilisateur. Aucune réinitialisation d’IndexedDB, suppression de fichiers utilisateur ou commande Git destructive n’a été utilisée.

| Phase | Fonctionnalités et réutilisation | Validation avant la phase suivante | Repère Git |
|---|---|---|---|
| 1 | Alignement existant étendu : objet de référence fixe, distribution des centres, espacement précis en pixels logiques. Limites visuelles et transformations des groupes réutilisées. | Compilation et 10 tests réussis : alignement, groupes, magnétisme et commandes visuelles. | `safety/editor-phase-1-validated` |
| 2 | Dossiers imbriqués distincts des groupes, nom, repli, dépôt de calques, déplacement, ordre, verrouillage et visibilité hérités. Retrait seul ou suppression avec contenu confirmée ; médias conservés. | Compilation, 22 tests réussis, puis 9 contrôles complémentaires de l’interface. Les réglages individuels, références et états sont préservés. | `safety/editor-phase-2-validated` |
| 3 | Ombre portée suivant la silhouette et flou par objet, réglables et réinitialisables. Rendu existant conservé, filtres hors poignées et propriétés. | Compilation et 22 tests réussis : effets, boutons, formes, cadres multimédias. Mesure de réactivité sur 20 images du navigateur de test. | `safety/editor-phase-3-validated` |
| 4 | Styles du projet nommés, duplication, liaison, mise à jour globale confirmée, surcharges locales par propriété, réinitialisation, détachement, suppression sûre. Composants conservés. | Compilation et 29 tests réussis : styles, composants, rechargement, vrai transfert ZIP et archive invalide refusée. | `safety/editor-phase-4-validated` |
| 5 | Presse-papiers d’apparence indépendant de Ctrl+C/V, collage multiple, remplissage/bordure/effets/typographie/dimensions explicites, choix du même style lié. | Compilation et 23 tests réussis : collage, compatibilité, raccourcis existants, Undo/Redo. | `safety/editor-phase-5-validated` |

Les corrections et contrôles d’intégration réalisés après ces repères sont conservés dans les commits suivants, sans effacer les étapes précédentes.

## Utilisation

**Aligner et distribuer :** sélectionnez plusieurs objets avec Maj + clic ou Ctrl/Cmd+A dans le canevas. Ouvrez **Aligner et distribuer**. Choisissez sélection, diapositive ou premier objet comme référence. Les groupes complets restent des unités. La distribution conserve les extrêmes par défaut. Pour un espacement précis, saisissez une valeur et appliquez-la horizontalement ou verticalement. Une disposition qui dépasserait la diapositive n’est pas appliquée. Les éléments verrouillés sont protégés.

**Dossiers :** dans Calques, cliquez sur **+ Dossier de calques**. Renommez-le dans son en-tête ; créez des sous-dossiers ou déposez un calque sur le dossier. **Ranger la sélection** permet aussi de déplacer plusieurs calques. Déposez sur **Hors des dossiers** pour en sortir. Les flèches montent ou descendent le dossier et son bloc de calques dans l’ordre de rendu ; les calques peuvent être réordonnés avec les outils existants. Le dossier organise, le groupe transforme : ils restent indépendants. Les deux commandes de suppression précisent si les enfants sont conservés.

**Verrouiller :** utilisez le cadenas du calque ou du dossier. Le verrou d’un dossier est hérité, sans modifier les cadenas individuels. Les propriétés des calques protégés restent consultables ; le cadenas permet le déverrouillage individuel lorsque le parent ne le bloque pas. La suppression au clavier ignore les calques verrouillés. Le verrouillage n’empêche pas les actions en Test ou Présentation.

**Masquer un dossier :** son œil masque tous ses descendants, même si un état demande de les afficher. Leurs visibilités individuelles et leurs états restent enregistrés sans modification. Réafficher le dossier rétablit la combinaison de ces réglages.

**Ombres et flou :** sélectionnez un objet puis ouvrez **Effets visuels**. Activez l’ombre, choisissez sa couleur/opacité, ses décalages et son flou. Le flou de l’objet est un réglage séparé. Les valeurs utilisent la diapositive logique 1920 × 1080 et suivent le zoom et le plein écran. Les médias ne sont pas modifiés et les zones cliquables ne s’agrandissent pas.

**Styles :** sélectionnez un objet, ouvrez **Styles du projet**, nommez et créez le style. Sélectionnez d’autres objets puis appliquez le style lié. Les propriétés compatibles se synchronisent. Modifier une propriété sur un objet crée une surcharge locale, sans détacher les autres propriétés. Pour modifier globalement le style, ajustez un objet puis utilisez **Mettre à jour le style depuis cet objet** et confirmez. Vous pouvez réinitialiser les surcharges, détacher un objet ou supprimer le style : son apparence effective est conservée lors du détachement. La typographie est appliquée aux textes et aux boutons possédant un contenu texte configuré. Pour respecter les dimensions, son application passe le texte en hauteur fixe ; la hauteur automatique peut être réactivée explicitement et devient alors une surcharge locale si un style est lié.

**Copier les propriétés :** dans **Copier/coller les propriétés**, copiez l’apparence d’un objet, sélectionnez un ou plusieurs objets et collez. Le collage spécial permet de limiter les catégories ou de reprendre le style lié. Par défaut, le collage copie les valeurs effectives sans créer le lien du style source. Un objet déjà lié conserve son propre lien, avec des surcharges locales. Les dimensions nécessitent un choix explicite et sont limitées à l’espace disponible, sans déplacer la cible. Les médias, le contenu, les actions, les identifiants, les états et la rotation ne sont pas copiés.

## Données et architecture

Le schéma évolue additivement : v18 pour les dossiers, v19 pour les effets et v20 pour les styles. Les anciennes versions restent acceptées ; aucune conversion des anciens objets ou suppression de métadonnées n’est imposée. IndexedDB, la révision concurrente, l’historique et les sauvegardes ZIP existants sont conservés. Une archive est validée avant restauration. Les médias partagés restent uniques et ne sont pas supprimés lorsqu’un dossier ou un style est retiré.

`layerFolders` organise des identifiants de calques stables, avec un parent par dossier et sans cycle. `objectEffects` contient les paramètres numériques des effets. `projectStyles` contient des styles identifiés ; `styleLink` conserve la liaison et la liste des propriétés surchargées. Les propriétés visuelles effectives sont matérialisées sur les objets pour réutiliser tous les rendus et composants existants. Priorité : surcharge locale explicite, style lié, valeurs de base. Les composants peuvent conserver leurs structures et utiliser ces styles. Une future animation pourra composer des valeurs temporaires à l’affichage après cette résolution ; aucune timeline à keyframes n’est ajoutée.

## Limites et contrôles non accessibles

- L’étendue des ombres et les modes de fusion ne sont pas proposés : un `drop-shadow` suit correctement l’alpha, mais ne fournit pas de spread natif fiable ; la composition avec vidéos n’est pas validée pour les modes de fusion.
- Les flous sont bornés (ombre 64 px, objet 32 px). Les filtres sont locaux aux objets ; aucune garantie de cadence sur tous les ordinateurs ou des dizaines de vidéos simultanées n’est annoncée. Les tests de réactivité utilisent Chromium dans cet environnement, pas le matériel de l’utilisateur.
- Les espacements numériques trop grands sont refusés ; ils ne sont pas comprimés silencieusement. Le premier objet dans l’ordre du document sert de référence fixe.
- Une ligne vectorielle conserve son trait comme catégorie bordure, sans typographie. Les propriétés incompatibles sont ignorées.
- Le presse-papiers d’apparence est interne à la session de l’éditeur ; les raccourcis standards de copie d’objets et de saisie de texte ne sont pas interceptés.
- L’accès au Chrome personnel, à ses présentations IndexedDB et à une validation manuelle sur cet ordinateur est impossible ici. Aucun export de ses données n’est prétendu.

## Résultat final

La compilation de production et les 13 scénarios spécifiques réussissent. La vérification finale a aussi repris avec succès les 17 scénarios de calques et d’intégration après correction de l’indépendance visibilité/verrouillage. La [pull request nº 22](https://github.com/Francbouch/Presentation-player/pull/22) affiche le résultat exhaustif du contrôle `production`, qui exécute la compilation et les 171 scénarios disponibles. Les tests spécifiques vérifient également un sous-dossier alimenté par dépôt, la conservation des actions, la suppression avec nettoyage des références, la visibilité en Présentation et un cadre vidéo avec ombre en plein écran.
