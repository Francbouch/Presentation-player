export function folderAncestors(page, id) {
  const byId = new Map((page.layerFolders || []).map((f) => [f.id, f])),
    result = [],
    seen = new Set();
  let f = byId.get(id);
  while (f && !seen.has(f.id)) {
    seen.add(f.id);
    result.push(f);
    f = byId.get(f.parentId);
  }
  return result;
}
export function folderFlags(page, id) {
  const owner = (page.layerFolders || []).find((f) => f.children.includes(id)),
    chain = owner ? folderAncestors(page, owner.id) : [];
  return {
    folderLocked: chain.some((f) => f.locked),
    folderHidden: chain.some((f) => !f.visible),
  };
}
export function folderMembers(page, id) {
  const folders = page.layerFolders || [];
  return folders
    .filter((f) => folderAncestors(page, f.id).some((a) => a.id === id))
    .flatMap((f) => f.children);
}
export function validateFolders(page) {
  if (page.layerFolders === undefined) return;
  const fail = () => {
    throw Error("Hiérarchie des dossiers invalide. Votre projet est conservé.");
  };
  const folders = page.layerFolders;
  if (!Array.isArray(folders) || folders.length > 500) fail();
  const ids = new Set(),
    members = new Set(),
    layers = new Set(
      [...(page.layers || []), ...(page.buttons || [])].map((l) => l.id),
    );
  for (const f of folders) {
    if (
      !f ||
      typeof f.id !== "string" ||
      !f.id ||
      ids.has(f.id) ||
      typeof f.name !== "string" ||
      !f.name.trim() ||
      f.name.length > 80 ||
      !Array.isArray(f.children) ||
      ["locked", "visible", "collapsed"].some((k) => typeof f[k] !== "boolean")
    )
      fail();
    ids.add(f.id);
    for (const id of f.children) {
      if (!layers.has(id) || members.has(id)) fail();
      members.add(id);
    }
  }
  for (const f of folders) {
    if (f.parentId !== null && !ids.has(f.parentId)) fail();
    const chain = new Set([f.id]);
    let parent = f.parentId;
    while (parent !== null) {
      if (chain.has(parent)) fail();
      chain.add(parent);
      parent = folders.find((a) => a.id === parent).parentId;
    }
  }
}
export function cleanFolders(page) {
  if (!page.layerFolders) return page;
  const ids = new Set(
    [...(page.layers || []), ...(page.buttons || [])].map((l) => l.id),
  );
  return {
    ...page,
    layerFolders: page.layerFolders.map((f) => ({
      ...f,
      children: f.children.filter((id) => ids.has(id)),
    })),
  };
}
export function moveIntoFolder(page, layerIds, folderId) {
  if (folderId && folderAncestors(page, folderId).some((f) => f.locked))
    return page;
  const safe = layerIds.filter(
    (id) =>
      !folderFlags(page, id).folderLocked &&
      ![...page.layers, ...page.buttons].find((l) => l.id === id)?.locked,
  );
  return {
    ...page,
    layerFolders: (page.layerFolders || []).map((f) => ({
      ...f,
      children: [
        ...f.children.filter((id) => !safe.includes(id)),
        ...(f.id === folderId ? safe : []),
      ],
    })),
  };
}

// Les indicateurs hérités appartiennent à la vue, jamais aux modèles copiés.
export function storedLayer(item) {
  const next = { ...item, locked: item.ownLocked ?? item.locked };
  delete next.ownLocked;
  delete next.folderLocked;
  delete next.folderHidden;
  return next;
}
