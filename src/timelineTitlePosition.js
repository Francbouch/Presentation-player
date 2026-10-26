// Offsets use the Timeline's local 1920 × 1080 coordinates. No defaults are persisted.
export const TITLE_OFFSET_LIMITS = { x: 38400, y: 21600 };
export function validTitleOffset(value) {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    ["x", "y"].every(
      (k) =>
        Number.isFinite(value[k]) &&
        Math.abs(value[k]) <= TITLE_OFFSET_LIMITS[k],
    )
  );
}
export function boundedTitleOffset(value) {
  return Object.fromEntries(
    ["x", "y"].map((k) => [
      k,
      Math.max(
        -TITLE_OFFSET_LIMITS[k],
        Math.min(TITLE_OFFSET_LIMITS[k], value[k]),
      ),
    ]),
  );
}
export function setTimelineTitleOffset(timeline, id, offset, all = false, scope = 'steps') {
  return {
    ...timeline,
    [scope]: timeline[scope].map((step) => {
      if (!all && step.id !== id) return step;
      const next = { ...step };
      if (offset == null) delete next.titleOffset;
      else next.titleOffset = { ...step.titleOffset, x: offset.x, y: offset.y };
      return next;
    }),
  };
}
export function titleElement(layerId, stepId, doc = globalThis.document) {
  const frame = [
    ...(doc?.querySelectorAll(".editor-preview [data-layer-id]") || []),
  ].find((e) => e.dataset.layerId === layerId);
  return [...(frame?.querySelectorAll("[data-step-id]") || [])]
    .find((e) => e.dataset.stepId === stepId)
    ?.querySelector(".milestone-title");
}
export function measuredTitleOffset(element) {
  if (!element) return null;
  const node = element.parentElement,
    host = node.closest(".interactive-button-layer");
  const nodeStyle = getComputedStyle(node),
    style = getComputedStyle(element);
  const scale = (host ? parseFloat(getComputedStyle(host).width) : 1920) / 1920;
  const width = parseFloat(style.width),
    height = parseFloat(style.height),
    nodeWidth = parseFloat(nodeStyle.width),
    nodeHeight = parseFloat(nodeStyle.height);
  const left = Number.isFinite(parseFloat(style.left))
    ? parseFloat(style.left)
    : nodeWidth - parseFloat(style.right) - width;
  const top = Number.isFinite(parseFloat(style.top))
    ? parseFloat(style.top)
    : nodeHeight - parseFloat(style.bottom) - height;
  return {
    x: (left + width / 2 - nodeWidth / 2) / scale,
    y: (top - nodeHeight / 2) / scale,
  };
}
export function titleOffsetFor(layer, step) {
  return (
    step.titleOffset ||
    measuredTitleOffset(titleElement(layer.id, step.id)) || {
      x: 0,
      y: layer.timeline.design.titlePosition === "above" ? -24.96 : 24.96,
    }
  );
}
export function notifyTitlePreview(layerId, stepId, offset) {
  globalThis.document?.dispatchEvent(
    new CustomEvent("studio-timeline-title-preview", {
      detail: { layerId, stepId, offset },
    }),
  );
}
