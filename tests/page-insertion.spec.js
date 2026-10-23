import { test, expect } from "@playwright/test";
import JSZip from "jszip";
import fs from "node:fs/promises";
const cards = (p) => p.locator(".timeline .page-thumbnail");
const saved = (p) =>
  expect(p.locator(".save-status")).toContainText("Sauvegardé");
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
const add = (p) =>
  p.getByRole("button", { name: "+ Ajouter une page", exact: true }).click();
for (const index of [0, 1, 2])
  test(`insertion après la page ${index + 1} : ordre, identifiants et sélection Undo/Redo`, async ({
    page,
  }) => {
    await start(page);
    const before = await record(page);
    await cards(page).nth(index).click();
    await add(page);
    await saved(page);
    const after = await record(page),
      inserted = after.pages[index + 1];
    expect(after.pages.filter((p) => p.id !== inserted.id)).toEqual(
      before.pages,
    );
    expect(new Set(after.pages.map((p) => p.id)).size).toBe(4);
    expect(inserted.imageId).toBeNull();
    await expect(cards(page).nth(index + 1)).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(
      page.getByLabel("Nom de la page", { exact: true }),
    ).toHaveValue(inserted.title);
    await expect(
      cards(page)
        .nth(index + 1)
        .locator(".thumbnail-number"),
    ).toHaveText(String(index + 2));
    await page.keyboard.press("Control+z");
    await saved(page);
    expect((await record(page)).pages).toEqual(before.pages);
    await expect(cards(page).nth(index)).toHaveAttribute(
      "aria-current",
      "true",
    );
    await page.keyboard.press("Control+Shift+z");
    await saved(page);
    expect((await record(page)).pages).toEqual(after.pages);
    await expect(cards(page).nth(index + 1)).toHaveAttribute(
      "aria-current",
      "true",
    );
    await page.getByRole("button", { name: "↶ Annuler", exact: true }).click();
    await saved(page);
    await expect(
      page.getByRole("button", { name: "↷ Rétablir", exact: true }),
    ).toBeEnabled();
    await cards(page).nth(index).focus();
    await page.keyboard.press("Control+y");
    await saved(page);
    await expect(cards(page).nth(index + 1)).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

test("insertions consécutives : défilement, liens vidéo perdus conservés, actions, rechargement et ZIP", async ({
  page,
  browser,
}, info) => {
  await start(page);
  await page.getByRole("button", { name: "+ Bouton", exact: true }).click();
  await page
    .getByLabel("Type d’action", { exact: true })
    .selectOption("navigate");
  const initial = await record(page);
  await page
    .getByLabel("Page de destination", { exact: true })
    .selectOption(initial.pages[2].id);
  await saved(page);
  const before = await record(page);
  await add(page);
  await saved(page);
  const first = (await record(page)).pages[1];
  await add(page);
  await saved(page);
  const doc = await record(page);
  expect(doc.pages.map((p) => p.id)).toEqual([
    before.pages[0].id,
    first.id,
    doc.pages[2].id,
    before.pages[1].id,
    before.pages[2].id,
  ]);
  expect(doc.transitions).toEqual(before.transitions);
  expect(doc.pages[0].buttons).toEqual(before.pages[0].buttons);
  expect(doc.media.map((m) => [m.id, m.blob.size])).toEqual(
    before.media.map((m) => [m.id, m.blob.size]),
  );
  const warning = page.getByRole("button", {
    name: /1 transition\(s\) non associée/,
  });
  await warning.click();
  await expect(
    page.getByRole("region", { name: "Transitions non associées" }),
  ).toContainText(before.pages[0].title);
  await page
    .getByRole("region", { name: "Transitions non associées" })
    .getByRole("button", { name: "Fermer", exact: true })
    .click();
  await cards(page).first().click();
  await page.getByRole("button", { name: "Présentation", exact: true }).click();
  await page
    .locator(".interactive-button-layer")
    .getByRole("button", { name: "Bouton 1", exact: true })
    .click();
  await expect(page.locator(".slide-info")).toHaveText(before.pages[2].title);
  await page.getByRole("button", { name: "Éditeur", exact: true }).click();
  const down = page.waitForEvent("download");
  await page.getByRole("button", { name: "Fichier", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Sauvegarder mon projet", exact: true })
    .click();
  const file = info.outputPath("insertion.zip");
  await (await down).saveAs(file);
  const zip = await JSZip.loadAsync(await fs.readFile(file));
  expect(
    JSON.parse(await zip.file("presentation.json").async("string")).pages,
  ).toEqual(doc.pages);
  await page.reload();
  await saved(page);
  expect((await record(page)).pages).toEqual(doc.pages);
  expect((await record(page)).transitions).toEqual(before.transitions);
  const ctx = await browser.newContext(),
    other = await ctx.newPage();
  await start(other);
  await other.getByTestId("zip-input").setInputFiles(file);
  await other
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmer", exact: true })
    .click();
  await saved(other);
  expect((await record(other)).pages).toEqual(doc.pages);
  expect((await record(other)).transitions).toEqual(before.transitions);
  await ctx.close();
  for (let i = 0; i < 8; i++) await add(page);
  await saved(page);
  await expect(
    page.locator('.page-thumbnail[aria-current="true"]'),
  ).toBeInViewport({ ratio: 0.9 });
});

test("aucune page : ajout, annulation vers une présentation vide et rétablissement", async ({
  page,
}) => {
  await start(page);
  for (let i = 0; i < 3; i++) {
    await page
      .getByRole("button", { name: "Supprimer la page", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Confirmer", exact: true })
      .click();
  }
  await expect(cards(page)).toHaveCount(0);
  await page
    .getByRole("button", { name: "Ajouter une page", exact: true })
    .click();
  await saved(page);
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first()).toHaveAttribute("aria-current", "true");
  await page.getByRole("button", { name: "↶ Annuler", exact: true }).click();
  await expect(cards(page)).toHaveCount(0);
  await page.getByRole("button", { name: "↷ Rétablir", exact: true }).click();
  await expect(cards(page).first()).toHaveAttribute("aria-current", "true");
});
