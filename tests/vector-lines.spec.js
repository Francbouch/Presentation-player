import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import JSZip from "jszip";
import {
  createLayer,
  emptyPage,
  migrateDocument,
  normalizeDocument,
} from "../src/document.js";
import {
  linePoints,
  lineGeometry,
  drawLine,
  lineLength,
  lineAngle,
  defaultStroke,
  validateVectorLine,
} from "../src/vectorLines.js";
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
}
const frame = (p, id) => p.locator(`[data-layer-id="${id}"]`);
async function draw(
  p,
  from = { x: 0.25, y: 0.25 },
  to = { x: 0.65, y: 0.4 },
  mods = [],
) {
  await p
    .getByRole("toolbar")
    .getByRole("button", { name: "+ Ligne", exact: true })
    .click();
  const b = await p.locator(".editor-preview").boundingBox();
  for (const m of mods) await p.keyboard.down(m);
  await p.mouse.move(b.x + b.width * from.x, b.y + b.height * from.y);
  await p.mouse.down();
  await p.mouse.move(b.x + b.width * to.x, b.y + b.height * to.y, { steps: 5 });
  await p.mouse.up();
  for (const m of mods.reverse()) await p.keyboard.up(m);
  await saved(p);
  return (await record(p)).pages[0].layers.at(-1);
}
async function move(p, handle, dx, dy, mods = []) {
  const b = await handle.boundingBox();
  for (const m of mods) await p.keyboard.down(m);
  await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await p.mouse.down();
  await p.mouse.move(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy, {
    steps: 5,
  });
  await p.mouse.up();
  for (const m of mods.reverse()) await p.keyboard.up(m);
  await saved(p);
}

test("modèle : points, angles 45°, centre, anciennes barres inchangées et validation", () => {
  for (const [a, b] of [
    [
      { x: 0.1, y: 0.2 },
      { x: 0.7, y: 0.2 },
    ],
    [
      { x: 0.3, y: 0.1 },
      { x: 0.3, y: 0.8 },
    ],
    [
      { x: 0.8, y: 0.7 },
      { x: 0.2, y: 0.1 },
    ],
  ]) {
    const geometry = lineGeometry(a, b),
      line = { ...createLayer("vectorLine", 1), ...geometry };
    const points = linePoints(line);
    expect(points[0].x).toBeCloseTo(a.x, 10);
    expect(points[1].y).toBeCloseTo(b.y, 10);
    validateVectorLine(line);
  }
  const geometry = drawLine(
      { x: 0.5, y: 0.5 },
      { x: 0.7, y: 0.6 },
      { shift: true, alt: true },
    ),
    l = { ...createLayer("vectorLine", 1), ...geometry };
  expect(Math.abs(lineAngle(l)) % 45).toBeCloseTo(0, 7);
  const [a, b] = linePoints(l);
  expect((a.x + b.x) / 2).toBeCloseTo(0.5, 10);
  const old = createLayer("line", 1),
    d = normalizeDocument({
      version: 15,
      pages: [{ ...emptyPage(1), layers: [old] }],
      media: [],
      transitions: [],
      custom: { keep: true },
    });
  expect(migrateDocument(d)).toMatchObject({
    version: 23,
    custom: { keep: true },
  });
  expect(d.pages[0].layers[0]).toEqual(old);
  expect(d.pages[0].layers[0].stroke).toBeUndefined();
  expect(() =>
    validateVectorLine({ ...l, stroke: { ...defaultStroke(), width: -1 } }),
  ).toThrow();
});

test("dessin SVG : horizontal, vertical, diagonale, Shift+Alt et annulation", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  const h = await draw(page, { x: 0.2, y: 0.2 }, { x: 0.6, y: 0.2 });
  expect(h.type).toBe("vectorLine");
  expect(lineAngle(h)).toBeCloseTo(0, 4);
  await expect(frame(page, h.id).locator(".vector-line-stroke")).toHaveCount(1);
  await expect(
    page.getByRole("button", {
      name: "Départ de la ligne Ligne 1",
      exact: true,
    }),
  ).toBeVisible();
  const v = await draw(page, { x: 0.7, y: 0.2 }, { x: 0.7, y: 0.7 });
  expect(lineAngle(v)).toBeCloseTo(90, 4);
  const d = await draw(page, { x: 0.5, y: 0.5 }, { x: 0.65, y: 0.57 }, [
    "Shift",
    "Alt",
  ]);
  expect(Math.abs(lineAngle(d)) % 45).toBeCloseTo(0, 6);
  const [a, b] = linePoints(d);
  expect((a.x + b.x) / 2).toBeCloseTo(0.5, 3);
  await page.getByRole("button", { name: "+ Ligne", exact: true }).click();
  const box = await page.locator(".editor-preview").boundingBox();
  await page.mouse.move(box.x + 100, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 150);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect((await record(page)).pages[0].layers).toHaveLength(3);
  expect(errors).toEqual([]);
});

