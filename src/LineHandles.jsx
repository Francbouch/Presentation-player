import { useEffect, useRef } from "react";
import { linePoints, lineGeometry, constrainLine } from "./vectorLines.js";
import { visualBounds } from "./editorGeometry.js";
export default function LineHandles({
  item,
  disabled,
  others,
  magnetism,
  preview,
  commit,
  clear,
}) {
  const drag = useRef(null);
  function update(e) {
    const g = drag.current;
    if (!g || g.pointerId !== e.pointerId) return;
    e.stopPropagation?.();
    g.last = { clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId };
    let p = {
      x: Math.max(0, Math.min(1, (e.clientX - g.bounds.left) / g.bounds.width)),
      y: Math.max(0, Math.min(1, (e.clientY - g.bounds.top) / g.bounds.height)),
    };
    const guides = [];
    if (magnetism && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      for (const [axis, size, scale] of [
        ["x", "width", g.bounds.width],
        ["y", "height", g.bounds.height],
      ]) {
        const candidates = [
          0,
          0.5,
          1,
          ...others.flatMap((i) => {
            const b = visualBounds(i);
            return [b[axis], b[axis] + b[size] / 2, b[axis] + b[size]];
          }),
        ];
        const target = candidates
          .map((value) => ({ value, d: Math.abs(value - p[axis]) * scale }))
          .filter((v) => v.d <= 6)
          .sort((a, b) => a.d - b.d)[0];
        if (target) {
          p[axis] = target.value;
          guides.push({ axis, value: target.value });
        }
      }
    }
    p = constrainLine(g.points[1 - g.index], p, e.shiftKey);
    const points = [...g.points];
    points[g.index] = p;
    const patch = lineGeometry(...points);
    g.patch = patch;
    preview(patch, guides);
  }
  function finish(e, cancelled = false) {
    const g = drag.current;
    if (!g || e.pointerId !== g.pointerId) return;
    drag.current = null;
    if (!cancelled && g.patch) commit(g.patch);
    clear();
    if (g.element.hasPointerCapture(g.pointerId))
      g.element.releasePointerCapture(g.pointerId);
    e.stopPropagation?.();
  }
  useEffect(() => {
    const key = (e) => {
      if (!drag.current) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        finish({ pointerId: drag.current.pointerId }, true);
      } else if (
        ["Shift", "Control", "Meta"].includes(e.key) &&
        drag.current.last
      )
        update({
          ...drag.current.last,
          shiftKey: e.shiftKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
        });
    };
    const blur = () => {
      if (drag.current) finish({ pointerId: drag.current.pointerId }, true);
    };
    window.addEventListener("keydown", key, true);
    window.addEventListener("keyup", key, true);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("keyup", key, true);
      window.removeEventListener("blur", blur);
    };
  });
  return [0, 1].map((index) => (
    <button
      key={index}
      type="button"
      className="line-endpoint-handle"
      aria-label={`${index ? "Arrivée" : "Départ"} de la ligne ${item.name}`}
      title={`${index ? "Arrivée" : "Départ"} · Maj : pas de 45°`}
      disabled={disabled || item.locked}
      style={{
        left: `${item.endpoints["x" + (index + 1)] * 100}%`,
        top: `${item.endpoints["y" + (index + 1)] * 100}%`,
      }}
      onPointerDown={(e) => {
        if (disabled || item.locked || e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const element = e.currentTarget;
        drag.current = {
          index,
          element,
          points: linePoints(item),
          pointerId: e.pointerId,
          bounds: element
            .closest(".interactive-button-layer")
            .getBoundingClientRect(),
        };
        element.focus();
        element.setPointerCapture(e.pointerId);
      }}
      onPointerMove={update}
      onPointerUp={(e) => finish(e)}
      onPointerCancel={(e) => finish(e, true)}
      onLostPointerCapture={(e) => finish(e, true)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (
          !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
            e.key,
          ) ||
          disabled ||
          item.locked
        )
          return;
        e.preventDefault();
        e.stopPropagation();
        const points = linePoints(item),
          step = e.shiftKey ? 10 : 1;
        points[index] = {
          x: Math.max(
            0,
            Math.min(
              1,
              points[index].x +
                (e.key === "ArrowLeft"
                  ? -step
                  : e.key === "ArrowRight"
                    ? step
                    : 0) /
                  1920,
            ),
          ),
          y: Math.max(
            0,
            Math.min(
              1,
              points[index].y +
                (e.key === "ArrowUp"
                  ? -step
                  : e.key === "ArrowDown"
                    ? step
                    : 0) /
                  1080,
            ),
          ),
        };
        commit(lineGeometry(...points));
      }}
    />
  ));
}
