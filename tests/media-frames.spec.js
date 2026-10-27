import JSZip from "jszip";
import fs from "node:fs/promises";
import { test, expect } from "@playwright/test";
import {
  emptyPage,
  createLayer,
  createInteractiveButton,
  normalizeDocument,
  migrateDocument,
  duplicatePageModel,
} from "../src/document.js";
import {
  validateFrames,
  frameCrop,
  framePlayback,
  frameBorder,
} from "../src/mediaFrames.js";
import {
  createComponent,
  insertComponent,
} from "../src/componentsModel.js";
import { copySelection } from "../src/visualGroups.js";
import { validateActions, defaultAction } from "../src/actions.js";
const saved = (p) =>
  expect(p.locator(".save-status")).toHaveText(
    "✓ Sauvegardé dans ce navigateur",
  );
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
async function add(p, name) {
  await p
    .getByRole("toolbar")
    .getByRole("button", { name: "+ " + name, exact: true })
    .click();
  await saved(p);
  return (await record(p)).pages[0].layerOrder.at(-1);
}
const frame = (p, id) => p.locator(`[data-layer-id="${id}"]`);

test("apparence : bordure intérieure, transparence, rotation et annulation", async ({
  page,
}) => {
  await start(page);
  const id = await add(page, "Cercle");
  await page.getByLabel("Activer la bordure", { exact: true }).check();
  await page
    .getByLabel("Épaisseur de la bordure (px)", { exact: true })
    .fill("5");
  await page.getByLabel("Couleur de la bordure du cadre").fill("#0055ff");
  await page.getByLabel("Type de remplissage").selectOption("transparent");
  await page.getByLabel("Rotation du calque", { exact: true }).fill("35");
  await saved(page);
  await expect(frame(page, id).locator(".media-frame-surface")).toHaveCSS(
    "border-radius",
    "50%",
  );
  await expect(frame(page, id).locator(".media-frame-surface")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(frame(page, id).locator(".media-frame-border")).toHaveCSS(
    "box-shadow",
    /5px/,
  );
  expect((await record(page)).pages[0].layers[0]).toMatchObject({
    fillMode: "transparent",
    rotation: 35,
    border: { width: 5, color: "#0055ff" },
  });
  await page
    .getByLabel("Épaisseur de la bordure (px)", { exact: true })
    .fill("0");
  await saved(page);
  await expect(frame(page, id).locator(".media-frame-border")).toHaveCSS(
    "box-shadow",
    /0px/,
  );
  await page.getByRole("button", { name: "↶ Annuler", exact: true }).click();
  await expect(
    page.getByLabel("Épaisseur de la bordure (px)", { exact: true }),
  ).toHaveValue("5");
  await page.reload();
  await saved(page);
});

test("cadre image : bibliothèque, cadrage indépendant, dépôt et remplacement sans nouveau calque", async ({
  page,
}) => {
  await start(page);
  const id = await add(page, "Cercle"),
    before = await record(page);
  const image = before.media.find((m) => m.type.startsWith("image/"));
  await page
    .getByLabel("Média du cadre", { exact: true })
    .selectOption(image.id);
  await page.getByLabel("Rotation interne (°)").fill("20");
  await page.getByLabel("Échelle du contenu").fill("150");
  await saved(page);
  const geometry = (await record(page)).pages[0].layers[0];
  expect(geometry.frameMedia.crop).toMatchObject({ rotation: 20, zoom: 1.5 });
  await page
    .getByRole("button", { name: "Modifier le contenu", exact: true })
    .click();
  const overlay = frame(page, id).locator(".crop-overlay"),
    box = await overlay.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 20,
    box.y + box.height / 2 + 15,
    { steps: 5 },
  );
  await page.mouse.up();
  await saved(page);
  let after = (await record(page)).pages[0].layers[0];
  expect(after.frameMedia.crop.x).not.toBe(0);
  expect(after.x).toBe(geometry.x);
  expect(after.width).toBe(geometry.width);
  await page.keyboard.press("Escape");
  await frame(page, id)
    .locator(".layer-content")
    .dispatchEvent("drop", {
      dataTransfer: await page.evaluateHandle((id) => {
        const d = new DataTransfer();
        d.setData("application/studio-media", id);
        return d;
      }, image.id),
    });
  await saved(page);
  expect((await record(page)).media).toHaveLength(before.media.length);
  expect((await record(page)).pages[0].layers).toHaveLength(1);
  await page
    .getByRole("button", { name: "Importer / remplacer un média", exact: true })
    .click();
  // Le sélecteur natif utilise le champ média existant.
  await page
    .locator("input[type=file]")
    .evaluateAll((inputs) =>
      inputs
        .find((i) => i.accept.includes(".mp4") && i.accept.includes(".png"))
        .setAttribute("data-frame-input", "yes"),
    );
  await page
    .locator("[data-frame-input]")
    .setInputFiles("public/slides/ocean.png");
  await saved(page);
  expect((await record(page)).pages[0].layers[0].frameMedia.kind).toBe("image");
  await page
    .getByRole("button", { name: "Retirer le média", exact: true })
    .click();
  await saved(page);
  await expect(frame(page, id).locator("img")).toHaveCount(0);
});

