# Télécharger et envoyer une présentation autonome

## Recommandé : un seul fichier à partager par Google Drive

1. Dans Chrome ou Edge récent sur ordinateur, ouvrez **Fichier → Exporter un seul fichier HTML**.
2. Laissez **Réduire à 250 Mo maximum** décoché : ce mode garde les images et vidéos originales, sans analyse de durée, réencodage ou limite de taille imposée par l’application.
3. Cliquez sur **Créer le fichier** et choisissez où enregistrer `presentation-interactive.html`. Attendez **Fichier enregistré**. Un navigateur sans sélecteur d’enregistrement prépare un téléchargement classique et affiche **Télécharger le fichier HTML**.
4. Déposez ce fichier dans Google Drive et partagez son lien avec votre destinataire.
5. Le destinataire clique sur **Télécharger** dans Google Drive, puis ouvre le HTML téléchargé dans Chrome ou Edge récent et clique sur **Ouvrir la présentation**. L’aperçu Google Drive n’exécute pas la présentation. Aucun dossier, ZIP, installation ou compte Studio n’est nécessaire.

Les médias locaux, boutons, états, transitions, Timeline et polices sont intégrés au seul fichier. Les notes privées restent exclues. Les vidéos YouTube et les liens externes nécessitent Internet. Les limites de codecs ou politiques d’entreprise du navigateur restent applicables ; la lecture n’est pas garantie dans n’importe quel navigateur ou ordinateur.

Un projet de 500 Mo de médias utilisés peut produire un HTML d’environ 670 Mo, à cause de l’encodage, plus le lecteur et les polices. Il n’y a pas de plafond arbitraire, mais l’espace disque et la mémoire restent nécessaires pour créer et ouvrir le fichier. Dans Chrome/Edge, l’écriture se fait progressivement par morceaux de 3 Mo, avec attente de chaque écriture, sans construire tout le fichier en mémoire. Le mode de téléchargement classique rassemble des Blob en mémoire et peut être moins adapté aux très gros projets.

L’enregistrement direct utilise une écriture transactionnelle du navigateur : le fichier n’est validé qu’après succès ; en cas d’annulation ou d’erreur, l’écriture est abandonnée. Aucun fichier n’est supprimé par l’application. Le projet IndexedDB, ses médias, l’historique et la sauvegarde éditable ne sont jamais modifiés.

## Ancienne option : créer la copie ZIP

1. Dans l’éditeur, ouvrez **Fichier → Télécharger une présentation autonome**.
2. Lisez les informations puis cliquez sur **Confirmer**.
3. Attendez la vérification des médias et la création de `presentation-autonome.zip`.
4. Envoyez ce ZIP à votre destinataire, par exemple par courriel si sa taille le permet ou par votre outil habituel de transfert de fichiers.

Le projet de travail et sa sauvegarde IndexedDB ne sont pas modifiés. Les changements ultérieurs ne changent pas le fichier déjà envoyé : exportez une nouvelle copie pour transmettre une nouvelle version. Conservez également votre sauvegarde ZIP éditable habituelle ; la copie autonome ne la remplace pas.

## Option facultative : compresser le HTML à 250 Mo

1. Ouvrez **Fichier → Exporter un seul fichier HTML** et cochez **Réduire à 250 Mo maximum**. Ce mode est facultatif : il reste soumis au budget de taille décrit ci-dessous.
2. Cliquez sur **Créer le fichier** et gardez l’onglet ouvert. L’analyse et la compression peuvent prendre plusieurs minutes selon la durée des vidéos et votre ordinateur. **Annuler la compression** permet d’interrompre l’opération sans modifier le projet.
3. Le poids final est affiché. Cliquez sur **Télécharger le fichier HTML** : vous obtenez `presentation-interactive.html`, un seul fichier sans dossier voisin, ZIP ou installation.
4. Envoyez-le par votre outil de transfert habituel. Le destinataire ouvre ce fichier avec Chrome ou Edge récent puis clique sur **Ouvrir la présentation**.

L’objectif retenu est **250 000 000 octets**, soit 250 Mo décimaux pour le fichier HTML entier : vidéos, images, lecteur, polices, configuration, licences et surcoût d’encodage inclus. Le poids réel est contrôlé avant de proposer le fichier ; un fichier dépassant la limite n’est jamais annoncé comme prêt. Ce n’est pas une garantie que chaque projet pourra tenir dans cette limite : si les images sont trop lourdes, les vidéos trop longues, la compression insuffisante, une piste illisible ou un codec indisponible, un message explique la limite. Décochez l’option de compression pour exporter le même projet en un seul HTML sans plafond de 250 Mo.

