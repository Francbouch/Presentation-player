import {test,expect} from '@playwright/test';
import JSZip from 'jszip';
import fs from 'node:fs/promises';
import {createInteractiveButton,emptyPage,migrateDocument,normalizeDocument} from '../src/document.js';
import {validateButtonAppearance} from '../src/buttonAppearance.js';
const saved=p=>expect(p.locator('.save-status')).toContainText('✓ Sauvegardé');
async function record(p){return p.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('presentation-studio',1);r.onsuccess=()=>{const db=r.result,t=db.transaction('documents'),g=t.objectStore('documents').get('current');g.onsuccess=()=>resolve(g.result);t.oncomplete=()=>db.close();};}));}
async function start(p){await p.goto('/');await saved(p);}
async function add(p){await p.getByRole('button',{name:'+ Bouton',exact:true}).click();await p.getByLabel('Nom du bouton',{exact:true}).fill('Choisir');await p.getByLabel('Type d’action',{exact:true}).selectOption('navigate');await p.getByLabel('Page de destination',{exact:true}).selectOption({index:2});await saved(p);}
async function open(p,name){const s=p.locator('.button-customization > details > summary').getByText(name,{exact:true});if(!await s.evaluate(el=>el.parentElement.open))await s.click();}
const target=p=>p.locator('.editor-preview .layer-button').filter({has:p.locator('.button-visual')});
async function png(p){return {name:'icone.png',mimeType:'image/png',buffer:Buffer.from(await p.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.fillStyle='#ff0000';x.fillRect(8,8,48,48);return c.toDataURL().split(',')[1];}),'base64')};}

test('migration additive v16 : boutons inchangés, métadonnées et paramètres invalides',()=>{
 const button=createInteractiveButton(1),page={...emptyPage(1),buttons:[button],layerOrder:[button.id]},doc={...normalizeDocument({version:16,pages:[page],media:[],transitions:[],privateMetadata:{keep:true}}),version:16};
 const before=structuredClone(doc);const migrated=migrateDocument(doc);expect(migrated.version).toBe(26);expect(migrated.pages).toEqual(before.pages);expect(migrated.privateMetadata).toEqual(before.privateMetadata);expect(button.buttonShape).toBeUndefined();
 expect(()=>validateButtonAppearance({pages:[{buttons:[{...button,buttonShape:'triangle'}]}]})).toThrow();
});

test('formes : identité, actions, dimensions, cercle explicite, ellipse et annuler/rétablir',async({page})=>{
 await start(page);await add(page);const original=(await record(page)).pages[0].buttons[0];
 for(const shape of ['rectangle','rounded','ellipse']){await page.getByLabel('Forme du bouton',{exact:true}).selectOption(shape);await saved(page);const b=(await record(page)).pages[0].buttons[0];expect(b.id).toBe(original.id);expect(b.action).toEqual(original.action);for(const k of ['x','y','width','height','rotation','visible'])expect(b[k]).toEqual(original[k]);}
 await page.getByRole('button',{name:'Créer un cercle parfait',exact:true}).click();await saved(page);const circle=(await record(page)).pages[0].buttons[0];expect(circle.width*1920).toBeCloseTo(circle.height*1080,8);
 await page.getByLabel('Diamètre du cercle (px)',{exact:true}).fill('200');await saved(page);expect((await record(page)).pages[0].buttons[0].width*1920).toBeCloseTo(200,8);
 await page.getByRole('button',{name:'↶ Annuler',exact:true}).click();await saved(page);expect((await record(page)).pages[0].buttons[0]).toEqual(circle);
 await page.getByRole('button',{name:'↷ Rétablir',exact:true}).click();await saved(page);expect((await record(page)).pages[0].buttons[0].height*1080).toBeCloseTo(200,8);
 await page.getByLabel('Largeur du bouton (%)',{exact:true}).fill('20');await saved(page);await expect(target(page).locator('.button-paint')).toHaveCSS('border-top-left-radius','50%');
});

