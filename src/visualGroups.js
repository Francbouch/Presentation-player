import {isTimelineLayer} from "./milestoneTimeline.js";
import {remapExtra} from './videoExtra.js';
import {validateBackgroundEffect} from "./visualEffects.js";
import { boundsOf, alignItems } from "./editorGeometry.js";
import { validateButtonAppearance } from "./buttonAppearance.js";
import { validateButtonText } from "./buttonText.js";
import { validateTextStyles } from "./textModel.js";
import { validateImageLibrary } from "./imageLibrary.js";
import { validatePageLayers, orderedLayers, uid } from "./document.js";
import { pasteLayer } from "./layerClipboard.js";
export function patchLayers(page, patches) {
  return {
    ...page,
    layers: page.layers.map((l) =>
      patches[l.id] ? { ...l, ...patches[l.id] } : l,
    ),
    buttons: page.buttons.map((l) =>
      patches[l.id] ? { ...l, ...patches[l.id] } : l,
    ),
  };
}
export function cleanInstances(page) {
  if (!page.componentInstances) return page;
  const ids = new Set(orderedLayers(page).map((l) => l.id));
  return {
    ...page,
    componentInstances: page.componentInstances
      .map((i) => {
        const members = Object.fromEntries(
          Object.entries(i.members).filter(([, id]) => ids.has(id)),
        );
        return {
          ...i,
          members,
          overrides: Object.fromEntries(
            Object.entries(i.overrides).filter(([key]) =>
              Object.hasOwn(members, key),
            ),
          ),
        };
      })
      .filter((i) => Object.keys(i.members).length),
  };
}
export function cleanGroups(page) {
  const ids = new Set(orderedLayers(page).map((l) => l.id));
  return {
    ...page,
    visualGroups: (page.visualGroups || [])
      .map((g) => ({ ...g, children: g.children.filter((id) => ids.has(id)) }))
      .filter((g) => g.children.length),
  };
}
export function copySelection(page, ids, document, target = page) {
  const layers = orderedLayers(page).filter((l) => ids.includes(l.id)),
    map = new Map(layers.map((l) => [l.id, uid()]));
  const destination = {
    ...target,
    layers: [
      ...target.layers,
      ...layers.map((l) => ({ ...l, id: map.get(l.id) })),
    ],
  };
  // Le presse-papiers contient un instantané : comparer les identifiants, pas les objets.
  // Entre diapositives, conserver les coordonnées logiques exactes, même près des bords.
  const samePage = page.id === target.id;
  const limited=layers.filter(l=>!isTimelineLayer(l));
  const dx = samePage && !limited.length ? .03 : samePage ? Math.min(0.03, 1 - Math.max(...limited.map((l) => l.x + l.width))) : 0,
    dy = samePage && !limited.length ? .03 : samePage ? Math.min(0.03, 1 - Math.max(...limited.map((l) => l.y + l.height))) : 0;
  const groupMap=new Map((page.visualGroups||[]).filter(g=>g.children.every(id=>map.has(id))).map(g=>[g.id,uid()]));
  const copies = layers.map((l) => {
    const copy = pasteLayer({ layer: l, source: page }, destination, document);
    const own = copy.id;
    copy.id = map.get(l.id);
    copy.x = isTimelineLayer(l)?Math.max(-20,Math.min(20,l.x+dx)):l.x+dx;
    copy.y = isTimelineLayer(l)?Math.max(-20,Math.min(20,l.y+dy)):l.y+dy;
    if (copy.action?.layerIds) {
      copy.action.layerIds = l.action.layerIds
        .map((id) => map.get(id) || id)
        .filter((id) => orderedLayers(destination).some((l) => l.id === id));
      if (l.action.targetModes)
        copy.action.targetModes = Object.fromEntries(
          Object.entries(l.action.targetModes)
            .map(([id, v]) => [map.get(id) || id, v])
            .filter(([id]) => copy.action.layerIds.includes(id)),
        );
    }
    if (copy.action?.layerIds?.includes(own))
      copy.action.layerIds = copy.action.layerIds.map((id) =>
        id === own ? copy.id : id,
      );
    if(l.action?.extra)copy.action.extra=remapExtra(copy.action.extra,map,groupMap);
    return copy;
  });
  return {
    layers: copies,
    groups: (page.visualGroups || [])
      .filter((g) => g.children.every((id) => map.has(id)))
      .map((g) => ({
        ...g,
        id: groupMap.get(g.id),
        name: `${g.name} (copie)`,
        children: g.children.map((id) => map.get(id)),
      })),
    visibility: Object.fromEntries(
      target.states.map((state) => [
        state.id,
        Object.fromEntries(
          [...map]
            .filter(([id]) =>
              Object.hasOwn(
                page.states.find((s) => s.id === state.id)?.visibility || {},
                id,
              ),
            )
            .map(([id, newId]) => [
              newId,
              page.states.find((s) => s.id === state.id).visibility[id],
            ]),
        ),
      ]),
    ),
    instances: (page.componentInstances || [])
      .filter((i) => Object.values(i.members).every((id) => map.has(id)))
      .map((i) => ({
        ...i,
        id: uid(),
        members: Object.fromEntries(
          Object.entries(i.members).map(([key, id]) => [key, map.get(id)]),
        ),
      })),
    ids: copies.map((l) => l.id),
  };
}
export function validateOrganization(document) {
  const masters = document.components || [];
  if (!Array.isArray(masters) || masters.length > 500)
    throw Error("Bibliothèque de composants invalide.");
  const masterIds = new Set();
  for (const m of masters) {
    if (
      !m ||
      typeof m.id !== "string" ||
      masterIds.has(m.id) ||
      typeof m.name !== "string" ||
      !Array.isArray(m.layers) ||
      !m.layers.length ||
      m.layers.length > 500
    )
      throw Error("Composant invalide.");
    if (
      m.name.length > 80 ||
      !m.bounds ||
      !["x", "y", "width", "height"].every((k) =>
        Number.isFinite(m.bounds[k]),
      ) ||
      m.bounds.width <= 0 ||
      m.bounds.height <= 0
    )
      throw Error("Dimensions du maître invalides.");
    const model = {
      id: m.id,
      buttons: m.layers.filter((l) => l.type === "button"),
      layers: m.layers.filter((l) => l.type !== "button"),
      layerOrder: m.layers.map((l) => l.id),
      variants: [],
      states: [],
    };
    const doc = { ...document, pages: [model] };
    validatePageLayers(
      model,
      (id) =>
        !id ||
        document.media.some((m) => m.id === id && m.type.startsWith("image/")),
    );
    validateButtonAppearance(doc);
    validateButtonText(doc);
    validateTextStyles([model]);
    validateImageLibrary(doc);
    masterIds.add(m.id);
    for(const layer of m.layers)validateBackgroundEffect(layer.backgroundEffect);
    const ids = new Set();
    for (const l of m.layers) {
      if (
        ids.has(l.id) ||
        typeof l.id !== "string" ||
        !["x", "y", "width", "height"].every((k) => Number.isFinite(l[k])) ||
        l.width <= 0 ||
        l.height <= 0
      )
        throw Error("Géométrie du composant invalide.");
      ids.add(l.id);
      if (
        l.imageId &&
        !document.media.some(
          (m) => m.id === l.imageId && m.type.startsWith("image/"),
        )
      )
        throw Error("Image du composant absente.");
    }
  }
  for (const p of document.pages) {
    const ids = new Set(orderedLayers(p).map((l) => l.id)),
      members = new Set(),
      groups = p.visualGroups || [];
    if (!Array.isArray(groups)) throw Error("Groupes invalides.");
    const groupIds = new Set();
    for (const g of groups) {
      if (
        !g ||
        typeof g.id !== "string" ||
        groupIds.has(g.id) ||
        typeof g.name !== "string" ||
        !Array.isArray(g.children) ||
        !g.children.length
      )
        throw Error("Groupe invalide.");
      groupIds.add(g.id);
      for (const id of g.children) {
        if (!ids.has(id) || members.has(id))
          throw Error("Référence de groupe invalide ou imbriquée.");
        members.add(id);
      }
    }
    const instances = p.componentInstances || [];
    if (!Array.isArray(instances)) throw Error("Instances invalides.");
    const linked = new Set(),
      instanceIds = new Set();
    for (const i of instances) {
      const master = masters.find((m) => m.id === i.componentId);
      if (
        !master ||
        typeof i.id !== "string" ||
        instanceIds.has(i.id) ||
        !i.members ||
        Array.isArray(i.members) ||
        !Object.keys(i.members).length ||
        typeof i.members !== "object" ||
        !i.overrides ||
        Array.isArray(i.overrides) ||
        typeof i.overrides !== "object"
      )
        throw Error("Instance de composant invalide.");
      instanceIds.add(i.id);
      for (const [key, fields] of Object.entries(i.overrides)) {
        if (
          !Object.hasOwn(i.members, key) ||
          !Array.isArray(fields) ||
          fields.some(
            (p) =>
              typeof p !== "string" ||
              p
                .split(".")
                .some((k) =>
                  ["__proto__", "constructor", "prototype"].includes(k),
                ),
          )
        )
          throw Error("Personnalisations du composant invalides.");
      }
      for (const [key, id] of Object.entries(i.members)) {
        if (
          !master.layers.some((l) => l.id === key) ||
          !ids.has(id) ||
          linked.has(id)
        )
          throw Error("Référence d’instance invalide.");
        linked.add(id);
      }
    }
  }
}

