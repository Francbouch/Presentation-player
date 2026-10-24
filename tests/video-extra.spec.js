import { test, expect } from "@playwright/test";
import JSZip from "jszip";
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
          const d = r.result,
            t = d.transaction("documents"),
            g = t.objectStore("documents").get("current");
          g.onsuccess = () => resolve(g.result);
          t.oncomplete = () => d.close();
        };
      }),
  );
}
const layer = (p, id) => p.locator(`[data-layer-id="${id}"]`);
async function setup(p, type = "layerVideo") {
  await p.goto("/");
  await saved(p);
  await p.getByRole("button", { name: "+ Cercle", exact: true }).click();
  await p
    .getByRole("button", { name: "Importer / remplacer un média", exact: true })
    .click();
  await p
    .getByTestId("media-input")
    .setInputFiles("tests/fixtures/crop-landscape.mp4");
  const video = (await record(p)).pages[0].layers.at(-1);
  await p.getByRole("button", { name: "+ Texte", exact: true }).click();
  const text = (await record(p)).pages[0].layers.at(-1);
  await p.getByRole("button", { name: "+ Bouton", exact: true }).click();
  await p.getByLabel("Nom du bouton", { exact: true }).fill("Mécanisme");
  await p.getByLabel("Type d’action", { exact: true }).selectOption(type);
  if (type === "layerVideo")
    await p.getByLabel("Contrôler la vidéo Cercle 1", { exact: true }).check();
  else
    await p
      .getByLabel("Vidéo de l’action", { exact: true })
      .selectOption({ label: "crop-landscape.mp4" });
  return { video, text, button: (await record(p)).pages[0].buttons[0] };
}
async function play(p, mode = "test") {
  await p
    .getByRole("button", {
      name: mode === "test" ? "Tester les interactions" : "Présentation",
      exact: true,
    })
    .click();
  await p.getByRole("button", { name: "Mécanisme", exact: true }).click();
}
async function end(p, m, type = "layerVideo") {
  const v =
    type === "video"
      ? p.locator(".action-video")
      : layer(p, m.video.id).locator("video");
  await expect.poll(() => v.evaluate((v) => v.duration)).toBeGreaterThan(0);
  await v.evaluate((v) => {
    v.currentTime = v.duration - 0.05;
    v.play();
  });
}
async function extra(p, type = "visibility", when = "click") {
  await p
    .getByLabel("Action supplémentaire", { exact: true })
    .selectOption(type);
  await p
    .getByLabel("Exécuter l’action supplémentaire", { exact: true })
    .selectOption(when);
}
async function exported(p, info) {
  await p.getByRole("button", { name: "Fichier", exact: true }).click();
  const down = p.waitForEvent("download");
  await p
    .getByRole("menuitem", { name: "Sauvegarder mon projet", exact: true })
    .click();
  const file = info.outputPath("projet.zip");
  await (await down).saveAs(file);
  return JSZip.loadAsync(await fs.readFile(file));
}
async function restore(p, zip, info, name = "restore.zip") {
  const file = info.outputPath(name);
  await fs.writeFile(file, await zip.generateAsync({ type: "nodebuffer" }));
  await p.getByTestId("zip-input").setInputFiles(file);
  await p
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmer", exact: true })
    .click();
  await saved(p);
}
for (const type of ["layerVideo", "video"])
  for (const when of ["click", "ended"])
    test(`${type} : masquer un calque ${when}, Test et Présentation`, async ({
      page,
    }) => {
      const m = await setup(page, type);
      await extra(page, "visibility", when);
      await page
        .getByLabel("Action supplémentaire pour Votre texte", { exact: true })
        .selectOption("hide");
      const original = await record(page);
      for (const mode of ["test", "presentation"]) {
        await play(page, mode);
        if (when === "ended") {
          await expect(layer(page, m.text.id)).toBeVisible();
          await end(page, m, type);
        }
        await expect(layer(page, m.text.id)).toHaveCount(0);
        expect((await record(page)).pages).toEqual(original.pages);
        if (type === "video" && when === "click")
          await page
            .getByRole("button", { name: "Arrêter la vidéo", exact: true })
            .click();
        if (mode === "test")
          await page
            .getByRole("button", {
              name: "Revenir au mode édition",
              exact: true,
            })
            .click();
      }
    });
