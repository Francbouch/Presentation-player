import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';
import JSZip from 'jszip';

const saved = page => expect(page.locator('.save-status')).toHaveText('✓ Sauvegardé dans ce navigateur');
const button = (page, name = 'Action') => page.locator('.interactive-button-layer').getByRole('button', { name, exact: true });
async function record(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('presentation-studio', 1);
    request.onsuccess = () => {
      const db = request.result; const tx = db.transaction('documents', 'readonly'); const get = tx.objectStore('documents').get('current');
      get.onsuccess = () => resolve(get.result); tx.oncomplete = () => db.close(); tx.onerror = () => reject(tx.error);
    }; request.onerror = () => reject(request.error);
  }));
}
async function start(page, index = 1) { await page.goto('/'); await expect(page.locator('.page-thumbnail')).toHaveCount(3); await saved(page); await page.locator('.page-thumbnail').nth(index).click(); }
async function addButton(page, type, name = 'Action') {
  await page.getByRole('toolbar').getByRole('button', { name: '+ Bouton', exact: true }).click();
  await page.getByLabel('Nom du calque', { exact: true }).fill(name);
  await page.getByLabel('Type d’action', { exact: true }).selectOption(type);
  await saved(page);
}
async function edit(page) { await page.getByRole('button', { name: 'Revenir au mode édition', exact: true }).click(); }
async function videoAction(page, end = 'return') {
  await addButton(page, 'video');
  await page.getByLabel('Vidéo de l’action', { exact: true }).selectOption({ label: '01-02.mp4' });
  await page.getByLabel('Après la vidéo', { exact: true }).selectOption(end);
}

