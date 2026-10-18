import { test, expect } from "@playwright/test";
import {
  snapGeometry,
  visualBounds,
  alignItems,
} from "../src/editorGeometry.js";
test("magnétisme : six pixels écran à tous les zooms et limites pivotées", () => {
  for (const width of [480, 960, 1920]) {
    const rect = { x: 0.5 + 5 / width, y: 0.2, width: 0.1, height: 0.1 };
    expect(
      snapGeometry(rect, [], { width, height: (width * 9) / 16 }).rect.x,
    ).toBeCloseTo(0.5);
    expect(
      snapGeometry({ ...rect, x: 0.5 + 7 / width }, [], {
        width,
        height: (width * 9) / 16,
      }).rect.x,
    ).toBeCloseTo(0.5 + 7 / width);
  }
  const a = { id: "a", x: 0.1, y: 0.1, width: 0.1, height: 0.2, rotation: 90 },
    b = { id: "b", x: 0.4, y: 0.4, width: 0.1, height: 0.1 };
  const patches = alignItems([a, b], "left");
  expect(visualBounds({ ...b, ...patches.b }).x).toBeCloseTo(visualBounds(a).x);
});
