# Vidéo de navigation, phases et durées Timeline

## Utilisation

### Terminer une vidéo par un fondu

Sélectionner un bouton → **Actions** → **Naviguer vers une page** →
**Type de transition : Vidéo de transition**. Choisir/importer la vidéo, puis
cocher **Fondu croisé après la vidéo**. Régler la durée (100–3 000 ms,
600 ms au départ), la courbe et, si souhaité, la vitesse (0,25×–4×).
**Tester l’action** ou le mode **Test** prévisualisent le même passage.
L’option est désactivée pour les anciens boutons et les nouveaux réglages
restent facultatifs. Sans vidéo ni effet sélectionné, la navigation reste instantanée.

La dernière image décodée est conservée dans un bitmap réutilisé, uniquement
lorsque le fondu est demandé. Le DOM source est figé, y compris ses calques.
Le moteur d’effets commun réalise le fondu une fois les images de destination
prêtes. En cas de capture impossible, la vidéo d’origine reste montée, arrêtée
sur sa dernière image : le lecteur fond les vues natives ; l’éditeur superpose
progressivement la destination à la vidéo retenue. Aucun retour au début ni
recherche dans la vidéo. Les vidéos de test avec piste audio restent muettes,
comme les transitions existantes ; aucune piste n’est modifiée.

Une erreur de lecture avec cette option mène à la destination préparée, sans
fondu. Une image de destination illisible conserve la source et signale l’erreur.
L’annulation et les identifiants d’opération empêchent les anciennes lectures
ou les clics répétés de déclencher une navigation tardive. Les préférences
système de réduction des animations sont respectées par le moteur commun.
Les autres actions vidéo et leurs actions de fin ne sont pas réécrites.

### Commandes des phases

Sélectionner la Timeline → **Phases** :
**Afficher les boutons de navigation des phases**, **Positionner les boutons
de phases**, X/Y et réinitialisation restent les commandes existantes.
Elles agissent sur le groupe de navigation dans la page, indépendamment des
bulles des phases. Les masquer libère maintenant l’espace d’en-tête réservé,
sans supprimer les phases, les étapes ou leurs réglages.

### Dates et durées d’une étape

Sélectionner la Timeline, puis **Modifier l’étape…**.
Ouvrir **Dates et durée de l’étape** et saisir début/fin avec les champs de dates.
La convention est le nombre de **jours écoulés**, sans compter deux fois les
extrémités : 1–29 novembre 2026 = **28 jours** ; même jour = 0 jour.
Les dates sont calendaires, calculées en UTC sans heure locale ni décalage DST.
Une fin antérieure au début est signalée ; le brouillon invalide n’écrase pas
les dates enregistrées.

Sans dates exactes, saisir une estimation. **14 jours** et **3 semaines** sont
convertibles en 14 et 21 jours pour les proportions. **2 mois**, **3 à 4 semaines**
et les textes libres sont conservés tels quels, sans inventer de durée précise.
Dans ces cas, C affiche l’estimation ; A/B nécessitent une longueur personnalisée.
Des dates complètes et valides ont priorité pour la durée calculée.

Dans **Dates et durées — réglages globaux**, choisir les affichages par défaut :

- **A : barre de durée**, au-dessus de la bulle ; couleur, épaisseur, opacité,
  arrondis, décalage perpendiculaire, texte et dates aux extrémités.
- **B : extension depuis la bulle**, avec trait/point/flèche de fin ou aucun ;
  couleur, épaisseur, opacité, décalage, taille du marqueur et direction.
- **C : étiquette**, avec début, fin, durée/estimation indépendants, format de
  date, taille, couleurs, opacité du fond, arrondis et décalage X/Y.

Les trois sont cumulables. Seul C est activé par défaut, et rien n’est ajouté aux
anciennes étapes sans données temporelles. Décochez **Hériter de l’affichage
global des durées** pour régler A/B/C séparément sur une étape.
**Personnaliser le style…** donne une apparence propre à l’étape ; rétablir
l’apparence globale conserve ses modes de longueur et longueurs indépendantes.
Les changements globaux n’écrasent pas les personnalisations locales.

**Positionner l’étiquette de durée** permet de glisser C dans le canevas :
son décalage reste relatif à sa bulle, y compris avec rotation, zoom et centrage.
Les flèches déplacent d’un pixel logique (Maj : dix). Échap annule un glisser
en cours, puis quitte ce mode. Un glisser validé représente une entrée d’historique.
Les titres des étapes et des phases conservent leurs propres positions.

## Échelle et longueurs

L’échelle est commune, en pixels logiques par jour ou par semaine.
Par défaut, 14 jours = 100 px, 28 jours = 200 px et 42 jours = 300 px.
Le changement d’unité conserve l’échelle dans la plage admise de 0,01–1 000
pixels par unité ; une valeur atteignant une borne est limitée explicitement.

Dans les sections A/B de l’étape, **Longueur : mode** propose :

- **Proportionnelle**, calculée à partir des données temporelles et de l’échelle.
- **Personnalisée**, avec champ numérique et curseur distincts pour A et B.

**Rétablir la longueur proportionnelle A/B** revient au calcul sans modifier les
dates ni l’estimation. C reste toujours exact. Un repère **hors échelle** apparaît
seulement en Édition. Le déplacement direct de l’extrémité n’est pas ajouté :
utiliser le champ ou le curseur ; le glisser dans le canevas concerne C.

Les durées décorent la géométrie existante : elles ne déplacent pas les bulles,
les connexions, les groupes, les titres personnalisés ou l’ordre chronologique.
B suit l’axe horizontal/vertical et la direction locale des rangées zigzag, y
compris pour les groupes parallèles ; sa direction peut aussi être imposée.
Les deux branches d’un groupe conservent leurs durées propres : 2 et 6 semaines
produisent un rapport 1:3. La révélation reste collective pour le groupe.
Les indicateurs partagent les transformations et la visibilité de leur bulle.

Des barres longues peuvent se croiser ou déborder dans la zone défilable.
Les décalages A/B, le déplacement de C, l’espacement et le cadrage existants
permettent de les ajuster ; aucun placement automatique n’écrase les positions.

## Données et validation

Format de document **37** : champs temporels facultatifs `step.timing`, réglages
globaux facultatifs `timeline.design.duration`, options facultatives
`action.navigationTransition.afterVideo` et `playbackRate`.
Les versions 1–36 sont acceptées sans inventer de données temporelles.
Les propriétés inconnues, identifiants, médias et réglages existants sont conservés.
La base IndexedDB et les magasins sont inchangés. ZIP utilise les mêmes champs
et validations, la même préparation des médias et la même restauration atomique.

Points de restauration du code : branche `codex/video-fade-timeline-durations`,
tag initial `safety/video-duration-initial-20261026` et commits progressifs.
Le bundle Git vérifié est dans `/workspace/backups/` ; il ne contient **pas** les
présentations privées enregistrées dans le Chrome de l’utilisateur.
Aucune base utilisateur n’a été réinitialisée et aucun déploiement de production
n’a été demandé.

Les tests utilisent des projets et médias synthétiques, pas les données privées.
La compilation, les tests ciblés et la suite complète sont rapportés dans la PR.
Navigateurs autres que Chromium : non exécutés dans cet environnement.
