export const paragraphs = (content) => content.split("\n");
export const hasBullet = (item, index) =>
  item.textList?.bullets?.includes(index) ?? false;
export function listSelection(content, start = 0, end = content.length) {
  const first = content.slice(0, start).split("\n").length - 1,
    last =
      content
        .slice(
          0,
          Math.max(
            start,
            end - (end > start && content[end - 1] === "\n" ? 1 : 0),
          ),
        )
        .split("\n").length - 1;
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}
export function toggleList(item, start, end) {
  const ids = listSelection(item.content, start, end),
    bullets = new Set(item.textList?.bullets || []),
    remove = ids.every((id) => bullets.has(id));
  for (const id of ids) remove ? bullets.delete(id) : bullets.add(id);
  return {
    ...item.textList,
    indent: item.textList?.indent ?? 1.25,
    bullets: [...bullets].sort((a, b) => a - b),
  };
}
export function editedList(item, content) {
  if (!item.textList) return undefined;
  const old = item.content,
    prev = old.split("\n"),
    next = content.split("\n");
  let prefix = 0;
  while (
    prefix < old.length &&
    prefix < content.length &&
    old[prefix] === content[prefix]
  )
    prefix++;
  let suffix = 0;
  while (
    suffix < old.length - prefix &&
    suffix < content.length - prefix &&
    old[old.length - 1 - suffix] === content[content.length - 1 - suffix]
  )
    suffix++;
  const first = old.slice(0, prefix).split("\n").length - 1,
    lastOld = old.slice(0, old.length - suffix).split("\n").length - 1,
    lastNew = content.slice(0, content.length - suffix).split("\n").length - 1,
    delta = next.length - prev.length;
  const bullets = [];
  for (let i = 0; i < next.length; i++) {
    const source = i < first ? i : i > lastNew ? i - delta : first;
    if (hasBullet(item, Math.min(prev.length - 1, source))) bullets.push(i);
  }
  return { ...item.textList, bullets };
}
export function contentPatch(item, content) {
  return {
    content,
    ...(item.textList ? { textList: editedList(item, content) } : {}),
  };
}
export function exitEmptyList(item, position) {
  const index = item.content.slice(0, position).split("\n").length - 1;
  return hasBullet(item, index) && item.content.split("\n")[index] === ""
    ? {
        ...item.textList,
        bullets: item.textList.bullets.filter((i) => i !== index),
      }
    : null;
}
export function validateEditorialText(pages) {
  for (const p of pages)
    for (const item of [
      ...(p.layers || []),
      ...(p.buttons || []).flatMap((b) => (b.labelText ? [b.labelText] : [])),
    ]) {
      const list = item.textList;
      if (
        list !== undefined &&
        (!list ||
          !Array.isArray(list.bullets) ||
          list.bullets.some(
            (i) =>
              !Number.isInteger(i) ||
              i < 0 ||
              i >= String(item.content).split("\n").length,
          ) ||
          new Set(list.bullets).size !== list.bullets.length ||
          !Number.isFinite(list.indent) ||
          list.indent < 0.75 ||
          list.indent > 4)
      )
        throw new Error(
          "La mise en forme des listes à puces est invalide. Votre projet est conservé.",
        );
    }
}
