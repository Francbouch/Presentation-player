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

import {folderFlags,validateFolders,moveIntoFolder,folderMembers} from '../src/layerFolders.js';
import {createLayer,emptyPage,orderedLayers,duplicatePageModel,normalizeDocument} from '../src/document.js';
test('phase 2 : héritage non destructif, dossiers imbriqués, cycle rejeté et duplication',()=>{
 const a=createLayer('rectangle',1),b=createLayer('circle',2),p=normalizeDocument({version:18,media:[],transitions:[],pages:[{...emptyPage(1),layers:[a,b]}]}).pages[0];p.layerFolders=[{id:'root',name:'Racine',parentId:null,children:[a.id],visible:true,locked:true,collapsed:false},{id:'child',name:'Enfant',parentId:'root',children:[b.id],visible:false,locked:false,collapsed:false}];validateFolders(p);expect(folderFlags(p,b.id)).toEqual({folderLocked:true,folderHidden:true});expect(orderedLayers(p).find(l=>l.id===b.id).locked).toBe(true);expect(b.locked).toBe(false);p.layerFolders[0].locked=false;expect(orderedLayers(p).find(l=>l.id===b.id).locked).toBe(false);expect(moveIntoFolder(p,[a.id],'child').layerFolders[1].children).toContain(a.id);const copy=duplicatePageModel(p);validateFolders(copy);expect(folderMembers(copy,copy.layerFolders[0].id)).toHaveLength(2);p.layerFolders[0].parentId='child';expect(()=>validateFolders(p)).toThrow('Hiérarchie');
});
test('phase 2 : rangement visuel, verrou hérité, état visible conservé et retrait sans perte',async({page})=>{
 await start(page);await add(page);const before=(await record(page)).pages[0].layers[0];await page.getByRole('button',{name:'+ Dossier de calques',exact:true}).click();await page.getByRole('button',{name:'Ranger la sélection',exact:true}).click();await saved(page);let doc=await record(page);expect(doc.pages[0].layerFolders[0].children).toEqual([before.id]);await page.getByRole('button',{name:'Verrouiller le dossier Nouveau dossier',exact:true}).click();await saved(page);await expect(page.getByLabel('X du calque (%)',{exact:true})).toBeDisabled();await page.locator('.editor').focus();await page.keyboard.press('Delete');await saved(page);expect((await record(page)).pages[0].layers).toHaveLength(1);await page.getByRole('button',{name:'Déverrouiller le dossier Nouveau dossier',exact:true}).click();await page.getByRole('button',{name:'Masquer le dossier Nouveau dossier',exact:true}).click();await saved(page);expect((await record(page)).pages[0].layers[0].visible).toBe(before.visible);await page.getByRole('button',{name:'Afficher le dossier Nouveau dossier',exact:true}).click();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Retirer le dossier',exact:true}).click();await saved(page);expect((await record(page)).pages[0].layers[0]).toEqual(before);
});
