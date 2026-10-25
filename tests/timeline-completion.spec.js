import fs from "node:fs/promises";
import JSZip from "jszip";
import { test, expect } from "@playwright/test";
const saved = (p) =>
  expect(p.locator(".save-status")).toContainText("Sauvegardé");
const scene = (p) => p.locator(".editor-preview .interactive-button-layer");
const timeline = (p) => p.locator(".editor-preview .milestone-timeline");
async function start(p) {
  await p.goto("/");
  await saved(p);
}
async function add(p) {
  await p
    .getByRole("button", { name: "+ Ligne du temps", exact: true })
    .click();
  await saved(p);
}
async function record(p) {
  await saved(p);
  return p.evaluate(
    () =>
      new Promise((resolve) => {
        const r = indexedDB.open("presentation-studio", 1);
        r.onsuccess = () => {
          const db = r.result,
            t = db.transaction("documents"),
            q = t.objectStore("documents").get("current");
          q.onsuccess = () => resolve(q.result);
          t.oncomplete = () => db.close();
        };
      }),
  );
}
async function testMode(p) {
  await p
    .getByRole("button", { name: "Tester les interactions", exact: true })
    .click();
}
async function editMode(p) {
  await p
    .getByRole("button", { name: "Revenir au mode édition", exact: true })
    .click();
}
const step = (p, n) =>
  timeline(p).getByRole("button", { name: `Étape Étape ${n}`, exact: true });
