import { test, expect, chromium } from '@playwright/test';
import JSZip from 'jszip';
import fs from 'node:fs/promises';
import path from 'node:path';

const saved = page => expect(page.locator('.save-status')).toHaveText('✓ Sauvegardé dans ce navigateur');
async function start(page) { await page.goto('/'); await expect(page.locator('.page-thumbnail')).toHaveCount(3); await saved(page); }
async function record(page, key = 'current') {
  return page.evaluate(key => new Promise((resolve, reject) => {
    const open = indexedDB.open('presentation-studio', 1);
    open.onsuccess = () => {
      const db = open.result, transaction = db.transaction('documents', 'readonly');
      const get = transaction.objectStore('documents').get(key);
      get.onsuccess = () => resolve(get.result);
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => reject(transaction.error);
    };
  }), key);
}
async function backup(page, testInfo) {
  const download = page.waitForEvent('download');
  await page.getByRole('button', {name:'Fichier',exact:true}).click(); await page.getByRole('menuitem', {name:'Sauvegarder mon projet',exact:true}).click();
  const file = testInfo.outputPath('projet.zip');
  await (await download).saveAs(file);
  return file;
}

test('Chrome/Chromium : projet et médias conservés après fermeture complète et nouveau lancement', async ({}, testInfo) => {
  const profile = testInfo.outputPath('chrome-profile');
  const options = { headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) };
  let context = await chromium.launchPersistentContext(profile, options);
  let page = await context.newPage();
  await page.goto('http://127.0.0.1:5180'); await expect(page.locator('.page-thumbnail')).toHaveCount(3);
  await page.getByLabel('Nom de la page', { exact: true }).fill('Mon vrai projet');
  await page.getByRole('button', { name: 'Importer / remplacer l’image', exact: true }).click();
  await page.getByTestId('media-input').setInputFiles(path.resolve('public/slides/sunset.png'));
  await expect(page.locator('.media-name').first()).toHaveText('sunset.png');
  await saved(page);
  const before = await record(page);
  await context.close();
  context = await chromium.launchPersistentContext(profile, options);
  page = await context.newPage();
  await page.goto('http://127.0.0.1:5180/?mise-a-jour=2');
  await expect(page.getByLabel('Nom de la page', { exact: true })).toHaveValue('Mon vrai projet');
  await saved(page);
  expect((await record(page)).pages).toEqual(before.pages);
  await expect(page.locator('.editor-preview .slide-background')).toBeVisible();
  await context.close();
});

test('version future ou données nulles : ne jamais les remplacer par les démos', async ({ page }) => {
  await start(page);
  await page.evaluate(() => new Promise(resolve => {
    const open = indexedDB.open('presentation-studio', 1);
    open.onsuccess = () => {
      const db = open.result, transaction = db.transaction('documents', 'readwrite'), store = transaction.objectStore('documents');
      const get = store.get('current');
      get.onsuccess = () => store.put({ ...get.result, version: 99, privateMetadata: 'à préserver' }, 'current');
      transaction.oncomplete = () => { db.close(); resolve(); };
    };
  }));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('version de présentation');
  expect((await record(page)).version).toBe(99);
  expect((await record(page)).privateMetadata).toBe('à préserver');
  await expect(page.locator('.page-thumbnail')).toHaveCount(0);
  await page.evaluate(() => new Promise(resolve => {
    const open = indexedDB.open('presentation-studio', 1);
    open.onsuccess = () => { const transaction = open.result.transaction('documents', 'readwrite'); transaction.objectStore('documents').put(null, 'current'); transaction.oncomplete = resolve; };
  }));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('version de présentation');
  expect(await record(page)).toBeNull();
});

