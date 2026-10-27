import fs from 'node:fs/promises';
import JSZip from 'jszip';
import {test,expect} from '@playwright/test';
import {timelineData,timelineStep,timelineGeometry,timelineItems,validateMilestoneTimeline,timelineProgress} from '../src/milestoneTimeline.js';
import {createParallel,dissolveParallel,detachParallel,reconcileParallel,timelineUnits,groupCentre} from '../src/timelineParallel.js';
const saved=p=>expect(p.locator('.save-status')).toContainText('Sauvegardé');
const scene=p=>p.locator('.editor-preview .interactive-button-layer');
const root=p=>scene(p).locator('.milestone-timeline');
const button=(p,name)=>p.getByRole('button',{name,exact:true});
async function record(p){await saved(p);return p.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('presentation-studio',1);r.onsuccess=()=>{const db=r.result,t=db.transaction('documents'),q=t.objectStore('documents').get('current');q.onsuccess=()=>resolve(q.result);t.oncomplete=()=>db.close();};}));}
async function start(p){await p.goto('/');await saved(p);await button(p,'+ Ligne du temps').click();await saved(p);}
async function fixture(p,{count=6,layout='horizontal',reveal=true,autoCenter=true,phases=false,groups=[[1,2,3]],titles=false,withMedia=false}={}){
 await start(p);const doc=await record(p),l=doc.pages[0].layers[0];
 let t=timelineData();t.steps=Array.from({length:count},(_,i)=>({...timelineStep(i+1),...(titles?{titleOffset:{x:30,y:55}}:{})}));t.design={...t.design,layout,reveal,autoCenter,centerDuration:700,zoom:false,backgroundTransparent:true};
 if(withMedia){t.steps[1].imageId=doc.media.find(m=>m.type.startsWith('image/'))?.id||null;t.steps[1].videoId=doc.media.find(m=>m.type.startsWith('video/'))?.id||null;t.steps[1].cardLayout={x:.2,y:.2,width:.3,height:.5};}
 if(phases){t.phases=[{id:'production',name:'Production',color:'#9988dd',collapsed:false}];t.steps=t.steps.map(s=>({...s,phaseId:'production'}));}
 for(const indexes of groups)t=createParallel(t,indexes.map(i=>t.steps[i].id),'Préparation '+indexes[0]);
 l.timeline=t;l.x=.1;l.y=.12;l.width=.8;l.height=.65;
 await p.evaluate(layer=>new Promise(resolve=>{const r=indexedDB.open('presentation-studio',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('documents','readwrite'),store=tx.objectStore('documents'),q=store.get('current');q.onsuccess=()=>{const doc=q.result;doc.pages[0].layers[0]=layer;store.put(doc,'current');};tx.oncomplete=()=>{db.close();resolve();};};}),l);
 await p.reload();await saved(p);return {doc,l,t};
}
async function testMode(p){await button(p,'Tester les interactions').click();await p.locator('.editor').focus();}
async function choose(p,n){await root(p).getByRole('button',{name:'Étape Étape '+n,exact:true}).evaluate(e=>e.click());}
async function centre(p,ids){return root(p).evaluate((e,ids)=>{const dots=ids.map(id=>e.querySelector('[data-step-id="'+id+'"] .milestone-dot').getBoundingClientRect()),host=e.closest('.interactive-button-layer').getBoundingClientRect();return {x:(Math.min(...dots.map(r=>r.left))+Math.max(...dots.map(r=>r.right)))/2-(host.left+host.width/2),y:(Math.min(...dots.map(r=>r.top))+Math.max(...dots.map(r=>r.bottom)))/2-(host.top+host.height/2)};},ids);}

