# Éditeur de calques — phase 1

Cette mise à jour conserve l’application existante, les médias du navigateur, les boutons qui changent le décor, les variantes et les transitions vidéo à coupure instantanée.

## Tester visuellement

1. Avant la mise à jour du site, cliquez sur **Sauvegarder mon projet** et conservez le ZIP téléchargé.
2. Sélectionnez une page dans la colonne de gauche. Une image Canva complète reste utilisable comme arrière-plan avec **Importer / remplacer l’image**.
3. Dans la barre d’outils, choisissez **Image**, **Texte**, **Rectangle**, **Cercle**, **Ligne** ou **Bouton**. Image ouvre le choix d’un fichier PNG, JPG, JPEG ou WebP ; sa transparence est conservée. Bouton conserve ses réglages habituels plus bas dans l’éditeur.
4. Cliquez sur un élément dans l’aperçu ou dans **Calques**. Glissez-le pour le déplacer. Glissez une poignée de coin pour changer sa taille et la poignée **↻** pour le faire pivoter. Les flèches du clavier ajustent le calque sélectionné ; Maj permet un pas plus grand.
5. À droite, modifiez son nom, sa position, ses dimensions, sa rotation, son opacité et sa visibilité. Le texte simple se modifie dans **Contenu du texte**. La mise en forme avancée viendra dans la phase 3.
6. Utilisez **Premier plan**, **Arrière-plan**, **Monter le calque** et **Descendre le calque**. Le haut de la liste Calques correspond au premier plan, y compris pour les boutons.
7. L’œil masque/affiche un calque ; le cadenas bloque son déplacement et ses poignées. Un calque masqué reste accessible dans la liste et dans les propriétés.
8. Dupliquez ou supprimez un calque. **Annuler / Rétablir** conserve les 20 dernières modifications de la séance. Cet historique se réinitialise à la fermeture/actualisation et lors d’une restauration ZIP ; ce n’est pas une sauvegarde permanente.
9. **Tester les interactions** active les boutons habituels sans déplacement. **Lancer la présentation** affiche les calques sans les poignées. Espace, flèche gauche et F continuent de fonctionner.
10. Attendez **Sauvegardé dans ce navigateur**, actualisez, puis vérifiez les calques. Exportez un ZIP et importez-le dans un autre navigateur pour vérifier la restauration complète.

Les panneaux Calques, Pages et Propriétés sont repliables en cliquant sur leur titre. Sur les écrans plus étroits, les propriétés passent sous l’aperçu.

## Mise en ligne

Le site Vercel existant ne change pas tant que cette branche n’est pas intégrée dans main et redéployée. Les déploiements automatiques restent désactivés. Après vérification GitHub et fusion, redéployez la version de main depuis Vercel en conservant **Vercel Authentication → All Deployments**. Vérifiez l’identifiant du commit : **Redeploy** d’un ancien déploiement peut reprendre l’ancienne version. Utilisez toujours la même adresse de production pour retrouver les données locales.

## Données et limites

- Version du document : **3**. Base IndexedDB et magasin inchangés (`presentation-studio`, `documents`, version de base 1).
- Les documents et ZIP v1/v2 restent lisibles. La migration ajoute les propriétés des calques aux boutons existants et conserve leurs identifiants, cibles, médias et métadonnées. Une version future ou des calques illisibles sont bloqués sans réinitialisation.
- Les nouveaux calques sont dans `page.layers`. Les anciens boutons restent dans `page.buttons`. `page.layerOrder` définit l’ordre commun, du fond au premier plan.
- Géométrie normalisée, rotation en degrés autour du centre, opacité de 0 à 1. Un élément tourné peut dépasser visuellement le cadre ; la diapositive le découpe.
- Images conservées en Blob dans IndexedDB. Une duplication de page/calque référence le même média. Le sélecteur **Image du calque** permet aussi de réutiliser une image du projet. Les URL Blob sont réutilisées tant que le média reste identique et libérées lorsqu’il n’est plus utilisé.
- Le texte simple utilise la même police et une taille proportionnelle à la largeur de la diapositive dans l’éditeur et le lecteur. Les polices, tailles personnalisées, styles et édition au double-clic attendent la phase 3.
- Limite d’ajout de 500 éléments par page ; une ancienne page qui en contient davantage n’est pas effacée. Les limites ZIP restent 1 Go compressé, 2 Go décompressés et 5 Mo de configuration. La génération ZIP utilise la mémoire du navigateur ; les projets de plusieurs gigaoctets ne sont pas validés.
- Aucune nouvelle action de bouton, timeline ou synchronisation cloud dans cette phase.

## Vérification technique

`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:production` construit l’application et exécute les tests navigateur avec les en-têtes de production. CI utilise Chromium installé par Playwright. Les tests de calques vérifient les gestes, la rotation, le verrouillage, l’ordre, l’historique, la transparence, le partage des médias, le texte en plein écran, la persistance, les migrations, les ZIP et la conservation des données invalides. Ces vérifications locales ne remplacent pas le contrôle du déploiement et de l’authentification Vercel.
