# Télécharger et envoyer une présentation autonome

## Pour créer la copie

1. Dans l’éditeur, ouvrez **Fichier → Télécharger une présentation autonome**.
2. Lisez les informations puis cliquez sur **Confirmer**.
3. Attendez la vérification des médias et la création de `presentation-autonome.zip`.
4. Envoyez ce ZIP à votre destinataire, par exemple par courriel si sa taille le permet ou par votre outil habituel de transfert de fichiers.

Le projet de travail et sa sauvegarde IndexedDB ne sont pas modifiés. Les changements ultérieurs ne changent pas le fichier déjà envoyé : exportez une nouvelle copie pour transmettre une nouvelle version. Conservez également votre sauvegarde ZIP éditable habituelle ; la copie autonome ne la remplace pas.

## Pour le destinataire

1. Téléchargez le ZIP et **décompressez-le entièrement**.
2. Ouvrez **Ouvrir la présentation.html** avec une version récente de Chrome ou Edge, puis cliquez sur **Ouvrir la présentation**.
3. Utilisez les boutons et interactions habituels. Espace avance, flèche gauche revient, F active le plein écran.

Aucun compte, serveur, terminal ou connexion à l’éditeur n’est nécessaire. Le fichier HTML contient le lecteur, les images, les vidéos locales et les polices officielles intégrées ; les autres fichiers du ZIP contiennent les instructions et licences.

## Contenu et confidentialité

Le lecteur réutilise le moteur Présentation existant : états, boutons, transitions CSS/vidéo, vidéos dans les calques, Timeline, séquences parallèles et fiches éditables. Il possède une entrée compilée séparée qui ne charge ni l’éditeur ni les fonctions IndexedDB. Les interactions restent uniquement en mémoire et ne modifient jamais votre projet original.

Les notes du présentateur, la bibliothèque de composants non utilisée et les médias inutilisés ne sont pas inclus. Les médias identiques utilisés par plusieurs références sont intégrés une seule fois, sans changer leurs ID ou leur cadrage. Les médias sont entièrement lus et vérifiés avant qu’un fichier soit proposé au téléchargement. Un échec ne crée pas de copie partielle annoncée comme complète.

Toute personne ayant le fichier peut le copier et en extraire les données ou médias. Cette copie n’est ni chiffrée ni révocable ; lecture seule signifie absence d’outils d’édition et de connexion au projet d’origine, pas protection contre les captures ou la modification manuelle d’un fichier reçu.

## Limites

- Maximum **256 Mo de médias utilisés** avant encodage. Le HTML est plus volumineux que les médias originaux et nécessite de la mémoire à l’ouverture. Réduisez les grosses vidéos avant l’export.
- Les vidéos locales nécessitent un codec pris en charge par le navigateur ; leur qualité originale est conservée.
- YouTube et les liens externes nécessitent Internet. Les vidéos YouTube ne sont pas téléchargées. YouTube peut refuser l’intégration depuis une URL `file://` (notamment erreur 153) : le lecteur propose alors **Ouvrir sur YouTube**. Les restrictions de la vidéo d’origine restent applicables.
- Le navigateur peut exiger un clic pour démarrer une vidéo ou du son. Le plein écran dépend aussi du navigateur.
- Une politique d’entreprise peut bloquer l’ouverture des HTML locaux ou les scripts. Demandez alors à votre service informatique un mode de transmission autorisé ; ce logiciel ne contourne pas ces protections.
- Aucun serveur cloud, lien public, mot de passe ou système de révocation n’est ajouté. Aucune configuration Vercel n’est modifiée.

## Développement et vérification

`npm install`, puis `npm run build` génère automatiquement `dist/autonomous-player.json` : moteur IIFE autonome, CSS, polices et licences, sans médias utilisateur. Il est chargé uniquement lorsqu’un export est demandé. Le serveur Vite fournit la même ressource en développement.

Les tests `tests/autonomous-export.spec.js` téléchargent réellement le ZIP, extraient le HTML et l’ouvrent dans un contexte vierge, hors ligne, en bloquant tout accès IndexedDB. Les contrôles GitHub utilisent une vraie URL `file://`. Pour l’environnement local dont Chrome administré bloque ces URL, `STUDIO_TEST_HTML_IN_MEMORY=1` vérifie explicitement le HTML en mémoire ; cette vérification ne prouve pas à elle seule l’ouverture par double-clic. La lecture réelle YouTube ne peut pas être garantie par le test de son API simulée.

Point de restauration du code : `safety/autonomous-export-initial-20261027`. Bundle Git complet vérifié dans `/workspace/backups/presentation-player-before-autonomous-export.bundle`. Ces sauvegardes concernent le code ; cet environnement n’accède pas aux présentations privées du Chrome de l’utilisateur. Aucune réinitialisation de données ni mise en production automatique.
