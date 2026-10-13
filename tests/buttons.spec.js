import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';
import JSZip from 'jszip';

const saved = page => expect(page.locator('.save-status')).toHaveText('✓ Sauvegardé dans ce navigateur');
const image = path.resolve('public/slides/sunset.png');
const mediaInput = page => page.getByTestId('media-input');
const interactive = (page, name) => page.locator('.interactive-button-layer').getByRole('button', { name, exact: true });

async function start(page, index = 1) {
  await page.goto('/');
  await expect(page.locator('.page-thumbnail')).toHaveCount(3);
  await page.locator('.page-thumbnail').nth(index).click();
  await saved(page);
}

async function snapshot(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('presentation-studio', 1);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('documents', 'readonly');
      const get = transaction.objectStore('documents').get('current');
      get.onsuccess = () => resolve(get.result);
      get.onerror = () => reject(get.error);
      transaction.oncomplete = () => db.close();
    };
    request.onerror = () => reject(request.error);
  }));
}

async function addButton(page, name = 'Noyer') {
  await page.getByRole('button', { name: '+ Ajouter un bouton', exact: true }).click();
  await page.getByLabel('Nom du bouton', { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Importer / remplacer l’image du bouton', exact: true }).click();
  await mediaInput(page).setInputFiles(image);
  await expect(page.getByAltText('Aperçu de l’image du bouton')).toBeVisible();
  await page.getByLabel('Arrière-plan au clic', { exact: true }).selectOption({ label: 'Variante : Océan' });
  await saved(page);
}

test('bouton : ajout, glisser-déposer, poignée de taille, aperçu, défaut, indicateur et sauvegarde', async ({ page }) => {
  await start(page);
  await addButton(page);
  const before = (await snapshot(page)).pages[1].buttons[0];
  await page.locator('.editor-preview').scrollIntoViewIfNeeded();
  const stage = await page.locator('.editor-preview').boundingBox();
  let box = await interactive(page, 'Noyer').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + stage.width * .18, box.y + box.height / 2 - stage.height * .2, { steps: 8 });
  await page.mouse.up();
  await saved(page);
  const moved = (await snapshot(page)).pages[1].buttons[0];
  expect(moved.x - before.x).toBeCloseTo(.18, 2);
  expect(moved.y - before.y).toBeCloseTo(-.2, 2);
  const handle = await page.getByRole('button', { name: 'Redimensionner le bouton Noyer', exact: true }).boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2 + stage.width * .1, handle.y + handle.height / 2 + stage.height * .08, { steps: 8 });
  await page.mouse.up();
  await saved(page);
  const resized = (await snapshot(page)).pages[1].buttons[0];
  expect(resized.width - moved.width).toBeCloseTo(.1, 2);
  expect(resized.height - moved.height).toBeCloseTo(.08, 2);
  await page.getByLabel('Arrière-plan affiché par défaut', { exact: true }).selectOption({ label: 'Variante : Crépuscule' });
  const defaultSource = await page.locator('.editor-preview .slide-background').getAttribute('src');
  await page.getByRole('button', { name: 'Tester les interactions', exact: true }).click();
  await interactive(page, 'Noyer').click();
  await expect(page.locator('.editor-preview .slide-background')).not.toHaveAttribute('src', defaultSource);
  await expect(page.locator('.interactive-button-frame')).toHaveClass(/is-active/);
  await page.getByLabel('Afficher un indicateur sur le bouton actif').uncheck();
  await expect(page.locator('.interactive-button-frame')).not.toHaveClass(/is-active/);
  await saved(page);
  await page.reload();
  await page.locator('.page-thumbnail').nth(1).click();
  const restored = (await snapshot(page)).pages[1];
  expect(restored.buttons[0]).toEqual(resized);
  expect(restored.defaultBackground.kind).toBe('variant');
  expect(restored.showActiveButton).toBe(false);
  await expect(interactive(page, 'Noyer')).toBeVisible();
  await expect(page.getByLabel('Arrière-plan affiché par défaut')).toHaveValue(`variant:${restored.defaultBackground.variantId}`);
});

