import { test, expect } from "@playwright/test";
import JSZip from "jszip";
import fs from "node:fs/promises";
const option = "Activer un état de page après la lecture";
const saved = (p) =>
  expect(p.locator(".save-status")).toContainText("Sauvegardé");
async function start(p) {
  await p.goto("/");
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
const frame = (p, id) => p.locator(`[data-layer-id="${id}"]`),
  video = (p, id) => frame(p, id).locator("video");
async function configure(p, { multiple = false, enabled = true } = {}) {
  await start(p);
  const ids = [];
  for (let i = 0; i < (multiple ? 2 : 1); i++) {
    await p.getByRole("button", { name: "+ Cercle", exact: true }).click();
    await p
      .getByRole("button", {
        name: "Importer / remplacer un média",
        exact: true,
      })
      .click();
    await p
      .getByTestId("media-input")
      .setInputFiles("tests/fixtures/crop-landscape.mp4");
    ids.push((await record(p)).pages[0].layers.at(-1).id);
  }
  await p.getByRole("button", { name: "+ Texte", exact: true }).click();
  const text = (await record(p)).pages[0].layers.at(-1);
  await p.getByRole("button", { name: "+ Bouton", exact: true }).click();
  await p.getByLabel("Nom du bouton", { exact: true }).fill("Ouvrir");
  await p
    .getByLabel("Type d’action", { exact: true })
    .selectOption("layerVideo");
  for (let i = 1; i <= ids.length; i++)
    await p
      .getByLabel(`Contrôler la vidéo Cercle ${i}`, { exact: true })
      .check();
  await expect(p.getByLabel(option, { exact: true })).not.toBeChecked();
  await expect(p.getByLabel(option, { exact: true })).toBeDisabled();
  await p
    .getByRole("button", { name: "+ Ajouter un état", exact: true })
    .click();
  await p
    .getByRole("button", { name: "+ Ajouter un état", exact: true })
    .click();
  const states = (await record(p)).pages[0].states;
  await p
    .getByLabel(`Nom de l’état ${states[0].id}`, { exact: true })
    .fill("Fermé");
  await p
    .getByLabel(`Nom de l’état ${states[1].id}`, { exact: true })
    .fill("Ouvert");
  await p
    .getByLabel("État initial", { exact: true })
    .selectOption(states[0].id);
  await p
    .getByLabel("Visibilité de Votre texte dans Fermé", { exact: true })
    .selectOption("hide");
  await p
    .getByLabel("Visibilité de Ouvrir dans Ouvert", { exact: true })
    .selectOption("hide");
  for (let i = 1; i <= ids.length; i++)
    await p
      .getByLabel(`Visibilité de Cercle ${i} dans Ouvert`, { exact: true })
      .selectOption("hide");
  if (enabled) {
    await p.getByLabel(option, { exact: true }).check();
    await p
      .getByLabel("État de page après la lecture", { exact: true })
      .selectOption(states[1].id);
  }
  await saved(p);
  return { ids, text, states, button: (await record(p)).pages[0].buttons[0] };
}
async function play(p, mode = "test") {
  await p
    .getByRole("button", {
      name: mode === "test" ? "Tester les interactions" : "Présentation",
      exact: true,
    })
    .click();
  await p.getByRole("button", { name: "Ouvrir", exact: true }).click();
}
async function end(p, id) {
  const v = video(p, id);
  await expect.poll(() => v.evaluate((v) => v.duration)).toBeGreaterThan(0);
  await v.evaluate((v) => {
    v.currentTime = v.duration - 0.05;
    v.play();
  });
}
async function expectClosed(p, m) {
  await expect(frame(p, m.text.id)).toHaveCount(0);
  await expect(
    p.getByRole("button", { name: "Ouvrir", exact: true }),
  ).toBeVisible();
}
async function expectOpen(p, m) {
  await expect(frame(p, m.text.id)).toBeVisible();
  await expect(
    p.getByRole("button", { name: "Ouvrir", exact: true }),
  ).toHaveCount(0);
}
test("fin naturelle : état réel, calques, vitesse modifiée, Test et Présentation sans écriture", async ({
  page,
}) => {
  const m = await configure(page);
  await page
    .getByRole("button", {
      name: "Sélectionner le calque Cercle 1",
      exact: true,
    })
    .click();
  await page.getByLabel("Vitesse de lecture", { exact: true }).fill("2");
  const before = await record(page);
  await play(page);
  await expectClosed(page, m);
  await expect
    .poll(() => video(page, m.ids[0]).evaluate((v) => v.playbackRate))
    .toBe(2);
  // Wait for the action controller to finish preparing/restarting the video.
  // Duration alone is available before playback has actually begun.
  await expect.poll(() => video(page, m.ids[0]).evaluate(v => !v.paused && !v.seeking && v.currentTime > 0)).toBe(true);
  await end(page, m.ids[0]);
  await expectOpen(page, m);
  expect((await record(page)).pages).toEqual(before.pages);
  await expect(
    page.locator(".action-video,.transition-video,[data-video-overlay=true]"),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Revenir au mode édition", exact: true })
    .click();
  await play(page, "presentation");
  // Wait for the action controller to finish preparing/restarting the video.
  // Duration alone is available before playback has actually begun.
  await expect.poll(() => video(page, m.ids[0]).evaluate(v => !v.paused && !v.seeking && v.currentTime > 0)).toBe(true);
  await end(page, m.ids[0]);
  await expectOpen(page, m);
});
test("option désactivée : aucune activation après la lecture", async ({
  page,
}) => {
  const m = await configure(page, { enabled: false });
  expect(m.button.action.afterPlayback).toBeUndefined();
  await play(page);
  await end(page, m.ids[0]);
  await expect
    .poll(() => video(page, m.ids[0]).evaluate((v) => v.ended))
    .toBe(true);
  await expectClosed(page, m);
});
test("pause, erreur et ancien événement : aucune activation tardive", async ({
  page,
}) => {
  const m = await configure(page);
  await play(page);
  await expect
    .poll(() => video(page, m.ids[0]).evaluate((v) => !v.paused))
    .toBe(true);
  await video(page, m.ids[0]).evaluate((v) => v.pause());
  await expectClosed(page, m);
  await end(page, m.ids[0]);
  await expect
    .poll(() => video(page, m.ids[0]).evaluate((v) => v.ended))
    .toBe(true);
  await expectClosed(page, m);
  await page.getByRole("button", { name: "Ouvrir", exact: true }).click();
  await expect
    .poll(() => video(page, m.ids[0]).evaluate((v) => !v.paused))
    .toBe(true);
  await video(page, m.ids[0]).evaluate((v) =>
    v.dispatchEvent(new Event("error")),
  );
  await end(page, m.ids[0]);
  await expectClosed(page, m);
  await page.getByRole("button", { name: "Ouvrir", exact: true }).click();
  await expect
    .poll(() => video(page, m.ids[0]).evaluate((v) => !v.paused))
    .toBe(true);
  await video(page, m.ids[0]).evaluate((v) =>
    v.dispatchEvent(new Event("ended")),
  );
  await expectClosed(page, m);
  await end(page, m.ids[0]);
  await expectOpen(page, m);
});
test("plusieurs vidéos : attendre toutes les fins, sans double activation", async ({
  page,
}) => {
  const m = await configure(page, { multiple: true });
  await play(page);
  await expect
    .poll(() => video(page, m.ids[1]).evaluate((v) => !v.paused))
    .toBe(true);
  await video(page, m.ids[1]).evaluate((v) => (v.playbackRate = 0.5));
  await end(page, m.ids[0]);
  await expect
    .poll(() => video(page, m.ids[0]).evaluate((v) => v.ended))
    .toBe(true);
  await expectClosed(page, m);
  await end(page, m.ids[1]);
  await expectOpen(page, m);
});
test("boucle : option incompatible expliquée et lecture existante préservée", async ({
  page,
}) => {
  const m = await configure(page);
  await page
    .getByRole("button", {
      name: "Sélectionner le calque Cercle 1",
      exact: true,
    })
    .click();
  await page.getByLabel("Lire en boucle", { exact: true }).check();
  await page
    .getByRole("button", { name: "Sélectionner le calque Ouvrir", exact: true })
    .click();
  await expect(
    page.getByText("Une vidéo ciblée est en boucle.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tester l’action", exact: true }),
  ).toBeDisabled();
  await play(page);
  await end(page, m.ids[0]);
  await expectClosed(page, m);
  await expect(video(page, m.ids[0])).toHaveAttribute("loop", "");
});
test("renommage, historique, recharge, duplication et ZIP réel", async ({
  page,
}, info) => {
  const m = await configure(page);
  await page
    .getByLabel(`Nom de l’état ${m.states[1].id}`, { exact: true })
    .fill("Ouverture complète");
  await expect(
    page.getByLabel("État de page après la lecture", { exact: true }),
  ).toHaveValue(m.states[1].id);
  await page.getByLabel(option, { exact: true }).uncheck();
  await page.locator(".editor").focus();
  await page.keyboard.press("Control+z");
  await expect(page.getByLabel(option, { exact: true })).toBeChecked();
  await page.keyboard.press("Control+Shift+z");
  await expect(page.getByLabel(option, { exact: true })).not.toBeChecked();
  await page.getByLabel(option, { exact: true }).check();
  await saved(page);
  await page.reload();
  await saved(page);
  await page
    .getByRole("button", { name: "Sélectionner le calque Ouvrir", exact: true })
    .click();
  await expect(
    page.getByLabel("État de page après la lecture", { exact: true }),
  ).toHaveValue(m.states[1].id);
  await page
    .getByRole("button", { name: "Dupliquer la page", exact: true })
    .click();
  let d = await record(page);
  expect(d.pages[1].buttons[0].action.afterPlayback.stateId).toBe(
    d.pages[1].states[1].id,
  );
  expect(d.pages[1].buttons[0].action.afterPlayback.stateId).not.toBe(
    m.states[1].id,
  );
  const original = d;
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Fichier", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Sauvegarder mon projet", exact: true })
    .click();
  const file = info.outputPath("apres-calque.zip");
  await (await downloading).saveAs(file);
  const zip = await JSZip.loadAsync(await fs.readFile(file));
  expect(
    JSON.parse(await zip.file("presentation.json").async("string")).pages,
  ).toEqual(original.pages);
  await page.getByTestId("zip-input").setInputFiles(file);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmer", exact: true })
    .click();
  expect((await record(page)).pages).toEqual(original.pages);
  const config = JSON.parse(
    await zip.file("presentation.json").async("string"),
  );
  config.pages[0].buttons[0].action.afterPlayback.enabled = "invalide";
  zip.file("presentation.json", JSON.stringify(config));
  const invalid = info.outputPath("suite-invalide.zip");
  await fs.writeFile(invalid, await zip.generateAsync({ type: "nodebuffer" }));
  await page.getByTestId("zip-input").setInputFiles(invalid);
  await expect(page.locator(".editor-message")).toContainText(
    "actions ou des états est invalide",
  );
  expect((await record(page)).pages).toEqual(original.pages);
});
async function addButton(p, name, type, x = 55) {
  await p.getByRole("button", { name: "+ Bouton", exact: true }).click();
  await p.getByLabel("Nom du bouton", { exact: true }).fill(name);
  await p
    .getByLabel("Position horizontale du bouton (%)", { exact: true })
    .fill(String(x));
  await p.getByLabel("Type d’action", { exact: true }).selectOption(type);
}
test("autre état et nouvelle commande vidéo : l’ancienne action de fin est annulée", async ({
  page,
}) => {
  const m = await configure(page);
  await addButton(page, "Rester fermé", "state");
  await page
    .getByLabel("État à activer", { exact: true })
    .selectOption(m.states[0].id);
  await addButton(page, "Reprendre sans suite", "layerVideo", 75);
  await page
    .getByLabel("Commande vidéo", { exact: true })
    .selectOption("resume");
  await page.getByLabel("Contrôler la vidéo Cercle 1", { exact: true }).check();
  await play(page);
  await page.getByRole("button", { name: "Rester fermé", exact: true }).click();
  await end(page, m.ids[0]);
  await expect
    .poll(() => video(page, m.ids[0]).evaluate((v) => v.ended))
    .toBe(true);
  await expectClosed(page, m);
  await page.getByRole("button", { name: "Ouvrir", exact: true }).click();
  await page
    .getByRole("button", { name: "Reprendre sans suite", exact: true })
    .click();
  await end(page, m.ids[0]);
  await expect
    .poll(() => video(page, m.ids[0]).evaluate((v) => v.ended))
    .toBe(true);
  await expectClosed(page, m);
});
test("navigation et fermeture : aucun événement d’une ancienne page ne modifie la nouvelle vue", async ({
  page,
}) => {
  const m = await configure(page);
  await play(page, "presentation");
  const old = await video(page, m.ids[0]).elementHandle();
  await page
    .getByRole("button", { name: "Diapositive suivante", exact: true })
    .click();
  const transition = page.locator(".transition-video");
  if (await transition.count()) {
    await expect
      .poll(() => transition.evaluate((v) => v.duration))
      .toBeGreaterThan(0);
    await transition.evaluate((v) => (v.currentTime = v.duration - 0.05));
  }
  await expect(page.locator(".slide-info")).toHaveText("Changez d’atmosphère");
  await old.evaluate((v) => v.dispatchEvent(new Event("ended")));
  await expect(page.locator(".slide-info")).toHaveText("Changez d’atmosphère");
  await page
    .getByRole("button", { name: "Diapositive précédente", exact: true })
    .click();
  await expectClosed(page, m);
  await page.getByRole("button", { name: "Ouvrir", exact: true }).click();
  const leaving = await video(page, m.ids[0]).elementHandle();
  await page
    .getByRole("button", { name: "← Revenir à l’éditeur", exact: true })
    .click();
  await leaving.evaluate((v) => v.dispatchEvent(new Event("ended")));
  await expect(frame(page, m.text.id)).toHaveCount(0);
  await expect(
    page.locator(".action-video,.transition-video,[data-video-overlay=true]"),
  ).toHaveCount(0);
});
test("état supprimé et vidéo supprimée : référence détectable et aucun mauvais état", async ({
  page,
}) => {
  const m = await configure(page);
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Supprimer l’état Ouvert", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "État cible introuvable" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tester l’action", exact: true }),
  ).toBeDisabled();
  const a = (await record(page)).pages[0].buttons[0].action.afterPlayback;
  expect(a.stateId).toBeNull();
  expect(a.missingStateId).toBe(m.states[1].id);
  await page
    .getByRole("button", {
      name: "Sélectionner le calque Cercle 1",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Supprimer le calque", exact: true })
    .click();
  const doc = await record(page);
  expect(doc.pages[0].buttons[0].action.layerIds).toEqual([]);
  await play(page);
  await expectClosed(page, m);
});
test("animation centrale, bouton sélectionné et calques au-dessus : aucun overlay résiduel", async ({
  page,
}) => {
  const m = await configure(page);
  await page
    .getByLabel("Transition par défaut des états : effet", { exact: true })
    .selectOption("crossfade");
  await page
    .getByLabel("Transition par défaut des états : durée (ms)", { exact: true })
    .fill("800");
  await addButton(page, "Options", "state");
  await page
    .getByLabel("État à activer", { exact: true })
    .selectOption(m.states[1].id);
  const chosen = (await record(page)).pages[0].buttons.at(-1);
  await page
    .getByLabel("Bouton actif de l’état Ouvert", { exact: true })
    .selectOption(chosen.id);
  await page
    .getByLabel("Rester visible pendant les vidéos déclenchées par boutons", {
      exact: true,
    })
    .check();
  await play(page);
  await expect(
    page.getByRole("button", { name: "Options", exact: true }),
  ).toBeVisible();
  await end(page, m.ids[0]);
  await expect(page.locator(".editor-preview .slide")).toHaveAttribute(
    "data-effect-running",
    "crossfade",
  );
  await expectOpen(page, m);
  await expect(
    page.getByRole("button", { name: "Options", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.locator("[data-video-overlay=true],.action-video"),
  ).toHaveCount(0);
});
test("modèle : anciennes actions, cibles copiées, validation et écouteurs exactement une fois", async () => {
  const {
      emptyPage,
      createLayer,
      createInteractiveButton,
      duplicatePageModel,
      migrateDocument,
    } = await import("../src/document.js"),
    { frameCrop, framePlayback } = await import("../src/mediaFrames.js"),
    { validateActions, normalizeActions } = await import("../src/actions.js"),
    { pasteLayer } = await import("../src/layerClipboard.js"),
    { watchLayerVideoEnds } = await import("../src/layerVideoCompletion.js");
  const state = {
      id: "open",
      name: "Ouvert",
      background: null,
      visibility: {},
      activeButtonId: null,
    },
    l = {
      ...createLayer("circle", 1),
      frameMedia: {
        kind: "video",
        mediaId: "v",
        crop: frameCrop(),
        playback: framePlayback(),
      },
    },
    b = {
      ...createInteractiveButton(1),
      type: "button",
      action: {
        type: "layerVideo",
        layerIds: [l.id],
        command: "restart",
        afterPlayback: { enabled: true, stateId: state.id },
      },
    },
    p = {
      ...emptyPage(1),
      layers: [l],
      buttons: [b],
      states: [state],
      layerOrder: [l.id, b.id],
    },
    d = {
      version: 28,
      pages: [p],
      media: [
        {
          id: "v",
          name: "v.mp4",
          type: "video/mp4",
          blob: new Blob(["fixture"]),
        },
      ],
      transitions: [],
    };
  const copy = duplicatePageModel(p);
  expect(copy.buttons[0].action.afterPlayback.stateId).toBe(copy.states[0].id);
  const other = { ...emptyPage(2), states: [{ ...state, id: "different" }] };
  const pasted = pasteLayer({ layer: b, source: p }, other, {
    ...d,
    pages: [p, other],
  });
  expect(pasted.action.afterPlayback).toMatchObject({
    stateId: null,
    missingStateId: "open",
  });
  const missing = normalizeActions({ ...p, states: [] });
  expect(missing.buttons[0].action.afterPlayback).toMatchObject({
    stateId: null,
    missingStateId: "open",
  });
  expect(() =>
    validateActions(
      {
        ...d,
        pages: [
          {
            ...p,
            buttons: [
              {
                ...b,
                action: {
                  ...b.action,
                  afterPlayback: { enabled: "oui", stateId: "open" },
                },
              },
            ],
          },
        ],
      },
      () => true,
    ),
  ).toThrow();
  const old = {
    ...d,
    version: 27,
    pages: [
      {
        ...p,
        buttons: [
          {
            ...b,
            action: {
              type: "layerVideo",
              layerIds: [l.id],
              command: "restart",
            },
          },
        ],
      },
    ],
    custom: { keep: true },
  };
  expect(
    migrateDocument(old).pages[0].buttons[0].action.afterPlayback,
  ).toBeUndefined();
  expect(migrateDocument(old).custom).toEqual(old.custom);
  let finishes = 0,
    cancels = 0;
  const a = {
      watchEnd(end, cancel) {
        this.end = end;
        this.cancel = cancel;
        return () => (this.detached = true);
      },
    },
    c = { watchEnd: a.watchEnd };
  watchLayerVideoEnds(
    [a, c],
    () => finishes++,
    () => cancels++,
  );
  a.end();
  expect(finishes).toBe(0);
  c.end();
  c.end();
  expect(finishes).toBe(1);
  expect(a.detached && c.detached).toBe(true);
  watchLayerVideoEnds(
    [a, c],
    () => finishes++,
    () => cancels++,
  );
  a.cancel("removed");
  c.end();
  expect(finishes).toBe(1);
  expect(cancels).toBe(1);
});
test("ressources finales préparées : garder la dernière image et annuler une attente devenue obsolète", async ({
  page,
}) => {
  const m = await configure(page);
  await addButton(page, "Annuler la suite", "state");
  await page
    .getByLabel("État à activer", { exact: true })
    .selectOption(m.states[0].id);
  await page
    .getByRole("button", { name: "Tester les interactions", exact: true })
    .click();
  await page.evaluate(() => {
    const decode = HTMLImageElement.prototype.decode;
    window.layerGate = new Promise(
      (resolve) => (window.releaseLayerGate = resolve),
    );
    HTMLImageElement.prototype.decode = async function () {
      if (!this.isConnected) {
        window.layerGateWaiting = true;
        await window.layerGate;
      }
      return decode.call(this);
    };
  });
  await page.getByRole("button", { name: "Ouvrir", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.layerGateWaiting))
    .toBe(true);
  await end(page, m.ids[0]);
  await expect
    .poll(() => video(page, m.ids[0]).evaluate((v) => v.ended))
    .toBe(true);
  await expectClosed(page, m);
  await expect(frame(page, m.ids[0]).locator("canvas")).toBeVisible();
  await page
    .getByRole("button", { name: "Annuler la suite", exact: true })
    .click();
  await page.evaluate(() => window.releaseLayerGate());
  await expectClosed(page, m);
  await page.getByRole("button", { name: "Ouvrir", exact: true }).click();
  await end(page, m.ids[0]);
  await expectOpen(page, m);
});
test("vidéo A puis vidéo B indépendante : seule la dernière demande reste valable", async ({
  page,
}) => {
  const m = await configure(page, { multiple: true });
  await page
    .getByLabel("Contrôler la vidéo Cercle 2", { exact: true })
    .uncheck();
  await addButton(page, "Lire la seconde vidéo", "layerVideo", 60);
  await page.getByLabel("Contrôler la vidéo Cercle 2", { exact: true }).check();
  await play(page);
  await expect
    .poll(() => video(page, m.ids[0]).evaluate((v) => !v.paused))
    .toBe(true);
  expect(await video(page, m.ids[1]).evaluate((v) => v.paused)).toBe(true);
  await page
    .getByRole("button", { name: "Lire la seconde vidéo", exact: true })
    .click();
  await expect
    .poll(() => video(page, m.ids[1]).evaluate((v) => !v.paused))
    .toBe(true);
  await end(page, m.ids[0]);
  await expect
    .poll(() => video(page, m.ids[0]).evaluate((v) => v.ended))
    .toBe(true);
  await expectClosed(page, m);
  await end(page, m.ids[1]);
  await expect
    .poll(() => video(page, m.ids[1]).evaluate((v) => v.ended))
    .toBe(true);
  await expectClosed(page, m);
});
