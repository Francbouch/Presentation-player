import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TLNumber } from "./MilestoneTimelineSettings.jsx";
import {
  titleOffsetFor,
  titleElement,
  measuredTitleOffset,
  notifyTitlePreview,
  setTimelineTitleOffset,
  TITLE_OFFSET_LIMITS,
} from "./timelineTitlePosition.js";
export default function TimelineTitleSettings({
  layer,
  step,
  change,
  compact = false,
  exit,
  root,
}) {
  const [preview, setPreview] = useState(null),
    [automatic, setAutomatic] = useState(null);
  useLayoutEffect(() => {
    if (step.titleOffset) {
      setAutomatic(null);
      return;
    }
    const element = titleElement(layer.id, step.id);
    const refresh = () => {
      const value = measuredTitleOffset(element);
      if (!value) return;
      setAutomatic((old) =>
        old &&
        Math.abs(old.x - value.x) < 1e-6 &&
        Math.abs(old.y - value.y) < 1e-6
          ? old
          : value,
      );
      if (compact) notifyTitlePreview(layer.id, step.id, value);
    };
    refresh();
    const observer = new ResizeObserver(refresh);
    if (element) observer.observe(element);
    return () => {
      observer.disconnect();
      if (compact) notifyTitlePreview(layer.id, step.id, null);
    };
  }, [layer, step, compact]);
  useEffect(() => {
    setPreview(null);
    const listener = (e) => {
      if (e.detail?.layerId === layer.id && e.detail.stepId === step.id)
        setPreview(e.detail.offset);
    };
    document.addEventListener("studio-timeline-title-preview", listener);
    return () =>
      document.removeEventListener("studio-timeline-title-preview", listener);
  }, [layer.id, step.id, step.titleOffset]);
  const offset =
    preview || step.titleOffset || automatic || titleOffsetFor(layer, step);
  function commit(value, all = false) {
    change(layer.id, {
      timeline: setTimelineTitleOffset(layer.timeline, step.id, value, all),
    });
  }
  function open() {
    document.dispatchEvent(
      new CustomEvent("studio-timeline-edit-title", {
        detail: { layerId: layer.id, stepId: step.id },
      }),
    );
  }
  const actions = (
    <>
      <button
        type="button"
        className="ui-button"
        onClick={() => commit(preview || titleOffsetFor(layer, step), true)}
      >
        Appliquer ce positionnement à tous les titres
      </button>
      <button
        type="button"
        className="ui-button"
        disabled={!step.titleOffset}
        onClick={() => commit(null)}
      >
        Réinitialiser la position du titre
      </button>
    </>
  );
  if (compact) {
    const host = root?.closest(".interactive-button-layer");
    return host
      ? createPortal(
          <div
            className="timeline-title-toolbar"
            role="toolbar"
            aria-label="Positionnement du titre"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <strong>Positionnement du titre — {step.name}</strong>
            <output aria-label="Position actuelle du titre">
              X : {offset.x.toFixed(2)} · Y : {offset.y.toFixed(2)}
            </output>
            {actions}
            <button type="button" className="ui-button primary" onClick={exit}>
              Terminer le positionnement du titre
            </button>
          </div>,
          host,
        )
      : null;
  }
  return (
    <details className="property-section" open>
      <summary>Position du titre</summary>
      <button type="button" className="ui-button" onClick={open}>
        Positionner le titre
      </button>
      <p className="help">
        Décalages en pixels locaux, depuis le centre de la bulle vers le centre
        horizontal du haut du bloc de titre. Sans personnalisation, le placement
        automatique est conservé.
      </p>
      <div className="layer-coordinates">
        {[
          ["x", "Décalage horizontal X du titre (px)"],
          ["y", "Décalage vertical Y du titre (px)"],
        ].map(([key, label]) => (
          <TLNumber
            key={key}
            label={label}
            value={Number(offset[key].toFixed(2))}
            min={-TITLE_OFFSET_LIMITS[key]}
            max={TITLE_OFFSET_LIMITS[key]}
            change={(value) =>
              commit({ ...titleOffsetFor(layer, step), [key]: value })
            }
          />
        ))}
      </div>
      {actions}
    </details>
  );
}