for (const type of ["layerVideo", "video"])
  test(`${type} : afficher, groupes distincts et bouton qui se masque`, async ({
    page,
  }, info) => {
    const m = await setup(page, type);
    const zip = await exported(page, info),
      config = JSON.parse(await zip.file("presentation.json").async("string")),
      p = config.pages[0];
    p.layers.find((l) => l.id === m.text.id).visible = false;
    p.visibilityGroups = [
      {
        id: "info",
        name: "Informations",
        layerIds: [m.text.id],
        initialVisible: false,
      },
    ];
    p.visualGroups = [
      { id: "navigation", name: "Navigation", children: [m.button.id] },
    ];
    p.buttons[0].action.extra = {
      type: "visibilityGroups",
      when: "click",
      operations: [{ groupId: "info", mode: "show" }],
    };
    zip.file("presentation.json", JSON.stringify(config));
    await restore(page, zip, info);
    await play(page);
    await expect(layer(page, m.text.id)).toBeVisible();
    if (type === "video")
      await page
        .getByRole("button", { name: "Arrêter la vidéo", exact: true })
        .click();
    await page
      .getByRole("button", { name: "Revenir au mode édition", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Sélectionner le calque Mécanisme",
        exact: true,
      })
      .click();
    await extra(page, "visualGroups");
    await page
      .getByLabel("Action supplémentaire du groupe de calques Navigation", {
        exact: true,
      })
      .selectOption("hide");
    await play(page);
    await expect(
      page.getByRole("button", { name: "Mécanisme", exact: true }),
    ).toHaveCount(0);
    const v =
      type === "video"
        ? page.locator(".action-video")
        : layer(page, m.video.id).locator("video");
    await expect.poll(() => v.evaluate((v) => !v.paused)).toBe(true);
  });
