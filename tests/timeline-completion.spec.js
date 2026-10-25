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
