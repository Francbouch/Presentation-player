import { test, expect } from "@playwright/test";
const saved = (p) =>
  expect(p.locator(".save-status")).toContainText("✓ Sauvegardé");
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
test("sélection multiple, alignement, groupe, déplacement commun, annulation et copie", async ({
  page,
}) => {
  await page.goto("/");
  await saved(page);
  await page.getByRole("button", { name: "+ Rectangle", exact: true }).click();
  await page.getByRole("button", { name: "+ Cercle", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Sélectionner le calque Rectangle 1",
      exact: true,
    })
    .click({ modifiers: ["Shift"] });
  await expect(
    page.getByText("2 éléments sélectionnés", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Aligner à gauche", exact: true })
    .click();
  await page.getByRole("button", { name: "Grouper", exact: true }).click();
  await saved(page);
  let d = await record(page);
  expect(d.pages[0].visualGroups[0].children).toHaveLength(2);
  const box = await page
    .getByRole("button", { name: "Déplacer la sélection", exact: true })
    .boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 60, box.y + 30, { steps: 6 });
  await page.mouse.up();
  await saved(page);
  const moved = await record(page);
  expect(moved.pages[0].layers[0].x).not.toBe(d.pages[0].layers[0].x);
  await page
    .getByRole("button", { name: "Dupliquer la sélection", exact: true })
    .click();
  await saved(page);
  d = await record(page);
  expect(d.pages[0].layers).toHaveLength(4);
  expect(d.pages[0].visualGroups).toHaveLength(2);
  await page.reload();
  await saved(page);
  await expect(page.locator(".visual-group-list > details")).toHaveCount(2);
});

test("composants : héritage, propriété locale, maître, détachement et ZIP", async ({
  page,
  browser,
}, info) => {
  await page.goto("/");
  await saved(page);
  await page.getByRole("button", { name: "+ Bouton", exact: true }).click();
  await page
    .getByLabel("Nom du nouveau composant", { exact: true })
    .fill("Retour");
  await page
    .getByRole("button", { name: "Créer un composant", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Panneau Composants", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Insérer une instance", exact: true })
    .click();
  await saved(page);
  let d = await record(page);
  expect(d.components).toHaveLength(1);
  expect(d.pages[0].componentInstances).toHaveLength(2);
  await page
    .getByLabel("Nom du calque", { exact: true })
    .fill("Instance locale");
  await page
    .getByRole("button", { name: "Modifier le maître", exact: true })
    .click();
  await page.getByLabel("Nom du calque", { exact: true }).fill("Maître Retour");
  await page.getByLabel("Opacité du calque", { exact: true }).evaluate((el) => {
    const set = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    ).set;
    set.call(el, "60");
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page
    .getByRole("button", {
      name: "Appliquer au maître et aux instances",
      exact: true,
    })
    .click();
  await saved(page);
  d = await record(page);
  expect(d.pages[0].buttons.map((b) => b.opacity)).toEqual([0.6, 0.6]);
  expect(d.pages[0].buttons[1].name).toBe("Instance locale");
  await page.reload();
  await saved(page);
  await page
    .getByRole("button", {
      name: "Sélectionner le calque Instance locale",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Détacher du composant", exact: true })
    .click();
  await saved(page);
  expect((await record(page)).pages[0].componentInstances).toHaveLength(1);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Fichier", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Sauvegarder mon projet", exact: true })
    .click();
  const file = info.outputPath("components.zip");
  await (await download).saveAs(file);
  const context = await browser.newContext();
  const other = await context.newPage();
  await other.goto("/");
  await saved(other);
  await other.getByTestId("zip-input").setInputFiles(file);
  await other
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmer", exact: true })
    .click();
  await saved(other);
  expect((await record(other)).components).toEqual(d.components);
  await context.close();
});

test("scène : Maj + clic, rectangle, Ctrl+A sans les calques verrouillés et édition du groupe", async ({
  page,
}) => {
  await page.goto("/");
  await saved(page);
  await page.getByRole("button", { name: "+ Rectangle", exact: true }).click();
  await page.getByLabel("X du calque (%)", { exact: true }).fill("10");
  await page.getByRole("button", { name: "+ Cercle", exact: true }).click();
  await page.getByLabel("X du calque (%)", { exact: true }).fill("60");
  const rect = page
    .locator(".editor-preview")
    .getByRole("button", { name: "Rectangle 1", exact: true });
  await rect.click({ modifiers: ["Shift"] });
  await expect(
    page.getByText("2 éléments sélectionnés", { exact: true }),
  ).toBeVisible();
  await rect.click({ modifiers: ["Shift"] });
  await expect(
    page.getByText("2 éléments sélectionnés", { exact: true }),
  ).toHaveCount(0);
  await page.locator(".editor").focus();
  await page.keyboard.press("Escape");
  const box = await page.locator(".editor-preview").boundingBox();
  await page.mouse.move(box.x + box.width * 0.04, box.y + box.height * 0.08);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.65, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(
    page.getByText("2 éléments sélectionnés", { exact: true }),
  ).toBeVisible();
  await page.locator(".editor").focus();
  await page.keyboard.press("Control+g");
  await saved(page);
  expect((await record(page)).pages[0].visualGroups).toHaveLength(1);
  await rect.dblclick();
  await expect(
    page.getByText("Édition du groupe ·", { exact: false }),
  ).toBeVisible();
  await page.locator(".editor").focus();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", {
      name: "Verrouiller le calque Rectangle 1",
      exact: true,
    })
    .click();
  await page.locator(".editor").focus();
  await page.keyboard.press("Control+a");
  await expect(page.getByLabel("Nom du calque", { exact: true })).toHaveValue(
    "Cercle 2",
  );
  await page.getByLabel("Nom du calque", { exact: true }).focus();
  await page.keyboard.press("Control+a");
  await expect(page.getByLabel("Nom du calque", { exact: true })).toHaveValue(
    "Cercle 2",
  );
});