test('modèle parallèle : références stables, dissolution, singleton, ordre et validation stricte',()=>{
 const base=timelineData();base.steps.push(timelineStep(4));base.steps[1].unknown={keep:true};let t=createParallel(base,base.steps.slice(1,3).map(s=>s.id));
 expect(t.steps).toEqual(base.steps);expect(timelineUnits(t).map(u=>u.kind)).toEqual(['step','parallel','step']);validateMilestoneTimeline({type:'milestoneTimeline',timeline:t});
 expect(dissolveParallel(t,t.parallelGroups[0].id).steps).toEqual(base.steps);
 const detached=detachParallel(t,t.parallelGroups[0].id,t.steps[1].id);expect(detached.parallelGroups).toEqual([]);expect(detached.steps).toEqual(base.steps);validateMilestoneTimeline({type:'milestoneTimeline',timeline:detached});
 for(const patch of [{stepIds:['missing','other']},{stepIds:[t.steps[1].id,t.steps[1].id]},{spacing:NaN},{opacity:101},{style:'bad'}])expect(()=>validateMilestoneTimeline({type:'milestoneTimeline',timeline:{...t,parallelGroups:[{...t.parallelGroups[0],...patch}]}})).toThrow();
 expect(()=>createParallel({...base,steps:base.steps.map((s,i)=>({...s,phaseId:i===2?'other':null}))},base.steps.slice(1,3).map(s=>s.id))).toThrow(/phases/);
 const reduced=reconcileParallel({...t,steps:t.steps.filter(s=>s.id!==t.steps[2].id)});expect(reduced.parallelGroups).toEqual([]);expect(timelineUnits(reduced)).toHaveLength(3);
});
for(const layout of ['horizontal','vertical','zigzag'])test('géométrie parallèle '+layout+' : 2/3/4 branches, extrémités et groupes successifs',()=>{
 for(const n of [2,3,4,12])for(const align of ['start','center','end']){
 let t=timelineData();t.steps=Array.from({length:n*2+2},(_,i)=>timelineStep(i+1));t.design.layout=layout;t.design.align=align;t=createParallel(t,t.steps.slice(0,n).map(s=>s.id));t=createParallel(t,t.steps.slice(n,n*2).map(s=>s.id));const item={width:.8,height:.6,timeline:t},g=timelineGeometry(item,timelineItems(t));
 expect(g.points).toHaveLength(t.steps.length);expect(g.segments.filter(s=>s.group)).toHaveLength(n*4);const branch=g.segments.find(s=>s.group),values=branch.d.match(/-?\d+(?:\.\d+)?/g).map(Number);if(layout==='vertical')expect(values[2]).toBe(values[0]);else expect(values[3]).toBe(values[1]);expect(g.units).toHaveLength(4);expect(new Set(g.points.map(p=>p.x+':'+p.y)).size).toBe(t.steps.length);
 expect(g.points.every(p=>Number.isFinite(p.x)&&p.x>=0&&p.y>=0&&p.x<=g.width&&p.y<=g.height)).toBe(true);
 const c=groupCentre(g.points,t.steps[0].id),c2=groupCentre(g.points,t.steps[n-1].id);expect([c.x,c.y]).toEqual([c2.x,c2.y]);
 expect(timelineProgress(g.points,t.steps[n].id,2,t.design)).toBeCloseTo(100/3);
 }
});