test("extrémités indépendantes, déplacement sur le tracé, zoom, verrouillage et Undo", async ({
  page,
}) => {
  await start(page);
  const l = await draw(page),
    old = linePoints(l);
  await page
    .getByRole("button", { name: "⌖ Magnétisme actif", exact: true })
    .click();
  await move(
    page,
    page.getByRole("button", {
      name: "Arrivée de la ligne Ligne 1",
      exact: true,
    }),
    20,
    30,
  );
  let next = (await record(page)).pages[0].layers[0];
  expect(linePoints(next)[0].x).toBeCloseTo(old[0].x, 8);
  expect(linePoints(next)[0].y).toBeCloseTo(old[0].y, 8);
  expect(linePoints(next)[1].y).not.toBeCloseTo(old[1].y, 3);
  await page.getByRole("button", { name: "↶ Annuler", exact: true }).click();
  await saved(page);
  expect((await record(page)).pages[0].layers[0]).toEqual(l);
  await move(
    page,
    page.getByRole("button", {
      name: "Départ de la ligne Ligne 1",
      exact: true,
    }),
    15,
    -20,
    ["Shift"],
  );
  next = (await record(page)).pages[0].layers[0];
  expect(linePoints(next)[1].x).toBeCloseTo(old[1].x, 8);
  expect(Math.abs(lineAngle(next)) % 45).toBeCloseTo(0, 5);
  await move(page, frame(page, l.id).locator(".vector-line-hit"), 25, 15);
  const moved = (await record(page)).pages[0].layers[0];
  expect(moved.x).toBeGreaterThan(next.x);
  expect(moved.endpoints).toEqual(next.endpoints);
  await page.getByRole("button", { name: "100 %", exact: true }).click();
  await page
    .getByRole("button", { name: "Ajuster à l’écran", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Arrivée de la ligne Ligne 1",
      exact: true,
    }),
  ).toHaveCSS("width", "12px");
  await page.getByLabel("Verrouiller le déplacement", { exact: true }).check();
  await saved(page);
  await expect(
    page.getByRole("button", {
      name: "Arrivée de la ligne Ligne 1",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(page.getByLabel("X1 (px)", { exact: true })).toBeDisabled();
});

test("trait et décorations : épaisseurs, caps, flèches, points, tirets et offset", async ({
  page,
}) => {
  await start(page);
  const l = await draw(page);
  const stroke = frame(page, l.id).locator(".vector-line-stroke");
  for (const n of [1, 2, 5, 10, 20, 7.5]) {
    await page
      .getByLabel("Épaisseur du trait (px)", { exact: true })
      .fill(String(n));
    await expect(stroke).toHaveAttribute("stroke-width", String(n));
  }
  await page.getByLabel("Couleur du trait", { exact: true }).fill("#ff2200");
  await page.getByLabel("Opacité du trait (%)", { exact: true }).fill("55");
  await expect(frame(page, l.id).locator(".vector-line-paint")).toHaveAttribute(
    "stroke",
    "#ff2200",
  );
  for (const cap of ["butt", "round", "square"]) {
    await page
      .getByLabel("Extrémités du trait", { exact: true })
      .selectOption(cap);
    await expect(stroke).toHaveAttribute("stroke-linecap", cap);
  }
  for (const [start, end] of [
    ["arrow", "none"],
    ["none", "arrow"],
    ["arrow", "arrow"],
    ["dot", "dot"],
    ["dot", "arrow"],
  ]) {
    await page
      .getByLabel("Début de ligne", { exact: true })
      .selectOption(start);
    await page.getByLabel("Fin de ligne", { exact: true }).selectOption(end);
    await expect(frame(page, l.id).locator(".line-decoration")).toHaveCount(
      (start !== "none" ? 1 : 0) + (end !== "none" ? 1 : 0),
    );
  }
  await page.getByLabel("Style du trait", { exact: true }).selectOption("dots");
  await expect(stroke).toHaveAttribute("stroke-linecap", "round");
  await expect(stroke).toHaveAttribute("stroke-dasharray", "0 15");
  await page
    .getByLabel("Style du trait", { exact: true })
    .selectOption("custom");
  await page.getByLabel("Longueur des tirets (px)", { exact: true }).fill("20");
  await page
    .getByLabel("Espacement des tirets (px)", { exact: true })
    .fill("10");
  await page.getByLabel("Décalage du motif (px)", { exact: true }).fill("6");
  await expect(stroke).toHaveAttribute("stroke-dasharray", "20 10");
  await expect(stroke).toHaveAttribute("stroke-dashoffset", "6");
  await expect(frame(page, l.id).locator(".vector-line-svg")).toHaveCSS(
    "overflow",
    "visible",
  );
  await page.getByLabel("Activer le trait", { exact: true }).uncheck();
  await expect(stroke).toHaveCount(0);
  await expect(frame(page, l.id).locator(".vector-line-hit")).toHaveCount(1);
});

test("IndexedDB, ZIP, style complet, import invalide et présentation plein écran", async ({
  page,
  browser,
}, info) => {
  await start(page);
  const l = await draw(page);
  await page.getByLabel("Début de ligne", { exact: true }).selectOption("dot");
  await page.getByLabel("Fin de ligne", { exact: true }).selectOption("arrow");
  await page
    .getByLabel("Style du trait", { exact: true })
    .selectOption("custom");
  await page.getByLabel("Longueur des tirets (px)", { exact: true }).fill("2");
  await page
    .getByLabel("Espacement des tirets (px)", { exact: true })
    .fill("6");
  await page.getByLabel("Décalage du motif (px)", { exact: true }).fill("-3");
  await page.getByLabel("Épaisseur du trait (px)", { exact: true }).fill("10");
  await saved(page);
  const original = await record(page);
  await page.reload();
  await saved(page);
  expect((await record(page)).pages).toEqual(original.pages);
  await page.getByRole("button", { name: "Fichier", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("menuitem", { name: "Sauvegarder mon projet", exact: true })
    .click();
  const file = info.outputPath("ligne.zip");
  await (await download).saveAs(file);
  const zip = await JSZip.loadAsync(await fs.readFile(file)),
    config = JSON.parse(await zip.file("presentation.json").async("string"));
  expect(config.version).toBe(23);
  expect(config.pages[0].layers[0].stroke).toEqual(
    original.pages[0].layers[0].stroke,
  );
  const context = await browser.newContext(),
    other = await context.newPage();
  await start(other);
  await other.getByTestId("zip-input").setInputFiles(file);
  await other
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmer", exact: true })
    .click();
  await saved(other);
  expect((await record(other)).pages).toEqual(original.pages);
  config.pages[0].layers[0].endpoints.x1 = 3;
  zip.file("presentation.json", JSON.stringify(config));
  const broken = info.outputPath("ligne-invalide.zip");
  await fs.writeFile(broken, await zip.generateAsync({ type: "nodebuffer" }));
  await other.getByTestId("zip-input").setInputFiles(broken);
  await expect(
    other.getByText(
      "La géométrie ou le trait d’une ligne vectorielle est invalide. Votre projet est conservé.",
      { exact: true },
    ),
  ).toBeVisible();
  expect((await record(other)).pages).toEqual(original.pages);
  await page.getByRole("button", { name: "Présentation", exact: true }).click();
  await expect(
    frame(page, l.id).locator(".vector-line-stroke"),
  ).toHaveAttribute("stroke-width", "10");
  await expect(frame(page, l.id).locator(".line-decoration")).toHaveCount(2);
  await expect(frame(page, l.id).locator(".vector-line-hit")).toHaveCount(0);
  await page.keyboard.press("f");
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await expect(frame(page, l.id).locator(".vector-line-stroke")).toBeVisible();
  await page.keyboard.press("Escape");
  await context.close();
});

test("groupes, composant, rotation, redimensionnement, Alt-copie et références conservées", async ({
  page,
}) => {
  await start(page);
  const a = await draw(page, { x: 0.2, y: 0.2 }, { x: 0.4, y: 0.3 }),
    b = await draw(page, { x: 0.5, y: 0.5 }, { x: 0.65, y: 0.55 });
  await page.locator(".editor").focus();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Control+g");
  await saved(page);
  const original = await record(page);
  await page
    .getByLabel("Nom du nouveau composant", { exact: true })
    .fill("Flèches");
  await page
    .getByRole("button", { name: "Créer un composant", exact: true })
    .click();
  await saved(page);
  await move(
    page,
    page.getByRole("button", {
      name: "Redimensionner la sélection se",
      exact: true,
    }),
    20,
    10,
    ["Shift"],
  );
  let d = await record(page);
  expect(lineLength(d.pages[0].layers[0])).toBeGreaterThan(lineLength(a));
  expect(d.pages[0].layers[0].stroke).toEqual(a.stroke);
  const angleBefore = lineAngle(d.pages[0].layers[0]);
  await move(
    page,
    page.getByRole("button", {
      name: "Faire pivoter la sélection",
      exact: true,
    }),
    25,
    12,
    ["Shift"],
  );
  d = await record(page);
  expect(
    Math.abs((lineAngle(d.pages[0].layers[0]) - angleBefore) % 15),
  ).toBeLessThan(1e-6);
  await move(
    page,
    page.getByRole("button", { name: "Déplacer la sélection", exact: true }),
    20,
    15,
    ["Alt"],
  );
  d = await record(page);
  expect(d.pages[0].layers).toHaveLength(4);
  expect(d.pages[0].componentInstances).toHaveLength(2);
  expect(new Set(d.pages[0].layers.map((l) => l.id)).size).toBe(4);
  expect(d.media).toHaveLength(original.media.length);
  await page.getByRole("button", { name: "↶ Annuler", exact: true }).click();
  await saved(page);
  expect((await record(page)).pages[0].layers).toHaveLength(2);
  await page.locator(".editor").focus();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Control+c");
  await page.keyboard.press("Control+v");
  await saved(page);
  expect((await record(page)).pages[0].layers).toHaveLength(4);
  await page.keyboard.press("Delete");
  await saved(page);
  expect((await record(page)).pages[0].layers).toHaveLength(2);
});

test("zone de sélection limitée au tracé, point magnétique et angle numérique", async ({
  page,
}) => {
  await start(page);
  const l = await draw(page, { x: 0.2, y: 0.2 }, { x: 0.75, y: 0.75 });
  const bounds = await page.locator(".editor-preview").boundingBox();
  const hit = await page.evaluate(
    ({ x, y }) =>
      document.elementFromPoint(x, y)?.closest("[data-layer-id]")?.dataset
        .layerId || null,
    { x: bounds.x + bounds.width * 0.7, y: bounds.y + bounds.height * 0.25 },
  );
  expect(hit).not.toBe(l.id);
  await page.getByLabel("Angle de la ligne (°)", { exact: true }).fill("90");
  await saved(page);
  let next = (await record(page)).pages[0].layers[0];
  expect(lineAngle(next)).toBeCloseTo(90, 7);
  await page
    .getByLabel("Longueur de la ligne (px)", { exact: true })
    .fill("200");
  await saved(page);
  expect(lineLength((await record(page)).pages[0].layers[0])).toBeCloseTo(
    200,
    4,
  );
  await page.getByLabel("X2 (px)", { exact: true }).fill("960");
  await saved(page);
  await page.getByRole("button", { name: "↶ Annuler", exact: true }).click();
  await saved(page);
  await expect(frame(page, l.id).locator(".vector-line-hit")).toHaveAttribute(
    "stroke-width",
    "10",
  );
  const endpoint = frame(page, l.id).locator(".line-endpoint-handle").last();
  const handle = await endpoint.boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.5 + 2, bounds.y + bounds.height * 0.63, { steps: 5 });
  await expect(page.locator(".layer-guide.guide-x")).toBeVisible();
  await page.mouse.up();
  await saved(page);
  expect(linePoints((await record(page)).pages[0].layers[0])[1].x).toBeCloseTo(0.5, 8);
});
