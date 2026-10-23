import { test, expect } from "@playwright/test";
import { copySelection } from "../src/visualGroups.js";
import {
  emptyPage,
  createLayer,
  createInteractiveButton,
  orderedLayers,
} from "../src/document.js";
import JSZip from "jszip";
import fs from "node:fs/promises";
const saved = (p) =>
  expect(p.locator(".save-status")).toContainText("Sauvegardé");
const cards = (p) => p.locator(".timeline .page-thumbnail");
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
function geometry(i) {
  return Object.fromEntries(
    ["x", "y", "width", "height", "rotation"].map((k) => [k, i[k]]),
  );
}

test("modèle : toutes formes de calques, groupe, médias et références internes conservés sans déplacement", () => {
  const source = emptyPage(1),
    dest = emptyPage(2),
    third = emptyPage(3);
  const layers = [
    "text",
    "image",
    "rectangle",
    "circle",
    "line",
    "vectorLine",
  ].map((type, i) => ({
    ...createLayer(type, i + 1),
    x: 0.05 + i * 0.11,
    y: 0.17 + i * 0.07,
    rotation: 15 + i * 3,
  }));
  layers[1].imageId = "photo";
  layers[2].frameMedia = {
    kind: "video",
    mediaId: "movie",
    crop: { mode: "contain", x: 0.1, y: -0.1, zoom: 1.2, rotation: 7 },
    autoplay: true,
    loop: true,
  };
  const button = {
    ...createInteractiveButton(1),
    x: 0.73,
    y: 0.81,
    width: 0.2,
    height: 0.15,
    rotation: 25,
    action: {
      type: "visibility",
      mode: "toggle",
      layerIds: [layers[0].id, layers[2].id],
    },
  };
  source.layers = layers;
  source.buttons = [button];
  source.layerOrder = [button.id, ...layers.map((l) => l.id)];
  source.visualGroups = [
    { id: "group", name: "Ensemble", children: [...source.layerOrder] },
  ];
  const doc = {
      pages: [source, dest, third],
      media: [{ id: "photo" }, { id: "movie" }],
    },
    before = structuredClone(source);
  for (const target of [dest, third, dest]) {
    const copy = copySelection(
        structuredClone(source),
        source.layerOrder,
        doc,
        target,
      ),
      original = orderedLayers(source);
    copy.layers.forEach((item, i) => {
      expect(geometry(item)).toEqual(geometry(original[i]));
      const { id, name, type, ...properties } = item;
      const {
        id: oldId,
        name: oldName,
        type: oldType,
        ...oldProperties
      } = original[i];
      if (!item.action) expect(properties).toEqual(oldProperties);
      expect(id).not.toBe(oldId);
    });
    expect(copy.layers[0].action.layerIds).toEqual([
      copy.layers[1].id,
      copy.layers[3].id,
    ]);
    expect(copy.groups[0].children).toEqual(copy.ids);
    expect(copy.groups[0].id).not.toBe("group");
    expect(new Set(copy.ids).size).toBe(copy.ids.length);
  }
  for (const layer of orderedLayers(source))
    expect(
      geometry(copySelection(source, [layer.id], doc, dest).layers[0]),
    ).toEqual(geometry(layer));
  expect(source).toEqual(before);
  // Un instantané cloné de la même page conserve le décalage collectif historique.
  const same = copySelection(
    structuredClone(source),
    source.layerOrder,
    doc,
    source,
  );
  for (const [i, item] of same.layers.entries()) {
    expect(item.x).toBeCloseTo(orderedLayers(source)[i].x + 0.03, 12);
    expect(item.y).toBeCloseTo(orderedLayers(source)[i].y + 0.03, 12);
  }
  const edge = { ...layers[0], x: 0.99, y: 0.98, width: 0.05, height: 0.05 };
  const p = {
    ...source,
    layers: [edge],
    buttons: [],
    layerOrder: [edge.id],
    visualGroups: [],
  };
  expect(geometry(copySelection(p, [edge.id], doc, dest).layers[0])).toEqual(
    geometry(edge),
  );
});

test("modèle : un état absent reste invalide, aucun lien par nom, navigation valide conservée", () => {
  const source = emptyPage(1),
    target = emptyPage(2),
    button = createInteractiveButton(1);
  source.states = [{ id: "original", name: "Ouvert" }];
  target.states = [{ id: "different", name: "Ouvert" }];
  source.buttons = [
    { ...button, action: { type: "state", stateId: "original" } },
  ];
  source.layerOrder = [button.id];
  const doc = { pages: [source, target], media: [] };
  const copy = copySelection(source, [button.id], doc, target).layers[0];
  expect(copy.action.stateId).toBeNull();
  expect(source.buttons[0].action.stateId).toBe("original");
  source.buttons[0].action = {
    type: "navigate",
    pageId: target.id,
    transitionId: null,
  };
  expect(
    copySelection(source, [button.id], doc, target).layers[0].action,
  ).toEqual(source.buttons[0].action);
});

