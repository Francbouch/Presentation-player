import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

async function openPlayer(page, withoutVideo = false) {
  await page.goto('/');
  await expect(page.locator('.page-thumbnail')).toHaveCount(3);
  if (withoutVideo) await page.getByRole('button', { name: 'Supprimer la transition', exact: true }).click();
  await expect(page.locator('.save-status')).toHaveText('✓ Sauvegardé dans ce navigateur');
  await page.getByRole('button', { name: 'Présentation', exact: true }).click();
  await page.locator('h1').click();
}

async function screenshotPixel(page, point) {
  const png = await page.screenshot({ clip: { x: Math.floor(point.x), y: Math.floor(point.y), width: 1, height: 1 } });
  return page.evaluate(async source => {
    const image = new Image(); image.src = source; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
    return [...context.getImageData(0, 0, 1, 1).data];
  }, `data:image/png;base64,${png.toString('base64')}`);
}

test('sans vidéo : coupure immédiate, aucune animation ni phase noire', async ({ page }) => {
  await openPlayer(page, true);
  await page.evaluate(async () => {
    const source = document.querySelector('.slide-background').src;
    const image = new Image(); image.src = source; await image.decode();
  });
  const elapsed = await page.evaluate(() => new Promise(resolve => {
    const start = performance.now();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
    function check() {
      if (document.querySelector('.slide-info').textContent === 'Changez d’atmosphère' || performance.now() - start > 2000) resolve(performance.now() - start);
      else requestAnimationFrame(check);
    }
    check();
  }));
  expect(elapsed).toBeLessThan(250);
  await expect(page.locator('.transition-video')).toHaveCount(0);
  const visual = await page.locator('.slide-slot.is-current .slide').evaluate(element => ({ animation: getComputedStyle(element).animationName, opacity: getComputedStyle(element).opacity, complete: element.querySelector('img').complete, width: element.querySelector('img').naturalWidth }));
  expect(visual).toEqual({ animation: 'none', opacity: '1', complete: true, width: 1600 });
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.slide-info')).toHaveText('Une nouvelle perspective');
});

test('MP4 → image lente : dernière frame visible, image décodée et même élément conservé lors de la coupure', async ({ page }, testInfo) => {
  await openPlayer(page);
  await page.evaluate(() => {
    const decode = HTMLImageElement.prototype.decode;
    window.visualFrames = [];
    window.decodeStarted = false;
    HTMLImageElement.prototype.decode = function () {
      const decoded = decode.call(this);
      if (!this.classList.contains('slide-background') || !this.closest('.is-preparing')) return decoded;
      window.pendingImage = this;
      window.decodeStarted = true;
      return decoded.then(() => new Promise(resolve => { window.releaseImage = resolve; }));
    };
    function sample() {
      const active = document.querySelector('.slide-slot.is-current');
      const video = document.querySelector('.transition-video');
      const image = active?.querySelector('.slide-background');
      window.visualFrames.push({ hasVideo: !!video, videoVisible: video && getComputedStyle(video).visibility === 'visible', page: active?.querySelector('.slide-number')?.textContent, imageReady: image?.complete && image.naturalWidth > 0, opacity: active && getComputedStyle(active.querySelector('.slide')).opacity, animation: active && getComputedStyle(active.querySelector('.slide')).animationName });
      window.frameSampler = requestAnimationFrame(sample);
    }
    window.frameSampler = requestAnimationFrame(sample);
    new MutationObserver(() => {
      if (window.originalVideo && !document.querySelector('.transition-video')) {
        const image = document.querySelector('.slide-slot.is-current .slide-background');
        window.imageAtVideoRemoval = { sameElement: image === window.pendingImage, ready: image?.complete && image.naturalWidth > 0 };
      }
    }).observe(document.querySelector('.stage'), { childList: true, subtree: true });
  });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.decodeStarted && !!window.releaseImage);
  await page.waitForFunction(() => document.querySelector('.transition-video')?.ended);
  await page.evaluate(() => { window.originalVideo = document.querySelector('.transition-video'); });
  await expect(page.locator('.transition-video')).toBeVisible();
  await expect(page.locator('.slide-info')).toHaveText('Une nouvelle perspective');
  await expect(page.getByRole('button', { name: 'Diapositive suivante' })).toBeDisabled();
  const stage = await page.locator('.stage').boundingBox();
  const point = { x: stage.x + stage.width * .8, y: stage.y + stage.height * .5 };
  const heldPixel = await screenshotPixel(page, point);
  expect(heldPixel.slice(0, 3).reduce((a, b) => a + b) / 3).toBeGreaterThan(30);
  await page.locator('.stage').screenshot({ path: testInfo.outputPath('derniere-frame-video.png') });
  await page.evaluate(() => window.releaseImage());
  await expect(page.locator('.slide-info')).toHaveText('Changez d’atmosphère');
  await expect(page.locator('.transition-video')).toHaveCount(0);
  expect(await page.evaluate(() => window.imageAtVideoRemoval)).toEqual({ sameElement: true, ready: true });
  const nextPixel = await screenshotPixel(page, point);
  expect(nextPixel.slice(0, 3).reduce((a, b) => a + b) / 3).toBeGreaterThan(30);
  await page.locator('.stage').screenshot({ path: testInfo.outputPath('image-apres-coupure.png') });
  const frames = await page.evaluate(() => { cancelAnimationFrame(window.frameSampler); return window.visualFrames; });
  expect(frames.length).toBeGreaterThan(5);
  expect(frames.every(frame => frame.imageReady && frame.opacity === '1' && frame.animation === 'none')).toBe(true);
  await page.getByRole('button', { name: 'Océan', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Océan', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('sans vidéo et image lente : garder la page actuelle jusqu’au décodage, sans effet', async ({ page }) => {
  await openPlayer(page, true);
  await page.evaluate(() => {
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = function () {
      const decoded = decode.call(this);
      return this.closest('.is-preparing') ? decoded.then(() => new Promise(resolve => { window.releaseImage = resolve; })) : decoded;
    };
  });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => !!window.releaseImage);
  await expect(page.locator('.slide-info')).toHaveText('Une nouvelle perspective');
  await expect(page.locator('.transition-video')).toHaveCount(0);
  expect(await page.locator('.slide-slot.is-current .slide').evaluate(element => getComputedStyle(element).opacity)).toBe('1');
  await page.evaluate(() => window.releaseImage());
  await expect(page.locator('.slide-info')).toHaveText('Changez d’atmosphère');
});

