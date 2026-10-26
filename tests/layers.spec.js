import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';
import JSZip from 'jszip';

const saved = page => expect(page.locator('.save-status')).toHaveText('✓ Sauvegardé dans ce navigateur');
const frame = (page, id) => page.locator(`[data-layer-id="${id}"]`);
async function record(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('presentation-studio', 1);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('documents', 'readonly');
      const get = tx.objectStore('documents').get('current');
      get.onsuccess = () => resolve(get.result);
      tx.oncomplete = () => db.close();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  }));
}
async function start(page) {
  await page.goto('/');
  await expect(page.locator('.page-thumbnail')).toHaveCount(3);
  await saved(page);
}
async function add(page, type) {
  await page.getByRole('toolbar').getByRole('button', { name: `+ ${type}`, exact: true }).click();
  await saved(page);
  const document = await record(page);
  const id = document.pages[0].layerOrder.at(-1);
  await expect(frame(page, id)).toHaveClass(/is-selected/);
  return id;
}
async function drag(page, locator, dx, dy) {
  const box = await locator.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 6 });
  await page.mouse.up();
  await saved(page);
}

test('calques : manipulation visuelle, rotation, opacité, verrouillage, ordre et annuler/rétablir', async ({ page }, testInfo) => {
  await start(page);
  const id = await add(page, 'Rectangle');
  const initial = (await record(page)).pages[0].layers[0];
  const stage = await page.locator('.editor-preview').boundingBox();
  await drag(page, frame(page, id).locator('.layer-content'), stage.width * .1, stage.height * .1);
  const moved = (await record(page)).pages[0].layers[0];
  expect(moved.x - initial.x).toBeCloseTo(.1, 2);
  expect(moved.y - initial.y).toBeCloseTo(.1, 2);
  await drag(page, page.getByRole('button', { name: `Redimensionner le calque ${moved.name}`, exact: true }), stage.width * .05, stage.height * .05);
  const resized = (await record(page)).pages[0].layers[0];
  expect(resized.width - moved.width).toBeCloseTo(.05, 2);
  expect(resized.height - moved.height).toBeCloseTo(.05, 2);
  await page.getByLabel('Rotation du calque', { exact: true }).fill('35');
  await page.getByLabel('Opacité du calque', { exact: true }).fill('60');
  await page.getByLabel('Nom du calque', { exact: true }).fill('Panneau');
  await expect(frame(page, id)).toHaveCSS('transform', /matrix/);
  await expect(frame(page, id).locator('.layer-content')).toHaveCSS('opacity', '0.6');
  const beforeRotation = Number(await page.getByLabel('Rotation du calque', { exact: true }).inputValue());
  await drag(page, page.getByRole('button', { name: 'Faire pivoter Panneau', exact: true }), 40, 30);
  expect(Number(await page.getByLabel('Rotation du calque', { exact: true }).inputValue())).not.toBe(beforeRotation);
  await page.getByLabel('Verrouiller le déplacement', { exact: true }).check();
  await saved(page);
  const locked = (await record(page)).pages[0].layers[0];
  await drag(page, frame(page, id).locator('.layer-content'), 50, 30);
  expect((await record(page)).pages[0].layers[0]).toEqual(locked);
  await expect(page.getByLabel('X du calque (%)', { exact: true })).toBeDisabled();
  await expect(frame(page, id).locator('.layer-handle')).toHaveCount(0);
  await page.getByRole('button', { name: 'Masquer le calque Panneau', exact: true }).click();
  await expect(frame(page, id)).toHaveCount(0);
  await page.getByRole('button', { name: 'Afficher le calque Panneau', exact: true }).click();
  await expect(frame(page, id)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dupliquer le calque', exact: true })).toBeDisabled();
  await page.getByLabel('Verrouiller le déplacement', { exact: true }).uncheck();
  await saved(page);
  await page.getByRole('button', { name: 'Dupliquer le calque', exact: true }).click();
  await saved(page);
  const copy = (await record(page)).pages[0].layers[1];
  expect(copy.id).not.toBe(id);
  await page.getByRole('button', { name: 'Arrière-plan', exact: true }).click();
  await saved(page);
  expect((await record(page)).pages[0].layerOrder).toEqual([copy.id, id]);
  await page.getByRole('button', { name: 'Supprimer le calque', exact: true }).click();
  await expect(frame(page, copy.id)).toHaveCount(0);
  await page.getByRole('button', { name: '↶ Annuler', exact: true }).click();
  await expect(frame(page, copy.id)).toBeVisible();
  await page.getByRole('button', { name: '↷ Rétablir', exact: true }).click();
  await expect(frame(page, copy.id)).toHaveCount(0);
  await add(page, 'Texte');
  await page.getByLabel('Contenu du texte', { exact: true }).fill('Design industriel\nUn objet, plusieurs possibilités.');
  await page.getByLabel('Nom du calque', { exact: true }).fill('Titre du projet');
  await saved(page);
  await page.screenshot({ path: testInfo.outputPath('editeur-calques.png'), fullPage: true });
});

test('images transparentes, médias partagés, texte proportionnel et calques dans le lecteur', async ({ page }) => {
  await start(page);
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 100;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ff0000'; ctx.fillRect(25, 25, 50, 50);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.getByRole('toolbar').getByRole('button', { name: '+ Image', exact: true }).click();
  await page.getByTestId('media-input').setInputFiles({ name: 'transparent.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64') });
  await expect(page.getByLabel('Nom du calque', { exact: true })).toHaveValue('transparent.png');
  await saved(page);
  const original = await record(page);
  const image = original.pages[0].layers[0];
  await expect(frame(page, image.id).locator('img')).toBeVisible();
  const alpha = await frame(page, image.id).locator('img').evaluate(img => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 100;
    const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, 100, 100);
    return ctx.getImageData(0, 0, 1, 1).data[3];
  });
  expect(alpha).toBe(0);
  const source = await frame(page, image.id).locator('img').getAttribute('src');
  await page.getByRole('button', { name: 'Dupliquer le calque', exact: true }).click();
  await saved(page);
  expect((await record(page)).media).toHaveLength(original.media.length);
  expect((await record(page)).pages[0].layers[1].imageId).toBe(image.imageId);
  await expect(frame(page, image.id).locator('img')).toHaveAttribute('src', source);
  const textId = await add(page, 'Texte');
  await page.getByLabel('Contenu du texte', { exact: true }).fill('Texte conservé');
  await page.getByLabel('Rotation du calque', { exact: true }).fill('15');
  await saved(page);
  const ratio = () => frame(page, textId).locator('.layer-text-content').evaluate(element => parseFloat(getComputedStyle(element).fontSize) * Number(element.closest('.text-viewport').dataset.textScale) / element.closest('.slide').getBoundingClientRect().width);
  const editorRatio = await ratio();
  await page.getByRole('button', { name: 'Présentation', exact: true }).click();
  await expect(frame(page, textId)).toHaveText('Texte conservé');
  await expect.poll(ratio).toBeCloseTo(editorRatio, 4);
  await expect(frame(page, textId).locator('.layer-handle')).toHaveCount(0);
  await page.keyboard.press('f');
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await expect.poll(ratio).toBeCloseTo(editorRatio, 4);
  await page.keyboard.press('f');
  await page.getByRole('button', { name: 'Éditeur', exact: true }).click();
  const beforeReload = await record(page);
  await page.reload();
  await saved(page);
  expect((await record(page)).pages[0].layers).toEqual(beforeReload.pages[0].layers);
  await expect(frame(page, textId)).toHaveText('Texte conservé');
});

