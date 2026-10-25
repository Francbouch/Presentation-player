import fs from 'node:fs/promises';
import JSZip from 'jszip';
import {test,expect} from '@playwright/test';
const saved=p=>expect(p.locator('.save-status')).toContainText('Sauvegardé');
const scene=p=>p.locator('.editor-preview .interactive-button-layer');
const timeline=p=>p.locator('.editor-preview .milestone-timeline');
async function start(p){await p.goto('/');await saved(p);}
async function add(p){await p.getByRole('button',{name:'+ Ligne du temps',exact:true}).click();await saved(p);}
async function record(p){await saved(p);return p.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('presentation-studio',1);r.onsuccess=()=>{const db=r.result,t=db.transaction('documents'),q=t.objectStore('documents').get('current');q.onsuccess=()=>resolve(q.result);t.oncomplete=()=>db.close();};}));}
async function testMode(p){await p.getByRole('button',{name:'Tester les interactions',exact:true}).click();}
async function editMode(p){await p.getByRole('button',{name:'Revenir au mode édition',exact:true}).click();}
const step=(p,n)=>timeline(p).getByRole('button',{name:`Étape Étape ${n}`,exact:true});
async function select(p,n){await step(p,n).evaluate(e=>e.click());}
test('fond transparent indépendant, calque arrière et retour au fond coloré',async({page})=>{
 await start(page);await page.getByRole('button',{name:'+ Rectangle',exact:true}).click();await saved(page);await add(page);
 await page.getByText('Apparence de la ligne du temps',{exact:true}).click();const old=await record(page),layer=old.pages[0].layers.find(l=>l.type==='milestoneTimeline');await page.getByLabel('Arrière-plan transparent',{exact:true}).check();await expect(timeline(page)).toHaveCSS('background-color','rgba(0, 0, 0, 0)');await expect(scene(page).locator('.layer-rectangle')).toBeVisible();
 expect((await record(page)).pages[0].layers.find(l=>l.id===layer.id).opacity).toBe(1);await page.getByLabel('Arrière-plan transparent',{exact:true}).uncheck();await expect(timeline(page)).toHaveCSS('background-color','rgb(23, 25, 35)');
 await testMode(page);await select(page,1);await expect(scene(page).getByRole('dialog')).toHaveCSS('background-color','rgb(36, 38, 50)');
});
test('débordement Timeline uniquement : champs, souris, poignées hors page, duplication et clipping',async({page})=>{
 await start(page);await add(page);await page.getByLabel('Largeur du calque (%)',{exact:true}).fill('400');await page.getByLabel('Hauteur du calque (%)',{exact:true}).fill('250');await page.getByLabel('X du calque (%)',{exact:true}).fill('-120');await page.getByLabel('Y du calque (%)',{exact:true}).fill('-60');await saved(page);
 let d=await record(page),l=d.pages[0].layers[0];expect(l).toMatchObject({width:4,height:2.5,x:-1.2,y:-.6});
 await page.getByRole('button',{name:'Ajuster la sélection',exact:true}).click();const handle=scene(page).locator('.timeline-frame .handle-se');await expect(handle).toBeInViewport();const b=await handle.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+25,b.y+b.height/2+20,{steps:5});await page.mouse.up();await saved(page);expect((await record(page)).pages[0].layers[0].width).toBeGreaterThan(4);
 await page.getByRole('button',{name:'Dupliquer le calque',exact:true}).click();await saved(page);expect((await record(page)).pages[0].layers[1].width).toBeGreaterThan(4);
 await testMode(page);await expect(page.locator('.stage.editor-preview')).toHaveCSS('overflow','hidden');await page.getByRole('button',{name:'Présentation',exact:true}).click();await expect(page.locator('.player .stage')).toHaveCSS('overflow','hidden');
});
test('modèle : limites étendues ciblées et géométrie des autres calques conservée',async()=>{
 const {createLayer,emptyPage,validatePageLayers}=await import('../src/document.js');const {translated}=await import('../src/manipulation.js');const l={...createLayer('milestoneTimeline'),x:-2,y:-3,width:4,height:5},p={...emptyPage(1),layers:[l],layerOrder:[l.id]};expect(()=>validatePageLayers(p,()=>true)).not.toThrow();expect(translated([l],-1,2)[l.id]).toEqual({x:-3,y:-1});const rectangle={...createLayer('rectangle'),x:-2};expect(()=>validatePageLayers({...p,layers:[rectangle],layerOrder:[rectangle.id]},()=>true)).toThrow();
});
test('zoom et fiche indépendants, combinaison puis compatibilité des anciens clics',async({page})=>{
 await start(page);await add(page);await page.getByLabel('Zoomer sur l’étape',{exact:true}).check();await page.getByLabel('Afficher la fiche d’information',{exact:true}).check();await saved(page);await testMode(page);await select(page,1);await expect(timeline(page)).toHaveAttribute('data-zoom','1.8');await expect(scene(page).getByRole('dialog')).toBeVisible();
 await editMode(page);await page.getByLabel('Afficher la fiche d’information',{exact:true}).uncheck();await saved(page);await testMode(page);await select(page,1);await expect(timeline(page)).toHaveAttribute('data-zoom','1.8');await expect(scene(page).getByRole('dialog')).toHaveCount(0);
 await editMode(page);await page.getByLabel('Clic sur l’étape',{exact:true}).selectOption('card');await saved(page);await testMode(page);await select(page,1);await expect(timeline(page)).toHaveAttribute('data-zoom','1');await expect(scene(page).getByRole('dialog')).toBeVisible();
});
async function drag(p,locator,dx,dy){const b=await locator.boundingBox();await p.mouse.move(b.x+b.width/2,b.y+b.height/2);await p.mouse.down();await p.mouse.move(b.x+b.width/2+dx,b.y+b.height/2+dy,{steps:8});await p.mouse.up();await saved(p);}
test('fiches : déplacement et redimensionnement visuels, héritage et surcharge individuelle, Undo/Redo',async({page})=>{
 await start(page);await add(page);const original=(await record(page)).pages[0].layers[0];await page.getByRole('button',{name:'Modifier la fiche dans la page',exact:true}).click();await expect(page.getByRole('button',{name:'Terminer la fiche',exact:true})).toBeVisible();
 await drag(page,page.getByRole('button',{name:'Déplacer la fiche',exact:true}),32,18);let common=(await record(page)).pages[0].layers[0].timeline.design.cardLayout;expect(common.x).toBeGreaterThan(original.timeline.design.cardLayout.x);expect(common.y).toBeGreaterThan(original.timeline.design.cardLayout.y);
 await drag(page,page.getByRole('button',{name:'Redimensionner la fiche se',exact:true}),25,20);let after=(await record(page)).pages[0].layers[0];expect(after.timeline.design.cardLayout.width).toBeGreaterThan(common.width);
 await page.getByRole('button',{name:'Terminer la fiche',exact:true}).click();await page.locator('.editor').focus();await page.keyboard.press('Control+z');await saved(page);expect((await record(page)).pages[0].layers[0].timeline.design.cardLayout).toEqual(common);await page.keyboard.press('Control+Shift+z');await saved(page);expect((await record(page)).pages[0].layers[0].timeline.design.cardLayout).toEqual(after.timeline.design.cardLayout);
 await page.getByRole('button',{name:'Modifier l’étape Étape 2',exact:true}).click();await page.getByLabel('Disposition de la fiche de l’étape',{exact:true}).selectOption('individual');await page.getByLabel('X de la fiche (%)',{exact:true}).fill('60');await page.getByLabel('Largeur de la fiche (%)',{exact:true}).fill('30');await saved(page);let d=await record(page),individual=d.pages[0].layers[0].timeline.steps[1].cardLayout;expect(individual.x).toBe(.6);
 await page.getByRole('button',{name:'Modifier l’étape Étape 1',exact:true}).click();await page.getByLabel('X de la fiche (%)',{exact:true}).fill('10');await saved(page);d=await record(page);expect(d.pages[0].layers[0].timeline.steps[1].cardLayout).toEqual(individual);
 await page.getByRole('button',{name:'Modifier l’étape Étape 2',exact:true}).click();await page.getByRole('button',{name:'Réinitialiser la disposition individuelle',exact:true}).click();await saved(page);expect((await record(page)).pages[0].layers[0].timeline.steps[1].cardLayout).toBeNull();
 await page.reload();await saved(page);await testMode(page);await select(page,2);const box=await scene(page).locator('.milestone-card-position').boundingBox(),stage=await scene(page).boundingBox();expect(box.x).toBeCloseTo(stage.x+.1*stage.width,0);
});
async function centredInSlide(p,n,layout,zoom=false,scope=timeline(p)){
 await expect.poll(()=>scope.evaluate((r,{n,layout,zoom})=>{const slide=r.closest('.interactive-button-layer').getBoundingClientRect(),b=[...r.querySelectorAll('.milestone-node')].find(e=>e.getAttribute('aria-label')===`Étape Étape ${n}`)?.getBoundingClientRect();return b?Math.max(layout==='vertical'&&!zoom?0:Math.abs(b.x+b.width/2-slide.x-slide.width/2),layout==='horizontal'&&!zoom?0:Math.abs(b.y+b.height/2-slide.y-slide.height/2)):999;},{n,layout,zoom})).toBeLessThan(2);
}
for(const layout of ['horizontal','vertical','zigzag'])test(`diapositive : centrage ${layout} hors page, mouvement, zoom + fiche fixe et révélation`,async({page})=>{
 await start(page);await add(page);await page.getByLabel('Disposition de la ligne du temps',{exact:true}).selectOption(layout);await page.getByLabel('Largeur du calque (%)',{exact:true}).fill(layout==='vertical'?'70':'400');await page.getByLabel('Hauteur du calque (%)',{exact:true}).fill(layout==='horizontal'?'50':'300');await page.getByLabel('X du calque (%)',{exact:true}).fill(layout==='vertical'?'15':'-100');await page.getByLabel('Y du calque (%)',{exact:true}).fill(layout==='horizontal'?'25':'-80');await page.getByLabel('Centrer automatiquement l’étape active',{exact:true}).check();await page.getByLabel('Révélation progressive',{exact:true}).check();await page.getByLabel('Zoomer sur l’étape',{exact:true}).check();await saved(page);const original=(await record(page)).pages;
 await testMode(page);await centredInSlide(page,1,layout);await select(page,1);await centredInSlide(page,1,layout,true);await expect(scene(page).getByRole('dialog')).toBeVisible();const before=await scene(page).locator('.milestone-card-position').boundingBox();
 await page.setViewportSize({width:1280,height:1000});await centredInSlide(page,1,layout,true);const sceneBox=await scene(page).boundingBox(),card=await scene(page).locator('.milestone-card-position').boundingBox();expect(card.width/sceneBox.width).toBeCloseTo(.24,3);
 await page.getByRole('button',{name:'Fermer la fiche',exact:true}).click();await page.locator('.editor').focus();await page.keyboard.press('Space');await centredInSlide(page,2,layout,true);await expect(timeline(page)).toHaveCount(1);expect((await record(page)).pages).toEqual(original);
});