test('restauration : quota insuffisant conserve le projet, succès conserve une copie récupérable', async ({ page }, testInfo) => {
  await start(page);
  const file = await backup(page, testInfo);
  await page.getByLabel('Nom de la page', { exact: true }).fill('Projet actuel à conserver'); await saved(page);
  await page.getByTestId('zip-input').setInputFiles(file);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    window.restorePut = () => { IDBObjectStore.prototype.put = put; };
    IDBObjectStore.prototype.put = function (...args) { if (args[1] === 'current') throw new DOMException('Quota simulé', 'QuotaExceededError'); return put.apply(this, args); };
  });
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmer', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Restauration annulée');
  expect((await record(page)).pages[0].title).toBe('Projet actuel à conserver');
  await expect(page.getByLabel('Nom de la page', { exact: true })).toHaveValue('Projet actuel à conserver');
  await page.evaluate(() => window.restorePut());
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmer', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await saved(page);
  expect((await record(page, 'before-restore')).pages[0].title).toBe('Projet actuel à conserver');
  await page.getByRole('button', {name:'Fichier',exact:true}).click(); await page.getByRole('menuitem', {name:'Récupérer le projet précédent',exact:true}).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmer', exact: true }).click();
  await expect(page.getByLabel('Nom de la page', { exact: true })).toHaveValue('Projet actuel à conserver');
});

test('ZIP contenant une image illisible : rejet avant toute restauration', async ({ page }, testInfo) => {
  await start(page);
  const file = await backup(page, testInfo);
  const zip = await JSZip.loadAsync(await fs.readFile(file));
  const config = JSON.parse(await zip.file('presentation.json').async('string'));
  zip.file(config.media[0].path, 'image cassée');
  await page.getByTestId('zip-input').setInputFiles({ name: 'bad-media.zip', mimeType: 'application/zip', buffer: await zip.generateAsync({ type: 'nodebuffer' }) });
  await expect(page.locator('.editor-message')).toContainText('ne peut pas être lu');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await record(page)).pages).toEqual(config.pages);
});

test('deux onglets : empêcher l’écrasement silencieux d’un projet plus récent', async ({ page, context }) => {
  await start(page);
  const second = await context.newPage(); await start(second);
  await page.getByLabel('Nom de la page', { exact: true }).fill('Version du premier onglet'); await saved(page);
  await second.getByLabel('Nom de la page', { exact: true }).fill('Version concurrente');
  await expect(second.getByRole('alert')).toContainText('autre fenêtre');
  expect((await record(page)).pages[0].title).toBe('Version du premier onglet');
  await second.getByRole('button', {name:'Fichier',exact:true}).click(); await expect(second.getByRole('menuitem', { name: 'Sauvegarder mon projet', exact: true })).toBeEnabled();
});

test('médias personnels : import, lecture et ZIP sans envoi réseau', async ({ page }, testInfo) => {
  await start(page);
  const uploads = [], external = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (!['GET', 'HEAD'].includes(request.method())) uploads.push(request.url());
    if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:5180/')) external.push(request.url());
  });
  await page.getByRole('button', { name: 'Importer / remplacer l’image', exact: true }).click();
  await page.getByTestId('media-input').setInputFiles(path.resolve('public/slides/sunset.png'));
  await expect(page.locator('.media-name').first()).toHaveText('sunset.png');
  await saved(page); await backup(page, testInfo);
  await page.getByRole('button', { name: 'Présentation', exact: true }).click();
  expect(uploads).toEqual([]); expect(external).toEqual([]); expect(errors).toEqual([]);
});

test('paramètres supplémentaires du projet : conservés au rechargement et dans la sauvegarde ZIP', async ({ page }, testInfo) => {
  await start(page);
  await page.evaluate(() => new Promise(resolve => {
    const open = indexedDB.open('presentation-studio', 1);
    open.onsuccess = () => {
      const transaction = open.result.transaction('documents', 'readwrite'), store = transaction.objectStore('documents');
      const get = store.get('current');
      get.onsuccess = () => {
        const value = get.result;
        value.projectSettings = { note: 'paramètre à conserver' };
        value.pages[0].pageSettings = { note: 'réglage de page' };
        store.put(value, 'current');
      };
      transaction.oncomplete = resolve;
    };
  }));
  await page.reload(); await expect(page.locator('.page-thumbnail')).toHaveCount(3); await saved(page);
  const file = await backup(page, testInfo);
  const zip = await JSZip.loadAsync(await fs.readFile(file));
  const config = JSON.parse(await zip.file('presentation.json').async('string'));
  expect(config.projectSettings).toEqual({ note: 'paramètre à conserver' });
  expect(config.pages[0].pageSettings).toEqual({ note: 'réglage de page' });
  await page.getByTestId('zip-input').setInputFiles(file);
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmer', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0); await saved(page);
  expect((await record(page)).projectSettings).toEqual(config.projectSettings);
  expect((await record(page)).pages[0].pageSettings).toEqual(config.pages[0].pageSettings);
});
