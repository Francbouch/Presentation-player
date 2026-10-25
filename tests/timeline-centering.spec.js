import fs from "node:fs/promises";
import JSZip from "jszip";
import { test, expect } from "@playwright/test";
const saved = (p) =>
  expect(p.locator(".save-status")).toContainText("Sauvegardé");
const root = (p) => p.locator(".editor-preview .milestone-timeline");
const node = (p, n) =>
  root(p).getByRole("button", { name: `Étape Étape ${n}`, exact: true });
async function read(p) {
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
async function setup(p) {
  await p.goto("/");
  await saved(p);
  await p
    .getByRole("button", { name: "+ Ligne du temps", exact: true })
    .click();
  await saved(p);
  await p
    .getByLabel("Centrer automatiquement l’étape active", { exact: true })
    .check();
  await saved(p);
}
async function testing(p) {
  await p
    .getByRole("button", { name: "Tester les interactions", exact: true })
    .click();
}
async function choose(p, n) {
  await node(p, n).evaluate((el) => el.click());
}
async function centered(p, n, scope = root(p)) {
  await expect
    .poll(async () =>
      scope.evaluate((r, n) => {
        const v = r.querySelector(".milestone-viewport"),
          b = [...r.querySelectorAll(".milestone-node")].find(
            (b) => b.getAttribute("aria-label") === `Étape Étape ${n}`,
          );
        if (!b) return 999;
        const a = r.closest(".interactive-button-layer").getBoundingClientRect(),
          c = b.getBoundingClientRect();
        const layout=r.dataset.layout,zoom=Number(r.dataset.zoom)>1;
        return Math.max(
          layout==='vertical'&&!zoom?0:Math.abs(c.x+c.width/2-a.x-a.width/2),
          layout==='horizontal'&&!zoom?0:Math.abs(c.y+c.height/2-a.y-a.height/2));
      }, n),
    )
    .toBeLessThan(2);
}
for (const layout of ["horizontal", "vertical", "zigzag"])
  test(`centrage ${layout} : animation intermédiaire, précédent, saut rapide et redimensionnement`, async ({
    page,
  }) => {
    await setup(page);
    await page
      .getByLabel("Disposition de la ligne du temps", { exact: true })
      .selectOption(layout);
    await saved(page);
    const before = await read(page);
    await testing(page);
    await choose(page, 1);
    await centered(page, 1);
    const from = await root(page)
      .locator(".milestone-canvas")
      .evaluate((c) => getComputedStyle(c).transform);
    await choose(page, 3);
    const running = await root(page)
      .locator(".milestone-canvas")
      .evaluate((c) => {
        const a = c.getAnimations()[0];
        return {
          duration: a?.effect.getTiming().duration,
          easing: a?.effect.getTiming().easing,
          from: a?.effect.getKeyframes()[0].transform,
        };
      });
    expect(running.duration).toBe(700);
    expect(running.easing).toBe("ease-in-out");
    expect(running.from).toBe(from);
    const middle = await root(page)
      .locator(".milestone-canvas")
      .evaluate((c) => {
        const a = c.getAnimations()[0];
        a.currentTime = 350;
        return {
          matrix: getComputedStyle(c).transform,
          end: new DOMMatrix(
            a.effect.getKeyframes().at(-1).transform,
          ).toString(),
        };
      });
    expect(middle.matrix).not.toBe(from);
    expect(middle.matrix).not.toBe(middle.end);
    await centered(page, 3);
    await choose(page, 2);
    await centered(page, 2);
    await choose(page, 1);
    await page.waitForTimeout(100);
    const retarget = await root(page)
      .locator(".milestone-canvas")
      .evaluate((c) => {
        const current = getComputedStyle(c).transform;
        const buttons = c.querySelectorAll(".milestone-node");
        buttons[2].click();
        return current;
      });
    const nextFrom = await root(page)
      .locator(".milestone-canvas")
      .evaluate(
        (c) => c.getAnimations()[0]?.effect.getKeyframes()[0].transform,
      );
    // Retargeting starts at the rendered position, never the previous endpoint.
    expect(nextFrom).toBeTruthy();
    expect(retarget).not.toBe("none");
    expect(
      await root(page)
        .locator(".milestone-canvas")
        .evaluate((c, current) => {
          const a = new DOMMatrix(current),
            b = new DOMMatrix(
              c.getAnimations()[0].effect.getKeyframes()[0].transform,
            );
          return Math.max(Math.abs(a.e - b.e), Math.abs(a.f - b.f));
        }, retarget),
    ).toBeLessThan(25);
    expect(
      await root(page)
        .locator(".milestone-canvas")
        .evaluate((c) => c.getAnimations().length),
    ).toBe(1);
    await centered(page, 3);
    await page.setViewportSize({ width: 1200, height: 900 });
    await centered(page, 3);
    expect((await read(page)).pages).toEqual(before.pages);
  });
test("zoom coordonné, fiche fixe et retour édition sans transformation persistante", async ({
  page,
}) => {
  await setup(page);
  await page
    .getByLabel("Clic sur l’étape", { exact: true })
    .selectOption("zoom");
  await saved(page);
  await testing(page);
  await choose(page, 1);
  await centered(page, 1);
  expect(
    await root(page)
      .locator(".milestone-canvas")
      .evaluate((c) => new DOMMatrix(getComputedStyle(c).transform).a),
  ).toBeCloseTo(1.8);
  await page
    .getByRole("button", { name: "Revenir au mode édition", exact: true })
    .click();
  await page
    .getByLabel("Clic sur l’étape", { exact: true })
    .selectOption("card");
  await saved(page);
  await testing(page);
  await choose(page, 1);
  const card = page.locator(".editor-preview").getByRole("dialog");
  await expect(card).toBeVisible();
  const movingBox = await card.boundingBox();
  await centered(page, 1);
  const box = await card.boundingBox();
  expect(Math.abs(box.x - movingBox.x)).toBeLessThan(1);
  expect(Math.abs(box.y - movingBox.y)).toBeLessThan(1);
  await page.setViewportSize({ width: 1430, height: 1050 });
  await centered(page, 1);
  expect((await card.boundingBox()).width).toBeCloseTo(box.width, -1);
  await page
    .getByRole("button", { name: "Revenir au mode édition", exact: true })
    .click();
  await expect(root(page).locator(".milestone-viewport")).not.toHaveClass(
    /is-centering/,
  );
});
test("révélation Espace puis navigation, réduction des mouvements et présentation", async ({
  page,
}) => {
  await setup(page);
  await page.getByLabel("Révélation progressive", { exact: true }).check();
  await saved(page);
  await testing(page);
  await page.locator(".editor").focus();
  await page.keyboard.press("Space");
  await centered(page, 2);
  await expect(root(page)).toHaveCount(1);
  await page
    .getByRole("button", { name: "Étape suivante", exact: true })
    .click();
  await centered(page, 3);
  await page
    .getByRole("button", { name: "Étape précédente", exact: true })
    .click();
  await centered(page, 2);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await choose(page, 1);
  await centered(page, 1);
  expect(
    await root(page)
      .locator(".milestone-canvas")
      .evaluate((c) => c.getAnimations().length),
  ).toBe(0);
  await page.getByRole("button", { name: "Présentation", exact: true }).click();
  const player = page.locator(".player .milestone-timeline");
  await expect(player).toBeVisible();
  await player
    .getByRole("button", { name: "Étape Étape 1", exact: true })
    .click();
  await centered(page, 1, player);
  await page
    .getByRole("button", {
      name: "Activer ou quitter le plein écran",
      exact: true,
    })
    .click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await centered(page, 1, player);
  await page.keyboard.press("Escape");
});
test("réglages, Undo/Redo, rechargement et export/import ZIP réel", async ({
  page,
  browser,
}, info) => {
  await setup(page);
  const duration = page.getByLabel("Durée du déplacement (ms)", {
    exact: true,
  });
  await duration.fill("1200");
  await duration.blur();
  await page
    .getByLabel("Courbe du déplacement", { exact: true })
    .selectOption("linear");
  await saved(page);
  await page.locator(".editor").focus();
  await page.keyboard.press("Control+z");
  await saved(page);
  await expect(
    page.getByLabel("Courbe du déplacement", { exact: true }),
  ).toHaveValue("ease-in-out");
  await page.keyboard.press("Control+Shift+z");
  await saved(page);
  await expect(
    page.getByLabel("Courbe du déplacement", { exact: true }),
  ).toHaveValue("linear");
  const before = await read(page);
  await page.reload();
  await saved(page);
  expect((await read(page)).pages).toEqual(before.pages);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Fichier", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Sauvegarder mon projet", exact: true })
    .click();
  const file = info.outputPath("centrage.zip");
  await (await download).saveAs(file);
  const zip = await JSZip.loadAsync(await fs.readFile(file));
  expect(
    JSON.parse(await zip.file("presentation.json").async("string")).version,
  ).toBe(34);
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
  expect((await read(other)).pages).toEqual(before.pages);
  await context.close();
  await testing(page);
  await choose(page, 2);
  const timing = await root(page)
    .locator(".milestone-canvas")
    .evaluate((c) => c.getAnimations()[0]?.effect.getTiming());
  expect(timing.duration).toBe(1200);
  expect(timing.easing).toBe("linear");
  await centered(page, 2);
});
test("ancien document 30 intact et validation des options facultatives", async () => {
  const { createLayer, emptyPage, migrateDocument } =
    await import("../src/document.js");
  const { validateMilestoneTimeline } =
    await import("../src/milestoneTimeline.js");
  const l = createLayer("milestoneTimeline");
  for (const key of [
    "autoCenter",
    "centerAnimated",
    "centerDuration",
    "centerEasing",
  ])
    delete l.timeline.design[key];
  const doc = {
    version: 30,
    pages: [{ ...emptyPage(1), layers: [l], layerOrder: [l.id] }],
    media: [],
    transitions: [],
    privateMetadata: { keep: true },
  };
  const old = structuredClone(doc);
  expect(migrateDocument(doc)).toEqual({ ...old, version: 34 });
  expect(() => validateMilestoneTimeline(l)).not.toThrow();
  l.timeline.design.centerDuration = 199;
  expect(() => validateMilestoneTimeline(l)).toThrow();
  delete l.timeline.design.centerDuration;
  l.timeline.design.centerEasing = "invalid";
  expect(() => validateMilestoneTimeline(l)).toThrow();
});

