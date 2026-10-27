import fs from "node:fs/promises";
import JSZip from "jszip";
import { test, expect } from "@playwright/test";
const saved = (p) =>
  expect(p.locator(".save-status")).toContainText("Sauvegardé");
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
            g = t.objectStore("documents").get("current");
          g.onsuccess = () => resolve(g.result);
          t.oncomplete = () => db.close();
        };
      }),
  );
}
const timeline = (p) => p.locator(".editor-preview .milestone-timeline");
test("phase 1 : un seul calque, étapes stables, disposition, duplication, historique et recharge", async ({
  page,
}) => {
  await start(page);
  await add(page);
  let d = await record(page),
    l = d.pages[0].layers[0];
  expect(l.type).toBe("milestoneTimeline");
  expect(l.timeline.steps).toHaveLength(3);
  await expect(page.locator(".layer-list > li")).toHaveCount(1);
  const id = l.timeline.steps[0].id;
  await page.getByLabel("Nom de l’étape", { exact: true }).fill("Conception");
  await page
    .getByLabel("Statut de l’étape", { exact: true })
    .selectOption("done");
  await page
    .getByRole("button", { name: "Ajouter une étape", exact: true })
    .click();
  await page.getByLabel("Nom de l’étape", { exact: true }).fill("Lancement");
  await page
    .getByRole("button", { name: "Monter l’étape", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Dupliquer l’étape", exact: true })
    .click();
  d = await record(page);
  expect(d.pages[0].layers[0].timeline.steps).toHaveLength(5);
  expect(d.pages[0].layers[0].timeline.steps[0].id).toBe(id);
  await page
    .getByRole("button", { name: "Supprimer l’étape", exact: true })
    .click();
  await page.locator(".editor").focus();
  await page.keyboard.press("Control+z");
  expect((await record(page)).pages[0].layers[0].timeline.steps).toHaveLength(
    5,
  );
  await page.keyboard.press("Control+Shift+z");
  expect((await record(page)).pages[0].layers[0].timeline.steps).toHaveLength(
    4,
  );
  for (const mode of ["vertical", "zigzag", "horizontal"]) {
    await page
      .getByLabel("Disposition de la ligne du temps", { exact: true })
      .selectOption(mode);
    await expect(timeline(page)).toHaveAttribute("data-layout", mode);
  }
  await page.getByLabel("Largeur du calque (%)", { exact: true }).fill("75");
  await page.getByLabel("X du calque (%)", { exact: true }).fill("12");
  await page
    .getByRole("button", { name: "Dupliquer le calque", exact: true })
    .click();
  const before = await record(page);
  expect(before.pages[0].layers).toHaveLength(2);
  await page.reload();
  expect((await record(page)).pages).toEqual(before.pages);
  await expect(timeline(page)).toHaveCount(2);
});
test("phase 1 : modèle strict, ancien projet inchangé et 24 étapes lisibles sans sous-calques", async () => {
  const { createLayer, emptyPage, migrateDocument, duplicatePageModel } =
      await import("../src/document.js"),
    { timelineStep, timelineGeometry, validateMilestoneTimeline } =
      await import("../src/milestoneTimeline.js");
  const l = createLayer("milestoneTimeline", 1);
  l.timeline.steps = Array.from({ length: 24 }, (_, i) => timelineStep(i + 1));
  validateMilestoneTimeline(l);
  const g = timelineGeometry(l, l.timeline.steps);
  expect(g.points).toHaveLength(24);
  expect(g.width).toBeGreaterThan(l.width * 1920);
  const p = { ...emptyPage(1), layers: [l], layerOrder: [l.id] },
    copy = duplicatePageModel(p);
  expect(copy.layers[0].id).not.toBe(l.id);
  expect(copy.layers[0].timeline).toEqual(l.timeline);
  const invalid = structuredClone(l);
  invalid.timeline.design.spacing = -1;
  expect(() => validateMilestoneTimeline(invalid)).toThrow();
  const old = {
      version: 29,
      pages: [emptyPage(1)],
      media: [],
      transitions: [],
      privateMetadata: { keep: true },
    },
    next = migrateDocument(old);
  expect(next.version).toBe(40);
  expect(next.pages).toEqual(old.pages);
  expect(next.privateMetadata).toEqual(old.privateMetadata);
});
async function testing(p) {
  await p
    .getByRole("button", { name: "Tester les interactions", exact: true })
    .click();
}
async function edit(p) {
  await p
    .getByRole("button", { name: "Revenir au mode édition", exact: true })
    .click();
}
test("phase 2 : révélation, sélection, fiche, fermeture et absence d’écriture", async ({
  page,
}) => {
  await start(page);
  await add(page);
  await page
    .getByLabel("Description de l’étape", { exact: true })
    .fill("Informations de conception");
  await page.getByLabel("Révélation progressive", { exact: true }).check();
  const original = await record(page);
  await testing(page);
  await expect(
    page.getByRole("button", { name: "Étape Étape 2", exact: true }),
  ).toBeHidden();
  await page
    .getByRole("button", { name: "Étape suivante", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Étape Étape 2", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Étape Étape 1", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Fiche Étape 1", exact: true }),
  ).toContainText("Informations de conception");
  await page
    .getByRole("button", { name: "Fermer la fiche", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(timeline(page)).toHaveAttribute(
    "data-active-step",
    original.pages[0].layers[0].timeline.steps[0].id,
  );
  expect((await record(page)).pages).toEqual(original.pages);
  await page
    .getByRole("button", { name: "Étape précédente", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Étape Étape 2", exact: true }),
  ).toBeHidden();
});
test("phase 2 : phases stables, réduction, expansion, suppression sans perte et édition interne", async ({
  page,
}) => {
  await start(page);
  await add(page);
  await page
    .getByRole("button", { name: "Ajouter une phase", exact: true })
    .click();
  const phase = (await record(page)).pages[0].layers[0].timeline.phases[0];
  await page
    .getByLabel(`Nom de la phase ${phase.id}`, { exact: true })
    .fill("Conception");
  await page
    .getByLabel("Phase de l’étape", { exact: true })
    .selectOption(phase.id);
  await page
    .getByLabel("Réduire la phase Conception au départ", { exact: true })
    .check();
  await testing(page);
  await page
    .getByRole("button", { name: "Déployer la phase Conception", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Étape Étape 1", exact: true }),
  ).toBeVisible();
  await edit(page);
  await timeline(page).dblclick({ position: { x: 20, y: 20 } });
  await expect(
    page.getByRole("button", {
      name: "Terminer l’édition interne",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Titre de l’étape dans le canevas", { exact: true })
    .fill("Idéation");
  await page
    .getByRole("button", { name: "Terminer l’édition interne", exact: true })
    .click();
  await expect(page.getByLabel("Nom de l’étape", { exact: true })).toHaveValue(
    "Idéation",
  );
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Supprimer la phase Conception", exact: true })
    .click();
  const after = await record(page);
  expect(after.pages[0].layers[0].timeline.steps).toHaveLength(3);
  expect(after.pages[0].layers[0].timeline.steps[0].phaseId).toBeNull();
});
test("phase 3 : Espace révèle, ne navigue pas en même temps puis reprend la navigation", async ({
  page,
}) => {
  await start(page);
  await add(page);
  await page.getByLabel("Révélation progressive", { exact: true }).check();
  await page.getByRole("button", { name: "Présentation", exact: true }).click();
  await page
    .getByRole("button", { name: "Étape Étape 1", exact: true })
    .focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Étape Étape 2", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".slide-info")).toHaveText(
    "Une nouvelle perspective",
  );
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Étape Étape 3", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".is-current .milestone-timeline")).toHaveAttribute(
    "data-progress",
    "100",
  );
  await page.keyboard.press("Space");
  await expect(page.locator(".slide-info")).toHaveText("Changez d’atmosphère");
});
test("phase 3 : zoom étape et phase, aperçu général, tracés et réduction des animations", async ({
  page,
}) => {
  await start(page);
  await add(page);
  await page
    .getByRole("button", { name: "Ajouter une phase", exact: true })
    .click();
  const p = (await record(page)).pages[0].layers[0].timeline.phases[0];
  await page.getByLabel("Phase de l’étape", { exact: true }).selectOption(p.id);
  await page
    .getByLabel("Clic sur l’étape", { exact: true })
    .selectOption("zoom");
  await testing(page);
  await page
    .getByRole("button", { name: "Étape Étape 1", exact: true })
    .click();
  await expect(timeline(page)).toHaveAttribute("data-zoom", "1.8");
  await page
    .getByRole("button", { name: "Vue d’ensemble", exact: true })
    .click();
  await expect(timeline(page)).toHaveAttribute("data-zoom", "1");
  await page
    .getByRole("button", { name: `Zoomer sur la phase ${p.name}`, exact: true })
    .click();
  await expect(timeline(page).locator(".milestone-node")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Vue d’ensemble", exact: true })
    .click();
  await expect(timeline(page).locator(".milestone-node")).toHaveCount(3);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(timeline(page).locator(".milestone-canvas")).toHaveCSS(
    "transition-duration",
    "0s",
  );
  await edit(page);
  for (const mode of ["vertical", "zigzag"]) {
    await page
      .getByLabel("Disposition de la ligne du temps", { exact: true })
      .selectOption(mode);
    await testing(page);
    await expect(
      timeline(page).locator(".milestone-progress-path"),
    ).toHaveCount(1);
    await edit(page);
  }
});
test("phase 3 : une seule ligne du temps consomme Espace, priorité au dernier composant utilisé", async ({
  page,
}) => {
  await start(page);
  await add(page);
  await page.getByLabel("Révélation progressive", { exact: true }).check();
  const first = (await record(page)).pages[0].layers[0];
  await add(page);
  await page.getByLabel("Révélation progressive", { exact: true }).check();
  const second = (await record(page)).pages[0].layers[1];
  await page.getByLabel("Y du calque (%)", { exact: true }).fill("2");
  await page.getByLabel("Hauteur du calque (%)", { exact: true }).fill("20");
  await testing(page);
  const a = page.locator(`[data-layer-id="${first.id}"]`),
    b = page.locator(`[data-layer-id="${second.id}"]`);
  await page.locator(".editor").focus();
  await page.keyboard.press("Space");
  await expect(
    b.getByRole("button", { name: "Étape Étape 2", exact: true }),
  ).toBeVisible();
  await expect(
    a.getByRole("button", { name: "Étape Étape 2", exact: true }),
  ).toBeHidden();
  await a.getByRole("button", { name: "Étape Étape 1", exact: true }).click();
  await page.locator(`[data-timeline-card-owner="${first.id}"]`).getByRole("button", { name: "Fermer la fiche", exact: true }).click();
  await page.locator(".editor").focus();
  await page.keyboard.press("Space");
  await expect(
    a.getByRole("button", { name: "Étape Étape 2", exact: true }),
  ).toBeVisible();
  await expect(
    b.getByRole("button", { name: "Étape Étape 3", exact: true }),
  ).toBeHidden();
});
async function exportZip(page, info) {
  await page.getByRole("button", { name: "Fichier", exact: true }).click();
  const down = page.waitForEvent("download");
  await page
    .getByRole("menuitem", { name: "Sauvegarder mon projet", exact: true })
    .click();
  const file = info.outputPath("ligne-du-temps.zip");
  await (await down).saveAs(file);
  return { file, zip: await JSZip.loadAsync(await fs.readFile(file)) };
}
async function restoreZip(page, zip, info, name = "restauration.zip") {
  const file = info.outputPath(name);
  await fs.writeFile(file, await zip.generateAsync({ type: "nodebuffer" }));
  await page.getByTestId("zip-input").setInputFiles(file);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmer", exact: true })
    .click();
  await saved(page);
}
test("phase 4 : médias liés sans doublons, vidéo contrôlable, une seule fiche chargée, fermeture et vrai ZIP", async ({
  page,
  browser,
}, info) => {
  await start(page);
  await add(page);
  const base = await record(page);
  await page
    .getByRole("button", { name: "Importer l’image de l’étape", exact: true })
    .click();
  await page
    .getByTestId("media-input")
    .setInputFiles("public/slides/ocean.png");
  await saved(page);
  expect((await record(page)).media).toHaveLength(base.media.length);
  await page
    .getByRole("button", { name: "Importer la vidéo de l’étape", exact: true })
    .click();
  await page
    .getByTestId("media-input")
    .setInputFiles("tests/fixtures/crop-landscape.mp4");
  await saved(page);
  await page
    .getByRole("button", { name: "Modifier l’étape Étape 2", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Importer la vidéo de l’étape", exact: true })
    .click();
  await page
    .getByTestId("media-input")
    .setInputFiles("tests/fixtures/crop-landscape.mp4");
  const original = await record(page);
  expect(original.media).toHaveLength(base.media.length + 1);
  expect(original.pages[0].layers[0].timeline.steps[0].videoId).toBe(
    original.pages[0].layers[0].timeline.steps[1].videoId,
  );
  await testing(page);
  await expect(page.locator(".editor-preview .milestone-card video")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Étape Étape 1", exact: true })
    .click();
  const card = page.getByRole("dialog", { name: "Fiche Étape 1", exact: true });
  await expect(card.locator("img")).toBeVisible();
  const v = card.locator("video");
  await expect(v).toHaveJSProperty("controls", true);
  await expect(v).toHaveJSProperty("paused", true);
  await v.evaluate((v) => v.play());
  await expect(v).toHaveJSProperty("paused", false);
  const handle = await v.elementHandle();
  const r = await timeline(page).boundingBox(),
    c = await card.boundingBox();
  expect(c.x).toBeGreaterThanOrEqual(r.x - 1);
  expect(c.x + c.width).toBeLessThanOrEqual(r.x + r.width + 1);
  expect(c.y + c.height).toBeLessThanOrEqual(r.y + r.height + 1);
  await page
    .getByRole("button", { name: "Fermer la fiche", exact: true })
    .click();
  await expect(card).toHaveCount(0);
  expect(await handle.evaluate((v) => v.paused)).toBe(true);
  await page
    .getByRole("button", { name: "Étape Étape 2", exact: true })
    .click();
  await expect(page.locator(".editor-preview .milestone-card video")).toHaveCount(1);
  await edit(page);
  const { file } = await exportZip(page, info),
    context = await browser.newContext(),
    other = await context.newPage();
  await start(other);
  await other.getByTestId("zip-input").setInputFiles(file);
  await other
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmer", exact: true })
    .click();
  expect((await record(other)).pages).toEqual(original.pages);
  expect((await record(other)).media.map((m) => [m.id, m.blob.size])).toEqual(
    original.media.map((m) => [m.id, m.blob.size]),
  );
  await testing(other);
  await other
    .getByRole("button", { name: "Étape Étape 2", exact: true })
    .click();
  await expect(other.getByRole("dialog").locator("video")).toHaveJSProperty(
    "controls",
    true,
  );
  await context.close();
});
test("phase 4 : 24 étapes, glisser-déposer, styles modifiables, médias absents et import invalide atomique", async ({
  page,
}, info) => {
  await start(page);
  await add(page);
  let { zip } = await exportZip(page, info);
  const config = JSON.parse(
      await zip.file("presentation.json").async("string"),
    ),
    { timelineStep } = await import("../src/milestoneTimeline.js");
  config.pages[0].layers[0].timeline.steps = Array.from(
    { length: 24 },
    (_, i) => timelineStep(i + 1),
  );
  config.pages[0].layers[0].timeline.steps[0].imageId = "image-absente";
  config.pages[0].layers[0].timeline.privateMetadata = { keep: "oui" };
  zip.file("presentation.json", JSON.stringify(config));
  await restoreZip(page, zip, info);
  await page
    .getByRole("button", {
      name: "Sélectionner le calque Ligne du temps",
      exact: true,
    })
    .click();
  await expect(
    page.locator(".milestone-settings").getByRole("alert"),
  ).toContainText("Image absente");
  await page
    .getByLabel("Style de départ", { exact: true })
    .selectOption("compact");
  await page
    .getByText("Apparence de la ligne du temps", { exact: true })
    .click();
  await page.getByLabel("Taille des titres", { exact: true }).fill("26");
  await page
    .getByLabel("Fond de la ligne du temps", { exact: true })
    .fill("#182733");
  const before = await record(page);
  expect(before.pages[0].layers[0].timeline.design.fontSize).toBe(26);
  for (const mode of ["horizontal", "vertical", "zigzag"]) {
    await page
      .getByLabel("Disposition de la ligne du temps", { exact: true })
      .selectOption(mode);
    await expect(timeline(page).locator(".milestone-node")).toHaveCount(24);
  }
  const rows = page.locator(".milestone-step-list li");
  const first = (await record(page)).pages[0].layers[0].timeline.steps[0].id;
  await rows.first().dragTo(rows.nth(2));
  expect((await record(page)).pages[0].layers[0].timeline.steps[1].id).toBe(
    first,
  );
  await testing(page);
  await page
    .getByRole("button", { name: "Étape Étape 1", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Image indisponible");
  await page
    .getByRole("button", { name: "Fermer la fiche", exact: true })
    .click();
  await expect(page.locator(".editor-preview .milestone-card video")).toHaveCount(0);
  await page
    .locator(".editor-preview")
    .screenshot({ path: info.outputPath("ligne-24-etapes.png") });
  await edit(page);
  const original = await record(page);
  ({ zip } = await exportZip(page, info));
  const bad = JSON.parse(await zip.file("presentation.json").async("string"));
  bad.pages[0].layers[0].timeline.design.spacing = -100;
  zip.file("presentation.json", JSON.stringify(bad));
  const file = info.outputPath("invalide.zip");
  await fs.writeFile(file, await zip.generateAsync({ type: "nodebuffer" }));
  await page.getByTestId("zip-input").setInputFiles(file);
  await expect(
    page.locator(".editor-message").filter({
      hasText: "La configuration de la ligne du temps est invalide",
    }),
  ).toContainText("projet actuel est conservé");
  expect((await record(page)).pages).toEqual(original.pages);
});
test("phase 4 : changement d’état, groupe de visibilité et nettoyage des fiches", async ({
  page,
}, info) => {
  await start(page);
  await add(page);
  const { zip } = await exportZip(page, info),
    config = JSON.parse(await zip.file("presentation.json").async("string")),
    { createInteractiveButton } = await import("../src/document.js"),
    p = config.pages[0],
    l = p.layers[0];
  p.states = [
    {
      id: "a",
      name: "Avant",
      background: null,
      visibility: {},
      activeButtonId: null,
    },
    {
      id: "b",
      name: "Après",
      background: null,
      visibility: {},
      activeButtonId: null,
    },
  ];
  p.initialStateId = "a";
  p.visibilityGroups = [
    { id: "g", name: "Chronologie", layerIds: [l.id], initialVisible: true },
  ];
  p.buttons = [
    {
      ...createInteractiveButton(1),
      name: "Changer état",
      x: 0.72,
      y: 0.82,
      action: { type: "state", stateId: "b" },
    },
    {
      ...createInteractiveButton(2),
      name: "Masquer chronologie",
      x: 0.1,
      y: 0.82,
      action: {
        type: "visibilityGroups",
        operations: [{ groupId: "g", mode: "toggle" }],
      },
    },
  ];
  p.layerOrder.push(...p.buttons.map((b) => b.id));
  zip.file("presentation.json", JSON.stringify(config));
  await restoreZip(page, zip, info);
  await testing(page);
  await page
    .getByRole("button", { name: "Étape Étape 1", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Changer état", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(timeline(page)).toBeVisible();
  await page
    .getByRole("button", { name: "Étape Étape 2", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Masquer chronologie", exact: true })
    .click();
  await expect(timeline(page)).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Masquer chronologie", exact: true })
    .click();
  await expect(timeline(page)).toBeVisible();
  expect((await record(page)).pages).toEqual(config.pages);
});
test("phase 4 : composant réutilisable, copier/coller entre pages, verrou et données indépendantes", async ({
  page,
}) => {
  await start(page);
  await add(page);
  await page
    .getByLabel("Nom du nouveau composant", { exact: true })
    .fill("Feuille de route");
  await page
    .getByRole("button", { name: "Créer un composant", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Panneau Composants", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Insérer une instance", exact: true })
    .click();
  let d = await record(page);
  expect(d.components).toHaveLength(1);
  expect(d.pages[0].layers).toHaveLength(2);
  const first = d.pages[0].layers[0],
    copy = d.pages[0].layers[1];
  expect(copy.timeline).toEqual(first.timeline);
  await page
    .getByRole("button", { name: "Panneau Calques", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: `Sélectionner le calque ${copy.name}`,
      exact: true,
    })
    .last()
    .click();
  await page.locator(".editor").focus();
  await page.keyboard.press("Control+c");
  await page.locator(".page-thumbnail").nth(1).click();
  await page.locator(".editor").focus();
  await page.keyboard.press("Control+v");
  d = await record(page);
  expect(d.pages[1].layers).toHaveLength(1);
  expect(d.pages[1].layers[0].timeline).toEqual(copy.timeline);
  await page
    .getByLabel("Nom de l’étape", { exact: true })
    .fill("Copie modifiée");
  expect(
    (await record(page)).pages[0].layers[0].timeline.steps[0].name,
  ).not.toBe("Copie modifiée");
  await page.getByLabel("Verrouiller le déplacement", { exact: true }).check();
  await page.getByRole("button", { name: "Présentation", exact: true }).click();
  await page
    .getByRole("button", { name: "Étape Copie modifiée", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Fiche Copie modifiée", exact: true }),
  ).toBeVisible();
});
test("phase 4 : modèle média, palette liée et métadonnées conservées", async () => {
  const { createLayer, emptyPage, normalizeDocument, migrateDocument } =
      await import("../src/document.js"),
    {
      validateMilestoneTimeline,
      validateMilestoneMedia,
      timelineProgress,
      timelineGeometry,
    } = await import("../src/milestoneTimeline.js"),
    { imageUsages } = await import("../src/imageLibrary.js"),
    { validateProjectColors, resolveColors } =
      await import("../src/projectColors.js");
  const l = createLayer("milestoneTimeline", 1),
    p = { ...emptyPage(1), layers: [l], layerOrder: [l.id] },
    d = normalizeDocument({
      version: 30,
      pages: [p],
      media: [
        {
          id: "i",
          name: "i.png",
          type: "image/png",
          blob: new Blob(["fixture"]),
        },
      ],
      transitions: [],
      privateMetadata: { keep: true },
    });
  l.timeline.steps[0].imageId = "i";
  l.timeline.privateMetadata = { keep: true };
  expect(imageUsages({ ...d, pages: [p] }, "i").join(" ")).toContain("Étape 1");
  validateMilestoneMedia({ ...d, pages: [p] });
  const invalid = structuredClone(l);
  invalid.timeline.steps[0].videoId = "i";
  expect(() =>
    validateMilestoneMedia({ ...d, pages: [{ ...p, layers: [invalid] }] }),
  ).toThrow("incompatible");
  const bad = structuredClone(l);
  bad.timeline.steps[1].id = bad.timeline.steps[0].id;
  expect(() => validateMilestoneTimeline(bad)).toThrow();
  d.projectColors = [
    { id: "c", name: "Accent", value: "#112233", favorite: false },
  ];
  d.pages[0].layers[0].colorLinks = { "timeline.design.progressColor": "c" };
  validateProjectColors(d);
  expect(
    resolveColors(d.pages[0].layers[0], d.projectColors).timeline.design
      .progressColor,
  ).toBe("#112233");
  const g = timelineGeometry(l, l.timeline.steps);
  expect(
    timelineProgress(
      g.points,
      l.timeline.steps.at(-1).id,
      3,
      l.timeline.design,
    ),
  ).toBe(100);
  expect(migrateDocument(d).privateMetadata).toEqual({ keep: true });
});
test("phase 4 : 24 étapes révélées restent accessibles grâce au défilement automatique", async ({
  page,
}, info) => {
  await start(page);
  await add(page);
  const { zip } = await exportZip(page, info),
    config = JSON.parse(await zip.file("presentation.json").async("string")),
    { timelineStep } = await import("../src/milestoneTimeline.js"),
    t = config.pages[0].layers[0].timeline;
  t.steps = Array.from({ length: 24 }, (_, i) => timelineStep(i + 1));
  t.design.reveal = true;
  t.design.revealDuration = 0;
  zip.file("presentation.json", JSON.stringify(config));
  await restoreZip(page, zip, info);
  await testing(page);
  for (let i = 1; i < 24; i++)
    await page
      .getByRole("button", { name: "Étape suivante", exact: true })
      .click();
  await expect
    .poll(() =>
      timeline(page)
        .locator(".milestone-viewport")
        .evaluate((v) => v.scrollLeft),
    )
    .toBeGreaterThan(0);
  await expect(
    page.getByRole("button", { name: "Étape Étape 24", exact: true }),
  ).toBeInViewport();
  expect((await record(page)).pages[0].layers[0].timeline.steps).toHaveLength(
    24,
  );
});
test("retour à l’éditeur : fiche et zoom réinitialisés, suppression de phase zoomée sans vue fantôme", async ({
  page,
}) => {
  await start(page);
  await add(page);
  await page
    .getByRole("button", { name: "Ajouter une phase", exact: true })
    .click();
  const phase = (await record(page)).pages[0].layers[0].timeline.phases[0];
  await page
    .getByLabel("Phase de l’étape", { exact: true })
    .selectOption(phase.id);
  await testing(page);
  await page
    .getByRole("button", { name: "Étape Étape 1", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await edit(page);
  await testing(page);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Étape Étape 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Fermer la fiche", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Zoom sur l’étape active", exact: true })
    .click();
  await expect(timeline(page)).toHaveAttribute("data-zoom", "1.8");
  await edit(page);
  await expect(timeline(page)).toHaveAttribute("data-zoom", "1");
  await timeline(page).dblclick({ position: { x: 20, y: 20 } });
  await page
    .getByRole("button", {
      name: `Zoomer sur la phase ${phase.name}`,
      exact: true,
    })
    .click();
  await expect(timeline(page).locator(".milestone-node")).toHaveCount(1);
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", {
      name: `Supprimer la phase ${phase.name}`,
      exact: true,
    })
    .click();
  await expect(timeline(page)).toHaveAttribute("data-zoom", "1");
  await expect(timeline(page).locator(".milestone-node")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Étape Étape 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Fermer la fiche", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Zoom sur l’étape active", exact: true })
    .click();
  await expect(timeline(page)).toHaveAttribute("data-zoom", "1.8");
  await page
    .getByRole("button", { name: "Terminer l’édition interne", exact: true })
    .click();
  await expect(timeline(page)).toHaveAttribute("data-zoom", "1");
});
