# Phase 2 — actions des boutons

Les pages, calques, variantes, vidéos de transition, raccourcis et sauvegardes existants sont conservés. Les phases 3 (texte avancé) et 4 (timeline) ne sont pas développées ici.

## Configurer un bouton

1. Sélectionnez la page, puis le bouton dans **Calques** ou dans l’aperçu. Utilisez **+ Bouton** pour en ajouter un.
2. Modifiez son nom dans les propriétés. Son image, sa taille et son placement se règlent toujours avec les contrôles existants.
3. Dans les propriétés à droite, ouvrez **Action au clic** et choisissez **Type d’action**.
4. Configurez uniquement les paramètres affichés pour ce type. Aucun identifiant ni code à saisir.
5. Cliquez sur **Tester l’action** ou sur **Tester les interactions**, puis cliquez sur le bouton dans l’aperçu.
6. **Revenir au mode édition** termine le test, arrête la vidéo, revient à la page de départ du test et restaure les états initiaux. Le test ne modifie pas les actions ou la visibilité enregistrées. Les modifications explicites dans les champs de configuration restent sauvegardées.

## Les cinq actions

| Action | Configuration visuelle |
| --- | --- |
| Changer l’arrière-plan | Choisissez l’image principale, une variante, une image déjà importée ou **Arrière-plan initial**. **Importer l’image de l’action** ajoute une autre image. La coupure est directe et les autres éléments restent présents. |
| Afficher / masquer des calques | Cochez tous les calques concernés et choisissez **Afficher**, **Masquer** ou **Basculer la visibilité**. Les positions et l’ordre ne changent pas. Un bouton peut aussi contrôler d’autres boutons. |
| Lancer une vidéo | Choisissez une vidéo existante ou **Importer la vidéo de l’action** (MP4/WebM). Décidez de bloquer les interactions. À la fin : revenir à la page, afficher une image finale (existante ou importée) ou aller à une autre page. **Arrêter la vidéo** reste disponible même si les interactions sont bloquées. |
| Naviguer vers une page | Choisissez la destination. Laissez **Transition spécifique** sur **Passage instantané** ou choisissez/importez exactement la vidéo voulue. La transition habituelle de la page n’est jamais ajoutée implicitement. |
| Changer un état | Créez un état dans **États interactifs**, puis choisissez cet état dans **État à activer**. |

Les vidéos sont lues sans son, comme les transitions existantes. Elles occupent la zone 16:9, sans étirement ; les marges éventuelles laissent apparaître la page. Le contenu noir déjà encodé dans une vidéo reste son contenu : l’application n’ajoute aucun fond noir ni effet de fondu.

## Créer des états

Sous l’aperçu, **États interactifs** permet d’ajouter, renommer, dupliquer et supprimer les états.

Chaque état comporte un arrière-plan, un bouton actif facultatif et un réglage pour chaque calque : **Configuration du calque**, **Afficher** ou **Masquer**. Le sélecteur **État initial** définit l’état de départ ; **Configuration de la page** utilise le fond et les visibilités habituels.

Exemple : créez **Fermé** en masquant « Annotation », puis **Ouvert** avec une autre variante et l’annotation visible. Configurez un bouton pour activer **Ouvert**. Désignez **Fermé** comme état initial.

L’état initial est aussi visible dans l’aperçu. Un calque masqué reste sélectionnable dans la liste Calques ; ajustez sa règle de visibilité dans l’état si vous souhaitez le manipuler sur la page.

## Vidéos et navigation

- Une seule vidéo d’action à la fois. Une garde immédiate empêche les doubles clics de lancer plusieurs lectures.
- La page reste derrière la vidéo jusqu’à la première frame décodée. La dernière frame reste visible jusqu’au décodage de l’image finale réellement montée ou de la page de destination.
- En cas d’erreur de lecture ou de blocage prolongé, la page est conservée et un message est affiché.
- Si le verrou est activé, boutons, navigation et commandes sont bloqués ; **Arrêter la vidéo** reste disponible. Sans verrou, une navigation manuelle arrête la vidéo et poursuit la présentation.
- En mode test, une navigation change la page de l’aperçu dans l’éditeur. Sortir du test revient à la page de départ.
- Espace sur un bouton active ce bouton et ne passe pas à la page suivante. Espace ailleurs, flèche gauche et F conservent leur rôle habituel dans le lecteur.

## Conservation des projets

Le format de document/ZIP passe à **4** ; la base IndexedDB reste `presentation-studio`, version de base 1, magasin `documents`. Les documents et ZIP v1, v2 et v3 restent importables. Les anciennes associations `button.target` deviennent des actions de changement de fond et sont conservées.

Les actions, états, cibles, réglages vidéo et médias associés sont inclus dans le ZIP. Les duplications de pages remappent les références internes aux calques, boutons, variantes et états ; les médias restent partagés. Supprimer un calque ou un état retire les références qui le ciblent. Supprimer une page remet les destinations concernées sur **Choisir une page**, sans les réattribuer à une autre page.

Les formats futurs et les références invalides sont refusés avant remplacement. Les garde-fous de quota, de conflits entre onglets et de restauration atomique avec copie précédente sont conservés. Aucun média personnel n’est envoyé à un serveur.

Avant une mise à jour, conservez un ZIP avec **Sauvegarder mon projet**. Une fois le projet migré en v4, une ancienne version de l’application peut refuser cette version plus récente ; utilisez l’application à jour plutôt qu’une réinitialisation.

## Tester sur Chrome / Vercel

La version autonome téléchargeable permet de tester une copie séparée de la présentation. Utilisez l’export/import ZIP pour transférer une copie, sans toucher au projet de production.

Après création de la pull request, vérifications vertes et fusion dans `main`, Vercel déploie automatiquement. L’adresse de production et la configuration `main` / `All Deployments` ne changent pas. La disponibilité de cette mise à jour doit être confirmée dans Vercel ; la compilation locale seule ne prouve pas un déploiement distant.

Les tests navigateur couvrent les cinq actions, les états, le reset sans écriture, MP4/WebM, les doubles clics, les verrouillages, les erreurs, les fins vidéo, les migrations v3 (IndexedDB et ZIP), les médias d’action dans les ZIP et les références après duplication/suppression. Les tests des phases précédentes restent exécutés. Les limites de taille ZIP et la mémoire nécessaire pour les grosses vidéos restent celles de l’application existante ; des projets de plusieurs gigaoctets ne sont pas validés.
