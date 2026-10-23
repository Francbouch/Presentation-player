# Listes à puces et noms automatiques

## Utilisation

Sélectionnez un calque de texte. Dans Texte et typographie, **Liste à puces** active ou désactive une liste. Sélectionnez des paragraphes dans le champ Contenu du texte pour limiter la mise en forme; sans sélection de texte, le bouton agit sur tout le bloc. Entrée continue la liste; Entrée sur le dernier élément vide quitte la liste. Cela fonctionne dans le champ de propriétés et en écriture directe sur le canevas. Le champ Retrait des puces règle l’espace réservé au symbole. Les lignes longues s’alignent sous le texte, pas sous la puce.

Les nouveaux calques de texte utilisent les cinq premiers mots du contenu comme nom. Les nouveaux boutons suivent leur texte principal. Sans texte explicite, un bouton conserve son libellé historique basé sur son nom; les boutons image sans texte disposent du nom générique Bouton. Le rendu et les actions ne changent pas de nom pendant une interaction.

Modifier Nom du calque ou Nom du bouton passe définitivement en mode manuel. Le texte peut alors changer sans écraser ce nom. **Réactiver le nom automatique** est la seule commande qui revient au mode automatique. Les anciens calques sans information de provenance sont considérés manuels, sans renommage rétroactif. Dupliquer et copier un texte ou bouton conserve désormais son nom et son mode; chaque copie garde son propre identifiant.

## Modèle et compatibilité

Schéma 25 additif : `textList` contient des indices de paragraphes et un retrait en em; le contenu reste du texte brut, sans insertion des symboles de liste. Le rendu lecture utilise de vrais éléments ul/li et les miniatures dessinent les mêmes retraits. Les listes sont des propriétés des paragraphes, indépendantes des styles typographiques partagés. Les textes sans liste gardent leur rendu existant. La première version ne propose ni listes numérotées ni niveaux imbriqués.

`nameMode: auto | manual` distingue explicitement l’origine des noms. Une propriété absente équivaut au mode manuel; aucune comparaison entre le contenu et le nom n’est utilisée pour décider de ce mode. Les noms générés sont limités à cinq mots et à la limite existante de 80 caractères. Les noms manuels anciens, y compris leur provenance inconnue, sont conservés. Les identifiants des calques, états, groupes et médias restent inchangés.

Les données passent par les mécanismes IndexedDB, Undo/Redo et ZIP existants. La validation refuse les indices de liste incohérents et les modes de nommage invalides avant de restaurer un ZIP. Aucun magasin IndexedDB changé, aucune réinitialisation, aucun service ni dépendance supplémentaire.

## Sécurité et développement

État Git initial propre, branche codex/bullets-auto-layer-names depuis origin/main 0f68982. Sauvegarde initiale vérifiée : tag safety/bullets-names-initial-20261023 et bundle /workspace/backups/presentation-player-before-bullets-names.bundle. Ce bundle sauvegarde le code, pas les projets du navigateur de l’utilisateur, auxquels nous n’avons pas accès.

Phase A compilée et testée avant la phase B : listes, saisie directe, Enter/sortie, sélection partielle, duplication, copie entre pages, rechargement, ZIP et présentation. Point de restauration safety/bullets-phase-a-validated-20261023. Phase B ajoute le suivi explicite des noms. Les tests vérifient les noms manuels, la réactivation, les copies indépendantes, les états, les anciens projets et les métadonnées.

Tests ciblés : 5 nouveaux scénarios passent sous Chromium avec le build et les en-têtes de production. Les tests existants de texte et de raccourcis ont également été exécutés; une erreur initiale de sélecteur du nouveau test (libellé visible versus nom accessible manuel du bouton) a été corrigée et relancée. La suite complète et la compilation sont exécutées avant la revue GitHub.

Fichiers principaux : src/textLists.js, src/ParagraphText.jsx, src/TextSettings.jsx, src/TextBlock.jsx, src/text.css, src/TimelineThumbnail.jsx, src/layerNames.js, src/document.js, src/archive.js, src/Editor.jsx, src/LayerSettings.jsx, src/ButtonSettings.jsx et src/layerClipboard.js. Les tests sont dans tests/bullets-names.spec.js; les anciennes attentes de schéma et de noms de création/copie ont été adaptées au comportement demandé.

Les autres navigateurs et les appareils tactiles physiques ne sont pas vérifiés ici. Aucun déploiement automatique en production.

## Résultats finaux exécutés

- Phase A : compilation et 2 tests de listes passés avant la phase B.
- Phase B : 5 tests ciblés passés après correction du sélecteur accessible du nouveau test.
- Suite complète locale : 212 scénarios exécutés, 211 passés; le scénario de copier/coller cherchait un ancien nom générique après modification du contenu et a été adapté au nom automatique réellement affiché.
- Relance finale sur le dernier code : 9 tests passés, dont les 6 scénarios de la fonctionnalité et les 3 scénarios de copier/coller. La hauteur automatique après changement de retrait et Undo/Redo a été ajoutée à cette relance. La compilation de production réussit.
- Vérification visuelle du rendu des puces et des lignes longues sous Chromium.
- La suite GitHub du dernier commit est distincte et peut être encore en cours; aucune réussite distante n’est revendiquée avant son résultat.