test("vidéos intégrées : démarrage groupé, pause/reprise, fin figée, relance et état masqué", async ({
  page,
}) => {
  await start(page);
  const original = await record(page),
    video = original.media.find((m) => m.type.startsWith("video/"));
  const ids = [];
  for (let i = 0; i < 3; i++) {
    ids.push(await add(page, "Cercle"));
    await page
      .getByLabel("Média du cadre", { exact: true })
      .selectOption(video.id);
    if (i === 0)
      await page.getByLabel("Vitesse de lecture", { exact: true }).fill("2");
    if (i === 2)
      await page.getByLabel("Vitesse de lecture", { exact: true }).fill("0.5");
    await saved(page);
  }
  const button = await add(page, "Bouton");
  await page
    .getByLabel("Type d’action", { exact: true })
    .selectOption("layerVideo");
  for (let i = 1; i <= 3; i++)
    await page
      .getByLabel(`Contrôler la vidéo Cercle ${i}`, { exact: true })
      .check();
  await saved(page);
  await page
    .getByRole("button", { name: "Tester l’action", exact: true })
    .click();
  const videos = page.locator(".media-frame-surface video");
  await expect(videos).toHaveCount(3);
  await expect
    .poll(() => videos.evaluateAll((v) => v.every((x) => !x.paused)))
    .toBe(true);
  const times = await videos.evaluateAll((v) => v.map((x) => x.currentTime));
  expect(Math.max(...times) - Math.min(...times)).toBeLessThan(0.25);
  await expect
    .poll(
      () =>
        videos.evaluateAll(
          (v) => v[0].ended && v.some((x) => !x.ended && !x.paused),
        ),
      { timeout: 15000 },
    )
    .toBe(true);
  await expect
    .poll(() => videos.evaluateAll((v) => v.every((x) => x.ended)), {
      timeout: 15000,
    })
    .toBe(true);
  await expect(
    page.locator(".media-frame-surface canvas").first(),
  ).toBeVisible();
  expect(await videos.first().evaluate((v) => v.currentTime)).toBeGreaterThan(
    0,
  );
  await frame(page, button).locator(".interactive-button").click();
  await expect
    .poll(() =>
      videos.evaluateAll((v) => v.every((x) => !x.paused && x.currentTime < 2)),
    )
    .toBe(true);
  await page
    .getByRole("button", { name: "Positionner les boutons", exact: true })
    .click();
  await expect
    .poll(() => videos.evaluateAll((v) => v.every((x) => x.paused)))
    .toBe(true);
  await page.getByLabel("Commande vidéo").selectOption("pause");
  await page
    .getByRole("button", { name: "Tester l’action", exact: true })
    .click();
  await expect
    .poll(() => videos.evaluateAll((v) => v.every((x) => x.paused)))
    .toBe(true);
  await page
    .getByRole("button", { name: "Positionner les boutons", exact: true })
    .click();
  await page.getByLabel("Commande vidéo").selectOption("resume");
  await page
    .getByRole("button", { name: "Tester l’action", exact: true })
    .click();
  await expect
    .poll(() => videos.evaluateAll((v) => v.every((x) => !x.paused)))
    .toBe(true);
});

