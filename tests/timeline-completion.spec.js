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
