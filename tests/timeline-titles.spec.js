import fs from "node:fs/promises";
import JSZip from "jszip";
import { test, expect } from "@playwright/test";
const saved = (p) =>
  expect(p.locator(".save-status")).toContainText("Sauvegardé");
const root = (p) => p.locator(".editor-preview .milestone-timeline");
const label = (p, n) =>
  root(p)
    .locator(".milestone-node")
    .filter({ has: p.locator(`strong[title="Étape ${n}"]`) })
    .locator(".milestone-title");
const fieldX = (p) =>
  p.getByLabel("Décalage horizontal X du titre (px)", { exact: true });
const fieldY = (p) =>
  p.getByLabel("Décalage vertical Y du titre (px)", { exact: true });
async function start(p) {
  await p.goto("/");
  await saved(p);
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
async function mode(p) {
  await p
    .getByRole("button", { name: "Positionner le titre", exact: true })
    .click();
  await expect(
    p.getByRole("toolbar", { name: "Positionnement du titre", exact: true }),
  ).toBeVisible();
}
async function finish(p) {
  await p
    .getByRole("button", {
      name: "Terminer le positionnement du titre",
      exact: true,
    })
    .click();
}
async function drag(p, target, dx, dy, check) {
  const b = await target.boundingBox();
  const x = b.x + b.width / 2,
    y = b.y + b.height / 2;
  await p.mouse.move(x, y);
  await p.mouse.down();
  await p.mouse.move(x + dx, y + dy, { steps: 8 });
  if (check) await check();
  await p.mouse.up();
  await saved(p);
}
async function offsets(p, n) {
  return label(p, n).evaluate((e) => {
    const node = e.parentElement,
      a = getComputedStyle(e),
      b = getComputedStyle(node),
      scale =
        parseFloat(
          getComputedStyle(e.closest(".interactive-button-layer")).width,
        ) / 1920;
    return {
      x:
        (parseFloat(a.left) +
          parseFloat(a.width) / 2 -
          parseFloat(b.width) / 2) /
        scale,
      y: (parseFloat(a.top) - parseFloat(b.height) / 2) / scale,
    };
  });
}
test("titre : mode non destructif, glisser sans déplacer la bulle, valeurs en direct et flèches", async ({
  page,
}) => {
  await start(page);
  const before = await record(page);
  await mode(page);
  expect((await record(page)).pages).toEqual(before.pages);
  const initial = await offsets(page, 1),
    box = await label(page, 1).boundingBox(),
    scale =
      (await root(page).evaluate(
        (e) =>
          e.closest(".interactive-button-layer").getBoundingClientRect().width,
      )) / 1920;
  await drag(page, label(page, 1), 30, 20, async () => {
    await expect(fieldX(page)).not.toHaveValue("0");
    expect((await record(page)).pages).toEqual(before.pages);
  });
  let after = await record(page),
    step = after.pages[0].layers[0].timeline.steps[0];
  expect(step.titleOffset.x).toBeCloseTo(initial.x + 30 / scale, 1);
  expect(step.titleOffset.y).toBeCloseTo(initial.y + 20 / scale, 1);
  expect(after.pages[0].layers[0]).toMatchObject({
    x: before.pages[0].layers[0].x,
    y: before.pages[0].layers[0].y,
    width: before.pages[0].layers[0].width,
    height: before.pages[0].layers[0].height,
  });
  await label(page, 1).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Shift+ArrowDown");
  after = await record(page);
  expect(after.pages[0].layers[0].timeline.steps[0].titleOffset.x).toBeCloseTo(
    step.titleOffset.x + 1,
    6,
  );
  expect(after.pages[0].layers[0].timeline.steps[0].titleOffset.y).toBeCloseTo(
    step.titleOffset.y + 10,
    6,
  );
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("toolbar", { name: "Positionnement du titre", exact: true }),
  ).toHaveCount(0);
  await page.locator(".editor").focus();
  await page.keyboard.press("ArrowRight");
  await saved(page);
  expect((await record(page)).pages[0].layers[0].x).toBeCloseTo(
    before.pages[0].layers[0].x + 1 / 1920,
    6,
  );
});
test("appliquer à tous : décalages relatifs, une opération Undo, individualisation et réinitialisation", async ({
  page,
}) => {
  await start(page);
  const base = await record(page);
  await fieldX(page).fill("20");
  await fieldY(page).fill("100");
  await saved(page);
  const individual = (await record(page)).pages;
  await mode(page);
  await page
    .getByRole("toolbar", { name: "Positionnement du titre" })
    .getByRole("button", {
      name: "Appliquer ce positionnement à tous les titres",
      exact: true,
    })
    .click();
  let d = await record(page);
  expect(d.pages[0].layers[0].timeline.steps.map((s) => s.titleOffset)).toEqual(
    Array(3).fill({ x: 20, y: 100 }),
  );
  for (let i = 1; i <= 3; i++) {
    const value = await offsets(page, i);
    expect(value.x).toBeCloseTo(20, 0);
    expect(value.y).toBeCloseTo(100, 0);
  }
  await label(page, 1).focus();
  await page.keyboard.press("Control+z");
  await saved(page);
  expect((await record(page)).pages).toEqual(individual);
  await page.keyboard.press("Control+Shift+z");
  await saved(page);
  await finish(page);
  await page
    .getByRole("button", { name: "Modifier l’étape Étape 2", exact: true })
    .click();
  await fieldX(page).fill("-40");
  await saved(page);
  d = await record(page);
  expect(d.pages[0].layers[0].timeline.steps[0].titleOffset).toEqual({
    x: 20,
    y: 100,
  });
  expect(d.pages[0].layers[0].timeline.steps[1].titleOffset).toEqual({
    x: -40,
    y: 100,
  });
  await page
    .getByRole("button", {
      name: "Réinitialiser la position du titre",
      exact: true,
    })
    .click();
  await saved(page);
  expect(
    (await record(page)).pages[0].layers[0].timeline.steps[1].titleOffset,
  ).toBeUndefined();
  for (const [i, s] of (
    await record(page)
  ).pages[0].layers[0].timeline.steps.entries()) {
    const { titleOffset, ...rest } = s;
    expect(rest).toEqual(base.pages[0].layers[0].timeline.steps[i]);
  }
});
for (const zoom of [25, 50, 100])
  test(`glisser précis au zoom du canevas ${zoom} %, avec rotation`, async ({
    page,
  }) => {
    await start(page);
    await fieldX(page).fill("0");
    await fieldY(page).fill("60");
    await page.getByLabel("Rotation du calque", { exact: true }).fill("30");
    await page
      .getByLabel("Zoom en pourcentage", { exact: true })
      .fill(String(zoom));
    await saved(page);
    await mode(page);
    const screen =
      (await root(page).evaluate(
        (e) =>
          e.closest(".interactive-button-layer").getBoundingClientRect().width,
      )) / 1920;
    const before = await label(page, 1).boundingBox();
    await drag(page, label(page, 1), 24, 16);
    const d = (await record(page)).pages[0].layers[0].timeline.steps[0]
      .titleOffset;
    expect(d.x).toBeCloseTo(
      (24 * Math.cos(Math.PI / 6) + 16 * Math.sin(Math.PI / 6)) / screen,
      1,
    );
    expect(d.y).toBeCloseTo(
      60 + (-24 * Math.sin(Math.PI / 6) + 16 * Math.cos(Math.PI / 6)) / screen,
      1,
    );
    const after = await label(page, 1).boundingBox();
    expect(after.x - before.x).toBeCloseTo(24, 0);
    expect(after.y - before.y).toBeCloseTo(16, 0);
  });
