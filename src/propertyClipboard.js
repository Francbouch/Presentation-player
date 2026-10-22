import { appearanceValues, appearancePatch } from "./projectStyles.js";
export function copyAppearance(item) {
  return {
    values: appearanceValues(item),
    opacity: item.opacity ?? 1,
    width: item.width,
    height: item.height,
    styleId: item.styleLink?.id || null,
  };
}
export function pasteAppearance(item, clipboard, category = "all") {
  if (!clipboard || item.locked) return {};
  if (category === "dimensions")
    return {
      width: Math.max(0.02, Math.min(clipboard.width, 1 - item.x)),
      height: Math.max(0.02, Math.min(clipboard.height, 1 - item.y)),
      ...(item.type === "text"
        ? { textStyle: { ...item.textStyle, autoHeight: false } }
        : {}),
    };
  if (category === "linked")
    return clipboard.styleId
      ? { styleLink: { id: clipboard.styleId, overrides: [] } }
      : {};
  return {
    ...appearancePatch(item, clipboard.values, category),
    ...(category === "all" ? { opacity: clipboard.opacity } : {}),
  };
}
