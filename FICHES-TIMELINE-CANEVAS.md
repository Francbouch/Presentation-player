# Fiches Timeline — calques indépendants

## Utiliser l’éditeur

1. Sélectionnez le calque **Ligne du temps**.
2. Dans ses propriétés, choisissez **Modifier l’étape…** puis **Modifier le contenu**.
   Cette commande est aussi disponible dans la barre de manipulation d’une fiche
   ouverte avec **Modifier la fiche dans la page**.
3. La fenêtre agrandie affiche les calques à gauche, le canevas au centre et les
   propriétés à droite. Ajoutez un titre, sous-titre, paragraphe, texte libre,
   image, vidéo, YouTube, rectangle, ligne, séparateur ou fond.
4. Sélectionnez un élément dans la liste ou le canevas. Déplacez-le et utilisez
   les poignées pour le redimensionner. Les champs X/Y et dimensions sont en
   pixels **de la fiche**, indépendants de la position de la diapositive.
5. **Terminer l’édition** revient à l’éditeur principal. Pour déplacer ou
   redimensionner **la fiche entière**, utilisez **Modifier la fiche dans la page**.

Chaque modification utilise l’historique et la sauvegarde automatique existants.
La fenêtre conserve ses dimensions logiques : son zoom agrandit uniquement la
vue de travail, sans changer les valeurs enregistrées.

## Texte et médias

Les textes utilisent les mêmes composants `TextSettings` et `TextBlock` que la
page : polices actuelles, recherche/favoris/récentes, graisses, taille, HEX,
gras/italique/souligné, alignements, interligne, espacement, marges, listes à
puces, retour à la ligne, majuscules et hauteur automatique facultative.
Le double-clic permet aussi la saisie directe. Un texte ne réorganise aucun
média voisin ; une zone trop petite signale sa coupure.

Les images et vidéos locales utilisent les cadres multimédias existants :
import PNG/JPG/JPEG/WebP et MP4/WebM, bibliothèque du projet, cadrage entier ou
remplissage, zoom, déplacement interne, centrage et réinitialisation. Les médias
restent liés par leur identifiant : **Remplacer partout…** dans la bibliothèque
met aussi à jour les fiches et leur utilisation bloque la suppression du média.
On peut déposer un fichier ou un média de bibliothèque sur un cadre interne.

Les vidéos reprennent leurs réglages de lecture, boucle, sourdine, vitesse et
commandes facultatives. **Interagir avec la vidéo** ouvre temporairement le
lecteur dans l’éditeur ; **Tester le contenu** reproduit les interactions et la
lecture de la fiche sans poignées. Les lecteurs sont arrêtés/fermés à la sortie.
YouTube réutilise son lecteur officiel et ses paramètres ; Internet est requis,
et seul le lien est conservé dans le ZIP, pas la vidéo distante.

## Calques et apparence

- Renommer, dupliquer, supprimer, afficher/masquer et verrouiller.
- Premier plan/arrière-plan et ordre intermédiaire.
- Maj + clic pour plusieurs éléments, alignement et distribution.
- Ctrl/Cmd+C puis V pour copier/coller les éléments dans une fiche ou entre fiches
  du même projet, en conservant leurs positions locales. Le presse-papiers reste
  temporaire ; un média absent du projet cible bloque le collage sans réaffectation.
- Annuler/Rétablir et raccourcis usuels hors des champs de texte.
- Fond personnalisé, opacité/transparence, coins, bordure, ombre et marges.
- Grille facultative, magnétisme et repères d’alignement ; effets visuels des
  calques via les composants existants.
- Débordement : défilement dans la fiche (par défaut), découpage ou débordement
  visible explicite. L’éditeur signale les calques dépassant les limites.

Redimensionner la fiche conserve les coordonnées, dimensions et tailles de
police de ses éléments. La mise à l’échelle de toute la présentation suit ensuite
la résolution de l’écran. Les fiches restent dans le plan de la diapositive,
indépendantes du zoom, déplacement, centrage, phases et branches de Timeline.

## Compatibilité et sauvegarde

Format40, champ facultatif `step.cardContent` version1. Les anciennes fiches
restent inchangées à l’ouverture/recharge du projet. Leur conversion est
**explicite**, lors du premier clic sur **Modifier le contenu** : titre, date et
statut, description, détails, image et vidéo deviennent des calques. Les champs
historiques et leurs métadonnées sont conservés ; leur disposition est approchée
sans supprimer de texte ni de média. Les contenus longs restent accessibles par
le défilement et l’éditeur. Une ancienne disposition automatique est ancrée dans
la diapositive lors de la conversion pour permettre un canevas mesurable.

Une fois convertie, la fiche possède ses propres textes : renommer l’étape ne
renomme pas automatiquement un titre personnalisé. Utilisez l’éditeur de contenu
pour les textes et médias de la mini-page. Undo permet d’annuler la conversion
comme les autres modifications, tant qu’elle figure dans l’historique.

IndexedDB et ZIP conservent l’apparence, les calques, les styles, l’ordre et les
références. Les imports valident aussi les calques imbriqués et les ressources
avant la restauration atomique existante. Les fichiers restent dans le navigateur,
sans serveur de médias ni nouveau service. La bibliothèque compte les liens des
fiches, y compris dans les modèles de composants.

## Limites et vérifications

- 100 calques par fiche ; une seule fiche éditée à la fois.
- Pas de Timeline imbriquée ni de nouvelles actions de boutons internes.
- Les styles typographiques rapides et valeurs de la palette sont disponibles ;
  les liaisons globales de styles/couleurs ne sont pas proposées pour les nouveaux
  calques internes. Les styles liés des calques de la diapositive sont conservés.
- Le nom de l’étape, l’ouverture et les animations restent gérés par Timeline.
- Les vidéos/commandes natives dépendent des codecs et permissions du navigateur.
  YouTube peut aussi refuser une intégration ou exiger une connexion.

Tests navigateur : `tests/timeline-card-content.spec.js`, complétés par les suites
existantes de texte, géométrie, médias, Timeline, phases, centrage, branches,
sauvegarde, ZIP et YouTube. Les tests utilisent des médias synthétiques. Le test
YouTube de fiche simule l’API officielle ; il ne vérifie pas une diffusion réelle.

Le point initial `safety/timeline-cards-initial-20261026` et le bundle Git vérifié
`/workspace/backups/presentation-player-before-card-canvas.bundle` sauvegardent
le code. Ils ne sauvegardent pas les données IndexedDB du Chrome de l’utilisateur,
auxquelles cet environnement n’a pas accès. Aucun effacement de données ni
publication de production n’est effectué par cette amélioration.

Le statut réel de sauvegarde est repris dans l’en-tête de la fenêtre. Une alerte
existante du projet est signalée ; terminez l’édition pour ouvrir ses détails et
les commandes de récupération/export habituelles.