test("guides sur une forme, Alt, redimensionnement commun et annulation unique", async ({
  page,
}) => {
  await page.goto("/");
  await saved(page);
  await page.getByRole("button", { name: "+ Rectangle", exact: true }).click();
  const scene = page.locator(".editor-preview"),
    bounds = await scene.boundingBox(),
    frame = scene.locator("[data-layer-id]").first(),
    box = await frame.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.5 + 4,
    box.y + box.height / 2,
    { steps: 8 },
  );
  await expect(scene.locator(".layer-guide.guide-x")).toBeVisible();
  await page.keyboard.down("Alt");
  await page.mouse.move(
    bounds.x + bounds.width * 0.5 + 5,
    box.y + box.height / 2,
  );
  await expect(scene.locator(".layer-guide")).toHaveCount(0);
  await page.mouse.up();
  await page.keyboard.up("Alt");
  await expect(scene.locator(".layer-guide")).toHaveCount(0);
  await page.getByRole("button", { name: "+ Cercle", exact: true }).click();
  await page.locator(".editor").focus();
  await page.keyboard.press("Control+a");
  await saved(page);
  const before = await record(page),
    handle = page.getByRole("button", {
      name: "Redimensionner la sélection se",
      exact: true,
    }),
    h = await handle.boundingBox();
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + 25, h.y + 15, { steps: 8 });
  await page.mouse.up();
  await saved(page);
  const resized = await record(page);
  expect(resized.pages[0].layers[0].width).toBeGreaterThan(
    before.pages[0].layers[0].width,
  );
  const r = resized.pages[0].layers[0].width / before.pages[0].layers[0].width;
  expect(
    resized.pages[0].layers[1].width / before.pages[0].layers[1].width,
  ).toBeCloseTo(r);
  await page.locator(".editor").focus();
  await page.keyboard.press("Control+z");
  await saved(page);
  expect((await record(page)).pages[0].layers).toEqual(before.pages[0].layers);
});