test('ZIP v3 : tous les calques, ordre et boutons ; rejet atomique d’un calque invalide', async ({ page, browser }, testInfo) => {
  await start(page);
  await page.getByRole('toolbar').getByRole('button', { name: '+ Image', exact: true }).click();
  await page.getByTestId('media-input').setInputFiles(path.resolve('public/slides/sunset.png'));
  await expect(page.getByLabel('Nom du calque', { exact: true })).toHaveValue('sunset.png');
  await saved(page);
  for (const type of ['Texte', 'Rectangle', 'Cercle', 'Ligne', 'Bouton']) await add(page, type);
  await page.getByLabel('Nom du calque', { exact: true }).fill('Changer le décor');
  await page.getByLabel('Arrière-plan au clic', { exact: true }).selectOption({ label: 'Image principale de la page' });
  await page.getByLabel('Rotation du calque', { exact: true }).fill('28');
  await page.getByLabel('Opacité du calque', { exact: true }).fill('75');
  await page.getByRole('button', { name: 'Arrière-plan', exact: true }).click();
  await saved(page);
  const original = await record(page);
  const download = page.waitForEvent('download');
  await page.getByRole('button', {name:'Fichier',exact:true}).click(); await page.getByRole('menuitem', {name:'Sauvegarder mon projet',exact:true}).click();
  const file = testInfo.outputPath('calques.zip');
  await (await download).saveAs(file);
  const context = await browser.newContext();
  const other = await context.newPage();
  await start(other);
  await other.getByTestId('zip-input').setInputFiles(file);
  await other.getByRole('dialog').getByRole('button', { name: 'Confirmer', exact: true }).click();
  await saved(other);
  expect((await record(other)).pages).toEqual(original.pages);
  await other.reload();
  await saved(other);
  expect((await record(other)).pages).toEqual(original.pages);
  await other.getByRole('button', { name: 'Tester les interactions', exact: true }).click();
  await other.locator('.layer-button').click();
  await expect(other.locator('.layer-button')).toHaveAttribute('aria-pressed', 'true');
  const zip = await JSZip.loadAsync(await fs.readFile(file));
  const config = JSON.parse(await zip.file('presentation.json').async('string'));
  config.pages[0].layers[0].opacity = 5;
  zip.file('presentation.json', JSON.stringify(config));
  const invalid = testInfo.outputPath('calque-invalide.zip');
  await fs.writeFile(invalid, await zip.generateAsync({ type: 'nodebuffer' }));
  await other.getByTestId('zip-input').setInputFiles(invalid);
  await expect(other.locator('.editor-message')).toContainText('calques est invalide');
  expect((await record(other)).pages).toEqual(original.pages);
  await expect(other.getByRole('dialog')).toHaveCount(0);
  await context.close();
});

