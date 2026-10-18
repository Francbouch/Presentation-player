import { test, expect } from "@playwright/test";
import {
  createInteractiveButton,
  createLayer,
  emptyPage,
  DOCUMENT_VERSION,
  duplicatePageModel,
  migrateDocument,
  normalizeDocument,
} from "../src/document.js";
import {
  createComponent,
  insertComponent,
  publishComponent,
  markOverrides,
  resetInstance,
  detachInstance,
} from "../src/componentsModel.js";
import {
  validateOrganization,
  patchLayers,
  copySelection,
} from "../src/visualGroups.js";
import { buttonStyle } from "../src/buttonAppearance.js";
function sample() {
  const p = emptyPage(1),
    q = emptyPage(2),
    a = createInteractiveButton(1),
    b = createLayer("rectangle", 1);
  a.appearance = buttonStyle();
  b.x = 0.4;
  p.buttons = [a];
  p.layers = [b];
  p.layerOrder = [a.id, b.id];
  p.states = [
    {
      id: "open",
      name: "Ouvert",
      background: null,
      activeButtonId: null,
      visibility: { [a.id]: false },
    },
  ];
  a.action = {
    type: "visibility",
    mode: "show",
    layerIds: [b.id],
    targetModes: { [b.id]: "show" },
  };
  return {
    version: DOCUMENT_VERSION,
    media: [],
    transitions: [],
    pages: [p, q],
    privateMetadata: { keep: true },
  };
}
test("maîtres : héritage par propriété, structure, géométrie indépendante, actions locales et détachement", () => {
  let d = sample(),
    p = d.pages[0];
  d = createComponent(d, p, p.layerOrder, "Finitions");
  let m = d.components[0];
  p = insertComponent(d, m, d.pages[0]);
  d = { ...d, pages: [p, d.pages[1]] };
  const first = p.componentInstances[0],
    second = p.componentInstances[1],
    id = second.members[m.layers[0].id];
  const before = p;
  const original = p.buttons.find((b) => b.id === id);
  const appearance = { ...original.appearance, background: "#ff0000" };
  p = markOverrides(
    patchLayers(p, {
      [id]: {
        appearance,
        action: { type: "navigate", transitionId: null, pageId: d.pages[1].id },
        x: 0.65,
      },
    }),
    id,
    { appearance },
    before,
  );
  expect(p.componentInstances[1].overrides[m.layers[0].id]).toEqual([
    "appearance.background",
  ]);
  const source = p.buttons[0];
  p = patchLayers(p, {
    [source.id]: {
      appearance: {
        ...source.appearance,
        border: "#00ff00",
        background: "#0000ff",
      },
    },
  });
  d = { ...d, pages: [p, d.pages[1]] };
  d = publishComponent(d, p, first, Object.values(first.members));
  p = d.pages[0];
  const copy = p.buttons.find((b) => b.id === id);
  expect(copy.appearance.background).toBe("#ff0000");
  expect(copy.appearance.border).toBe("#00ff00");
  expect(copy.action).toEqual({
    type: "navigate",
    transitionId: null,
    pageId: d.pages[1].id,
  });
  expect(copy.x).not.toBe(p.buttons[0].x);
  validateOrganization(d);
  const restored = resetInstance(p, p.componentInstances[1], d.components[0]);
  expect(restored.buttons.find((b) => b.id === id).appearance.background).toBe(
    "#0000ff",
  );
  expect(restored.buttons.find((b) => b.id === id).action).toEqual(copy.action);
  const detached = detachInstance(p, second.id);
  expect(detached.buttons).toEqual(p.buttons);
  expect(detached.componentInstances).toHaveLength(1);
});
test("copie de groupes, états, références internes et duplication de page sans médias supplémentaires", () => {
  let d = sample(),
    p = d.pages[0];
  p.visualGroups = [{ id: "group", name: "Groupe", children: p.layerOrder }];
  d = createComponent(d, p, p.layerOrder, "Kit");
  p = d.pages[0];
  const c = copySelection(p, p.layerOrder, d, d.pages[1]);
  const button = c.layers.find((l) => l.action);
  expect(button.action.layerIds).toEqual([
    c.layers.find((l) => l.type === "rectangle").id,
  ]);
  expect(c.groups[0].children).toEqual(c.ids);
  expect(c.instances[0].members).not.toEqual(p.componentInstances[0].members);
  const same = copySelection(p, p.layerOrder, d);
  expect(Object.values(same.visibility.open)).toEqual([false]);
  const dup = duplicatePageModel({ ...p, stateEffects: { pairs: [] } });
  validateOrganization({ ...d, pages: [...d.pages, dup] });
  expect(dup.componentInstances[0].id).not.toBe(p.componentInstances[0].id);
  expect(d.media).toHaveLength(0);
});
test("validation refuse les structures corrompues et conserve les métadonnées anciennes", () => {
  let d = sample();
  d = createComponent(d, d.pages[0], d.pages[0].layerOrder, "Kit");
  validateOrganization(d);
  const bad = structuredClone(d);
  bad.pages[0].componentInstances[0].overrides[bad.components[0].layers[0].id] =
    ["__proto__.polluted"];
  expect(() => validateOrganization(bad)).toThrow();
  const old = normalizeDocument(sample());
  old.version = 12;
  expect(migrateDocument(old).privateMetadata).toEqual({ keep: true });
});

