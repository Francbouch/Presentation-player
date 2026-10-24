import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import JSZip from "jszip";
import catalog from "../src/fontCatalog.json" with { type: "json" };
const saved = (p) =>
  expect(p.locator(".save-status")).toContainText("Sauvegardé");
const text = (p) => p.locator(".slide-stage .layer-text-content").first();
async function start(p) {
  await p.goto("/");
  await saved(p);
  await p.getByRole("button", { name: "+ Texte", exact: true }).click();
}
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
async function loaded(p, id) {
  await expect
    .poll(() =>
      p.evaluate(
        (name) =>
          [...document.fonts].some(
            (f) => f.family === name && f.status === "loaded",
          ) && document.fonts.check(`400 48px "${name}"`, "Élégance éèêàçœ"),
        catalog[id].name,
      ),
    )
    .toBe(true);
}
test("10 polices locales : graisses, accents, recherche, favoris, récentes et raccourcis isolés", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await start(page);
  await page
    .getByLabel("Contenu du texte", { exact: true })
    .fill("Mobilier — Élégance é è ê à ç œ É È Ê À Ç Œ");
  for (const [id, font] of Object.entries(catalog)) {
    await page.getByLabel("Police du texte", { exact: true }).selectOption(id);
    await loaded(page, id);
    for (const weight of font.weights) {
      await page
        .getByLabel("Graisse du texte", { exact: true })
        .selectOption(String(weight));
      await expect(page.locator(".text-layout").first()).toHaveCSS(
        "font-weight",
        String(weight),
      );
    }
    await expect(page.locator(".text-body").first()).toContainText(
      "é è ê à ç œ",
    );
  }
  await page
    .getByLabel("Police du texte", { exact: true })
    .selectOption("manrope");
  await page
    .getByLabel("Graisse du texte", { exact: true })
    .selectOption("500");
  await page.getByRole("button", { name: "Gras", exact: true }).click();
  await expect(
    page.getByLabel("Graisse du texte", { exact: true }),
  ).toHaveValue("700");
  await page.getByRole("button", { name: "Gras", exact: true }).click();
  await expect(
    page.getByLabel("Graisse du texte", { exact: true }),
  ).toHaveValue("400");
  await page.getByRole("button", { name: "Parcourir les polices" }).click();
  await page
    .getByRole("searchbox", { name: "Rechercher une police" })
    .fill("Sora");
  await page
    .getByRole("button", { name: "Ajouter Sora aux favoris", exact: true })
    .click();
  await expect(page.locator(".font-browser h4")).toContainText([
    "Favoris",
    "Toutes les polices",
  ]);
  await page.locator(".font-browser .font-name").first().click();
  await expect(page.getByLabel("Police du texte", { exact: true })).toHaveValue(
    "sora",
  );
  await page.getByRole("button", { name: "Parcourir les polices" }).click();
  await expect(page.locator(".font-browser")).toContainText("Polices récentes");
  await page.getByRole("searchbox").press("Escape");
  await expect(page.locator(".font-browser")).toHaveCount(0);
  await saved(page);
  expect(
    requests.filter(
      (u) => !u.startsWith("http://127.0.0.1:5180") && !u.startsWith("blob:"),
    ),
  ).toEqual([]);
  const files = requests.filter((u) => u.endsWith(".woff2"));
  expect(files.length).toBeGreaterThanOrEqual(20);
});

