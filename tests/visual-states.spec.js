import { test, expect } from "@playwright/test";
const ready = async (p) => {
  await p.goto("/");
  await expect(p.locator(".save-status")).toContainText("Sauvegardé");
};
test("gestionnaire : miniatures réelles, sélection, duplication, recherche et comparaison", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "+ Rectangle", exact: true }).click();
  await page
    .getByRole("button", { name: "+ Ajouter un état", exact: true })
    .click();
  await page
    .getByLabel("Visibilité de Rectangle 1 dans État 1", { exact: true })
    .selectOption("hide");
  await page
    .getByRole("button", { name: "+ Ajouter un état", exact: true })
    .click();
  await page.getByRole("tab", { name: "États", exact: true }).click();
  const d = page.getByRole("dialog", { name: "Gestionnaire visuel des états" });
  await expect(d.locator(".state-tile")).toHaveCount(2);
  await d
    .getByRole("button", { name: "Sélectionner l’état État 1", exact: true })
    .click();
  await expect(
    d.getByRole("button", { name: "Sélectionner l’état État 1", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    d.locator(".state-tile").nth(0).locator("[data-layer-id]"),
  ).toHaveCount(0);
  await expect(
    d.locator(".state-tile").nth(1).locator("[data-layer-id]"),
  ).toHaveCount(1);
  await d
    .getByRole("button", { name: "Dupliquer l’état État 1", exact: true })
    .click();
  await expect(d.locator(".state-tile")).toHaveCount(3);
  await d.getByLabel("Rechercher un état").fill("copie");
  await expect(d.locator(".state-tile")).toHaveCount(1);
  await d.getByLabel("Rechercher un état").fill("");
  await d
    .getByRole("button", { name: "Comparer les états", exact: true })
    .click();
  await d.getByLabel("Premier état").selectOption({ label: "État 1" });
  await d.getByLabel("Deuxième état").selectOption({ label: "État 2" });
  await expect(
    d.getByText("Rectangle 1 : masqué → visible", { exact: true }),
  ).toBeVisible();
  await d
    .getByRole("button", { name: "Sélectionner l’état État 2", exact: true })
    .dblclick();
  await expect(d).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Tester les interactions", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("groupes : priorité, bascule, état conservé, état suivant, duplication et références invalides", async () => {
  const {
    emptyPage,
    createInteractiveButton,
    createLayer,
    normalizeDocument,
    duplicatePageModel,
  } = await import("../src/document.js");
  const {
    initialGroupVisibility,
    effectiveVisibility,
    applyGroupOperations,
    validateVisibilityGroups,
  } = await import("../src/visibilityGroups.js");
  const { stateView } = await import("../src/stateView.js");
  const layer = createLayer("rectangle", 1),
    p = {
      ...emptyPage(1),
      layers: [layer],
      visibilityGroups: [
        {
          id: "g",
          name: "Matériaux",
          layerIds: [layer.id],
          initialVisible: false,
        },
      ],
      states: [
        {
          id: "open",
          name: "Ouvert",
          background: null,
          visibility: { [layer.id]: false },
          activeButtonId: null,
          groupVisibility: { g: true },
        },
      ],
    };
  p.buttons = [
    {
      ...createInteractiveButton(1),
      action: {
        type: "visibilityGroups",
        operations: [{ groupId: "g", mode: "toggle" }],
      },
    },
  ];
  let d = normalizeDocument({
    version: 21,
    pages: [p],
    media: [],
    transitions: [],
    privateMetadata: { keep: true },
  });
  validateVisibilityGroups(d);
  expect(initialGroupVisibility(p, "open")).toEqual({ g: true });
  expect(stateView(p, "open").visibility[layer.id]).toBe(true);
  expect(
    effectiveVisibility(
      p,
      {},
      applyGroupOperations(p, { g: true }, [{ groupId: "g", mode: "toggle" }]),
    )[layer.id],
  ).toBe(false);
  expect(() =>
    applyGroupOperations(p, {}, [{ groupId: "missing", mode: "show" }]),
  ).toThrow();
  const copy = duplicatePageModel(d.pages[0]);
  expect(copy.visibilityGroups[0].id).not.toBe("g");
  expect(copy.states[0].groupVisibility[copy.visibilityGroups[0].id]).toBe(
    true,
  );
  expect(copy.buttons[0].action.operations[0].groupId).toBe(
    copy.visibilityGroups[0].id,
  );
  expect(copy.visibilityGroups[0].layerIds).toEqual([copy.layers[0].id]);
  expect(d.privateMetadata).toEqual({ keep: true });
  expect(() =>
    validateVisibilityGroups({
      ...d,
      pages: [
        {
          ...p,
          visibilityGroups: [
            ...p.visibilityGroups,
            { ...p.visibilityGroups[0], id: "duplicate" },
          ],
        },
      ],
    }),
  ).toThrow();
});

