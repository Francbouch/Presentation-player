# Afficher un état après une vidéo

Sélectionnez un bouton, ouvrez **Actions**, puis choisissez **Lancer une vidéo**. Le réglage **Après la vidéo** permet de :

- Afficher une image, avec les mêmes contrôles qu’auparavant.
- Afficher un état interactif de cette diapositive.
- Ne rien changer / revenir à l’affichage précédent.
- Passer à une autre page, option existante conservée.

Pour l’exemple du lit, créez les états **Lit fermé** et **Lit ouvert**, choisissez la vidéo d’ouverture sur le bouton, puis **Afficher un état interactif → Lit ouvert**. Le nom peut changer ensuite : le lien utilise l’identifiant de l’état.

Sans état disponible, un message invite à en créer un dans **États interactifs**. Si l’état choisi est supprimé ou si le bouton est collé sur une page qui ne possède pas cet identifiant, un avertissement apparaît. La vidéo ne peut pas être testée tant qu’un état valide n’est pas choisi. Un nom identique sur une autre page ne crée pas de lien automatique. Dupliquer une page remappe correctement les liens vers ses états dupliqués.

## Passage vidéo → état

Les images de l’état cible sont préchargées pendant la vidéo. Après sa fin normale, l’application utilise le même instantané d’état que la sélection habituelle : arrière-plan ou variante, visibilité des calques et boutons, bouton actif et groupes de sélection.

La dernière frame reste visible pendant la préparation. L’état est installé sous la vidéo ; l’application attend ensuite que les images réellement montées soient prêtes avant de retirer la vidéo. Une marque de préparation propre à chaque lecture permet de gérer aussi un état qui conserve le même arrière-plan ou qui est déjà l’état actif.

Le raccord après vidéo est une coupe directe. Aucun fondu noir ou animation d’état n’est ajouté à ce raccord. Les effets configurés pour une sélection normale d’état continuent à fonctionner en dehors de ce raccord.

Un échec de préparation conserve l’affichage précédent et débloque les commandes avec un message. La préparation finale dispose d’un garde-fou de 15 secondes pour éviter un blocage indéfini. Le bouton **Arrêter la vidéo** reste utilisable pendant cette préparation et annule le changement d’état en cours.

## Interruptions

Seule la fin normale de la vidéo concernée peut appliquer l’état. L’arrêt manuel, une erreur, la sortie de la page ou une ancienne fin de lecture ne doivent pas l’appliquer. Mettre la vidéo en pause ne déclenche pas l’état.

Une vidéo verrouillée bloque les autres commandes comme auparavant. Une autre vidéo déclenchée pendant une lecture non verrouillée remplace l’ancienne ; les doubles déclenchements du même bouton sont ignorés. Pendant la préparation finale, les commandes sont temporairement bloquées, même pour une vidéo non verrouillée, afin d’éviter un affichage partiellement appliqué.

## Conservation des données

Le format v12 ajoute la destination d’état facultative aux actions vidéo. Les anciens projets et les modes image, retour et page sont conservés sans modification de leurs paramètres. L’option et l’identifiant sont sauvegardés automatiquement dans IndexedDB et inclus dans les ZIP. La base IndexedDB, les médias, les réglages GitHub/Vercel et l’adresse de production ne changent pas.
