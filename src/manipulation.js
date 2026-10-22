import { visualBounds } from "./editorGeometry.js";
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const SLIDE_WIDTH = 1920,
  SLIDE_HEIGHT = 1080;
export const angle15 = (angle) => Math.round(angle / 15) * 15;
export const wrapAngle = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
export function inside(rect) {
  return (
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.x + rect.width <= 1 + 1e-8 &&
    rect.y + rect.height <= 1 + 1e-8
  );
}
export function translated(items, dx, dy) {
  const boxes = items.flatMap((item) => [item, visualBounds(item)]);
  dx = clamp(
    dx,
    -Math.min(...boxes.map((b) => b.x)),
    1 - Math.max(...boxes.map((b) => b.x + b.width)),
  );
  dy = clamp(
    dy,
    -Math.min(...boxes.map((b) => b.y)),
    1 - Math.max(...boxes.map((b) => b.y + b.height)),
  );
  return Object.fromEntries(
    items.map((i) => [
      i.id,
      {
        x: clamp(i.x + dx, 0, 1 - i.width),
        y: clamp(i.y + dy, 0, 1 - i.height),
      },
    ]),
  );
}
// Un segment est rebâti au changement de modificateur : la souris immobile
// ne change jamais la géométrie. Le rapport initial reste la référence.
export function resizeFrom(
  rect,
  dx,
  dy,
  kind,
  {
    shift = false,
    alt = false,
    ratio = rect.width / rect.height,
    blend = 1,
    minWidth = 0.02,
    minHeight = 0.02,
  } = {},
) {
  const radians = ((rect.rotation || 0) * Math.PI) / 180,
    c = Math.cos(radians),
    s = Math.sin(radians),
    west = kind.includes("w"),
    north = kind.includes("n");
  const factor = alt ? 2 : 1;
  let width = Math.max(
      minWidth,
      rect.width + ((dx * c + dy * s) / 1920) * (west ? -1 : 1) * factor,
    ),
    height = Math.max(
      minHeight,
      rect.height + ((-dx * s + dy * c) / 1080) * (north ? -1 : 1) * factor,
    );
  if (shift) {
    const targetRatio =
      (rect.width / rect.height) * (1 - blend) + ratio * blend;
    const scale = (width / rect.width + height / rect.height) / 2;
    const area = rect.width * rect.height * scale * scale;
    width = Math.sqrt(area * targetRatio);
    height = width / targetRatio;
    const minimum = Math.max(1, minWidth / width, minHeight / height);
    width *= minimum;
    height *= minimum;
  }
  const sx = alt ? 0 : (((width - rect.width) * 1920) / 2) * (west ? -1 : 1),
    sy = alt ? 0 : (((height - rect.height) * 1080) / 2) * (north ? -1 : 1);
  return {
    ...rect,
    width,
    height,
    x: rect.x + rect.width / 2 + (sx * c - sy * s) / 1920 - width / 2,
    y: rect.y + rect.height / 2 + (sx * s + sy * c) / 1080 - height / 2,
  };
}
export function limitResize(
  base,
  candidate,
  valid = (r) => inside(r) && inside(visualBounds(r)),
) {
  if (valid(candidate)) return candidate;
  // Reculer jusqu'à la limite sans casser le centre ou les proportions.
  let lo = 0,
    hi = 1;
  for (let n = 0; n < 28; n++) {
    const t = (lo + hi) / 2;
    const r = {
      ...base,
      ...Object.fromEntries(
        ["x", "y", "width", "height"].map((k) => [
          k,
          base[k] + (candidate[k] - base[k]) * t,
        ]),
      ),
    };
    if (valid(r)) lo = t;
    else hi = t;
  }
  return {
    ...base,
    ...Object.fromEntries(
      ["x", "y", "width", "height"].map((k) => [
        k,
        base[k] + (candidate[k] - base[k]) * lo,
      ]),
    ),
  };
}
export function drawShape(start, end, { shift = false, alt = false } = {}) {
  let dx = (end.x - start.x) * 1920,
    dy = (end.y - start.y) * 1080;
  if (shift) {
    const edge = Math.max(Math.abs(dx), Math.abs(dy));
    dx = (dx < 0 ? -1 : 1) * edge;
    dy = (dy < 0 ? -1 : 1) * edge;
  }
  let width = Math.max(0.02, (Math.abs(dx) / 1920) * (alt ? 2 : 1)),
    height = Math.max(0.02, (Math.abs(dy) / 1080) * (alt ? 2 : 1));
  if (shift) {
    const edge = Math.max(width * 1920, height * 1080);
    width = edge / 1920;
    height = edge / 1080;
  }
  const maxScale = Math.min(
    1,
    alt
      ? (Math.min(start.x, 1 - start.x) * 2) / width
      : (dx < 0 ? start.x : 1 - start.x) / width,
    alt
      ? (Math.min(start.y, 1 - start.y) * 2) / height
      : (dy < 0 ? start.y : 1 - start.y) / height,
  );
  if (width * maxScale < 0.02 || height * maxScale < 0.02) return null;
  width *= maxScale;
  height *= maxScale;
  return {
    x: clamp(
      alt ? start.x - width / 2 : dx < 0 ? start.x - width : start.x,
      0,
      1 - width,
    ),
    y: clamp(
      alt ? start.y - height / 2 : dy < 0 ? start.y - height : start.y,
      0,
      1 - height,
    ),
    width,
    height,
  };
}
