import { test, expect } from "@playwright/test";
const notes = (p) => p.locator(".notes-panel");
const saved = (p) =>
  expect(p.locator(".save-status")).toContainText("Sauvegardé");
const toggle = (p) =>
  p.getByRole("button", { name: "Notes", exact: true }).click();
async function drag(page, locator, dx, dy) {
  const b = await locator.boundingBox();
  await page.mouse.move(b.x + 12, b.y + 12);
  await page.mouse.down();
  await page.mouse.move(b.x + 12 + dx, b.y + 12 + dy, { steps: 12 });
  await page.mouse.up();
}
async function rectangle(p) {
  return notes(p).boundingBox();
}
test("fenêtre flottante : canevas inchangé, déplacement, taille, préférences, pages et réinitialisation", async ({
  page,
}) => {
  await page.goto("/");
  await saved(page);
  const before = await page.locator(".canvas-scroll").boundingBox(),
    timeline = await page.locator(".workspace-timeline").boundingBox();
  await toggle(page);
  const initial = await rectangle(page);
  expect(initial.x).toBeLessThan(
    (await page.locator(".editor-preview").boundingBox()).x,
  );
  expect(await page.locator(".canvas-scroll").boundingBox()).toEqual(before);
  expect(await page.locator(".workspace-timeline").boundingBox()).toEqual(
    timeline,
  );
  await page.getByLabel("Texte des notes").fill("Notes de la première page");
  await saved(page);
  await drag(
    page,
    page.getByLabel("Déplacer les notes", { exact: true }),
    250,
    75,
  );
  let moved = await rectangle(page);
  expect(moved.x).toBeGreaterThan(initial.x + 200);
  expect(moved.y).toBeGreaterThan(initial.y + 50);
  const grip = page.getByRole("separator", { name: "Taille des notes" }),
    g = await grip.boundingBox();
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2 + 110, g.y + g.height / 2 + 60, {
    steps: 10,
  });
  await page.mouse.up();
  const resized = await rectangle(page);
  expect(resized.width).toBeGreaterThan(moved.width + 80);
  expect(resized.height).toBeGreaterThan(moved.height + 40);
  await toggle(page);
  await expect(notes(page)).toHaveCount(0);
  await toggle(page);
  expect(await rectangle(page)).toEqual(resized);
  await page.locator(".page-thumbnail").nth(1).click();
  await expect(page.getByLabel("Texte des notes")).toHaveValue("");
  expect(await rectangle(page)).toEqual(resized);
  await page.locator(".page-thumbnail").first().click();
  await expect(page.getByLabel("Texte des notes")).toHaveValue(
    "Notes de la première page",
  );
  await page.reload();
  await saved(page);
  await toggle(page);
  expect(await rectangle(page)).toEqual(resized);
  await expect(page.getByLabel("Texte des notes")).toHaveValue(
    "Notes de la première page",
  );
  await page.getByRole("button", { name: "Menu des notes" }).click();
  await page.getByRole("button", { name: "Réinitialiser la position" }).click();
  expect(await rectangle(page)).toEqual(initial);
});
test("petit écran, fenêtre réduite, préférence invalide et clavier sans déplacer les calques", async ({
  page,
}) => {
  await page.goto("/");
  await saved(page);
  await page.getByRole("button", { name: "+ Rectangle", exact: true }).click();
  await saved(page);
  const x = await page
    .getByLabel("X du calque (%)", { exact: true })
    .inputValue();
  await toggle(page);
  const header = page.getByLabel("Déplacer les notes", { exact: true });
  await header.focus();
  const before = await rectangle(page);
  await header.press("ArrowRight");
  expect((await rectangle(page)).x).toBe(before.x + 10);
  await expect(page.getByLabel("X du calque (%)", { exact: true })).toHaveValue(
    x,
  );
  const anchored = await rectangle(page);
  await drag(
    page,
    page.getByRole("separator", { name: "Taille des notes" }),
    2000,
    80,
  );
  expect((await rectangle(page)).x).toBe(anchored.x);
  await page.setViewportSize({ width: 390, height: 650 });
  const b = await rectangle(page);
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(390);
  expect(b.y).toBeGreaterThanOrEqual(48);
  expect(b.y + b.height).toBeLessThanOrEqual(650);
  await expect(header).toBeInViewport();
  await page.getByRole("button", { name: "Fermer les notes" }).click();
  await page.evaluate(() => {
    const key = "studio.workspace.v1",
      value = JSON.parse(localStorage.getItem(key));
    value.notesWindow = { x: 1e9, y: -1e9, width: 1e8, height: 1e8 };
    localStorage.setItem(key, JSON.stringify(value));
  });
  await page.reload();
  await saved(page);
  await toggle(page);
  await expect(header).toBeInViewport();
  const clamped = await rectangle(page);
  expect(clamped.x + clamped.width).toBeLessThanOrEqual(390);
  expect(clamped.y).toBeGreaterThanOrEqual(48);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
