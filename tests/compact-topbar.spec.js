import { test, expect } from "@playwright/test";
const saved = (p) =>
  expect(p.locator(".save-status")).toContainText("Sauvegardé");
const bar = (p) => p.getByRole("banner", { name: "Barre de l’éditeur" });
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
test("une seule rangée de 48 px, commandes réutilisées, ajustement, mode Test, états et interactions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await start(page);
  await expect(page.locator(".app > header")).toHaveCount(0);
  await expect(page.locator(".workspace-topbar,.preview-heading")).toHaveCount(
    0,
  );
  expect((await bar(page).boundingBox()).height).toBe(48);
  expect((await page.locator(".canvas-scroll").boundingBox()).y).toBe(48);
  for (const label of [
    "Fichier",
    "Éditeur",
    "Présentation",
    "Positionner les boutons",
    "Tester les interactions",
    "⌖ Magnétisme actif",
    "Afficher l’arrière-plan par défaut",
    "Ajuster à l’écran",
    "Ajuster la sélection",
    "Réduire le zoom",
    "Augmenter le zoom",
    "100 %",
    "Vue des interactions",
    "↶ Annuler",
    "↷ Rétablir",
    "▶ Lancer la présentation",
    "Notifications",
  ])
    await expect(
      bar(page).getByRole("button", { name: label, exact: true }),
    ).toBeVisible();
  await expect(
    bar(page).getByRole("tab", { name: "États", exact: true }),
  ).toBeVisible();
  await expect(bar(page).getByLabel("Création sur le canevas")).toBeVisible();
  const before = await record(page);
  await page.getByLabel("Zoom en pourcentage").fill("200");
  await expect(page.locator(".editor-preview")).toHaveCSS("width", "3840px");
  await page
    .getByRole("button", { name: "Ajuster à l’écran", exact: true })
    .click();
  await expect(page.locator(".editor-preview")).toBeInViewport({ ratio: 1 });
  expect(
    (await page.locator(".editor-preview").boundingBox()).height,
  ).toBeGreaterThan(690);
  expect((await record(page)).pages).toEqual(before.pages);
  await page
    .getByRole("button", { name: "⌖ Magnétisme actif", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "⌖ Magnétisme inactif", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page
    .getByRole("button", {
      name: "Afficher l’arrière-plan par défaut",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Tester les interactions", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Revenir au mode édition", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Revenir au mode édition", exact: true })
    .click();
  await page.getByRole("tab", { name: "États", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Gestionnaire visuel des états" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Vue des interactions", exact: true })
    .click();
  await expect(page.locator("dialog.interaction-map")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Présentation", exact: true }).click();
  await expect(page.locator(".presentation-mode")).toBeVisible();
  await page.getByRole("button", { name: "Éditeur", exact: true }).click();
  await expect(bar(page)).toBeVisible();
});
test("écrans étroits : une ligne, Plus au clavier, menus accessibles, aucun débordement", async ({
  page,
}) => {
  await start(page);
  const before = await record(page);
  for (const width of [1100, 1099, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect((await bar(page).boundingBox()).height).toBe(48);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    if (width < 1100) {
      const plus = page.getByRole("button", { name: "Plus", exact: true });
      await plus.focus();
      await plus.press("Enter");
      await expect(
        page.getByRole("button", {
          name: "Tester les interactions",
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.getByLabel("Zoom en pourcentage")).toBeVisible();
      for (const name of [
        "⌖ Magnétisme actif",
        "Afficher l’arrière-plan par défaut",
        "100 %",
        "▶ Lancer la présentation",
      ])
        await expect(
          page.getByRole("button", { name, exact: true }),
        ).toBeVisible();
      const bounds = await page
        .locator(".toolbar-command-content")
        .boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      await page.getByLabel("Zoom en pourcentage").fill("50");
      await page.keyboard.press("Escape");
      await expect(plus).toBeFocused();
      await expect(plus).toHaveAttribute("aria-expanded", "false");
      await plus.click();
      await page.getByRole("button", { name: "Fichier", exact: true }).click();
      await expect(plus).toHaveAttribute("aria-expanded", "false");
      await expect(
        page.getByRole("menu", { name: "Fichier", exact: true }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
    }
  }
  expect((await record(page)).pages).toEqual(before.pages);
});
test("notifications : destination supprimée accessible sans rangée supplémentaire, erreurs urgentes et réessai", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "+ Bouton", exact: true }).click();
  await page
    .getByLabel("Type d’action", { exact: true })
    .selectOption("navigate");
  const before = await record(page);
  await page
    .getByLabel("Page de destination", { exact: true })
    .selectOption(before.pages[1].id);
  await page.locator(".page-thumbnail").nth(1).click();
  await page
    .getByRole("button", { name: "Supprimer la page", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmer", exact: true })
    .click();
  await saved(page);
  const panel = page.getByRole("region", {
    name: "Notifications de l’application",
  });
  await expect(panel).toBeHidden();
  expect((await page.locator(".canvas-scroll").boundingBox()).y).toBe(48);
  await page
    .getByRole("button", { name: "Notifications", exact: true })
    .click();
  await expect(panel).toContainText("la diapositive cible a été supprimée");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Notifications", exact: true }),
  ).toBeFocused();
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    window.restoreTestPut = () => {
      IDBObjectStore.prototype.put = put;
    };
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === "documents")
        throw new DOMException("quota", "QuotaExceededError");
      return put.apply(this, args);
    };
  });
  await page
    .getByLabel("Nom de la page", { exact: true })
    .fill("Sauvegarde à réessayer");
  await expect(page.getByRole("alert")).toContainText("stockage insuffisant");
  expect((await page.locator(".canvas-scroll").boundingBox()).y).toBe(48);
  await page.evaluate(() => window.restoreTestPut());
  await page
    .getByRole("button", { name: "Réessayer la sauvegarde", exact: true })
    .click();
  await saved(page);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
