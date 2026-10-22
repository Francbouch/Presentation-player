import { test, expect } from "@playwright/test";
const ready = async (p) => {
  await p.goto("/");
  await expect(p.locator(".save-status")).toContainText("Sauvegardé");
};
test("zoom au curseur, main et cadrage sans mutation du document", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "+ Rectangle", exact: true }).click();
  const scene = page.locator(".editor-preview"),
    area = page.locator(".canvas-scroll"),
    input = page.getByLabel("Zoom en pourcentage");
  const a = await area.boundingBox(),
    before = await scene.boundingBox(),
    point = { x: a.x + a.width * 0.6, y: a.y + a.height * 0.6 };
  const nx = (point.x - before.x) / before.width,
    ny = (point.y - before.y) / before.height;
  await page.mouse.move(point.x, point.y);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -180);
  await page.keyboard.up("Control");
  await expect
    .poll(async () => Number(await input.inputValue()))
    .toBeGreaterThan(Math.round((before.width / 1920) * 100));
  const after = await scene.boundingBox();
  expect((point.x - after.x) / after.width).toBeCloseTo(nx, 2);
  expect((point.y - after.y) / after.height).toBeCloseTo(ny, 2);
  await page.keyboard.down("Space");
  await page.mouse.down();
  await page.mouse.move(point.x + 50, point.y + 30, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up("Space");
  const moved = await scene.boundingBox();
  expect(moved.x - after.x).toBeCloseTo(50, 0);
  expect(moved.y - after.y).toBeCloseTo(30, 0);
  for (const zoom of [50, 100, 200]) {
    await input.fill(String(zoom));
    await expect(input).toHaveValue(String(zoom));
    await expect
      .poll(async () => (await scene.boundingBox()).width)
      .toBeCloseTo((1920 * zoom) / 100, 0);
  }
  await page
    .getByRole("button", { name: "Ajuster la sélection", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ajuster à l’écran", exact: true })
    .click();
  await expect(scene).toBeInViewport({ ratio: 1 });
});

test("couleurs liées : styles, surcharge locale, suppression et validation non destructive", async ({
  page,
}) => {
  await ready(page);
  const result = await (async () => {
    const { normalizeDocument, createLayer, emptyPage, uid } = await import(
      "../src/document.js"
    );
    const { appearanceValues } = await import("../src/projectStyles.js");
    const { deleteProjectColor, validateProjectColors, detachChangedColors } =
      await import("../src/projectColors.js");
    const layer = {
        ...createLayer("rectangle", 1),
        color: "#123456",
        colorLinks: { color: "blue" },
      },
      p = emptyPage();
    p.layers = [layer];
    p.layerOrder = [layer.id];
    const style = {
      id: "style",
      name: "Partagé",
      values: appearanceValues(layer),
    };
    const other = {
      ...createLayer("rectangle", 2),
      styleLink: { id: "style", overrides: [] },
    };
    p.layers.push(other);
    p.layerOrder.push(other.id);
    let d = normalizeDocument({
      version: 20,
      pages: [p],
      media: [],
      projectColors: [
        { id: "blue", name: "Bleu", value: "#123456", favorite: true },
      ],
      projectStyles: [style],
      privateMetadata: { keep: true },
    });
    d = normalizeDocument({
      ...d,
      projectColors: [{ ...d.projectColors[0], value: "#abcdef" }],
    });
    const values = d.pages[0].layers.map((l) => l.color);
    validateProjectColors(d);
    const patch = detachChangedColors(d.pages[0].layers[0], {
      color: "#112233",
    });
    const detached = deleteProjectColor(d, "blue");
    validateProjectColors(detached);
    let rejected = false;
    try {
      validateProjectColors({ ...d, recentColors: ["wrong"] });
    } catch {
      rejected = true;
    }
    return { values, patch, detached, original: d.privateMetadata, rejected };
  })();
  expect(result.values).toEqual(["#abcdef", "#abcdef"]);
  expect(result.patch.colorLinks).toEqual({});
  expect(result.detached.pages[0].layers.map((l) => l.color)).toEqual([
    "#abcdef",
    "#abcdef",
  ]);
  expect(result.detached.projectStyles[0].values.fill.color).toBe("#abcdef");
  expect(result.original).toEqual({ keep: true });
  expect(result.rejected).toBe(true);
});

test("palette, pipette Chrome annulable, liaison, rechargement et ZIP réel", async ({
  page,
}, info) => {
  await ready(page);
  await page.getByRole("button", { name: "+ Rectangle", exact: true }).click();
  await page.evaluate(() => {
    window.EyeDropper = class {
      async open() {
        return { sRGBHex: "#2468ac" };
      }
    };
  });
  await page
    .getByRole("button", { name: "Pipette — Couleur du calque", exact: true })
    .click();
  await expect(
    page.getByLabel("Couleur du calque", { exact: true }),
  ).toHaveValue("#2468ac");
  await page
    .getByRole("button", { name: "Palette — Couleur du calque", exact: true })
    .click();
  page.once("dialog", (d) => d.accept("Bleu principal"));
  await page
    .getByRole("button", { name: "Ajouter la couleur actuelle aux favoris" })
    .click();
  await page.getByRole("button", { name: "Lier", exact: true }).click();
  await page
    .getByRole("button", { name: "Palette — Couleur du calque", exact: true })
    .click();
  await page
    .getByLabel("Modifier la couleur Bleu principal", { exact: true })
    .fill("#aa4411");
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await expect(
    page.getByLabel("Couleur du calque", { exact: true }),
  ).toHaveValue("#aa4411");
  await expect(page.locator(".save-status")).toContainText("Sauvegardé");
  await page.reload();
  await expect(page.locator(".save-status")).toContainText("Sauvegardé");
  await page
    .getByRole("button", {
      name: "Sélectionner le calque Rectangle 1",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Couleur du calque", { exact: true }),
  ).toHaveValue("#aa4411");
  await page.getByRole("button", { name: "Fichier", exact: true }).click();
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("menuitem", { name: "Sauvegarder mon projet", exact: true })
    .click();
  const file = info.outputPath("palette.zip");
  await (await downloading).saveAs(file);
  const fs = await import("node:fs/promises"),
    { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await fs.readFile(file)),
    d = JSON.parse(await zip.file("presentation.json").async("string"));
  expect(d.projectColors[0].name).toBe("Bleu principal");
  expect(d.pages[0].layers[0].colorLinks.color).toBe(d.projectColors[0].id);
  await page.getByTestId("zip-input").setInputFiles(file);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmer", exact: true })
    .click();
  await expect(page.locator(".save-status")).toContainText("Sauvegardé");
  await page
    .getByRole("button", {
      name: "Sélectionner le calque Rectangle 1",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Couleur du calque", { exact: true }),
  ).toHaveValue("#aa4411");
  await page.evaluate(() => {
    window.EyeDropper = class {
      async open() {
        throw new DOMException("Cancelled", "AbortError");
      }
    };
  });
  await page
    .getByRole("button", { name: "Pipette — Couleur du calque", exact: true })
    .click();
  await expect(
    page.getByLabel("Couleur du calque", { exact: true }),
  ).toHaveValue("#aa4411");
});

test("schéma dérivé : états, fonds, vidéo vers état, vidéos simultanées et références invalides", async () => {
  const { buildInteractionGraph, filterInteractionGraph } = await import(
    "../src/interactionGraph.js"
  );
  const { emptyPage, createLayer, createInteractiveButton } = await import(
    "../src/document.js"
  );
  const p = emptyPage(1),
    q = emptyPage(2),
    frame = {
      ...createLayer("rectangle", 1),
      frameMedia: { kind: "video", mediaId: "clip" },
    };
  p.layers = [frame];
  p.states = [
    {
      id: "open",
      name: "Lit ouvert",
      background: { kind: "media", mediaId: "image" },
      visibility: { [frame.id]: true },
    },
  ];
  p.buttons = [
    ["Changer état", { type: "state", stateId: "open" }],
    [
      "Fond",
      { type: "background", target: { kind: "media", mediaId: "image" } },
    ],
    [
      "Ouvrir",
      { type: "video", videoId: "clip", end: "state", finalStateId: "open" },
    ],
    [
      "Simultanées",
      {
        type: "layerVideo",
        layerIds: [frame.id, "missing"],
        command: "restart",
      },
    ],
    ["Navigation", { type: "navigate", pageId: q.id }],
    [
      "Manquante",
      { type: "video", videoId: "absent", end: "state", finalStateId: "gone" },
    ],
  ].map(([name, action]) => ({ ...createInteractiveButton(1), name, action }));
  const d = {
    pages: [p, q],
    media: [
      { id: "clip", name: "Ouverture.mp4", type: "video/mp4" },
      { id: "image", name: "Lit.png", type: "image/png" },
    ],
    transitions: [],
  };
  const before = structuredClone(d),
    g = buildInteractionGraph(d);
  expect(d).toEqual(before);
  expect(g.nodes.filter((n) => n.kind === "button")).toHaveLength(6);
  expect(g.nodes.some((n) => n.label === "Lit ouvert")).toBe(true);
  expect(g.nodes.filter((n) => n.warning).length).toBeGreaterThanOrEqual(3);
  const videoState = g.edges.find(
    (e) => e.category === "video" && e.label === "État cible",
  );
  expect(g.nodes.find((n) => n.id === videoState.from).kind).toBe("video");
  expect(
    filterInteractionGraph(g, "video", p.id).nodes.some(
      (n) => n.label === "Simultanées",
    ),
  ).toBe(true);
  expect(
    filterInteractionGraph(g, "navigate", p.id).nodes.some(
      (n) => n.label === q.title,
    ),
  ).toBe(true);
  p.buttons[0].name = "Nouveau nom";
  expect(
    buildInteractionGraph(d).nodes.find(
      (n) => n.id === g.nodes.find((n) => n.label === "Changer état").id,
    ).label,
  ).toBe("Nouveau nom");
});

test("vue interactions : filtres, déplacement persistant et ouverture sans exécuter le bouton", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "+ Bouton", exact: true }).click();
  await page
    .getByLabel("Nom du calque", { exact: true })
    .fill("Aller ailleurs");
  await page
    .getByLabel("Type d’action", { exact: true })
    .selectOption("navigate");
  await page
    .getByRole("button", { name: "Vue des interactions", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("Aller ailleurs", { exact: true }),
  ).toBeVisible();
  const node = dialog
    .locator(".graph-button")
    .filter({ hasText: "Aller ailleurs" });
  const original = await node.getAttribute("style");
  await node.focus();
  await node.press("ArrowRight");
  const dragged = await node.getAttribute("style");
  expect(dragged).not.toBe(original);
  await dialog.getByLabel("Filtrer les interactions").selectOption("video");
  await expect(dialog.locator(".graph-button")).toHaveCount(0);
  await dialog.getByLabel("Filtrer les interactions").selectOption("all");
  await node.dblclick();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByLabel("Nom du calque", { exact: true })).toHaveValue(
    "Aller ailleurs",
  );
  await page
    .getByRole("button", { name: "Vue des interactions", exact: true })
    .click();
  await expect(
    page.locator(".graph-button").filter({ hasText: "Aller ailleurs" }),
  ).toHaveAttribute("style", dragged);
});