test("fond supplémentaire au clic et en fin, sans modifier la vidéo", async ({
  page,
}) => {
  const m = await setup(page);
  for (const when of ["click", "ended"]) {
    await extra(page, "background", when);
    await page
      .getByLabel("Arrière-plan supplémentaire", { exact: true })
      .selectOption({ label: "Image : sunset.png" });
    const before = await page.locator(".slide-background").getAttribute("src");
    await play(page);
    if (when === "ended") {
      await expect(page.locator(".slide-background")).toHaveAttribute(
        "src",
        before,
      );
      await end(page, m);
    }
    await expect(
      page.locator(".slide-background:not(.visual-pending-background)"),
    ).not.toHaveAttribute("src", before);
    await page
      .getByRole("button", { name: "Revenir au mode édition", exact: true })
      .click();
  }
});
test("état final puis visibilité : la surcharge supplémentaire reste effective", async ({
  page,
}) => {
  const m = await setup(page);
  await page
    .getByRole("button", { name: "+ Ajouter un état", exact: true })
    .click();
  const state = (await record(page)).pages[0].states[0];
  await page
    .getByLabel("Activer un état de page après la lecture", { exact: true })
    .check();
  await page
    .getByLabel("État de page après la lecture", { exact: true })
    .selectOption(state.id);
  await extra(page, "visibility", "ended");
  await page
    .getByLabel("Action supplémentaire pour Votre texte", { exact: true })
    .selectOption("hide");
  await play(page);
  await end(page, m);
  await expect(layer(page, m.text.id)).toHaveCount(0);
});
test("pause/arrêt ne déclenchent pas la fin ; interruption et ancien ended ignorés", async ({
  page,
}) => {
  const m = await setup(page);
  await extra(page, "visibility", "ended");
  await page
    .getByLabel("Action supplémentaire pour Votre texte", { exact: true })
    .selectOption("hide");
  await page
    .getByLabel("Commande vidéo", { exact: true })
    .selectOption("pause");
  await expect(
    page
      .getByLabel("Exécuter l’action supplémentaire")
      .locator("option[value=ended]"),
  ).toHaveJSProperty("disabled", true);
  await page.getByLabel("Commande vidéo", { exact: true }).selectOption("stop");
  await expect(
    page
      .getByLabel("Exécuter l’action supplémentaire")
      .locator("option[value=ended]"),
  ).toHaveJSProperty("disabled", true);
  await page
    .getByLabel("Commande vidéo", { exact: true })
    .selectOption("restart");
  await play(page);
  await layer(page, m.video.id)
    .locator("video")
    .evaluate((v) => {
      v.pause();
      v.dispatchEvent(new Event("ended"));
    });
  await expect(layer(page, m.text.id)).toBeVisible();
  await end(page, m);
  await expect(layer(page, m.text.id)).toBeVisible();
  await page
    .getByRole("button", { name: "Revenir au mode édition", exact: true })
    .click();
  await play(page);
  await page
    .getByRole("button", { name: "Revenir au mode édition", exact: true })
    .click();
  await layer(page, m.video.id)
    .locator("video")
    .evaluate((v) => v.dispatchEvent(new Event("ended")));
  await expect(layer(page, m.text.id)).toBeVisible();
});
test("sauvegarde, Undo/Redo, ZIP, cibles absentes et validation atomique", async ({
  page,
  browser,
}, info) => {
  await setup(page);
  await extra(page, "visibility");
  await page
    .getByLabel("Action supplémentaire pour Votre texte", { exact: true })
    .selectOption("hide");
  const original = await record(page);
  await page.locator(".editor").focus();
  await page.keyboard.press("Control+z");
  await expect(
    page.getByLabel("Action supplémentaire pour Votre texte"),
  ).toHaveValue("");
  await page.keyboard.press("Control+Shift+z");
  await expect(
    page.getByLabel("Action supplémentaire pour Votre texte"),
  ).toHaveValue("hide");
  await page.reload();
  await saved(page);
  expect((await record(page)).pages).toEqual(original.pages);
  const zip = await exported(page, info),
    context = await browser.newContext(),
    other = await context.newPage();
  await other.goto("/");
  await saved(other);
  await restore(other, zip, info);
  expect((await record(other)).pages).toEqual(original.pages);
  const config = JSON.parse(
    await zip.file("presentation.json").async("string"),
  );
  config.pages[0].buttons[0].action.extra.layerIds = ["deleted"];
  config.pages[0].buttons[0].action.extra.targetModes = { deleted: "hide" };
  zip.file("presentation.json", JSON.stringify(config));
  await restore(other, zip, info, "missing.zip");
  await other
    .getByRole("button", {
      name: "Sélectionner le calque Mécanisme",
      exact: true,
    })
    .click();
  await expect(other.getByRole("alert")).toContainText(
    "calque cible est absent",
  );
  await play(other);
  await other
    .getByRole("button", { name: "Notifications", exact: true })
    .click();
  await expect(
    other.getByRole("region", { name: "Notifications de l’application" }),
  ).toContainText("Un calque cible est absent");
  const current = await record(other);
  config.pages[0].buttons[0].action.extra.when = "invalid";
  zip.file("presentation.json", JSON.stringify(config));
  const file = info.outputPath("bad.zip");
  await fs.writeFile(file, await zip.generateAsync({ type: "nodebuffer" }));
  await other.getByTestId("zip-input").setInputFiles(file);
  await expect(
    other.getByText(/configuration des actions ou des états est invalide/),
  ).toBeVisible();
  expect((await record(other)).pages).toEqual(current.pages);
  await context.close();
});
for (const type of ["layerVideo", "video"])
  for (const mode of ["show", "hide"])
    test(`${type} : ${mode} des groupes à la fin naturelle`, async ({
      page,
    }, info) => {
      const m = await setup(page, type),
        zip = await exported(page, info),
        config = JSON.parse(
          await zip.file("presentation.json").async("string"),
        ),
        p = config.pages[0];
      p.visibilityGroups = [
        {
          id: "g",
          name: "Infos",
          layerIds: [m.text.id],
          initialVisible: mode === "hide",
        },
      ];
      p.buttons[0].action.extra = {
        type: "visibilityGroups",
        when: "ended",
        operations: [{ groupId: "g", mode }],
      };
      zip.file("presentation.json", JSON.stringify(config));
      await restore(page, zip, info);
      await play(page);
      await end(page, m, type);
      if (mode === "show") await expect(layer(page, m.text.id)).toBeVisible();
      else await expect(layer(page, m.text.id)).toHaveCount(0);
    });
