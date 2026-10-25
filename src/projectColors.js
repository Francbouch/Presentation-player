// Color references share the same leaf paths as reusable styles. Colors have no
// references themselves, so the dependency graph is strictly color → style → item.
export const colorPattern = /^#[0-9a-f]{6}$/i;
export const colorPaths = [
  ...["background","textColor","lineColor","progressColor","cardBackground","cardText","cardBorder","statusColors.done","statusColors.current","statusColors.upcoming"].map(k=>`timeline.design.${k}`),
  "color",
  "appearance.background",
  "appearance.border",
  "appearance.text",
  "labelText.color",
  "border.color",
  "stroke.color",
  "objectEffects.shadow.color",
  "indicator.color",
  "indicator.background",
  ...["hover", "click", "active"].map((k) => `interactiveEffects.${k}.color`),
];
export const styleColorPaths = [
  "fill.color",
  "border.color",
  "typography.color",
  "stroke.color",
  "effects.shadow.color",
  ...["hover", "click", "active"].map((k) => `interaction.${k}.color`),
];
export const readPath = (o, p) => p.split(".").reduce((v, k) => v?.[k], o);
export function writePath(o, path, value) {
  const keys = path.split(".");
  let at = o;
  for (const k of keys.slice(0, -1)) at = at[k] = { ...(at[k] || {}) };
  at[keys.at(-1)] = value;
  return o;
}
export function resolveColors(item, colors) {
  if (!item.colorLinks) return item;
  const next = { ...item };
  for (const [path, id] of Object.entries(item.colorLinks)) {
    const color = colors.find((c) => c.id === id);
    if (color && colorPattern.test(readPath(item, path)))
      writePath(next, path, color.value);
  }
  return next;
}
export function resolveDocumentColors(document) {
  const colors = document.projectColors || [];
  if (!colors.length) return document;
  return {
    ...document,
    projectStyles: (document.projectStyles || []).map((s) => ({
      ...s,
      values: resolveColors(s.values, colors),
    })),
  };
}
export function detachChangedColors(item, patch) {
  if (!item?.colorLinks || Object.hasOwn(patch, "colorLinks")) return patch;
  const links = { ...item.colorLinks };
  for (const path of Object.keys(links)) {
    const value = readPath(patch, path);
    if (value !== undefined && value !== readPath(item, path))
      delete links[path];
  }
  return { ...patch, colorLinks: links };
}
export function deleteProjectColor(document, id) {
  const colors = document.projectColors || [];
  const detach = (item) => {
    const next = resolveColors(item, colors);
    if (!next.colorLinks) return next;
    return {
      ...next,
      colorLinks: Object.fromEntries(
        Object.entries(next.colorLinks).filter(([, v]) => v !== id),
      ),
    };
  };
  return {
    ...document,
    projectColors: colors.filter((c) => c.id !== id),
    projectStyles: (document.projectStyles || []).map((s) => ({
      ...s,
      values: detach(s.values),
    })),
    pages: document.pages.map((p) => ({
      ...p,
      layers: p.layers.map(detach),
      buttons: p.buttons.map(detach),
    })),
    ...(document.components
      ? {
          components: document.components.map((c) => ({
            ...c,
            layers: c.layers.map(detach),
          })),
        }
      : {}),
  };
}
export function validateProjectColors(d) {
  const fail = () => {
    throw Error(
      "Palette ou référence de couleur invalide. Le projet actuel est conservé.",
    );
  };
  const colors = d.projectColors || [];
  if (!Array.isArray(colors) || colors.length > 500) fail();
  const ids = new Set();
  for (const c of colors) {
    if (
      !c ||
      typeof c.id !== "string" ||
      !c.id ||
      ids.has(c.id) ||
      typeof c.name !== "string" ||
      !c.name.trim() ||
      c.name.length > 80 ||
      !colorPattern.test(c.value) ||
      typeof c.favorite !== "boolean"
    )
      fail();
    ids.add(c.id);
  }
  if (
    d.recentColors !== undefined &&
    (!Array.isArray(d.recentColors) ||
      d.recentColors.length > 16 ||
      d.recentColors.some((c) => !colorPattern.test(c)))
  )
    fail();
  const check = (item, paths) => {
    if (item.colorLinks === undefined) return;
    if (
      !item.colorLinks ||
      typeof item.colorLinks !== "object" ||
      Array.isArray(item.colorLinks) ||
      Object.entries(item.colorLinks).some(
        ([p, id]) =>
          !paths.includes(p) ||
          !ids.has(id) ||
          !colorPattern.test(readPath(item, p)),
      )
    )
      fail();
  };
  for (const p of d.pages)
    for (const i of [...(p.layers || []), ...(p.buttons || [])])
      check(i, colorPaths);
  for (const c of d.components || [])
    for (const i of c.layers) check(i, colorPaths);
  for (const s of d.projectStyles || []) check(s.values, styleColorPaths);
}
export function canonicalColorLinks(item) {
  const map = {
    color: item.type === "text" ? "typography.color" : "fill.color",
    "appearance.background": "fill.color",
    "appearance.border": "border.color",
    "labelText.color": "typography.color",
    "border.color": "border.color",
    "stroke.color": "stroke.color",
    "objectEffects.shadow.color": "effects.shadow.color",
    ...Object.fromEntries(
      ["hover", "click", "active"].map((k) => [
        `interactiveEffects.${k}.color`,
        `interaction.${k}.color`,
      ]),
    ),
  };
  return Object.fromEntries(
    Object.entries(item.colorLinks || {})
      .filter(([k]) => map[k])
      .map(([k, id]) => [map[k], id]),
  );
}
// Called by the editor's existing mutation path, including direct HEX entry.
// History and persistence stay in the same transaction as the color change.
export function recentColorsPatch(item, patch, document) {
  const changed = colorPaths
    .map((path) => [readPath(item, path), readPath(patch, path)])
    .filter(([old, value]) => colorPattern.test(value) && old !== value)
    .map(([, value]) => value.toLowerCase());
  if (!changed.length) return {};
  return {
    recentColors: [
      ...new Set([...changed.reverse(), ...(document.recentColors || [])]),
    ].slice(0, 16),
  };
}
