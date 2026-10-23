import { useLayoutEffect, useRef, useState } from "react";
const finite = (box) =>
  box &&
  ["x", "y", "width", "height"].every((key) => Number.isFinite(box[key]));
export function notesBounds() {
  const area = document
    .querySelector(".workspace-shell")
    ?.getBoundingClientRect();
  const viewport = window.visualViewport;
  const left = viewport?.offsetLeft || 0,
    top = viewport?.offsetTop || 0;
  return {
    left: left + 8,
    top: Math.max(top + 8, (area?.top || 48) + 8),
    right: left + (viewport?.width || innerWidth) - 8,
    bottom: Math.min(
      top + (viewport?.height || innerHeight) - 8,
      area?.bottom || innerHeight - 8,
    ),
  };
}
export function constrainNotes(box, bounds = notesBounds()) {
  const availableWidth = Math.max(1, bounds.right - bounds.left),
    availableHeight = Math.max(1, bounds.bottom - bounds.top);
  const width = Math.min(availableWidth, Math.max(280, box.width)),
    height = Math.min(availableHeight, Math.max(200, box.height));
  return {
    x: Math.min(bounds.right - width, Math.max(bounds.left, box.x)),
    y: Math.min(bounds.bottom - height, Math.max(bounds.top, box.y)),
    width,
    height,
  };
}
export function defaultNotesBox() {
  const bounds = notesBounds(),
    tools = document.querySelector(".workspace-tools")?.getBoundingClientRect(),
    slide = document.querySelector(".editor-preview")?.getBoundingClientRect();
  const x = Math.max(bounds.left, (tools?.right || bounds.left) + 8),
    gap = (slide?.left || x + 340) - x - 8;
  return constrainNotes(
    {
      x,
      y: bounds.top + 8,
      width: Math.min(340, Math.max(280, gap)),
      height: 340,
    },
    bounds,
  );
}
export default function useFloatingNotes(saved, save) {
  const [box, setBox] = useState(() =>
    constrainNotes(finite(saved) ? saved : defaultNotesBox()),
  );
  const current = useRef(box),
    saveRef = useRef(save),
    drag = useRef(null);
  saveRef.current = save;
  function update(next, persist = false) {
    next = constrainNotes(next);
    current.current = next;
    setBox(next);
    if (persist) saveRef.current(next);
  }
  useLayoutEffect(() => {
    saveRef.current(current.current);
    const fit = () => {
      const next = constrainNotes(current.current);
      if (Object.keys(next).some((key) => next[key] !== current.current[key]))
        update(next, true);
    };
    const observer = new ResizeObserver(fit),
      area = document.querySelector(".workspace-shell");
    if (area) observer.observe(area);
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("scroll", fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("scroll", fit);
    };
  }, []);
  function start(event, kind) {
    if (
      event.button !== 0 ||
      event.target.closest("button,input,textarea,details")
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    drag.current = {
      kind,
      x: event.clientX,
      y: event.clientY,
      box: current.current,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function resize(box, dx, dy) {
    const bounds = notesBounds();
    return {
      ...box,
      width: Math.min(bounds.right - box.x, box.width + dx),
      height: Math.min(bounds.bottom - box.y, box.height + dy),
    };
  }
  function move(event) {
    const active = drag.current;
    if (!active) return;
    event.stopPropagation();
    const dx = event.clientX - active.x,
      dy = event.clientY - active.y;
    update(
      active.kind === "move"
        ? { ...active.box, x: active.box.x + dx, y: active.box.y + dy }
        : resize(active.box, dx, dy),
    );
  }
  function finish(event) {
    if (!drag.current) return;
    drag.current = null;
    saveRef.current(current.current);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function keyboard(event, kind) {
    if (event.target !== event.currentTarget) return;
    const dx =
        event.key === "ArrowLeft" ? -10 : event.key === "ArrowRight" ? 10 : 0,
      dy = event.key === "ArrowUp" ? -10 : event.key === "ArrowDown" ? 10 : 0;
    if (!dx && !dy) return;
    event.preventDefault();
    event.stopPropagation();
    const old = current.current;
    update(
      kind === "move"
        ? { ...old, x: old.x + dx, y: old.y + dy }
        : resize(old, dx, dy),
      true,
    );
  }
  const handlers = (kind) => ({
    onPointerDown: (e) => start(e, kind),
    onPointerMove: move,
    onPointerUp: finish,
    onPointerCancel: finish,
    onLostPointerCapture: finish,
    onKeyDown: (e) => keyboard(e, kind),
  });
  return { box, handlers, reset: () => update(defaultNotesBox(), true) };
}
