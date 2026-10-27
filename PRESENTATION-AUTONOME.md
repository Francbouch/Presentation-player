# Télécharger et envoyer une présentation autonome

## Pour créer la copie

1. Dans l’éditeur, ouvrez **Fichier → Télécharger une présentation autonome**.
2. Lisez les informations puis cliquez sur **Confirmer**.
3. Attendez la vérification des médias et la création de `presentation-autonome.zip`.
4. Envoyez ce ZIP à votre destinataire, par exemple par courriel si sa taille le permet ou par votre outil habituel de transfert de fichiers.

Le projet de travail et sa sauvegarde IndexedDB ne sont pas modifiés. Les changements ultérieurs ne changent pas le fichier déjà envoyé : exportez une nouvelle copie pour transmettre une nouvelle version. Conservez également votre sauvegarde ZIP éditable habituelle ; la copie autonome ne la remplace pas.

## Gros projets (500 Mo et plus)

1. Dans Chrome ou Edge sur ordinateur, ouvrez **Fichier → Exporter un dossier autonome (gros projets)**.
2. Confirmez puis choisissez un dossier sur votre ordinateur. Chrome demande l’autorisation d’y écrire ; acceptez cette autorisation pour terminer l’export.
3. Un nouveau sous-dossier `Presentation-…` est créé. Attendez le message **Dossier autonome créé**. Le fichier HTML final n’est écrit qu’après tous les médias, le lecteur et les licences.
4. Transmettez **tout ce sous-dossier**, y compris `medias`, `presentation.js`, `lecteur.js`, `lecteur.css` et les licences. Pour obtenir un seul fichier à transmettre, utilisez « Compresser » / « Envoyer vers un dossier compressé » dans l’explorateur de fichiers de votre ordinateur.
5. Le destinataire décompresse le dossier entier et ouvre **Ouvrir la présentation.html** dans Chrome ou Edge récent.

Ce mode n’a pas la limite de 256 Mo du HTML intégré. Il écrit les médias par morceaux de 4 Mo, sans construire une énorme archive ou une chaîne HTML de 500 Mo en mémoire. Il dépend néanmoins de l’espace disque disponible et des capacités du navigateur à lire le projet. Le lecteur reconstitue progressivement les médias en Blob locaux avant de démarrer ; les gros projets demandent toujours des ressources à l’ouverture.

Une compression **gzip sans perte** est conservée uniquement si elle gagne au moins 3 % sur un morceau. Les vidéos MP4/WebM, déjà compressées, peuvent ne presque pas rétrécir : aucune réduction de résolution, de débit, de fréquence d’image, ni conversion avec perte n’est appliquée. Le résultat conserve exactement les octets des originaux. Les morceaux sont encodés pour fonctionner depuis `file://` sans serveur, ce qui peut augmenter la taille sur disque d’environ un tiers pour les vidéos peu compressibles. Compresser le dossier avec l’ordinateur récupère généralement une grande partie de ce surcoût ; aucun taux de réduction n’est garanti.

Les morceaux sont des scripts de données, chargés puis retirés un par un. Ils créent des Blob URL dans le lecteur : les transitions qui capturent une image vidéo dans un canevas restent utilisables. Aucun `fetch` de fichier local, serveur, téléversement ou accès IndexedDB n’est requis pour lire la copie.

Annuler le choix du dossier n’écrit rien. En cas d’erreur après le début, un sous-dossier incomplet peut rester sur le disque ; ne le transmettez pas et recommencez dans un nouveau sous-dossier. L’application ne supprime pas de fichiers et ne modifie pas le projet original. Si les fichiers du dossier ont été séparés, le lecteur affiche un message demandant de conserver l’ensemble.

## Pour le destinataire

1. Téléchargez le ZIP et **décompressez-le entièrement**.
2. Ouvrez **Ouvrir la présentation.html** avec une version récente de Chrome ou Edge, puis cliquez sur **Ouvrir la présentation**.
3. Utilisez les boutons et interactions habituels. Espace avance, flèche gauche revient, F active le plein écran.

Aucun compte, serveur, terminal ou connexion à l’éditeur n’est nécessaire. Dans le mode ZIP classique, le HTML contient les médias et le lecteur. Dans le mode gros projet, ces ressources restent dans les fichiers voisins : conservez impérativement tout le dossier. Les polices officielles et licences sont incluses dans les deux modes.

## Contenu et confidentialité

