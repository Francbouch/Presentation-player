import { test, expect } from "@playwright/test";
import JSZip from "jszip";
import fs from "node:fs/promises";
const saved = (p) =>
  expect(p.locator(".save-status")).toContainText("Sauvegardé");
test("notes privées : pages, clavier, rechargement et véritable ZIP", async ({
  page,
}) => {
  await page.goto("/");
  await saved(page);
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  const text = page.getByRole("textbox", { name: "Texte des notes" });
  await text.fill("Introduction éèêàçœ\n• **Mobilier**");
  await saved(page);
  await text.press("Control+a");
  await text.press("Control+c");
  await text.press("End");
  await text.press("Enter");
  await text.press("Control+v");
  await expect(text).toHaveValue(
    "Introduction éèêàçœ\n• **Mobilier**\nIntroduction éèêàçœ\n• **Mobilier**",
  );
  await text.fill("Introduction éèêàçœ\n• **Mobilier**");
  await saved(page);
  await page.locator(".page-thumbnail").nth(1).click();
  await expect(text).toHaveValue("");
  await text.fill("Deuxième discours");
  await saved(page);
  await page.locator(".page-thumbnail").first().click();
  await expect(text).toHaveValue("Introduction éèêàçœ\n• **Mobilier**");
  await page.getByRole("button", { name: "Fermer les notes" }).click();
  await expect(text).toHaveCount(0);
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await expect(text).toHaveValue("Introduction éèêàçœ\n• **Mobilier**");
  await page.reload();
  await saved(page);
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await expect(text).toHaveValue("Introduction éèêàçœ\n• **Mobilier**");
  await page.getByRole("button", { name: "Fichier", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("menuitem", { name: "Sauvegarder mon projet", exact: true })
    .click();
  const file = await (await download).path();
  const zip = await JSZip.loadAsync(await fs.readFile(file));
  const json = Object.values(zip.files).find((f) => f.name.endsWith(".json"));
  const config = JSON.parse(await json.async("string"));
  expect(config.pages[0].notes).toContain("Introduction");
  await text.fill("Remplacé");
  await saved(page);
  await page.getByTestId("zip-input").setInputFiles(file);
  await page.getByRole("button", { name: "Confirmer", exact: true }).click();
  await saved(page);
  await expect(text).toHaveValue("Introduction éèêàçœ\n• **Mobilier**");
  await page.getByRole("button", { name: "Présentation", exact: true }).click();
  await expect(
    page.getByText("Introduction éèêàçœ", { exact: false }),
  ).toHaveCount(0);
});
test("vue Présentateur : fenêtre publique sans notes, navigation synchronisée et fermeture", async ({
  page,
}) => {
  await page.goto("/");
  await saved(page);
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await page
    .getByLabel("Texte des notes")
    .fill("CONFIDENTIEL discours de la première page");
  await saved(page);
  const popup = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Vue Présentateur", exact: true })
    .click();
  const publicPage = await popup;
  await expect(
    page.getByRole("complementary", { name: "Notes privées" }),
  ).toContainText("CONFIDENTIEL");
  await expect(publicPage.locator("body")).not.toContainText("CONFIDENTIEL");
  await expect(publicPage.locator(".slide-info")).toContainText(
    "Une nouvelle perspective",
  );
  await page
    .getByRole("button", { name: "Page suivante", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Notes privées" }),
  ).toContainText("Aucune note");
  await expect(publicPage.locator(".toolbar nav")).toContainText("02");
  await publicPage.locator("body").click({ position: { x: 1, y: 1 } });
  await publicPage.keyboard.press("ArrowLeft");
  await expect(
    page.getByRole("complementary", { name: "Notes privées" }),
  ).toContainText("CONFIDENTIEL");
  await page.getByRole("button", { name: "Pause du chronomètre" }).click();
  await expect(
    page.getByRole("button", { name: "Reprendre le chronomètre" }),
  ).toBeVisible();
  await publicPage.close();
  await expect(page.getByRole("alert")).toContainText("fermée");
  await page
    .getByRole("button", { name: "Revenir à l’éditeur", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Notes", exact: true }),
  ).toBeVisible();
});
test("fenêtre bloquée : repli explicite et notes privées hors du lecteur", async ({
  page,
}) => {
  await page.goto("/");
  await saved(page);
  await page.evaluate(() => (window.open = () => null));
  await page
    .getByRole("button", { name: "Vue Présentateur", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "bloquée" }),
  ).toBeVisible();
  await expect(page.locator(".stage .presenter-private")).toHaveCount(0);
  await expect(
    page.getByRole("complementary", { name: "Notes privées" }),
  ).toBeVisible();
});
test("notes suivent les identifiants : duplication, déplacement, suppression et Undo/Redo", async ({
  page,
}) => {
  await page.goto("/");
  await saved(page);
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  const notes = page.getByLabel("Texte des notes");
  await notes.fill("Notes à conserver");
  await saved(page);
  await page.locator(".page-thumbnail").first().click({ button: "right" });
  await page.getByRole("button", { name: "Dupliquer", exact: true }).click();
  await saved(page);
  await expect(notes).toHaveValue("Notes à conserver");
  const source = page.locator(".timeline-card").nth(1),
    target = page.locator(".timeline-card").last(),
    box = await target.boundingBox();
  await source.dragTo(target, { targetPosition: { x: box.width - 4, y: 30 } });
  await saved(page);
  await expect(notes).toHaveValue("Notes à conserver");
  await page
    .locator('.page-thumbnail[aria-current="true"]')
    .click({ button: "right" });
  await page.getByRole("button", { name: "Supprimer", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmer", exact: true })
    .click();
  await saved(page);
  await expect(page.locator(".page-thumbnail")).toHaveCount(3);
  await page.getByRole("button", { name: "↶ Annuler", exact: true }).click();
  await saved(page);
  await expect(page.locator(".page-thumbnail")).toHaveCount(4);
  await page.locator(".page-thumbnail").last().click();
  await expect(notes).toHaveValue("Notes à conserver");
  await page.getByRole("button", { name: "↷ Rétablir", exact: true }).click();
  await saved(page);
  await expect(page.locator(".page-thumbnail")).toHaveCount(3);
});
test("présentateur : états et transition MP4 restent pilotés par le lecteur public unique", async ({
  page,
}) => {
  await page.goto("/");
  await saved(page);
  await page.locator(".page-thumbnail").nth(1).click();
  await page.getByRole("button", { name: "+ Bouton", exact: true }).click();
  await page
    .getByLabel("Nom du bouton", { exact: true })
    .fill("Changer le décor");
  await page.getByLabel("Type d’action", { exact: true }).selectOption("state");
  await page
    .getByRole("button", { name: "+ Ajouter un état", exact: true })
    .click();
  await page
    .locator(".state-card")
    .last()
    .getByRole("textbox")
    .fill("Océan affiché");
  await page
    .getByLabel("Arrière-plan de l’état Océan affiché", { exact: true })
    .selectOption({ label: "Variante : Océan" });
  await page
    .getByLabel("État à activer", { exact: true })
    .selectOption({ label: "Océan affiché" });
  await saved(page);
  const wait = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Vue Présentateur", exact: true })
    .click();
  const audience = await wait;
  const before = await audience
    .locator(".slide-background")
    .getAttribute("src");
  await audience
    .getByRole("button", { name: "Changer le décor", exact: true })
    .click();
  await expect(
    audience.locator(".slide-background:not(.visual-pending-background)"),
  ).not.toHaveAttribute("src", before);
  const src = await audience.locator(".slide-background").getAttribute("src");
  await expect(
    page.locator(
      '[aria-label="Aperçu privé de la diapositive actuelle"] .slide-background',
    ),
  ).toHaveAttribute("src", src);
  await page
    .getByRole("button", { name: "Page précédente", exact: true })
    .click();
  await expect(audience.locator(".toolbar nav")).toContainText("01");
  await page
    .getByRole("button", { name: "Page suivante", exact: true })
    .click();
  await expect(audience.locator(".transition-video")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Page suivante", exact: true }),
  ).toBeDisabled();
  await expect(audience.locator(".transition-video")).toHaveCount(0, {
    timeout: 15000,
  });
  await expect(audience.locator(".toolbar nav")).toContainText("02");
  await expect(
    page.getByRole("navigation", { name: "Commandes privées" }),
  ).toContainText("Page 2 / 3");
  await audience
    .getByRole("button", {
      name: "Activer ou quitter le plein écran",
      exact: true,
    })
    .click();
  await expect
    .poll(() => audience.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await expect(audience.locator(".stage")).not.toContainText("Notes");
});
test("ancien projet sans notes, métadonnées, redimensionnement et Undo texte natif", async ({
  page,
}) => {
  await page.goto("/");
  await saved(page);
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        const r = indexedDB.open("presentation-studio", 1);
        r.onsuccess = () => {
          const db = r.result,
            t = db.transaction("documents", "readwrite"),
            store = t.objectStore("documents"),
            get = store.get("current");
          get.onsuccess = () => {
            const d = get.result;
            d.version = 23;
            d.privateMetadata = { conserver: true };
            for (const p of d.pages) delete p.notes;
            store.put(d, "current");
          };
          t.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      }),
  );
  await page.reload();
  await saved(page);
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  const notes = page.getByLabel("Texte des notes");
  await expect(notes).toHaveValue("");
  await notes.pressSequentially("Un discours");
  await notes.press("Control+z");
  await expect(notes).not.toHaveValue("Un discours");
  await notes.press("Control+Shift+z");
  await expect(notes).toHaveValue("Un discours");
  await expect(page.locator(".layer-list li")).toHaveCount(0);
  const resize = page.getByRole("separator", { name: "Hauteur des notes" }),
    before = Number(await resize.getAttribute("aria-valuenow"));
  await resize.focus();
  await resize.press("ArrowUp");
  await expect(resize).toHaveAttribute("aria-valuenow", String(before + 10));
  await notes.fill("Discours");
  await notes.press("Control+a");
  await page.getByRole("button", { name: "Gras dans les notes" }).click();
  await expect(notes).toHaveValue("**Discours**");
  await page.getByRole("button", { name: "Puce dans les notes" }).click();
  await expect(notes).toHaveValue("**Discours**• ");
  await notes.fill("Préservé");
  await saved(page);
  await page.reload();
  await saved(page);
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await expect(notes).toHaveValue("Préservé");
  const metadata = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const r = indexedDB.open("presentation-studio", 1);
        r.onsuccess = () => {
          const t = r.result.transaction("documents"),
            g = t.objectStore("documents").get("current");
          g.onsuccess = () => resolve(g.result.privateMetadata);
          t.oncomplete = () => r.result.close();
        };
      }),
  );
  expect(metadata).toEqual({ conserver: true });
});
