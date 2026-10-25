import {validTitleOffset} from "./timelineTitlePosition.js";
import { TEXT_FONTS } from "./textModel.js";
const id = () => crypto.randomUUID();
export const timelineStep = (n = 1) => ({
  id: id(),
  name: `Étape ${n}`,
  description: "",
  details: "",
  date: "",
  icon: "",
  status: "upcoming",
  color: null,
  imageId: null,
  videoId: null,
  phaseId: null,
  visible: true,
  click: "card",
});
export const timelineDesign = () => ({
  layout: "horizontal",
  spacing: 220,
  lineWidth: 4,
  dotSize: 28,
  fontSize: 24,
  font: "dm-sans",
  titlePosition: "below",
  align: "center",
  margin: 70,
  radius: 12,
  lineColor: "#4c4960",
  progressColor: "#b8a0ec",
  textColor: "#f4ecff",
  background: "#171923",
  backgroundTransparent: false,
  showDates: true,
  showDescriptions: false,
  showIcons: true,
  statusColors: { done: "#63cfad", current: "#b8a0ec", upcoming: "#8a91a8" },
  progress: true,
  progressMode: "active",
  manualProgress: 0,
  progressDuration: 400,
  reveal: false,
  initialVisible: 1,
  revealType: "fade",
  revealDuration: 300,
  revealClick: true,
  revealSpace: true,
  highlight: "glow",
  highlightScale: 125,
  highlightIntensity: 16,
  dimOthers: 45,
  exclusive: true,
  cardMode: "floating",
  cardLayout: { x: 0.14, y: 0.3, width: 0.24, height: 0.38 },
  cardBackground: "#242632",
  cardText: "#ffffff",
  cardBorder: "#77718e",
  cardRadius: 16,
  cardShadow: 20,
  cardWidth: 390,
  cardHeight: 420,
  cardDuration: 200,
  cardAutoplay: false,
  zoom: true,
  zoomScale: 180,
  zoomDuration: 350,
  autoCenter: false,
  centerAnimated: true,
  centerDuration: 700,
  centerEasing: "ease-in-out",
});
export const timelineData = () => ({
  steps: [timelineStep(1), timelineStep(2), timelineStep(3)],
  phases: [],
  design: timelineDesign(),
});
export const timelinePresets = {
  minimal: {
    lineWidth: 2,
    dotSize: 18,
    fontSize: 20,
    highlight: "color",
    background: "#171923",
  },
  professional: {
    lineWidth: 4,
    dotSize: 28,
    fontSize: 24,
    highlight: "glow",
    background: "#171923",
  },
  presentation: {
    lineWidth: 7,
    dotSize: 40,
    fontSize: 30,
    highlight: "scale",
    highlightScale: 125,
    background: "#171923",
  },
  compact: {
    spacing: 150,
    fontSize: 18,
    dotSize: 20,
    lineWidth: 2,
    highlight: "color",
    background: "#171923",
  },
};
export const TIMELINE_STATUSES = {
  done: "Terminée",
  current: "En cours",
  upcoming: "À venir",
};
export function timelineOrder(data) {
  return data.steps;
}
export function timelineItems(data, collapsed = {}) {
  const steps = timelineOrder(data).filter((s) => s.visible),
    seen = new Set(),
    out = [];
  for (const s of steps) {
    const p = data.phases.find((p) => p.id === s.phaseId);
    if (p && (collapsed[p.id] ?? p.collapsed)) {
      if (!seen.has(p.id))
        out.push({
          id: `phase:${p.id}`,
          name: p.name,
          phase: p,
          summary: true,
          color: p.color,
          status: "upcoming",
        });
      seen.add(p.id);
    } else out.push(s);
  }
  return out;
}
export function timelineGeometry(item, items) {
  const d = item.timeline.design,
    W = Math.max(240, item.width * 1920),
    H = Math.max(240, item.height * 1080 - 78),
    m = Math.min(
      Math.max(d.margin, d.spacing * 0.45 + 12),
      Math.min(W, H) / 2 - 10,
    ),
    vertical = d.layout === "vertical",
    columns = Math.max(2, Math.floor((W - m * 2) / d.spacing) + 1),
    n = items.length;
  const width = vertical
      ? W
      : d.layout === "zigzag"
        ? W
        : Math.max(W, (n - 1) * d.spacing + m * 2),
    height = vertical
      ? Math.max(H, (n - 1) * d.spacing + m * 2)
      : d.layout === "zigzag"
        ? Math.max(H, (Math.ceil(n / columns) - 1) * d.spacing + m * 2)
        : H;
  const points = items.map((s, i) => {
    let x, y;
    if (vertical) {
      x = d.align === "start" ? m : d.align === "end" ? W - m : W / 2;
      y = m + i * d.spacing;
    } else if (d.layout === "zigzag") {
      const row = Math.floor(i / columns),
        col = i % columns;
      x =
        m + ((row % 2 ? columns - 1 - col : col) * (W - 2 * m)) / (columns - 1);
      y = m + row * d.spacing;
    } else {
      x = n < 2 ? W / 2 : (width - (n - 1) * d.spacing) / 2 + i * d.spacing;
      y = d.align === "start" ? m : d.align === "end" ? H - m : H / 2;
    }
    return { ...s, x, y };
  });
  return {
    width,
    height,
    points,
    path: points.map((p) => `${p.x},${p.y}`).join(" "),
  };
}
export function timelineProgress(points, activeId, revealed, design) {
  if (design.progressMode === "manual") return design.manualProgress;
  if (points.length < 2) return points.length ? 100 : 0;
  let index = points.findIndex((p) => p.id === activeId);
  if (index < 0)
    index = design.reveal
      ? Math.min(revealed, points.length) - 1
      : points.reduce((last, p, i) => (p.status === "done" ? i : last), -1);
  if (index < 0) return 0;
  let total = 0,
    part = 0;
  for (let i = 1; i < points.length; i++) {
    const length = Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y,
    );
    total += length;
    if (i <= index) part += length;
  }
  return total ? (part / total) * 100 : 0;
}
export function validateMilestoneTimeline(layer) {
  if (layer.type !== "milestoneTimeline") return;
  const fail = () => {
      throw Error(
        "La configuration de la ligne du temps est invalide. Le projet actuel est conservé.",
      );
    },
    t = layer.timeline;
  if (
    !t ||
    !Array.isArray(t.steps) ||
    t.steps.length > 5000 ||
    !Array.isArray(t.phases) ||
    t.phases.length > 1000 ||
    !t.design ||
    typeof t.design !== "object" ||
    Array.isArray(t.design)
  )
    fail();
  const text = (v, max) => typeof v === "string" && v.length <= max,
    color = (v) => typeof v === "string" && /^#[a-f0-9]{6}$/i.test(v),
    ids = new Set(),
    phases = new Set();
  for (const p of t.phases) {
    if (
      !p ||
      !text(p.id, 200) ||
      !p.id ||
      phases.has(p.id) ||
      !text(p.name, 160) ||
      !color(p.color) ||
      typeof p.collapsed !== "boolean"
    )
      fail();
    phases.add(p.id);
  }
  for (const s of t.steps) {
    if (
      !s ||
      !text(s.id, 200) ||
      !s.id ||
      ids.has(s.id) ||
      !text(s.name, 200) ||
      !text(s.description, 10000) ||
      !text(s.details, 10000) ||
      !text(s.date, 160) ||
      !text(s.icon, 40) ||
      !Object.hasOwn(TIMELINE_STATUSES, s.status) ||
      (s.color !== null && !color(s.color)) ||
      typeof s.visible !== "boolean" ||
      !["select", "card", "zoom", "none"].includes(s.click) ||
      (s.phaseId !== null && !phases.has(s.phaseId)) ||
      [s.imageId, s.videoId].some((v) => v !== null && (!text(v, 200) || !v))
    )
      fail();
    if(s.titleOffset!==undefined && !validTitleOffset(s.titleOffset)) fail();
    if (s.cardLayout != null && !validTimelineCardLayout(s.cardLayout)) fail();
    for (const k of ["zoomOnSelect", "cardOnSelect"])
      if (s[k] !== undefined && typeof s[k] !== "boolean") fail();
    ids.add(s.id);
  }
  const d = t.design,
    def = timelineDesign();
  if (d.cardLayout != null && !validTimelineCardLayout(d.cardLayout)) fail();
  for (const key of Object.keys(def)) {
    if (
      typeof def[key] === "boolean" &&
      typeof d[key] !== "boolean" &&
      !(
        ["autoCenter", "centerAnimated", "backgroundTransparent"].includes(
          key,
        ) && d[key] === undefined
      )
    )
      fail();
  }
  if (
    d.centerDuration !== undefined &&
    (!Number.isFinite(d.centerDuration) ||
      d.centerDuration < 200 ||
      d.centerDuration > 1500)
  )
    fail();
  if (
    d.centerEasing !== undefined &&
    !["ease-in-out", "ease-out", "linear"].includes(d.centerEasing)
  )
    fail();
  const enums = {
    layout: ["horizontal", "vertical", "zigzag"],
    titlePosition: ["above", "below", "alternating"],
    align: ["start", "center", "end"],
    progressMode: ["active", "manual"],
    revealType: ["none", "fade", "slide", "scale"],
    highlight: ["none", "scale", "glow", "color", "opacity", "bold", "dim"],
    cardMode: ["floating", "side", "bottom"],
  };
  for (const [k, values] of Object.entries(enums))
    if (!values.includes(d[k])) fail();
  const ranges = {
    spacing: [100, 800],
    lineWidth: [1, 30],
    dotSize: [10, 100],
    fontSize: [12, 80],
    margin: [10, 240],
    radius: [0, 100],
    manualProgress: [0, 100],
    progressDuration: [0, 5000],
    initialVisible: [0, 5000],
    revealDuration: [0, 5000],
    highlightScale: [100, 150],
    highlightIntensity: [0, 60],
    dimOthers: [0, 80],
    cardRadius: [0, 100],
    cardShadow: [0, 80],
    cardWidth: [220, 900],
    cardHeight: [150, 900],
    cardDuration: [0, 5000],
    zoomScale: [110, 300],
    zoomDuration: [0, 5000],
  };
  for (const [k, [a, b]] of Object.entries(ranges))
    if (!Number.isFinite(d[k]) || d[k] < a || d[k] > b) fail();
  if (!Number.isInteger(d.initialVisible) || !Object.hasOwn(TEXT_FONTS, d.font))
    fail();
  for (const k of [
    "lineColor",
    "progressColor",
    "textColor",
    "background",
    "cardBackground",
    "cardText",
    "cardBorder",
  ])
    if (!color(d[k])) fail();
  if (
    !d.statusColors ||
    ["done", "current", "upcoming"].some((k) => !color(d.statusColors[k]))
  )
    fail();
}
export function validateMilestoneMedia(document) {
  const media = new Map(document.media.map((m) => [m.id, m]));
  for (const layer of [
    ...document.pages.flatMap((p) => p.layers || []),
    ...(document.components || []).flatMap((c) => c.layers || []),
  ])
    if (layer.type === "milestoneTimeline")
      for (const step of layer.timeline.steps)
        for (const kind of ["image", "video"]) {
          const m = media.get(step[`${kind}Id`]);
          if (m && !m.type.startsWith(kind + "/"))
            throw Error(
              "Un média de la ligne du temps possède un type incompatible. Le projet actuel est conservé.",
            );
        }
}