for (const type of ["layerVideo", "video"])
  test(`${type} : afficher un calque au clic et conserver l’absence de fond dans Lancer une vidéo`, async ({
    page,
  }, info) => {
    const m = await setup(page, type),
      zip = await exported(page, info),
      config = JSON.parse(await zip.file("presentation.json").async("string")),
      p = config.pages[0];
    p.layers.find((l) => l.id === m.text.id).visible = false;
    p.buttons[0].action.extra = {
      type: "visibility",
      when: "click",
      layerIds: [m.text.id],
      mode: "show",
    };
    zip.file("presentation.json", JSON.stringify(config));
    await restore(page, zip, info);
    await page
      .getByRole("button", {
        name: "Sélectionner le calque Mécanisme",
        exact: true,
      })
      .click();
    if (type === "video")
      await expect(
        page
          .getByLabel("Action supplémentaire", { exact: true })
          .locator("option[value=background]"),
      ).toHaveCount(0);
    await play(page);
    await expect(layer(page, m.text.id)).toBeVisible();
  });
test("Lancer une vidéo : arrêt sans action de fin et état final avant la surcharge", async ({
  page,
}) => {
  const m = await setup(page, "video");
  await page
    .getByRole("button", { name: "+ Ajouter un état", exact: true })
    .click();
  const state = (await record(page)).pages[0].states[0];
  await page
    .getByLabel("Après la vidéo", { exact: true })
    .selectOption("state");
  await page
    .getByLabel("État après la vidéo", { exact: true })
    .selectOption(state.id);
  await extra(page, "visibility", "ended");
  await page
    .getByLabel("Action supplémentaire pour Votre texte", { exact: true })
    .selectOption("hide");
  await play(page);
  await page
    .getByRole("button", { name: "Arrêter la vidéo", exact: true })
    .click();
  await expect(layer(page, m.text.id)).toBeVisible();
  await page.getByRole("button", { name: "Mécanisme", exact: true }).click();
  await end(page, m, "video");
  await expect(layer(page, m.text.id)).toHaveCount(0);
});
test("modèle : remappage des références, groupe copié, ancienne version et métadonnées", async () => {
  const {
      emptyPage,
      createInteractiveButton,
      createLayer,
      duplicatePageModel,
      migrateDocument,
    } = await import("../src/document.js"),
    { copySelection } = await import("../src/visualGroups.js"),
    { pasteLayer } = await import("../src/layerClipboard.js"),
    { runtimeVisibility } = await import("../src/videoExtra.js");
  const l = createLayer("text", 1),
    b = {
      ...createInteractiveButton(1),
      action: {
        type: "video",
        videoId: null,
        block: true,
        end: "return",
        finalBackground: null,
        pageId: null,
        extra: {
          type: "visibility",
          when: "ended",
          layerIds: [l.id],
          mode: "custom",
          targetModes: { [l.id]: "hide" },
          privateMetadata: "conserver",
        },
      },
    },
    p = {
      ...emptyPage(1),
      layers: [l],
      buttons: [b],
      layerOrder: [l.id, b.id],
      visualGroups: [{ id: "v", name: "Calques", children: [l.id, b.id] }],
      visibilityGroups: [
        { id: "g", name: "Visibilité", layerIds: [l.id], initialVisible: true },
      ],
    },
    d = {
      version: 28,
      pages: [p],
      media: [],
      transitions: [],
      privateMetadata: "préserver",
    };
  const migrated = migrateDocument(d);
  expect(migrated.version).toBe(29);
  expect(migrated.privateMetadata).toBe("préserver");
  expect(migrated.pages[0].buttons[0].action.extra).toEqual(b.action.extra);
  const dup = duplicatePageModel(p);
  expect(dup.buttons[0].action.extra.layerIds).toEqual([dup.layers[0].id]);
  expect(dup.buttons[0].action.extra.targetModes[dup.layers[0].id]).toBe(
    "hide",
  );
  const copied = copySelection(p, [l.id, b.id], d);
  expect(copied.layers.find((l) => l.action).action.extra.layerIds).toEqual([
    copied.layers.find((i) => i.type === "text").id,
  ]);
  b.action.extra = {
    type: "visualGroups",
    when: "click",
    operations: [{ groupId: "v", mode: "hide" }],
  };
  const groupCopy = copySelection(p, [l.id, b.id], d);
  expect(
    groupCopy.layers.find((l) => l.action).action.extra.operations[0].groupId,
  ).toBe(groupCopy.groups[0].id);
  b.action.extra = {
    type: "visibilityGroups",
    when: "ended",
    operations: [{ groupId: "g", mode: "hide" }],
  };
  expect(
    duplicatePageModel(p).buttons[0].action.extra.operations[0].groupId,
  ).not.toBe("g");
  const other = emptyPage(2),
    pasted = pasteLayer(
      { layer: { ...b, type: "button" }, source: p },
      other,
      d,
    );
  expect(pasted.action.extra.operations[0].groupId).toBe("g");
  expect(
    runtimeVisibility(
      p,
      { stateId: null, visibility: {}, groupVisibility: { g: true } },
      b.action.extra,
    ).groupVisibility.g,
  ).toBe(false);
});
test("plusieurs vidéos : basculer une seule fois après toutes les fins", async ({
  page,
}) => {
  const m = await setup(page);
  await page.getByRole("button", { name: "+ Cercle", exact: true }).click();
  await page
    .getByRole("button", { name: "Importer / remplacer un média", exact: true })
    .click();
  await page
    .getByTestId("media-input")
    .setInputFiles("tests/fixtures/crop-portrait.mp4");
  const second = (await record(page)).pages[0].layers.at(-1);
  await page
    .getByRole("button", {
      name: "Sélectionner le calque Mécanisme",
      exact: true,
    })
    .click();
  await page
    .getByLabel(`Contrôler la vidéo ${second.name}`, { exact: true })
    .check();
  await extra(page, "visibility", "ended");
  await page
    .getByLabel("Action supplémentaire pour Votre texte", { exact: true })
    .selectOption("toggle");
  await play(page);
  await end(page, m);
  await expect(layer(page, m.text.id)).toBeVisible();
  await end(page, { video: second });
  await expect(layer(page, m.text.id)).toHaveCount(0);
  await layer(page, second.id)
    .locator("video")
    .evaluate((v) => v.dispatchEvent(new Event("ended")));
  await expect(layer(page, m.text.id)).toHaveCount(0);
});
test("masquer sa vidéo conserve la règle actuelle de pause, sans fausse action de fin", async ({
  page,
}) => {
  const m = await setup(page);
  await page
    .getByRole("button", { name: "+ Ajouter un état", exact: true })
    .click();
  const s = (await record(page)).pages[0].states[0];
  await page
    .getByLabel("Activer un état de page après la lecture", { exact: true })
    .check();
  await page
    .getByLabel("État de page après la lecture", { exact: true })
    .selectOption(s.id);
  await extra(page);
  await page
    .getByLabel("Action supplémentaire pour Cercle 1", { exact: true })
    .selectOption("hide");
  await play(page);
  const v = layer(page, m.video.id).locator("video");
  await expect.poll(() => v.evaluate((v) => v.paused)).toBe(true);
  await expect(v).toBeHidden();
  await expect(layer(page, m.text.id)).toBeVisible();
  await v.evaluate((v) => v.dispatchEvent(new Event("ended")));
  await expect(layer(page, m.text.id)).toBeVisible();
});
test("état animé puis groupe supplémentaire : cible de transition déjà résolue", async ({
  page,
}, info) => {
  const m = await setup(page),
    zip = await exported(page, info),
    config = JSON.parse(await zip.file("presentation.json").async("string")),
    p = config.pages[0];
  const state = {
    id: "state",
    name: "Ouvert",
    background: null,
    visibility: {},
    activeButtonId: null,
    groupVisibility: { g: false },
  };
  p.states = [state];
  p.visibilityGroups = [
    { id: "g", name: "Infos", layerIds: [m.text.id], initialVisible: false },
  ];
  p.stateEffects.default = {
    ...p.stateEffects.default,
    type: "crossfade",
    duration: 600,
  };
  p.buttons[0].action.afterPlayback = { enabled: true, stateId: state.id };
  p.buttons[0].action.extra = {
    type: "visibilityGroups",
    when: "ended",
    operations: [{ groupId: "g", mode: "show" }],
  };
  zip.file("presentation.json", JSON.stringify(config));
  await restore(page, zip, info);
  await play(page);
  await expect(layer(page, m.text.id)).toHaveCount(0);
  await end(page, m);
  await expect(layer(page, m.text.id)).toBeVisible();
  await expect(page.locator(".state-effect-active")).toHaveCount(0);
  await expect(layer(page, m.text.id)).toBeVisible();
});
