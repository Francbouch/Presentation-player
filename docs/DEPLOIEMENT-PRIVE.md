# Ouvrir Studio dans Chrome avec Vercel

## État réel de la préparation

Le projet existant est préparé pour Vite sur Vercel : `npm ci`, `npm run build`, sortie `dist`, Node 24. `vercel.json` décrit le build et les en-têtes de sécurité. Il **ne crée pas d’authentification**.

Aucun compte Vercel n’est connecté à cette session et aucun déploiement n’a été créé. Au moment de l’inspection, la branche GitHub `main` ne contenait que le README initial. Le code de l’application doit encore être intégré à GitHub avant un premier déploiement.

Après activation de Vercel Authentication avec **All Deployments**, vérification de la connexion requise en navigation privée et accord de l’utilisateur, les déploiements Git sont activés uniquement pour `main` : `git.deploymentEnabled` contient `main: true` et `*: false`. Une fusion de pull request vers main déclenche donc la mise à jour de production. Les branches de travail ne sont pas déployées automatiquement. Cette configuration ne remplace pas l’authentification : conservez **All Deployments** dans les réglages Vercel.

## Avant de cliquer sur « Deploy » : confirmer la confidentialité

Il faut une protection d’accès **côté Vercel, couvrant la production et tous les domaines/alias**. Un mot de passe uniquement dans le code React, une adresse difficile à deviner ou un dépôt GitHub privé ne protège pas un site publié.

Les pages officielles à vérifier sont :

- https://vercel.com/docs/deployment-protection
- https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication
- https://vercel.com/docs/deployment-protection/protection-levels
- https://vercel.com/pricing
- https://vercel.com/docs/plans/hobby

L’accès à ces pages était bloqué par la politique réseau de l’environnement de travail. Les tarifs et disponibilités actuels **ne sont pas vérifiés**. Les points ci-dessous sont des indications à confirmer dans Vercel avant tout achat ou déploiement :

- Vercel Authentication permet une connexion avec un compte Vercel. Sa protection standard a couvert les previews et les URL de déploiement, mais pas nécessairement l’adresse de production stable.
- Une protection couvrant **All Deployments**, y compris la production, a nécessité un plan approprié et/ou l’option Advanced Deployment Protection. Vérifier que cette couverture est réellement incluse ; ne pas déduire sa présence du seul nom « Pro ».
- À titre indicatif historique, Pro a commencé à environ 20 USD par utilisateur/mois et Advanced Deployment Protection a coûté environ 150 USD/mois en supplément. Ce ne sont pas des tarifs confirmés pour votre compte aujourd’hui ; les taxes, frais d’usage et changements d’offre peuvent modifier le coût.
- Le plan Hobby a été réservé à un usage personnel non commercial. Une présentation professionnelle peut nécessiter un autre plan, même si le site n’est utilisé que par une personne.

Si la protection adaptée est payante, nous devons choisir ensemble avant de continuer. Une autre piste est un hébergement avec contrôle d’identité à l’entrée, par exemple Cloudflare Access ; son offre gratuite éventuelle, le coût du domaine et la protection de toutes les URL directes devront aussi être vérifiés. La version HTML locale reste utilisable en attendant, sans publication du site.

**Ne cliquez pas sur « Deploy » tant que le coût, la couverture des domaines et la protection du premier déploiement ne sont pas confirmés.** Aucun site public ne sera publié sans votre accord explicite.

## La procédure, uniquement avec des boutons dans le navigateur

1. Dans l’application actuelle, cliquez sur **Sauvegarder mon projet**. Conservez le ZIP dans un dossier sécurisé.
2. Créez votre compte Vercel depuis https://vercel.com, avec votre compte GitHub si vous le souhaitez. Ne lancez pas de déploiement pour le moment.
3. Validez avec nous le plan et la méthode d’accès privé, puis configurez cette protection avant la première mise en ligne. Si l’interface ne permet pas de la configurer avant le premier déploiement, arrêtez-vous : nous devrons utiliser une création de projet sans déploiement ou une autre méthode vérifiée.
4. Dans GitHub, les changements de l’application doivent être intégrés à `main`. Si une pull request est proposée, ouvrez-la, vérifiez le résumé, puis cliquez sur **Merge pull request** une fois les validations approuvées. Il n’y a pas de terminal à utiliser sur votre ordinateur.
5. Dans Vercel, utilisez **Add New → Project**, connectez GitHub et choisissez **Francbouch/Presentation-player**. Donnez à Vercel l’accès à ce dépôt uniquement si l’interface le permet.
6. Vérifiez **Framework : Vite**, **Root Directory : racine du dépôt**, **Build Command : npm run build**, **Output Directory : dist**, **Install Command : npm ci**, **Node : 24** et **Production Branch : main**. Les commandes sont lues par Vercel ; vous n’avez pas à les exécuter sur votre ordinateur.
7. Après validation de l’authentification et votre accord explicite, la suspension dans `vercel.json` pourra être levée et le premier déploiement déclenché.
8. Ouvrez l’adresse de production affichée par Vercel dans une fenêtre Chrome normale. Conservez-la dans vos favoris et utilisez toujours cette adresse, par exemple le domaine stable du projet en `.vercel.app`. N’utilisez pas les URL uniques des nouveaux déploiements pour votre travail quotidien.
9. Importez votre ZIP pour transférer votre présentation depuis le Preview ou le fichier HTML. Ce transfert est nécessaire une fois : Chrome ne partage pas IndexedDB entre deux adresses différentes.
10. Avant de considérer l’accès privé comme validé, ouvrez le site et ses URL alternatives dans une fenêtre privée non connectée : le contenu, les fichiers JavaScript et les médias de démo doivent être refusés ou demander une authentification. Vérifier également les accès depuis une autre session autorisée.

