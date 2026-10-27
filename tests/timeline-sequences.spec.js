import fs from 'node:fs/promises';
import JSZip from 'jszip';
import {test,expect} from '@playwright/test';
import {timelineData,timelineStep,timelineItems,timelineGeometry,validateMilestoneTimeline} from '../src/milestoneTimeline.js';
import {createParallel,parallelBranches,updateParallelBranches,timelineRevealUnits,branchRanks,detachParallel,groupCentre} from '../src/timelineParallel.js';
import {createLayer,emptyPage,normalizeDocument,migrateDocument,duplicatePageModel} from '../src/document.js';
import {legacyCardContent} from '../src/timelineCardContent.js';
import {copySelection} from '../src/visualGroups.js';
import {durationLength} from '../src/timelineDuration.js';
const saved=p=>expect(p.locator('.save-status')).toContainText('Sauvegardé');
const button=(p,name)=>p.getByRole('button',{name,exact:true});
const root=p=>p.locator('.editor-preview .milestone-timeline');
async function record(p){await saved(p);return p.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('presentation-studio',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('documents'),q=tx.objectStore('documents').get('current');q.onsuccess=()=>resolve(q.result);tx.oncomplete=()=>db.close();};}));}
function model({layout='horizontal',third=false,phase=false,zoom=false}={}){
 let t=timelineData();t.steps=Array.from({length:third?10:7},(_,i)=>({...timelineStep(i+1),name:i<5?'A'+(i+1):i===5?'Transport maritime':i===6?'Après le groupe':'C'+(i-6),status:i===5?'current':i<2?'done':'upcoming',timing:{estimate:i===5?'6 semaines':'1 semaine',a:{mode:'custom',length:i===5?700:100}},...(phase?{phaseId:'production'}:{})}));
 t.design={...t.design,layout,reveal:true,initialVisible:0,revealDuration:30,autoCenter:true,centerDuration:200,zoom,zoomScale:150,backgroundTransparent:true,duration:{display:{a:true,b:true,c:true}}};
 if(zoom){t.steps[0].click='zoom';t.steps[1].zoomVerticalPosition=25;}
 if(phase)t.phases=[{id:'production',name:'Production',color:'#775588',collapsed:false}];
 const ids=[...t.steps.slice(0,6),...(third?t.steps.slice(7):[])].map(s=>s.id);t=createParallel(t,ids,'Préparation');const g=t.parallelGroups[0];
 t=updateParallelBranches(t,g.id,[{id:'internal',name:'Travaux internes',stepIds:t.steps.slice(0,5).map(s=>s.id)},{id:'shipping',name:'Logistique',stepIds:[t.steps[5].id]},...(third?[{id:'third',name:'Travaux C',stepIds:t.steps.slice(7).map(s=>s.id)}]:[])]);
 return t;
}
async function fixture(p,options={}){
 await p.goto('/');await saved(p);await button(p,'+ Ligne du temps').click();const d=await record(p),layer=d.pages[0].layers[0],t=model(options);
 t.steps[5].imageId=d.media.find(m=>m.type.startsWith('image/')).id;t.steps[5].cardLayout={x:.2,y:.2,width:.3,height:.4};t.steps[5].cardContent=legacyCardContent(t.steps[5],t.design,{width:576,height:432});layer.timeline=t;
 await p.evaluate(layer=>new Promise(resolve=>{const r=indexedDB.open('presentation-studio',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('documents','readwrite'),s=tx.objectStore('documents'),q=s.get('current');q.onsuccess=()=>{const d=q.result;d.pages[0].layers[0]=layer;s.put(d,'current');};tx.oncomplete=()=>{db.close();resolve();};};}),layer);await p.reload();await saved(p);await button(p,'Sélectionner le calque Ligne du temps').click();return {t,layer};
}
async function groupPanel(p){const panel=p.locator('.parallel-group-settings').first();await panel.locator(':scope > summary').evaluate(e=>e.closest('details').open=true);return panel;}
const visibleNodes=p=>root(p).locator('.milestone-node[aria-hidden="false"]');
async function testMode(p){await button(p,'Tester les interactions').click();await p.locator('.editor').focus();}

 test('modèle : séquences 5/1/3, rangs partagés, phases, références, anciennes données et validation',()=>{
 const t=model({third:true,phase:true}),g=t.parallelGroups[0],before=structuredClone(t);validateMilestoneTimeline({type:'milestoneTimeline',timeline:t});
 expect(timelineRevealUnits(t).map(u=>u.steps.map(s=>s.name))).toEqual([['A1','Transport maritime','C1'],['A2','C2'],['A3','C3'],['A4'],['A5'],['Après le groupe']]);expect(t.steps.filter(s=>s.name==='Transport maritime')).toHaveLength(1);expect(durationLength(t,t.steps[5],'a')).toBe(700);
 const reordered=updateParallelBranches(t,g.id,[{...g.branches[0],stepIds:[...g.branches[0].stepIds.slice(1),g.branches[0].stepIds[0]]},...g.branches.slice(1)]);expect(reordered.steps).toEqual(t.steps);expect(t).toEqual(before);
 const ranks=branchRanks(g);ranks[t.steps[1].id]=1;const custom=updateParallelBranches(t,g.id,g.branches,ranks);expect(timelineRevealUnits(custom)[0].steps.map(s=>s.name)).toEqual(['A1','A2','Transport maritime','C1']);
 const old=timelineData(),legacy=createParallel(old,old.steps.slice(0,2).map(s=>s.id));expect(timelineRevealUnits(legacy)[0].steps).toHaveLength(2);const doc={version:40,pages:[(()=>{const l={...createLayer('milestoneTimeline'),timeline:legacy};return {...emptyPage(1),layers:[l],layerOrder:[l.id]};})()],media:[],transitions:[],privateMetadata:'preserved'};expect(migrateDocument(doc).pages[0].layers[0].timeline).toEqual(legacy);expect(migrateDocument(doc).version).toBe(41);expect(doc.version).toBe(40);
 for(const patch of [{branches:[{id:'a',name:'A',stepIds:['missing']}]},{branches:[...g.branches,g.branches[0]]},{revealRanks:{missing:1}},{revealRanks:{[t.steps[0].id]:0}},{revealRanks:{[t.steps[0].id]:3,[t.steps[1].id]:1}},{stepSpacing:Infinity}])expect(()=>validateMilestoneTimeline({type:'milestoneTimeline',timeline:{...t,parallelGroups:[{...g,...patch}]}})).toThrow();
 });
 for(const layout of ['horizontal','vertical','zigzag'])test('géométrie '+layout+' : chemins 5/1/3 continus, aucun point orphelin, centres des nouveaux rangs',()=>{
 const t=model({layout,third:true}),g=timelineGeometry({width:.8,height:.65,timeline:t},timelineItems(t));expect(g.points).toHaveLength(10);expect(new Set(g.points.map(p=>p.x+':'+p.y)).size).toBe(10);expect(g.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=g.width&&p.y>=0&&p.y<=g.height)).toBe(true);
 const branches=g.segments.filter(s=>s.group);expect(branches.filter(s=>s.part==='in')).toHaveLength(3);expect(branches.filter(s=>s.part==='out')).toHaveLength(3);expect(branches.filter(s=>s.part==='sequence')).toHaveLength(6);for(const segment of branches){expect(segment.d).not.toMatch(/NaN|undefined/);expect(segment.revealIds.every(id=>g.points.some(p=>p.id===id))).toBe(true);}
 const first=groupCentre(g.points,t.steps[0].id),transport=groupCentre(g.points,t.steps[5].id);expect([first.x,first.y]).toEqual([transport.x,transport.y]);const a4=g.points.find(p=>p.id===t.steps[3].id);expect(groupCentre(g.points,a4.id)).toMatchObject({x:a4.x,y:a4.y});
 });
 for(const layout of ['horizontal','vertical','zigzag'])for(const mode of ['Test','Présentation'])test('révélation '+layout+' '+mode+' : A1+Transport, A2…A5, puis sortie, transport et durées conservés',async({page})=>{
 const {t}=await fixture(page,{phase:true,layout});const before=await record(page);if(mode==='Test')await testMode(page);else await button(page,'Présentation').click();const host=mode==='Test'?root(page):page.locator('.player .milestone-timeline'),nodes=host.locator('.milestone-node[aria-hidden="false"]');await expect(nodes).toHaveCount(0);await page.locator(mode==='Test'?'.editor':'.player').focus();
 for(let rank=1;rank<=5;rank++){await page.keyboard.press('Space');await expect(nodes).toHaveCount(rank+1);await expect(host.locator(`[data-step-id="${t.steps[5].id}"]`)).toHaveAttribute('aria-hidden','false');await expect(host).toHaveAttribute('data-revealed-units',String(rank));}
 await page.keyboard.press('Space');await expect(nodes).toHaveCount(7);expect((await record(page)).pages).toEqual(before.pages);await expect(host.locator('.timeline-branch-hit')).toHaveCount(0);await expect(host.locator('[data-duration-step="'+t.steps[5].id+'"]')).toContainText('6 semaines');
 });
 test('édition : ajouter, déplacer, réordonner, rangs, suppression confirmée et Undo/Redo',async({page})=>{
 await fixture(page);let panel=await groupPanel(page);const before=(await record(page)).pages[0].layers[0].timeline;
 await panel.getByLabel('Nom de la branche 1',{exact:true}).fill('Travaux internes renommés');await saved(page);await panel.getByRole('button',{name:'Ajouter une étape à la branche 1',exact:true}).click();await saved(page);let next=(await record(page)).pages[0].layers[0].timeline;expect(next.parallelGroups[0].branches[0].stepIds).toHaveLength(6);const added=next.steps.at(-1);expect(added.phaseId).toBe(before.steps[0].phaseId);
 await page.locator('.editor').focus();await page.keyboard.press('Control+z');await saved(page);expect((await record(page)).pages[0].layers[0].timeline.steps).toEqual(before.steps);await page.keyboard.press('Control+Shift+z');await saved(page);
 panel=await groupPanel(page);await panel.getByLabel('Déplacer '+added.name+' vers une branche',{exact:true}).selectOption('shipping');await saved(page);next=(await record(page)).pages[0].layers[0].timeline;expect(next.parallelGroups[0].branches[1].stepIds).toContain(added.id);
 await panel.getByLabel('Monter l’étape '+added.name,{exact:true}).click();await saved(page);expect((await record(page)).pages[0].layers[0].timeline.parallelGroups[0].branches[1].stepIds[0]).toBe(added.id);
 await panel.getByLabel('Rang de révélation de A2',{exact:true}).fill('1');await saved(page);expect(timelineRevealUnits((await record(page)).pages[0].layers[0].timeline)[0].steps.map(s=>s.name)).toContain('A2');
 await panel.getByRole('button',{name:'Ajouter une branche',exact:true}).click();await saved(page);expect((await record(page)).pages[0].layers[0].timeline.parallelGroups[0].branches).toHaveLength(3);await panel.getByRole('button',{name:'Supprimer la branche 3 — conserver ses étapes',exact:true}).click();await saved(page);
 page.once('dialog',d=>d.accept());await panel.getByLabel('Supprimer l’étape '+added.name+' de la branche',{exact:true}).click();await saved(page);expect((await record(page)).pages[0].layers[0].timeline.steps.some(s=>s.id===added.id)).toBe(false);
 const transport=(await record(page)).pages[0].layers[0].timeline.steps.find(s=>s.name==='Transport maritime');page.once('dialog',d=>d.accept());await panel.getByRole('button',{name:'Supprimer la branche 2 — conserver ses étapes',exact:true}).click();await saved(page);expect((await record(page)).pages[0].layers[0].timeline.steps.find(s=>s.id===transport.id)).toEqual(transport);
 });
 test('sauvegarde : rechargement, duplication, copie et ZIP réel, rejet atomique des références invalides',async({page,browser},info)=>{
 const {t}=await fixture(page,{third:true,phase:true});let before=await record(page);await page.reload();await saved(page);expect((await record(page)).pages).toEqual(before.pages);
 const dup=duplicatePageModel(before.pages[0]);expect(dup.layers[0].timeline).toEqual(t);const copied=copySelection(before.pages[0],[before.pages[0].layers[0].id],before,before.pages[1]);expect(copied.layers[0].timeline).toEqual(t);
 await button(page,'Sélectionner le calque Ligne du temps').click();await button(page,'Dupliquer le calque').click();await saved(page);expect((await record(page)).pages[0].layers[1].timeline).toEqual(t);await page.locator('.editor').focus();await page.keyboard.press('Control+c');await page.locator('.page-thumbnail').nth(2).click();await page.locator('.editor').focus();await page.keyboard.press('Control+v');await saved(page);before=await record(page);expect(before.pages[2].layers[0].timeline).toEqual(t);
 const download=page.waitForEvent('download');await button(page,'Fichier').click();await page.getByRole('menuitem',{name:'Sauvegarder mon projet',exact:true}).click();const file=info.outputPath('branches.zip');await(await download).saveAs(file);const zip=await JSZip.loadAsync(await fs.readFile(file)),config=JSON.parse(await zip.file('presentation.json').async('string'));expect(config.version).toBe(41);expect(config.pages).toEqual(before.pages);for(const media of config.media)expect(zip.file(media.path)).not.toBeNull();
 const context=await browser.newContext(),other=await context.newPage();try{await other.goto('/');await saved(other);await other.getByTestId('zip-input').setInputFiles(file);await other.getByRole('dialog').getByRole('button',{name:'Confirmer',exact:true}).click();await saved(other);expect((await record(other)).pages).toEqual(before.pages);
 config.pages[0].layers[0].timeline.parallelGroups[0].branches[0].stepIds[0]='missing';zip.file('presentation.json',JSON.stringify(config));const bad=info.outputPath('bad.zip');await fs.writeFile(bad,await zip.generateAsync({type:'nodebuffer'}));await other.getByTestId('zip-input').setInputFiles(bad);await expect(other.getByText('La configuration de la ligne du temps est invalide. Le projet actuel est conservé.',{exact:true})).toBeVisible();expect((await record(other)).pages).toEqual(before.pages);
 }finally{await context.close();}
 });
 test('centrage animé : rang simultané puis A3 seule, fiche Transport indépendante',async({page})=>{
 const {t}=await fixture(page);await testMode(page);const host=root(page);await page.keyboard.press('Space');await expect(visibleNodes(page)).toHaveCount(2);
 const centre=ids=>host.evaluate((e,ids)=>{const h=e.closest('.interactive-button-layer').getBoundingClientRect(),rects=ids.map(id=>e.querySelector(`[data-step-id="${id}"] .milestone-dot`).getBoundingClientRect());return {x:((Math.min(...rects.map(r=>r.left))+Math.max(...rects.map(r=>r.right)))/2-h.left)/h.width,y:((Math.min(...rects.map(r=>r.top))+Math.max(...rects.map(r=>r.bottom)))/2-h.top)/h.height};},ids);
 await expect.poll(async()=>{const c=await centre([t.steps[0].id,t.steps[5].id]);return Math.abs(c.x-.5)+Math.abs(c.y-.5);}).toBeLessThan(.01);await page.keyboard.press('Space');await page.keyboard.press('Space');await expect.poll(async()=>{const c=await centre([t.steps[2].id]);return Math.abs(c.x-.5)+Math.abs(c.y-.5);}).toBeLessThan(.01);
 await host.getByRole('button',{name:'Étape Transport maritime',exact:true}).evaluate(e=>e.click());await expect(page.locator('.timeline-card-canvas').first()).toBeVisible();const after=(await record(page)).pages[0].layers[0].timeline;expect(after).toEqual(t);
 });

 test('ancien groupe : ajouter quatre étapes successives sans recréer ni altérer les étapes existantes',async({page})=>{
 await page.goto('/');await saved(page);await button(page,'+ Ligne du temps').click();await page.getByLabel('Regrouper Étape 1',{exact:true}).check();await page.getByLabel('Regrouper Étape 2',{exact:true}).check();await button(page,'Créer un groupe d’étapes simultanées').click();await saved(page);const before=(await record(page)).pages[0].layers[0].timeline;expect(before.parallelGroups[0].branches).toBeUndefined();
 const panel=await groupPanel(page);await panel.locator('.parallel-sequences > summary').click();for(let i=0;i<4;i++){await panel.getByRole('button',{name:'Ajouter une étape à la branche 1',exact:true}).click();await saved(page);}
 const next=(await record(page)).pages[0].layers[0].timeline;expect(next.parallelGroups[0].id).toBe(before.parallelGroups[0].id);expect(next.steps.slice(0,3)).toEqual(before.steps);expect(next.parallelGroups[0].branches.map(b=>b.stepIds.length)).toEqual([5,1]);expect(timelineRevealUnits(next).slice(0,5).map(u=>u.steps.length)).toEqual([2,1,1,1,1]);
 });

 test('zoom conservé en avançant : étape suivante à sa position verticale personnalisée, plein écran',async({page})=>{
 const {t}=await fixture(page,{zoom:true});await testMode(page);await page.keyboard.press('Space');await root(page).getByRole('button',{name:'Étape A1',exact:true}).evaluate(e=>e.click());await expect(root(page)).toHaveAttribute('data-zoom','1.5');await page.locator('.editor').focus();await page.keyboard.press('Space');await expect(root(page)).toHaveAttribute('data-active-step',t.steps[1].id);await expect(root(page)).toHaveAttribute('data-zoom','1.5');
 await expect.poll(()=>root(page).evaluate((e,id)=>{const r=e.querySelector(`[data-step-id="${id}"] .milestone-dot`).getBoundingClientRect(),h=e.closest('.interactive-button-layer').getBoundingClientRect();return Math.abs((r.x+r.width/2-h.x)/h.width-.5)+Math.abs((r.y+r.height/2-h.y)/h.height-.25);},t.steps[1].id)).toBeLessThan(.01);
 await button(page,'Présentation').click();await page.locator('.player').focus();await page.keyboard.press('f');await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);await page.keyboard.press('Space');await expect(page.locator('.player .milestone-node[aria-hidden="false"]')).toHaveCount(2);
 });
 test('séquences longues : entrées et sorties dans les limites, avant et après les virages du zigzag',()=>{
 for(const layout of ['horizontal','vertical','zigzag'])for(let start=0;start<6;start++){let t=timelineData();t.design.layout=layout;t.steps=Array.from({length:12},(_,i)=>timelineStep(i+1));t=createParallel(t,t.steps.slice(start,start+6).map(s=>s.id));const group=t.parallelGroups[0];t=updateParallelBranches(t,group.id,[{id:'a',name:'A',stepIds:t.steps.slice(start,start+5).map(s=>s.id)},{id:'b',name:'B',stepIds:[t.steps[start+5].id]}]);const g=timelineGeometry({timeline:t,width:.8,height:.65},timelineItems(t));for(const p of [...g.points,...g.centres.flatMap(c=>[c.entry,c.exit])])expect(p.x>=0&&p.x<=g.width&&p.y>=0&&p.y<=g.height).toBe(true);}
 });