test('migration v2 non destructive : boutons, médias, métadonnées et ordre conservés', async ({ page }) => {
  await start(page);
  await add(page, 'Bouton');
  await page.getByLabel('Nom du bouton', { exact: true }).fill('Ancien bouton');
  await page.getByRole('button', { name: 'Importer / remplacer l’image du bouton', exact: true }).click();
  await page.getByTestId('media-input').setInputFiles(path.resolve('public/slides/sunset.png'));
  await expect(page.getByAltText('Aperçu de l’image du bouton')).toBeVisible();
  await saved(page);
  const original = await record(page);
  await page.evaluate(() => new Promise(resolve => {
    const request = indexedDB.open('presentation-studio', 1);
    request.onsuccess = () => {
      const db = request.result; const tx = db.transaction('documents', 'readwrite'); const store = tx.objectStore('documents');
      store.get('current').onsuccess = event => {
        const document = event.target.result; document.version = 2; document.privateMetadata = { client: 'Projet conservé' };
        for (const page of document.pages) {
          delete page.layers; delete page.layerOrder;
          for (const button of page.buttons) for (const key of ['rotation', 'opacity', 'visible', 'locked']) delete button[key];
        }
        store.put(document, 'current');
      };
      tx.oncomplete = () => { db.close(); resolve(); };
    };
  }));
  await page.reload();
  await saved(page);
  const migrated = await record(page);
  expect(migrated.version).toBe(36);
  expect(migrated.privateMetadata).toEqual({ client: 'Projet conservé' });
  expect(migrated.media.map(item => [item.id, item.blob.size])).toEqual(original.media.map(item => [item.id, item.blob.size]));
  const button = migrated.pages[0].buttons[0];
  expect(button).toEqual(original.pages[0].buttons[0]);
  expect(migrated.pages[0].layerOrder).toEqual([button.id]);
  await expect(frame(page, button.id)).toBeVisible();
});

test('ZIP v2 importable ; données v3 illisibles conservées sans réinitialisation', async ({ page }, testInfo) => {
  await start(page);
  await add(page, 'Bouton');
  await page.getByLabel('Arrière-plan au clic', { exact: true }).selectOption({ label: 'Image principale de la page' });
  await saved(page);
  const original = await record(page);
  const download = page.waitForEvent('download');
  await page.getByRole('button', {name:'Fichier',exact:true}).click(); await page.getByRole('menuitem', {name:'Sauvegarder mon projet',exact:true}).click();
  const file = testInfo.outputPath('v2.zip');
  await (await download).saveAs(file);
  const zip = await JSZip.loadAsync(await fs.readFile(file));
  const config = JSON.parse(await zip.file('presentation.json').async('string'));
  config.version = 2;
  for (const page of config.pages) {
    delete page.layers; delete page.layerOrder;
    for (const button of page.buttons) for (const key of ['rotation', 'opacity', 'visible', 'locked']) delete button[key];
  }
  zip.file('presentation.json', JSON.stringify(config));
  await fs.writeFile(file, await zip.generateAsync({ type: 'nodebuffer' }));
  await page.getByTestId('zip-input').setInputFiles(file);
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmer', exact: true }).click();
  await saved(page);
  expect((await record(page)).pages).toEqual(original.pages);
  await page.evaluate(() => new Promise(resolve => {
    const request = indexedDB.open('presentation-studio', 1);
    request.onsuccess = () => {
      const db = request.result; const tx = db.transaction('documents', 'readwrite'); const store = tx.objectStore('documents');
      store.get('current').onsuccess = event => {
        const document = event.target.result;
        document.pages[0].layerOrder = ['reference-inconnue'];
        store.put(document, 'current');
      };
      tx.oncomplete = () => { db.close(); resolve(); };
    };
  }));
  const invalid = await record(page);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('calques est invalide');
  expect((await record(page)).pages).toEqual(invalid.pages);
  expect((await record(page)).media.map(item => [item.id, item.blob.size])).toEqual(invalid.media.map(item => [item.id, item.blob.size]));
});