// Finite pasteboard bounds prevent corrupt documents without imposing slide bounds.
export const isTimelineLayer = (item) => item?.type === "milestoneTimeline";
export function validTimelineFrame(r) {
  return (
    ["x", "y", "width", "height"].every((k) => Number.isFinite(r[k])) &&
    r.x >= -20 &&
    r.x <= 20 &&
    r.y >= -20 &&
    r.y <= 20 &&
    r.width >= 0.02 &&
    r.width <= 20 &&
    r.height >= 0.02 &&
    r.height <= 20
  );
}
export function timelineFramePatch(item, patch) {
  const result = { ...patch };
  for (const k of ["x", "y", "width", "height"])
    if (result[k] !== undefined)
      result[k] = Math.max(
        ["width", "height"].includes(k) ? 0.02 : -20,
        Math.min(20, result[k]),
      );
  return result;
}

export const timelineStepActions = (step) => ({
  zoom: step.zoomOnSelect ?? step.click === "zoom",
  card: step.cardOnSelect ?? step.click === "card",
});

export const defaultTimelineCardLayout = () => ({
  x: 0.14,
  y: 0.3,
  width: 0.24,
  height: 0.38,
});
export function validTimelineCardLayout(r) {
  return (
    !!r &&
    typeof r === "object" &&
    ["x", "y", "width", "height"].every((k) => Number.isFinite(r[k])) &&
    r.x >= 0 &&
    r.y >= 0 &&
    r.width >= 0.04 &&
    r.height >= 0.04 &&
    r.width <= 1 &&
    r.height <= 1 &&
    r.x + r.width <= 1.00000001 &&
    r.y + r.height <= 1.00000001
  );
}
export function normalizeTimelineCardLayout(r) {
  const width = Math.max(0.04, Math.min(1, r.width)),
    height = Math.max(0.04, Math.min(1, r.height));
  return {
    ...r,
    width,
    height,
    x: Math.max(0, Math.min(1 - width, r.x)),
    y: Math.max(0, Math.min(1 - height, r.y)),
  };
}

// Inverse of the layer rotation: locate the slide centre in viewport-local CSS pixels.
export function timelineSlideCentre(
  item,
  slideWidth,
  slideHeight,
  offsetX = 0,
  offsetY = 0,
) {
  const angle = ((item.rotation || 0) * Math.PI) / 180,
    c = Math.cos(angle),
    s = Math.sin(angle);
  const dx = (0.5 - item.x - item.width / 2) * slideWidth,
    dy = (0.5 - item.y - item.height / 2) * slideHeight;
  return {
    x: (item.width * slideWidth) / 2 + dx * c + dy * s - offsetX,
    y: (item.height * slideHeight) / 2 - dx * s + dy * c - offsetY,
  };
}