test('interface : créer, modifier, ajouter, réordonner, retirer, dissoudre et Undo/Redo',async({page})=>{
 await start(page);await page.getByLabel('Regrouper Étape 1',{exact:true}).check();await page.getByLabel('Regrouper Étape 2',{exact:true}).check();await button(page,'Créer un groupe d’étapes simultanées').click();await saved(page);
 let d=await record(page),t=d.pages[0].layers[0].timeline,g=t.parallelGroups[0];expect(g.stepIds).toHaveLength(2);const original=structuredClone(t.steps);
 await page.getByLabel('Nom du groupe '+g.id,{exact:true}).fill('Industrialisation');await saved(page);
 await button(page,'Ajouter une nouvelle branche à Industrialisation').click();await saved(page);expect((await record(page)).pages[0].layers[0].timeline.parallelGroups[0].stepIds).toHaveLength(3);
 await button(page,'Descendre la branche Étape 1').click();await saved(page);expect((await record(page)).pages[0].layers[0].timeline.parallelGroups[0].stepIds[1]).toBe(g.stepIds[0]);
 await button(page,'Retirer du groupe Étape 4').click();await saved(page);
 await button(page,'Dissoudre le groupe Industrialisation — conserver les étapes').click();await saved(page);expect((await record(page)).pages[0].layers[0].timeline.parallelGroups).toEqual([]);
 await page.getByRole('button',{name:/Annuler$/}).click();await saved(page);expect((await record(page)).pages[0].layers[0].timeline.parallelGroups).toHaveLength(1);
 await page.getByRole('button',{name:/Rétablir$/}).click();await saved(page);expect((await record(page)).pages[0].layers[0].timeline.steps.slice(0,3)).toEqual(original);
});
for(const layout of ['horizontal','vertical','zigzag'])test('lecture '+layout+' : Espace révèle le groupe entier, centre commun et fiches individuelles',async({page},info)=>{
 const {t}=await fixture(page,{layout});await testMode(page);await expect(root(page).locator('.milestone-node[aria-hidden="false"]')).toHaveCount(1);
 await page.keyboard.press('Space');await expect(root(page).locator('.milestone-node[aria-hidden="false"]')).toHaveCount(4);
 expect(await root(page).getAttribute('data-revealed-units')).toBe('2');
 const ids=t.parallelGroups[0].stepIds;await expect.poll(async()=>{const c=await centre(page,ids);return Math.abs(c.x)+Math.abs(c.y);}).toBeLessThan(3);
 await page.screenshot({path:info.outputPath('branches-'+layout+'.png')});
 const transform=await root(page).locator('.milestone-canvas').evaluate(e=>getComputedStyle(e).transform);
 await choose(page,3);await expect(scene(page).getByRole('dialog',{name:'Fiche Étape 3',exact:true})).toBeVisible();
 await expect.poll(()=>root(page).locator('.milestone-canvas').evaluate(e=>getComputedStyle(e).transform)).toBe(transform);
 await choose(page,2);await expect(scene(page).getByRole('dialog',{name:'Fiche Étape 2',exact:true})).toBeVisible();expect(await root(page).locator('.timeline-branch-connection[data-parallel-id] [class="milestone-branch-progress"]').first().getAttribute('stroke-dasharray')).toBe('100 100');
 await page.keyboard.press('Space');await expect(root(page).locator('.milestone-node[aria-hidden="false"]')).toHaveCount(5);expect(await root(page).getAttribute('data-revealed-units')).toBe('3');
});

test('réglages visuels : styles courbe/angles/droit, opacité, espacement et titres relatifs',async({page})=>{
 await start(page);for(const n of [1,2,3])await page.getByLabel('Regrouper Étape '+n,{exact:true}).check();await button(page,'Créer un groupe d’étapes simultanées').click();await saved(page);
 for(const style of ['rounded','straight','curved']){await page.getByLabel('Style des branches de Travaux parallèles',{exact:true}).selectOption(style);await saved(page);const paths=await root(page).locator('.timeline-branch-connection > path:first-child').evaluateAll(es=>es.map(e=>e.getAttribute('d')));expect(paths.some(d=>d.includes(style==='rounded'?'Q':style==='curved'?'C':'L'))).toBe(true);}
 await page.getByLabel('Opacité des branches de Travaux parallèles',{exact:true}).fill('65');await page.getByLabel('Espacement des branches de Travaux parallèles',{exact:true}).fill('240');await saved(page);
 await page.getByLabel('Décalage horizontal X du titre (px)',{exact:true}).fill('35');await page.getByLabel('Décalage vertical Y du titre (px)',{exact:true}).fill('80');await button(page,'Appliquer ce positionnement à tous les titres').click();await saved(page);
 const t=(await record(page)).pages[0].layers[0].timeline;expect(t.steps.every(s=>s.titleOffset.x===35&&s.titleOffset.y===80)).toBe(true);expect(t.parallelGroups[0]).toMatchObject({spacing:240,opacity:65});
});