test('lecteur : clic et Espace sur un bouton ne naviguent pas ; proportions en plein écran et sur mobile', async ({ page }) => {
  await start(page, 0);
  await page.getByRole('button', { name: '+ Ajouter un bouton', exact: true }).click();
  await page.getByLabel('Nom du bouton').fill('Changer le décor');
  await page.getByRole('button', { name: 'Importer un arrière-plan pour ce bouton', exact: true }).click();
  await mediaInput(page).setInputFiles(image);
  await page.getByRole('button', { name: 'Dupliquer le bouton', exact: true }).click();
  await page.getByLabel('Nom du bouton').fill('Autre décor');
  await page.getByLabel('Position horizontale du bouton (%)').fill('60');
  await saved(page);
  await page.getByRole('button', { name: 'Présentation', exact: true }).click();
  const firstSource = await page.locator('.slide-background').getAttribute('src');
  await interactive(page, 'Changer le décor').click();
  await expect(page.locator('.slide-background')).not.toHaveAttribute('src', firstSource);
  await expect(interactive(page, 'Autre décor')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.locator('.slide-info')).toHaveText('Une nouvelle perspective');
  await expect(page.locator('.transition-video')).toHaveCount(0);
  async function proportions() {
    return page.locator('.interactive-button-frame').first().evaluate(element => {
      const button = element.getBoundingClientRect();
      const slide = element.closest('.slide').getBoundingClientRect();
      return [(button.x - slide.x) / slide.width, (button.y - slide.y) / slide.height, button.width / slide.width, button.height / slide.height];
    });
  }
  const initial = await proportions();
  await page.keyboard.press('f');
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  const full = await proportions();
  full.forEach((value, index) => expect(value).toBeCloseTo(initial[index], 3));
  await page.keyboard.press('f');
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await proportions();
  mobile.forEach((value, index) => expect(value).toBeCloseTo(initial[index], 3));
  await page.locator('h1').click();
  await page.keyboard.press('Space');
  await expect(page.locator('.transition-video')).toBeVisible();
  await expect(interactive(page, 'Changer le décor')).toBeDisabled();
  await expect(page.locator('.slide-info')).toHaveText('Changez d’atmosphère');
});

