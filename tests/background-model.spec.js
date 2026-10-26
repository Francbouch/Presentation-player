import { test, expect } from "@playwright/test";
import {
  emptyPage,
  createInteractiveButton,
  normalizeDocument,
  migrateDocument,
} from "../src/document.js";
import {
  createComponent,
  insertComponent,
  publishComponent,
  markOverrides,
} from "../src/componentsModel.js";
import { patchLayers, validateOrganization } from "../src/visualGroups.js";
import {
  defaultBackgroundEffect,
  validateBackgroundEffect,
} from "../src/visualEffects.js";
test("composants : transition héritée par propriété, durée locale conservée et migration additive", () => {
  let d = normalizeDocument({
    version: 13,
    media: [],
    transitions: [],
    pages: [emptyPage(1)],
    privateMetadata: { owner: "Conserver" },
  });
  d.pages[0].buttons = [
    {
      ...createInteractiveButton(1),
      backgroundEffect: { ...defaultBackgroundEffect(), type: "crossfade" },
    },
  ];
  d = normalizeDocument(d);
  d = createComponent(d, d.pages[0], [d.pages[0].buttons[0].id], "Finition");
  let p = insertComponent(d, d.components[0], d.pages[0]);
  const source = p.componentInstances[0],
    copy = p.buttons[1],
    patch = { backgroundEffect: { ...copy.backgroundEffect, duration: 900 } };
  p = markOverrides(patchLayers(p, { [copy.id]: patch }), copy.id, patch, p);
  p = patchLayers(p, {
    [p.buttons[0].id]: {
      backgroundEffect: {
        ...p.buttons[0].backgroundEffect,
        type: "wipe",
        direction: "right",
      },
    },
  });
  d = publishComponent(
    { ...d, pages: [p] },
    p,
    source,
    Object.values(source.members),
  );
  expect(d.pages[0].buttons[1].backgroundEffect).toMatchObject({
    type: "wipe",
    direction: "right",
    duration: 900,
  });
  validateOrganization(d);
  expect(migrateDocument({ ...d, version: 13 })).toMatchObject({
    version: 36,
    privateMetadata: { owner: "Conserver" },
  });
  for (const effect of [
    { ...defaultBackgroundEffect(), duration: 99 },
    { ...defaultBackgroundEffect(), duration: 2001 },
    { ...defaultBackgroundEffect(), type: "black" },
  ])
    expect(() => validateBackgroundEffect(effect)).toThrow();
});
