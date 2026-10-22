# Dessiner une ligne vectorielle

1. Cliquez sur **+ Ligne**, puis cliquez-glissez dans la diapositive. Relâchez pour terminer. Un simple clic sans glissement ne crée rien ; Échap annule le dessin.
2. Sélectionnez une ligne sur son tracé ou dans **Calques**. Déplacez ses deux poignées pour ajuster indépendamment son départ et son arrivée. Faites glisser le tracé pour déplacer toute la ligne.
3. Dans l’inspecteur, ouvrez **Trait** pour régler la couleur, l’opacité, l’épaisseur et les extrémités. Les épaisseurs acceptent aussi des valeurs décimales.
4. Dans **Décorations**, choisissez séparément une flèche, un point rond ou aucune décoration au début et à la fin. La taille suit l’épaisseur et peut être ajustée.
5. Dans **Style du trait**, choisissez continu, pointillé, tireté ou personnalisé. Ce dernier permet de régler la longueur des tirets et leur espacement ; le décalage déplace le motif le long du tracé. Les décorations restent indépendantes du motif.
6. Dans **Géométrie de la ligne**, modifiez les coordonnées, la longueur ou l’angle. Les valeurs sont exprimées dans la diapositive logique de 1920 × 1080, indépendamment du zoom.

**Raccourcis :** Maj contraint le dessin et le déplacement d’une extrémité à des angles multiples de 45°. Alt pendant le dessin place son centre au point de départ ; Maj + Alt combine les deux. Ctrl/Cmd désactive temporairement le magnétisme pendant le déplacement. Les raccourcis existants de duplication, copier-coller, suppression et annuler/rétablir restent disponibles.

Les poignées d’extrémité acceptent également les flèches du clavier : 1 pixel logique par appui, ou 10 avec Maj. Le verrouillage empêche les déplacements. Une sélection multiple permet d’utiliser les outils de groupe, rotation et redimensionnement existants. Les lignes restent visibles en Test, en Présentation et en plein écran.

## Compatibilité et stockage

Le document passe à la version 16. La migration conserve les anciennes lignes rectangulaires (`type: line`) sans les convertir. Les nouvelles lignes utilisent `type: vectorLine`, un identifiant stable, des extrémités locales (`endpoints`) et un objet `stroke`. Le cadre et sa rotation utilisent les transformations existantes, notamment pour les groupes et composants. Les champs numériques indépendants pourront servir à de futures animations ; aucune timeline supplémentaire n’est introduite.

Les nouvelles propriétés suivent la sauvegarde automatique IndexedDB et l’import/export ZIP existants. Aucun fichier média supplémentaire n’est créé. L’import valide la géométrie et le style avant de remplacer le projet ; une archive invalide conserve le projet courant. Les métadonnées inconnues et les identifiants sont conservés.

Les décorations débordent librement du cadre de sélection ; les limites de la diapositive restent les limites de l’image présentée. La zone de sélection invisible suit le tracé sur 10 pixels d’écran, sans occuper tout son rectangle englobant. Les poignées gardent une taille de 12 pixels d’écran aux différents zooms. Le style pointillé utilise des points ronds ; les styles continu, tireté et personnalisé respectent le choix des extrémités.