test('arrière-plan : image existante/importée, retour initial et sortie de test sans écriture', async ({ page }) => {
  await start(page);
  await addButton(page, 'background');
  await page.getByLabel('Arrière-plan de l’action', { exact: true }).selectOption({ label: 'Variante : Océan' });
  await saved(page);
  const original = await record(page);
  const src = await page.locator('.editor-preview .slide-background:not(.visual-pending-background)').getAttribute('src');
  await page.getByRole('button', { name: 'Tester l’action', exact: true }).click();
  await expect(page.locator('.editor-preview .slide-background:not(.visual-pending-background)')).not.toHaveAttribute('src', src);
  expect((await record(page)).pages).toEqual(original.pages);
  await edit(page);
  await expect(page.locator('.editor-preview .slide-background:not(.visual-pending-background)')).toHaveAttribute('src', src);
  await page.getByLabel('Arrière-plan de l’action', { exact: true }).selectOption({ label: 'Arrière-plan initial' });
  await page.getByRole('button', { name: 'Tester les interactions', exact: true }).click();
  await page.locator('.variant-choices').getByRole('button', { name: 'Océan', exact: true }).click();
  await button(page).click();
  await expect(page.locator('.editor-preview .slide-background:not(.visual-pending-background)')).toHaveAttribute('src', src);
  await edit(page);
  await page.getByRole('button', { name: 'Importer l’image de l’action', exact: true }).click();
  await page.getByTestId('media-input').setInputFiles(path.resolve('public/slides/sunset.png'));
  await expect(page.getByLabel('Arrière-plan de l’action', { exact: true })).toHaveValue(/^media:/);
  await saved(page);
  const imported = (await record(page)).pages[1].buttons[0];
  expect(imported.action.target).toEqual(imported.target);
  await page.getByRole('button', { name: 'Présentation', exact: true }).click();
  await button(page).click();
  await expect(button(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.transition-video')).toHaveCount(0);
});

test('visibilité : plusieurs calques, afficher/masquer/basculer sans changer l’ordre ni sauvegarder le test', async ({ page }) => {
  await start(page);
  await page.getByRole('toolbar').getByRole('button', { name: '+ Texte', exact: true }).click();
  await page.getByLabel('Nom du calque', { exact: true }).fill('Annotation');
  await page.getByRole('toolbar').getByRole('button', { name: '+ Rectangle', exact: true }).click();
  await page.getByLabel('Nom du calque', { exact: true }).fill('Repère');
  await addButton(page, 'visibility');
  await page.getByLabel('Contrôler Annotation', { exact: true }).check();
  await page.getByLabel('Contrôler Repère', { exact: true }).check();
  await page.getByLabel('Opération de visibilité', { exact: true }).selectOption('hide');
  await saved(page);
  const original = await record(page);
  const layerIds = original.pages[1].layers.map(layer => layer.id);
  await page.getByRole('button', { name: 'Tester l’action', exact: true }).click();
  for (const id of layerIds) await expect(page.locator(`[data-layer-id="${id}"]`)).toHaveCount(0);
  await edit(page);
  await page.getByLabel('Opération de visibilité', { exact: true }).selectOption('toggle');
  await page.getByRole('button', { name: 'Tester l’action', exact: true }).click();
  await button(page).click();
  for (const id of layerIds) await expect(page.locator(`[data-layer-id="${id}"]`)).toBeVisible();
  await edit(page);
  await page.getByLabel('Opération de visibilité', { exact: true }).selectOption('show');
  await saved(page);
  await page.getByRole('button', { name: 'Tester l’action', exact: true }).click();
  for (const id of layerIds) await expect(page.locator(`[data-layer-id="${id}"]`)).toBeVisible();
  expect((await record(page)).pages[1].layerOrder).toEqual(original.pages[1].layerOrder);
  await page.getByRole('button', { name: 'Présentation', exact: true }).click();
  await button(page).click();
  for (const id of layerIds) await expect(page.locator(`[data-layer-id="${id}"]`)).toBeVisible();
});

test('vidéo : doubles clics, verrouillage clavier, retour à la page et arrêt', async ({ page }) => {
  await start(page);
  await videoAction(page);
  await saved(page);
  const original = await record(page);
  const src = await page.locator('.editor-preview .slide-background:not(.visual-pending-background)').getAttribute('src');
  await page.getByRole('button', { name: 'Tester l’action', exact: true }).click();
  await expect(page.locator('.action-video')).toBeVisible();
  await expect(button(page)).toBeDisabled();
  await expect(page.locator('.action-video')).toHaveCount(1);
  await page.getByRole('button', { name: 'Arrêter la vidéo', exact: true }).click();
  await expect(page.locator('.action-video')).toHaveCount(0);
  await expect(page.locator('.editor-preview .slide-background:not(.visual-pending-background)')).toHaveAttribute('src', src);
  expect((await record(page)).pages).toEqual(original.pages);
  await edit(page);
  await page.getByRole('button', { name: 'Présentation', exact: true }).click();
  await button(page).evaluate(element => { element.click(); element.click(); });
  await expect(page.locator('.action-video')).toBeVisible();
  await expect(page.locator('.action-video')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Diapositive suivante', exact: true })).toBeDisabled();
  await page.locator('h1').click();
  await page.keyboard.press('Space'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('f');
  await expect(page.locator('.slide-info')).toHaveText('Changez d’atmosphère');
  expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  await expect(page.locator('.action-video')).toHaveCount(0, { timeout: 10000 });
  await expect(page.getByRole('button', { name: 'Diapositive suivante', exact: true })).toBeEnabled();
});

test('vidéo → image finale : dernière frame jusqu’au décodage réel, sans effet ni écran vide', async ({ page }) => {
  await start(page);
  await videoAction(page, 'image');
  await page.getByLabel('Image finale', { exact: true }).selectOption({ label: 'Variante : Océan' });
  await saved(page);
  await page.getByRole('button', { name: 'Présentation', exact: true }).click();
  const source = await page.locator('.slide-background').getAttribute('src');
  await page.evaluate(() => {
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = async function () {
      if (this.classList.contains('slide-background')) await new Promise(resolve => setTimeout(resolve, 900));
      return decode.call(this);
    };
  });
  await button(page).click();
  await expect(page.locator('.action-video')).toBeVisible();
  await page.waitForFunction(() => document.querySelector('.action-video')?.ended);
  await expect(page.locator('.action-video')).toBeVisible();
  await expect(page.locator('.action-video')).toHaveCount(0, { timeout: 10000 });
  await expect(page.locator('.slide-background')).not.toHaveAttribute('src', source);
  await expect(page.locator('.slide-background')).toBeVisible();
  expect(await page.locator('.slide').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
});

test('navigation directe : aucune transition implicite ; vidéo spécifique et fin vidéo vers une page', async ({ page }) => {
  await start(page, 0);
  await addButton(page, 'navigate');
  await page.getByLabel('Page de destination', { exact: true }).selectOption({ label: '3 · Faites place à vos idées' });
  await page.getByRole('button', { name: 'Tester l’action', exact: true }).click();
  await expect(page.locator('.preview-heading')).toContainText('Page 3');
  await expect(page.locator('.editor')).toBeVisible();
  await edit(page);
  await page.getByRole('button', { name: 'Sélectionner le calque Action', exact: true }).click();
  await page.getByRole('button', { name: 'Présentation', exact: true }).click();
  await button(page).click();
  await expect(page.locator('.slide-info')).toHaveText('Faites place à vos idées');
  await expect(page.locator('.transition-video')).toHaveCount(0);
  await page.getByRole('button', { name: '← Revenir à l’éditeur', exact: true }).click();
  await page.getByRole('button', { name: 'Sélectionner le calque Action', exact: true }).click();
  await page.getByLabel('Transition spécifique', { exact: true }).selectOption({ label: '01-02.mp4' });
  await page.getByRole('button', { name: 'Présentation', exact: true }).click();
  await button(page).click();
  await expect(page.locator('.transition-video')).toBeVisible();
  await expect(page.locator('.slide-info')).toHaveText('Faites place à vos idées');
  await page.getByRole('button', { name: '← Revenir à l’éditeur', exact: true }).click();
  await page.getByRole('button', { name: 'Sélectionner le calque Action', exact: true }).click();
  await page.getByLabel('Type d’action', { exact: true }).selectOption('video');
  await page.getByLabel('Vidéo de l’action', { exact: true }).selectOption({ label: '01-02.mp4' });
  await page.getByLabel('Après la vidéo', { exact: true }).selectOption('page');
  await page.getByLabel('Page après la vidéo', { exact: true }).selectOption({ label: '2 · Changez d’atmosphère' });
  await page.getByRole('button', { name: 'Présentation', exact: true }).click();
  await button(page).click();
  await expect(page.locator('.action-video')).toBeVisible();
  await expect(page.locator('.slide-info')).toHaveText('Changez d’atmosphère');
  await expect(page.locator('.action-video')).toHaveCount(0);
  await expect(page.locator('.transition-video')).toHaveCount(0);
});

test('états : création, initial, visibilité, bouton actif, duplication, suppression et reset de test', async ({ page }) => {
  await start(page);
  await page.getByRole('toolbar').getByRole('button', { name: '+ Texte', exact: true }).click();
  await page.getByLabel('Nom du calque', { exact: true }).fill('Détails');
  await addButton(page, 'state');
  await page.getByRole('button', { name: '+ Ajouter un état', exact: true }).click();
  await page.locator('.state-card').last().getByRole('textbox').fill('Fermé');
  await page.getByLabel('Visibilité de Détails dans Fermé', { exact: true }).selectOption('hide');
  await page.getByLabel('État initial', { exact: true }).selectOption({ label: 'Fermé' });
  await page.getByRole('button', { name: '+ Ajouter un état', exact: true }).click();
  await page.locator('.state-card').last().getByRole('textbox').fill('Ouvert');
  await page.getByLabel('Visibilité de Détails dans Ouvert', { exact: true }).selectOption('show');
  await page.getByLabel('Arrière-plan de l’état Ouvert', { exact: true }).selectOption({ label: 'Variante : Océan' });
  await page.getByLabel('Bouton actif de l’état Ouvert', { exact: true }).selectOption({ label: 'Action' });
  await page.getByLabel('État à activer', { exact: true }).selectOption({ label: 'Ouvert' });
  await saved(page);
  const original = await record(page);
  const id = original.pages[1].layers[0].id;
  const src = await page.locator('.slide-background').getAttribute('src');
  await page.getByRole('button', { name: 'Tester les interactions', exact: true }).click();
  await expect(page.locator(`[data-layer-id="${id}"]`)).toHaveCount(0);
  await button(page).click();
  await expect(page.locator(`[data-layer-id="${id}"]`)).toBeVisible();
  await expect(button(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.slide-background')).not.toHaveAttribute('src', src);
  await edit(page);
  expect((await record(page)).pages).toEqual(original.pages);
  await expect(page.locator(`[data-layer-id="${id}"]`)).toHaveCount(0);
  await expect(page.locator('.slide-background')).toHaveAttribute('src', src);
  await page.getByRole('button', { name: 'Dupliquer l’état Ouvert', exact: true }).click();
  await expect(page.locator('.state-card')).toHaveCount(3);
  await page.getByRole('button', { name: 'Supprimer l’état Ouvert (copie)', exact: true }).click();
  await expect(page.locator('.state-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Présentation', exact: true }).click();
  await expect(page.locator(`[data-layer-id="${id}"]`)).toHaveCount(0);
  await button(page).click();
  await expect(page.locator(`[data-layer-id="${id}"]`)).toBeVisible();
});

test('actions et états : persistance, ZIP complet, migration v3, duplication et références supprimées', async ({ page, browser }, testInfo) => {
  await start(page);
  await page.getByRole('toolbar').getByRole('button', { name: '+ Texte', exact: true }).click();
  await page.getByLabel('Nom du calque', { exact: true }).fill('Annotation');
  for (const [type, name] of [['background', 'Décor'], ['visibility', 'Détails'], ['video', 'Animation'], ['navigate', 'Suivant'], ['state', 'État']]) {
    await addButton(page, type, name);
    if (type === 'background') await page.getByLabel('Arrière-plan de l’action', { exact: true }).selectOption({ label: 'Variante : Océan' });
    if (type === 'visibility') await page.getByLabel('Contrôler Annotation', { exact: true }).check();
    if (type === 'video') {
      await page.getByRole('button', { name: 'Importer la vidéo de l’action', exact: true }).click();
      await page.getByTestId('media-input').setInputFiles(path.resolve('public/transitions/01-02.mp4'));
      await expect(page.getByLabel('Vidéo de l’action', { exact: true })).not.toHaveValue('');
      await page.getByLabel('Après la vidéo', { exact: true }).selectOption('image');
      await page.getByRole('button', { name: 'Importer l’image finale', exact: true }).click();
      await page.getByTestId('media-input').setInputFiles(path.resolve('public/slides/sunset.png'));
      await expect(page.getByLabel('Image finale', { exact: true })).toHaveValue(/^media:/);
    }
    if (type === 'navigate') await page.getByLabel('Page de destination', { exact: true }).selectOption({ label: '3 · Faites place à vos idées' });
    if (type === 'state') {
      await page.getByRole('button', { name: '+ Ajouter un état', exact: true }).click();
      await page.locator('.state-card').last().getByRole('textbox').fill('Ouvert');
      await page.getByLabel('Arrière-plan de l’état Ouvert', { exact: true }).selectOption({ label: 'Variante : Crépuscule' });
      await page.getByLabel('Visibilité de Annotation dans Ouvert', { exact: true }).selectOption('show');
      await page.getByLabel('État à activer', { exact: true }).selectOption({ label: 'Ouvert' });
    }
  }
  await saved(page);
  const original = await record(page);
  await page.reload(); await saved(page);
  expect((await record(page)).pages).toEqual(original.pages);
  const download = page.waitForEvent('download');
  await page.getByRole('button', {name:'Fichier',exact:true}).click(); await page.getByRole('menuitem', {name:'Sauvegarder mon projet',exact:true}).click();
  const file = testInfo.outputPath('actions.zip'); await (await download).saveAs(file);
  const context = await browser.newContext(); const other = await context.newPage(); await start(other);
  await other.getByTestId('zip-input').setInputFiles(file);
  await other.getByRole('dialog').getByRole('button', { name: 'Confirmer', exact: true }).click();
  await saved(other);
  expect((await record(other)).pages).toEqual(original.pages);
  expect((await record(other)).media.map(item => [item.id, item.blob.size])).toEqual(original.media.map(item => [item.id, item.blob.size]));
  await other.reload(); await saved(other);
  await other.locator('.page-thumbnail').nth(1).click();
  await other.getByRole('button', { name: 'Dupliquer la page', exact: true }).click(); await saved(other);
  const copied = (await record(other)).pages[2];
  expect(copied.states[0].id).not.toBe(original.pages[1].states[0].id);
  expect(copied.buttons.find(button => button.name === 'État').action.stateId).toBe(copied.states[0].id);
  expect(copied.buttons.find(button => button.name === 'Détails').action.layerIds).toEqual([copied.layers[0].id]);
  await other.getByRole('button', { name: 'Sélectionner le calque Annotation', exact: true }).click();
  await other.getByRole('button', { name: 'Supprimer le calque', exact: true }).click();
  await saved(other);
  const cleaned = (await record(other)).pages[2];
  expect(cleaned.buttons.find(button => button.name === 'Détails').action.layerIds).toEqual([]);
  expect(cleaned.states[0].visibility).toEqual(Object.fromEntries(cleaned.buttons.filter(button => button.futureStateVisibility !== undefined).map(button => [button.id, button.futureStateVisibility])));
  const zip = await JSZip.loadAsync(await fs.readFile(file));
  const config = JSON.parse(await zip.file('presentation.json').async('string'));
  config.pages[1].buttons[3].action.pageId = 'page-absente';
  zip.file('presentation.json', JSON.stringify(config));
  const badFile = testInfo.outputPath('actions-invalides.zip'); await fs.writeFile(badFile, await zip.generateAsync({ type: 'nodebuffer' }));
  const before = await record(other);
  await other.getByTestId('zip-input').setInputFiles(badFile);
  await expect(other.locator('.editor-message')).toContainText('actions ou des états est invalide');
  expect((await record(other)).pages).toEqual(before.pages);
  // Une véritable configuration v3 n’a ni actions ni états.
  config.version = 3;
  for (const page of config.pages) {
    delete page.states; delete page.initialStateId;
    for (const button of page.buttons) delete button.action;
  }
  zip.file('presentation.json', JSON.stringify(config));
  const oldFile = testInfo.outputPath('ancienne-v3.zip'); await fs.writeFile(oldFile, await zip.generateAsync({ type: 'nodebuffer' }));
  await other.getByTestId('zip-input').setInputFiles(oldFile);
  await other.getByRole('dialog').getByRole('button', { name: 'Confirmer', exact: true }).click(); await saved(other);
  const migrated = await record(other);
  expect(migrated.version).toBe(19);
  expect(migrated.pages[1].buttons[0].target).toEqual(original.pages[1].buttons[0].target);
  expect(migrated.pages[1].buttons[0].action).toEqual({ type: 'background', target: original.pages[1].buttons[0].target });
  expect(migrated.pages[1].layerOrder).toEqual(original.pages[1].layerOrder);
  await context.close();
});

test('vidéo illisible et lecture sans verrou : page conservée, navigation possible, pas de vidéo résiduelle', async ({ page }) => {
  await start(page);
  await videoAction(page);
  await page.getByRole('button', { name: 'Présentation', exact: true }).click();
  await page.evaluate(() => {
    HTMLMediaElement.prototype.play = () => Promise.reject(new Error('Échec simulé'));
  });
  await button(page).click();
  await expect(page.locator('.presentation-mode > [role="status"]')).toContainText('vidéo ne peut pas être lue');
  await expect(page.locator('.action-video')).toHaveCount(0);
  await expect(page.locator('.slide-background')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Diapositive suivante', exact: true })).toBeEnabled();
  await page.reload(); await saved(page);
  await page.locator('.page-thumbnail').nth(1).click();
  await page.getByRole('button', { name: 'Sélectionner le calque Action', exact: true }).click();
  await page.getByLabel('Bloquer les interactions pendant la vidéo', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Présentation', exact: true }).click();
  await button(page).click();
  await expect(page.locator('.action-video')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Diapositive suivante', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Diapositive suivante', exact: true }).click();
  await expect(page.locator('.slide-info')).toHaveText('Faites place à vos idées');
  await expect(page.locator('.action-video')).toHaveCount(0);
});

test('WebM importé, transition spécifique dans l’éditeur et migration IndexedDB v3', async ({ page }, testInfo) => {
  await start(page);
  await addButton(page, 'video');
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#504080'; ctx.fillRect(0, 0, 320, 180);
    const stream = canvas.captureStream(15); const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' }); const chunks = [];
    recorder.ondataavailable = event => chunks.push(event.data);
    const completed = new Promise(resolve => { recorder.onstop = resolve; });
    recorder.start();
    for (let i = 0; i < 15; i++) { ctx.fillStyle = i % 2 ? '#606090' : '#504080'; ctx.fillRect(0, 0, 320, 180); await new Promise(resolve => setTimeout(resolve, 50)); }
    recorder.stop(); await completed; stream.getTracks().forEach(track => track.stop());
    return [...new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer())];
  });
  await page.getByRole('button', { name: 'Importer la vidéo de l’action', exact: true }).click();
  await page.getByTestId('media-input').setInputFiles({ name: 'action.webm', mimeType: 'video/webm', buffer: Buffer.from(bytes) });
  await expect(page.getByLabel('Vidéo de l’action', { exact: true })).not.toHaveValue('');
  await saved(page);
  await page.screenshot({ path: testInfo.outputPath('actions-phase-2.png'), fullPage: true });
  await page.getByRole('button', { name: 'Tester l’action', exact: true }).click();
  await expect(page.locator('.action-video')).toBeVisible();
  const sizes = await page.locator('.action-video').evaluate(video => { const stage = video.closest('.stage').getBoundingClientRect(); const frame = video.getBoundingClientRect(); return [stage.width / stage.height, frame.width / frame.height]; });
  for (const ratio of sizes) expect(ratio).toBeCloseTo(16 / 9, 1);
  await expect(page.locator('.action-video')).toHaveCount(0, { timeout: 10000 });
  await edit(page);
  await page.getByLabel('Type d’action', { exact: true }).selectOption('navigate');
  await page.getByLabel('Page de destination', { exact: true }).selectOption({ label: '3 · Faites place à vos idées' });
  await page.getByRole('button', { name: 'Importer une transition spécifique', exact: true }).click();
  await page.getByTestId('media-input').setInputFiles(path.resolve('public/transitions/01-02.mp4'));
  await expect(page.getByLabel('Transition spécifique', { exact: true })).not.toHaveValue('');
  await page.getByRole('button', { name: 'Tester l’action', exact: true }).click();
  await expect(page.locator('.action-video')).toBeVisible();
  await expect(page.locator('.preview-heading')).toContainText('Page 3');
  await expect(page.locator('.action-video')).toHaveCount(0);
  await edit(page);
  await page.getByRole('button', { name: 'Sélectionner le calque Action', exact: true }).click();
  await page.getByLabel('Type d’action', { exact: true }).selectOption('background');
  await page.getByLabel('Arrière-plan de l’action', { exact: true }).selectOption({ label: 'Variante : Océan' });
  await saved(page);
  const original = await record(page);
  await page.evaluate(() => new Promise(resolve => {
    const request = indexedDB.open('presentation-studio', 1);
    request.onsuccess = () => {
      const db = request.result; const tx = db.transaction('documents', 'readwrite'); const store = tx.objectStore('documents');
      store.get('current').onsuccess = event => {
        const document = event.target.result; document.version = 3; document.privateMetadata = 'À préserver';
        for (const page of document.pages) { delete page.states; delete page.initialStateId; for (const button of page.buttons) delete button.action; }
        store.put(document, 'current');
      };
      tx.oncomplete = () => { db.close(); resolve(); };
    };
  }));
  await page.reload(); await saved(page);
  const migrated = await record(page);
  expect(migrated.version).toBe(19); expect(migrated.privateMetadata).toBe('À préserver');
  expect(migrated.pages).toEqual(original.pages);
  expect(migrated.media.map(item => [item.id, item.blob.size])).toEqual(original.media.map(item => [item.id, item.blob.size]));
  await page.locator('.page-thumbnail').nth(1).click();
  await page.getByRole('button', { name: 'Tester les interactions', exact: true }).click(); await button(page).click();
  await expect(button(page)).toHaveAttribute('aria-pressed', 'true');
});
