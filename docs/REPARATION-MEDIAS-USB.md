# Médias importés depuis une clé USB

Un fichier choisi dans le navigateur peut rester une référence au fichier externe. Si Chrome ne peut plus le lire, la sauvegarde IndexedDB affiche `InvalidBlob` et l’export ZIP peut aussi échouer.

Les nouveaux imports recopient désormais les octets avant la validation du média. La copie ne modifie pas l’image ou la vidéo ; les portions sont lues par blocs de 16 Mo. Le média peut être sauvegardé et exporté même lorsque le fichier source devient indisponible. Une importation illisible est refusée sans remplacement.

La sauvegarde tente une seule récupération sur l’erreur spécifique `InvalidBlob`, en recopiant les blobs encore lisibles. Les copies sont réutilisées lors des sauvegardes suivantes. Les conflits de révision et les quotas ne déclenchent pas cette récupération. Les écritures et les checkpoints restent atomiques. Aucune base ou média n’est supprimé.

Si les anciens fichiers sont déjà illisibles, une copie est impossible sans le fichier original. Le panneau **Réparer les médias provenant d’une clé USB** apparaît sous le message d’erreur en mode Éditeur. Reconnectez la clé ou copiez les fichiers sur l’ordinateur, puis choisissez **Rattacher le fichier original** pour le nom concerné. Le nom, la taille et le format doivent correspondre. Le média est recopié sous son identifiant existant ; ses usages dans les pages, variantes, boutons, états et transitions restent intacts. Les médias conservés mais inutilisés peuvent également être réparés.

Une fois le statut **Sauvegardé dans ce navigateur** obtenu, exportez un ZIP. Ne fermez pas et n’actualisez pas une ancienne page contenant des modifications non sauvegardées si l’export ZIP échoue. Le déploiement d’une correction ne met pas à jour le JavaScript d’un onglet déjà ouvert et ne récupère pas automatiquement ses modifications en mémoire.

## Validation

Les tests couvrent une erreur InvalidBlob ponctuelle et persistante, la conservation du projet et de sa révision, un conflit concurrent pendant la récupération, les copies d’image et de vidéo après suppression des sources temporaires, leur intégrité dans le ZIP, la lecture MP4, le refus d’un fichier devenu illisible et la réparation par identité du média.