Ces étapes sont préparées, mais l’interface Vercel, la connexion GitHub, l’authentification effective et les factures ne sont pas testées depuis cette session.

## Comment les futures modifications arriveront

Vous demandez une modification à Codex. Le code est modifié et testé, puis proposé dans une pull request GitHub. Tant que cette pull request n’est pas fusionnée dans `main`, elle ne change pas la production.

Après fusion, avec l’intégration Git Vercel active et la suspension retirée, Vercel compile la nouvelle version. Quand le déploiement de production indique **Ready**, actualisez le même favori Chrome. La même adresse HTTPS conserve la même origine IndexedDB. Un changement de domaine, de profil Chrome ou une fenêtre privée utilise un autre stockage.

Un déploiement contient le code et les démos, pas les médias importés dans votre navigateur. Vercel ne reçoit pas automatiquement vos images Canva ou vidéos Blender. Gardez le dépôt exempt de vos fichiers confidentiels : ne les ajoutez pas au dossier `public` ni à GitHub.

## Préserver votre travail pendant plusieurs mois

- Utilisez votre profil Chrome normal, toujours à la même adresse de production.
- Attendez **Sauvegardé dans ce navigateur** avant de fermer.
- Cliquez sur **Protéger le stockage local**. Chrome peut accorder ou refuser la demande ; même accordée, elle ne protège pas contre l’effacement manuel, une panne ou la perte de l’ordinateur.
- Cliquez sur **Sauvegarder mon projet** à la fin de chaque séance et avant une mise à jour importante. Le ZIP inclut toutes les pages, l’ordre, les images, vidéos, variantes, boutons, dimensions, positions, associations et réglages connus de la présentation.
- Gardez plusieurs copies datées dans un emplacement sécurisé hors des données du navigateur. Gardez aussi vos fichiers Canva/Blender d’origine.
- Une restauration vérifie le JSON, les références, les sommes CRC et la lisibilité des médias avant de modifier votre projet. Une erreur ou un manque d’espace conserve le projet actuel.
- Une copie locale du projet précédent est enregistrée dans la même transaction qu’une restauration réussie. **Récupérer le projet précédent** permet de revenir dessus. Cette copie est dans le même navigateur et ne remplace pas le ZIP indépendant.
- Deux onglets ne peuvent plus écraser silencieusement les changements de l’autre : en cas de conflit, exportez les changements de l’onglet concerné puis actualisez.
- Une version de données future ou illisible est bloquée sans suppression et sans remplacement par les démos. Les migrations connues ajoutent les champs sans supprimer le projet.

Limites : IndexedDB n’est pas une sauvegarde garantie. L’import ZIP est limité à 1 Go de fichier, 2 Go décompressés, 500 pages, 2 000 médias, 100 variantes par page et 2 500 entrées. Le ZIP est construit en mémoire ; les très grosses vidéos doivent être compressées avant importation. Un export dépassant les limites restaurables est refusé clairement, sans effacer le projet. Les tests utilisent des médias de démonstration et de petits fichiers ; les présentations de plusieurs Go, des mois d’usage et votre version exacte de Chrome ne sont pas simulés.

## Code préparé pour la revue GitHub

La branche **codex/private-vercel-ready** contient maintenant l’application complète et les protections de conservation des données. Aucun site Vercel n’a été publié. La branche `main` n’a pas été modifiée.

Pour proposer l’intégration depuis votre navigateur :

https://github.com/Francbouch/Presentation-player/pull/new/codex/private-vercel-ready

Choisissez `main` comme branche de destination, cliquez sur **Create pull request**, puis attendez les vérifications GitHub. Vous pouvez ensuite utiliser **Merge pull request** si le résumé et les vérifications vous conviennent. Le workflow distant n’a pas encore été exécuté depuis cette session. La suspension Vercel reste active même après cette fusion ; son activation nécessitera une seconde modification approuvée après vérification de l’authentification.

Validation locale : build de production réussi, 26 tests navigateur réussis sous les en-têtes déclarés, dont fermeture/réouverture d’un profil Chromium, restaurations ZIP, conflits entre onglets, images invalides, absence d’envoi de médias et continuité des transitions. Cela ne valide pas encore un déploiement réel sur Vercel ni votre version installée de Chrome.
