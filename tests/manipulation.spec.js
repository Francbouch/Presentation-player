import { test, expect } from "@playwright/test";
import {
  resizeFrom,
  drawShape,
  translated,
  angle15,
} from "../src/manipulation.js";
const saved = (p) =>
  expect(p.locator(".save-status")).toContainText("✓ Sauvegardé");
async function record(p) {
  return p.evaluate(
    () =>
      new Promise((resolve) => {
        const r = indexedDB.open("presentation-studio", 1);
        r.onsuccess = () => {
          const db = r.result,
            t = db.transaction("documents"),
            g = t.objectStore("documents").get("current");
          g.onsuccess = () => resolve(g.result);
          t.oncomplete = () => db.close();
        };
      }),
  );
}
async function start(p) {
  await p.goto("/");
  await saved(p);
  await p
    .getByRole("button", { name: "⌖ Magnétisme actif", exact: true })
    .click();
}
async function add(p, type = "Rectangle") {
  await p
    .getByRole("toolbar")
    .getByRole("button", { name: "+ " + type, exact: true })
    .click();
  await saved(p);
  return (await record(p)).pages[0].layers.at(-1);
}
const frame = (p, id) => p.locator(`[data-layer-id="${id}"]`);
async function down(p, locator) {
  const b = await locator.boundingBox();
  const point = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  await p.mouse.move(point.x, point.y);
  await p.mouse.down();
  return point;
}
async function finish(p) {
  await p.mouse.up();
  await saved(p);
}

test("géométrie : proportions, centre pivoté, dessin et déplacement commun en pixels logiques", () => {
  const r = { x: 0.3, y: 0.3, width: 0.2, height: 0.15, rotation: 35 },
    next = resizeFrom(r, 100, 20, "se", { shift: true, alt: true });
  expect(Object.keys(next).sort()).toEqual(Object.keys(r).sort());
  expect(next.width / next.height).toBeCloseTo(r.width / r.height, 9);
  expect(next.x + next.width / 2).toBeCloseTo(r.x + r.width / 2, 9);
  expect(next.y + next.height / 2).toBeCloseTo(r.y + r.height / 2, 9);
  const drawn = drawShape(
    { x: 0.4, y: 0.4 },
    { x: 0.5, y: 0.5 },
    { shift: true, alt: true },
  );
  expect(drawn.width * 1920).toBeCloseTo(drawn.height * 1080);
  expect(drawn.x + drawn.width / 2).toBeCloseTo(0.4);
  const moved = translated(
    [
      { id: "a", x: 0.1, y: 0.1, width: 0.1, height: 0.1 },
      { id: "b", x: 0.3, y: 0.1, width: 0.1, height: 0.1 },
    ],
    1 / 1920,
    10 / 1080,
  );
  expect(moved.b.x - moved.a.x).toBeCloseTo(0.2, 10);
  expect(angle15(28)).toBe(30);
  const edge = translated(
    [
      { id: "a", x: 0.1, y: 0.3, width: 0.3, height: 0.1, rotation: 90 },
      { id: "b", x: 0.5, y: 0.3, width: 0.1, height: 0.1 },
    ],
    -1,
    0,
  );
  expect(edge.a.x).toBeCloseTo(0, 9);
  expect(edge.b.x - edge.a.x).toBeCloseTo(0.4, 9);
});

test("coin : Shift, Alt, touches en cours de geste et une seule annulation", async ({
  page,
}) => {
  await start(page);
  const item = await add(page);
  const handle = page.getByRole("button", {
    name: "Redimensionner le calque Rectangle 1",
    exact: true,
  });
  const a = await down(page, handle);
  await page.keyboard.down("Shift");
  await page.keyboard.down("Alt");
  await page.mouse.move(a.x + 40, a.y + 12, { steps: 4 });
  await finish(page);
  await page.keyboard.up("Alt");
  await page.keyboard.up("Shift");
  let next = (await record(page)).pages[0].layers[0];
  expect(Object.keys(next).sort()).toEqual(Object.keys(item).sort());
  expect(next.width / next.height).toBeCloseTo(item.width / item.height, 6);
  expect(next.x + next.width / 2).toBeCloseTo(item.x + item.width / 2, 6);
  expect(next.y + next.height / 2).toBeCloseTo(item.y + item.height / 2, 6);
  await page.getByRole("button", { name: "↶ Annuler", exact: true }).click();
  await saved(page);
  expect((await record(page)).pages[0].layers[0]).toEqual(item);
  const b = await down(page, handle);
  await page.mouse.move(b.x + 35, b.y + 5);
  const before = await frame(page, item.id).boundingBox();
  await page.keyboard.down("Shift");
  const toggled = await frame(page, item.id).boundingBox();
  expect(toggled.width).toBeCloseTo(before.width, 2);
  await page.mouse.move(b.x + 65, b.y + 10);
  await page.keyboard.up("Shift");
  const released = await frame(page, item.id).boundingBox();
  await page.mouse.move(b.x + 70, b.y + 10);
  const free = await frame(page, item.id).boundingBox();
  expect(Math.abs(free.width - released.width)).toBeLessThan(10);
  await finish(page);
});