// Un groupe sélectionné est une unité d’alignement. Son contenu reste relatif.
export function alignmentUnits(items, groups, editingGroup) {
  const consumed = new Set(),
    units = [];
  for (const group of groups) {
    if (
      group.id === editingGroup ||
      !group.children.every((id) => items.some((l) => l.id === id))
    )
      continue;
    const members = items.filter((l) => group.children.includes(l.id));
    for (const l of members) consumed.add(l.id);
    units.push({ ...boundsOf(members), id: group.id, members: group.children });
  }
  return [...units, ...items.filter((l) => !consumed.has(l.id))];
}
export function alignSelection(
  items,
  groups,
  command,
  reference,
  editingGroup,
  spacing,
) {
  const units = alignmentUnits(items, groups, editingGroup),
    aligned = alignItems(units, command, reference, spacing),
    patches = {};
  for (const unit of units) {
    const patch = aligned[unit.id];
    if (!patch) continue;
    if (!unit.members) {
      patches[unit.id] = patch;
      continue;
    }
    for (const id of unit.members) {
      const layer = items.find((l) => l.id === id);
      patches[id] = {
        ...("x" in patch ? { x: layer.x + patch.x - unit.x } : {}),
        ...("y" in patch ? { y: layer.y + patch.y - unit.y } : {}),
      };
    }
  }
  return patches;
}