Pour réduire les vidéos, le navigateur utilise WebCodecs via Mediabunny, chargé uniquement lorsque la compression est nécessaire. Les copies exportées passent en **WebM VP9 + audio Opus 128 kbit/s par piste**, sans téléversement de médias. Le budget tient compte de la durée, du nombre de pistes, des images conservées et du coût HTML. Résolution jusqu’à 1920×1080 ; 1280×720 lorsque le débit disponible est inférieur à 1,5 Mbit/s. Les proportions et la cadence originale sont conservées, sans agrandir les petits médias. Un plan nécessitant moins de 650 kbit/s par piste vidéo est refusé plutôt que de forcer une forte dégradation. La qualité visuelle dépend du contenu ; aucune qualité « identique » ni réduction de moitié universelle n’est promise. Les copies déjà assez petites sont conservées ; une conversion plus grosse que son original est abandonnée. Aucune piste audio ou vidéo ne peut être silencieusement supprimée pendant une conversion.

Les images gardent leurs octets originaux et leur transparence. Les médias utilisent les mêmes identifiants dans le lecteur : boutons, états, cadrages, transitions et vidéos de calques continuent d’utiliser leurs références. Les notes du présentateur restent exclues. Les licences du lecteur et des polices sont incluses sous forme de JSON dans le HTML. Ce fichier est une copie figée en lecture seule, transférable et non révocable, pas une sauvegarde ZIP éditable.

**250 Mo dépasse les limites habituelles des courriels (souvent 20 à 25 Mo)**. Utilisez un lien de téléchargement. Certains services bloquent également les fichiers HTML en pièce jointe. YouTube et les liens externes nécessitent Internet ; les vidéos locales n’en ont pas besoin.

Le fichier est assemblé avec des morceaux de 3 Mo et des scripts intégrés qui reconstruisent des Blob locaux, puis se retirent du DOM. Le lecteur réutilise son moteur existant et ne charge ni l’éditeur, ni Mediabunny, ni IndexedDB. Cela évite un énorme JSON de médias à décoder en une fois, mais la conversion et l’ouverture d’un gros HTML demandent toujours de la mémoire. Ce mode est complémentaire de l’export par dossier, qui reste préférable si l’ordinateur manque de ressources ou si la qualité originale doit être conservée.

La sauvegarde IndexedDB et le format ZIP éditable ne changent pas. Les paramètres de compression sont des choix d’export, sans migration des présentations. Le document et les références Blob sont capturés avant l’analyse ; les copies transformées ne sont jamais réinjectées dans le projet.

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

## Vérification du fichier unique compressé

Les tests `tests/compressed-export.spec.js` vérifient le téléchargement du vrai HTML, son lecteur hors ligne sans IndexedDB, la navigation, le plein écran, les états et arrière-plans, l’exclusion des notes, une vraie conversion MP4 avec son vers WebM VP9/Opus, la durée et la dernière image verte, le budget final réel, les codecs absents, les images illisibles et l’annulation avant et pendant conversion. Les fixtures sont synthétiques ; les vidéos privées de l’utilisateur ne sont pas accessibles ici. La lecture via vrai `file://` est effectuée en CI ; le mode local en mémoire est explicitement signalé lorsque Chrome administré bloque ces URL.

Sauvegarde du code : `safety/compressed-export-initial-20261027`, bundle complet vérifié `/workspace/backups/presentation-player-before-compressed-export.bundle`. Cette sauvegarde ne contient pas les présentations privées du navigateur. Aucun déploiement automatique.

## Vérification du HTML sans limite de taille

`tests/unlimited-export.spec.js` couvre plus de 500 Mo synthétiques écrits vers un seul flux HTML de plus de 650 Mo, sans encodeur vidéo, avec écritures bornées ; l’enregistrement direct d’un vrai HTML et sa lecture hors ligne avec vidéo, navigation et plein écran ; l’annulation du sélecteur ; les transactions annulées sur disque plein ou interruption, sans remplacement d’un ancien fichier. Le sélecteur natif est simulé et la petite présentation de sortie est réellement écrite sur disque. Le gros test utilise un récepteur qui compte les octets pour ne pas accumuler 700 Mo dans le banc de test ; ce n’est pas une ouverture de 700 Mo sur un ordinateur client. Le navigateur administré local bloque file:// ; le mode local vérifie explicitement le HTML en mémoire, et CI vérifie l’ouverture du vrai fichier.

Sauvegarde du code initial : branche de travail dédiée, bundle vérifié `/workspace/backups/presentation-player-before-unlimited-html.bundle`. Aucun accès ni sauvegarde prétendue des présentations privées du navigateur utilisateur, aucune migration IndexedDB, aucun déploiement automatique.