test('ZIP : inclut les images des boutons et les arrière-plans, restaure les associations et les coordonnées', async ({ page, browser }, testInfo) => {
  await start(page);
  await addButton(page);
  // L’import est asynchrone : l’ancien statut « Sauvegardé » peut rester
  // affiché pendant la validation, avant que le nouveau média soit appliqué.
  await page.evaluate(() => {
    const estimate = navigator.storage.estimate.bind(navigator.storage);
    navigator.storage.estimate = async () => {
      await new Promise(resolve => setTimeout(resolve, 250));
      return estimate();
    };
  });
  await page.getByRole('button', { name: 'Importer un arrière-plan pour ce bouton', exact: true }).click();
  await mediaInput(page).setInputFiles(image);
  await expect(page.getByLabel('Arrière-plan au clic', { exact: true })).toHaveValue(/^media:/);
  await page.getByRole('button', { name: 'Importer l’arrière-plan par défaut', exact: true }).click();
  await mediaInput(page).setInputFiles(path.resolve('public/slides/ocean.png'));
  await expect(page.getByLabel('Arrière-plan affiché par défaut', { exact: true })).toHaveValue(/^media:/);
  await saved(page);
  const original = await snapshot(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Sauvegarder mon projet' }).click();
  const archivePath = testInfo.outputPath('boutons.zip');
  await (await downloadPromise).saveAs(archivePath);
  const zip = await JSZip.loadAsync(await fs.readFile(archivePath), { checkCRC32: true });
  const config = JSON.parse(await zip.file('presentation.json').async('string'));
  expect(config.version).toBe(7);
  expect(config.pages[1].buttons).toEqual(original.pages[1].buttons);
  expect(config.media).toHaveLength(7);
  for (const media of config.media) expect(zip.file(media.path)).not.toBeNull();
  const context = await browser.newContext();
  const other = await context.newPage();
  await other.goto('http://127.0.0.1:5180');
  await expect(other.locator('.page-thumbnail')).toHaveCount(3);
  await saved(other);
  await other.getByTestId('zip-input').setInputFiles(archivePath);
  await other.getByRole('dialog').getByRole('button', { name: 'Confirmer', exact: true }).click();
  await saved(other);
  await other.locator('.page-thumbnail').nth(1).click();
  await expect(interactive(other, 'Noyer')).toBeVisible();
  const imported = await snapshot(other);
  expect(imported.pages).toEqual(original.pages);
  await other.getByRole('button', { name: 'Tester les interactions' }).click();
  const source = await other.locator('.slide-background').getAttribute('src');
  await interactive(other, 'Noyer').click();
  await expect(other.locator('.slide-background')).not.toHaveAttribute('src', source);
  await other.reload();
  await other.locator('.page-thumbnail').nth(1).click();
  await expect(interactive(other, 'Noyer')).toBeVisible();
  await context.close();
});

test('duplication de page indépendante, suppression de variante et anciennes sauvegardes ZIP', async ({ page }, testInfo) => {
  await start(page);
  await addButton(page);
  await page.getByLabel('Arrière-plan affiché par défaut').selectOption({ label: 'Variante : Océan' });
  await page.getByRole('button', { name: 'Dupliquer la page', exact: true }).click();
  await saved(page);
  const document = await snapshot(page);
  const original = document.pages[1];
  const copy = document.pages[2];
  expect(copy.buttons[0].id).not.toBe(original.buttons[0].id);
  expect(copy.buttons[0].target.variantId).toBe(copy.variants[1].id);
  expect(copy.defaultBackground.variantId).toBe(copy.variants[1].id);
  await page.getByRole('button', { name: 'Supprimer la variante Océan', exact: true }).click();
  await saved(page);
  const repaired = (await snapshot(page)).pages[2];
  expect(repaired.buttons[0].target).toBeNull();
  expect(repaired.defaultBackground).toEqual({ kind: 'main' });
  expect((await snapshot(page)).pages[1].buttons[0].target).toEqual(original.buttons[0].target);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Sauvegarder mon projet' }).click();
  const archivePath = testInfo.outputPath('legacy.zip');
  await (await downloadPromise).saveAs(archivePath);
  const zip = await JSZip.loadAsync(await fs.readFile(archivePath));
  const config = JSON.parse(await zip.file('presentation.json').async('string'));
  config.version = 1;
  config.pages.forEach(page => { delete page.buttons; delete page.defaultBackground; delete page.showActiveButton; });
  zip.file('presentation.json', JSON.stringify(config));
  await page.getByTestId('zip-input').setInputFiles({ name: 'ancienne-presentation.zip', mimeType: 'application/zip', buffer: await zip.generateAsync({ type: 'nodebuffer' }) });
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmer', exact: true }).click();
  await saved(page);
  const legacy = await snapshot(page);
  expect(legacy.version).toBe(7);
  expect(legacy.pages).toHaveLength(4);
  expect(legacy.pages.every(page => page.buttons.length === 0)).toBe(true);
});

test('positions hors cadre : ZIP rejeté sans modifier la présentation', async ({ page }, testInfo) => {
  await start(page);
  await addButton(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Sauvegarder mon projet' }).click();
  const archivePath = testInfo.outputPath('invalid.zip');
  await (await downloadPromise).saveAs(archivePath);
  const zip = await JSZip.loadAsync(await fs.readFile(archivePath));
  const config = JSON.parse(await zip.file('presentation.json').async('string'));
  config.pages[1].buttons[0].x = 2;
  zip.file('presentation.json', JSON.stringify(config));
  await page.getByTestId('zip-input').setInputFiles({ name: 'invalid.zip', mimeType: 'application/zip', buffer: await zip.generateAsync({ type: 'nodebuffer' }) });
  await expect(page.locator('.editor-message')).toContainText('dimensions d’un bouton sont invalides');
  expect((await snapshot(page)).pages[1].buttons[0].x).toBe(.1);
});

test('ancienne sauvegarde IndexedDB : migration sans perdre les pages, médias, variantes et transitions', async ({ page }) => {
  await start(page);
  await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('presentation-studio', 1);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('documents', 'readwrite');
      const store = transaction.objectStore('documents');
      const get = store.get('current');
      get.onsuccess = () => {
        const document = get.result;
        document.version = 1;
        document.pages.forEach(page => { delete page.buttons; delete page.defaultBackground; delete page.showActiveButton; });
        store.put(document, 'current');
      };
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
    };
  }));
  await page.reload();
  await expect(page.locator('.page-thumbnail')).toHaveCount(3);
  await saved(page);
  const migrated = await snapshot(page);
  expect(migrated.version).toBe(7);
  expect(migrated.media).toHaveLength(4);
  expect(migrated.pages[0].transitionId).not.toBeNull();
  expect(migrated.pages[1].variants).toHaveLength(3);
  expect(migrated.pages.every(page => page.buttons.length === 0 && page.showActiveButton === true)).toBe(true);
});
