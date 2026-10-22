export const isVectorLine = (item) => item.type === "vectorLine";
export const defaultStroke = () => ({
  enabled: true,
  color: "#b8a0ec",
  opacity: 1,
  width: 3,
  cap: "butt",
  pattern: "solid",
  dash: 10,
  gap: 5,
  offset: 0,
  start: "none",
  end: "none",
  decorationScale: 3,
});
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
// Les points sont locaux au cadre. Position/taille/rotation existants transforment
// ainsi aussi les lignes dans les groupes et composants, sans second moteur.
export function linePoints(item) {
  const a = ((item.rotation || 0) * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  return [1, 2].map((n) => {
    const x = (item.endpoints["x" + n] - 0.5) * item.width * 1920,
      y = (item.endpoints["y" + n] - 0.5) * item.height * 1080;
    return {
      x: item.x + item.width / 2 + (x * c - y * s) / 1920,
      y: item.y + item.height / 2 + (x * s + y * c) / 1080,
    };
  });
}
export function lineGeometry(a, b) {
  if ([a.x, a.y, b.x, b.y].some((v) => !Number.isFinite(v) || v < 0 || v > 1))
    return null;
  const w = Math.max(0.02, Math.abs(b.x - a.x)),
    h = Math.max(0.02, Math.abs(b.y - a.y));
  const x = clamp((a.x + b.x - w) / 2, 0, 1 - w),
    y = clamp((a.y + b.y - h) / 2, 0, 1 - h);
  return {
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    endpoints: {
      x1: clamp((a.x - x) / w, 0, 1),
      y1: clamp((a.y - y) / h, 0, 1),
      x2: clamp((b.x - x) / w, 0, 1),
      y2: clamp((b.y - y) / h, 0, 1),
    },
  };
}
export function constrainLine(anchor, end, shift) {
  let dx = (end.x - anchor.x) * 1920,
    dy = (end.y - anchor.y) * 1080;
  if (shift) {
    const length = Math.hypot(dx, dy),
      a = (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI) / 4;
    dx = Math.cos(a) * length;
    dy = Math.sin(a) * length;
  }
  const sx = dx / 1920,
    sy = dy / 1080;
  const scale = Math.min(
    1,
    sx > 0 ? (1 - anchor.x) / sx : sx < 0 ? -anchor.x / sx : 1,
    sy > 0 ? (1 - anchor.y) / sy : sy < 0 ? -anchor.y / sy : 1,
  );
  return {
    x: clamp(anchor.x + sx * scale, 0, 1),
    y: clamp(anchor.y + sy * scale, 0, 1),
  };
}
export function drawLine(start, end, { shift = false, alt = false } = {}) {
  let b = constrainLine(start, end, shift),
    a = start;
  if (alt) {
    const dx = b.x - start.x,
      dy = b.y - start.y,
      scale = Math.min(
        1,
        dx ? Math.min(start.x, 1 - start.x) / Math.abs(dx) : 1,
        dy ? Math.min(start.y, 1 - start.y) / Math.abs(dy) : 1,
      );
    a = {
      x: clamp(start.x - dx * scale, 0, 1),
      y: clamp(start.y - dy * scale, 0, 1),
    };
    b = {
      x: clamp(start.x + dx * scale, 0, 1),
      y: clamp(start.y + dy * scale, 0, 1),
    };
  }
  return Math.hypot((b.x - a.x) * 1920, (b.y - a.y) * 1080) < 1
    ? null
    : lineGeometry(a, b);
}
export function strokeDash(stroke) {
  return stroke.pattern === "dots"
    ? [0, Math.max(stroke.width * 2, 2)]
    : stroke.pattern === "dashed"
      ? [stroke.width * 4, stroke.width * 2]
      : stroke.pattern === "custom"
        ? [stroke.dash, stroke.gap]
        : null;
}
export function lineLength(item) {
  const [a, b] = linePoints(item);
  return Math.hypot((b.x - a.x) * 1920, (b.y - a.y) * 1080);
}
export function lineAngle(item) {
  const [a, b] = linePoints(item);
  return (Math.atan2((b.y - a.y) * 1080, (b.x - a.x) * 1920) * 180) / Math.PI;
}
export function validateVectorLine(item) {
  if (!isVectorLine(item)) return;
  const fail = () => {
    throw Error(
      "La géométrie ou le trait d’une ligne vectorielle est invalide. Votre projet est conservé.",
    );
  };
  const valid = (n, a, b) => Number.isFinite(n) && n >= a && n <= b;
  if (
    !item.endpoints ||
    ["x1", "y1", "x2", "y2"].some((k) => !valid(item.endpoints[k], 0, 1))
  )
    fail();
  const s = item.stroke;
  if (
    !s ||
    typeof s.enabled !== "boolean" ||
    !/^#[0-9a-f]{6}$/i.test(s.color) ||
    !valid(s.opacity, 0, 1) ||
    !valid(s.width, 0, 200) ||
    !["butt", "round", "square"].includes(s.cap) ||
    !["solid", "dots", "dashed", "custom"].includes(s.pattern) ||
    !valid(s.dash, 0.1, 2000) ||
    !valid(s.gap, 0.1, 2000) ||
    !valid(s.offset, -10000, 10000) ||
    !["none", "arrow", "dot"].includes(s.start) ||
    !["none", "arrow", "dot"].includes(s.end) ||
    !valid(s.decorationScale, 1, 20)
  )
    fail();
}
