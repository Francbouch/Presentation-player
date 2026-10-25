import { TLCheck, TLNumber, TLSelect } from "./MilestoneTimelineSettings.jsx";
export default function MilestoneTimelineAnimationSettings({
  design: d,
  change,
}) {
  return (
    <details className="property-section" open>
      <summary>Progression, zoom et navigation</summary>
      <TLCheck
        label="Centrer automatiquement l’étape active"
        value={d.autoCenter ?? false}
        change={(autoCenter) => change({ autoCenter })}
      />
      {d.autoCenter && (
        <>
          <TLCheck
            label="Animation du déplacement"
            value={d.centerAnimated ?? true}
            change={(centerAnimated) => change({ centerAnimated })}
          />
          {(d.centerAnimated ?? true) && (
            <>
              <TLNumber
                label="Durée du déplacement (ms)"
                value={d.centerDuration ?? 700}
                min={200}
                max={1500}
                change={(centerDuration) => change({ centerDuration })}
              />
              <TLSelect
                label="Courbe du déplacement"
                value={d.centerEasing ?? "ease-in-out"}
                options={{
                  "ease-in-out": "Ease In-Out",
                  "ease-out": "Ease Out",
                  linear: "Linear",
                }}
                change={(centerEasing) => change({ centerEasing })}
              />
            </>
          )}
          <p className="help">
            Le centrage vise la diapositive : horizontalement, verticalement ou
            sur les deux axes en zigzag et avec zoom. Testez avec « Tester les
            interactions ». Le zoom suit la même durée. La position enregistrée
            du calque reste inchangée.
          </p>
        </>
      )}
      <TLCheck
        label="Afficher la progression"
        value={d.progress}
        change={(progress) => change({ progress })}
      />
      {d.progress && (
        <>
          <TLSelect
            label="Mode de progression du trait"
            value={d.progressMode}
            options={{
              active: "Selon l’étape active ou révélée",
              manual: "Position manuelle",
            }}
            change={(progressMode) => change({ progressMode })}
          />
          {d.progressMode === "manual" && (
            <TLNumber
              label="Position du trait (%)"
              value={d.manualProgress}
              min={0}
              max={100}
              change={(manualProgress) => change({ manualProgress })}
            />
          )}
          <TLNumber
            label="Animation de progression (ms)"
            value={d.progressDuration}
            min={0}
            max={5000}
            change={(progressDuration) => change({ progressDuration })}
          />
          <p className="help">
            Cette ligne indique un parcours visuel entre jalons, pas un
            pourcentage réel d’achèvement du projet.
          </p>
        </>
      )}
      <TLCheck
        label="Zoom interactif dans la ligne du temps"
        value={d.zoom}
        change={(zoom) => change({ zoom })}
      />
      {d.zoom && (
        <>
          <TLNumber
            label="Intensité du zoom interne (%)"
            value={d.zoomScale}
            min={110}
            max={300}
            change={(zoomScale) => change({ zoomScale })}
          />
          <TLNumber
            label="Durée du zoom interne (ms)"
            value={d.zoomDuration}
            min={0}
            max={5000}
            change={(zoomDuration) => change({ zoomDuration })}
          />
        </>
      )}
      <TLCheck
        label="Révéler avec la barre d’espace"
        value={d.revealSpace}
        change={(revealSpace) => change({ revealSpace })}
      />
      <p className="help">
        En Test et Présentation : Espace révèle une seule étape avant de changer
        de page. Priorité à la dernière ligne du temps utilisée, puis au premier
        plan. Les champs et boutons gardent leur comportement clavier normal.
        Les flèches naviguent à l’intérieur si une étape a le focus ; ailleurs
        elles gardent la navigation de présentation.
      </p>
    </details>
  );
}