test("dispositions, phases et taille des bulles : même décalage local", async ({
  page,
}) => {
  await start(page);
  await fieldX(page).fill("35");
  await fieldY(page).fill("120");
  await saved(page);
  await page
    .getByRole("button", { name: "Ajouter une phase", exact: true })
    .click();
  await page
    .getByLabel("Phase de l’étape", { exact: true })
    .selectOption({ label: "Phase 1" });
  for (const layout of ["horizontal", "vertical", "zigzag"]) {
    await page
      .getByLabel("Disposition de la ligne du temps", { exact: true })
      .selectOption(layout);
    await saved(page);
    const value = await offsets(page, 1);
    expect(value.x).toBeCloseTo(35, 0);
    expect(value.y).toBeCloseTo(120, 0);
  }
  await page
    .getByText("Apparence de la ligne du temps", { exact: true })
    .click();
  await page.getByLabel("Taille des points", { exact: true }).fill("95");
  await saved(page);
  expect(
    (await record(page)).pages[0].layers[0].timeline.steps[0].titleOffset,
  ).toEqual({ x: 35, y: 120 });
  const value = await offsets(page, 1);
  expect(value.y).toBeCloseTo(120, 0);
});
test("annuler un glisser avec Échap, changer de titre et préserver une autre Timeline", async ({
  page,
}) => {
  await start(page);
  const first = (await record(page)).pages[0].layers[0];
  await mode(page);
  const b = await label(page, 1).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + 3);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 20, b.y + 18, { steps: 5 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect((await record(page)).pages[0].layers[0].timeline).toEqual(
    first.timeline,
  );
  await label(page, 2).click();
  await expect(
    page.getByRole("toolbar", { name: "Positionnement du titre" }),
  ).toContainText("Étape 2");
  await finish(page);
  await page
    .getByRole("button", { name: "+ Ligne du temps", exact: true })
    .click();
  await saved(page);
  await fieldX(page).fill("50");
  await fieldY(page).fill("85");
  await page
    .getByRole("button", {
      name: "Appliquer ce positionnement à tous les titres",
      exact: true,
    })
    .click();
  await saved(page);
  const d = await record(page);
  expect(d.pages[0].layers[0].timeline).toEqual(first.timeline);
  expect(
    d.pages[0].layers[1].timeline.steps.every(
      (s) => s.titleOffset.x === 50 && s.titleOffset.y === 85,
    ),
  ).toBe(true);
});
test("lecture : titres attachés pendant centrage, zoom, révélation, fiche et plein écran", async ({
  page,
}) => {
  await start(page);
  await fieldX(page).fill("25");
  await fieldY(page).fill("110");
  await page
    .getByRole("button", {
      name: "Appliquer ce positionnement à tous les titres",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Centrer automatiquement l’étape active", { exact: true })
    .check();
  await page.getByLabel("Révélation progressive", { exact: true }).check();
  await page.getByLabel("Zoomer sur l’étape", { exact: true }).check();
  await saved(page);
  const original = (await record(page)).pages;
  await page
    .getByRole("button", { name: "Tester les interactions", exact: true })
    .click();
  await root(page)
    .getByRole("button", { name: "Étape Étape 1", exact: true })
    .evaluate((e) => e.click());
  await expect(root(page)).toHaveAttribute("data-zoom", "1.8");
  await expect(
    page.locator(".editor-preview").getByRole("dialog"),
  ).toBeVisible();
  const relative = async () =>
    label(page, 1).evaluate((e) => {
      const node = e.parentElement,
        dot = node.querySelector(".milestone-dot").getBoundingClientRect(),
        t = e.getBoundingClientRect(),
        host = e.closest(".interactive-button-layer"),
        scale =
          (host.getBoundingClientRect().width / 1920) *
          Number(e.closest(".milestone-timeline").dataset.zoom);
      return {
        x: (t.x + t.width / 2 - dot.x - dot.width / 2) / scale,
        y: (t.y - dot.y - dot.height / 2) / scale,
      };
    });
  await expect
    .poll(async () => Math.abs((await relative()).y - 110))
    .toBeLessThan(1);
  await page
    .getByRole("button", { name: "Fermer la fiche", exact: true })
    .click();
  await page.locator(".editor").focus();
  await page.keyboard.press("Space");
  await expect(
    root(page).getByRole("button", { name: "Étape Étape 2", exact: true }),
  ).toBeVisible();
  const attachment = await root(page)
    .locator(".milestone-canvas")
    .evaluate((c) => {
      const animation = c.getAnimations()[0];
      if (!animation) return null;
      animation.pause();
      animation.currentTime = 350;
      const title =
        c.querySelector("[data-step-id]:nth-of-type(3) .milestone-title") ||
        [...c.querySelectorAll(".milestone-title")][1];
      const dot = title.parentElement
          .querySelector(".milestone-dot")
          .getBoundingClientRect(),
        r = title.getBoundingClientRect(),
        scale =
          (c.closest(".interactive-button-layer").getBoundingClientRect()
            .width /
            1920) *
          Number(c.closest(".milestone-timeline").dataset.zoom);
      const value = {
        x: (r.x + r.width / 2 - dot.x - dot.width / 2) / scale,
        y: (r.y - dot.y - dot.height / 2) / scale,
      };
      animation.play();
      return value;
    });
  expect(attachment).not.toBeNull();
  expect(attachment.x).toBeCloseTo(25, 0);
  expect(attachment.y).toBeCloseTo(110, 0);
  expect((await record(page)).pages).toEqual(original);
  await page.getByRole("button", { name: "Présentation", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Activer ou quitter le plein écran",
      exact: true,
    })
    .click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await expect(
    page.locator(".player .milestone-title.has-title-offset"),
  ).toHaveCount(3);
  await page.keyboard.press("Escape");
});
test("sauvegarde, copie et vrai ZIP ; ancien projet sans décalage conservé", async ({
  page,
  browser,
}, info) => {
  await start(page);
  await fieldX(page).fill("20");
  await fieldY(page).fill("80");
  await page
    .getByRole("button", {
      name: "Appliquer ce positionnement à tous les titres",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Modifier l’étape Étape 2", exact: true })
    .click();
  await fieldX(page).fill("-35");
  await saved(page);
  const original = await record(page);
  await page.reload();
  await saved(page);
  expect((await record(page)).pages).toEqual(original.pages);
  await page
    .getByRole("button", {
      name: "Sélectionner le calque Ligne du temps",
      exact: true,
    })
    .click();
  await page.locator(".editor").focus();
  await page.keyboard.press("Control+c");
  await page.locator(".page-thumbnail").nth(1).click();
  await page.locator(".editor").focus();
  await page.keyboard.press("Control+v");
  await saved(page);
  let d = await record(page);
  expect(d.pages[1].layers[0].timeline).toEqual(
    original.pages[0].layers[0].timeline,
  );
  const down = page.waitForEvent("download");
  await page.getByRole("button", { name: "Fichier", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Sauvegarder mon projet", exact: true })
    .click();
  const file = info.outputPath("titres.zip");
  await (await down).saveAs(file);
  const zip = await JSZip.loadAsync(await fs.readFile(file));
  const config = JSON.parse(
    await zip.file("presentation.json").async("string"),
  );
  expect(config.version).toBe(39);
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
  expect((await record(other)).pages).toEqual(d.pages);
  await context.close();
  config.version = 32;
  config.privateMetadata = { keep: "ne pas modifier" };
  for (const p of config.pages)
    for (const l of p.layers)
      if (l.timeline) for (const s of l.timeline.steps) delete s.titleOffset;
  zip.file("presentation.json", JSON.stringify(config));
  const oldfile = info.outputPath("ancien32.zip");
  await fs.writeFile(oldfile, await zip.generateAsync({ type: "nodebuffer" }));
  await page.getByTestId("zip-input").setInputFiles(oldfile);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmer", exact: true })
    .click();
  await saved(page);
  d = await record(page);
  expect(d.pages).toEqual(config.pages);
  expect(d.privateMetadata).toEqual(config.privateMetadata);
  expect(d.version).toBe(39);
});
test("modèle : seuls les décalages changent, validation stricte, repères locaux et migration additive", async () => {
  const { createLayer, emptyPage, migrateDocument } =
    await import("../src/document.js");
  const { setTimelineTitleOffset, validTitleOffset } =
    await import("../src/timelineTitlePosition.js");
  const { validateMilestoneTimeline, timelineItems, timelineGeometry } =
    await import("../src/milestoneTimeline.js");
  const l = createLayer("milestoneTimeline");
  l.timeline.steps[0].privateMetadata = { keep: true };
  l.timeline.steps[1].titleOffset = { x: 4, y: 8, privateAnchor: "conserver" };
  const t = setTimelineTitleOffset(
    l.timeline,
    l.timeline.steps[0].id,
    { x: 20, y: 60 },
    true,
  );
  expect(t.steps.map((s) => [s.titleOffset.x, s.titleOffset.y])).toEqual([
    [20, 60],
    [20, 60],
    [20, 60],
  ]);
  expect(t.steps[0].privateMetadata).toEqual({ keep: true });
  expect(t.steps[1].titleOffset.privateAnchor).toBe("conserver");
  expect(l.timeline.steps[0].titleOffset).toBeUndefined();
  const reset = setTimelineTitleOffset(t, t.steps[0].id, null);
  expect(reset.steps[0].titleOffset).toBeUndefined();
  expect(reset.steps[1]).toEqual(t.steps[1]);
  for (const v of [
    { x: NaN, y: 0 },
    { x: Infinity, y: 0 },
    { x: 0, y: "2" },
    null,
    { x: 40000, y: 0 },
  ])
    expect(validTitleOffset(v)).toBe(false);
  const bad = structuredClone(l);
  bad.timeline.steps[0].titleOffset = { x: "20", y: 60 };
  expect(() => validateMilestoneTimeline(bad)).toThrow();
  const doc = {
    version: 32,
    pages: [{ ...emptyPage(1), layers: [l], layerOrder: [l.id] }],
    media: [],
    transitions: [],
    privateMetadata: { keep: true },
  };
  expect(migrateDocument(doc)).toEqual({ ...doc, version: 39 });
  // Shared offsets retain distinct local bubble anchors.
  const g = timelineGeometry({ ...l, timeline: t }, timelineItems(t));
  expect(
    g.points[1].x +
      t.steps[1].titleOffset.x -
      (g.points[0].x + t.steps[0].titleOffset.x),
  ).toBe(g.points[1].x - g.points[0].x);
});
test("titre au-dessus : phase réduite, ouverture non destructive et zoom interne précis", async ({
  page,
}) => {
  await start(page);
  await page
    .getByLabel("Position des titres", { exact: true })
    .selectOption("above");
  await page
    .getByRole("button", { name: "Ajouter une phase", exact: true })
    .click();
  await page
    .getByLabel("Phase de l’étape", { exact: true })
    .selectOption({ label: "Phase 1" });
  await page
    .getByLabel("Réduire la phase Phase 1 au départ", { exact: true })
    .check();
  await saved(page);
  const before = await record(page);
  await mode(page);
  await expect(label(page, 1)).toBeVisible();
  const auto = await offsets(page, 1);
  await expect
    .poll(async () =>
      Math.abs(Number(await fieldY(page).inputValue()) - auto.y),
    )
    .toBeLessThan(0.05);
  const b = await label(page, 1).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  const held = await label(page, 1).boundingBox();
  expect(held.x).toBeCloseTo(b.x, 1);
  expect(held.y).toBeCloseTo(b.y, 1);
  await page.mouse.up();
  expect((await record(page)).pages).toEqual(before.pages);
  await finish(page);
  await page
    .getByLabel("Réduire la phase Phase 1 au départ", { exact: true })
    .uncheck();
  await page.locator(".editor-preview .layer-milestoneTimeline").dblclick();
  await expect(root(page)).toHaveClass(/is-internal-editing/);
  await root(page)
    .getByRole("button", { name: "Étape Étape 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Zoom sur l’étape active", exact: true })
    .click();
  await expect(root(page)).toHaveAttribute("data-zoom", "1.8");
  await mode(page);
  const base = await offsets(page, 1),
    scale = await root(page).evaluate(
      (e) =>
        (e.closest(".interactive-button-layer").getBoundingClientRect().width /
          1920) *
        Number(e.dataset.zoom),
    );
  await drag(page, label(page, 1), 16, 12);
  const offset = (await record(page)).pages[0].layers[0].timeline.steps[0]
    .titleOffset;
  expect(offset.x).toBeCloseTo(base.x + 16 / scale, 1);
  expect(offset.y).toBeCloseTo(base.y + 12 / scale, 1);
});