test("modèle : migration additive, validation stricte et remappage des cibles copiées", () => {
  const video = {
    id: "v",
    name: "v.mp4",
    type: "video/mp4",
    blob: new Blob(["test"], { type: "video/mp4" }),
  };
  const circle = {
    ...createLayer("circle", 1),
    border: { ...frameBorder(), enabled: true, width: 5 },
    fillMode: "transparent",
    frameMedia: {
      kind: "video",
      mediaId: "v",
      crop: { ...frameCrop(), rotation: 20 },
      playback: framePlayback(),
    },
  };
  const button = {
    ...createInteractiveButton(1),
    action: { ...defaultAction("layerVideo"), layerIds: [circle.id] },
  };
  let d = normalizeDocument({
    version: 14,
    pages: [{ ...emptyPage(1), layers: [circle], buttons: [button] }],
    media: [video],
    transitions: [],
    custom: { keep: true },
  });
  expect(migrateDocument(d)).toMatchObject({
    version: 40,
    custom: { keep: true },
  });
  validateFrames(d);
  validateActions(
    d,
    (id, kind) => id === null || (id === "v" && kind === "video"),
  );
  const copy = duplicatePageModel(d.pages[0]);
  expect(copy.buttons[0].action.layerIds).toEqual([copy.layers[0].id]);
  expect(copy.layers[0].frameMedia).toEqual(circle.frameMedia);
  const multi = copySelection(d.pages[0], [circle.id, button.id], d);
  expect(
    multi.layers.find((l) => l.action?.type === "layerVideo").action.layerIds,
  ).toEqual([multi.layers.find((l) => l.type === "circle").id]);
  d = createComponent(d, d.pages[0], [circle.id, button.id], "Bulles");
  const instance = insertComponent(d, d.components[0], d.pages[0]);
  const copiedFrame = instance.layers.find((l) => l.id !== circle.id),
    copiedButton = instance.buttons.find((b) => b.id !== button.id);
  expect(copiedButton.action.layerIds).toEqual([copiedFrame.id]);
  expect(copiedFrame.frameMedia.mediaId).toBe("v");
  validateFrames({ ...d, pages: [instance] });
  const invalid = structuredClone(d);
  invalid.pages[0].layers[0].frameMedia.crop.zoom = 100;
  expect(() => validateFrames(invalid)).toThrow();
  invalid.pages[0].layers[0] = circle;
  invalid.pages[0].layers[0] = {
    ...circle,
    frameMedia: { ...circle.frameMedia, mediaId: "missing" },
  };
  expect(() => migrateDocument(invalid)).toThrow();
});

