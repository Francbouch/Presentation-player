import { useEffect, useRef, useState } from "react";
import {
  boundedTitleOffset,
  measuredTitleOffset,
  notifyTitlePreview,
} from "./timelineTitlePosition.js";
const unit = (n) => `${n / 19.2}cqw`;
export default function TimelineStepTitle({
  item,
  step,
  positioning,
  selected,
  change,
  select,
  children,
  fontWeight,
  previewEvent,
  durationLabel = false,
}) {
  const notify=(...args)=>previewEvent?globalThis.document?.dispatchEvent(new CustomEvent(previewEvent,{detail:{layerId:args[0],stepId:args[1],offset:args[2]}})):notifyTitlePreview(...args);
  const element = useRef(null),
    drag = useRef(null),
    [draft, setDraft] = useState(null);
  const offset = draft || step.titleOffset;
  useEffect(
    () => () => {
      notify(item.id, step.id, null);
    },
    [item.id, step.id],
  );
  function down(e) {
    if (!positioning || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    select(step.id);
    const host = element.current.closest(".interactive-button-layer"),
      canvas = element.current.closest(".milestone-canvas"),
      style = getComputedStyle(canvas);
    const matrix =
        style.transform === "none" ? null : new DOMMatrix(style.transform),
      zoom = matrix ? Math.hypot(matrix.a, matrix.b) : 1;
    const scale = (host.getBoundingClientRect().width / 1920) * zoom,
      angle = ((item.rotation || 0) * Math.PI) / 180;
    const base = step.titleOffset ||
      measuredTitleOffset(element.current) || { x: 0, y: 24.96 };
    element.current.setPointerCapture(e.pointerId);
    element.current.focus({ preventScroll: true });
    drag.current = {
      pointer: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      base,
      scale,
      c: Math.cos(angle),
      s: Math.sin(angle),
      offset: base,
    };
  }
  function move(e) {
    const g = drag.current;
    if (!g || g.pointer !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    const dx = e.clientX - g.x,
      dy = e.clientY - g.y;
    const value = boundedTitleOffset({
      x: g.base.x + (dx * g.c + dy * g.s) / g.scale,
      y: g.base.y + (-dx * g.s + dy * g.c) / g.scale,
    });
    g.offset = value;
    setDraft(value);
    notify(item.id, step.id, value);
  }
  function finish(e, cancel = false) {
    const g = drag.current;
    if (!g || (e && e.pointerId !== undefined && g.pointer !== e.pointerId))
      return;
    e?.stopPropagation();
    drag.current = null;
    if (element.current?.hasPointerCapture(g.pointer))
      element.current.releasePointerCapture(g.pointer);
    if (!cancel && (g.offset.x !== g.base.x || g.offset.y !== g.base.y))
      change(step.id, g.offset);
    setDraft(null);
    notify(item.id, step.id, null);
  }
  return (
    <>
      {positioning && selected && offset && (
        <svg
          className="timeline-title-guide"
          aria-hidden="true"
          width={unit(1)}
          height={unit(1)}
          viewBox="0 0 1 1"
        >
          <line x1="0" y1="0" x2={offset.x} y2={offset.y} />
        </svg>
      )}
      <span
        ref={element}
        data-duration-style={durationLabel?'c':undefined}
        className={`milestone-title ${offset ? "has-title-offset" : ""} ${positioning ? "positionable-title" : ""} ${positioning && selected ? "selected-title" : ""}`}
        role={positioning ? "button" : undefined}
        tabIndex={positioning ? 0 : undefined}
        aria-label={positioning ? `Déplacer le titre ${step.name}` : undefined}
        style={{
          fontWeight,
          ...(offset
            ? {
                left: unit(offset.x),
                right: "auto",
                top: `calc(50% + ${unit(offset.y)})`,
                bottom: "auto",
                width: "100%",
              }
            : {}),
        }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={(e) => finish(e, true)}
        onLostPointerCapture={(e) => finish(e, true)}
        onDoubleClick={(e) => {
          if (positioning) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onClick={(e) => {
          if (positioning) {
            e.stopPropagation();
            select(step.id);
          }
        }}
        onFocus={() => {
          if (positioning) select(step.id);
        }}
        onKeyDown={(e) => {
          if (!positioning) return;
          if (["Delete", "Backspace"].includes(e.key)) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          if (e.key === "Escape" && drag.current) {
            e.preventDefault();
            e.stopPropagation();
            finish(null, true);
            return;
          }
          if (
            (e.ctrlKey || e.metaKey) &&
            ["z", "y"].includes(e.key.toLowerCase())
          ) {
            if (drag.current) finish(null, true);
            return;
          }
          if (
            !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
              e.key,
            ) ||
            e.altKey ||
            e.ctrlKey ||
            e.metaKey
          )
            return;
          e.preventDefault();
          e.stopPropagation();
          const base = step.titleOffset ||
              measuredTitleOffset(element.current) || { x: 0, y: 24.96 },
            n = e.shiftKey ? 10 : 1;
          change(
            step.id,
            boundedTitleOffset({
              x:
                base.x +
                (e.key === "ArrowRight" ? n : e.key === "ArrowLeft" ? -n : 0),
              y:
                base.y +
                (e.key === "ArrowDown" ? n : e.key === "ArrowUp" ? -n : 0),
            }),
          );
        }}
      >
        {children}
      </span>
    </>
  );
}
