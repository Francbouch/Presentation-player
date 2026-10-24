import { orderedLayers } from "./document.js";
import {
  applyGroupOperations,
  effectiveVisibility,
  initialGroupVisibility,
} from "./visibilityGroups.js";
export function extraEndProblem(page, action) {
  if (action.type !== "layerVideo") return "";
  if (!["restart", "resume"].includes(action.command))
    return "Pause et Arrêter ne constituent pas une fin naturelle de lecture.";
  if (!action.layerIds.length) return "Choisissez au moins une vidéo.";
  if (
    action.layerIds.some(
      (id) => page.layers.find((l) => l.id === id)?.frameMedia?.playback?.loop,
    )
  )
    return "Désactivez la boucle pour attendre la fin naturelle de toutes les vidéos.";
  return "";
}
export function extraProblem(page, extra) {
  if (!extra) return "";
  const ids = new Set(orderedLayers(page).map((l) => l.id));
  if (
    extra.type === "visibility" &&
    (!extra.layerIds.length || extra.layerIds.some((id) => !ids.has(id)))
  )
    return "Un calque cible est absent ou aucune cible n’est choisie. Reconfigurez l’action supplémentaire.";
  if (
    extra.type === "visibilityGroups" &&
    (!extra.operations.length ||
      extra.operations.some(
        (o) => !page.visibilityGroups?.some((g) => g.id === o.groupId),
      ))
  )
    return "Un groupe de visibilité cible est absent ou aucune cible n’est choisie.";
  if (
    extra.type === "visualGroups" &&
    (!extra.operations.length ||
      extra.operations.some(
        (o) => !page.visualGroups?.some((g) => g.id === o.groupId),
      ))
  )
    return "Un groupe de calques cible est absent ou aucune cible n’est choisie.";
  if (
    extra.type === "background" &&
    (!extra.target ||
      (extra.target.kind === "variant" &&
        !page.variants.some((v) => v.id === extra.target.variantId)))
  )
    return "L’arrière-plan supplémentaire est absent. Choisissez une nouvelle image.";
  return "";
}
// Same runtime patch for ordinary visibility commands and optional video commands.
// Group precedence and hidden parent folders remain handled by the existing renderer.
export function runtimeVisibility(page, base, action) {
  const groups =
    base.groupVisibility ?? initialGroupVisibility(page, base.stateId);
  if (action.type === "visibilityGroups")
    return {
      ...base,
      groupVisibility: applyGroupOperations(page, groups, action.operations),
    };
  const layers = orderedLayers(page),
    visible = effectiveVisibility(page, base.visibility, groups);
  const operations =
    action.type === "visualGroups"
      ? action.operations.flatMap((o) =>
          (
            page.visualGroups?.find((g) => g.id === o.groupId)?.children || []
          ).map((id) => ({ id, mode: o.mode })),
        )
      : action.layerIds.map((id) => ({
          id,
          mode:
            action.mode === "custom"
              ? action.targetModes?.[id] || "toggle"
              : action.mode,
        }));
  const visibility = { ...base.visibility };
  for (const { id, mode } of operations) {
    const layer = layers.find((l) => l.id === id);
    if (!layer) continue;
    const shown = visible[id] ?? layer.visible ?? true;
    visibility[id] = mode === "show" ? true : mode === "hide" ? false : !shown;
  }
  return { ...base, visibility };
}
export function validateExtra(action, background, fail) {
  const e = action.extra;
  if (e === undefined || e === null) return;
  if (
    !e ||
    typeof e !== "object" ||
    Array.isArray(e) ||
    !["video", "layerVideo"].includes(action.type) ||
    !["click", "ended"].includes(e.when) ||
    !["visibility", "visibilityGroups", "visualGroups", "background"].includes(
      e.type,
    )
  )
    fail();
  const modes = ["show", "hide", "toggle"];
  if (e.type === "background") {
    if (action.type !== "layerVideo" || !background(e.target)) fail();
  } else if (e.type === "visibility") {
    if (
      !Array.isArray(e.layerIds) ||
      e.layerIds.length > 2000 ||
      new Set(e.layerIds).size !== e.layerIds.length ||
      e.layerIds.some((id) => typeof id !== "string" || !id) ||
      !["custom", ...modes].includes(e.mode) ||
      (e.targetModes !== undefined &&
        (!e.targetModes ||
          typeof e.targetModes !== "object" ||
          Array.isArray(e.targetModes) ||
          Object.entries(e.targetModes).some(
            ([id, m]) => !e.layerIds.includes(id) || !modes.includes(m),
          )))
    )
      fail();
  } else if (
    !Array.isArray(e.operations) ||
    e.operations.length > 200 ||
    e.operations.some(
      (o) =>
        !o ||
        typeof o.groupId !== "string" ||
        !o.groupId ||
        !modes.includes(o.mode),
    )
  )
    fail();
}
export function remapExtra(
  extra,
  layers = new Map(),
  groups = new Map(),
  visibilityGroups = new Map(),
  target = (t) => t,
) {
  if (!extra) return extra;
  return {
    ...extra,
    ...(extra.target ? { target: target(extra.target) } : {}),
    ...(extra.layerIds
      ? { layerIds: extra.layerIds.map((id) => layers.get(id) || id) }
      : {}),
    ...(extra.targetModes
      ? {
          targetModes: Object.fromEntries(
            Object.entries(extra.targetModes).map(([id, mode]) => [
              layers.get(id) || id,
              mode,
            ]),
          ),
        }
      : {}),
    ...(extra.operations
      ? {
          operations: extra.operations.map((o) => ({
            ...o,
            groupId:
              (extra.type === "visualGroups" ? groups : visibilityGroups).get(
                o.groupId,
              ) || o.groupId,
          })),
        }
      : {}),
  };
}