test('image illisible : conserver la page affichée, signaler l’erreur et rendre la navigation disponible', async ({ page }) => {
  await openPlayer(page);
  await page.evaluate(() => {
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = function () { return this.closest('.is-preparing') ? Promise.reject(new Error('Décodage impossible')) : decode.call(this); };
  });
  await page.keyboard.press('Space');
  await expect(page.locator('.presentation-mode > [role="status"]')).toContainText('L’image suivante ne peut pas être lue');
  await expect(page.locator('.slide-info')).toHaveText('Une nouvelle perspective');
  await expect(page.getByRole('button', { name: 'Diapositive suivante' })).toBeEnabled();
  await expect(page.locator('.slide-slot.is-current .slide-background')).toBeVisible();
});

test('ancienne démo : remplacer le fondu encodé sans modifier les autres vidéos importées', async ({ page }) => {
  const old = await fs.readFile(path.resolve('tests/fixtures/legacy-demo.mp4'));
  const replacement = await fs.readFile(path.resolve('public/transitions/01-02.mp4'));
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  async function savedVideo() {
    return page.evaluate(() => new Promise((resolve, reject) => {
      const request = indexedDB.open('presentation-studio', 1);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('documents', 'readonly');
        const get = transaction.objectStore('documents').get('current');
        get.onsuccess = async () => {
          const id = get.result.pages[0].transitionId;
          const media = get.result.media.find(media => media.id === id);
          const hash = await crypto.subtle.digest('SHA-256', await media.blob.arrayBuffer());
          resolve({ id, hash: [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('') });
        };
        transaction.onerror = () => reject(transaction.error);
        transaction.oncomplete = () => db.close();
      };
    }));
  }
  await page.goto('/');
  await expect(page.locator('.page-thumbnail')).toHaveCount(3);
  await page.getByRole('button', { name: 'Importer / remplacer la transition MP4' }).click();
  await page.getByTestId('media-input').setInputFiles({ name: '01-02.mp4', mimeType: 'video/mp4', buffer: old });
  await expect.poll(async () => (await savedVideo()).hash).toBe(digest(old));
  await expect(page.locator('.save-status')).toHaveText('✓ Sauvegardé dans ce navigateur');
  const before = await savedVideo();
  expect(before.hash).toBe(digest(old));
  await page.reload();
  await expect(page.locator('.page-thumbnail')).toHaveCount(3);
  await expect(page.locator('.save-status')).toHaveText('✓ Sauvegardé dans ce navigateur');
  expect(await savedVideo()).toEqual({ id: before.id, hash: digest(replacement) });

  // Une vidéo différente, même avec le même nom, doit garder ses octets.
  const personal = Buffer.concat([old, Buffer.from([0, 0, 0, 8, 102, 114, 101, 101])]);
  await page.getByRole('button', { name: 'Importer / remplacer la transition MP4' }).click();
  await page.getByTestId('media-input').setInputFiles({ name: '01-02.mp4', mimeType: 'video/mp4', buffer: personal });
  await expect.poll(async () => (await savedVideo()).hash).toBe(digest(personal));
  await expect(page.locator('.save-status')).toHaveText('✓ Sauvegardé dans ce navigateur');
  const personalId = (await savedVideo()).id;
  await page.reload();
  await expect(page.locator('.page-thumbnail')).toHaveCount(3);
  await expect(page.locator('.save-status')).toHaveText('✓ Sauvegardé dans ce navigateur');
  expect(await savedVideo()).toEqual({ id: personalId, hash: digest(personal) });
});