async function select(p, n) {
  await step(p, n).evaluate((e) => e.click());
}
test("fond transparent indépendant, calque arrière et retour au fond coloré", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "+ Rectangle", exact: true }).click();
  await saved(page);
  await add(page);
  await page
    .getByText("Apparence de la ligne du temps", { exact: true })
    .click();
  const old = await record(page),
    layer = old.pages[0].layers.find((l) => l.type === "milestoneTimeline");
  await page.getByLabel("Arrière-plan transparent", { exact: true }).check();
  await expect(timeline(page)).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(scene(page).locator(".layer-rectangle")).toBeVisible();
  expect(
    (await record(page)).pages[0].layers.find((l) => l.id === layer.id).opacity,
  ).toBe(1);
  await page.getByLabel("Arrière-plan transparent", { exact: true }).uncheck();
  await expect(timeline(page)).toHaveCSS("background-color", "rgb(23, 25, 35)");
  await testMode(page);
  await select(page, 1);
  await expect(scene(page).getByRole("dialog")).toHaveCSS(
    "background-color",
    "rgb(36, 38, 50)",
  );
});
test("débordement Timeline uniquement : champs, souris, poignées hors page, duplication et clipping", async ({
  page,
}) => {
  await start(page);
  await add(page);
  await page.getByLabel("Largeur du calque (%)", { exact: true }).fill("400");
  await page.getByLabel("Hauteur du calque (%)", { exact: true }).fill("250");
  await page.getByLabel("X du calque (%)", { exact: true }).fill("-120");
  await page.getByLabel("Y du calque (%)", { exact: true }).fill("-60");
  await saved(page);
  let d = await record(page),
    l = d.pages[0].layers[0];
  expect(l).toMatchObject({ width: 4, height: 2.5, x: -1.2, y: -0.6 });
  await page
    .getByRole("button", { name: "Ajuster la sélection", exact: true })
    .click();
  const handle = scene(page).locator(".timeline-frame .handle-se");
  await expect(handle).toBeInViewport();
  const b = await handle.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 25, b.y + b.height / 2 + 20, {
    steps: 5,
  });
  await page.mouse.up();
  await saved(page);
  expect((await record(page)).pages[0].layers[0].width).toBeGreaterThan(4);
  const movedFrom = (await record(page)).pages[0].layers[0].x;
  await drag(page, timeline(page), 25, 10);
  expect((await record(page)).pages[0].layers[0].x).toBeGreaterThan(movedFrom);
  await page
    .getByRole("button", { name: "Dupliquer le calque", exact: true })
    .click();
  await saved(page);
  expect((await record(page)).pages[0].layers[1].width).toBeGreaterThan(4);
  await testMode(page);
  await expect(page.locator(".stage.editor-preview")).toHaveCSS(
    "overflow",
    "hidden",
  );
  await page.getByRole("button", { name: "Présentation", exact: true }).click();
  await expect(page.locator(".player .stage")).toHaveCSS("overflow", "hidden");
});
test("modèle : limites étendues ciblées et géométrie des autres calques conservée", async () => {
  const { createLayer, emptyPage, validatePageLayers } =
    await import("../src/document.js");
  const { translated } = await import("../src/manipulation.js");
  const l = {
      ...createLayer("milestoneTimeline"),
      x: -2,
      y: -3,
      width: 4,
      height: 5,
    },
    p = { ...emptyPage(1), layers: [l], layerOrder: [l.id] };
  expect(() => validatePageLayers(p, () => true)).not.toThrow();
  expect(translated([l], -1, 2)[l.id]).toEqual({ x: -3, y: -1 });
  const rectangle = { ...createLayer("rectangle"), x: -2 };
  expect(() =>
    validatePageLayers(
      { ...p, layers: [rectangle], layerOrder: [rectangle.id] },
      () => true,
    ),
  ).toThrow();
});
test("zoom et fiche indépendants, combinaison puis compatibilité des anciens clics", async ({
  page,
}) => {
  await start(page);
  await add(page);
  await page.getByLabel("Zoomer sur l’étape", { exact: true }).check();
  await page
    .getByLabel("Afficher la fiche d’information", { exact: true })
    .check();
  await saved(page);
  await testMode(page);
  await select(page, 1);
  await expect(timeline(page)).toHaveAttribute("data-zoom", "1.8");
  await expect(scene(page).getByRole("dialog")).toBeVisible();
  await editMode(page);
  await page
    .getByLabel("Afficher la fiche d’information", { exact: true })
    .uncheck();
  await saved(page);
  await testMode(page);
  await select(page, 1);
  await expect(timeline(page)).toHaveAttribute("data-zoom", "1.8");
  await expect(scene(page).getByRole("dialog")).toHaveCount(0);
  await editMode(page);
  await page
    .getByLabel("Clic sur l’étape", { exact: true })
    .selectOption("card");
  await saved(page);
  await testMode(page);
  await select(page, 1);
  await expect(timeline(page)).toHaveAttribute("data-zoom", "1");
  await expect(scene(page).getByRole("dialog")).toBeVisible();
});
async function drag(p, locator, dx, dy) {
  const b = await locator.boundingBox();
  await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await p.mouse.down();
  await p.mouse.move(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy, {
    steps: 8,
  });
  await p.mouse.up();
  await saved(p);
}
test("fiches : déplacement et redimensionnement visuels, héritage et surcharge individuelle, Undo/Redo", async ({
  page,
}) => {
  await start(page);
  await add(page);
  const original = (await record(page)).pages[0].layers[0];
  await page
    .getByRole("button", {
      name: "Modifier la fiche dans la page",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Terminer la fiche", exact: true }),
  ).toBeVisible();
  await drag(
    page,
    page.getByRole("button", { name: "Déplacer la fiche", exact: true }),
    32,
    18,
  );
  let common = (await record(page)).pages[0].layers[0].timeline.design
    .cardLayout;
  expect(common.x).toBeGreaterThan(original.timeline.design.cardLayout.x);
  expect(common.y).toBeGreaterThan(original.timeline.design.cardLayout.y);
  await drag(
    page,
    page.getByRole("button", {
      name: "Redimensionner la fiche se",
      exact: true,
    }),
    25,
    20,
  );
  let after = (await record(page)).pages[0].layers[0];
  expect(after.timeline.design.cardLayout.width).toBeGreaterThan(common.width);
  await page
    .getByRole("button", { name: "Déplacer la fiche", exact: true })
    .focus();
  await page.keyboard.press("Control+z");
  await saved(page);
  expect(
    (await record(page)).pages[0].layers[0].timeline.design.cardLayout,
  ).toEqual(common);
  await page.keyboard.press("Control+Shift+z");
  await saved(page);
  expect(
    (await record(page)).pages[0].layers[0].timeline.design.cardLayout,
  ).toEqual(after.timeline.design.cardLayout);
  await page
    .getByRole("button", { name: "Terminer la fiche", exact: true })
    .click();
  await page.locator(".editor").focus();
  await page.keyboard.press("Control+z");
  await saved(page);
  expect(
    (await record(page)).pages[0].layers[0].timeline.design.cardLayout,
  ).toEqual(common);
  await page.keyboard.press("Control+Shift+z");
  await saved(page);
  expect(
    (await record(page)).pages[0].layers[0].timeline.design.cardLayout,
  ).toEqual(after.timeline.design.cardLayout);
  await page
    .getByRole("button", { name: "Modifier l’étape Étape 2", exact: true })
    .click();
  await page
    .getByLabel("Disposition de la fiche de l’étape", { exact: true })
    .selectOption("individual");
  await page.getByLabel("X de la fiche (%)", { exact: true }).fill("60");
  await page.getByLabel("Largeur de la fiche (%)", { exact: true }).fill("30");
  await saved(page);
  let d = await record(page),
    individual = d.pages[0].layers[0].timeline.steps[1].cardLayout;
  expect(individual.x).toBe(0.6);
  await page
    .getByRole("button", { name: "Modifier l’étape Étape 1", exact: true })
    .click();
  await page.getByLabel("X de la fiche (%)", { exact: true }).fill("10");
  await saved(page);
  d = await record(page);
  expect(d.pages[0].layers[0].timeline.steps[1].cardLayout).toEqual(individual);
  await page
    .getByRole("button", { name: "Modifier l’étape Étape 2", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Réinitialiser la disposition individuelle",
      exact: true,
    })
    .click();
  await saved(page);
  expect(
    (await record(page)).pages[0].layers[0].timeline.steps[1].cardLayout,
  ).toBeNull();
  await page.reload();
  await saved(page);
  await testMode(page);
  await select(page, 2);
  const box = await scene(page)
      .locator(".milestone-card-position")
      .boundingBox(),
    stage = await scene(page).boundingBox();
  expect(box.x).toBeCloseTo(stage.x + 0.1 * stage.width, 0);
});
async function centredInSlide(p, n, layout, zoom = false, scope = timeline(p)) {
  await expect
    .poll(() =>
      scope.evaluate(
        (r, { n, layout, zoom }) => {
          const slide = r
              .closest(".interactive-button-layer")
              .getBoundingClientRect(),
            b = [...r.querySelectorAll(".milestone-node")]
              .find((e) => e.getAttribute("aria-label") === `Étape Étape ${n}`)
              ?.getBoundingClientRect();
          return b
            ? Math.max(
                layout === "vertical" && !zoom
                  ? 0
                  : Math.abs(b.x + b.width / 2 - slide.x - slide.width / 2),
                layout === "horizontal" && !zoom
                  ? 0
                  : Math.abs(b.y + b.height / 2 - slide.y - slide.height / 2),
              )
            : 999;
        },
        { n, layout, zoom },
      ),
    )
    .toBeLessThan(2);
}
for (const layout of ["horizontal", "vertical", "zigzag"])
  test(`diapositive : centrage ${layout} hors page, mouvement, zoom + fiche fixe et révélation`, async ({
    page,
  }) => {
    await start(page);
    await add(page);
    await page
      .getByLabel("Disposition de la ligne du temps", { exact: true })
      .selectOption(layout);
    await page
      .getByLabel("Largeur du calque (%)", { exact: true })
      .fill(layout === "vertical" ? "70" : "400");
    await page
      .getByLabel("Hauteur du calque (%)", { exact: true })
      .fill(layout === "horizontal" ? "50" : "300");
    await page
      .getByLabel("X du calque (%)", { exact: true })
      .fill(layout === "vertical" ? "15" : "-100");
    await page
      .getByLabel("Y du calque (%)", { exact: true })
      .fill(layout === "horizontal" ? "25" : "-80");
    await page
      .getByLabel("Centrer automatiquement l’étape active", { exact: true })
      .check();
    await page.getByLabel("Révélation progressive", { exact: true }).check();
    await page.getByLabel("Zoomer sur l’étape", { exact: true }).check();
    await saved(page);
    const original = (await record(page)).pages;
    await testMode(page);
    await centredInSlide(page, 1, layout);
    await select(page, 1);
    await centredInSlide(page, 1, layout, true);
    await expect(scene(page).getByRole("dialog")).toBeVisible();
    const before = await scene(page)
      .locator(".milestone-card-position")
      .boundingBox();
    await page.setViewportSize({ width: 1280, height: 1000 });
    await centredInSlide(page, 1, layout, true);
    const sceneBox = await scene(page).boundingBox(),
      card = await scene(page)
        .locator(".milestone-card-position")
        .boundingBox();
    expect(card.width / sceneBox.width).toBeCloseTo(0.24, 3);
    await page
      .getByRole("button", { name: "Fermer la fiche", exact: true })
      .click();
    await page.locator(".editor").focus();
    await page.keyboard.press("Space");
    await centredInSlide(page, 2, layout, true);
    await expect(timeline(page)).toHaveCount(1);
    expect((await record(page)).pages).toEqual(original);
  });
test("24 étapes, médias, fiches communes et individuelles : recharge, vrai ZIP, présentation et ancien projet", async ({
  page,
  browser,
}, info) => {
  await start(page);
  await add(page);
  for (let i = 3; i < 24; i++)
    await page
      .getByRole("button", { name: "Ajouter une étape", exact: true })
      .click();
  await page
    .getByRole("button", { name: "Modifier l’étape Étape 2", exact: true })
    .click();
  await page.getByLabel("Zoomer sur l’étape", { exact: true }).check();
  await page
    .getByLabel("Disposition de la fiche de l’étape", { exact: true })
    .selectOption("individual");
  await page.getByLabel("X de la fiche (%)", { exact: true }).fill("65");
  await page.getByLabel("Y de la fiche (%)", { exact: true }).fill("5");
  await page.getByLabel("Largeur de la fiche (%)", { exact: true }).fill("30");
  await page
    .getByRole("button", { name: "Importer l’image de l’étape", exact: true })
    .click();
  await page
    .getByTestId("media-input")
    .setInputFiles("public/slides/ocean.png");
  await saved(page);
  await page
    .getByRole("button", { name: "Importer la vidéo de l’étape", exact: true })
    .click();
  await page
    .getByTestId("media-input")
    .setInputFiles("tests/fixtures/crop-landscape.mp4");
  await saved(page);
  await page.getByLabel("Largeur du calque (%)", { exact: true }).fill("400");
  await page.getByLabel("X du calque (%)", { exact: true }).fill("-100");
  await page
    .getByLabel("Centrer automatiquement l’étape active", { exact: true })
    .check();
  await page
    .getByText("Apparence de la ligne du temps", { exact: true })
    .click();
  await page.getByLabel("Arrière-plan transparent", { exact: true }).check();
  await saved(page);
  const original = await record(page);
  expect(original.pages[0].layers[0].timeline.steps).toHaveLength(24);
  await page.reload();
  await saved(page);
  expect((await record(page)).pages).toEqual(original.pages);
  const down = page.waitForEvent("download");
  await page.getByRole("button", { name: "Fichier", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Sauvegarder mon projet", exact: true })
    .click();
  const path = info.outputPath("timeline-complete.zip");
  await (await down).saveAs(path);
  const zip = await JSZip.loadAsync(await fs.readFile(path)),
    config = JSON.parse(await zip.file("presentation.json").async("string"));
  expect(config.version).toBe(32);
  expect(config.pages[0].layers[0].timeline).toEqual(
    original.pages[0].layers[0].timeline,
  );
  const context = await browser.newContext(),
    other = await context.newPage();
  await start(other);
  await other.getByTestId("zip-input").setInputFiles(path);
  await other
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmer", exact: true })
    .click();
  await saved(other);
  const restored = await record(other);
  expect(restored.pages).toEqual(original.pages);
  expect(restored.media.map((m) => ({ id: m.id, size: m.blob.size }))).toEqual(
    original.media.map((m) => ({ id: m.id, size: m.blob.size })),
  );
  await testMode(other);
  await select(other, 2);
  await centredInSlide(other, 2, "horizontal", true);
  let card = scene(other).getByRole("dialog");
  await expect(card.locator("img")).toBeVisible();
  await expect(card.locator("video")).toHaveJSProperty("paused", true);
  let r = await scene(other).boundingBox(),
    c = await card.boundingBox();
  expect(c.x).toBeCloseTo(r.x + r.width * 0.65, 0);
  expect(c.width).toBeCloseTo(r.width * 0.3, 0);
  await other
    .getByRole("button", { name: "Présentation", exact: true })
    .click();
  const player = other.locator(".player .milestone-timeline");
  await player
    .getByRole("button", { name: "Étape Étape 2", exact: true })
    .evaluate((e) => e.click());
  await centredInSlide(other, 2, "horizontal", true, player);
  await expect(
    other.locator(".player").getByRole("dialog").locator("video"),
  ).toHaveJSProperty("controls", true);
  await other.screenshot({ path: info.outputPath("timeline-24-fiche.png") });
  await context.close();
  // Restore an actual legacy ZIP, preserving its configuration and unknown metadata.
  const legacy = structuredClone(config);
  legacy.version = 31;
  legacy.privateMetadata = { keep: "ancienne présentation" };
  const l = legacy.pages[0].layers[0];
  Object.assign(l, { x: 0.1, y: 0.25, width: 0.8, height: 0.5 });
  delete l.timeline.design.backgroundTransparent;
  delete l.timeline.design.cardLayout;
  for (const s of l.timeline.steps) {
    delete s.zoomOnSelect;
    delete s.cardOnSelect;
    delete s.cardLayout;
  }
  zip.file("presentation.json", JSON.stringify(legacy));
  const legacyPath = info.outputPath("timeline-v31.zip");
  await fs.writeFile(
    legacyPath,
    await zip.generateAsync({ type: "nodebuffer" }),
  );
  await page.getByTestId("zip-input").setInputFiles(legacyPath);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmer", exact: true })
    .click();
  await saved(page);
  const old = await record(page);
  expect(old.pages).toEqual(legacy.pages);
  expect(old.privateMetadata).toEqual(legacy.privateMetadata);
  expect(old.version).toBe(32);
  await testMode(page);
  await select(page, 2);
  await expect(timeline(page).getByRole("dialog")).toBeVisible();
});
test("Timeline entièrement hors page : point cliquable centré dans la diapositive, fiche fixe et plein écran", async ({
  page,
}) => {
  await start(page);
  await add(page);
  await page.getByLabel("X du calque (%)", { exact: true }).fill("140");
  await page.getByLabel("Y du calque (%)", { exact: true }).fill("130");
  await page.getByLabel("Zoomer sur l’étape", { exact: true }).check();
  await page
    .getByLabel("Centrer automatiquement l’étape active", { exact: true })
    .check();
  await saved(page);
  await testMode(page);
  // A zoom explicitly centres both axes, including a component outside the slide.
  await select(page, 1);
  await centredInSlide(page, 1, "horizontal", true);
  await expect(step(page, 1)).toBeInViewport();
  await page
    .getByRole("button", { name: "Fermer la fiche", exact: true })
    .click();
  await step(page, 1).click();
  await expect(scene(page).getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Présentation", exact: true }).click();
  const player = page.locator(".player .milestone-timeline");
  await player
    .getByRole("button", { name: "Étape Étape 1", exact: true })
    .evaluate((e) => e.click());
  await centredInSlide(page, 1, "horizontal", true, player);
  await page
    .getByRole("button", {
      name: "Activer ou quitter le plein écran",
      exact: true,
    })
    .click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await centredInSlide(page, 1, "horizontal", true, player);
  await page.keyboard.press("Escape");
});
test("modèle : dispositions facultatives strictes, copie, composants liés et centre avec rotation", async () => {
  const {
    createLayer,
    emptyPage,
    normalizeDocument,
    migrateDocument,
    validatePageLayers,
  } = await import("../src/document.js");
  const { timelineSlideCentre, validateMilestoneTimeline } =
    await import("../src/milestoneTimeline.js");
  const { copySelection } = await import("../src/visualGroups.js");
  const { createComponent, insertComponent, publishComponent } =
    await import("../src/componentsModel.js");
  const l = {
    ...createLayer("milestoneTimeline"),
    x: -1,
    y: -0.4,
    width: 4,
    height: 2,
    rotation: 30,
  };
  l.timeline.steps[1].cardLayout = { x: 0.6, y: 0.1, width: 0.3, height: 0.5 };
  l.timeline.steps[1].zoomOnSelect = true;
  l.timeline.design.backgroundTransparent = true;
  let doc = normalizeDocument({
    version: 32,
    pages: [{ ...emptyPage(1), layers: [l], layerOrder: [l.id] }],
    media: [],
    transitions: [],
    privateMetadata: { keep: true },
  });
  const copy = copySelection(doc.pages[0], [l.id], doc, emptyPage(2));
  expect(copy.layers[0].timeline).toEqual(l.timeline);
  expect(copy.layers[0].x).toBe(l.x);
  doc = createComponent(doc, doc.pages[0], [l.id], "Grande timeline");
  const inserted = insertComponent(doc, doc.components[0], doc.pages[0]);
  expect(inserted.layers[1].width).toBe(4);
  expect(inserted.layers[1].timeline).toEqual(l.timeline);
  expect(() => validatePageLayers(inserted, () => true)).not.toThrow();
  const modified = {
    ...inserted,
    layers: inserted.layers.map((v, i) =>
      i === 0
        ? {
            ...v,
            timeline: {
              ...v.timeline,
              design: {
                ...v.timeline.design,
                cardLayout: { x: 0.05, y: 0.6, width: 0.35, height: 0.3 },
              },
            },
          }
        : v,
    ),
  };
  const published = publishComponent(
    { ...doc, pages: [modified] },
    modified,
    modified.componentInstances[0],
    [l.id],
  );
  expect(published.pages[0].layers[1].width).toBe(4);
  expect(published.pages[0].layers[1].timeline.design.cardLayout).toEqual({
    x: 0.05,
    y: 0.6,
    width: 0.35,
    height: 0.3,
  });
  expect(published.pages[0].layers[1].timeline.steps[1].cardLayout).toEqual(
    l.timeline.steps[1].cardLayout,
  );
  const centre = timelineSlideCentre(l, 1920, 1080),
    a = (l.rotation * Math.PI) / 180,
    dx = centre.x - (l.width * 1920) / 2,
    dy = centre.y - (l.height * 1080) / 2;
  expect(
    (l.x + l.width / 2) * 1920 + dx * Math.cos(a) - dy * Math.sin(a),
  ).toBeCloseTo(960, 6);
  expect(
    (l.y + l.height / 2) * 1080 + dx * Math.sin(a) + dy * Math.cos(a),
  ).toBeCloseTo(540, 6);
  const invalid = structuredClone(l);
  invalid.timeline.steps[0].cardLayout = {
    x: 0.9,
    y: 0,
    width: 0.5,
    height: 0.4,
  };
  expect(() => validateMilestoneTimeline(invalid)).toThrow();
  const old = structuredClone(doc);
  old.version = 31;
  delete old.pages[0].layers[0].timeline.design.cardLayout;
  expect(migrateDocument(old)).toEqual({ ...old, version: 32 });
});

test("grande Timeline : commandes et phases accessibles dans le plan de la diapositive", async ({
  page,
}) => {
  await start(page);
  await add(page);
  await page
    .getByRole("button", { name: "Ajouter une phase", exact: true })
    .click();
  await page
    .getByLabel("Phase de l’étape", { exact: true })
    .selectOption({ label: "Phase 1" });
  await page.getByLabel("Largeur du calque (%)", { exact: true }).fill("400");
  await page.getByLabel("X du calque (%)", { exact: true }).fill("-100");
  await page
    .getByLabel("Centrer automatiquement l’étape active", { exact: true })
    .check();
  await page.getByLabel("Révélation progressive", { exact: true }).check();
  await saved(page);
  await testMode(page);
  await page
    .getByRole("button", { name: "Étape suivante", exact: true })
    .click();
  await centredInSlide(page, 2, "horizontal");
  await expect(
    page.getByRole("button", {
      name: "Zoomer sur la phase Phase 1",
      exact: true,
    }),
  ).toBeInViewport();
});