test('centrage animé interrompu, zoom de groupe et zoom individuel explicite avec fiche',async({page})=>{
 const {t}=await fixture(page,{groups:[[1,2],[3,4]]});await testMode(page);await page.keyboard.press('Space');await page.keyboard.press('Space');await expect(root(page)).toHaveAttribute('data-active-parallel',t.parallelGroups[1].id);
 await expect.poll(async()=>{const c=await centre(page,t.parallelGroups[1].stepIds);return Math.abs(c.x)+Math.abs(c.y);}).toBeLessThan(3);
 await button(page,'Revenir au mode édition').click();await button(page,'Sélectionner le calque Ligne du temps').click();
 await button(page,'Modifier l’étape Étape 4').click();await page.getByLabel('Zoomer sur l’étape',{exact:true}).check();await page.getByLabel('Zoom interactif dans la ligne du temps',{exact:true}).check();await saved(page);
 await testMode(page);await page.keyboard.press('Space');await page.keyboard.press('Space');await choose(page,4);await expect(root(page)).toHaveAttribute('data-zoom','1.8');await expect(scene(page).getByRole('dialog',{name:'Fiche Étape 4',exact:true})).toBeVisible();
 await button(page,'Zoom sur le groupe actif').click();await expect.poll(async()=>{const c=await centre(page,t.parallelGroups[1].stepIds);return Math.abs(c.x)+Math.abs(c.y);}).toBeLessThan(3);
});

test('phases : regroupement incohérent refusé, changement explicite du groupe et réduction',async({page})=>{
 await start(page);await button(page,'Ajouter une phase').click();await saved(page);const phase=(await record(page)).pages[0].layers[0].timeline.phases[0];await page.getByLabel('Phase de l’étape',{exact:true}).selectOption(phase.id);await saved(page);
 await page.getByLabel('Regrouper Étape 1',{exact:true}).check();await page.getByLabel('Regrouper Étape 2',{exact:true}).check();await button(page,'Créer un groupe d’étapes simultanées').click();await expect(page.getByRole('alert')).toContainText('phases différentes');
 await button(page,'Modifier l’étape Étape 2').click();await page.getByLabel('Phase de l’étape',{exact:true}).selectOption(phase.id);await button(page,'Créer un groupe d’étapes simultanées').click();await saved(page);
 page.once('dialog',d=>d.accept());await page.getByLabel('Phase de l’étape',{exact:true}).selectOption('');await saved(page);expect((await record(page)).pages[0].layers[0].timeline.steps.slice(0,2).map(s=>s.phaseId)).toEqual([null,null]);
});

