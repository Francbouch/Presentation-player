import { orderedLayers } from "./document.js";
export const VIDEO_LAYER_OPTIONS = [
  ["page", "Rester visible pendant les transitions vidéo entre pages"],
  ["action", "Rester visible pendant les vidéos déclenchées par boutons"],
];
export function videoLayerFlags(page, id) {
  const layer = [...(page.layers || []), ...(page.buttons || [])].find(
      (l) => l.id === id,
    ),
    groups = (page.visualGroups || []).filter((g) => g.children.includes(id));
  return Object.fromEntries(
    VIDEO_LAYER_OPTIONS.map(([key]) => [
      key,
      !!layer?.videoVisibility?.[key] ||
        groups.some((g) => g.videoVisibility?.[key] === true),
    ]),
  );
}
export function captureVideoLayers(page, interaction, kind) {
  const layers = orderedLayers(page).filter(
    (layer) =>
      !layer.folderHidden &&
      (interaction.visibility?.[layer.id] ?? layer.visible) &&
      videoLayerFlags(page, layer.id)[kind],
  );
  return {
    pageId: page.id,
    layers,
    activeButtonId: interaction.activeButtonId,
    selectedGroups: { ...interaction.selectedGroups },
    effectSelectedIds: { ...interaction.effectSelectedIds },
  };
}
export function validateVideoLayers(document) {
  for (const page of document.pages)
    for (const item of [
      ...(page.layers || []),
      ...(page.buttons || []),
      ...(page.visualGroups || []),
    ]) {
      const value = item.videoVisibility;
      if (
        value !== undefined &&
        (!value ||
          typeof value !== "object" ||
          Array.isArray(value) ||
          VIDEO_LAYER_OPTIONS.some(
            ([key]) =>
              value[key] !== undefined && typeof value[key] !== "boolean",
          ))
      )
        throw new Error(
          "La visibilité des calques pendant les vidéos est invalide. Votre projet est conservé.",
        );
    }
}