test("vidéos : première image, masquage temporaire, boucle, visibilité et plein écran", async ({
  page,
}) => {
  await start(page);
  const v = (await record(page)).media.find((m) => m.type.startsWith("video/"));
  const id = await add(page, "Cercle");
  await page.getByLabel("Média du cadre", { exact: true }).selectOption(v.id);
  await page
    .getByLabel("Comportement à la fin", { exact: true })
    .selectOption("first");
  await saved(page);
  const button = await add(page, "Bouton");
  await page
    .getByLabel("Type d’action", { exact: true })
    .selectOption("layerVideo");
  await page.getByLabel("Contrôler la vidéo Cercle 1", { exact: true }).check();
  await saved(page);
  await page
    .getByRole("button", { name: "Tester l’action", exact: true })
    .click();
  let player = frame(page, id).locator("video");
  await expect
    .poll(() => player.evaluate((v) => v.currentTime > 0 && !v.paused))
    .toBe(true);
  await expect
    .poll(() => player.evaluate((v) => v.paused && v.currentTime === 0), {
      timeout: 15000,
    })
    .toBe(true);
  await page
    .getByRole("button", { name: "Positionner les boutons", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Sélectionner le calque Cercle 1",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Comportement à la fin", { exact: true })
    .selectOption("hide");
  await saved(page);
  await page
    .getByRole("button", { name: "Tester les interactions", exact: true })
    .click();
  await frame(page, button).locator(".interactive-button").click();
  await expect(frame(page, id).locator(".media-frame-surface")).toBeHidden({
    timeout: 15000,
  });
  await frame(page, button).locator(".interactive-button").click();
  await expect(frame(page, id).locator(".media-frame-surface")).toBeVisible();
  await page
    .getByRole("button", { name: "Positionner les boutons", exact: true })
    .click();
  await page.getByLabel("Lire en boucle", { exact: true }).check();
  await page
    .getByRole("button", { name: "Tester les interactions", exact: true })
    .click();
  await frame(page, button).locator(".interactive-button").click();
  await expect(player).toHaveJSProperty("loop", true);
  await expect.poll(() => player.evaluate((v) => !v.paused)).toBe(true);
  await page
    .getByRole("button", { name: "Positionner les boutons", exact: true })
    .click();
  await page.getByLabel("Calque visible", { exact: true }).uncheck();
  await page
    .getByRole("button", { name: "Tester les interactions", exact: true })
    .click();
  await frame(page, button).locator(".interactive-button").click();
  await expect.poll(() => player.evaluate((v) => v.paused)).toBe(true);
  await expect(frame(page, id)).toBeHidden();
  await page
    .getByRole("button", { name: "Positionner les boutons", exact: true })
    .click();
  await page.getByLabel("Calque visible", { exact: true }).check();
  await saved(page);
  await page
    .getByRole("button", { name: "▶ Lancer la présentation", exact: true })
    .click();
  await frame(page, button).locator(".interactive-button").click();
  if (!(await page.evaluate(() => !!document.fullscreenElement)))
    await page.keyboard.press("f");
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await expect
    .poll(() =>
      frame(page, id)
        .locator("video")
        .evaluate((v) => !v.paused),
    )
    .toBe(true);
  await page.keyboard.press("Escape");
});

test("sauvegarde : image et vidéo liées, cadrages, bordures et action restaurés depuis un vrai ZIP", async ({
  page,
  browser,
}, info) => {
  await start(page);
  const initial = await record(page),
    img = initial.media.find((m) => m.type.startsWith("image/")),
    v = initial.media.find((m) => m.type.startsWith("video/"));
  const imageId = await add(page, "Rectangle");
  await page.getByLabel("Média du cadre", { exact: true }).selectOption(img.id);
  await page.getByLabel("Activer la bordure", { exact: true }).check();
  await page.getByLabel("Coins arrondis (px)", { exact: true }).fill("20");
  await page.getByLabel("Rotation interne (°)", { exact: true }).fill("30");
  await saved(page);
  const videoId = await add(page, "Cercle");
  await page.getByLabel("Média du cadre", { exact: true }).selectOption(v.id);
  await page.getByLabel("Vitesse de lecture", { exact: true }).fill("1.5");
  await saved(page);
  const buttonId = await add(page, "Bouton");
  await page
    .getByLabel("Type d’action", { exact: true })
    .selectOption("layerVideo");
  await page.getByLabel("Contrôler la vidéo Cercle 2", { exact: true }).check();
  await saved(page);
  const original = await record(page);
  await page.reload();
  await saved(page);
  expect((await record(page)).pages).toEqual(original.pages);
  await page.getByRole("button", { name: "Fichier", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: /Sauvegarder mon projet/ }).click();
  const file = await (await download).path();
  const context = await browser.newContext(),
    other = await context.newPage();
  await start(other);
  await other.getByRole("button", { name: "Fichier", exact: true }).click();
  await other.getByRole("menuitem", { name: /Importer un ZIP/ }).click();
  await other
    .locator('input[type=file][accept=".zip,application/zip"]')
    .setInputFiles(file);
  await other.getByRole("button", { name: "Confirmer", exact: true }).click();
  await saved(other);
  expect((await record(other)).pages).toEqual(original.pages);
  expect((await record(other)).media).toHaveLength(original.media.length);
  const zip = await JSZip.loadAsync(await fs.readFile(file)),
    config = JSON.parse(await zip.file("presentation.json").async("string"));
  config.pages[0].layers[0].frameMedia.crop.zoom = 999;
  zip.file("presentation.json", JSON.stringify(config));
  const broken = info.outputPath("cadre-invalide.zip");
  await fs.writeFile(broken, await zip.generateAsync({ type: "nodebuffer" }));
  await other.getByTestId("zip-input").setInputFiles(broken);
  await expect(
    other.getByText(
      "Les paramètres des cadres multimédias sont invalides. Votre projet est conservé.",
      { exact: true },
    ),
  ).toBeVisible();
  expect((await record(other)).pages).toEqual(original.pages);
  await context.close();
});

test("cadres : import vidéo par dépôt, états interactifs, erreur isolée et arrêt groupé", async ({
  page,
}) => {
  await start(page);
  const id = await add(page, "Cercle");
  const bytes = await (
    await import("node:fs/promises")
  ).readFile("public/transitions/01-02.mp4");
  const transfer = await page.evaluateHandle(
    (bytes) => {
      const d = new DataTransfer();
      d.items.add(
        new File([new Uint8Array(bytes)], "bulle.mp4", { type: "video/mp4" }),
      );
      return d;
    },
    [...bytes],
  );
  await frame(page, id)
    .locator(".layer-content")
    .dispatchEvent("drop", { dataTransfer: transfer });
  await expect(frame(page, id).locator("video")).toHaveCount(1);
  await saved(page);
  expect((await record(page)).pages[0].layers[0].frameMedia.kind).toBe("video");
  const second = await add(page, "Cercle");
  await page
    .getByLabel("Média du cadre", { exact: true })
    .selectOption(
      (await record(page)).media.find((m) => m.type.startsWith("video/")).id,
    );
  await saved(page);
  const button = await add(page, "Bouton");
  await page
    .getByLabel("Type d’action", { exact: true })
    .selectOption("layerVideo");
  await page.getByLabel("Contrôler la vidéo Cercle 1", { exact: true }).check();
  await page.getByLabel("Contrôler la vidéo Cercle 2", { exact: true }).check();
  await saved(page);
  // Ajouter deux états dans le document sauvegardé sans effacer les médias.
  await page.evaluate(
    ({ id, button }) =>
      new Promise((resolve) => {
        const r = indexedDB.open("presentation-studio", 1);
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction("documents", "readwrite"),
            store = tx.objectStore("documents"),
            get = store.get("current");
          get.onsuccess = () => {
            const d = get.result,
              p = d.pages[0];
            p.states = [
              {
                id: "hidden",
                name: "Masqué",
                background: null,
                visibility: { [id]: false },
                activeButtonId: null,
              },
              {
                id: "shown",
                name: "Visible",
                background: null,
                visibility: { [id]: true },
                activeButtonId: null,
              },
            ];
            const b = {
              ...p.buttons[0],
              id: "state-button",
              name: "Masquer",
              x: 0.5,
              action: { type: "state", stateId: "hidden" },
            };
            p.buttons.push(b);
            p.layerOrder.push(b.id);
            store.put(d, "current");
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      }),
    { id, button },
  );
  await page.reload();
  await saved(page);
  await page
    .getByRole("button", { name: "Tester les interactions", exact: true })
    .click();
  await frame(page, button).locator(".interactive-button").click();
  const first = frame(page, id).locator("video");
  await expect.poll(() => first.evaluate((v) => !v.paused)).toBe(true);
  await frame(page, "state-button").locator(".interactive-button").click();
  await expect(frame(page, id)).toBeHidden();
  await expect.poll(() => first.evaluate((v) => v.paused)).toBe(true);
  await frame(page, button).locator(".interactive-button").click();
  await expect.poll(() => first.evaluate((v) => v.paused)).toBe(true);
  await page
    .getByRole("button", { name: "Positionner les boutons", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Sélectionner le calque Bouton 1",
      exact: true,
    })
    .click();
  await page.getByLabel("Commande vidéo").selectOption("stop");
  await page
    .getByRole("button", { name: "Tester l’action", exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .locator(".media-frame-surface video")
        .evaluateAll((v) => v.every((x) => x.paused && x.currentTime === 0)),
    )
    .toBe(true);
  // Une panne d’un lecteur ne bloque pas le second ni la navigation.
  await page
    .getByRole("button", { name: "Positionner les boutons", exact: true })
    .click();
  await page.getByLabel("Commande vidéo").selectOption("restart");
  await saved(page);
  await page
    .getByRole("button", { name: "Tester les interactions", exact: true })
    .click();
  await frame(page, id)
    .locator("video")
    .evaluate((v) => {
      v.src = "blob:missing-video";
      v.load();
    });
  await frame(page, button).locator(".interactive-button").click();
  await expect
    .poll(() =>
      frame(page, second)
        .locator("video")
        .evaluate((v) => !v.paused),
    )
    .toBe(true);
  await expect(frame(page, id).getByRole("status")).toContainText(
    "Vidéo illisible",
  );
});

test("image et rectangle : bordures et opacités indépendantes après rotation et redimensionnement", async ({
  page,
}) => {
  await start(page);
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
  const id = (await record(page)).pages[0].layers[0].id;
  await page.getByLabel("Activer la bordure", { exact: true }).check();
  await page
    .getByLabel("Épaisseur de la bordure (px)", { exact: true })
    .fill("7");
  await page
    .getByLabel("Opacité de la bordure (%)", { exact: true })
    .fill("30");
  await page.getByLabel("Rotation du calque", { exact: true }).fill("45");
  await page.getByLabel("Largeur du calque (%)", { exact: true }).fill("30");
  await saved(page);
  await expect(frame(page, id).locator(".media-frame-border")).toHaveCSS(
    "opacity",
    "0.3",
  );
  await expect(frame(page, id).locator("img")).toBeVisible();
  expect((await record(page)).pages[0].layers[0]).toMatchObject({
    rotation: 45,
    width: 0.3,
    border: { width: 7, opacity: 0.3 },
  });
  const rect = await add(page, "Rectangle");
  await page.getByLabel("Activer la bordure", { exact: true }).check();
  await page.getByLabel("Coins arrondis (px)", { exact: true }).fill("18");
  await page
    .getByLabel("Opacité du remplissage (%)", { exact: true })
    .fill("0");
  await saved(page);
  await expect(frame(page, rect).locator(".media-frame-surface")).toHaveCSS(
    "border-radius",
    "18px",
  );
  await expect(frame(page, rect).locator(".media-frame-border")).toHaveCSS(
    "opacity",
    "1",
  );
  await expect(frame(page, rect).locator(".media-frame-surface")).toHaveCSS(
    "background-color",
    /0\)/,
  );
});