Le lecteur réutilise le moteur Présentation existant : états, boutons, transitions CSS/vidéo, vidéos dans les calques, Timeline, séquences parallèles et fiches éditables. Il possède une entrée compilée séparée qui ne charge ni l’éditeur ni les fonctions IndexedDB. Les interactions restent uniquement en mémoire et ne modifient jamais votre projet original.

Les notes du présentateur, la bibliothèque de composants non utilisée et les médias inutilisés ne sont pas inclus. Les médias identiques utilisés par plusieurs références sont intégrés une seule fois, sans changer leurs ID ou leur cadrage. Les médias sont entièrement lus et vérifiés avant qu’un fichier soit proposé au téléchargement. Un échec ne crée pas de copie partielle annoncée comme complète.

Toute personne ayant le fichier peut le copier et en extraire les données ou médias. Cette copie n’est ni chiffrée ni révocable ; lecture seule signifie absence d’outils d’édition et de connexion au projet d’origine, pas protection contre les captures ou la modification manuelle d’un fichier reçu.

## Limites

- Maximum **256 Mo de médias utilisés** avant encodage. Le HTML est plus volumineux que les médias originaux et nécessite de la mémoire à l’ouverture. Pour dépasser cette limite, utilisez l’export par dossier décrit ci-dessus.
- Les vidéos locales nécessitent un codec pris en charge par le navigateur ; leur qualité originale est conservée.
- YouTube et les liens externes nécessitent Internet. Les vidéos YouTube ne sont pas téléchargées. YouTube peut refuser l’intégration depuis une URL `file://` (notamment erreur 153) : le lecteur propose alors **Ouvrir sur YouTube**. Les restrictions de la vidéo d’origine restent applicables.
- Le navigateur peut exiger un clic pour démarrer une vidéo ou du son. Le plein écran dépend aussi du navigateur.
- Une politique d’entreprise peut bloquer l’ouverture des HTML locaux ou les scripts. Demandez alors à votre service informatique un mode de transmission autorisé ; ce logiciel ne contourne pas ces protections.
- Aucun serveur cloud, lien public, mot de passe ou système de révocation n’est ajouté. Aucune configuration Vercel n’est modifiée.

## Développement et vérification

`npm install`, puis `npm run build` génère automatiquement `dist/autonomous-player.json` : moteur IIFE autonome, CSS, polices et licences, sans médias utilisateur. Il est chargé uniquement lorsqu’un export est demandé. Le serveur Vite fournit la même ressource en développement.

Les tests `tests/autonomous-export.spec.js` téléchargent réellement le ZIP, extraient le HTML et l’ouvrent dans un contexte vierge, hors ligne, en bloquant tout accès IndexedDB. Les contrôles GitHub utilisent une vraie URL `file://`. Pour l’environnement local dont Chrome administré bloque ces URL, `STUDIO_TEST_HTML_IN_MEMORY=1` vérifie explicitement le HTML en mémoire ; cette vérification ne prouve pas à elle seule l’ouverture par double-clic. La lecture réelle YouTube ne peut pas être garantie par le test de son API simulée.

Point de restauration du code : `safety/autonomous-export-initial-20261027`. Bundle Git complet vérifié dans `/workspace/backups/presentation-player-before-autonomous-export.bundle`. Ces sauvegardes concernent le code ; cet environnement n’accède pas aux présentations privées du Chrome de l’utilisateur. Aucune réinitialisation de données ni mise en production automatique.

## Vérification du mode gros projet

`tests/large-autonomous-export.spec.js` vérifie un export de plus de 500 Mo de données synthétiques, les écritures bornées, les octets après compression/décompression, le dossier réel avec images/MP4/navigation/plein écran, l’annulation, le navigateur incompatible et le disque plein. Le sélecteur de dossier natif est simulé dans les tests ; les fichiers produits sont réellement écrits sur disque. Comme pour le ZIP, CI ouvre le vrai HTML `file://`, et le mode de test local explicitement en mémoire ne prouve pas à lui seul l’ouverture par double-clic. Les données synthétiques fortement compressibles ne constituent pas une mesure de mémoire ou de performances sur 500 Mo de vidéos réelles.

Sauvegarde du code avant cette évolution : tag `safety/large-export-initial-20261027`, bundle vérifié `/workspace/backups/presentation-player-before-large-export.bundle`. Aucune migration IndexedDB, aucun changement du format ZIP éditable, aucune donnée privée du navigateur sauvegardée ni modifiée.