test("texte et bouton : sauvegarde, ZIP, état, plein écran, cache hors ligne et Undo/Redo", async ({
  page,
  browser,
}, info) => {
  await start(page);
  await page
    .getByLabel("Police du texte", { exact: true })
    .selectOption("plus-jakarta-sans");
  await page
    .getByLabel("Graisse du texte", { exact: true })
    .selectOption("600");
  await loaded(page, "plus-jakarta-sans");
  await page.getByRole("button", { name: "+ Bouton", exact: true }).click();
  await page
    .getByLabel("Police du texte", { exact: true })
    .selectOption("cormorant-garamond");
  await page
    .getByLabel("Graisse du texte", { exact: true })
    .selectOption("500");
  await page.getByRole("button", { name: "Italique", exact: true }).click();
  await loaded(page, "cormorant-garamond");
  await saved(page);
  const original = await record(page);
  expect(original.pages[0].buttons.at(-1).labelText.textStyle).toMatchObject({
    font: "cormorant-garamond",
    weight: 500,
    italic: true,
  });
  await page.getByRole("button", { name: "↶ Annuler", exact: true }).click();
  await saved(page);
  expect(
    (await record(page)).pages[0].buttons.at(-1).labelText.textStyle.italic,
  ).toBe(false);
  await page.getByRole("button", { name: "↷ Rétablir", exact: true }).click();
  await saved(page);
  await page.reload();
  await saved(page);
  expect((await record(page)).pages).toEqual(original.pages);
  await loaded(page, "plus-jakarta-sans");
  // Bloquer tous les téléchargements de polices après rechargement : seul CacheStorage reste accessible.
  await page.route("**/*.woff2", (r) => r.abort());
  await page.reload();
  await saved(page);
  await loaded(page, "plus-jakarta-sans");
  await expect(page.getByText(/Une police est indisponible/)).toHaveCount(0);
  await page
    .getByRole("button", { name: "+ Ajouter un état", exact: true })
    .click();
  await page.getByRole("tab", { name: "États", exact: true }).click();
  await expect(
    page
      .getByRole("dialog", { name: "Gestionnaire visuel des états" })
      .locator(".text-layout")
      .first(),
  ).toHaveCSS("font-family", /Plus Jakarta Sans/);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Présentation", exact: true }).click();
  await expect(page.locator(".text-layout").first()).toHaveCSS(
    "font-weight",
    "600",
  );
  await page.keyboard.press("f");
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await page.keyboard.press("f");
  await page.getByRole("button", { name: "Éditeur", exact: true }).click();
  const expected = await record(page),
    down = page.waitForEvent("download");
  await page.getByRole("button", { name: "Fichier", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Sauvegarder mon projet", exact: true })
    .click();
  const file = info.outputPath("fonts.zip");
  await (await down).saveAs(file);
  const zip = await JSZip.loadAsync(await fs.readFile(file));
  expect(Object.keys(zip.files).some((f) => /woff|ttf/.test(f))).toBe(false);
  expect(
    JSON.parse(await zip.file("presentation.json").async("string")).pages,
  ).toEqual(expected.pages);
  const ctx = await browser.newContext(),
    other = await ctx.newPage();
  await other.goto("/");
  await saved(other);
  await other.getByTestId("zip-input").setInputFiles(file);
  await other
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmer", exact: true })
    .click();
  await saved(other);
  expect((await record(other)).pages).toEqual(expected.pages);
  await other.reload();
  await saved(other);
  await loaded(other, "plus-jakarta-sans");
  await ctx.close();
});

test("version HTML autonome : toutes les polices utilisables sans réseau", async ({
  browser,
}) => {
  execFileSync(process.execPath, ["scripts/export-standalone.mjs"]);
  const html = await fs.readFile("dist/presentation-player.html", "utf8");
  const ctx = await browser.newContext({ offline: true }),
    p = await ctx.newPage();
  // File URLs are blocked by managed Chromium here. Deliver the identical HTML
  // without the web server CSP (inline scripts are intrinsic to a local HTML file).
  await p.route("**/*", (route) =>
    route.request().isNavigationRequest()
      ? route.fulfill({ contentType: "text/html", body: html })
      : route.abort(),
  );
  await p.goto("/offline-font-test");
  await saved(p);
  await p.getByRole("button", { name: "+ Texte", exact: true }).click();
  for (const id of Object.keys(catalog)) {
    await p.getByLabel("Police du texte", { exact: true }).selectOption(id);
    await loaded(p, id);
  }
  await expect(p.getByText(/Une police est indisponible/)).toHaveCount(0);
  await ctx.close();
});

import {
  appearanceValues,
  appearancePatch,
  resolveStyle,
  markStyleChanges,
  validateProjectStyles,
} from "../src/projectStyles.js";
import { DEFAULT_TEXT_STYLE, validateTextStyles } from "../src/textModel.js";
import { migrateDocument, emptyPage, createLayer } from "../src/document.js";
test("compatibilité : ancien texte inchangé, styles liés et surcharges de graisse, données invalides refusées", () => {
  const item = {
    ...createLayer("text", 1),
    id: "txt",
    type: "text",
    content: "éèêàçœ",
    color: "#ffffff",
    textStyle: { ...DEFAULT_TEXT_STYLE, font: "manrope", weight: 600 },
  };
  const style = { id: "style", name: "Titre", values: appearanceValues(item) };
  const target = {
    ...item,
    id: "target",
    textStyle: { ...DEFAULT_TEXT_STYLE },
    styleLink: { id: "style", overrides: [] },
  };
  const linked = resolveStyle(target, [style]);
  expect(linked.textStyle).toMatchObject({ font: "manrope", weight: 600 });
  const local = {
    ...linked,
    ...markStyleChanges(linked, {
      textStyle: { ...linked.textStyle, weight: 500 },
    }),
  };
  style.values.typography.textStyle.weight = 800;
  style.values.typography.textStyle.font = "outfit";
  const updated = resolveStyle(local, [style]);
  expect(updated.textStyle).toMatchObject({ font: "outfit", weight: 500 });
  validateProjectStyles({
    pages: [{ layers: [updated], buttons: [] }],
    projectStyles: [style],
  });
  const oldValues = appearanceValues({
    ...item,
    textStyle: { ...DEFAULT_TEXT_STYLE, bold: true },
  });
  expect(appearancePatch(item, oldValues).textStyle.weight).toBe(700);
  const page = {
    ...emptyPage(1),
    layers: [{ ...item, textStyle: { ...DEFAULT_TEXT_STYLE } }],
    layerOrder: ["txt"],
  };
  const old = {
    version: 22,
    transitions: [],
    pages: [page],
    media: [],
    privateMetadata: { note: "conserver" },
  };
  const before = structuredClone(old);
  const next = migrateDocument(old);
  expect(next.version).toBe(27);
  expect(next.pages).toEqual(before.pages);
  expect(old).toEqual(before);
  expect(next.privateMetadata).toEqual(before.privateMetadata);
  expect(() =>
    validateTextStyles([
      { layers: [{ ...item, textStyle: { ...item.textStyle, weight: 6000 } }] },
    ]),
  ).toThrow(/mise en forme/);
});