for (const easing of ["ease-in-out", "ease-out", "linear"])
  test(`courbe ${easing}, durée minimale et animation désactivée`, async ({
    page,
  }) => {
    await setup(page);
    await page
      .getByLabel("Durée du déplacement (ms)", { exact: true })
      .fill("200");
    await page
      .getByLabel("Courbe du déplacement", { exact: true })
      .selectOption(easing);
    await saved(page);
    await testing(page);
    await choose(page, 1);
    const timing = await root(page).locator(".milestone-canvas")
      .evaluate(c => c.getAnimations()[0]?.effect.getTiming());
    expect(timing.duration).toBe(200);
    expect(timing.easing).toBe(easing);
    await centered(page, 1);
    await page
      .getByRole("button", { name: "Revenir au mode édition", exact: true })
      .click();
    await page
      .getByLabel("Animation du déplacement", { exact: true })
      .uncheck();
    await saved(page);
    await testing(page);
    await choose(page, 3);
    await centered(page, 3);
    expect(
      await root(page)
        .locator(".milestone-canvas")
        .evaluate((c) => c.getAnimations().length),
    ).toBe(0);
  });

test("annulation du déplacement au changement de page", async ({ page }) => {
  await setup(page);
  await page.getByRole("button", { name: "Présentation", exact: true }).click();
  const player = page.locator(".player .milestone-timeline");
  await player
    .getByRole("button", { name: "Étape Étape 3", exact: true })
    .click();
  const animation = await player
    .locator(".milestone-canvas")
    .evaluateHandle((c) => c.getAnimations()[0]);
  await page
    .getByRole("button", { name: "Diapositive suivante", exact: true })
    .click();
  await expect(player).toHaveCount(0, { timeout: 10000 });
  expect(await animation.evaluate((a) => a.playState)).toBe("idle");
  await animation.dispose();
});
