import { test, expect } from "@playwright/test";
import JSZip from "jszip";
import fs from "node:fs/promises";
import { fittedMedia, frameMediaStyle } from "../src/mediaGeometry.js";
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
const frame = (p, id) => p.locator(`[data-layer-id="${id}"]`);
async function image(p, width, height) {
  const png = await p.evaluate(
    ({ width, height }) => {
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(0, 0, width / 3, height);
      ctx.fillStyle = "#00ff00";
      ctx.fillRect(width / 3, 0, width / 3, height);
      ctx.fillStyle = "#0000ff";
      ctx.fillRect((width * 2) / 3, 0, width / 3, height);
      return c.toDataURL("image/png").split(",")[1];
    },
    { width, height },
  );
  return {
    name: `original-${width}x${height}.png`,
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  };
}
async function add(p, type, file) {
  await p.getByRole("button", { name: "+ " + type, exact: true }).click();
  await p
    .getByRole("button", { name: "Importer / remplacer un média", exact: true })
    .click();
  await p.getByTestId("media-input").setInputFiles(file);
  const d = await record(p);
  return d.pages[0].layers.at(-1);
}
async function ratio(p, id, w, h) {
  const media = frame(p, id).locator(".frame-original-media").first();
  await expect
    .poll(() => media.evaluate((e) => e.naturalWidth || e.videoWidth))
    .toBe(w);
  const size = await media.evaluate((e) => ({
    w: parseFloat(getComputedStyle(e).width),
    h: parseFloat(getComputedStyle(e).height),
  }));
  expect(size.w / size.h).toBeCloseTo(w / h, 2);
  return media;
}
for (const [w, h] of [
  [320, 180],
  [180, 320],
  [240, 240],
])
  test(`image ${w}×${h} : média entier, masque fixe et déplacement proportionnel`, async ({
    page,
  }) => {
    await start(page);
    const l = await add(page, "Cercle", await image(page, w, h));
    const media = await ratio(page, l.id, w, h);
    const node = await media.elementHandle();
    const mask = frame(page, l.id).locator(".media-frame-surface");
    await expect(mask).toHaveCSS("overflow", "hidden");
    await page
      .getByRole("button", { name: "Modifier le contenu", exact: true })
      .click();
    await expect(mask).toHaveCSS("overflow", "visible");
    await expect(frame(page, l.id).locator(".crop-overlay")).toHaveCSS(
      "border-radius",
      "50%",
    );
    const original = await frame(page, l.id).boundingBox();
    const overlay = frame(page, l.id).locator(".crop-overlay"),
      box = await overlay.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + 25,
      box.y + box.height / 2 + 18,
      { steps: 4 },
    );
    await page.mouse.up();
    const next = (await record(page)).pages[0].layers[0];
    expect(next.frameMedia.crop.x).toBeCloseTo(25 / box.width, 1);
    expect(next.frameMedia.crop.y).toBeCloseTo(18 / box.height, 1);
    expect(next.x).toBe(l.x);
    expect(next.width).toBe(l.width);
    expect(await node.evaluate((e) => e.isConnected)).toBe(true);
    const after = await frame(page, l.id).boundingBox();
    expect(after.width).toBeCloseTo(original.width, 2);
    await page.getByLabel("Échelle du contenu", { exact: true }).fill("175");
    await ratio(page, l.id, w, h);
    await page.keyboard.press("Escape");
    await expect(mask).toHaveCSS("overflow", "hidden");
    await page
      .getByRole("button", { name: "Présentation", exact: true })
      .click();
    await ratio(page, l.id, w, h);
    await expect(frame(page, l.id).locator(".media-frame-surface")).toHaveCSS(
      "overflow",
      "hidden",
    );
  });
