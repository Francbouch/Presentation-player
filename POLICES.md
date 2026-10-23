# Polices de présentation

Les dix familles ont été ajoutées : Manrope, Plus Jakarta Sans, DM Sans, Outfit,
Sora, Urbanist, Instrument Sans, Space Grotesk, Bricolage Grotesque et Cormorant
Garamond. Aucune n’était déjà présente. Les six familles existantes restent disponibles.

## Utilisation

Sélectionner un texte ou un bouton, ouvrir ses propriétés **Texte et typographie**,
puis choisir **Police** et **Graisse**. **Parcourir les polices** affiche des exemples,
une recherche, les polices récentes et les étoiles de favoris. Échap ferme ce catalogue ;
Tab et les flèches permettent de le parcourir au clavier.

Les favoris et les six dernières familles utilisées sont des préférences de ce
navigateur. Le choix de police et la graisse de chaque objet sont enregistrés dans
le projet IndexedDB et dans le ZIP, y compris les styles réutilisables et les composants.

## Sources, licences et chargement

Fichiers variables WOFF2 Google Fonts distribués par `@fontsource-variable`,
sous licence SIL OFL 1.1. Les sources, versions Google/Fontsource et plages de
graisses figurent dans `src/fontCatalog.json`. Chaque famille inclut sa licence dans
`public/fonts/<famille>/OFL.txt`. Les noms des fichiers contiennent leur empreinte SHA-256.
La commande `npm run fonts:vendor` reproduit ces fichiers depuis les dépendances
verrouillées. Aucun appel aux serveurs Google n’est effectué.

Les sous-ensembles Latin et Latin Extended sont conservés (environ 952 Ko au total).
Leurs tables de caractères ont été vérifiées pour é, è, ê, à, ç, œ et leurs majuscules.
Les familles variables conservent toutes leurs graisses officielles ; leurs vrais
italiques sont inclus lorsqu’ils existent. Sinon le contrôle Italique existant utilise
l’inclinaison synthétique du navigateur, comme auparavant.

Seules les familles utilisées dans le projet sont préparées. Ouvrir le catalogue
charge aussi les familles affichées pour leurs aperçus. Les miniatures attendent le
chargement ; la mesure des textes est recalculée lorsqu’une police devient disponible.
En cas d’échec, un avertissement et une commande de nouvelle tentative sont affichés.

## Hors ligne

Les fichiers des familles utilisées sont conservés dans CacheStorage lorsque le
navigateur l’autorise. Aucun média confidentiel ni document n’y est copié.
Les fichiers en cache permettent de rendre un projet déjà ouvert sans réseau et de
réutiliser les polices après rechargement si l’application est elle-même disponible.
**Le site n’installe pas de service worker : ouvrir le site depuis zéro nécessite Internet.**
Le cache du navigateur peut être effacé ; ce n’est pas une sauvegarde du projet.

Pour une présentation hors ligne autonome, `npm run export:html` produit
`dist/presentation-player.html`, qui inclut toutes les polices et leurs licences,
sans requête réseau. Ouvrir ce fichier dans Chrome puis importer le ZIP du projet.
Le fichier HTML et le site ont des espaces de stockage distincts : le ZIP permet le
transfert, les médias restent locaux. Le ZIP ne contient aucun fichier de police :
l’application et sa version autonome fournissent les familles nécessaires.

## Compatibilité et sécurité

Version de document 23 : graisse numérique facultative ; en son absence,
le réglage historique Gras conserve exactement son rendu 400/700. La migration
conserve les pages, médias et métadonnées inconnues. Les projets 1 à 22 restent lisibles.
Une graisse invalide est refusée ; les données enregistrées restent intactes.

Branche dédiée : `codex/modern-fonts`. Point initial :
`safety/modern-fonts-initial-20261023`. Bundle Git vérifié :
`/workspace/backups/presentation-player-before-modern-fonts.bundle`.
Ce point de restauration ne sauvegarde pas les présentations IndexedDB de l’utilisateur.
Aucune donnée de navigateur n’a été supprimée et aucun déploiement en production n’est effectué.

## Vérifications

Tests ciblés : dix familles et leurs graisses, caractères français, recherche,
favoris/récentes, clavier, texte/boutons, états, présentation/plein écran,
IndexedDB/rechargement, Undo/Redo, ZIP sur un second navigateur, cache sans accès
aux fichiers réseau, ancien projet et styles liés avec surcharges.
Le HTML autonome est testé sans réseau en fournissant ses octets au navigateur.
L’ouverture directe d’une URL `file://` est bloquée par le navigateur administré de
cet environnement ; elle ne peut donc pas être testée ici.

Compilation de production vérifiée. Vite conserve son avertissement existant sur
la taille du bundle principal ; les fichiers de polices restent séparés et ne sont
pas incorporés au JavaScript de l’application en ligne.
