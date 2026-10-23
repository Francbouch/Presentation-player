import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import JSZip from "jszip";
const prefix = "Transition du fond d’écran";
const saved = (p) =>
  expect(p.locator(".save-status")).toContainText("✓ Sauvegardé");
const scene = (p) => p.locator(".editor-preview");
const button = (p, name) =>
  p
    .locator(".interactive-button-layer")
    .getByRole("button", { name, exact: true });
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
  await p.locator(".page-thumbnail").nth(1).click();
}
async function add(p, name, target, type = "crossfade") {
  await p.getByRole("button", { name: "+ Bouton", exact: true }).click();
  await p.getByLabel("Nom du calque", { exact: true }).fill(name);
  await p
    .getByLabel("X du calque (%)", { exact: true })
    .fill(name === "Noyer" ? "35" : "65");
  await p
    .getByLabel("Type d’action", { exact: true })
    .selectOption("background");
  await p
    .getByLabel("Arrière-plan de l’action", { exact: true })
    .selectOption({ label: `Variante : ${target}` });
  await p.getByLabel(`${prefix} : effet`, { exact: true }).selectOption(type);
  if (type !== "none") {
    await p.getByLabel(`${prefix} : durée (ms)`, { exact: true }).fill("1500");
    await p
      .getByLabel(`${prefix} : accélération`, { exact: true })
      .selectOption("linear");
  }
  await saved(p);
}
async function half(p) {
  await scene(p).evaluate((root) =>
    root.getAnimations({ subtree: true }).forEach((a) => {
      a.pause();
      a.currentTime = a.effect.getTiming().duration / 2;
    }),
  );
}
async function resume(p) {
  await scene(p).evaluate((root) =>
    root.getAnimations({ subtree: true }).forEach((a) => a.play()),
  );
}
test("fond seulement : deux images, calques fixes, dernier clic conservé sans transitions superposées", async ({
  page,
}) => {
  await start(page);
  await add(page, "Noyer", "Océan");
  await add(page, "Charbon", "Crépuscule", "wipe");
  await page
    .getByRole("button", { name: "Tester les interactions", exact: true })
    .click();
  const before = await button(page, "Noyer").boundingBox();
  await button(page, "Noyer").click();
  await expect(scene(page).locator(".slide")).toHaveAttribute(
    "data-effect-running",
    "crossfade",
  );
  await half(page);
  await expect(scene(page).locator(".visual-pending-background")).toHaveCSS(
    "opacity",
    "0.5",
  );
  expect(await button(page, "Noyer").boundingBox()).toEqual(before);
  expect(
    await scene(page).evaluate((root) =>
      root
        .getAnimations({ subtree: true })
        .every((a) => a.effect.target.classList.contains("slide-background")),
    ),
  ).toBe(true);
  await button(page, "Charbon").click();
  await button(page, "Noyer").click();
  await button(page, "Charbon").click();
  await resume(page);
  await expect(scene(page).locator(".slide")).toHaveAttribute(
    "data-effect-running",
    "wipe",
  );
  await resume(page);
  await expect(scene(page).locator(".slide-background")).toHaveCount(1);
  await expect(button(page, "Charbon")).toHaveAttribute("aria-pressed", "true");
  expect(await button(page, "Noyer").boundingBox()).toEqual(before);
});
test("réglages individuels, durée bornée, duplication, rechargement et vrai ZIP", async ({
  page,
  browser,
}, info) => {
  await start(page);
  await add(page, "Noyer", "Océan", "slide");
  await page
    .getByLabel(`${prefix} : direction`, { exact: true })
    .selectOption("right");
  await page.getByLabel(`${prefix} : durée (ms)`, { exact: true }).fill("2400");
  await page.getByLabel(`${prefix} : durée (ms)`, { exact: true }).blur();
  await expect(
    page.getByLabel(`${prefix} : durée (ms)`, { exact: true }),
  ).toHaveValue("2000");
  await page
    .getByRole("button", { name: "Dupliquer le calque", exact: true })
    .click();
  await saved(page);
  const d = await record(page);
  expect(d.pages[1].buttons[1].backgroundEffect).toEqual(
    d.pages[1].buttons[0].backgroundEffect,
  );
  await page
    .getByLabel(`${prefix} : effet`, { exact: true })
    .selectOption("none");
  await saved(page);
  expect((await record(page)).pages[1].buttons[0].backgroundEffect.type).toBe(
    "slide",
  );
  await page.reload();
  await saved(page);
  const before = await record(page),
    download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Fichier", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Sauvegarder mon projet", exact: true })
    .click();
  const path = info.outputPath("fonds.zip");
  await (await download).saveAs(path);
  const context = await browser.newContext(),
    other = await context.newPage();
  await other.goto("/");
  await saved(other);
  await other.getByTestId("zip-input").setInputFiles(path);
  await other
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmer", exact: true })
    .click();
  await saved(other);
  expect((await record(other)).pages).toEqual(before.pages);
  const zip = await JSZip.loadAsync(await fs.readFile(path)),
    config = JSON.parse(await zip.file("presentation.json").async("string"));
  config.pages[1].buttons[0].backgroundEffect.duration = 9999;
  zip.file("presentation.json", JSON.stringify(config));
  const bad = info.outputPath("invalide.zip");
  await fs.writeFile(bad, await zip.generateAsync({ type: "nodebuffer" }));
  await other.getByTestId("zip-input").setInputFiles(bad);
  await other.getByRole("button", {name:"Notifications",exact:true}).click();
  await expect(
    other.getByRole("status").filter({ hasText: "transition du fond" }),
  ).toBeVisible();
  expect((await record(other)).pages).toEqual(before.pages);
  await context.close();
});

