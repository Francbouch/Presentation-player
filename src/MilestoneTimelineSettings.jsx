import TimelineDurationSettings,{TimelineGlobalDurationSettings} from './TimelineDurationSettings.jsx';
import TimelineParallelSettings from "./TimelineParallelSettings.jsx";
import {reconcileParallel,timelineUnits,updateParallelBranches} from "./timelineParallel.js";
import TimelineTitleSettings from "./TimelineTitleSettings.jsx";
import MilestoneTimelineAnimationSettings from "./MilestoneTimelineAnimationSettings.jsx";
import MilestoneTimelineInteractions from "./MilestoneTimelineInteractions.jsx";
import { useState, useEffect } from "react";
import ColorInput from "./ProjectColors.jsx";
import FontPicker from "./FontPicker.jsx";
import {
  timelineStep,
  timelinePresets,
  TIMELINE_STATUSES,
} from "./milestoneTimeline.js";
export function TLNumber({ label, value, min, max, change }) {
  return (
    <label className="field">
      {label}
      <input
        aria-label={label}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const v = e.target.valueAsNumber;
          if (Number.isFinite(v) && v >= min && v <= max) change(v);
        }}
      />
    </label>
  );
}
export function TLSelect({ label, value, options, change }) {
  return (
    <label className="field">
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => change(e.target.value)}
      >
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </label>
  );
}
export function TLCheck({ label, value, change }) {
  return (
    <label className="checkbox-field">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => change(e.target.checked)}
      />
      {label}
    </label>
  );
}
export function TLColor({ label, value, change, path }) {
  return (
    <label className="field">
      {label}
      <ColorInput
        aria-label={label}
        type="color"
        colorPath={path}
        value={value}
        onChange={(e) => change(e.target.value)}
      />
    </label>
  );
}
export default function MilestoneTimelineSettings({
  layer,
  change,
  busy,
  media = [],
  importMedia,
}) {
  const t = layer.timeline,
    d = t.design,
    [selected, setSelected] = useState(t.steps[0]?.id || ""),
    [drag, setDrag] = useState(null);
  useEffect(() => {
    if (!t.steps.some((s) => s.id === selected))
      setSelected(t.steps[0]?.id || "");
  }, [t.steps, selected]);
  useEffect(() => {
    const listener = (e) => {
      if (e.detail?.layerId === layer.id) setSelected(e.detail.stepId);
    };
    document.addEventListener("studio-timeline-edit-step", listener);
    return () =>
      document.removeEventListener("studio-timeline-edit-step", listener);
  }, [layer.id]);
  const orderedSteps=timelineUnits(t).flatMap(u=>u.steps);
  const step = t.steps.find((s) => s.id === selected),
    patch = (v) => {
      let next={...t,...v};
      if(v.steps && v.phases && t.parallelGroups?.length)next={...next,chronology:timelineUnits({...next,chronology:undefined}).map(u=>({kind:u.kind,id:u.id}))};
      change(layer.id,{timeline:reconcileParallel(next)});
    },
    design = (v) => patch({ design: { ...d, ...v } }),
    edit = (v) => {
      const group=t.parallelGroups?.find(g=>g.stepIds.includes(selected));
      if(group && Object.hasOwn(v,'phaseId') && group.stepIds.some(id=>t.steps.find(s=>s.id===id)?.phaseId!==v.phaseId)) {
        if(!window.confirm('Cette étape appartient à un groupe simultané. Affecter explicitement toutes les branches du groupe à cette phase ?'))return;
        patch({steps:t.steps.map(s=>group.stepIds.includes(s.id)?{...s,phaseId:v.phaseId}:s)});return;
      }
      patch({steps:t.steps.map(s=>s.id===selected?{...s,...v}:s)});
    };
  function move(id, before) {
    if (id === before) return;
    if(t.parallelGroups?.length){
      const units=timelineUnits(t),source=units.find(u=>u.steps.some(s=>s.id===id)),dest=units.find(u=>u.steps.some(s=>s.id===before));
      if(!source||!dest)return;
      if(source.kind==='parallel'){
        if(source.id!==dest.id)return;
        if(source.group.branches){
          const target=source.group.branches.find(b=>b.stepIds.includes(before));
          const branches=source.group.branches.map(b=>{const ids=b.stepIds.filter(x=>x!==id);if(b.id===target.id)ids.splice(ids.indexOf(before),0,id);return {...b,stepIds:ids};});
          change(layer.id,{timeline:updateParallelBranches(t,source.id,branches,source.group.revealRanks)});return;
        }
        const ids=source.group.stepIds.filter(x=>x!==id);ids.splice(ids.indexOf(before),0,id);
        patch({parallelGroups:t.parallelGroups.map(g=>g.id===source.id?{...g,stepIds:ids}:g)});return;
      }
      const order=units.filter(u=>u.id!==source.id);order.splice(order.findIndex(u=>u.id===dest.id),0,source);
      patch({chronology:order.map(u=>({kind:u.kind,id:u.id}))});return;
    }
    const steps = t.steps.filter((s) => s.id !== id);
    let item = t.steps.find((s) => s.id === id);
    if (!item) return;
    item = {
      ...item,
      phaseId: t.steps.find((s) => s.id === before)?.phaseId || null,
    };
    steps.splice(
      steps.findIndex((s) => s.id === before),
      0,
      item,
    );
    patch({ steps });
  }
  return (
    <fieldset disabled={busy} className="milestone-settings">
      <details className="property-section" open>
        <summary>Disposition de la ligne du temps</summary>
        <TLSelect
          label="Disposition de la ligne du temps"
          value={d.layout}
          options={{
            horizontal: "Horizontale",
            vertical: "Verticale",
            zigzag: "Zigzag",
          }}
          change={(layout) => design({ layout })}
        />
        <TLSelect
          label="Style de départ"
          value=""
          options={{
            "": "Personnalisé",
            minimal: "Minimaliste",
            professional: "Professionnel",
            presentation: "Présentation",
            compact: "Compact",
          }}
          change={(key) => design(timelinePresets[key] || {})}
        />
        {[
          ["spacing", "Espacement des étapes", 100, 800],
          ["margin", "Marges de la ligne du temps", 10, 240],
        ].map(([k, label, min, max]) => (
          <TLNumber
            key={k}
            label={label}
            value={d[k]??d.dotSize}
            min={min}
            max={max}
            change={(v) => design({ [k]: v,...(k==='dotSize'&&d.phaseDotSize===undefined?{phaseDotSize:d.dotSize}:{}) })}
          />
        ))}
        <TLSelect
          label="Alignement des étapes"
          value={d.align}
          options={{ start: "Début", center: "Centre", end: "Fin" }}
          change={(align) => design({ align })}
        />
        <TLSelect
          label="Position des titres"
          value={d.titlePosition}
          options={{
            above: "Au-dessus",
            below: "En dessous",
            alternating: "Alternée",
          }}
          change={(titlePosition) => design({ titlePosition })}
        />
      </details>
      <details className="property-section">
        <summary>Apparence de la ligne du temps</summary>
        {[
          ["lineWidth", "Épaisseur de la ligne", 1, 30],
          ["dotSize", "Taille des points", 10, 100],
          ["phaseDotSize", "Taille des bulles des phases (px)", 10, 240],
          ["fontSize", "Taille des titres", 12, 80],
          ["radius", "Coins du composant", 0, 100],
        ].map(([k, label, min, max]) => (
          <TLNumber
            key={k}
            label={label}
            value={d[k]??d.dotSize}
            min={min}
            max={max}
            change={(v) => design({ [k]: v,...(k==='dotSize'&&d.phaseDotSize===undefined?{phaseDotSize:d.dotSize}:{}) })}
          />
        ))}
        <FontPicker value={d.font} change={(font) => design({ font })} />
        <TLCheck
          label="Arrière-plan transparent"
          value={d.backgroundTransparent ?? false}
          change={(backgroundTransparent) => design({ backgroundTransparent })}
        />
        {[
          ["background", "Fond de la ligne du temps"],
          ["textColor", "Texte de la ligne du temps"],
          ["lineColor", "Couleur de la ligne"],
          ["progressColor", "Couleur de progression"],
        ].map(([k, label]) => (
          <TLColor
            key={k}
            label={label}
            path={`timeline.design.${k}`}
            value={d[k]}
            change={(v) => design({ [k]: v })}
          />
        ))}
        {Object.entries(TIMELINE_STATUSES).map(([k, label]) => (
          <TLColor
            key={k}
            label={`Couleur du statut ${label}`}
            path={`timeline.design.statusColors.${k}`}
            value={d.statusColors[k]}
            change={(v) =>
              design({ statusColors: { ...d.statusColors, [k]: v } })
            }
          />
        ))}
        {[
          ["showDates", "Afficher les dates"],
          ["showDescriptions", "Afficher les descriptions"],
          ["showIcons", "Afficher les icônes"],
        ].map(([k, label]) => (
          <TLCheck
            key={k}
            label={label}
            value={d[k]}
            change={(v) => design({ [k]: v })}
          />
        ))}
      </details>
      <details className="property-section" open>
        <summary>Étapes</summary>
        <ol className="milestone-step-list">
          {orderedSteps.map((s) => (
            <li
              key={s.id}
              draggable={!busy}
              onDragStart={(e) => {
                if (busy) {
                  e.preventDefault();
                  return;
                }
                setDrag(s.id);
                e.dataTransfer.setData(
                  "application/studio-timeline-step",
                  s.id,
                );
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                if (busy) return;
                e.preventDefault();
                e.stopPropagation();
                move(
                  e.dataTransfer.getData("application/studio-timeline-step") ||
                    drag,
                  s.id,
                );
              }}
            >
              <button
                type="button"
                className="ui-button"
                aria-label={`Modifier l’étape ${s.name}`}
                aria-pressed={selected === s.id}
                onClick={() => setSelected(s.id)}
              >
                {t.parallelGroups?.find(g=>g.stepIds.includes(s.id))?.name && <small>⑂ {t.parallelGroups.find(g=>g.stepIds.includes(s.id)).name} · </small>}{s.icon} {s.name}
              </button>
            </li>
          ))}
        </ol>
        <button
          className="ui-button"
          onClick={() => {
            const s = timelineStep(t.steps.length + 1);
            patch({ steps: [...t.steps, s] });
            setSelected(s.id);
          }}
        >
          Ajouter une étape
        </button>
        {step && (
          <>
            <label className="field">
              Nom de l’étape
              <input
                aria-label="Nom de l’étape"
                maxLength={200}
                value={step.name}
                onChange={(e) => edit({ name: e.target.value })}
              />
            </label>
            <label className="field">
              Description de l’étape
              <textarea
                aria-label="Description de l’étape"
                maxLength={10000}
                value={step.description}
                onChange={(e) => edit({ description: e.target.value })}
              />
            </label>
            <TLSelect
              label="Statut de l’étape"
              value={step.status}
              options={TIMELINE_STATUSES}
              change={(status) => edit({ status })}
            />
            <label className="field">
              Date ou période
              <input
                aria-label="Date ou période"
                maxLength={160}
                value={step.date}
                onChange={(e) => edit({ date: e.target.value })}
              />
            </label>
            <label className="field">
              Icône de l’étape
              <input
                aria-label="Icône de l’étape"
                maxLength={40}
                value={step.icon}
                onChange={(e) => edit({ icon: e.target.value })}
              />
            </label>
            <TLCheck
              label="Étape visible"
              value={step.visible}
              change={(visible) => edit({ visible })}
            />
            <TLCheck
              label="Couleur personnalisée de l’étape"
              value={step.color !== null}
              change={(v) => edit({ color: v ? d.progressColor : null })}
            />
            {step.color && (
              <TLColor
                label="Couleur de l’étape"
                value={step.color}
                change={(color) => edit({ color })}
              />
            )}
            <div className="button-row">
              <button
                className="ui-button"
                onClick={() => {
                  const s = {
                      ...structuredClone(step),
                      id: crypto.randomUUID(),
                      name: `${step.name.slice(0, 190)} (copie)`,
                    },
                    steps = [...t.steps];
                  steps.splice(steps.indexOf(step) + 1, 0, s);
                  const group=t.parallelGroups?.find(g=>g.stepIds.includes(step.id));
                  if(group){const ids=[...group.stepIds];ids.splice(ids.indexOf(step.id)+1,0,s.id);patch({steps,parallelGroups:t.parallelGroups.map(g=>g.id===group.id?{...g,stepIds:ids}:g)});}
                  else if(t.chronology){const chronology=[...t.chronology],i=chronology.findIndex(u=>u.kind==='step'&&u.id===step.id);chronology.splice(i+1,0,{kind:'step',id:s.id});patch({steps,chronology});}
                  else patch({ steps });
                  setSelected(s.id);
                }}
              >
                Dupliquer l’étape
              </button>
              <button
                className="ui-button"
                onClick={() =>
                  patch({ steps: t.steps.filter((s) => s.id !== selected) })
                }
              >
                Supprimer l’étape
              </button>
              <button
                className="ui-button"
                disabled={orderedSteps.indexOf(step) === 0}
                onClick={() =>
                  move(step.id, orderedSteps[orderedSteps.indexOf(step) - 1].id)
                }
              >
                Monter l’étape
              </button>
              <button
                className="ui-button"
                disabled={orderedSteps.indexOf(step) === orderedSteps.length - 1}
                onClick={() =>
                  move(orderedSteps[orderedSteps.indexOf(step) + 1].id, step.id)
                }
              >
                Descendre l’étape
              </button>
            </div>
          </>
        )}
      </details>
      <TimelineGlobalDurationSettings timeline={t} design={design}/>
      {step&&<TimelineDurationSettings layer={layer} step={step} edit={edit} change={change}/>}
      <TimelineParallelSettings key={layer.id} layer={layer} change={change} select={setSelected}/>
      {step && (
        <TimelineTitleSettings layer={layer} step={step} change={change} />
      )}
      <MilestoneTimelineInteractions
        layer={layer}
        step={step}
        patch={patch}
        edit={edit}
        design={design}
        media={media}
        importMedia={importMedia}
        change={change}
      />
      <MilestoneTimelineAnimationSettings design={d} change={design} />
    </fieldset>
  );
}
