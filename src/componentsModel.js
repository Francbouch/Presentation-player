import { orderedLayers, uid } from "./document.js";
import { boundsOf } from "./editorGeometry.js";
import { pasteLayer } from "./layerClipboard.js";
import { patchLayers, cleanGroups } from "./visualGroups.js";
const local = new Set([
  "id",
  "name",
  "type",
  "action",
  "target",
  "visible",
  "locked",
  "futureStateVisibility",
  "selectionGroup",
  "defaultSelected",
  "x",
  "y",
  "width",
  "height",
  "rotation",
]);
const shared = new Set([
  "frameMedia",
  "border",
  "fillMode",
  "fillOpacity",
  "cornerRadius",
  "opacity",
  "color",
  "textStyle",
  "content",
  "labelText",
  "appearance",
  "backgroundEffect",
  "interactiveEffects",
  "indicator",
  "imageId",
  "imageCrop",
]);
const geometry = ["x", "y", "width", "height", "rotation"];
function paths(value, prefix = "") {
  if (value && typeof value === "object" && !Array.isArray(value))
    return Object.entries(value).flatMap(([k, v]) =>
      paths(v, prefix ? `${prefix}.${k}` : k),
    );
  return [[prefix, value]];
}
function get(object, path) {
  return path.split(".").reduce((v, k) => v?.[k], object);
}
function inheritedPatch(template, item, overrides = []) {
  const patch = {};
  for (const key of new Set([...Object.keys(item), ...Object.keys(template)])) {
    if (!shared.has(key)) continue;
    patch[key] =
      template[key] === undefined ? undefined : structuredClone(template[key]);
    if(template[key]===undefined&&overrides.some(path=>path.startsWith(key+".")))patch[key]=structuredClone(item[key]);
    for (const path of overrides.filter(
      (p) => p === key || p.startsWith(key + "."),
    )) {
      if (path === key) patch[key] = structuredClone(item[key]);
      else put(patch, path, get(item, path));
    }
  }
  return patch;
}
function put(object, path, value) {
  const keys = path.split(".");
  if (keys.some((k) => ["__proto__", "constructor", "prototype"].includes(k)))
    throw Error("Propriété de composant invalide.");
  let cursor = object;
  for (const key of keys.slice(0, -1)) {
    cursor[key] = { ...(cursor[key] || {}) };
    cursor = cursor[key];
  }
  if (value === undefined) delete cursor[keys.at(-1)];
  else cursor[keys.at(-1)] = structuredClone(value);
}
export function markOverrides(page, id, patch, before, whole = false) {
  if (!page.componentInstances) return page;
  return {
    ...page,
    componentInstances: (page.componentInstances || []).map((i) => {
      const key = Object.keys(i.members).find((k) => i.members[k] === id);
      if (!key) return i;
      const existing = new Set(i.overrides[key] || []);
      for (const [path] of paths(patch))
        if (
          shared.has(path.split(".")[0]) &&
          (!before ||
            JSON.stringify(
              get(
                orderedLayers(before).find((l) => l.id === id),
                path,
              ),
            ) !== JSON.stringify(get(patch, path)))
        )
          existing.add(path);
      const oldItem = before && orderedLayers(before).find((l) => l.id === id);
      const changed = geometry.filter(
        (k) =>
          patch[k] !== undefined &&
          (!oldItem || Math.abs(patch[k] - (oldItem[k] || 0)) > 0.000001),
      );
      if (!whole && Object.keys(i.members).length > 1)
        for (const k of changed) existing.add(k);
      const sizeChanged = changed.some((k) => k === "width" || k === "height");
      return {
        ...i,
        ...(changed.length && (whole || Object.keys(i.members).length === 1)
          ? { sizeOverride: i.sizeOverride || sizeChanged }
          : {}),
        overrides: { ...i.overrides, [key]: [...existing] },
      };
    }),
  };
}
export function markBatchOverrides(page, patches, before) {
  let next = page;
  for (const [id, patch] of Object.entries(patches)) {
    const instance = page.componentInstances?.find((i) =>
      Object.values(i.members).includes(id),
    );
    const whole =
      instance &&
      Object.values(instance.members).every((id) => Object.hasOwn(patches, id));
    next = markOverrides(next, id, patch, before, whole);
  }
  return next;
}
export function createComponent(document, page, ids, name) {
  if ((document.components || []).length >= 500)
    throw Error("Limite de 500 composants atteinte.");
  if (
    (page.componentInstances || []).some((i) =>
      Object.values(i.members).some((id) => ids.includes(id)),
    )
  )
    throw Error(
      "Les composants imbriqués ne sont pas autorisés. Détachez d’abord cette instance.",
    );
  const items = orderedLayers(page).filter((l) => ids.includes(l.id));
  if (!items.length) throw Error("Sélectionnez un bouton ou un groupe.");
  const component = {
    id: uid(),
    name,
    sourcePageId: page.id,
    layers: structuredClone(items),
    bounds: boundsOf(items),
  };
  const instance = {
    id: uid(),
    componentId: component.id,
    members: Object.fromEntries(items.map((l) => [l.id, l.id])),
    overrides: {},
  };
  return {
    ...document,
    components: [...(document.components || []), component],
    pages: document.pages.map((p) =>
      p.id === page.id
        ? {
            ...p,
            componentInstances: [...(p.componentInstances || []), instance],
          }
        : p,
    ),
  };
}
export function insertComponent(document, component, page) {
  if (orderedLayers(page).length + component.layers.length > 500)
    throw Error("Limite de 500 calques par page atteinte.");
  const source = document.pages.find(
    (p) => p.id === component.sourcePageId,
  ) || {
    id: component.sourcePageId,
    states: [],
    variants: [],
    buttons: [],
    layers: [],
  };
  const map = new Map(component.layers.map((l) => [l.id, uid()])),
    members = {},
    layers = [],
    buttons = [];
  const dest = {
    ...page,
    layers: [
      ...page.layers,
      ...component.layers.map((l) => ({ ...l, id: map.get(l.id) })),
    ],
  };
  const dx = Math.min(
      0.03,
      1 - Math.max(...component.layers.map((l) => l.x + l.width)),
    ),
    dy = Math.min(
      0.03,
      1 - Math.max(...component.layers.map((l) => l.y + l.height)),
    );
  for (const item of component.layers) {
    const copy = pasteLayer({ layer: item, source }, dest, document, 1);
    copy.id = map.get(item.id);
    copy.x = item.x + dx;
    copy.y = item.y + dy;
    if (copy.action?.layerIds) {
      copy.action.layerIds = item.action.layerIds
        .map((id) => map.get(id) || id)
        .filter((id) => orderedLayers(dest).some((l) => l.id === id));
      if (item.action.targetModes)
        copy.action.targetModes = Object.fromEntries(
          Object.entries(item.action.targetModes)
            .map(([id, v]) => [map.get(id) || id, v])
            .filter(([id]) => copy.action.layerIds.includes(id)),
        );
    }
    members[item.id] = copy.id;
    (item.type === "button" ? buttons : layers).push(copy);
  }
  const ids = Object.values(members);
  return {
    ...page,
    layers: [...page.layers, ...layers],
    buttons: [...page.buttons, ...buttons],
    layerOrder: [...page.layerOrder, ...ids],
    visualGroups:
      ids.length > 1
        ? [
            ...(page.visualGroups || []),
            { id: uid(), name: component.name, children: ids },
          ]
        : page.visualGroups || [],
    componentInstances: [
      ...(page.componentInstances || []),
      { id: uid(), componentId: component.id, members, overrides: {} },
    ],
  };
}
export function resetInstance(page, instance, master) {
  let next = page;
  const patches = {};
  for (const template of master.layers) {
    const id = instance.members[template.id],
      item = orderedLayers(page).find((l) => l.id === id);
    if (!item) continue;
    const patch = inheritedPatch(template, item);
    patches[id] = patch;
  }
  next = patchLayers(next, patches);
  return {
    ...next,
    componentInstances: next.componentInstances.map((i) =>
      i.id === instance.id
        ? {
            ...i,
            overrides: Object.fromEntries(
              Object.entries(i.overrides).map(([key, fields]) => [
                key,
                fields.filter((field) => geometry.includes(field)),
              ]),
            ),
          }
        : i,
    ),
  };
}
export function publishComponent(
  document,
  page,
  instance,
  ids,
  removeMissing = false,
) {
  if (
    (page.componentInstances || []).some(
      (i) =>
        i.id !== instance.id &&
        Object.values(i.members).some((id) => ids.includes(id)),
    )
  )
    throw Error(
      "Détachez les autres instances avant de les ajouter au maître. Les composants imbriqués ne sont pas autorisés.",
    );
  const old = document.components.find((c) => c.id === instance.componentId);
  const reverse = new Map(
    Object.entries(instance.members).map(([key, id]) => [id, key]),
  );
  const selected = orderedLayers(page).filter((l) => ids.includes(l.id));
  const master = {
    ...old,
    layers: selected.map((l) => ({
      ...structuredClone(l),
      id: reverse.get(l.id) || uid(),
    })),
    bounds: boundsOf(selected),
  };
  const stableIds = new Map(
    selected.map((l, index) => [l.id, master.layers[index].id]),
  );
  master.layers = master.layers.map((l) =>
    l.action?.layerIds
      ? {
          ...l,
          action: {
            ...l.action,
            layerIds: l.action.layerIds.map((id) => stableIds.get(id) || id),
            ...(l.action.targetModes
              ? {
                  targetModes: Object.fromEntries(
                    Object.entries(l.action.targetModes).map(([id, v]) => [
                      stableIds.get(id) || id,
                      v,
                    ]),
                  ),
                }
              : {}),
          },
        }
      : l,
  );
  const sourceMembers = Object.fromEntries(
    selected.map((l, index) => [master.layers[index].id, l.id]),
  );
  return {
    ...document,
    components: document.components.map((c) =>
      c.id === master.id ? master : c,
    ),
    pages: document.pages.map((p) => {
      let next = p;
      for (const original of p.componentInstances || []) {
        if (original.componentId !== master.id) continue;
        if (removeMissing) {
          const retired = new Set(
            Object.entries(original.members)
              .filter(([key]) => !master.layers.some((l) => l.id === key))
              .map(([, id]) => id),
          );
          next = {
            ...next,
            layers: next.layers.filter((l) => !retired.has(l.id)),
            buttons: next.buttons.filter((l) => !retired.has(l.id)),
            layerOrder: next.layerOrder.filter((id) => !retired.has(id)),
          };
        }
        if (original.id === instance.id) {
          next = {
            ...next,
            componentInstances: next.componentInstances.map((i) =>
              i.id === original.id
                ? { ...i, members: sourceMembers, overrides: {} }
                : i,
            ),
          };
          continue;
        }
        const currentItems = orderedLayers(next).filter((l) =>
            Object.values(original.members).includes(l.id),
          ),
          frame = boundsOf(currentItems) || master.bounds;
        if (!original.sizeOverride) {
          frame.width *= master.bounds.width / old.bounds.width;
          frame.height *= master.bounds.height / old.bounds.height;
        }
        let members = { ...original.members },
          patches = {};
        const removed = Object.entries(members)
          .filter(([key]) => !master.layers.some((l) => l.id === key))
          .map(([, id]) => id);
        // Un élément retiré du maître devient indépendant : ses actions et médias restent intacts.
        for (const id of removed) {
          const key = Object.keys(members).find((k) => members[k] === id);
          delete members[key];
        }
        for (const template of master.layers) {
          let id = members[template.id],
            item = orderedLayers(next).find((l) => l.id === id);
          if (!item) {
            const inserted = insertComponent(
              { ...document, components: [master] },
              { ...master, layers: [template] },
              next,
            );
            item = orderedLayers(inserted).at(-1);
            id = item.id;
            members[template.id] = id;
            next = {
              ...next,
              layers: inserted.layers,
              buttons: inserted.buttons,
              layerOrder: inserted.layerOrder,
            };
          }
          const patch = inheritedPatch(
            template,
            item,
            original.overrides[template.id] || [],
          );
          const newB = master.bounds;
          {
            patch.x =
              frame.x + ((template.x - newB.x) / newB.width) * frame.width;
            patch.y =
              frame.y + ((template.y - newB.y) / newB.height) * frame.height;
            patch.width = (template.width / newB.width) * frame.width;
            patch.height = (template.height / newB.height) * frame.height;
            patch.rotation = template.rotation || 0;
            for (const key of geometry)
              if (original.overrides[template.id]?.includes(key))
                delete patch[key];
          }
          for (const key of ["width", "height"])
            if (patch[key] !== undefined)
              patch[key] = Math.max(0.02, Math.min(1, patch[key]));
          if (patch.x !== undefined)
            patch.x = Math.max(
              0,
              Math.min(1 - (patch.width || item.width), patch.x),
            );
          if (patch.y !== undefined)
            patch.y = Math.max(
              0,
              Math.min(1 - (patch.height || item.height), patch.y),
            );
          patches[id] = patch;
        }
        next = patchLayers(next, patches);
        next = {
          ...next,
          visualGroups: (next.visualGroups || []).map((g) =>
            Object.values(original.members).every((id) =>
              g.children.includes(id),
            )
              ? {
                  ...g,
                  children: [
                    ...g.children.filter(
                      (id) => !Object.values(original.members).includes(id),
                    ),
                    ...Object.values(members),
                  ],
                }
              : g,
          ),
          componentInstances: next.componentInstances.map((i) =>
            i.id === original.id
              ? {
                  ...i,
                  members,
                  overrides: Object.fromEntries(
                    Object.entries(i.overrides).filter(([key]) =>
                      Object.hasOwn(members, key),
                    ),
                  ),
                }
              : i,
          ),
        };
      }
      return cleanGroups(next);
    }),
  };
}
export function detachInstance(page, id) {
  return {
    ...page,
    componentInstances: (page.componentInstances || []).filter(
      (i) => i.id !== id,
    ),
  };
}
