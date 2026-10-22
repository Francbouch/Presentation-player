import { createComponent } from "../src/componentsModel.js";
import { test, expect } from "@playwright/test";
import { alignItems, boundsOf, visualBounds } from "../src/editorGeometry.js";
import { alignSelection } from "../src/visualGroups.js";
const saved = (p) =>
  expect(p.locator(".save-status")).toContainText("✓ Sauvegardé");
async function start(p) {
  await p.goto("/");
  await saved(p);
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
async function add(p, type = "Rectangle") {
  await p.getByRole("button", { name: `+ ${type}`, exact: true }).click();
  await saved(p);
}
test("phase 1 : référentiel objet, centres et groupes sans déformation", () => {
  const items = [
    { id: "a", x: 0.1, y: 0.1, width: 0.1, height: 0.1 },
    { id: "b", x: 0.3, y: 0.3, width: 0.2, height: 0.1 },
    { id: "c", x: 0.8, y: 0.5, width: 0.1, height: 0.1 },
  ];
  const aligned = alignItems(items, "left", "key");
  expect(aligned.a.x).toBeCloseTo(0.1);
  expect(aligned.b.x).toBeCloseTo(0.1);
  expect(alignItems(items, "distributeX", "key").c.x).toBeCloseTo(0.8);
  const distributed = alignItems(items, "distributeCentersX");
  expect(distributed.b.x + 0.1).toBeCloseTo(0.5);
  const spaced = alignItems(items, "spacingX", "selection", 30);
  expect(spaced.b.x - (spaced.a.x + items[0].width)).toBeCloseTo(30 / 1920);
  const grouped = alignSelection(
    items,
    [{ id: "g", children: ["a", "b"] }],
    "left",
    "slide",
  );
  expect(grouped.b.x - grouped.a.x).toBeCloseTo(0.2);
});
test("phase 1 : commandes visuelles, une opération annulable", async ({
  page,
}) => {
  await start(page);
  await add(page);
  await add(page);
  await add(page);
  await page.locator(".editor").focus();
  await page.keyboard.press("Control+a");
  await page
    .getByLabel("Référentiel d’alignement", { exact: true })
    .selectOption("key");
  await page
    .getByRole("button", { name: "Aligner à gauche", exact: true })
    .click();
  await saved(page);
  await page
    .getByRole("button", {
      name: "Distribuer les centres horizontalement",
      exact: true,
    })
    .click();
  await saved(page);
  await page.getByRole("button", { name: "↶ Annuler", exact: true }).click();
  await saved(page);
  expect((await record(page)).pages[0].layers).toHaveLength(3);
});

import {
  folderFlags,
  validateFolders,
  moveIntoFolder,
  folderMembers,
} from "../src/layerFolders.js";
import {
  createLayer,
  emptyPage,
  orderedLayers,
  duplicatePageModel,
  normalizeDocument,
} from "../src/document.js";
test("phase 2 : héritage non destructif, dossiers imbriqués, cycle rejeté et duplication", () => {
  const a = createLayer("rectangle", 1),
    b = createLayer("circle", 2),
    p = normalizeDocument({
      version: 18,
      media: [],
      transitions: [],
      pages: [{ ...emptyPage(1), layers: [a, b] }],
    }).pages[0];
  p.layerFolders = [
    {
      id: "root",
      name: "Racine",
      parentId: null,
      children: [a.id],
      visible: true,
      locked: true,
      collapsed: false,
    },
    {
      id: "child",
      name: "Enfant",
      parentId: "root",
      children: [b.id],
      visible: false,
      locked: false,
      collapsed: false,
    },
  ];
  validateFolders(p);
  expect(folderFlags(p, b.id)).toEqual({
    folderLocked: true,
    folderHidden: true,
  });
  expect(orderedLayers(p).find((l) => l.id === b.id).locked).toBe(true);
  expect(b.locked).toBe(false);
  p.layerFolders[0].locked = false;
  expect(orderedLayers(p).find((l) => l.id === b.id).locked).toBe(false);
  expect(moveIntoFolder(p, [a.id], "child").layerFolders[1].children).toContain(
    a.id,
  );
  const copy = duplicatePageModel(p);
  validateFolders(copy);
  expect(folderMembers(copy, copy.layerFolders[0].id)).toHaveLength(2);
  const component = createComponent(
    { pages: [p], components: [], media: [] },
    p,
    [b.id],
    "Cercle masqué",
  ).components[0];
  expect(component.layers[0].folderHidden).toBeUndefined();
  expect(component.layers[0].locked).toBe(false);
  p.layerFolders[0].parentId = "child";
  expect(() => validateFolders(p)).toThrow("Hiérarchie");
});
test("phase 2 : rangement visuel, verrou hérité, état visible conservé et retrait sans perte", async ({
  page,
}) => {
  await start(page);
  await add(page);
  const before = (await record(page)).pages[0].layers[0];
  await page
    .getByRole("button", { name: "+ Dossier de calques", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ranger la sélection", exact: true })
    .click();
  await saved(page);
  let doc = await record(page);
  expect(doc.pages[0].layerFolders[0].children).toEqual([before.id]);
  await page
    .getByRole("button", {
      name: "Verrouiller le dossier Nouveau dossier",
      exact: true,
    })
    .click();
  await saved(page);
  await expect(
    page.getByLabel("X du calque (%)", { exact: true }),
  ).toBeDisabled();
  await page.locator(".editor").focus();
  await page.keyboard.press("Delete");
  await saved(page);
  expect((await record(page)).pages[0].layers).toHaveLength(1);
  await page
    .getByRole("button", {
      name: "Déverrouiller le dossier Nouveau dossier",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Masquer le dossier Nouveau dossier",
      exact: true,
    })
    .click();
  await saved(page);
  expect((await record(page)).pages[0].layers[0].visible).toBe(before.visible);
  await page
    .getByRole("button", {
      name: "Afficher le dossier Nouveau dossier",
      exact: true,
    })
    .click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Retirer le dossier", exact: true })
    .click();
  await saved(page);
  expect((await record(page)).pages[0].layers[0]).toEqual(before);
});
import {
  objectFilter,
  defaultObjectEffects,
  validateObjectEffects,
} from "../src/objectEffects.js";
test("phase 3 : effets bornés, unités logiques et validation", () => {
  const e = defaultObjectEffects();
  expect(objectFilter(e)).toBeUndefined();
  e.shadow.enabled = true;
  e.blur.enabled = true;
  expect(objectFilter(e, (n) => `${n / 4}px`)).toContain(
    "drop-shadow(2px 2px 3px",
  );
  validateObjectEffects(e);
  expect(() =>
    validateObjectEffects({ ...e, blur: { enabled: true, amount: 999 } }),
  ).toThrow();
});
test("phase 3 : ombre et flou sur formes, bouton, texte et ligne sans filtrer les poignées", async ({
  page,
}) => {
  await start(page);
  for (const type of ["Rectangle", "Cercle", "Bouton", "Texte"]) {
    await add(page, type);
    const section = page.locator(".property-section").filter({
      has: page.locator(":scope > summary", { hasText: /^Effets visuels$/ }),
    });
    if (!(await section.evaluate((el) => el.open)))
      await section.locator(":scope > summary").click();
    await page.getByLabel("Ombre portée", { exact: true }).check();
    await page.getByLabel("Flou visuel", { exact: true }).check();
    await saved(page);
    const item = (await record(page)).pages[0];
    const id =
      type === "Bouton" ? item.buttons.at(-1).id : item.layers.at(-1).id;
    await expect(
      page.locator(`[data-layer-id="${id}"] > .layer-content`),
    ).toHaveCSS("filter", /drop-shadow/);
    await expect(
      page.locator(`[data-layer-id="${id}"] > .layer-handle`).first(),
    ).toHaveCSS("filter", "none");
  }
  const perf = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const times = [];
        let last = performance.now();
        function frame(now) {
          times.push(now - last);
          last = now;
          if (times.length === 20)
            resolve(times.reduce((a, b) => a + b, 0) / times.length);
          else requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      }),
  );
  expect(perf).toBeLessThan(200);
  await page.getByRole("button", { name: "Présentation", exact: true }).click();
  await expect(page.locator(".layer-content").first()).toHaveCSS(
    "filter",
    /drop-shadow/,
  );
});
import {
  appearanceValues,
  appearancePatch,
  resolveStyle,
  markStyleChanges,
  deleteProjectStyle,
  validateProjectStyles,
} from "../src/projectStyles.js";
import JSZip from "jszip";
import fs from "node:fs/promises";
test("phase 4 : style synchronisé, surcharge par propriété, détachement et données protégées", () => {
  const source = {
      ...createLayer("circle", 1),
      border: { enabled: true, color: "#ffffff", width: 2, opacity: 1 },
    },
    style = { id: "style", name: "Commun", values: appearanceValues(source) },
    target = {
      ...createLayer("rectangle", 2),
      styleLink: { id: "style", overrides: [] },
      frameMedia: null,
    };
  const linked = resolveStyle(target, [style]);
  const patch = markStyleChanges(linked, {
    border: { ...linked.border, color: "#ff0000" },
  });
  expect(patch.styleLink.overrides).toEqual(["border.color"]);
  const local = { ...linked, ...patch };
  style.values.fill.color = "#112233";
  style.values.border.width = 8;
  const changed = resolveStyle(local, [style]);
  expect(changed.color).toBe("#112233");
  expect(changed.border.color).toBe("#ff0000");
  expect(changed.border.width).toBe(8);
  for (const k of ["id", "x", "y", "width", "height", "rotation", "frameMedia"])
    expect(changed[k]).toEqual(target[k]);
  const doc = {
    projectStyles: [style],
    pages: [{ layers: [changed], buttons: [] }],
  };
  validateProjectStyles(doc);
  const detached = deleteProjectStyle(doc, "style");
  expect(detached.pages[0].layers[0].styleLink).toBeUndefined();
  expect(detached.pages[0].layers[0].border).toEqual(changed.border);
});
async function stylesOpen(p) {
  const d = p.locator(".property-section").filter({
    has: p.locator(":scope > summary", { hasText: /^Styles du projet$/ }),
  });
  if (!(await d.evaluate((el) => el.open)))
    await d.locator(":scope > summary").click();
}
test("phase 4 : bibliothèque, surcharges locales, mise à jour globale, recharge et vrai ZIP", async ({
  page,
  browser,
}, info) => {
  await start(page);
  await add(page);
  await stylesOpen(page);
  await page
    .getByLabel("Nom du nouveau style", { exact: true })
    .fill("Forme principale");
  await page
    .getByRole("button", {
      name: "Créer un style depuis cet objet",
      exact: true,
    })
    .click();
  await saved(page);
  const first = (await record(page)).pages[0].layers[0].id;
  await add(page, "Cercle");
  await stylesOpen(page);
  await page
    .getByLabel("Style du projet", { exact: true })
    .selectOption({ label: "Forme principale" });
  await page
    .getByRole("button", {
      name: "Appliquer le style lié à la sélection",
      exact: true,
    })
    .click();
  await saved(page);
  await page.getByLabel("Couleur du calque", { exact: true }).fill("#ff0000");
  await saved(page);
  expect((await record(page)).pages[0].layers[1].styleLink.overrides).toContain(
    "color",
  );
  await page
    .getByRole("button", {
      name: "Sélectionner le calque Rectangle 1",
      exact: true,
    })
    .click();
  await page.getByLabel("Couleur du calque", { exact: true }).fill("#0011ff");
  await stylesOpen(page);
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", {
      name: "Mettre à jour le style depuis cet objet",
      exact: true,
    })
    .click();
  await saved(page);
  let doc = await record(page);
  expect(doc.projectStyles[0].values.fill.color).toBe("#0011ff");
  expect(doc.pages[0].layers[1].color).toBe("#ff0000");
  await page
    .getByRole("button", {
      name: "Sélectionner le calque Cercle 2",
      exact: true,
    })
    .click();
  await stylesOpen(page);
  await page
    .getByRole("button", {
      name: "Réinitialiser les modifications locales",
      exact: true,
    })
    .click();
  await saved(page);
  expect((await record(page)).pages[0].layers[1].color).toBe("#0011ff");
  await page
    .getByRole("button", { name: "+ Dossier de calques", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ranger la sélection", exact: true })
    .click();
  await saved(page);
  await page.reload();
  await saved(page);
  doc = await record(page);
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Fichier", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Sauvegarder mon projet", exact: true })
    .click();
  const file = info.outputPath("styles-dossiers.zip");
  await (await downloading).saveAs(file);
  const context = await browser.newContext(),
    other = await context.newPage();
  await start(other);
  await other.getByTestId("zip-input").setInputFiles(file);
  await other
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmer", exact: true })
    .click();
  await saved(other);
  expect((await record(other)).pages).toEqual(doc.pages);
  expect((await record(other)).projectStyles).toEqual(doc.projectStyles);
  const zip = await JSZip.loadAsync(await fs.readFile(file)),
    config = JSON.parse(await zip.file("presentation.json").async("string"));
  config.pages[0].layerFolders[0].parentId = config.pages[0].layerFolders[0].id;
  zip.file("presentation.json", JSON.stringify(config));
  const bad = info.outputPath("dossier-cycle.zip");
  await fs.writeFile(bad, await zip.generateAsync({ type: "nodebuffer" }));
  await other.getByTestId("zip-input").setInputFiles(bad);
  await expect(
    other.getByText(
      "Hiérarchie des dossiers invalide. Votre projet est conservé.",
      { exact: true },
    ),
  ).toBeVisible();
  expect((await record(other)).pages).toEqual(doc.pages);
  await context.close();
  await page
    .getByRole("button", {
      name: "Sélectionner le calque Rectangle 1",
      exact: true,
    })
    .click();
  await stylesOpen(page);
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Supprimer le style", exact: true })
    .click();
  await saved(page);
  const removed = await record(page);
  expect(removed.projectStyles).toHaveLength(0);
  expect(removed.pages[0].layers.every((l) => !l.styleLink)).toBe(true);
  expect(removed.pages[0].layers[0].color).toBe("#0011ff");
});
import { copyAppearance, pasteAppearance } from "../src/propertyClipboard.js";
import { createInteractiveButton } from "../src/document.js";
test("phase 5 : conversion de bordure, médias/actions préservés, dimensions explicites et typographie ignorée sur ligne", () => {
  const source = {
      ...createLayer("circle", 1),
      border: { enabled: true, color: "#ffffff", width: 4, opacity: 0.5 },
    },
    button = {
      ...createInteractiveButton(1),
      type: "button",
      action: { type: "navigate", pageId: "page-2" },
      imageId: "image",
      styleLink: { id: "x", overrides: [] },
    };
  const data = copyAppearance(source),
    patch = pasteAppearance(button, data, "border");
  expect(patch.appearance.border).toBe("#ffffff");
  for (const k of [
    "action",
    "imageId",
    "x",
    "y",
    "width",
    "height",
    "id",
    "rotation",
    "styleLink",
  ])
    expect(patch[k]).toBeUndefined();
  const all = pasteAppearance(button, data);
  expect(all.styleLink).toBeUndefined();
  expect(pasteAppearance(button, data, "dimensions").width).toBe(source.width);
  expect(
    pasteAppearance(
      createLayer("vectorLine", 1),
      copyAppearance(createLayer("text", 1)),
      "typography",
    ),
  ).toEqual({});
  expect(pasteAppearance({ ...button, locked: true }, data)).toEqual({});
  const linked = { ...source, styleLink: { id: "style-id", overrides: [] } };
  expect(pasteAppearance(button, copyAppearance(linked), "linked")).toEqual({
    styleLink: { id: "style-id", overrides: [] },
  });
  expect(
    pasteAppearance(button, copyAppearance(linked)).styleLink,
  ).toBeUndefined();
});
async function clipboardOpen(p) {
  const d = p.locator(".property-section").filter({
    has: p.locator(":scope > summary", {
      hasText: /^Copier\/coller les propriétés$/,
    }),
  });
  if (!(await d.evaluate((el) => el.open)))
    await d.locator(":scope > summary").click();
}
test("phase 5 : collage multiple en une étape Undo/Redo et dimensions sans déplacement", async ({
  page,
}) => {
  await start(page);
  await add(page, "Cercle");
  await page.getByLabel("Couleur du calque", { exact: true }).fill("#1177ff");
  await clipboardOpen(page);
  await page
    .getByRole("button", { name: "Copier l’apparence", exact: true })
    .click();
  await add(page);
  await add(page);
  const original = await record(page);
  const rows = page.locator(".layer-list .layer-select");
  await rows.nth(0).click();
  await rows.nth(1).click({ modifiers: ["Shift"] });
  await clipboardOpen(page);
  await page
    .getByRole("button", { name: "Coller l’apparence", exact: true })
    .click();
  await saved(page);
  let d = await record(page);
  expect(d.pages[0].layers.slice(1).every((l) => l.color === "#1177ff")).toBe(
    true,
  );
  await page.getByRole("button", { name: "↶ Annuler", exact: true }).click();
  await saved(page);
  expect((await record(page)).pages).toEqual(original.pages);
  await page.getByRole("button", { name: "↷ Rétablir", exact: true }).click();
  await saved(page);
  expect((await record(page)).pages[0].layers[1].color).toBe("#1177ff");
  await page
    .getByRole("button", {
      name: "Sélectionner le calque Rectangle 2",
      exact: true,
    })
    .click();
  const before = (await record(page)).pages[0].layers[1];
  await clipboardOpen(page);
  await page
    .getByLabel("Catégorie du collage spécial", { exact: true })
    .selectOption("dimensions");
  await page
    .getByRole("button", { name: "Appliquer le collage spécial", exact: true })
    .click();
  await saved(page);
  const after = (await record(page)).pages[0].layers[1];
  expect(after.x).toBe(before.x);
  expect(after.y).toBe(before.y);
  expect(after.rotation).toBe(before.rotation);
});
test("final : dossier imbriqué par dépôt, actions préservées, verrou et visibilité en présentation", async ({
  page,
}) => {
  await start(page);
  await add(page);
  await add(page, "Bouton");
  await page
    .getByLabel("Type d’action", { exact: true })
    .selectOption("visibility");
  await page.getByLabel("Contrôler Rectangle 1", { exact: true }).check();
  await saved(page);
  let doc = await record(page);
  const button = doc.pages[0].buttons[0],
    rect = doc.pages[0].layers[0];
  await page
    .getByRole("button", { name: "+ Dossier de calques", exact: true })
    .click();
  const folder = (await record(page)).pages[0].layerFolders[0];
  await page
    .getByLabel(`Nom du dossier ${folder.id}`, { exact: true })
    .fill("Dossier principal");
  await page
    .getByRole("button", { name: "+ Sous-dossier", exact: true })
    .click();
  await saved(page);
  const child = (await record(page)).pages[0].layerFolders[1];
  await page
    .getByLabel(`Nom du dossier ${child.id}`, { exact: true })
    .fill("Enfant");
  for (const id of [rect.id, button.id]) {
    const transfer = await page.evaluateHandle((id) => {
      const d = new DataTransfer();
      d.setData("application/studio-layer", id);
      return d;
    }, id);
    await page
      .locator(".layer-folder")
      .filter({
        has: page.getByLabel(`Nom du dossier ${child.id}`, { exact: true }),
      })
      .last()
      .dispatchEvent("drop", { dataTransfer: transfer });
  }
  await saved(page);
  doc = await record(page);
  expect(doc.pages[0].layerFolders[1].children).toEqual([rect.id, button.id]);
  expect(doc.pages[0].buttons[0].action).toEqual(button.action);
  await page
    .getByRole("button", {
      name: "Verrouiller le dossier Dossier principal",
      exact: true,
    })
    .click();
  await saved(page);
  await page.getByRole("button", { name: "Présentation", exact: true }).click();
  const player = page.getByRole("button", { name: button.name, exact: true });
  await player.click();
  await expect(page.locator(`[data-layer-id="${rect.id}"]`)).toHaveCount(0);
  await page.getByRole("button", { name: "Éditeur", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Masquer le dossier Dossier principal",
      exact: true,
    })
    .click();
  await saved(page);
  expect((await record(page)).pages[0].buttons[0].visible).toBe(button.visible);
  await page.getByRole("button", { name: "Présentation", exact: true }).click();
  await expect(player).toHaveCount(0);
  await page.getByRole("button", { name: "Éditeur", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Déverrouiller le dossier Dossier principal",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Afficher le dossier Dossier principal",
      exact: true,
    })
    .click();
  await add(page, "Bouton");
  await page
    .getByLabel("Type d’action", { exact: true })
    .selectOption("visibility");
  await page.getByLabel("Contrôler Rectangle 1", { exact: true }).check();
  await saved(page);
  const media = (await record(page)).media.map((m) => m.id);
  page.once("dialog", (d) => d.accept());
  await page
    .locator(".layer-folder")
    .first()
    .locator(":scope > .folder-actions")
    .getByRole("button", { name: "Supprimer avec contenu", exact: true })
    .click();
  await saved(page);
  const removed = await record(page);
  expect(removed.pages[0].layers).toHaveLength(0);
  expect(removed.pages[0].buttons).toHaveLength(1);
  expect(removed.pages[0].buttons[0].action.layerIds).toEqual([]);
  expect(removed.media.map((m) => m.id)).toEqual(media);
});
test("final : cadre vidéo avec ombre, bordure et plein écran sans recréer son média", async ({
  page,
}) => {
  await start(page);
  await add(page, "Cercle");
  const video = (await record(page)).media.find((m) =>
    m.type.startsWith("video/"),
  );
  await page
    .getByLabel("Média du cadre", { exact: true })
    .selectOption(video.id);
  await page
    .getByLabel("Lecture automatique à l’affichage", { exact: true })
    .check();
  const effects = page.locator(".property-section").filter({
    has: page.locator(":scope > summary", { hasText: /^Effets visuels$/ }),
  });
  if (!(await effects.evaluate((el) => el.open)))
    await effects.locator(":scope > summary").click();
  await page.getByLabel("Ombre portée", { exact: true }).check();
  await saved(page);
  const original = await record(page);
  await page.getByRole("button", { name: "Présentation", exact: true }).click();
  await expect
    .poll(() =>
      page.locator(".media-frame-surface video").evaluate((v) => v.currentTime),
    )
    .toBeGreaterThan(0.05);
  await expect(page.locator(".layer-content").first()).toHaveCSS(
    "filter",
    /drop-shadow/,
  );
  await page.keyboard.press("f");
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  expect((await record(page)).media.map((m) => m.id)).toEqual(
    original.media.map((m) => m.id),
  );
});
test("final : style et collage typographiques conservent le texte et ses dimensions", async ({
  page,
}) => {
  await start(page);
  await add(page, "Texte");
  await page.getByLabel("Taille du texte", { exact: true }).fill("120");
  await saved(page);
  await stylesOpen(page);
  await page.getByLabel("Nom du nouveau style", { exact: true }).fill("Titre");
  await page
    .getByRole("button", {
      name: "Créer un style depuis cet objet",
      exact: true,
    })
    .click();
  await saved(page);
  await add(page, "Texte");
  await stylesOpen(page);
  await page
    .getByLabel("Style du projet", { exact: true })
    .selectOption({ label: "Titre" });
  const before = (await record(page)).pages[0].layers[1];
  await page
    .getByRole("button", {
      name: "Appliquer le style lié à la sélection",
      exact: true,
    })
    .click();
  await saved(page);
  let after = (await record(page)).pages[0].layers[1];
  expect(after.content).toBe(before.content);
  expect(after.width).toBe(before.width);
  expect(after.height).toBe(before.height);
  expect(after.textStyle.autoHeight).toBe(false);
  await clipboardOpen(page);
  await page
    .getByRole("button", { name: "Copier l’apparence", exact: true })
    .click();
  await add(page, "Texte");
  const target = (await record(page)).pages[0].layers[2];
  await clipboardOpen(page);
  await page
    .getByLabel("Catégorie du collage spécial", { exact: true })
    .selectOption("typography");
  await page
    .getByRole("button", { name: "Appliquer le collage spécial", exact: true })
    .click();
  await saved(page);
  after = (await record(page)).pages[0].layers[2];
  expect(after.height).toBe(target.height);
  expect(after.width).toBe(target.width);
  expect(after.content).toBe(target.content);
  expect(after.textStyle.fontSize).toBe(120);
});