test('IndexedDB, duplication, copier/coller, vrai ZIP et ancienne présentation v33',async({page,browser},testInfo)=>{
 const {t}=await fixture(page,{titles:true,phases:true});const initial=(await record(page)).pages[0].layers[0];await page.reload();await saved(page);expect((await record(page)).pages[0].layers[0].timeline).toEqual(t);
 await scene(page).locator('[data-layer-id]').first().click({position:{x:5,y:5}});await button(page,'Dupliquer le calque').click();await saved(page);let d=await record(page);expect(d.pages[0].layers[1].timeline).toEqual(t);
 await page.locator('.editor').focus();await page.keyboard.press('Control+c');await page.locator('.page-thumbnail').nth(1).click();await page.locator('.editor').focus();await page.keyboard.press('Control+v');await saved(page);d=await record(page);expect(d.pages[1].layers[0].timeline).toEqual(t);
 const down=page.waitForEvent('download');await button(page,'Fichier').click();await page.getByRole('menuitem',{name:/Sauvegarder mon projet/}).click();const download=await down,file=testInfo.outputPath('branches.zip');await download.saveAs(file);
 const zip=await JSZip.loadAsync(await fs.readFile(file)),config=JSON.parse(await zip.file('presentation.json').async('string'));expect(config.version).toBe(40);
 const context=await browser.newContext(),other=await context.newPage();await other.goto('/');await saved(other);other.on('dialog',d=>d.accept());await other.getByTestId('zip-input').setInputFiles(file);await other.getByRole('dialog').getByRole('button',{name:'Confirmer',exact:true}).click();await saved(other);expect((await record(other)).pages).toEqual(d.pages);await context.close();
 config.version=33;for(const p of config.pages)for(const l of p.layers||[])if(l.type==='milestoneTimeline'){delete l.timeline.parallelGroups;delete l.timeline.chronology;}
 zip.file('presentation.json',JSON.stringify(config));const legacy=testInfo.outputPath('legacy.zip');await fs.writeFile(legacy,await zip.generateAsync({type:'nodebuffer'}));page.on('dialog',d=>d.accept());await page.getByTestId('zip-input').setInputFiles(legacy);await page.getByRole('dialog').getByRole('button',{name:'Confirmer',exact:true}).click();await saved(page);await expect.poll(async()=> (await record(page)).pages[0].layers[0].timeline.parallelGroups).toBeUndefined();expect((await record(page)).pages[0].layers[0].timeline.steps).toEqual(initial.timeline.steps);
});

test('Présentation, plein écran et réduction des mouvements : groupe entier sans mutation du projet',async({page})=>{
 const {t}=await fixture(page);const before=(await record(page)).pages;await page.emulateMedia({reducedMotion:'reduce'});await button(page,'Présentation').click();
 const r=page.locator('.player .milestone-timeline');await page.keyboard.press('Space');await expect(r.locator('.milestone-node[aria-hidden="false"]')).toHaveCount(4);await page.keyboard.press('f');await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
 await expect(r).toHaveAttribute('data-active-parallel',t.parallelGroups[0].id);expect(await r.locator('.milestone-canvas').evaluate(e=>e.getAnimations().filter(a=>a.playState==='running').length)).toBe(0);
 await page.keyboard.press('f');await button(page,'Éditeur').click();expect((await record(page)).pages).toEqual(before);
});

test('fiches multimédias, phases réduites, états de page et groupes de visibilité',async({page})=>{
 const {t,l}=await fixture(page,{phases:true,reveal:false,withMedia:true});expect(t.steps[1].imageId).toBeTruthy();expect(t.steps[1].videoId).toBeTruthy();
 await testMode(page);await choose(page,2);await expect(scene(page).getByRole('dialog',{name:'Fiche Étape 2',exact:true}).locator('img')).toBeVisible();await expect(scene(page).getByRole('dialog').locator('video')).toBeVisible();
 await choose(page,3);await expect(scene(page).getByRole('dialog',{name:'Fiche Étape 3',exact:true})).toBeVisible();await expect(scene(page).getByRole('dialog').locator('video')).toHaveCount(0);
 await root(page).getByRole('button',{name:'Production · 6',exact:true}).click();await expect(root(page).getByRole('button',{name:'Déployer la phase Production',exact:true})).toBeVisible();await expect(root(page).locator('.timeline-branch-connection')).toHaveCount(0);
 await root(page).getByRole('button',{name:'Déployer la phase Production',exact:true}).evaluate(e=>e.click());await expect(root(page).locator('.timeline-branch-connection[data-parallel-id]')).toHaveCount(6);
 const {createInteractiveButton}=await import('../src/document.js');
 const buttons=[{...createInteractiveButton(1),name:'Changer état parallèle',x:.72,y:.82,action:{type:'state',stateId:'after'}},{...createInteractiveButton(2),name:'Masquer branches',x:.1,y:.82,action:{type:'visibilityGroups',operations:[{groupId:'chronology',mode:'toggle'}]}}];
 await page.evaluate(({buttons,id})=>new Promise(resolve=>{const r=indexedDB.open('presentation-studio',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('documents','readwrite'),store=tx.objectStore('documents'),q=store.get('current');q.onsuccess=()=>{const d=q.result,p=d.pages[0];p.states=[{id:'before',name:'Avant',background:null,visibility:{},activeButtonId:null},{id:'after',name:'Après',background:null,visibility:{},activeButtonId:null}];p.initialStateId='before';p.visibilityGroups=[{id:'chronology',name:'Chronologie',layerIds:[id],initialVisible:true}];p.buttons=buttons;p.layerOrder.push(...buttons.map(b=>b.id));store.put(d,'current');};tx.oncomplete=()=>{db.close();resolve();};};}),{buttons,id:l.id});
 await page.reload();await saved(page);const before=(await record(page)).pages;await testMode(page);await choose(page,2);await expect(scene(page).getByRole('dialog')).toBeVisible();await button(page,'Changer état parallèle').click();await expect(scene(page).getByRole('dialog')).toHaveCount(0);
 await button(page,'Masquer branches').click();await expect(root(page)).toHaveCount(0);await button(page,'Masquer branches').click();await expect(root(page)).toBeVisible();expect((await record(page)).pages).toEqual(before);
});