test("rectangle, zoom, taille de forme, historique, duplication, copie, recharge et ZIP réel", async ({
  page,
}, info) => {
  await start(page);
  const original = await image(page, 400, 180),
    l = await add(page, "Rectangle", original);
  await page.getByLabel("Largeur du calque (%)", { exact: true }).fill("30");
  await page.getByLabel("Hauteur du calque (%)", { exact: true }).fill("20");
  await page.getByLabel("Position interne X (%)", { exact: true }).fill("320");
  await page.getByLabel("Position interne Y (%)", { exact: true }).fill("-240");
  await page.getByLabel("Échelle du contenu", { exact: true }).fill("250");
  await ratio(page, l.id, 400, 180);
  await page.getByLabel("Zoom en pourcentage", { exact: true }).fill("75");
  await ratio(page, l.id, 400, 180);
  const before = (await record(page)).pages[0].layers[0];
  await page
    .getByRole("button", { name: "Modifier le contenu", exact: true })
    .click();
  await frame(page, l.id).locator(".crop-overlay").focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Escape");
  await page.locator(".editor").focus();
  await page.keyboard.press("Control+z");
  expect((await record(page)).pages[0].layers[0].frameMedia.crop).toEqual(
    before.frameMedia.crop,
  );
  await page.keyboard.press("Control+Shift+z");
  await page
    .getByRole("button", { name: "Dupliquer le calque", exact: true })
    .click();
  let d = await record(page);
  expect(d.pages[0].layers[1].frameMedia).toEqual(
    d.pages[0].layers[0].frameMedia,
  );
  await page.locator(".editor").focus();
  await page.keyboard.press("Control+c");
  await page.locator(".page-thumbnail").nth(1).click();
  await page.locator(".editor").focus();
  await page.keyboard.press("Control+v");
  await saved(page);
  d = await record(page);
  expect(d.pages[1].layers[0].frameMedia).toEqual(
    d.pages[0].layers[1].frameMedia,
  );
  const copied = d.pages[1].layers[0];
  await page.reload();
  await saved(page);
  await page.locator(".page-thumbnail").nth(1).click();
  await ratio(page, copied.id, 400, 180);
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Fichier", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Sauvegarder mon projet", exact: true })
    .click();
  const file = info.outputPath("cadrage-original.zip");
  await (await downloading).saveAs(file);
  const zip = await JSZip.loadAsync(await fs.readFile(file));
  const config = JSON.parse(
    await zip.file("presentation.json").async("string"),
  );
  expect(config.pages[1].layers[0].frameMedia).toEqual(copied.frameMedia);
  expect(
    await zip
      .file(config.media.find((m) => m.id === copied.frameMedia.mediaId).path)
      .async("nodebuffer"),
  ).toEqual(original.buffer);
  await page.getByTestId("zip-input").setInputFiles(file);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmer", exact: true })
    .click();
  expect((await record(page)).pages).toEqual(d.pages);
});
for (const [w, h] of [
  [320, 180],
  [180, 320],
])
  test(`vidéo ${w}×${h} : ratio original, même lecteur pendant le cadrage`, async ({
    page,
  }, info) => {
    const file = `tests/fixtures/crop-${w > h ? "landscape" : "portrait"}.mp4`;
    await start(page);
    const l = await add(page, "Cercle", file),
      video = await ratio(page, l.id, w, h);
    const node = await video.elementHandle();
    await frame(page, l.id)
      .getByRole("button", { name: "▶ / Ⅱ Aperçu", exact: true })
      .click();
    await expect
      .poll(() => video.evaluate((v) => v.currentTime))
      .toBeGreaterThan(0.1);
    await video.evaluate((v) => {
      window.cropVideo = v;
      window.cropLoads = 0;
      v.addEventListener("loadstart", () => window.cropLoads++);
      v.pause();
      v.currentTime = 1;
    });
    await expect
      .poll(() => video.evaluate((v) => v.currentTime))
      .toBeCloseTo(1, 1);
    await page
      .getByRole("button", { name: "Modifier le contenu", exact: true })
      .click();
    await page.getByLabel("Position interne X (%)", { exact: true }).fill("75");
    await page
      .getByLabel("Position interne Y (%)", { exact: true })
      .fill("-30");
    await page.getByLabel("Échelle du contenu", { exact: true }).fill("150");
    await ratio(page, l.id, w, h);
    expect(
      await node.evaluate((v) => v === window.cropVideo && v.isConnected),
    ).toBe(true);
    expect(await video.evaluate((v) => v.currentTime)).toBeCloseTo(1, 1);
    expect(await page.evaluate(() => window.cropLoads)).toBe(0);
    await page.getByRole("button", { name: "Terminer", exact: true }).click();
    await expect(frame(page, l.id).locator(".media-frame-surface")).toHaveCSS(
      "overflow",
      "hidden",
    );
  });
test("géométrie et migration : ajustement proportionnel, valeurs anciennes intactes", async () => {
  const { emptyPage, createLayer, migrateDocument } = await import(
    "../src/document.js"
  );
  const { frameCrop, framePlayback, validateFrames } = await import(
    "../src/mediaFrames.js"
  );
  const item = {
    ...createLayer("circle", 1),
    frameMedia: {
      kind: "image",
      mediaId: "m",
      crop: { ...frameCrop(), x: 0.3, y: -0.2, zoom: 1.5, rotation: 24 },
    },
  };
  const d = {
    version: 26,
    pages: [{ ...emptyPage(1), layers: [item], layerOrder: [item.id] }],
    media: [
      {
        id: "m",
        name: "m.png",
        type: "image/png",
        blob: new Blob(["fixture"], { type: "image/png" }),
        width: 320,
        height: 180,
      },
    ],
    transitions: [],
    custom: { keep: true },
  };
  expect(migrateDocument(d).pages[0].layers[0].frameMedia).toEqual(
    item.frameMedia,
  );
  expect(migrateDocument(d).custom).toEqual(d.custom);
  expect(fittedMedia(1920, 1080, 200, 200, "cover")).toEqual({
    width: (200 * 1920) / 1080,
    height: 200,
  });
  expect(fittedMedia(1920, 1080, 200, 200, "contain")).toEqual({
    width: 200,
    height: 112.5,
  });
  const style = frameMediaStyle(item, item.frameMedia.crop, {
    width: 1920,
    height: 1080,
  });
  expect(style.aspectRatio).toBe("1920 / 1080");
  expect(style.left).toBe("80%");
});

