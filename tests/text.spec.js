import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import JSZip from 'jszip';

const saved = page => expect(page.locator('.save-status')).toHaveText('✓ Sauvegardé dans ce navigateur');
const frame = (page, id) => page.locator(`[data-layer-id="${id}"]`);
async function record(page, key = 'current') {
  return page.evaluate(key => new Promise((resolve, reject) => {
    const request = indexedDB.open('presentation-studio', 1);
    request.onsuccess = () => {
      const db = request.result; const tx = db.transaction('documents', 'readonly'); const get = tx.objectStore('documents').get(key);
      get.onsuccess = () => resolve(get.result); tx.oncomplete = () => db.close(); tx.onerror = () => reject(tx.error);
    }; request.onerror = () => reject(request.error);
  }), key);
}
async function start(page) { await page.goto('/'); await expect(page.locator('.page-thumbnail')).toHaveCount(3); await saved(page); }
async function addText(page, name = 'Annotation') {
  await page.getByRole('toolbar').getByRole('button', { name: '+ Texte', exact: true }).click();
  await page.getByLabel('Nom du calque', { exact: true }).fill(name);
  await saved(page);
  const id = (await record(page)).pages[0].layers.at(-1).id;
  await expect(frame(page, id)).toHaveClass(/is-selected/);
  return id;
}
async function write(page, id, text) {
  await frame(page, id).locator('.layer-content').dblclick();
  const editor = page.getByRole('textbox', { name: 'Modifier le texte Annotation', exact: true });
  await expect(editor).toBeFocused();
  await editor.press('Control+A'); await page.keyboard.insertText(text);
  return editor;
}
async function downloadZip(page, testInfo, name = 'texte.zip') {
  const promise = page.waitForEvent('download');
  await page.getByRole('button', {name:'Fichier',exact:true}).click(); await page.getByRole('menuitem', {name:'Sauvegarder mon projet',exact:true}).click();
  const file = testInfo.outputPath(name); await (await promise).saveAs(file); return file;
}

