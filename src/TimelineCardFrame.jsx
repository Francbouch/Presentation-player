import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { resizeFrom, limitResize } from "./manipulation.js";
import {
  validTimelineCardLayout,
  normalizeTimelineCardLayout,
} from "./milestoneTimeline.js";
import { TEXT_FONTS } from "./textModel.js";
// The portal stays in the slide plane, outside the timeline's rotation, zoom and clipping.
export default function TimelineCardFrame({
  children,
  root,
  item,
  layout,
  editing,
  scope,
  change,
  exit,
  editContent,
  beginGesture,
  endGesture,
}) {
  const drag = useRef(null),
    end = useRef(endGesture),
    [draft, setDraft] = useState(null);
  end.current = endGesture;
  const host = root?.closest(".interactive-button-layer");
  useEffect(
    () => () => {
      if (drag.current) end.current?.();
    },
    [],
  );
  function down(e, kind) {
    if (!editing || e.button !== 0 || !host) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    beginGesture?.();
    drag.current = {
      pointer: e.pointerId,
      frame: e.currentTarget,
      kind,
      rect: { ...layout },
      x: e.clientX,
      y: e.clientY,
      bounds: host.getBoundingClientRect(),
      draft: { ...layout },
    };
  }
  function move(e) {
    const g = drag.current;
    if (!g || g.pointer !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    const dx = (e.clientX - g.x) / g.bounds.width,
      dy = (e.clientY - g.y) / g.bounds.height;
    const next =
      g.kind === "move"
        ? normalizeTimelineCardLayout({
            ...g.rect,
            x: g.rect.x + dx,
            y: g.rect.y + dy,
          })
        : limitResize(
            g.rect,
            resizeFrom(g.rect, dx * 1920, dy * 1080, g.kind, {
              shift: e.shiftKey,
              alt: e.altKey,
              minWidth: 0.04,
              minHeight: 0.04,
            }),
            validTimelineCardLayout,
          );
    g.draft = next;
    setDraft(next);
  }
  function finish(e, cancel = false) {
    const g = drag.current;
    if (!g || (e && e.pointerId !== undefined && g.pointer !== e.pointerId))
      return;
    e?.stopPropagation();
    drag.current = null;
    if (g.frame.hasPointerCapture(g.pointer))
      g.frame.releasePointerCapture(g.pointer);
    if (!cancel) change(g.draft);
    setDraft(null);
    endGesture?.();
  }
  if (!layout || !host) return children;
  const r = draft || layout,
    d = item.timeline.design;
  return createPortal(
    <div
      className={`milestone-card-plane ${editing ? "editing-card" : ""}`}
      data-timeline-card-owner={item.id}
      style={{
        fontFamily: TEXT_FONTS[d.font].css,
        fontSize: `${d.fontSize / 19.2}cqw`,
        color: d.cardText,
        opacity: item.opacity ?? 1,
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (editing) {
          if (
            (e.ctrlKey || e.metaKey) &&
            ["z", "y"].includes(e.key.toLowerCase())
          ) {
            if (drag.current) finish(null, true);
            return;
          }
          e.stopPropagation();
          if (e.key === "Escape") {
            e.preventDefault();
            if (drag.current) finish(null, true);
            else exit();
          }
        } else if (
          e.target.closest(
            "input,textarea,select,video,audio,[contenteditable]",
          ) ||
          (e.target.closest("button") &&
            [
              " ",
              "Spacebar",
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "ArrowDown",
            ].includes(e.key))
        )
          e.stopPropagation();
      }}
    >
      <div
        className="milestone-card-position"
        style={{
          left: `${r.x * 100}%`,
          top: `${r.y * 100}%`,
          width: `${r.width * 100}%`,
          height: `${r.height * 100}%`,
        }}
      >
        {children}
        {editing && (
          <>
            <div
              className="milestone-card-edit-bar"
              onPointerDown={(e) => down(e, "move")}
              onPointerMove={move}
              onPointerUp={finish}
              onPointerCancel={(e) => finish(e, true)}
              onLostPointerCapture={(e) => finish(e, true)}
            >
              <button
                type="button"
                aria-label="Déplacer la fiche"
                onPointerDown={(e) => down(e, "move")}
                onPointerMove={move}
                onPointerUp={finish}
                onPointerCancel={(e) => finish(e, true)}
                onLostPointerCapture={(e) => finish(e, true)}
              >
                ✥{" "}
                {scope === "individual"
                  ? "Disposition individuelle"
                  : "Disposition commune"}
              </button>
              <button type="button" onPointerDown={e=>e.stopPropagation()} onClick={editContent}>Modifier le contenu</button>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={exit}
              >
                Terminer la fiche
              </button>
            </div>
            {["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((kind) => (
              <button
                type="button"
                className={`timeline-card-handle card-handle-${kind}`}
                key={kind}
                aria-label={`Redimensionner la fiche ${kind}`}
                onPointerDown={(e) => down(e, kind)}
                onPointerMove={move}
                onPointerUp={finish}
                onPointerCancel={(e) => finish(e, true)}
                onLostPointerCapture={(e) => finish(e, true)}
              />
            ))}
          </>
        )}
      </div>
    </div>,
    host,
  );
}