test("maître : annulation de session, suppression confirmée et conservation des instances", async ({
  page,
}) => {
  await page.goto("/");
  await saved(page);
  await page.getByRole("button", { name: "+ Bouton", exact: true }).click();
  await page
    .getByLabel("Nom du nouveau composant", { exact: true })
    .fill("Navigation");
  await page
    .getByRole("button", { name: "Créer un composant", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Panneau Composants", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Insérer une instance", exact: true })
    .click();
  await saved(page);
  const before = await record(page);
  await page
    .getByRole("button", { name: "Modifier le maître", exact: true })
    .click();
  await page.getByLabel("Nom du calque", { exact: true }).fill("Nouveau nom");
  await page.getByLabel("Largeur du calque (%)", { exact: true }).fill("20");
  await page
    .getByRole("button", {
      name: "Appliquer au maître et aux instances",
      exact: true,
    })
    .click();
  await saved(page);
  await page.locator(".editor").focus();
  await page.keyboard.press("Control+z");
  await saved(page);
  expect((await record(page)).pages).toEqual(before.pages);
  expect((await record(page)).components).toEqual(before.components);
  await page
    .getByRole("button", { name: "Supprimer le composant", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("éléments indépendants");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmer", exact: true })
    .click();
  await saved(page);
  const after = await record(page);
  expect(after.components).toHaveLength(0);
  expect(after.pages[0].buttons).toEqual(before.pages[0].buttons);
  expect(after.pages[0].componentInstances).toHaveLength(0);
  await page.reload();
  await saved(page);
  await expect(page.locator(".editor-preview [data-button-id]")).toHaveCount(2);
});

test("rotation commune : angle normalisé, géométrie valide et rechargement sans perte", async ({
  page,
}) => {
  await page.goto("/");
  await saved(page);
  for (const x of ["30", "50"]) {
    await page
      .getByRole("button", { name: "+ Rectangle", exact: true })
      .click();
    await page.getByLabel("X du calque (%)", { exact: true }).fill(x);
    await page.getByLabel("Y du calque (%)", { exact: true }).fill("40");
    await page.getByLabel("Rotation du calque", { exact: true }).fill("350");
  }
  await page.locator(".editor").focus();
  await page.keyboard.press("Control+a");
  const frame = await page.locator(".multi-selection-frame").boundingBox(),
    handle = await page
      .getByRole("button", { name: "Faire pivoter la sélection", exact: true })
      .boundingBox();
  await page.mouse.move(
    handle.x + handle.width / 2,
    handle.y + handle.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    frame.x + frame.width / 2 + 60,
    frame.y + frame.height / 2,
    { steps: 10 },
  );
  await page.mouse.up();
  await saved(page);
  const d = await record(page);
  for (const l of d.pages[0].layers) {
    expect(l.rotation).toBeGreaterThanOrEqual(-180);
    expect(l.rotation).toBeLessThanOrEqual(180);
    expect(l.rotation).not.toBe(350);
  }
  await page.reload();
  await saved(page);
  expect((await record(page)).pages[0].layers).toEqual(d.pages[0].layers);
});

test("retrait d’un élément du maître : confirmation avant propagation aux instances", async ({
  page,
}) => {
  await page.goto("/");
  await saved(page);
  await page.getByRole("button", { name: "+ Bouton", exact: true }).click();
  await page.getByRole("button", { name: "+ Rectangle", exact: true }).click();
  await page.locator(".editor").focus();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Control+g");
  await page
    .getByLabel("Nom du nouveau composant", { exact: true })
    .fill("Ensemble");
  await page
    .getByRole("button", { name: "Créer un composant", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Panneau Composants", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Insérer une instance", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Modifier le maître", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Panneau Calques", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Sélectionner le calque Rectangle 1",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Supprimer le calque", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Appliquer au maître et aux instances",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "actions qui les ciblent",
  );
  await expect(
    page.getByRole("button", {
      name: "Conserver comme éléments indépendants",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmer", exact: true })
    .click();
  await saved(page);
  const d = await record(page);
  expect(d.components[0].layers).toHaveLength(1);
  expect(d.pages[0].layers).toHaveLength(0);
  expect(d.pages[0].buttons).toHaveLength(2);
  await page.reload();
  await saved(page);
});
