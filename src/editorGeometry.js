// Toutes les mesures sont calculées dans le repère 1920 × 1080 de la scène.
export function visualBounds(item) {
  const a = ((item.rotation || 0) * Math.PI) / 180,
    c = Math.abs(Math.cos(a)),
    s = Math.abs(Math.sin(a));
  const w = item.width * c + ((item.height * 1080) / 1920) * s,
    h = item.height * c + ((item.width * 1920) / 1080) * s;
  return {
    x: item.x + item.width / 2 - w / 2,
    y: item.y + item.height / 2 - h / 2,
    width: w,
    height: h,
  };
}
export function boundsOf(items) {
  const boxes = items.map(visualBounds);
  if (!boxes.length) return null;
  const x = Math.min(...boxes.map((b) => b.x)),
    y = Math.min(...boxes.map((b) => b.y));
  return {
    x,
    y,
    width: Math.max(...boxes.map((b) => b.x + b.width)) - x,
    height: Math.max(...boxes.map((b) => b.y + b.height)) - y,
  };
}
export function snapGeometry(rect, others, screen, kind = "move") {
  const result = { ...rect },
    guides = [],
    measures = [];
  if (kind !== "move" && rect.rotation)
    return { rect: result, guides, measures };
  for (const [axis, size, pixels, logical] of [
    ["x", "width", screen.width, 1920],
    ["y", "height", screen.height, 1080],
  ]) {
    const box = visualBounds(result),
      candidates = [
        0,
        0.5,
        1,
        ...others.flatMap((item) => {
          const b = visualBounds(item);
          return [b[axis], b[axis] + b[size] / 2, b[axis] + b[size]];
        }),
      ];
    let best;
    for (const anchor of kind === "move"
      ? [0, 0.5, 1]
      : [kind.includes(axis === "x" ? "w" : "n") ? 0 : 1])
      for (const value of candidates) {
        const delta = value - (box[axis] + box[size] * anchor);
        if (
          Math.abs(delta) * pixels <= 6 &&
          (!best || Math.abs(delta) < Math.abs(best.delta))
        )
          best = { delta, value, anchor };
      }
    // Un seul espacement égal par axe, entre voisins alignés.
    if (kind === "move")
      for (const a of others.slice(0, 30))
        for (const b of others.slice(0, 30)) {
          if (a.id === b.id) continue;
          const aa = visualBounds(a),
            bb = visualBounds(b),
            cross = axis === "x" ? "y" : "x",
            crossSize = axis === "x" ? "height" : "width";
          if (
            Math.abs(aa[cross] - box[cross]) * screen[crossSize] > 8 ||
            Math.abs(bb[cross] - box[cross]) * screen[crossSize] > 8
          )
            continue;
          const gap = bb[axis] - aa[axis] - aa[size];
          if (gap < 0) continue;
          const value = bb[axis] + bb[size] + gap,
            delta = value - box[axis];
          if (
            Math.abs(delta) * pixels <= 6 &&
            (!best || Math.abs(delta) < Math.abs(best.delta))
          )
            best = { delta, value, gap, from: bb[axis] + bb[size] };
        }
    if (best) {
      if (kind === "move") result[axis] += best.delta;
      else if (!rect.rotation) {
        const west = kind.includes(axis === "x" ? "w" : "n");
        if (west) {
          result[axis] += best.delta;
          result[size] -= best.delta;
        } else result[size] += best.delta;
      }
      guides.push({ axis, value: best.value });
      if (best.gap !== undefined)
        measures.push({
          axis,
          from: best.from,
          to: best.value,
          label: `${Math.round(best.gap * logical)} px`,
        });
    }
  }
  return { rect: result, guides, measures };
}
export function alignItems(items, command, reference = "selection") {
  const box =
      reference === "slide"
        ? { x: 0, y: 0, width: 1, height: 1 }
        : boundsOf(items),
    axis =
      command.endsWith("Y") || ["top", "bottom"].includes(command) ? "y" : "x",
    size = axis === "x" ? "width" : "height";
  if (command.startsWith("distribute")) {
    if (items.length < 3) return {};
    const sorted = [...items].sort(
        (a, b) => visualBounds(a)[axis] - visualBounds(b)[axis],
      ),
      total = sorted.reduce((n, l) => n + visualBounds(l)[size], 0),
      gap = (box[size] - total) / (items.length - 1);
    let cursor = box[axis];
    return Object.fromEntries(
      sorted.map((l) => {
        const b = visualBounds(l),
          patch = { [axis]: l[axis] + cursor - b[axis] };
        cursor += b[size] + gap;
        return [l.id, patch];
      }),
    );
  }
  return Object.fromEntries(
    items.map((l) => {
      const b = visualBounds(l),
        factor = ["centerX", "centerY"].includes(command)
          ? 0.5
          : ["right", "bottom"].includes(command)
            ? 1
            : 0;
      return [
        l.id,
        {
          [axis]:
            l[axis] +
            box[axis] +
            box[size] * factor -
            b[axis] -
            b[size] * factor,
        },
      ];
    }),
  );
}