test("groupes : UI, actions indépendantes, reset par état, dossier masqué et ZIP", async ({
  page,
}, info) => {
  await ready(page);
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "+ Bouton", exact: true }).click();
  await page
    .getByRole("button", { name: "+ Ajouter un état", exact: true })
    .click();
  await page
    .getByRole("button", { name: "+ Ajouter un état", exact: true })
    .click();
  await page
    .getByLabel("État initial", { exact: true })
    .selectOption({ label: "État 1" });
  await page.getByRole("tab", { name: "États", exact: true }).click();
  let d = page.getByRole("dialog");
  await d
    .getByRole("tab", { name: "Groupes de visibilité", exact: true })
    .click();
  await d
    .getByRole("button", { name: "+ Groupe de visibilité", exact: true })
    .click();
  await d.getByLabel(/^Nom du groupe de visibilité/).fill("Menu");
  await d.getByLabel("Inclure Bouton 1 dans Menu", { exact: true }).check();
  await d.getByLabel("Inclure Bouton 2 dans Menu", { exact: true }).check();
  await d
    .getByLabel("Visibilité initiale du groupe Menu", { exact: true })
    .uncheck();
  await d
    .getByRole("tab", { name: "États de la diapositive", exact: true })
    .click();
  await d
    .getByRole("button", { name: "Sélectionner l’état État 2", exact: true })
    .click();
  await d
    .getByLabel("Groupe Menu dans État 2", { exact: true })
    .selectOption("show");
  await d
    .getByRole("button", { name: "Retour à l’éditeur", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Sélectionner le calque Bouton 3",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Type d’action", { exact: true })
    .selectOption("visibilityGroups");
  await page
    .getByLabel("Action du groupe Menu", { exact: true })
    .selectOption("toggle");
  await expect(page.locator(".save-status")).toContainText("Sauvegardé");
  await page
    .getByRole("button", { name: "Tester les interactions", exact: true })
    .click();
  const interactive = (name) =>
    page
      .locator(".editor-preview .interactive-button")
      .filter({ hasText: name });
  await expect(interactive("Bouton 1")).toHaveCount(0);
  await interactive("Bouton 3").click();
  await expect(interactive("Bouton 1")).toBeVisible();
  await page.getByRole("tab", { name: "États", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByText("Lecture : État 1", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Retour à l’éditeur", exact: true })
    .click();
  await interactive("Bouton 3").click();
  await expect(interactive("Bouton 1")).toHaveCount(0);
  await page.getByRole("tab", { name: "États", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Sélectionner l’état État 2", exact: true })
    .dblclick();
  await expect(interactive("Bouton 1")).toBeVisible();
  await interactive("Bouton 3").click();
  await expect(interactive("Bouton 1")).toHaveCount(0);
  await page.getByRole("tab", { name: "États", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByText("Lecture : État 2", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Sélectionner l’état État 1", exact: true })
    .dblclick();
  await expect(interactive("Bouton 1")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Positionner les boutons", exact: true })
    .click();
  await page.getByRole("button", { name: "Fichier", exact: true }).click();
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("menuitem", { name: "Sauvegarder mon projet", exact: true })
    .click();
  const file = info.outputPath("groupes.zip");
  await (await downloading).saveAs(file);
  const fs = await import("node:fs/promises"),
    { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await fs.readFile(file)),
    config = JSON.parse(await zip.file("presentation.json").async("string"));
  expect(config.pages[0].visibilityGroups[0].name).toBe("Menu");
  await page.getByTestId("zip-input").setInputFiles(file);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmer", exact: true })
    .click();
  await expect(page.locator(".save-status")).toContainText("Sauvegardé");
  await page.reload();
  await expect(page.locator(".save-status")).toContainText("Sauvegardé");
  await page.getByRole("tab", { name: "États", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("tab", { name: "Groupes de visibilité", exact: true })
    .click();
  await expect(
    page.getByLabel("Visibilité initiale du groupe Menu", { exact: true }),
  ).not.toBeChecked();
});

test("groupes multiples : réinitialisation par état, dossier prioritaire et vidéo masquée en pause", async ({
  page,
}) => {
  await ready(page);
  const { createLayer, createInteractiveButton } = await import(
      "../src/document.js"
    ),
    { frameCrop, framePlayback } = await import("../src/mediaFrames.js");
  const frame = {
      ...createLayer("rectangle", 1),
      id: "frame",
      frameMedia: {
        kind: "video",
        mediaId: null,
        crop: frameCrop(),
        playback: { ...framePlayback(), autoplay: true },
      },
    },
    rect = { ...createLayer("rectangle", 2), id: "rect", x: 0.4 },
    option = {
      ...createInteractiveButton(1),
      id: "option",
      name: "Option masquée par dossier",
      action: null,
    },
    make = (id, name, y, action) => ({
      ...createInteractiveButton(2),
      id,
      name,
      x: 0.7,
      y,
      width: 0.25,
      height: 0.13,
      action,
    });
  const buttons = [
    option,
    make("menu", "Afficher options", 0.1, {
      type: "visibilityGroups",
      operations: [
        { groupId: "options", mode: "show" },
        { groupId: "video", mode: "hide" },
        { groupId: "autre", mode: "hide" },
      ],
    }),
    make("all", "Tout afficher", 0.3, {
      type: "visibilityGroups",
      operations: [
        { groupId: "options", mode: "show" },
        { groupId: "video", mode: "show" },
        { groupId: "autre", mode: "show" },
      ],
    }),
    make("state", "État suivant", 0.5, { type: "state", stateId: "s2" }),
  ];
  await page.evaluate(
    ({ frame, rect, buttons }) =>
      new Promise((resolve, reject) => {
        const r = indexedDB.open("presentation-studio", 1);
        r.onsuccess = () => {
          const db = r.result,
            t = db.transaction("documents", "readwrite"),
            store = t.objectStore("documents"),
            q = store.get("current");
          q.onsuccess = () => {
            const d = q.result,
              p = d.pages[0];
            frame.frameMedia.mediaId = d.media.find((m) =>
              m.type.startsWith("video/"),
            ).id;
            p.layers = [frame, rect];
            p.buttons = buttons;
            p.layerOrder = [frame.id, rect.id, ...buttons.map((b) => b.id)];
            p.visibilityGroups = [
              {
                id: "video",
                name: "Vidéo",
                layerIds: ["frame"],
                initialVisible: true,
              },
              {
                id: "options",
                name: "Options",
                layerIds: ["option"],
                initialVisible: false,
              },
              {
                id: "autre",
                name: "Autre",
                layerIds: ["rect"],
                initialVisible: true,
              },
            ];
            p.states = [
              {
                id: "s1",
                name: "Ouvert",
                background: null,
                visibility: {},
                activeButtonId: null,
              },
              {
                id: "s2",
                name: "Fermé",
                background: null,
                visibility: { rect: false },
                activeButtonId: null,
                groupVisibility: { video: false },
              },
            ];
            p.initialStateId = "s1";
            p.layerFolders = [
              {
                id: "folder",
                name: "Dossier masqué",
                parentId: null,
                children: ["option"],
                visible: false,
                locked: false,
                collapsed: false,
              },
            ];
            store.put(d, "current");
          };
          t.oncomplete = () => {
            db.close();
            resolve();
          };
          t.onerror = () => reject(t.error);
        };
      }),
    { frame, rect, buttons },
  );
  await page.reload();
  await expect(page.locator(".save-status")).toContainText("Sauvegardé");
  await page
    .getByRole("button", { name: "Tester les interactions", exact: true })
    .click();
  const video = page.locator(".editor-preview video"),
    live = (name) =>
      page
        .locator(".editor-preview .interactive-button")
        .filter({ hasText: name });
  await expect.poll(() => video.evaluate((v) => !v.paused)).toBe(true);
  await live("Afficher options").click();
  await expect.poll(() => video.evaluate((v) => v.paused)).toBe(true);
  await expect(live("Option masquée par dossier")).toHaveCount(0);
  await expect(
    page.locator('.editor-preview [data-layer-id="rect"]'),
  ).toHaveCount(0);
  await live("Tout afficher").click();
  await expect(
    page.locator('.editor-preview [data-layer-id="rect"]'),
  ).toBeVisible();
  await live("État suivant").click();
  await expect.poll(() => video.evaluate((v) => v.paused)).toBe(true);
  await expect(
    page.locator('.editor-preview [data-layer-id="rect"]'),
  ).toBeVisible();
  await page.getByRole("tab", { name: "États", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByText("Lecture : Fermé", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog").locator("video")).toHaveCount(0);
});