async function pixel(p, x, y) {
  const screenshot = await p.screenshot({
    clip: { x: Math.round(x), y: Math.round(y), width: 1, height: 1 },
  });
  return p.evaluate(async (base64) => {
    const image = new Image();
    image.src = "data:image/png;base64," + base64;
    await image.decode();
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const ctx = c.getContext("2d");
    ctx.drawImage(image, 0, 0);
    return [...ctx.getImageData(0, 0, 1, 1).data];
  }, screenshot.toString("base64"));
}
test("pixels réellement visibles : accès au bord original auparavant coupé, aperçu hors masque", async ({
  page,
}) => {
  await start(page);
  const l = await add(page, "Cercle", await image(page, 320, 180));
  await ratio(page, l.id, 320, 180);
  let b = await frame(page, l.id).boundingBox();
  await page
    .getByRole("button", { name: "Modifier le contenu", exact: true })
    .click();
  await page.screenshot({
    path: test.info().outputPath("edition-media-original.png"),
  });
  // Grab the original image outside the circular mask, not only its centre.
  await page.mouse.move(b.x - b.width * 0.2, b.y + b.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(b.x - b.width * 0.1, b.y + b.height * 0.55, {
    steps: 3,
  });
  await page.mouse.up();
  const moved = (await record(page)).pages[0].layers[0];
  expect(moved.frameMedia.crop.x).toBeGreaterThan(0.05);
  expect(moved.frameMedia.crop.y).toBeGreaterThan(0.01);
  await page.getByRole("button", { name: "Centrer", exact: true }).click();
  const outside = await pixel(page, b.x - b.width * 0.2, b.y + b.height * 0.5);
  expect(outside[0]).toBeGreaterThan(230);
  expect(outside[1]).toBeLessThan(20);
  expect(outside[2]).toBeLessThan(20);
  await page.getByLabel("Position interne X (%)", { exact: true }).fill("35");
  await page.getByRole("button", { name: "Terminer", exact: true }).click();
  b = await frame(page, l.id).boundingBox();
  const inside = await pixel(page, b.x + b.width * 0.15, b.y + b.height * 0.5);
  expect(inside[0]).toBeGreaterThan(230);
  expect(inside[1]).toBeLessThan(20);
  expect(inside[2]).toBeLessThan(20);
});
test("bouton elliptique : même géométrie intrinsèque, masque et actions conservés", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "+ Bouton", exact: true }).click();
  await page.getByLabel("Nom du bouton", { exact: true }).fill("Bouton masqué");
  await page
    .getByLabel("Type d’action", { exact: true })
    .selectOption("background");
  await page
    .getByRole("button", {
      name: "Importer / remplacer l’image du bouton",
      exact: true,
    })
    .click();
  await page
    .getByTestId("media-input")
    .setInputFiles(await image(page, 320, 180));
  await page
    .getByLabel("Forme du bouton", { exact: true })
    .selectOption("ellipse");
  await page
    .getByLabel("Ajustement de l’image du bouton", { exact: true })
    .selectOption("cover");
  const b = (await record(page)).pages[0].buttons[0],
    img = frame(page, b.id).locator(".button-image-clip img");
  await expect.poll(() => img.evaluate((e) => e.naturalWidth)).toBe(320);
  const ratio = async () =>
    img.evaluate((e) => {
      const s = getComputedStyle(e);
      return parseFloat(s.width) / parseFloat(s.height);
    });
  expect(await ratio()).toBeCloseTo(320 / 180, 2);
  await page
    .getByRole("button", { name: "Ajuster l’image", exact: true })
    .click();
  await expect(frame(page, b.id).locator(".button-paint")).toHaveCSS(
    "clip-path",
    "none",
  );
  await expect(frame(page, b.id).locator(".button-image-clip")).toHaveCSS(
    "overflow",
    "visible",
  );
  await page
    .getByLabel("Zoom de l’image du bouton", { exact: true })
    .fill("160");
  expect(await ratio()).toBeCloseTo(320 / 180, 2);
  await page.getByRole("button", { name: "Terminer", exact: true }).click();
  await expect(frame(page, b.id).locator(".button-paint")).toHaveCSS(
    "clip-path",
    /ellipse/,
  );
  await page.getByRole("button", { name: "Présentation", exact: true }).click();
  expect(await ratio()).toBeCloseTo(320 / 180, 2);
  await expect(
    page.getByRole("button", { name: "Bouton masqué", exact: true }),
  ).toBeEnabled();
});