for(const shape of ['ellipse','rounded','rectangle'])test(`zone cliquable réelle : ${shape}, fond transparent, Test et plein écran`,async({page})=>{
 await start(page);await add(page);await page.getByLabel('Forme du bouton',{exact:true}).selectOption(shape);await open(page,'Apparence');await page.getByLabel('Fond transparent',{exact:true}).check();if(shape==='rounded')await page.getByLabel('Coins arrondis',{exact:true}).fill('80');await saved(page);
 await page.getByRole('button',{name:'Tester les interactions',exact:true}).click();
 const b=await target(page).boundingBox();await page.mouse.click(b.x+1,b.y+1);
 if(shape==='rectangle'){await expect(target(page)).toHaveCount(0);return;}
 await expect(target(page)).toHaveCount(1);await expect(target(page).locator('.button-paint')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
 await page.mouse.click(b.x+b.width/2,b.y+b.height/2);await expect(target(page)).toHaveCount(0);
 await page.reload();await saved(page);await page.getByRole('button',{name:'Présentation',exact:true}).click();await page.keyboard.press('f');await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
 const paint=page.locator('.layer-button .button-paint'),bounds=await paint.boundingBox();await page.mouse.click(bounds.x+1,bounds.y+1);await expect(paint).toHaveCount(1);await page.mouse.click(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await expect(paint).toHaveCount(0);
});

test('image masquée, rotation, bordure, effets, copie et persistance ZIP',async({page,browser},info)=>{
 await start(page);await add(page);await page.getByLabel('Forme du bouton',{exact:true}).selectOption('ellipse');
 await page.getByRole('button',{name:'Importer / remplacer l’image du bouton',exact:true}).click();await page.getByTestId('media-input').setInputFiles(await png(page));await saved(page);
 await page.getByLabel('Rotation de l’image du bouton (°)',{exact:true}).fill('35');await page.getByLabel('Ajustement de l’image du bouton',{exact:true}).selectOption('cover');await open(page,'Apparence');await page.getByLabel('Bordure du bouton HEX',{exact:true}).fill('#00ff00');await page.getByLabel('Épaisseur de bordure',{exact:true}).fill('8');await page.getByLabel('Opacité de la bordure du bouton (%)',{exact:true}).fill('50');await open(page,'Effets interactifs');await page.getByLabel('Au survol',{exact:true}).selectOption('glow');await saved(page);
 await expect(target(page).locator('.button-shape-border')).toHaveCSS('border-top-color','rgba(0, 255, 0, 0.5)');await expect(target(page).locator('.button-image-clip img')).toHaveAttribute('style',/rotate\(35deg\)/);
 await page.getByRole('button',{name:'Tester les interactions',exact:true}).click();await target(page).locator('.button-paint').hover();await expect(target(page).locator('.button-glow')).toHaveCSS('opacity','1');await expect(target(page).locator('.button-glow')).toHaveCSS('border-top-left-radius','50%');await page.getByRole('button',{name:'Revenir au mode édition',exact:true}).click();
 await page.locator('.editor').focus();await page.keyboard.press('Control+a');await page.keyboard.press('Control+c');await page.keyboard.press('Control+v');await saved(page);let d=await record(page);expect(d.pages[0].buttons).toHaveLength(2);expect(d.pages[0].buttons[1].buttonShape).toBe('ellipse');expect(d.pages[0].buttons[1].imageCrop.rotation).toBe(35);expect(d.pages[0].buttons[1].imageId).toBe(d.pages[0].buttons[0].imageId);
 await page.reload();await saved(page);const original=await record(page);expect(original.pages).toEqual(d.pages);
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Fichier',exact:true}).click();await page.getByRole('menuitem',{name:'Sauvegarder mon projet',exact:true}).click();const file=info.outputPath('formes.zip');await (await downloading).saveAs(file);
 const context=await browser.newContext(),other=await context.newPage();await start(other);await other.getByTestId('zip-input').setInputFiles(file);await other.getByRole('dialog').getByRole('button',{name:'Confirmer',exact:true}).click();await saved(other);expect((await record(other)).pages).toEqual(original.pages);
 const zip=await JSZip.loadAsync(await fs.readFile(file)),config=JSON.parse(await zip.file('presentation.json').async('string'));expect(config.version).toBe(26);config.pages[0].buttons[0].buttonShape='invalid';zip.file('presentation.json',JSON.stringify(config));const invalid=info.outputPath('invalide.zip');await fs.writeFile(invalid,await zip.generateAsync({type:'nodebuffer'}));await other.getByTestId('zip-input').setInputFiles(invalid);await expect(other.getByText('Les paramètres d’apparence des boutons sont invalides. Votre projet est conservé.',{exact:true})).toBeVisible();expect((await record(other)).pages).toEqual(original.pages);await context.close();
});

test('dépôt d’image et de bibliothèque : média lié, géométrie et action conservées, vidéo refusée',async({page})=>{
 await start(page);await add(page);await page.getByLabel('Forme du bouton',{exact:true}).selectOption('ellipse');await saved(page);const before=(await record(page)).pages[0].buttons[0],file=await png(page);
 const dt=await page.evaluateHandle(({bytes,name})=>{const d=new DataTransfer();d.items.add(new File([Uint8Array.from(bytes)],name,{type:'image/png'}));return d;},{bytes:[...file.buffer],name:file.name});await target(page).dispatchEvent('drop',{dataTransfer:dt});await saved(page);await expect(target(page).locator('img')).toHaveCount(1);const d=await record(page),b=d.pages[0].buttons[0];expect(b.action).toEqual(before.action);expect(b.width).toBe(before.width);expect(b.imageId).toBeTruthy();
 await target(page).dispatchEvent('drop',{dataTransfer:await page.evaluateHandle(id=>{const d=new DataTransfer();d.setData('application/studio-media',id);return d;},d.media.find(m=>m.type.startsWith('image/')&&m.id!==b.imageId).id)});await saved(page);expect((await record(page)).pages[0].buttons[0].imageId).not.toBe(b.imageId);
 await target(page).dispatchEvent('drop',{dataTransfer:await page.evaluateHandle(()=>{const d=new DataTransfer();d.items.add(new File(['bad'],'film.mp4',{type:'video/mp4'}));return d;})});await expect(page.getByText('Choisissez une image pour le bouton. Les vidéos restent réservées aux cadres.',{exact:true})).toBeVisible();
});

test('cercle : proportions avec Maj, rotation et zone cliquable transformée',async({page})=>{
 await start(page);await add(page);await page.getByLabel('Forme du bouton',{exact:true}).selectOption('ellipse');await page.getByLabel('Diamètre du cercle (px)',{exact:true}).fill('180');await page.getByRole('button',{name:'⌖ Magnétisme actif',exact:true}).click();
 const handle=page.getByRole('button',{name:'Redimensionner le bouton Choisir',exact:true}),bounds=await handle.boundingBox();await page.keyboard.down('Shift');await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width/2+20,bounds.y+bounds.height/2+10,{steps:6});await page.mouse.up();await page.keyboard.up('Shift');await saved(page);
 let b=(await record(page)).pages[0].buttons[0];expect(b.width*1920/(b.height*1080)).toBeCloseTo(1,5);await page.getByLabel('Rotation du calque',{exact:true}).fill('35');await saved(page);b=(await record(page)).pages[0].buttons[0];expect(b.rotation).toBe(35);
 await page.getByRole('button',{name:'Tester les interactions',exact:true}).click();const stage=await page.locator('.editor-preview').boundingBox(),angle=b.rotation*Math.PI/180,cx=stage.x+(b.x+b.width/2)*stage.width,cy=stage.y+(b.y+b.height/2)*stage.height,dx=b.width*stage.width*.46,dy=b.height*stage.height*.46;
 await page.mouse.click(cx+dx*Math.cos(angle)-dy*Math.sin(angle),cy+dx*Math.sin(angle)+dy*Math.cos(angle));await expect(target(page)).toHaveCount(1);await page.mouse.click(cx,cy);await expect(target(page)).toHaveCount(0);
});
