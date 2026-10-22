import { buttonStyle } from "./buttonAppearance.js";
import { frameBorder } from "./mediaFrames.js";
import {
  defaultObjectEffects,
  validateObjectEffects,
} from "./objectEffects.js";
import { validateTextStyles } from "./textModel.js";
import { validateVectorLine } from "./vectorLines.js";
const clone = (v) => structuredClone(v),
  kind = (i) => i.type || "button";
const shape = (i) => ["rectangle", "circle", "line"].includes(kind(i)),
  button = (i) => kind(i) === "button";
const pick = (o, keys) =>
  Object.fromEntries(
    keys.filter((k) => o?.[k] !== undefined).map((k) => [k, o[k]]),
  );
export function appearanceValues(item) {
  const v = { effects: clone(item.objectEffects || defaultObjectEffects()) };
  if (button(item)) {
    const a = item.appearance || buttonStyle();
    v.fill = {
      color: a.background,
      opacity: a.backgroundOpacity / 100,
      transparent: a.transparent,
      radius: a.radius,
    };
    v.border = {
      enabled: a.borderEnabled !== false,
      color: a.border,
      width: a.borderWidth,
      opacity: a.borderOpacity ?? 1,
    };
    if (item.interactiveEffects) v.interaction = clone(item.interactiveEffects);
  } else if (shape(item))
    v.fill = {
      color: item.color,
      opacity: item.fillOpacity ?? 1,
      transparent: item.fillMode === "transparent",
      radius: item.cornerRadius || 0,
    };
  if (
    !button(item) &&
    ["rectangle", "circle", "line", "image"].includes(kind(item))
  )
    v.border = clone(item.border || frameBorder());
  if (kind(item) === "text" || (button(item) && item.labelText)) {
    const t = button(item) ? item.labelText : item;
    v.typography = {
      color: t.color,
      textStyle: pick(
        t.textStyle,
        Object.keys(t.textStyle).filter(
          (k) => !["autoHeight", "preset"].includes(k),
        ),
      ),
    };
  }
  if (kind(item) === "vectorLine") v.stroke = clone(item.stroke);
  return v;
}
export function appearancePatch(item, values, category = "all") {
  const patch = {},
    use = (k) => category === "all" || category === k;
  if (use("fill") && values.fill) {
    const f = values.fill;
    if (button(item))
      patch.appearance = {
        ...(item.appearance || buttonStyle()),
        background: f.color,
        backgroundOpacity: f.opacity * 100,
        transparent: f.transparent,
        radius: Math.min(200, f.radius),
      };
    else if (shape(item))
      Object.assign(patch, {
        color: f.color,
        fillOpacity: f.opacity,
        fillMode: f.transparent ? "transparent" : "solid",
        cornerRadius: f.radius,
      });
  }
  if (use("border") && values.border) {
    const b = values.border;
    if (button(item))
      patch.appearance = {
        ...(patch.appearance || item.appearance || buttonStyle()),
        border: b.color,
        borderEnabled: b.enabled,
        borderOpacity: b.opacity,
        borderWidth: Math.min(30, b.width),
      };
    else if (["rectangle", "circle", "line", "image"].includes(kind(item)))
      patch.border = clone(b);
  }
  if (use("effects") && values.effects)
    patch.objectEffects = clone(values.effects);
  if (use("effects") && values.interaction && button(item))
    patch.interactiveEffects = clone(values.interaction);
  if (use("typography") && values.typography) {
    const t = values.typography;
    if (kind(item) === "text")
      Object.assign(patch, {
        color: t.color,
        textStyle: { ...item.textStyle, ...t.textStyle, autoHeight: false },
      });
    else if (button(item) && item.labelText)
      patch.labelText = {
        ...item.labelText,
        color: t.color,
        textStyle: {
          ...item.labelText.textStyle,
          ...t.textStyle,
          autoHeight: false,
        },
      };
  }
  if (use("border") && values.stroke && kind(item) === "vectorLine")
    patch.stroke = clone(values.stroke);
  return patch;
}
export function leaves(o, prefix = "") {
  return Object.entries(o || {}).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === "object" && !Array.isArray(v)
      ? leaves(v, path)
      : [[path, v]];
  });
}
function read(o, path) {
  return path.split(".").reduce((v, k) => v?.[k], o);
}
function set(o, path, value) {
  const keys = path.split(".");
  let current = o;
  for (const key of keys.slice(0, -1))
    current = current[key] =
      current[key] && typeof current[key] === "object"
        ? { ...current[key] }
        : {};
  current[keys.at(-1)] = clone(value);
}
export function markStyleChanges(item, patch) {
  if (!item?.styleLink || Object.hasOwn(patch, "styleLink")) return patch;
  const allowed = new Set(
    leaves(appearancePatch(item, appearanceValues({ ...item, ...patch }))).map(
      ([k]) => k,
    ),
  );
  const changed = leaves(patch)
    .filter(
      ([path, value]) =>
        allowed.has(path) &&
        JSON.stringify(read(item, path)) !== JSON.stringify(value),
    )
    .map(([path]) => path);
  return changed.length
    ? {
        ...patch,
        styleLink: {
          ...item.styleLink,
          overrides: [...new Set([...item.styleLink.overrides, ...changed])],
        },
      }
    : patch;
}
export function resolveStyle(item, styles) {
  if (!item.styleLink) return item;
  const style = styles.find((s) => s.id === item.styleLink.id);
  if (!style) return item;
  const next = { ...item },
    patch = appearancePatch(item, style.values);
  for (const [path, value] of leaves(patch))
    if (!item.styleLink.overrides.includes(path)) set(next, path, value);
  return next;
}
export function resolveProjectStyles(document) {
  if (!document.projectStyles?.length) return document;
  const styles = document.projectStyles,
    map = (i) => resolveStyle(i, styles);
  return {
    ...document,
    pages: document.pages.map((p) => ({
      ...p,
      layers: p.layers.map(map),
      buttons: p.buttons.map(map),
    })),
    ...(document.components
      ? {
          components: document.components.map((c) => ({
            ...c,
            layers: c.layers.map(map),
          })),
        }
      : {}),
  };
}
export function mapStyleItems(document, fn) {
  return {
    ...document,
    pages: document.pages.map((p) => ({
      ...p,
      layers: p.layers.map(fn),
      buttons: p.buttons.map(fn),
    })),
    ...(document.components
      ? {
          components: document.components.map((c) => ({
            ...c,
            layers: c.layers.map(fn),
          })),
        }
      : {}),
  };
}
export function deleteProjectStyle(document, id) {
  return {
    ...mapStyleItems(document, (i) => {
      if (i.styleLink?.id !== id) return i;
      const next = { ...i };
      delete next.styleLink;
      return next;
    }),
    projectStyles: document.projectStyles.filter((s) => s.id !== id),
  };
}
export function validateProjectStyles(document) {
  const styles = document.projectStyles;
  if (styles !== undefined && (!Array.isArray(styles) || styles.length > 500))
    throw Error("Bibliothèque de styles invalide. Votre projet est conservé.");
  const ids = new Set(),
    fail = () => {
      throw Error(
        "Style ou liaison de style invalide. Votre projet est conservé.",
      );
    },
    color = (v) => /^#[0-9a-f]{6}$/i.test(v),
    num = (v, a, b) => Number.isFinite(v) && v >= a && v <= b;
  for (const s of styles || []) {
    if (
      !s ||
      typeof s.id !== "string" ||
      !s.id ||
      ids.has(s.id) ||
      typeof s.name !== "string" ||
      !s.name.trim() ||
      s.name.length > 80 ||
      !s.values ||
      Object.keys(s.values).some(
        (k) =>
          ![
            "fill",
            "border",
            "effects",
            "typography",
            "stroke",
            "interaction",
          ].includes(k),
      )
    )
      fail();
    ids.add(s.id);
    const v = s.values,
      f = v.fill,
      b = v.border;
    if (
      f &&
      (!color(f.color) ||
        !num(f.opacity, 0, 1) ||
        typeof f.transparent !== "boolean" ||
        !num(f.radius, 0, 500))
    )
      fail();
    if (
      b &&
      (!color(b.color) ||
        typeof b.enabled !== "boolean" ||
        !num(b.width, 0, 100) ||
        !num(b.opacity, 0, 1))
    )
      fail();
    validateObjectEffects(v.effects);
    if (v.typography) {
      if (!color(v.typography.color)) fail();
      validateTextStyles([
        {
          layers: [
            {
              type: "text",
              textStyle: {
                ...v.typography.textStyle,
                autoHeight: false,
                preset: "custom",
              },
            },
          ],
        },
      ]);
    }
    if (v.stroke)
      validateVectorLine({
        type: "vectorLine",
        endpoints: { x1: 0, y1: 0, x2: 1, y2: 1 },
        stroke: v.stroke,
      });
    if (v.interaction) {
      const e = v.interaction;
      if (!num(e.clickDuration, 50, 10000)) fail();
      for (const key of ["hover", "click", "active"]) {
        const f = e[key];
        if (
          !f ||
          !["none", "glow", "scale", "contrast"].includes(f.type) ||
          !color(f.color) ||
          !num(f.thickness, 0, 30) ||
          !num(f.intensity, 0, 60) ||
          !num(f.scale, 105, 150) ||
          !num(f.darkness, 0, 80) ||
          !num(f.duration, 0, 5000)
        )
          fail();
      }
    }
  }
  const items = [
    ...document.pages.flatMap((p) => [
      ...(p.layers || []),
      ...(p.buttons || []),
    ]),
    ...(document.components || []).flatMap((c) => c.layers || []),
  ];
  for (const i of items) {
    if (i.styleLink !== undefined) {
      const l = i.styleLink;
      if (
        !l ||
        !ids.has(l.id) ||
        !Array.isArray(l.overrides) ||
        l.overrides.length > 250 ||
        l.overrides.some(
          (p) =>
            typeof p !== "string" ||
            p.length > 150 ||
            !/^((appearance|border|textStyle|labelText|stroke|objectEffects|interactiveEffects)\.[a-zA-Z.]+|color|fillMode|fillOpacity|cornerRadius)$/.test(
              p,
            ),
        )
      )
        fail();
    }
  }
}