test("formes : clic 200 px, dessin libre, Shift+Alt et annulation du dessin", async ({
  page,
}) => {
  await start(page);
  const rect = await add(page),
    circle = await add(page, "Cercle");
  for (const i of [rect, circle]) {
    expect(i.width * 1920).toBeCloseTo(200);
    expect(i.height * 1080).toBeCloseTo(200);
  }
  const bounds = await page.locator(".editor-preview").boundingBox();
  await page.getByLabel("Création sur le canevas").selectOption("rectangle");
  await page.mouse.move(
    bounds.x + bounds.width * 0.5,
    bounds.y + bounds.height * 0.45,
  );
  await page.keyboard.down("Shift");
  await page.keyboard.down("Alt");
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.6,
    bounds.y + bounds.height * 0.5,
    { steps: 6 },
  );
  await finish(page);
  await page.keyboard.up("Alt");
  await page.keyboard.up("Shift");
  let d = await record(page);
  expect(d.pages[0].layers).toHaveLength(3);
  const drawn = d.pages[0].layers[2];
  expect(drawn.width * 1920).toBeCloseTo(drawn.height * 1080, 5);
  expect(drawn.x + drawn.width / 2).toBeCloseTo(0.5, 2);
  await page.getByLabel("Création sur le canevas").selectOption("circle");
  await page.mouse.click(
    bounds.x + bounds.width * 0.6,
    bounds.y + bounds.height * 0.2,
  );
  await saved(page);
  expect((await record(page)).pages[0].layers).toHaveLength(4);
  await page.getByLabel("Création sur le canevas").selectOption("rectangle");
  await page.mouse.move(
    bounds.x + bounds.width * 0.5,
    bounds.y + bounds.height * 0.3,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.7,
    bounds.y + bounds.height * 0.6,
  );
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect((await record(page)).pages[0].layers).toHaveLength(4);
});

test("déplacement : axe stable, Alt copie liée, identifiants distincts et Undo/Redo", async ({
  page,
}) => {
  await start(page);
  const original = await add(page);
  await page.keyboard.down("Shift");
  await page.keyboard.down("Alt");
  const point = await down(
    page,
    frame(page, original.id).locator(".layer-content"),
  );
  await page.mouse.move(point.x + 55, point.y + 10, { steps: 5 });
  await expect(page.locator(".duplication-origin")).toHaveCount(1);
  await finish(page);
  await page.keyboard.up("Shift");
  await page.keyboard.up("Alt");
  let d = await record(page);
  expect(d.pages[0].layers).toHaveLength(2);
  expect(d.pages[0].layers[0]).toEqual(original);
  expect(d.pages[0].layers[1].id).not.toBe(original.id);
  expect(d.pages[0].layers[1].y).toBe(original.y);
  expect(d.pages[0].layers[1].x).toBeGreaterThan(original.x);
  await page.getByRole("button", { name: "↶ Annuler", exact: true }).click();
  await saved(page);
  expect((await record(page)).pages[0].layers).toEqual([original]);
  await page.getByRole("button", { name: "↷ Rétablir", exact: true }).click();
  await saved(page);
  expect((await record(page)).pages[0].layers).toHaveLength(2);
});

