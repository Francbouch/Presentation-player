import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
const saved = (p) =>
  expect(p.locator(".save-status")).toContainText("Sauvegardé");
async function record(p) {
  await saved(p);
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
async function open(p, label) {
  const summary = p
    .locator(".button-customization")
    .locator("summary")
    .filter({ hasText: new RegExp(`^${label}$`) });
  if (!(await summary.evaluate((s) => s.parentElement.open)))
    await summary.click();
}
async function add(p, name, x = 10) {
  await p.getByRole("button", { name: "+ Bouton", exact: true }).click();
  await p.getByLabel("Nom du bouton", { exact: true }).fill(name);
  await p
    .getByLabel("Position horizontale du bouton (%)", { exact: true })
    .fill(String(x));
  await expect(p.getByLabel("Type d’action", { exact: true })).toHaveValue("");
}
const button = (p, name) =>
  p.locator(".slide").getByRole("button", { name, exact: true });
async function testMode(p) {
  await p
    .getByRole("button", { name: "Tester les interactions", exact: true })
    .click();
}
async function edit(p) {
  await p
    .getByRole("button", { name: "Revenir au mode édition", exact: true })
    .click();
}
async function effects(p, values) {
  await open(p, "Effets interactifs");
  for (const [key, value] of Object.entries(values))
    await p.getByLabel(key, { exact: true }).selectOption(value);
}
async function check(p) {
  await open(p, "Indicateur de sélection");
  await p.getByLabel("Afficher une coche lorsque sélectionné").check();
}
async function group(p, name, create = false) {
  await open(p, "Groupe de sélection");
  if (create) {
    await p.getByLabel("Nouveau groupe", { exact: true }).fill(name);
    await p
      .getByRole("button", { name: "Créer le groupe", exact: true })
      .click();
  } else
    await p
      .getByLabel("Groupe de sélection", { exact: true })
      .selectOption(name);
}
test("Aucune : survol, clic temporaire et sélection indépendante cumulés, sans changement fonctionnel", async ({
  page,
}) => {
  await start(page);
  await add(page, "Accent");
  await effects(page, {
    "Au survol": "glow",
    "Au clic": "scale",
    "Lorsque sélectionné": "glow",
  });
  await page.getByLabel("Durée du clic (ms)", { exact: true }).fill("900");
  await check(page);
  const original = await record(page),
    source = await page.locator(".slide-background").getAttribute("src");
  await testMode(page);
  const b = button(page, "Accent");
  await expect(b).toBeEnabled();
  await b.hover();
  await expect(b.locator(".button-glow")).toHaveCSS("opacity", "1");
  await b.click();
  await expect(b.locator(".button-visual")).toHaveCSS(
    "transform",
    "matrix(1.25, 0, 0, 1.25, 0, 0)",
  );
  await expect(b.locator(".button-check")).toBeVisible();
  await page.getByRole("banner", { name: "Barre de l’éditeur" }).hover();
  await expect(b.locator(".button-visual")).toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 1, 0, 0)",
  );
  await expect(b.locator(".button-glow")).toHaveCSS("opacity", "1");
  await b.click();
  await expect(b.locator(".button-check")).toHaveCount(0);
  await page.getByRole("banner", { name: "Barre de l’éditeur" }).hover();
  await expect(b.locator(".button-glow")).toHaveCSS("opacity", "0");
  await expect(page.locator(".slide-background")).toHaveAttribute(
    "src",
    source,
  );
  expect((await record(page)).pages).toEqual(original.pages);
  expect(original.pages[0].buttons[0].action).toBeNull();
});
test("Aucune : agrandissement au survol et contour au clic, aucune sélection persistante implicite", async ({
  page,
}) => {
  await start(page);
  await add(page, "Temporaire");
  await effects(page, { "Au survol": "scale", "Au clic": "glow" });
  await testMode(page);
  const b = button(page, "Temporaire");
  await b.hover();
  await expect(b.locator(".button-visual")).toHaveCSS(
    "transform",
    "matrix(1.25, 0, 0, 1.25, 0, 0)",
  );
  await b.click();
  await expect(b.locator(".button-glow")).toHaveCSS("opacity", "1");
  await page.getByRole("banner", { name: "Barre de l’éditeur" }).hover();
  await expect(b.locator(".button-visual")).toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 1, 0, 0)",
  );
  await expect(b.locator(".button-glow")).toHaveCSS("opacity", "0");
  await expect(b).toHaveAttribute("aria-pressed", "false");
});
test("groupe sans action : défaut, exclusivité, contraste entier et coche", async ({
  page,
}) => {
  await start(page);
  await add(page, "Blanc", 10);
  await group(page, "Finitions", true);
  await page.getByLabel("Sélectionné par défaut dans le groupe").check();
  await effects(page, { "Lorsque sélectionné": "contrast" });
  await check(page);
  await add(page, "Noyer", 45);
  await group(page, "Finitions");
  await effects(page, { "Lorsque sélectionné": "contrast" });
  await check(page);
  const before = await record(page);
  await testMode(page);
  await expect(button(page, "Blanc")).toHaveAttribute("aria-pressed", "true");
  await expect(button(page, "Noyer").locator(".button-paint")).toHaveCSS(
    "filter",
    "brightness(0.55)",
  );
  await button(page, "Noyer").click();
  await expect(button(page, "Blanc")).toHaveAttribute("aria-pressed", "false");
  await expect(button(page, "Blanc").locator(".button-paint")).toHaveCSS(
    "filter",
    "brightness(0.55)",
  );
  await expect(button(page, "Noyer").locator(".button-check")).toBeVisible();
  await button(page, "Noyer").click();
  await expect(button(page, "Noyer")).toHaveAttribute("aria-pressed", "true");
  expect((await record(page)).pages).toEqual(before.pages);
});
test("édition sans déclenchement ; Présentation, clavier, plein écran et réduction des animations", async ({
  page,
}) => {
  await start(page);
  await add(page, "Repère");
  await effects(page, {
    "Au survol": "scale",
    "Au clic": "glow",
    "Lorsque sélectionné": "scale",
  });
  await check(page);
  await button(page, "Repère").click();
  await expect(button(page, "Repère").locator(".button-glow")).toHaveCSS(
    "opacity",
    "0",
  );
  await expect(button(page, "Repère").locator(".button-visual")).toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 1, 0, 0)",
  );
  await expect(button(page, "Repère").locator(".button-check")).toHaveCount(0);
  await page.getByRole("button", { name: "Présentation", exact: true }).click();
  const b = button(page, "Repère");
  await b.focus();
  await page.keyboard.press("Space");
  await expect(b.locator(".button-check")).toBeVisible();
  await expect(page.locator(".slide-info")).toHaveText(
    "Une nouvelle perspective",
  );
  await page.keyboard.press("f");
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await expect(b.locator(".button-visual")).toHaveCSS(
    "transform",
    "matrix(1.25, 0, 0, 1.25, 0, 0)",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(b.locator(".button-visual")).toHaveCSS(
    "transition-duration",
    "0s",
  );
  await page.keyboard.press("Enter");
  await expect(b.locator(".button-check")).toHaveCount(0);
});
test("page à états : sélection visuelle sans activer ni annuler un état ; état réel prioritaire dans un groupe mixte", async ({
  page,
}) => {
  await start(page);
  await add(page, "État réel");
  await page
    .getByRole("button", { name: "+ Ajouter un état", exact: true })
    .click();
  const state = (await record(page)).pages[0].states[0];
  await page.getByLabel("Type d’action", { exact: true }).selectOption("state");
  await page
    .getByLabel("État à activer", { exact: true })
    .selectOption(state.id);
  await group(page, "États", true);
  await page.getByLabel("Sélectionné par défaut dans le groupe").check();
  await add(page, "Visuel", 50);
  await check(page);
  await testMode(page);
  await button(page, "Visuel").click();
  await expect(button(page, "Visuel").locator(".button-check")).toBeVisible();
  await expect(button(page, "État réel")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await edit(page);
  await group(page, "États");
  await testMode(page);
  await button(page, "Visuel").click();
  await expect(button(page, "État réel")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(button(page, "Visuel")).toHaveAttribute("aria-pressed", "false");
});
test("vidéo bloquante et overlay : le bouton sans action reste inerte", async ({
  page,
}) => {
  await start(page);
  await add(page, "Visuel");
  await effects(page, { "Au survol": "glow", "Au clic": "scale" });
  await check(page);
  await page
    .getByLabel("Rester visible pendant les vidéos déclenchées par boutons", {
      exact: true,
    })
    .check();
  await add(page, "Ordinaire", 32);
  await check(page);
  await add(page, "Vidéo", 55);
  await page.getByLabel("Type d’action", { exact: true }).selectOption("video");
  await page
    .getByLabel("Vidéo de l’action", { exact: true })
    .selectOption({ label: "01-02.mp4" });
  await testMode(page);
  await expect(button(page, "Ordinaire")).toBeEnabled();
  await button(page, "Vidéo").click();
  await expect(button(page, "Ordinaire")).toBeDisabled();
  await expect(page.locator(".action-video")).toBeVisible();
  const visual = button(page, "Visuel");
  await expect(visual).toBeDisabled();
  await expect(visual.locator(".button-check")).toHaveCount(0);
  await expect(visual.locator(".button-glow")).toHaveCSS("opacity", "0");
  await expect(visual.locator("xpath=..")).toHaveAttribute("inert", "");
  await page
    .getByRole("button", { name: "Arrêter la vidéo", exact: true })
    .click();
  await visual.click();
  await expect(visual.locator(".button-check")).toBeVisible();
});
test("Undo/Redo, rechargement et vrai ZIP : réglages conservés, sélection temporaire non sauvegardée", async ({
  page,
  browser,
}, info) => {
  await start(page);
  await add(page, "Archive");
  await effects(page, { "Lorsque sélectionné": "scale" });
  await check(page);
  await page.locator(".editor").focus();
  await page.keyboard.press("Control+z");
  await expect(
    page.getByLabel("Afficher une coche lorsque sélectionné"),
  ).not.toBeChecked();
  await page.keyboard.press("Control+Shift+z");
  await expect(
    page.getByLabel("Afficher une coche lorsque sélectionné"),
  ).toBeChecked();
  const before = await record(page);
  await testMode(page);
  await button(page, "Archive").click();
  await expect(button(page, "Archive").locator(".button-check")).toBeVisible();
  await edit(page);
  await page.reload();
  expect((await record(page)).pages).toEqual(before.pages);
  const down = page.waitForEvent("download");
  await page.getByRole("button", { name: "Fichier", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Sauvegarder mon projet", exact: true })
    .click();
  const file = info.outputPath("sans-action.zip");
  await (await down).saveAs(file);
  expect((await fs.stat(file)).size).toBeGreaterThan(0);
  const context = await browser.newContext(),
    other = await context.newPage();
  await start(other);
  await other.getByTestId("zip-input").setInputFiles(file);
  await other
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmer", exact: true })
    .click();
  expect((await record(other)).pages).toEqual(before.pages);
  await testMode(other);
  await expect(button(other, "Archive").locator(".button-check")).toHaveCount(
    0,
  );
  await button(other, "Archive").click();
  await expect(button(other, "Archive").locator(".button-check")).toBeVisible();
  await context.close();
});
test("un clic purement visuel ne perturbe pas la fin de vidéo intégrée ni son état cible", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "+ Cercle", exact: true }).click();
  await page
    .getByRole("button", { name: "Importer / remplacer un média", exact: true })
    .click();
  await page
    .getByTestId("media-input")
    .setInputFiles("tests/fixtures/crop-landscape.mp4");
  const video = (await record(page)).pages[0].layers[0];
  await add(page, "Repère", 10);
  await check(page);
  await add(page, "Lecture", 55);
  await page
    .getByLabel("Type d’action", { exact: true })
    .selectOption("layerVideo");
  await page
    .getByLabel(`Contrôler la vidéo ${video.name}`, { exact: true })
    .check();
  await page
    .getByRole("button", { name: "+ Ajouter un état", exact: true })
    .click();
  const state = (await record(page)).pages[0].states[0];
  await page
    .getByLabel(`Visibilité de Lecture dans ${state.name}`, { exact: true })
    .selectOption("hide");
  await page
    .getByLabel("Activer un état de page après la lecture", { exact: true })
    .check();
  await page
    .getByLabel("État de page après la lecture", { exact: true })
    .selectOption(state.id);
  await testMode(page);
  await button(page, "Lecture").click();
  await button(page, "Repère").click();
  await expect(button(page, "Repère").locator(".button-check")).toBeVisible();
  const v = page.locator(`[data-layer-id="${video.id}"] video`);
  await expect.poll(() => v.evaluate((v) => v.duration)).toBeGreaterThan(0);
  await v.evaluate((v) => {
    v.currentTime = v.duration - 0.05;
    v.play();
  });
  await expect(button(page, "Lecture")).toHaveCount(0);
  await expect(button(page, "Repère").locator(".button-check")).toBeVisible();
});
