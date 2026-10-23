// Independent runtime overrides, never written back to layer.visible.
export function initialGroupVisibility(page, stateId) {
  const state = page.states.find((s) => s.id === stateId);
  return Object.fromEntries(
    (page.visibilityGroups || []).map((g) => [
      g.id,
      state?.groupVisibility?.[g.id] ?? g.initialVisible,
    ]),
  );
}
export function effectiveVisibility(
  page,
  visibility = {},
  groups = initialGroupVisibility(page, page.initialStateId),
  animated = {},
) {
  const next = { ...visibility };
  for (const g of page.visibilityGroups || [])
    for (const id of g.layerIds) next[id] = groups[g.id] ?? g.initialVisible;
  return { ...next, ...animated };
}
export function applyGroupOperations(page, current, operations) {
  const ids = new Set((page.visibilityGroups || []).map((g) => g.id));
  if (!operations?.length || operations.some((o) => !ids.has(o.groupId)))
    throw Error(
      "Un groupe cible est absent. Choisissez des groupes existants dans les propriétés du bouton.",
    );
  const next = { ...current };
  for (const o of operations) {
    const g = page.visibilityGroups.find((g) => g.id === o.groupId),
      shown = next[o.groupId] ?? g.initialVisible;
    next[o.groupId] =
      o.mode === "show" ? true : o.mode === "hide" ? false : !shown;
  }
  return next;
}
export function cleanVisibilityGroups(page) {
  if (!page.visibilityGroups) return page;
  const ids = new Set(
    [...(page.layers || []), ...(page.buttons || [])].map((l) => l.id),
  );
  return {
    ...page,
    visibilityGroups: page.visibilityGroups.map((g) => ({
      ...g,
      layerIds: g.layerIds.filter((id) => ids.has(id)),
    })),
  };
}
export function validateVisibilityGroups(d) {
  const fail = () => {
    throw Error(
      "Configuration des groupes de visibilité invalide. Le projet actuel est conservé.",
    );
  };
  for (const p of d.pages) {
    const groups = p.visibilityGroups || [];
    if (!Array.isArray(groups) || groups.length > 200) fail();
    const ids = new Set(),
      members = new Set(),
      layers = new Set(
        [...(p.layers || []), ...(p.buttons || [])].map((l) => l.id),
      );
    for (const g of groups) {
      if (
        !g ||
        typeof g.id !== "string" ||
        !g.id ||
        ids.has(g.id) ||
        typeof g.name !== "string" ||
        !g.name.trim() ||
        g.name.length > 80 ||
        typeof g.initialVisible !== "boolean" ||
        !Array.isArray(g.layerIds) ||
        g.layerIds.some((id) => !layers.has(id) || members.has(id))
      )
        fail();
      ids.add(g.id);
      for (const id of g.layerIds) {
        if (members.has(id)) fail();
        members.add(id);
      }
    }
    for (const s of p.states || [])
      if (
        s.groupVisibility !== undefined &&
        (!s.groupVisibility ||
          typeof s.groupVisibility !== "object" ||
          Array.isArray(s.groupVisibility) ||
          Object.entries(s.groupVisibility).some(
            ([id, v]) => !ids.has(id) || typeof v !== "boolean",
          ))
      )
        fail();
    for (const b of p.buttons || [])
      if (
        b.action?.type === "visibilityGroups" &&
        (!Array.isArray(b.action.operations) ||
          b.action.operations.length > 200 ||
          b.action.operations.some(
            (o) =>
              !o ||
              typeof o.groupId !== "string" ||
              !o.groupId ||
              !["show", "hide", "toggle"].includes(o.mode),
          ))
      )
        fail();
  }
}