test("clavier : 1 et 10 px, répétitions regroupées, champs et calques verrouillés", async ({
  page,
}) => {
  await start(page);
  const item = await add(page);
  await frame(page, item.id).locator(".layer-content").focus();
  await page.keyboard.down("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.up("ArrowRight");
  await saved(page);
  let moved = (await record(page)).pages[0].layers[0];
  expect((moved.x - item.x) * 1920).toBeCloseTo(3, 5);
  await page.getByRole("button", { name: "↶ Annuler", exact: true }).click();
  await saved(page);
  expect((await record(page)).pages[0].layers[0]).toEqual(item);
  await frame(page, item.id).locator(".layer-content").focus();
  await page.keyboard.press("Shift+ArrowDown");
  await saved(page);
  expect(
    ((await record(page)).pages[0].layers[0].y - item.y) * 1080,
  ).toBeCloseTo(10, 5);
  const before = await record(page);
  await page.getByLabel("Nom du calque", { exact: true }).focus();
  await page.keyboard.press("ArrowLeft");
  expect((await record(page)).pages).toEqual(before.pages);
  await page.getByLabel("Verrouiller le déplacement", { exact: true }).check();
  await saved(page);
  const locked = await record(page);
  await page.locator(".editor").focus();
  await page.keyboard.press("ArrowRight");
  expect((await record(page)).pages).toEqual(locked.pages);
});

test("rotation 15°, cadre vidéo, zoom et duplication sans binaire supplémentaire", async ({
  page,
}) => {
  await start(page);
  const item = await add(page, "Cercle");
  const video = (await record(page)).media.find((m) =>
    m.type.startsWith("video/"),
  );
  await page
    .getByLabel("Média du cadre", { exact: true })
    .selectOption(video.id);
  await page.getByRole("button", { name: "100 %", exact: true }).click();
  await page
    .getByRole("button", { name: "Ajuster à l’écran", exact: true })
    .click();
  const knob = page.getByRole("button", {
    name: "Faire pivoter Cercle 1",
    exact: true,
  });
  const point = await down(page, knob);
  await page.keyboard.down("Shift");
  await page.mouse.move(point.x + 30, point.y + 15, { steps: 6 });
  await finish(page);
  await page.keyboard.up("Shift");
  const rotated = (await record(page)).pages[0].layers[0];
  expect(Math.abs(rotated.rotation % 15)).toBeLessThan(1e-6);
  const d = await record(page);
  await page.keyboard.down("Alt");
  const a = await down(page, frame(page, item.id).locator(".layer-content"));
  await page.mouse.move(a.x + 35, a.y + 15, { steps: 5 });
  await finish(page);
  await page.keyboard.up("Alt");
  const copy = await record(page);
  expect(copy.media).toHaveLength(d.media.length);
  expect(copy.pages[0].layers[1].frameMedia).toEqual(rotated.frameMedia);
});

test("groupes : centre fixe, proportions, copie de composant et références internes dans un ZIP", async ({
  page,
  browser,
}, info) => {
  await start(page);
  await add(page);
  await page.getByLabel("X du calque (%)", { exact: true }).fill("10");
  await add(page, "Cercle");
  await page.getByLabel("X du calque (%)", { exact: true }).fill("45");
  await page.locator(".editor").focus();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Control+g");
  await saved(page);
  const original = await record(page);
  const selection = page.locator(".multi-selection-frame"),
    before = await selection.boundingBox(),
    a = await down(
      page,
      page.getByRole("button", {
        name: "Redimensionner la sélection se",
        exact: true,
      }),
    );
  await page.keyboard.down("Shift");
  await page.keyboard.down("Alt");
  await page.mouse.move(a.x + 30, a.y + 15, { steps: 4 });
  await finish(page);
  await page.keyboard.up("Shift");
  await page.keyboard.up("Alt");
  const after = await selection.boundingBox();
  expect(after.x + after.width / 2).toBeCloseTo(before.x + before.width / 2, 1);
  expect(after.y + after.height / 2).toBeCloseTo(
    before.y + before.height / 2,
    1,
  );
  let resized = await record(page);
  expect(
    resized.pages[0].layers[0].width / resized.pages[0].layers[0].height,
  ).toBeCloseTo(
    original.pages[0].layers[0].width / original.pages[0].layers[0].height,
    5,
  );
  await page
    .getByLabel("Nom du nouveau composant", { exact: true })
    .fill("Deux formes");
  await page
    .getByRole("button", { name: "Créer un composant", exact: true })
    .click();
  await saved(page);
  const master = await record(page);
  await page.keyboard.down("Alt");
  const b = await down(
    page,
    page.getByRole("button", { name: "Déplacer la sélection", exact: true }),
  );
  await page.mouse.move(b.x + 25, b.y + 20, { steps: 5 });
  await finish(page);
  await page.keyboard.up("Alt");
  const copied = await record(page);
  expect(copied.pages[0].layers).toHaveLength(4);
  expect(copied.pages[0].componentInstances).toHaveLength(2);
  expect(copied.pages[0].layers.slice(0, 2)).toEqual(master.pages[0].layers);
  expect(copied.pages[0].visualGroups).toHaveLength(2);
  await page.getByRole("button", { name: "Fichier", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("menuitem", { name: "Sauvegarder mon projet", exact: true })
    .click();
  const file = info.outputPath("manipulation.zip");
  await (await download).saveAs(file);
  const context = await browser.newContext(),
    other = await context.newPage();
  await other.goto("/");
  await saved(other);
  await other.getByTestId("zip-input").setInputFiles(file);
  await other
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmer", exact: true })
    .click();
  await saved(other);
  expect((await record(other)).pages).toEqual(copied.pages);
  await context.close();
});

test("zoom : cadre pivoté redimensionné depuis son centre et mouvement annulé par Échap", async ({
  page,
}) => {
  await start(page);
  const item = await add(page);
  await page.getByLabel("Rotation du calque", { exact: true }).fill("30");
  await saved(page);
  const original = (await record(page)).pages[0].layers[0];
  for (const zoom of ["100 %", "Ajuster à l’écran"]) {
    await page.getByRole("button", { name: zoom, exact: true }).click();
    const a = await down(
      page,
      page.getByRole("button", {
        name: "Redimensionner le calque Rectangle 1",
        exact: true,
      }),
    );
    await page.keyboard.down("Shift");
    await page.keyboard.down("Alt");
    await page.mouse.move(a.x + 18, a.y + 18, { steps: 4 });
    await finish(page);
    await page.keyboard.up("Shift");
    await page.keyboard.up("Alt");
    const next = (await record(page)).pages[0].layers[0];
    expect(next.rotation).toBe(30);
    expect(next.x + next.width / 2).toBeCloseTo(
      original.x + original.width / 2,
      6,
    );
    expect(next.y + next.height / 2).toBeCloseTo(
      original.y + original.height / 2,
      6,
    );
    expect(next.width / next.height).toBeCloseTo(
      original.width / original.height,
      6,
    );
    await page.getByRole("button", { name: "↶ Annuler", exact: true }).click();
    await saved(page);
  }
  const b = await down(page, frame(page, item.id).locator(".layer-content"));
  await page.mouse.move(b.x + 45, b.y + 30);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect((await record(page)).pages[0].layers[0]).toEqual(original);
});

test("copies : aperçu des boutons, du texte et des images sans modifier les médias ni les actions", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await page
    .getByRole("toolbar")
    .getByRole("button", { name: "+ Bouton", exact: true })
    .click();
  await page
    .getByLabel("Type d’action", { exact: true })
    .selectOption("background");
  await saved(page);
  const button = (await record(page)).pages[0].buttons[0];
  await page.keyboard.down("Alt");
  const a = await down(page, frame(page, button.id).locator(".layer-content"));
  await page.mouse.move(a.x + 30, a.y - 15, { steps: 4 });
  await finish(page);
  await page.keyboard.up("Alt");
  const copied = await record(page);
  expect(copied.pages[0].buttons).toHaveLength(2);
  expect(copied.pages[0].buttons[0]).toEqual(button);
  expect(copied.pages[0].buttons[1].action).toEqual(button.action);
  await page
    .getByRole("toolbar")
    .getByRole("button", { name: "+ Texte", exact: true })
    .click();
  await saved(page);
  const text = (await record(page)).pages[0].layers[0];
  await page.keyboard.down("Alt");
  const b = await down(page, frame(page, text.id).locator(".layer-content"));
  await page.mouse.move(b.x + 30, b.y + 25, { steps: 4 });
  await finish(page);
  await page.keyboard.up("Alt");
  expect((await record(page)).pages[0].layers).toHaveLength(2);
  await page
    .getByRole("toolbar")
    .getByRole("button", { name: "+ Image", exact: true })
    .click();
  await page
    .getByTestId("media-input")
    .setInputFiles("public/slides/ocean.png");
  await expect(page.getByLabel("Nom du calque", { exact: true })).toHaveValue(
    "ocean.png",
  );
  await saved(page);
  const initial = await record(page),
    image = initial.pages[0].layers.at(-1);
  await page.keyboard.down("Alt");
  const c = await down(page, frame(page, image.id).locator(".layer-content"));
  await page.mouse.move(c.x + 30, c.y + 20, { steps: 4 });
  await finish(page);
  await page.keyboard.up("Alt");
  const result = await record(page);
  expect(result.media).toHaveLength(initial.media.length);
  expect(result.pages[0].layers.at(-1).imageId).toBe(image.imageId);
  expect(errors).toEqual([]);
});
