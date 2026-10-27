import { TLSelect, TLNumber } from "./MilestoneTimelineSettings.jsx";
import {
  defaultTimelineCardLayout,
  normalizeTimelineCardLayout,
} from "./milestoneTimeline.js";
export default function TimelineCardLayoutSettings({
  layer,
  step,
  edit,
  design,
}) {
  const d = layer.timeline.design,
    individual = !!step.cardLayout,
    rect = step.cardLayout || d.cardLayout || defaultTimelineCardLayout();
  function update(patch) {
    const cardLayout = normalizeTimelineCardLayout({ ...rect, ...patch });
    if (individual) edit({ cardLayout });
    else design({ cardLayout });
  }
  function open() {
    if (!individual && !d.cardLayout)
      design({ cardLayout: defaultTimelineCardLayout() });
    requestAnimationFrame(() =>
      document.dispatchEvent(
        new CustomEvent("studio-timeline-edit-card", {
          detail: { layerId: layer.id, stepId: step.id },
        }),
      ),
    );
  }
  return (
    <div className="timeline-card-layout-settings">
      <TLSelect
        label="Disposition de la fiche de l’étape"
        value={individual ? "individual" : "common"}
        options={{
          common: "Utiliser la disposition commune",
          individual: "Personnaliser pour cette étape",
        }}
        change={(value) =>
          value === "individual"
            ? edit({ cardLayout: { ...rect } })
            : edit({ cardLayout: null })
        }
      />
      <p className="help">
        {individual
          ? "Disposition individuelle : seule cette étape sera modifiée."
          : "Disposition commune : toutes les étapes sans disposition individuelle héritent des changements."}{" "}
        Positions et dimensions relatives à la diapositive.
      </p>
      {!d.cardLayout && !individual && (
        <p className="help">
          Le placement automatique de cette ancienne fiche est conservé jusqu’à
          sa modification. « Modifier dans la page » crée une disposition
          commune relative à la diapositive.
        </p>
      )}
      <button type="button" className="ui-button" onClick={open}>
        Modifier la fiche dans la page
      </button>
      <button type="button" className="ui-button" onClick={()=>document.dispatchEvent(new CustomEvent("studio-timeline-edit-card-content",{detail:{layerId:layer.id,stepId:step.id}}))}>Modifier le contenu</button>
      {step.cardContent&&<p className="help">Cette fiche utilise des calques indépendants. Ses textes et médias se modifient dans « Modifier le contenu ». Le nom de l’étape reste indépendant du titre visuel.</p>}
      <div className="layer-coordinates">
        {[
          ["x", "X de la fiche (%)"],
          ["y", "Y de la fiche (%)"],
          ["width", "Largeur de la fiche (%)"],
          ["height", "Hauteur de la fiche (%)"],
        ].map(([key, label]) => (
          <TLNumber
            key={key}
            label={label}
            min={["width", "height"].includes(key) ? 4 : 0}
            max={100}
            value={Number((rect[key] * 100).toFixed(2))}
            change={(value) => update({ [key]: value / 100 })}
          />
        ))}
      </div>
      <button
        type="button"
        className="ui-button"
        disabled={!individual}
        onClick={() => edit({ cardLayout: null })}
      >
        Réinitialiser la disposition individuelle
      </button>
    </div>
  );
}