test('groupe vide préparatoire, ajout existant, suppression et conversion sans références orphelines',async({page})=>{
 await start(page);const before=(await record(page)).pages;await button(page,'Créer un groupe vide').click();await expect(page.getByRole('status').filter({hasText:'Groupe en préparation'})).toBeVisible();expect((await record(page)).pages).toEqual(before);
 await button(page,'Créer un groupe avec deux nouvelles étapes').click();await saved(page);const g=(await record(page)).pages[0].layers[0].timeline.parallelGroups[0];await page.getByLabel('Ajouter une étape au groupe Travaux parallèles',{exact:true}).selectOption(before[0].layers[0].timeline.steps[0].id);await saved(page);
 const attached=(await record(page)).pages[0].layers[0].timeline;expect(attached.parallelGroups[0].stepIds).toHaveLength(3);expect(attached.chronology).toEqual([{kind:'step',id:before[0].layers[0].timeline.steps[1].id},{kind:'step',id:before[0].layers[0].timeline.steps[2].id},{kind:'parallel',id:g.id}]);await button(page,'Propriétés de la branche Étape 4').click();await button(page,'Supprimer l’étape').click();await saved(page);
 await button(page,'Propriétés de la branche Étape 5').click();await button(page,'Supprimer l’étape').click();await saved(page);const t=(await record(page)).pages[0].layers[0].timeline;expect(t.parallelGroups).toEqual([]);expect(t.steps).toEqual(before[0].layers[0].timeline.steps);expect(t.chronology.filter(u=>u.kind==='step')).toHaveLength(3);
});

test('zigzag : groupes au début, au milieu et en fin de chaque rangée suivent le sens local',()=>{
 for(const placement of Array.from({length:13},(_,i)=>i))for(const n of [2,3,4]){
  let t=timelineData();t.steps=Array.from({length:18},(_,i)=>timelineStep(i+1));t.design.layout='zigzag';t=createParallel(t,t.steps.slice(placement,placement+n).map(s=>s.id));
  const g=timelineGeometry({width:.8,height:.6,timeline:t},timelineItems(t)),i=g.centres.findIndex(c=>c.parallelId),c=g.centres[i],prev=g.centres[i-1],next=g.centres[i+1];
  const expected=next&&next.y===c.y?Math.sign(next.x-c.x):prev&&prev.y===c.y?Math.sign(c.x-prev.x):1;
  expect(Math.sign(c.x-c.entry.x)).toBe(expected);expect(Math.sign(c.exit.x-c.x)).toBe(expected);
 }
});