test("structure du maître : nouveaux éléments, retrait sans perte et dimensions héritées ou personnalisées", () => {
  let d = sample();
  d = createComponent(d, d.pages[0], d.pages[0].layerOrder, "Kit");
  let p = insertComponent(d, d.components[0], d.pages[0]);
  d = { ...d, pages: [p, d.pages[1]] };
  const [source, instance] = p.componentInstances;
  const added = createLayer("circle", 3);
  added.x = 0.65;
  p = {
    ...p,
    layers: [...p.layers, added],
    layerOrder: [...p.layerOrder, added.id],
  };
  d = { ...d, pages: [p, d.pages[1]] };
  d = publishComponent(d, p, source, [
    ...Object.values(source.members),
    added.id,
  ]);
  validateOrganization(d);
  expect(Object.keys(d.pages[0].componentInstances[1].members)).toHaveLength(3);
  const former =
    d.pages[0].componentInstances[1].members[d.components[0].layers[2].id];
  p = d.pages[0];
  d = publishComponent(
    d,
    p,
    p.componentInstances[0],
    Object.values(p.componentInstances[0].members).filter(
      (id) => id !== added.id,
    ),
  );
  validateOrganization(d);
  expect(d.pages[0].layers.some((l) => l.id === former)).toBe(true);
  expect(Object.values(d.pages[0].componentInstances[1].members)).not.toContain(
    former,
  );
});

test("dimensions du maître héritées, taille locale conservée et actions vidéo propres aux pages", () => {
  let d = sample();
  const p = d.pages[0];
  p.layers = [];
  p.layerOrder = [p.buttons[0].id];
  p.buttons[0].action = {
    type: "video",
    videoId: null,
    block: true,
    end: "state",
    finalStateId: "open",
    finalBackground: null,
    pageId: null,
  };
  d = createComponent(d, p, p.layerOrder, "Bouton");
  let page = insertComponent(d, d.components[0], d.pages[0]);
  page = insertComponent(
    { ...d, pages: [page, d.pages[1]] },
    d.components[0],
    page,
  );
  const [first, second, third] = page.componentInstances,
    ids = Object.values(third.members),
    original = page;
  page = markOverrides(
    patchLayers(page, { [ids[0]]: { width: 0.3 } }),
    ids[0],
    { width: 0.3 },
    original,
  );
  page = patchLayers(page, { [page.buttons[0].id]: { width: 0.2 } });
  d = { ...d, pages: [page, d.pages[1]] };
  d = publishComponent(d, page, first, Object.values(first.members));
  expect(d.pages[0].buttons[1].width).toBeCloseTo(0.2);
  expect(d.pages[0].buttons[2].width).toBeCloseTo(0.3);
  const other = insertComponent(d, d.components[0], d.pages[1]);
  expect(other.buttons[0].action.finalStateId).toBeNull();
  expect(other.buttons[0].action.missingFinalStateId).toBe("open");
  expect(d.pages[0].buttons[1].action.finalStateId).toBe("open");
});

test("aligner des groupes conserve la disposition interne de leurs éléments", async () => {
  const { alignSelection, alignmentUnits } = await import(
    "../src/visualGroups.js"
  );
  const p = sample().pages[0],
    items = [...p.buttons.map((b) => ({ ...b, type: "button" })), ...p.layers],
    groups = [
      { id: "group", name: "Groupe", children: items.map((l) => l.id) },
    ];
  const patches = alignSelection(items, groups, "centerX", "slide");
  expect(patches[items[1].id].x - patches[items[0].id].x).toBeCloseTo(
    items[1].x - items[0].x,
  );
  expect(alignmentUnits(items, groups)).toHaveLength(1);
  expect(alignmentUnits(items, groups, "group")).toHaveLength(2);
});

test("retrait confirmé du maître : suppression propagée sans supprimer les médias", () => {
  let d = sample();
  d = createComponent(d, d.pages[0], d.pages[0].layerOrder, "Kit");
  let p = insertComponent(d, d.components[0], d.pages[0]);
  d = { ...d, pages: [p, d.pages[1]] };
  const first = p.componentInstances[0];
  d = publishComponent(d, p, first, [p.buttons[0].id], true);
  expect(d.pages[0].layers).toHaveLength(0);
  expect(d.pages[0].buttons).toHaveLength(2);
  expect(d.media).toHaveLength(0);
  validateOrganization(d);
});

test('réinitialisation d’un objet facultatif du maître : personnalisations complètes et valides conservées',()=>{let d=sample();d.pages[0].buttons[0].imageCrop={mode:'contain',zoom:1,x:0,y:0};d=createComponent(d,d.pages[0],[d.pages[0].buttons[0].id],'Bouton');let p=insertComponent(d,d.components[0],d.pages[0]);const first=p.componentInstances[0],second=p.componentInstances[1],id=Object.values(second.members)[0],copy=p.buttons.find(b=>b.id===id),patch={appearance:{...copy.appearance,background:'#ff0000'},imageCrop:{...copy.imageCrop,zoom:2}};p=markOverrides(patchLayers(p,{[id]:patch}),id,patch,p);p=patchLayers(p,{[p.buttons[0].id]:{appearance:undefined,imageCrop:undefined}});d={...d,pages:[p,d.pages[1]]};d=publishComponent(d,p,first,Object.values(first.members));const result=d.pages[0].buttons.find(b=>b.id===id);expect(result.appearance.background).toBe('#ff0000');expect(result.appearance.border).toBeTruthy();expect(result.imageCrop).toEqual({mode:'contain',zoom:2,x:0,y:0});validateOrganization(d);});
