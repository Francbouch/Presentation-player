import { test, expect } from "@playwright/test";
import JSZip from "jszip";
import fs from "node:fs/promises";
const saved = (p) =>
  expect(p.locator(".save-status")).toContainText("Sauvegardé");
const content = (p) => p.getByLabel("Contenu du texte", { exact: true });
async function start(p) {
  await p.goto("/");
  await saved(p);
}
async function zipRoundtrip(p) {
  await p.getByRole("button", { name: "Fichier", exact: true }).click();
  const wait = p.waitForEvent("download");
  await p
    .getByRole("menuitem", { name: "Sauvegarder mon projet", exact: true })
    .click();
  const file = await (await wait).path();
  const zip = await JSZip.loadAsync(await fs.readFile(file));
  const config = JSON.parse(
    await zip.file("presentation.json").async("string"),
  );
  await p.getByTestId("zip-input").setInputFiles(file);
  await p
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmer", exact: true })
    .click();
  await saved(p);
  return config;
}
test("listes : paragraphes sélectionnés, Entrée, sortie, rendu, sauvegarde et ZIP", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "+ Texte", exact: true }).click();
  await content(page).fill(
    "Ouverture complète du caisson\nMécanisme compact\nAssemblage simplifié",
  );
  await content(page).press("Control+a");
  await page
    .getByRole("button", { name: "Liste à puces", exact: true })
    .click();
  await expect(page.locator(".editor-preview li")).toHaveCount(3);
  await expect(content(page)).not.toHaveValue(/•/);
  await content(page).press("Control+End");
  await content(page).press("Enter");
  await expect(page.locator(".editor-preview li")).toHaveCount(4);
  await content(page).press("Enter");
  await expect(page.locator(".editor-preview li")).toHaveCount(3);
  await content(page).pressSequentially("Conclusion");
  await expect(page.locator(".editor-preview li")).toHaveCount(3);
  await page
    .getByLabel("Adapter la hauteur au contenu", { exact: true })
    .check();
  await page.getByLabel("Taille du texte", { exact: true }).fill("40");
  await page.getByLabel("Retrait des puces", { exact: true }).fill("2");
  await saved(page);
  await page
    .getByLabel("Police du texte", { exact: true })
    .selectOption("georgia");
  await expect(page.locator(".editor-preview li").first()).toHaveCSS(
    "font-family",
    /Georgia/,
  );
  const config = await zipRoundtrip(page);
  expect(config.pages[0].layers[0].textList.bullets).toEqual([0, 1, 2]);
  await expect(page.locator(".editor-preview li")).toHaveCount(3);
  await page.reload();
  await saved(page);
  await expect(page.locator(".editor-preview li")).toHaveCount(3);
  await page.getByRole("button", { name: "Présentation", exact: true }).click();
  await expect(page.locator(".stage li")).toHaveCount(3);
});
test("liste partielle, retrait, duplication et saisie directe", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "+ Texte", exact: true }).click();
  await content(page).fill("Introduction\nUn point\nDeux points\nConclusion");
  await content(page).evaluate((el) => {
    el.focus();
    el.setSelectionRange(13, 31);
    el.dispatchEvent(new Event("select", { bubbles: true }));
  });
  await page
    .getByRole("button", { name: "Liste à puces", exact: true })
    .click();
  await expect(page.locator(".editor-preview li")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Liste à puces", exact: true })
    .click();
  await expect(page.locator(".editor-preview li")).toHaveCount(0);
  await content(page).press("Control+a");
  await page
    .getByRole("button", { name: "Liste à puces", exact: true })
    .click();
  await page.locator(".editor-preview .layer-text").dblclick();
  const inline = page.locator(".editor-preview [contenteditable]");
  await inline.press("Control+End");
  await inline.press("Enter");
  await inline.press("Enter");
  await inline.pressSequentially("Fin");
  await inline.press("Escape");
  await expect(page.locator(".editor-preview li")).toHaveCount(4);
  await expect(content(page)).toHaveValue(/Fin$/);
  await page
    .getByRole("button", { name: "Dupliquer le calque", exact: true })
    .click();
  await expect(page.locator(".editor-preview li")).toHaveCount(8);
  await page.locator(".layer-list li.selected .layer-select").click();
  await page.keyboard.press("Control+c");
  await page.locator(".page-thumbnail").nth(1).click();
  await page.keyboard.press("Control+v");
  await expect(page.locator(".editor-preview li")).toHaveCount(4);
  await saved(page);
});
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
test("noms texte : cinq mots, manuel définitif, réactivation, copies indépendantes et ZIP", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "+ Texte", exact: true }).click();
  await expect(page.getByLabel("Nom du calque", { exact: true })).toHaveValue(
    "Votre texte",
  );
  await content(page).fill(
    "Voici les principales\ncaractéristiques du nouveau lit cabinet",
  );
  await expect(page.getByLabel("Nom du calque", { exact: true })).toHaveValue(
    "Voici les principales caractéristiques du",
  );
  await page
    .getByLabel("Nom du calque", { exact: true })
    .fill("Titre personnel");
  await content(page).fill("Texte entièrement différent");
  await expect(page.getByLabel("Nom du calque", { exact: true })).toHaveValue(
    "Titre personnel",
  );
  await page
    .getByRole("button", { name: "Dupliquer le calque", exact: true })
    .click();
  await content(page).fill("Seconde copie");
  await expect(page.getByLabel("Nom du calque", { exact: true })).toHaveValue(
    "Titre personnel",
  );
  await page
    .getByRole("button", { name: "Réactiver le nom automatique", exact: true })
    .click();
  await expect(page.getByLabel("Nom du calque", { exact: true })).toHaveValue(
    "Seconde copie",
  );
  await page
    .getByRole("button", { name: "Dupliquer le calque", exact: true })
    .click();
  await content(page).fill("Élégance à Montréal, détails soignés partout");
  await expect(page.getByLabel("Nom du calque", { exact: true })).toHaveValue(
    "Élégance à Montréal, détails soignés",
  );
  let d = await record(page);
  expect(d.pages[0].layers.map((l) => l.name)).toEqual([
    "Titre personnel",
    "Seconde copie",
    "Élégance à Montréal, détails soignés",
  ]);
  expect(new Set(d.pages[0].layers.map((l) => l.id)).size).toBe(3);
  await content(page).fill("");
  await expect(page.getByLabel("Nom du calque", { exact: true })).toHaveValue(
    "Texte",
  );
  const zip = await zipRoundtrip(page);
  expect(zip.pages[0].layers.map((l) => l.nameMode)).toEqual([
    "manual",
    "auto",
    "auto",
  ]);
  await page.reload();
  await saved(page);
  expect((await record(page)).pages[0].layers).toEqual(zip.pages[0].layers);
});
test("bouton : texte principal, nom manuel, états et ancien nom inconnu conservé", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "+ Bouton", exact: true }).click();
  await content(page).fill("Ouvrir le lit");
  await expect(page.getByLabel("Nom du bouton", { exact: true })).toHaveValue(
    "Ouvrir le lit",
  );
  await content(page).fill("Fermer le lit");
  await expect(page.getByLabel("Nom du bouton", { exact: true })).toHaveValue(
    "Fermer le lit",
  );
  await page
    .getByLabel("Nom du bouton", { exact: true })
    .fill("Commande principale");
  await content(page).fill("Texte visible");
  await expect(page.getByLabel("Nom du bouton", { exact: true })).toHaveValue(
    "Commande principale",
  );
  await page
    .getByRole("button", { name: "+ Ajouter un état", exact: true })
    .click();
  await page.getByLabel("Type d’action", { exact: true }).selectOption("state");
  await page
    .getByLabel("État à activer", { exact: true })
    .selectOption({ label: "État 1" });
  const before = await record(page);
  await page
    .getByRole("button", { name: "Tester les interactions", exact: true })
    .click();
  await page
    .locator(".editor-preview")
    .getByRole("button", { name: "Commande principale", exact: true })
    .click();
  expect((await record(page)).pages[0].buttons[0].name).toBe(
    "Commande principale",
  );
  await page
    .getByRole("button", { name: "Revenir au mode édition", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Réactiver le nom automatique", exact: true })
    .click();
  await expect(page.getByLabel("Nom du bouton", { exact: true })).toHaveValue(
    "Texte visible",
  );
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        const r = indexedDB.open("presentation-studio", 1);
        r.onsuccess = () => {
          const db = r.result,
            t = db.transaction("documents", "readwrite"),
            store = t.objectStore("documents"),
            g = store.get("current");
          g.onsuccess = () => {
            const d = g.result;
            d.version = 24;
            delete d.pages[0].buttons[0].nameMode;
            d.pages[0].buttons[0].name = "Ancien nom à préserver";
            d.privateMetadata = { keep: true };
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
  await page
    .getByRole("button", {
      name: "Sélectionner le calque Ancien nom à préserver",
      exact: true,
    })
    .click();
  await content(page).fill("Nouveau texte");
  await expect(page.getByLabel("Nom du bouton", { exact: true })).toHaveValue(
    "Ancien nom à préserver",
  );
  expect((await record(page)).privateMetadata).toEqual({ keep: true });
});
test("modèle additif : anciens noms, ponctuation, listes invalides et métadonnées", async () => {
  const { automaticLayerName, namingPatch } = await import(
    "../src/layerNames.js"
  );
  const { emptyPage, createLayer, migrateDocument } = await import(
    "../src/document.js"
  );
  expect(
    automaticLayerName({
      type: "text",
      content: "• Éléments  à\n  Montréal, pour votre collection",
    }),
  ).toBe("Éléments à Montréal, pour votre");
  expect(automaticLayerName({ type: "text", content: "   " })).toBe("Texte");
  expect(namingPatch({ type: "text", nameMode: "auto" }, { name: "" })).toEqual(
    { name: "", nameMode: "manual" },
  );
  expect(
    automaticLayerName({
      type: "text",
      content: "« Présentation du mécanisme OEM fabriqué en Chine »",
    }),
  ).toBe("« Présentation du mécanisme OEM fabriqué");
  const layer = createLayer("text", 1);
  delete layer.nameMode;
  layer.name = "Nom historique";
  layer.content = "Texte différent";
  const page = { ...emptyPage(1), layers: [layer], layerOrder: [layer.id] };
  const old = {
    version: 24,
    pages: [page],
    media: [],
    transitions: [],
    custom: { conserver: true },
  };
  const migrated = migrateDocument(old);
  expect(migrated.pages[0].layers[0]).toEqual(layer);
  expect(migrated.custom).toEqual({ conserver: true });
  const invalid = structuredClone(migrated);
  invalid.pages[0].layers[0].textList = { bullets: [90], indent: 1.25 };
  expect(() => migrateDocument(invalid)).toThrow(/puces/);
});
test("listes : le retrait recalcule la hauteur automatique et fonctionne en mode Test", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "+ Texte", exact: true }).click();
  await content(page).fill(
    "Un mécanisme compact et élégant pour le mobilier contemporain. ".repeat(3),
  );
  await page.getByLabel("Taille du texte", { exact: true }).fill("40");
  await page
    .getByLabel("Adapter la hauteur au contenu", { exact: true })
    .check();
  await saved(page);
  await page
    .getByRole("button", { name: "Liste à puces", exact: true })
    .click();
  await saved(page);
  const body = page.locator(".editor-preview .layer-text");
  const before = (await body.boundingBox()).height;
  await page.getByLabel("Retrait des puces", { exact: true }).fill("4");
  await expect
    .poll(async () => (await body.boundingBox()).height)
    .toBeGreaterThan(before);
  await page.locator(".layer-list li.selected .layer-select").click();
  await page.keyboard.press("Control+z");
  await expect(
    page.getByLabel("Retrait des puces", { exact: true }),
  ).toHaveValue("1.25");
  await page.keyboard.press("Control+Shift+z");
  await expect(
    page.getByLabel("Retrait des puces", { exact: true }),
  ).toHaveValue("4");
  await page
    .getByRole("button", { name: "Tester les interactions", exact: true })
    .click();
  await expect(page.locator(".editor-preview li")).toHaveCount(1);
});