test('double-clic : texte multiligne, espaces/flèches, copier/coller brut, majuscules sans changer le contenu et Échap', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await start(page); const id = await addText(page);
  const before = (await record(page)).pages[0].layers[0];
  const editor = await write(page, id, 'Lit cabinet');
  await page.keyboard.press('End'); await page.keyboard.press('Space'); await page.keyboard.type('f');
  await page.keyboard.press('Enter'); await page.keyboard.type('Detail');
  await page.keyboard.press('ArrowLeft'); await page.keyboard.type('s');
  await expect(page.getByLabel('Contenu du texte', { exact: true })).toHaveValue('Lit cabinet f\nDetaisl');
  await editor.press('Control+A'); await editor.press('Control+C');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Lit cabinet f\nDetaisl');
  await page.evaluate(() => navigator.clipboard.writeText('Ligne 1\nLigne 2'));
  await editor.press('Control+V');
  await expect(page.getByLabel('Contenu du texte', { exact: true })).toHaveValue('Ligne 1\nLigne 2');
  await editor.evaluate(element => {
    const data = new DataTransfer(); data.setData('text/plain', '\nTexte sûr <b>brut</b>'); data.setData('text/html', '<img src=x onerror="window.badPaste=true"><b>gras</b>');
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await expect(page.getByLabel('Contenu du texte', { exact: true })).toHaveValue('Ligne 1\nLigne 2\nTexte sûr <b>brut</b>');
  expect(await page.evaluate(() => window.badPaste)).toBeUndefined();
  await editor.press('Control+A'); await editor.press('Backspace'); await editor.press('Enter'); await editor.press('Enter');
  await expect(page.getByLabel('Contenu du texte', { exact: true })).toHaveValue('\n\n');
  await page.keyboard.type('Suite');
  await expect(page.getByLabel('Contenu du texte', { exact: true })).toHaveValue('\n\nSuite');
  await editor.press('Escape'); await expect(editor).toHaveCount(0);
  await page.getByLabel('Afficher en majuscules', { exact: true }).check();
  const second = await write(page, id, 'texte minuscule');
  await page.keyboard.press('End'); await page.keyboard.type(' conserve');
  await second.press('Escape'); await saved(page);
  const after = (await record(page)).pages[0].layers[0];
  expect(after.content).toBe('texte minuscule conserve');
  expect([after.x, after.y, after.width, after.height]).toEqual([before.x, before.y, before.width, before.height]);
  await expect(frame(page, id).locator('.text-layout')).toHaveCSS('text-transform', 'uppercase');
  await page.reload(); await saved(page);
  await expect(frame(page, id).locator('.text-body')).toHaveText('texte minuscule conserve');
});

test('typographie : polices, taille, HEX, apparence, alignements, marges et cinq styles modifiables', async ({ page }, testInfo) => {
  await start(page); const id = await addText(page);
  await page.getByLabel('Contenu du texte', { exact: true }).fill('Mécanisme de précision\nUne annotation indépendante.');
  await page.getByLabel('Police du texte', { exact: true }).selectOption('georgia');
  await page.getByLabel('Taille du texte', { exact: true }).click();
  await page.getByLabel('Taille du texte', { exact: true }).press('Control+A');
  await page.keyboard.type('64');
  await expect(page.getByLabel('Taille du texte', { exact: true })).toHaveValue('64');
  await page.getByLabel('Couleur HEX du texte', { exact: true }).fill('#80d6dc');
  for (const name of ['Gras', 'Italique', 'Souligné']) await page.getByRole('button', { name, exact: true }).click();
  await page.getByLabel('Alignement du texte', { exact: true }).selectOption('center');
  await page.getByLabel('Alignement vertical du texte', { exact: true }).selectOption('bottom');
  await page.getByLabel('Interligne du texte', { exact: true }).fill('1.5');
  await page.getByLabel('Espacement des lettres', { exact: true }).fill('2');
  await page.getByLabel('Marges intérieures du texte', { exact: true }).fill('20');
  await saved(page);
  const layout = frame(page, id).locator('.text-layout');
  await expect(layout).toHaveCSS('font-size', '64px'); await expect(layout).toHaveCSS('font-weight', '700');
  await expect(layout).toHaveCSS('font-style', 'italic'); await expect(layout).toHaveCSS('text-align', 'center');
  await expect(layout).toHaveCSS('justify-content', 'flex-end'); await expect(layout).toHaveCSS('padding-top', '20px');
  await expect(layout).toHaveCSS('letter-spacing', '2px'); await expect(layout).toHaveCSS('line-height', '96px');
  expect(await layout.evaluate(element => getComputedStyle(element).textDecorationLine)).toContain('underline');
  await expect(frame(page, id).locator('.layer-content')).toHaveCSS('color', 'rgb(128, 214, 220)');
  await page.getByLabel('Couleur HEX du texte', { exact: true }).fill('invalid'); await page.getByLabel('Couleur HEX du texte', { exact: true }).blur();
  await expect(page.getByLabel('Couleur HEX du texte', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  expect((await record(page)).pages[0].layers[0].color).toBe('#80d6dc');
  await page.getByLabel('Couleur HEX du texte', { exact: true }).fill('#80d6dc');
  for (const [name, size] of [['Grand titre', 96], ['Sous-titre', 64], ['Texte normal', 48], ['Petite annotation', 28], ['Étiquette technique', 32]]) {
    await page.getByLabel('Style rapide du texte', { exact: true }).selectOption({ label: name });
    await expect(page.getByLabel('Taille du texte', { exact: true })).toHaveValue(String(size));
    await expect(frame(page, id).locator('.layer-content')).toHaveCSS('color', 'rgb(128, 214, 220)');
  }
  await page.getByLabel('Taille du texte', { exact: true }).fill('36');
  await expect(page.getByLabel('Style rapide du texte', { exact: true })).toHaveValue('custom');
  await page.getByLabel('Adapter la hauteur au contenu', { exact: true }).check();
  await saved(page);
  await page.screenshot({ path: testInfo.outputPath('texte-phase-3.png'), fullPage: true });
});

test('hauteur automatique, taille fixe, guides, alignement, déplacement, redimensionnement, rotation et verrouillage', async ({ page }) => {
  await start(page); const id = await addText(page);
  await page.getByLabel('Contenu du texte', { exact: true }).fill('Un\nDeux\nTrois\nQuatre\nCinq');
  await saved(page);
  await expect(frame(page, id).getByLabel('Le texte dépasse son bloc')).toBeVisible();
  await page.getByLabel('Adapter la hauteur au contenu', { exact: true }).check();
  await saved(page);
  expect((await record(page)).pages[0].layers[0].height).toBeCloseTo(300 / 1080, 4);
  await expect(frame(page, id).getByLabel('Le texte dépasse son bloc')).toHaveCount(0);
  await page.getByLabel('Contenu du texte', { exact: true }).fill('Un\nDeux\n'); await saved(page);
  expect((await record(page)).pages[0].layers[0].height).toBeCloseTo(180 / 1080, 4);
  await page.getByLabel('Contenu du texte', { exact: true }).fill('Un\nDeux\nTrois\nQuatre\nCinq'); await saved(page);
  await page.locator('.text-slide-alignment summary').click();
  await page.getByRole('button', { name: 'Centrer horizontalement', exact: true }).click();
  await page.getByRole('button', { name: 'Centrer verticalement', exact: true }).click();
  await saved(page);
  const centered = (await record(page)).pages[0].layers[0];
  expect(centered.x).toBeCloseTo((1 - centered.width) / 2, 5); expect(centered.y).toBeCloseTo((1 - centered.height) / 2, 5);
  let box = await frame(page, id).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 2, box.y + box.height / 2 + 2);
  await expect(page.locator('.layer-guide')).toHaveCount(2);
  await page.mouse.move(box.x + box.width / 2 + 45, box.y + box.height / 2 + 30, { steps: 5 }); await page.mouse.up(); await saved(page);
  const moved = (await record(page)).pages[0].layers[0]; expect(moved.x).toBeGreaterThan(centered.x);
  const handle = page.getByRole('button', { name: 'Redimensionner le calque Annotation', exact: true });
  box = await handle.boundingBox(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + 20, { steps: 5 }); await page.mouse.up(); await saved(page);
  expect((await record(page)).pages[0].layers[0].textStyle.autoHeight).toBe(false);
  await page.getByLabel('Rotation du calque', { exact: true }).fill('25'); await page.getByLabel('Opacité du calque', { exact: true }).fill('70');
  await expect(frame(page, id).locator('.layer-content')).toHaveCSS('opacity', '0.7');
  await saved(page); const beforeArrow=(await record(page)).pages[0].layers[0];
  await frame(page, id).locator('.layer-content').focus(); await page.keyboard.press('ArrowRight'); await saved(page);
  const arrow = (await record(page)).pages[0].layers[0]; expect((arrow.x-beforeArrow.x)*1920).toBeCloseTo(1, 6);
  await page.getByLabel('Verrouiller le déplacement', { exact: true }).check(); await saved(page);
  await frame(page, id).locator('.layer-content').dblclick(); await expect(page.locator('[contenteditable]')).toHaveCount(0);
  await expect(page.getByLabel('Contenu du texte', { exact: true })).toBeDisabled();
  await page.getByLabel('Verrouiller le déplacement', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Dupliquer le calque', exact: true }).click(); await saved(page);
  const copy = (await record(page)).pages[0].layers[1]; expect(copy.textStyle).toEqual(arrow.textStyle); expect(copy.content).toEqual(arrow.content);
  await page.getByRole('button', { name: 'Supprimer le calque', exact: true }).click(); await saved(page);
  await expect(frame(page, copy.id)).toHaveCount(0);
});

async function textMetrics(page, id) {
  return frame(page, id).locator('.text-layout').evaluate(element => {
    const body = element.querySelector('.text-body'); const range = document.createRange(); range.selectNodeContents(body);
    const style = getComputedStyle(element); const scale = Number(element.closest('.text-viewport').dataset.textScale);
    const slide = element.closest('.slide').getBoundingClientRect(); const bounds = element.closest('.layer-frame').getBoundingClientRect();
    return { logical: [parseFloat(style.width), body.scrollHeight, style.fontFamily, style.fontSize, style.fontWeight, style.fontStyle, style.lineHeight, style.letterSpacing, style.paddingTop, style.textAlign], lines: [...range.getClientRects()].length, fontRatio: parseFloat(style.fontSize) * scale / slide.width, geometry: [(bounds.x - slide.x) / slide.width, (bounds.y - slide.y) / slide.height, bounds.width / slide.width, bounds.height / slide.height] };
  });
}
test('même mise en page : éditeur, test, présentation, plein écran et fenêtre étroite', async ({ page }) => {
  await start(page); const id = await addText(page);
  await page.getByLabel('Contenu du texte', { exact: true }).fill('Le mécanisme du lit cabinet offre une ouverture précise et silencieuse.\nPlusieurs lignes, une seule mise en page.');
  await page.getByLabel('Police du texte', { exact: true }).selectOption('verdana'); await page.getByLabel('Taille du texte', { exact: true }).fill('40');
  await page.getByLabel('Interligne du texte', { exact: true }).fill('1.4'); await page.getByLabel('Marges intérieures du texte', { exact: true }).fill('16');
  await page.getByLabel('Adapter la hauteur au contenu', { exact: true }).check(); await saved(page);
  const baseline = await textMetrics(page, id); expect(baseline.lines).toBeGreaterThan(2);
  async function same() {
    await expect.poll(async () => (await textMetrics(page, id)).logical).toEqual(baseline.logical);
    await expect.poll(async () => (await textMetrics(page, id)).fontRatio).toBeCloseTo(baseline.fontRatio, 4);
    const metrics = await textMetrics(page, id); expect(metrics.lines).toBe(baseline.lines);
    expect(metrics.fontRatio).toBeCloseTo(baseline.fontRatio, 4);
    metrics.geometry.forEach((value, index) => expect(value).toBeCloseTo(baseline.geometry[index], 3));
  }
  await page.getByRole('button', { name: 'Tester les interactions', exact: true }).click(); await same();
  await page.getByRole('button', { name: 'Présentation', exact: true }).click(); await same();
  await page.keyboard.press('f'); await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true); await same();
  await page.keyboard.press('f');
  for (const width of [1024, 390, 1920]) { await page.setViewportSize({ width, height: 1080 }); await same(); }
});

test('texte masqué à hauteur automatique : actions/états, rendu calculé et test sans modification du document', async ({ page }) => {
  await start(page); const id = await addText(page);
  await page.getByLabel('Calque visible', { exact: true }).uncheck();
  await page.getByLabel('Contenu du texte', { exact: true }).fill('Détail un\nDétail deux\nDétail trois\nDétail quatre');
  await page.getByLabel('Taille du texte', { exact: true }).fill('80');
  await page.getByLabel('Adapter la hauteur au contenu', { exact: true }).check();
  await page.getByRole('toolbar').getByRole('button', { name: '+ Bouton', exact: true }).click();
  await page.getByLabel('Nom du calque', { exact: true }).fill('Détails'); await page.getByLabel('Type d’action', { exact: true }).selectOption('visibility');
  await page.getByLabel('Contrôler Annotation', { exact: true }).check(); await page.getByLabel('Opération de visibilité', { exact: true }).selectOption('toggle'); await saved(page);
  const original = await record(page);
  await page.getByRole('button', { name: 'Tester l’action', exact: true }).click(); await expect(frame(page, id)).toBeVisible();
  await expect.poll(() => frame(page, id).locator('.text-viewport').getAttribute('data-text-overflow')).toBe('false');
  expect((await record(page)).pages).toEqual(original.pages);
  await page.locator('.interactive-button-layer').getByRole('button', { name: 'Détails', exact: true }).click(); await expect(frame(page, id)).toHaveCount(0);
  await page.getByRole('button', { name: 'Revenir au mode édition', exact: true }).click();
  await page.getByRole('button', { name: '+ Ajouter un état', exact: true }).click(); await page.locator('.state-card').last().getByRole('textbox').fill('Annotations');
  await page.getByLabel('Visibilité de Annotation dans Annotations', { exact: true }).selectOption('show');
  await page.getByLabel('Type d’action', { exact: true }).selectOption('state'); await page.getByLabel('État à activer', { exact: true }).selectOption({ label: 'Annotations' }); await saved(page);
  const withState = await record(page);
  await page.getByRole('button', { name: 'Présentation', exact: true }).click();
  await page.locator('.interactive-button-layer').getByRole('button', { name: 'Détails', exact: true }).click(); await expect(frame(page, id)).toBeVisible();
  await expect.poll(() => frame(page, id).locator('.text-viewport').getAttribute('data-text-overflow')).toBe('false');
  expect((await record(page)).pages).toEqual(withState.pages);
});

test('saisie fluide : sauvegarde regroupée, ressources stables, annuler avant sauvegarde et ZIP du contenu récent', async ({ page }, testInfo) => {
  await start(page); const id = await addText(page);
  const src = await page.locator('.slide-background').getAttribute('src');
  await page.evaluate(() => {
    window.textWrites = 0; const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) { if (this.name === 'documents' && key === 'current') window.textWrites++; return put.call(this, value, key); };
  });
  await frame(page, id).locator('.layer-content').dblclick();
  const editor = page.getByRole('textbox', { name: 'Modifier le texte Annotation', exact: true });
  await editor.press('Control+A'); await page.keyboard.type('Une saisie continue sans recharger les images ou recopier les videos a chaque caractere.', { delay: 2 });
  await expect(page.locator('.save-status')).toHaveText('Sauvegarde…');
  await editor.press('Escape'); await saved(page);
  expect(await page.evaluate(() => window.textWrites)).toBeLessThanOrEqual(2);
  await expect(page.locator('.slide-background')).toHaveAttribute('src', src);
  const beforeUndo = (await record(page)).pages[0].layers[0].content;
  await page.getByRole('button', { name: '↶ Annuler', exact: true }).click(); await saved(page);
  expect((await record(page)).pages[0].layers[0].content).toBe('Votre texte');
  await page.getByRole('button', { name: '↷ Rétablir', exact: true }).click(); await saved(page);
  expect((await record(page)).pages[0].layers[0].content).toBe(beforeUndo);
  await page.getByLabel('Contenu du texte', { exact: true }).fill('Dernière modification avant sauvegarde');
  const file = await downloadZip(page, testInfo);
  const zip = await JSZip.loadAsync(await fs.readFile(file)); const config = JSON.parse(await zip.file('presentation.json').async('string'));
  expect(config.pages[0].layers[0].content).toBe('Dernière modification avant sauvegarde');
  await saved(page); await page.reload(); await saved(page);
  expect((await record(page)).pages[0].layers[0].content).toBe('Dernière modification avant sauvegarde');
  await page.getByRole('button', { name: 'Sélectionner le calque Annotation', exact: true }).click();
  await page.getByLabel('Contenu du texte', { exact: true }).fill('À annuler immédiatement');
  await page.getByRole('button', { name: '↶ Annuler', exact: true }).click(); await saved(page);
  await page.waitForTimeout(350); // Le timer ancien ne doit pas écraser l’annulation.
  expect((await record(page)).pages[0].layers[0].content).toBe('Dernière modification avant sauvegarde');
});

test('ZIP v5 : texte et styles intacts ; ZIP v4 compatible ; style invalide refusé sans remplacement', async ({ page, browser }, testInfo) => {
  await start(page); const id = await addText(page);
  await page.getByLabel('Contenu du texte', { exact: true }).fill('Annotation française\n« 120 mm » — <texte brut>');
  await page.getByLabel('Police du texte', { exact: true }).selectOption('mono'); await page.getByLabel('Taille du texte', { exact: true }).fill('36');
  await page.getByLabel('Couleur HEX du texte', { exact: true }).fill('#92c5ff');
  await page.getByLabel('Alignement du texte', { exact: true }).selectOption('right'); await page.getByLabel('Interligne du texte', { exact: true }).fill('1.6');
  await page.getByLabel('Marges intérieures du texte', { exact: true }).fill('12'); await page.getByRole('button', { name: 'Gras', exact: true }).click();
  await page.getByLabel('Rotation du calque', { exact: true }).fill('15'); await page.getByLabel('Opacité du calque', { exact: true }).fill('65'); await saved(page);
  const original = await record(page); const file = await downloadZip(page, testInfo);
  const context = await browser.newContext(); const other = await context.newPage(); await start(other);
  await other.getByTestId('zip-input').setInputFiles(file); await other.getByRole('dialog').getByRole('button', { name: 'Confirmer', exact: true }).click(); await saved(other);
  expect((await record(other)).pages).toEqual(original.pages); await other.reload(); await saved(other);
  expect((await record(other)).pages).toEqual(original.pages);
  await expect(frame(other, id).locator('.text-body')).toHaveText('Annotation française\n« 120 mm » — <texte brut>');
  const zip = await JSZip.loadAsync(await fs.readFile(file)); const config = JSON.parse(await zip.file('presentation.json').async('string'));
  expect(config.version).toBe(35); config.pages[0].layers[0].textStyle.font = 'police-inconnue'; zip.file('presentation.json', JSON.stringify(config));
  const bad = testInfo.outputPath('texte-invalide.zip'); await fs.writeFile(bad, await zip.generateAsync({ type: 'nodebuffer' }));
  await other.getByTestId('zip-input').setInputFiles(bad); await expect(other.locator('.editor-message')).toContainText('mise en forme du texte est invalide');
  expect((await record(other)).pages).toEqual(original.pages);
  config.version = 4; zip.file('presentation.json', JSON.stringify(config));
  const oldBad = testInfo.outputPath('texte-v4-invalide.zip'); await fs.writeFile(oldBad, await zip.generateAsync({ type: 'nodebuffer' }));
  await other.getByTestId('zip-input').setInputFiles(oldBad); await expect(other.locator('.editor-message')).toContainText('mise en forme du texte est invalide');
  expect((await record(other)).pages).toEqual(original.pages);
  config.privateMetadata = { client: 'Conserver ce projet' };
  for (const page of config.pages) for (const layer of page.layers) delete layer.textStyle;
  zip.file('presentation.json', JSON.stringify(config)); const legacy = testInfo.outputPath('ancien-texte-v4.zip'); await fs.writeFile(legacy, await zip.generateAsync({ type: 'nodebuffer' }));
  await other.getByTestId('zip-input').setInputFiles(legacy); await other.getByRole('dialog').getByRole('button', { name: 'Confirmer', exact: true }).click(); await saved(other);
  const restored = await record(other); expect(restored.version).toBe(35); expect(restored.privateMetadata).toEqual(config.privateMetadata);
  const text = restored.pages[0].layers[0];
  expect(text.content).toBe(original.pages[0].layers[0].content); expect(text.id).toBe(id); expect(text.color).toBe('#92c5ff');
  expect([text.x, text.y, text.width, text.height, text.rotation, text.opacity]).toEqual([original.pages[0].layers[0].x, original.pages[0].layers[0].y, original.pages[0].layers[0].width, original.pages[0].layers[0].height, 15, .65]);
  expect(text.textStyle).toMatchObject({ font: 'arial', fontSize: 48, bold: false, align: 'left', lineHeight: 1.25, letterSpacing: 0, padding: 0, autoHeight: false });
  expect(restored.media.map(item => [item.id, item.blob.size])).toEqual(original.media.map(item => [item.id, item.blob.size]));
  await context.close();
});

test('IndexedDB v4 : migration additive ; données de texte v5 illisibles conservées', async ({ page }) => {
  await start(page); const id = await addText(page); await page.getByLabel('Contenu du texte', { exact: true }).fill('Texte existant\nToujours présent'); await saved(page);
  const original = await record(page);
  async function alter(mode) {
    await page.evaluate(mode => new Promise(resolve => {
      const request = indexedDB.open('presentation-studio', 1);
      request.onsuccess = () => {
        const db = request.result; const tx = db.transaction('documents', 'readwrite'); const store = tx.objectStore('documents');
        store.get('current').onsuccess = event => {
          const document = event.target.result;
          if (mode === 'v4') { document.version = 4; document.privateMetadata = 'À conserver'; for (const page of document.pages) for (const layer of page.layers) delete layer.textStyle; }
          else document.pages[0].layers[0].textStyle.fontSize = -1;
          store.put(document, 'current');
        }; tx.oncomplete = () => { db.close(); resolve(); };
      };
    }), mode);
  }
  await alter('v4'); await page.reload(); await saved(page);
  const migrated = await record(page); expect(migrated.version).toBe(35); expect(migrated.privateMetadata).toBe('À conserver');
  expect(migrated.pages).toEqual(original.pages); expect(migrated.media.map(item => [item.id, item.blob.size])).toEqual(original.media.map(item => [item.id, item.blob.size]));
  await expect(frame(page, id).locator('.text-body')).toHaveText('Texte existant\nToujours présent');
  await alter('invalid'); const invalid = await record(page); await page.reload();
  await expect(page.getByRole('alert')).toContainText('mise en forme du texte est invalide');
  expect((await record(page)).pages).toEqual(invalid.pages); expect((await record(page)).privateMetadata).toBe('À conserver');
});