test("clavier : groupe bouton/texte/image, zoom et main, collages répétés, Undo/Redo et ZIP", async ({
  page,
  browser,
}, info) => {
  await page.goto("/");
  await saved(page);
  await page.getByRole("button", { name: "+ Texte", exact: true }).click();
  await page
    .getByLabel("Contenu du texte", { exact: true })
    .fill("Coordonnées identiques — éèàçœ");
  await page
    .getByLabel("Police du texte", { exact: true })
    .selectOption("manrope");
  await page
    .getByLabel("Graisse du texte", { exact: true })
    .selectOption("600");
  await page.getByRole("button", { name: "+ Image", exact: true }).click();
  await page
    .getByTestId("media-input")
    .setInputFiles("public/slides/sunset.png");
  await saved(page);
  await page.getByRole("button", { name: "+ Bouton", exact: true }).click();
  await page
    .getByLabel("Type d’action", { exact: true })
    .selectOption("visibility");
  await page.getByLabel("Contrôler Coordonnées identiques — éèàçœ", { exact: true }).check();
  await saved(page);
  await page.locator(".editor").focus();
  await page.keyboard.press("Control+a");
  await expect(
    page.getByText("3 éléments sélectionnés", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Control+g");
  await saved(page);
  expect((await record(page)).pages[0].visualGroups).toHaveLength(1);
  await page.locator(".editor").focus();
  await page.keyboard.press("Control+c");
  const original = await record(page),
    source = original.pages[0],
    originalItems = orderedLayers(source);
  expect(originalItems).toHaveLength(3);
  for (const [index, zoom] of [
    [1, 50],
    [2, 200],
    [1, 100],
  ]) {
    await cards(page).nth(index).click();
    await page.getByLabel("Zoom en pourcentage").fill(String(zoom));
    const area = page.locator(".canvas-scroll"),
      box = await area.boundingBox();
    await page.locator(".editor").focus();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.keyboard.down("Space");
    await expect(area).toHaveClass(/hand-tool/);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + 35,
      box.y + box.height / 2 + 25,
      { steps: 3 },
    );
    await page.mouse.up();
    await page.keyboard.up("Space");
    await page.locator(".editor").focus();
    const before = await record(page);
    await page.keyboard.press("Control+v");
    await saved(page);
    let after = await record(page),
      target = after.pages[index];
    expect(target.layerOrder).toHaveLength(
      before.pages[index].layerOrder.length + 3,
    );
    const newIds = target.layerOrder.slice(-originalItems.length),
      copies = newIds.map((id) =>
        orderedLayers(target).find((l) => l.id === id),
      );
    copies.forEach((l, i) =>
      expect(geometry(l)).toEqual(geometry(originalItems[i])),
    );
    expect(target.visualGroups.at(-1).children).toEqual(newIds);
    expect(copies[0].textStyle).toEqual(originalItems[0].textStyle);
    expect(target.buttons.at(-1).action.layerIds).toEqual([copies[0].id]);
    expect(after.pages[0]).toEqual(source);
    await page.keyboard.press("Control+z");
    await saved(page);
    expect((await record(page)).pages).toEqual(before.pages);
    await page.keyboard.press("Control+Shift+z");
    await saved(page);
    expect((await record(page)).pages).toEqual(after.pages);
  }
  await cards(page).first().click();
  await cards(page).first().focus();
  await page.keyboard.press("Control+v");
  await saved(page);
  const same = (await record(page)).pages[0];
  orderedLayers(same)
    .slice(-3)
    .forEach((l, i) => {
      expect(l.x).toBeCloseTo(originalItems[i].x + 0.03, 12);
      expect(l.y).toBeCloseTo(originalItems[i].y + 0.03, 12);
    });
  await page.setViewportSize({ width: 1200, height: 900 });
  await cards(page).nth(2).click();
  await page.keyboard.press("Control+v");
  await saved(page);
  const final = await record(page);
  orderedLayers(final.pages[2])
    .slice(-3)
    .forEach((l, i) => expect(geometry(l)).toEqual(geometry(originalItems[i])));
  expect(final.media.map((m) => [m.id, m.blob.size])).toEqual(
    original.media.map((m) => [m.id, m.blob.size]),
  );
  const down = page.waitForEvent("download");
  await page.getByRole("button", { name: "Fichier", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Sauvegarder mon projet", exact: true })
    .click();
  const file = info.outputPath("paste.zip");
  await (await down).saveAs(file);
  const zip = await JSZip.loadAsync(await fs.readFile(file));
  expect(
    JSON.parse(await zip.file("presentation.json").async("string")).pages,
  ).toEqual(final.pages);
  await page.reload();
  await saved(page);
  expect((await record(page)).pages).toEqual(final.pages);
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
  expect((await record(other)).pages).toEqual(final.pages);
  await other
    .getByRole("button", { name: "Présentation", exact: true })
    .click();
  await expect(other.locator(".text-body").first()).toHaveText(
    "Coordonnées identiques — éèàçœ",
  );
  await ctx.close();
});
