import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';
import JSZip from 'jszip';

const image = path.resolve('public/slides/sunset.png');
const video = path.resolve('public/transitions/01-02.mp4');
const thumbnails = page => page.locator('.page-thumbnail');
const saved = page => expect(page.locator('.save-status')).toHaveText('✓ Sauvegardé dans ce navigateur');
const choose = (page, kind, file) => page.getByTestId(kind === 'zip' ? 'zip-input' : 'media-input').setInputFiles(file);
const selectPage = (page, index) => thumbnails(page).nth(index).click();
async function start(page) { await page.goto('/'); await expect(thumbnails(page)).toHaveCount(3); await saved(page); }
async function confirm(page) { await page.getByRole('dialog').getByRole('button', { name: 'Confirmer' }).click(); }

test('pages : ajout, duplication indépendante, ordre, suppression et sauvegarde après rechargement', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: '+ Ajouter une page', exact: true }).click();
  await expect(thumbnails(page)).toHaveCount(4);
  await page.getByLabel('Nom de la page', { exact: true }).fill('Cuisine f avec espace');
  await page.getByLabel('Nom de la page', { exact: true }).press('ArrowLeft');
  await expect(page.locator('.editor')).toBeVisible();
  await page.getByRole('button', { name: 'Importer / remplacer l’image', exact: true }).click();
  await choose(page, 'image', image);
  await expect(page.locator('.media-name').first()).toHaveText('sunset.png');
  await page.getByRole('button', { name: 'Dupliquer la page' }).click();
  await expect(thumbnails(page)).toHaveCount(5);
  await page.getByLabel('Nom de la page', { exact: true }).fill('Copie indépendante');
  await page.getByRole('button', { name: 'Supprimer l’image', exact: true }).click();
  await page.getByRole('button', { name: '↑ Monter' }).click();
  await expect(thumbnails(page).nth(3)).toContainText('Copie indépendante');
  await selectPage(page, 4);
  await expect(page.locator('.editor-preview img')).toHaveAttribute('src', /^blob:/);
  await saved(page);
  await page.reload();
  await expect(thumbnails(page)).toHaveCount(5);
  await expect(thumbnails(page).nth(4)).toContainText('Cuisine f avec espace');
  await selectPage(page, 3);
  await page.getByRole('button', { name: 'Supprimer la page' }).click();
  await confirm(page);
  await expect(thumbnails(page)).toHaveCount(4);
  await saved(page);
});

test('variantes : créer, renommer, remplacer, supprimer et conserver les boutons du lecteur', async ({ page }) => {
  await start(page);
  await selectPage(page, 1);
  await page.getByRole('button', { name: '+ Ajouter une variante', exact: true }).click();
  await choose(page, 'image', image);
  await expect(page.locator('.variant-row')).toHaveCount(4);
  await page.locator('.variant-row').last().getByRole('textbox').fill('Noyer');
  await page.locator('.variant-row').last().getByRole('button', { name: 'Remplacer l’image', exact: true }).click();
  await choose(page, 'image', path.resolve('public/slides/ocean.png'));
  await saved(page);
  await page.getByRole('button', { name: 'Présentation', exact: true }).click();
  await page.getByRole('button', { name: 'Noyer', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Noyer', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '← Revenir à l’éditeur' }).click();
  await page.getByRole('button', { name: 'Supprimer la variante Noyer', exact: true }).click();
  await expect(page.locator('.variant-row')).toHaveCount(3);
  await saved(page);
  await page.reload();
  await selectPage(page, 1);
  await expect(page.locator('.variant-row')).toHaveCount(3);
});

test('lecteur : MP4 automatique, verrouillage, clavier, coupure directe, variantes et plein écran', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Présentation', exact: true }).click();
  const bounds = await page.locator('.stage').boundingBox();
  expect(Math.abs(bounds.width / bounds.height - 16 / 9)).toBeLessThan(.01);
  await page.locator('h1').click();
  await page.keyboard.press('Space');
  await expect(page.locator('.transition-video')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Diapositive suivante' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Éditeur', exact: true })).toBeDisabled();
  await page.waitForFunction(() => document.querySelector('.transition-video')?.currentTime > 0);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Océan', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Océan', exact: true }).click();
  await page.locator('h1').click();
  await page.keyboard.press('Space');
  await expect(page.locator('.slide-info')).toHaveText('Faites place à vos idées');
  expect(await page.locator('.slide').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('button', { name: 'Océan', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('f');
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.keyboard.press('f');
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
});

test('médias : JPEG, WebP, remplacement MP4, suppression et rejet des fichiers invalides', async ({ page }) => {
  await start(page);
  for (const type of ['image/jpeg', 'image/webp']) {
    const bytes = await page.evaluate(async type => {
      const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180;
      canvas.getContext('2d').fillRect(0, 0, 320, 180);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, type));
      return [...new Uint8Array(await blob.arrayBuffer())];
    }, type);
    const name = type === 'image/jpeg' ? 'test.jpeg' : 'test.webp';
    await page.getByRole('button', { name: 'Importer / remplacer l’image', exact: true }).click();
    await choose(page, 'image', { name, mimeType: type, buffer: Buffer.from(bytes) });
    await expect(page.locator('.media-name').first()).toHaveText(name);
  }
  await page.getByRole('button', { name: 'Importer / remplacer la transition MP4' }).click();
  await choose(page, 'video', video);
  await expect(page.locator('.video-preview')).toBeVisible();
  await page.getByRole('button', { name: 'Supprimer la transition' }).click();
  await expect(page.locator('.video-preview')).toHaveCount(0);
  const webm = await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180;
    const stream = canvas.captureStream(15);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
    const chunks = [];
    recorder.ondataavailable = event => chunks.push(event.data);
    const stopped = new Promise(resolve => { recorder.onstop = resolve; });
    recorder.start();
    const timer = setInterval(() => canvas.getContext('2d').fillRect(0, 0, 320, 180), 40);
    await new Promise(resolve => setTimeout(resolve, 400));
    recorder.stop();
    await stopped;
    clearInterval(timer);
    stream.getTracks().forEach(track => track.stop());
    return [...new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer())];
  });
  await page.getByRole('button', { name: 'Importer / remplacer la transition MP4' }).click();
  await choose(page, 'video', { name: 'transition.webm', mimeType: 'video/webm', buffer: Buffer.from(webm) });
  await expect(page.locator('.media-name').nth(1)).toHaveText('transition.webm');
  await page.getByRole('button', { name: 'Présentation', exact: true }).click();
  await page.locator('h1').click();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Océan', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '← Revenir à l’éditeur' }).click();
  await page.getByRole('button', { name: 'Importer / remplacer l’image', exact: true }).click();
  await choose(page, 'image', { name: 'invalid.png', mimeType: 'image/png', buffer: Buffer.from('broken') });
  await expect(page.locator('.editor-message')).toContainText('ne peut pas être lu');
  await expect(page.locator('.media-name').first()).toHaveText('test.webp');
  await saved(page);
});

