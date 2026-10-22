// A read-only projection of the document. New node kinds (animation/endAnimation)
// can be added by future producers without storing a second action configuration.
export const graphKinds = {
  page: "Diapositive",
  state: "État",
  button: "Bouton",
  video: "Vidéo",
  action: "Action",
  destination: "Destination",
  layer: "Calque",
  animation: "Animation",
  endAnimation: "Fin d’animation",
};
const names = {
  background: "Changer le fond",
  state: "Changer d’état",
  video: "Jouer une vidéo",
  navigate: "Naviguer",
  visibility: "Visibilité des calques",
  layerVideo: "Contrôler les vidéos",
};
export function buildInteractionGraph(document) {
  const nodes = [],
    edges = [],
    seen = new Set(),
    media = new Map(document.media.map((m) => [m.id, m])),
    pages = new Map(document.pages.map((p) => [p.id, p]));
  const key = (...parts) => JSON.stringify(parts);
  function add(
    id,
    kind,
    label,
    pageId,
    location = {},
    warning = "",
    category = "all",
  ) {
    if (!seen.has(id)) {
      seen.add(id);
      nodes.push({
        id,
        kind,
        label,
        pageId,
        location: { pageId, ...location },
        warning,
        category,
      });
    }
    return id;
  }
  function edge(from, to, label = "", category = "all") {
    edges.push({
      id: key(from, to, label, category),
      from,
      to,
      label,
      category,
    });
  }
  const pageNode = (p) => add(key("page", p.id), "page", p.title, p.id);
  function destination(
    page,
    id,
    from,
    category,
    location = {},
    missingLabel = "Destination introuvable",
  ) {
    const p = pages.get(id),
      to = p
        ? pageNode(p)
        : add(
            key("missingPage", from),
            "destination",
            missingLabel,
            page.id,
            location,
            "La diapositive cible est absente.",
            category,
          );
    edge(from, to, "Destination", category);
    return to;
  }
  function background(page, target, from, category, location) {
    let id,
      name,
      valid = true;
    if (target?.kind === "variant") {
      const v = page.variants.find((v) => v.id === target.variantId);
      id = v?.imageId;
      name = v?.name || "Variante absente";
      valid = !!v;
    } else if (target?.kind === "media") {
      id = target.mediaId;
      name = media.get(id)?.name || "Image absente";
    } else {
      id = page.imageId;
      name =
        target?.kind === "initial" ? "Affichage initial" : "Image principale";
    }
    const item = media.get(id);
    const node = add(
      key("background", page.id, from),
      "destination",
      name,
      page.id,
      location,
      !valid || !item ? "L’image de fond est absente." : "",
      category,
    );
    edge(from, node, "Fond", category);
  }
  function state(page, id, from, category, location = {}) {
    const s = page.states.find((s) => s.id === id);
    const node = s
      ? key("state", page.id, id)
      : add(
          key("missingState", from),
          "state",
          "État absent ou non choisi",
          page.id,
          location,
          "L’état cible est introuvable.",
          category,
        );
    edge(from, node, "État cible", category);
  }
  function video(page, id, from, category, location, label = "Lecture") {
    const m = media.get(id),
      to = add(
        key("video", page.id, from, id),
        "video",
        m?.name || "Vidéo absente",
        page.id,
        location,
        !m || !m.type.startsWith("video/")
          ? "La vidéo est absente ou invalide."
          : "",
        category,
      );
    edge(from, to, label, category);
    return to;
  }
  for (const p of document.pages) {
    pageNode(p);
    for (const s of p.states || [])
      add(
        key("state", p.id, s.id),
        "state",
        s.name,
        p.id,
        { stateId: s.id },
        "",
        "state",
      );
    for (const b of p.buttons)
      add(
        key("button", p.id, b.id),
        "button",
        b.name,
        p.id,
        { layerId: b.id },
        "",
        "all",
      );
  }
  for (const p of document.pages) {
    const root = pageNode(p),
      layers = [...p.layers, ...p.buttons];
    for (const s of p.states || []) {
      const source = key("state", p.id, s.id);
      edge(
        root,
        source,
        p.initialStateId === s.id ? "État initial" : "État",
        "state",
      );
      if (s.background)
        background(p, s.background, source, "state", { stateId: s.id });
      for (const [id, visible] of Object.entries(s.visibility || {})) {
        const layer = layers.find((l) => l.id === id);
        const target =
          layer?.type === "button" || p.buttons.some((b) => b.id === id)
            ? key("button", p.id, id)
            : add(
                key("layer", p.id, id),
                "layer",
                layer?.name || "Calque absent",
                p.id,
                { layerId: id },
                layer ? "" : "Le calque est introuvable.",
                "visibility",
              );
        edge(source, target, visible ? "Afficher" : "Masquer", "visibility");
      }
    }
    for (const b of p.buttons) {
      const source = key("button", p.id, b.id),
        location = { layerId: b.id };
      edge(root, source, "Bouton");
      const a =
        b.action === undefined && b.target
          ? { type: "background", target: b.target }
          : b.action;
      if (!a) continue;
      const action = add(
        key("action", p.id, b.id),
        "action",
        names[a.type] || "Action inconnue",
        p.id,
        location,
        names[a.type] ? "" : "Type d’action non reconnu.",
        a.type,
      );
      edge(source, action, "Action", a.type);
      if (a.type === "state") state(p, a.stateId, action, "state", location);
      if (a.type === "background")
        background(p, a.target, action, "background", location);
      if (a.type === "navigate") {
        let from = action;
        if (a.transitionId)
          from = video(
            p,
            a.transitionId,
            action,
            "navigate",
            location,
            "Transition",
          );
        destination(p, a.pageId || a.missingPageId, from, "navigate", location);
      }
      if (a.type === "video") {
        const from = video(p, a.videoId, action, "video", location);
        if (a.end === "state")
          state(
            p,
            a.finalStateId || a.missingFinalStateId,
            from,
            "video",
            location,
          );
        else if (a.end === "image")
          background(p, a.finalBackground, from, "video", location);
        else if (a.end === "page")
          destination(p, a.pageId || a.missingPageId, from, "video", location);
        else {
          const to = add(
            key("return", p.id, b.id),
            "destination",
            "Revenir à l’affichage précédent",
            p.id,
            location,
            "",
            "video",
          );
          edge(from, to, "À la fin", "video");
        }
      }
      if (["visibility", "layerVideo"].includes(a.type)) {
        if (!a.layerIds?.length) {
          const missing = add(
            key("empty", p.id, b.id),
            "destination",
            "Aucun calque choisi",
            p.id,
            location,
            "Choisissez au moins un calque cible.",
            a.type,
          );
          edge(action, missing, "Cible absente", a.type);
        }
        for (const id of a.layerIds || []) {
          const l = layers.find((l) => l.id === id),
            isVideo = a.type === "layerVideo",
            target = add(
              key(isVideo ? "frame" : "layer", p.id, id),
              isVideo ? "video" : "layer",
              l?.name || "Calque absent",
              p.id,
              { layerId: l?.id || b.id },
              !l
                ? "Le calque cible est introuvable."
                : isVideo && !media.has(l.frameMedia?.mediaId)
                  ? "Le média vidéo est absent."
                  : "",
              a.type,
            );
          edge(
            action,
            target,
            isVideo
              ? {
                  restart: "Lire depuis le début",
                  resume: "Reprendre",
                  pause: "Pause",
                  stop: "Arrêter",
                }[a.command] || a.command
              : {
                  show: "Afficher",
                  hide: "Masquer",
                  toggle: "Inverser",
                  custom: "Visibilité personnalisée",
                }[a.targetModes?.[id] || a.mode],
            a.type,
          );
        }
      }
    }
  }
  for (const t of document.transitions || []) {
    if (!t.fromId || !t.toId) continue;
    const p = pages.get(t.fromId);
    if (!p) continue;
    const index = document.pages.indexOf(p),
      valid = document.pages[index + 1]?.id === t.toId;
    const from = pageNode(p),
      action = add(
        key("transition", t.id),
        "action",
        t.mode === "video"
          ? "Transition vidéo"
          : t.mode === "visual"
            ? "Transition visuelle"
            : "Passage direct",
        p.id,
        {},
        valid ? "" : "Passage détaché : ces pages ne sont plus voisines.",
        "navigate",
      );
    edge(from, action, "Suivante", "navigate");
    const next =
      t.mode === "video"
        ? video(p, t.mediaId, action, "navigate", {}, "Lecture")
        : action;
    destination(p, t.toId, next, "navigate");
  }
  return { nodes, edges };
}
export function filterInteractionGraph(graph, filter, pageId) {
  if (filter === "all") return graph;
  const allowed =
    filter === "video"
      ? ["video", "layerVideo"]
      : filter === "state"
        ? ["state"]
        : filter === "visibility"
          ? ["visibility"]
          : ["navigate"];
  let edges =
    filter === "current"
      ? graph.edges.filter(
          (e) => graph.nodes.find((n) => n.id === e.from)?.pageId === pageId,
        )
      : graph.edges.filter((e) => allowed.includes(e.category));
  const ids = new Set(edges.flatMap((e) => [e.from, e.to]));
  let nodes = graph.nodes.filter(
    (n) => ids.has(n.id) || (filter === "current" && n.pageId === pageId),
  );
  return { nodes, edges };
}
export function arrangeGraph(nodes) {
  const columns = {
    page: 0,
    state: 1,
    button: 2,
    action: 3,
    video: 4,
    destination: 5,
    layer: 5,
  };
  const rows = {};
  return Object.fromEntries(
    nodes.map((n) => {
      const col = columns[n.kind] ?? 6,
        index = rows[col] || 0;
      rows[col] = index + 1;
      return [n.id, { x: col * 260 + 40, y: index * 110 + 40 }];
    }),
  );
}
