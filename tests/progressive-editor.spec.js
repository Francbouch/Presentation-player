import {test,expect} from '@playwright/test';
import {alignItems,boundsOf,visualBounds} from '../src/editorGeometry.js';
import {alignSelection} from '../src/visualGroups.js';
const saved=p=>expect(p.locator('.save-status')).toContainText('✓ Sauvegardé');
async function start(p){await p.goto('/');await saved(p);}
async function record(p){return p.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('presentation-studio',1);r.onsuccess=()=>{const db=r.result,t=db.transaction('documents'),g=t.objectStore('documents').get('current');g.onsuccess=()=>resolve(g.result);t.oncomplete=()=>db.close();};}));}
async function add(p,type='Rectangle'){await p.getByRole('button',{name:`+ ${type}`,exact:true}).click();await saved(p);}
test('phase 1 : référentiel objet, centres et groupes sans déformation',()=>{
 const items=[{id:'a',x:.1,y:.1,width:.1,height:.1},{id:'b',x:.3,y:.3,width:.2,height:.1},{id:'c',x:.8,y:.5,width:.1,height:.1}];
 const aligned=alignItems(items,'left','key');expect(aligned.a.x).toBeCloseTo(.1);expect(aligned.b.x).toBeCloseTo(.1);
 const distributed=alignItems(items,'distributeCentersX');expect(distributed.b.x+.1).toBeCloseTo(.5);
 const spaced=alignItems(items,'spacingX','selection',30);expect(spaced.b.x-(spaced.a.x+items[0].width)).toBeCloseTo(30/1920);
 const grouped=alignSelection(items,[{id:'g',children:['a','b']}],'left','slide');expect(grouped.b.x-grouped.a.x).toBeCloseTo(.2);
});
test('phase 1 : commandes visuelles, une opération annulable',async({page})=>{
 await start(page);await add(page);await add(page);await add(page);await page.locator('.editor').focus();await page.keyboard.press('Control+a');await page.getByLabel('Référentiel d’alignement',{exact:true}).selectOption('key');await page.getByRole('button',{name:'Aligner à gauche',exact:true}).click();await saved(page);await page.getByRole('button',{name:'Distribuer les centres horizontalement',exact:true}).click();await saved(page);await page.getByRole('button',{name:'↶ Annuler',exact:true}).click();await saved(page);expect((await record(page)).pages[0].layers).toHaveLength(3);
});