test('ZIP : export complet, restauration sur un navigateur vierge, import invalide sans perte', async ({ page, browser }, testInfo) => {
  await start(page);
  await selectPage(page, 1);
  await page.getByLabel('Nom de la page', { exact: true }).fill('Présentation transférée');
  await saved(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Sauvegarder mon projet' }).click();
  const download = await downloadPromise;
  const archivePath = testInfo.outputPath('presentation.zip');
  await download.saveAs(archivePath);
  const zip = await JSZip.loadAsync(await fs.readFile(archivePath), { checkCRC32: true });
  const config = JSON.parse(await zip.file('presentation.json').async('string'));
  expect(config.pages).toHaveLength(3);
  expect(config.media).toHaveLength(4);
  for (const media of config.media) expect((await zip.file(media.path).async('uint8array')).length).toBeGreaterThan(0);
  const context = await browser.newContext();
  const other = await context.newPage();
  await other.goto('http://127.0.0.1:5180');
  await expect(thumbnails(other)).toHaveCount(3);
  await saved(other);
  await choose(other, 'zip', archivePath);
  await confirm(other);
  await expect(thumbnails(other).nth(1)).toContainText('Présentation transférée');
  await saved(other);
  await other.reload();
  await expect(thumbnails(other).nth(1)).toContainText('Présentation transférée');
  await selectPage(other, 1);
  await expect(other.locator('.variant-row')).toHaveCount(3);
  await selectPage(other, 0);
  await expect(other.locator('.video-preview')).toBeVisible();
  await choose(other, 'zip', { name: 'bad.zip', mimeType: 'application/zip', buffer: Buffer.from('not a zip') });
  await expect(other.locator('.editor-message')).toContainText('illisible');
  await expect(thumbnails(other).nth(1)).toContainText('Présentation transférée');
  await context.close();
});

test('quota : avertissement, échec de sauvegarde signalé et récupération après nouvelle tentative', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    window.restorePut = () => { IDBObjectStore.prototype.put = original; };
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'documents') throw new DOMException('Quota simulé', 'QuotaExceededError');
      return original.apply(this, args);
    };
  });
  await page.getByLabel('Nom de la page', { exact: true }).fill('Modification non sauvegardée');
  await expect(page.locator('.save-status')).toHaveText('⚠ Non sauvegardé');
  await expect(page.getByRole('alert')).toContainText('Espace de stockage insuffisant');
  await page.evaluate(() => window.restorePut());
  await page.getByRole('button', { name: 'Réessayer la sauvegarde' }).click();
  await saved(page);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel('Nom de la page', { exact: true })).toHaveValue('Modification non sauvegardée');
});

test('état vide et interface mobile restent utilisables', async ({ page }) => {
  await start(page);
  for (let i = 0; i < 3; i++) { await page.getByRole('button', { name: 'Supprimer la page' }).click(); await confirm(page); }
  await expect(thumbnails(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Présentation', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Ajouter une page', exact: true }).click();
  await expect(thumbnails(page)).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await saved(page);
});

test('vidéo illisible : le lecteur coupe directement et débloque les commandes', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (this.classList.contains('transition-video')) return Promise.reject(new DOMException('Lecture indisponible', 'NotSupportedError'));
      return original.call(this);
    };
  });
  await page.getByRole('button', { name: 'Présentation', exact: true }).click();
  await page.locator('h1').click();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Océan', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Diapositive suivante' })).toBeEnabled();
});
