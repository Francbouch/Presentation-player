# Boutons personnalisables

Sélectionnez un bouton dans **Calques** ou dans l’aperçu en mode Positionner. Les propriétés du calque contiennent quatre sections supplémentaires.

- **Apparence** : couleurs par sélecteur ou HEX, opacité du fond, transparence, bordure et coins arrondis. L’opacité globale du calque reste dans son contrôle habituel. Les fichiers PNG ne sont ni recolorés ni modifiés.
- **Effets interactifs** : choisissez indépendamment Aucun, Contour lumineux, Agrandissement ou Contraste au survol, au clic et lorsque sélectionné. Le clic ne retarde jamais l’action. Plusieurs effets différents peuvent se combiner. Le contraste d’un bouton s’applique à ses voisins du même groupe ; sans groupe il ne modifie pas les autres boutons.
- **Indicateur de sélection** : coche facultative, couleur, taille, position et fond circulaire. La coche est une superposition et ne subit pas le filtre de contraste.
- **Groupe de sélection** : saisissez « Finitions », cliquez Créer le groupe, puis choisissez ce groupe sur les autres boutons. Une sélection par défaut est possible pour un bouton d’arrière-plan ou d’état ; elle configure aussi l’arrière-plan ou l’état initial correspondant. L’état réellement affiché reste prioritaire. Les groupes sont propres à une page.

Pour tester, cliquez **Tester les interactions** au-dessus de l’aperçu, puis survolez et cliquez les boutons. **Revenir au mode édition** rétablit la configuration initiale. Le bouton Prévisualiser les effets permet aussi de lancer l’action sélectionnée en mode test.

Pour Blanc / Noyer / Charbon, associez les trois boutons au groupe Finitions et choisissez Contraste lorsque sélectionné sur chacun. La valeur par défaut est 45 %. Activez la coche si souhaité. Un changement d’arrière-plan conserve une seule sélection par groupe. Une action de navigation ou une action ponctuelle ne devient pas une sélection persistante.

L’agrandissement par défaut est 125 %, depuis le centre, et ne change ni les coordonnées sauvegardées ni la zone de clic d’origine. La partie agrandie hors du bouton ne capture pas les clics des boutons voisins. Les mesures d’apparence sont exprimées dans le cadre de référence 1920 × 1080 et suivent le redimensionnement 16:9. Les animations CSS respectent la réduction des animations du système.

## Sauvegarde

Le document passe à la version 8 ; la base IndexedDB et ses magasins restent les mêmes. Les anciens boutons n’obtiennent aucun réglage personnalisé automatiquement : leurs couleurs et leur indication historique restent en place. Les champs facultatifs sont conservés en ZIP et validés avant toute restauration. Une configuration illisible n’est pas effacée. Les médias restent exclusivement dans le navigateur.

Les effets, coches et couleurs utilisent CSS et des éléments visuels légers, sans dépendance supplémentaire. Les actions et transitions existantes restent distinctes des effets de bouton. La configuration GitHub/Vercel et sa protection d’accès restent inchangées.
