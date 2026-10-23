export const namedTextLayer = (item) =>
  item.type === "text" ||
  item.type === "button" ||
  (!item.type && Object.hasOwn(item, "target"));
export function automaticLayerName(item) {
  const fallback = item.type === "text" ? "Texte" : "Bouton";
  const raw =
    item.type === "text"
      ? item.content
      : (item.labelText?.content ?? (item.imageId ? "" : item.name));
  const tokens = String(raw ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/^\s*[•●◦▪]\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  const parts = [];
  let words = 0;
  for (const token of tokens) {
    if (/[\p{L}\p{N}]/u.test(token)) {
      if (words === 5) break;
      words++;
    }
    parts.push(token);
  }
  return parts.join(" ").slice(0, 80) || fallback;
}
export function normalizeLayerName(item) {
  return item.nameMode === "auto"
    ? { ...item, name: automaticLayerName(item) }
    : item;
}
export function namingPatch(item, patch) {
  if (!item || !namedTextLayer(item)) return patch;
  return Object.hasOwn(patch, "name") && patch.nameMode !== "auto"
    ? { ...patch, nameMode: "manual" }
    : patch;
}
export function copiedLayerName(item) {
  return namedTextLayer(item) ? item.name : `${item.name.slice(0, 70)} (copie)`;
}