test("décodage lent : fond conservé, demande remplacée avant démarrage, erreur et reprise", async ({
  page,
}) => {
  await start(page);
  await add(page, "Noyer", "Océan");
  await add(page, "Charbon", "Crépuscule");
  await page
    .getByRole("button", { name: "Tester les interactions", exact: true })
    .click();
  const old = await scene(page)
    .locator(".slide-background")
    .getAttribute("src");
  await page.evaluate(() => {
    window.originalDecode = HTMLImageElement.prototype.decode;
    window.releases = [];
    HTMLImageElement.prototype.decode = function () {
      if (this.classList.contains("visual-pending-background"))
        return new Promise((resolve) =>
          window.releases.push(() => resolve(window.originalDecode.call(this))),
        );
      return window.originalDecode.call(this);
    };
  });
  await button(page, "Noyer").click();
  await expect(scene(page).locator(".visual-pending-background")).toHaveCount(
    1,
  );
  await expect(scene(page).locator(".slide")).not.toHaveAttribute(
    "data-effect-running",
  );
  await expect(
    scene(page).locator(".slide-background").first(),
  ).toHaveAttribute("src", old);
  await button(page, "Charbon").click();
  await page.evaluate(() => {
    HTMLImageElement.prototype.decode = window.originalDecode;
    window.releases.forEach((r) => r());
  });
  await expect(button(page, "Charbon")).toHaveAttribute("aria-pressed", "true");
  await expect(scene(page).locator(".slide-background")).toHaveCount(1);
  const chosen = await scene(page)
    .locator(".slide-background")
    .getAttribute("src");
  await page.evaluate(() => {
    HTMLImageElement.prototype.decode = function () {
      return this.classList.contains("visual-pending-background")
        ? Promise.reject(new Error("Fichier illisible"))
        : window.originalDecode.call(this);
    };
  });
  await button(page, "Noyer").click();
  await page.getByRole("button", {name:"Notifications",exact:true}).click();
  await expect(
    page.getByRole("status").filter({ hasText: "affichage précédent" }),
  ).toBeVisible();
  await expect(scene(page).locator(".slide-background")).toHaveAttribute(
    "src",
    chosen,
  );
  await page.evaluate(
    () => (HTMLImageElement.prototype.decode = window.originalDecode),
  );
  await button(page, "Noyer").click();
  await expect(button(page, "Noyer")).toHaveAttribute("aria-pressed", "true");
});
test("tous les effets et directions : calques stables ; plein écran et réduction des animations", async ({
  page,
}) => {
  await start(page);
  await add(page, "Noyer", "Océan");
  for (const [effect, direction] of [
    ["slide", "left"],
    ["slide", "right"],
    ["slide", "up"],
    ["slide", "down"],
    ["wipe", "left"],
    ["wipe", "right"],
    ["wipe", "up"],
    ["wipe", "down"],
    ["zoom", null],
  ]) {
    await page
      .getByLabel(`${prefix} : effet`, { exact: true })
      .selectOption(effect);
    if (direction)
      await page
        .getByLabel(`${prefix} : direction`, { exact: true })
        .selectOption(direction);
    await page
      .getByRole("button", { name: "Tester les interactions", exact: true })
      .click();
    await button(page, "Noyer").click();
    await expect(scene(page).locator(".slide")).toHaveAttribute(
      "data-effect-running",
      effect,
    );
    await half(page);
    expect(
      await scene(page).evaluate((root) =>
        root
          .getAnimations({ subtree: true })
          .every((a) => a.effect.target.classList.contains("slide-background")),
      ),
    ).toBe(true);
    await resume(page);
    await expect(button(page, "Noyer")).toHaveAttribute("aria-pressed", "true");
    await page
      .getByRole("button", { name: "Revenir au mode édition", exact: true })
      .click();
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Présentation", exact: true }).click();
  await page.keyboard.press("f");
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await button(page, "Noyer").click();
  await expect(button(page, "Noyer")).toHaveAttribute("aria-pressed", "true");
  expect(
    await page
      .locator(".stage")
      .evaluate((el) => el.getAnimations({ subtree: true }).length),
  ).toBe(0);
});
test("sortie du test et navigation : aucune ancienne transition ne revient tardivement", async ({
  page,
}) => {
  await start(page);
  await add(page, "Noyer", "Océan");
  const initial = await scene(page)
    .locator(".slide-background")
    .getAttribute("src");
  await page
    .getByRole("button", { name: "Tester les interactions", exact: true })
    .click();
  await button(page, "Noyer").click();
  await expect(scene(page).locator(".slide")).toHaveAttribute(
    "data-effect-running",
    "crossfade",
  );
  await half(page);
  await page
    .getByRole("button", { name: "Revenir au mode édition", exact: true })
    .click();
  await expect(scene(page).locator(".slide-background")).toHaveAttribute(
    "src",
    initial,
  );
  await page.getByRole("button", { name: "Présentation", exact: true }).click();
  await button(page, "Noyer").click();
  await expect(page.locator(".is-current .slide")).toHaveAttribute(
    "data-effect-running",
    "crossfade",
  );
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".slide-info")).toHaveText(
    "Une nouvelle perspective",
  );
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".slide-info")).toHaveText("Changez d’atmosphère");
  await expect(page.locator(".is-current .slide-background")).toHaveAttribute(
    "src",
    initial,
  );
});
