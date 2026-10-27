import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
let helper;
test.beforeAll(async()=>{helper=(await build({entryPoints:['src/compressedAutonomousExport.js'],bundle:true,write:false,format:'iife',globalName:'SingleExport',define:{'import.meta.env.BASE_URL':JSON.stringify('/')}})).outputFiles[0].text;});
async function start(page){await page.goto('/');await expect(page.locator('.save-status')).toContainText('Sauvegardé');await page.route('**/unlimited-test.js',r=>r.fulfill({contentType:'text/javascript',body:helper}));await page.addScriptTag({url:'/unlimited-test.js'});await page.evaluate(()=>{window.record=()=>new Promise(resolve=>{const r=indexedDB.open('presentation-studio',1);r.onsuccess=()=>{const q=r.result.transaction('documents').objectStore('documents').get('current');q.onsuccess=()=>{resolve(q.result);r.result.close();};};});});}
async function openDialog(page){await page.getByRole('button',{name:'Fichier',exact:true}).click();await page.getByRole('menuitem',{name:'Exporter un seul fichier HTML',exact:true}).click();await expect(page.getByLabel('Qualité de l’export')).toHaveValue('original');}
test('500 Mo : un seul HTML dépassant 250 Mo, écritures bornées, aucune compression ni mutation',async({page})=>{
 test.setTimeout(120000);await start(page);const result=await page.evaluate(async()=>{
  const d=await record(),v=d.media.find(m=>m.type.startsWith('video/')),original=v.blob,part=new Blob([new Uint8Array(1024*1024)]);v.blob=new Blob([original,...Array(500).fill(part)],{type:v.type});const before=v.blob.size,pages=JSON.stringify(d.pages);window.VideoEncoder=undefined;
  let size=0,max=0,writes=0,converted=false;const result=await SingleExport.buildOriginalPresentation(d,{writer:{write:async blob=>{size+=blob.size;max=Math.max(max,blob.size);writes++;if((await blob.text()).includes('video/webm'))converted=true;}}});
  return {size,max,writes,resultSize:result.size,converted,same:v.blob.size===before&&JSON.stringify(d.pages)===pages};
 });expect(result.size).toBeGreaterThan(650_000_000);expect(result.resultSize).toBe(result.size);expect(result.max).toBeLessThan(5_000_000);expect(result.writes).toBeGreaterThan(166);expect(result.converted).toBe(false);expect(result.same).toBe(true);
});
test('enregistrement direct : vrai HTML unique, vidéos originales, hors ligne, clavier et plein écran',async({page,browser},info)=>{
 await start(page);const file=info.outputPath('presentation.html');const handle=await fs.open(file,'w');await page.exposeFunction('writeHTML',async text=>{await handle.write(text);});await page.exposeFunction('closeHTML',async()=>{await handle.close();});
 const before=await page.evaluate(async()=>JSON.stringify((await record()).pages));
 await page.evaluate(()=>{window.showSaveFilePicker=async options=>{window.suggested=options.suggestedName;return {createWritable:async()=>({write:async blob=>window.writeHTML(await blob.text()),close:async()=>window.closeHTML(),abort:async()=>window.closeHTML()})};};});
 await openDialog(page);await page.getByRole('button',{name:'Créer le fichier',exact:true}).click();await expect(page.getByRole('dialog').getByRole('status')).toContainText('Fichier enregistré');expect(await page.evaluate(()=>window.suggested)).toBe('presentation-interactive.html');expect(await page.evaluate(async()=>JSON.stringify((await record()).pages))).toBe(before);const html=await fs.readFile(file,'utf8');expect(html).not.toMatch(/<script src=/);expect(html).toContain('video/mp4');
 const originalHashes=await page.evaluate(async()=>Object.fromEntries(await Promise.all((await record()).media.map(async m=>[m.id,Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await m.blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('')]))));
 const manifest=JSON.parse(html.match(/window.__studioPresentation=([\s\S]*?);<\/script>/)[1]);let pendingParts=[];const decoded=[];
 for(const match of html.matchAll(/window.__studioAppend\("([A-Za-z0-9+/=]+)"\)|window.__studioFinish\((\d+),/g)){if(match[1])pendingParts.push(Buffer.from(match[1],'base64'));else{decoded[Number(match[2])]=createHash('sha256').update(Buffer.concat(pendingParts)).digest('hex');pendingParts=[];}}
 for(const asset of manifest.assets)for(const id of asset.ids)expect(decoded[asset.embedded]).toBe(originalHashes[id]);
 const ctx=await browser.newContext({offline:true});await ctx.addInitScript(()=>{indexedDB.open=()=>{throw Error('Stockage interdit');};});const reader=await ctx.newPage();try{
  if(process.env.STUDIO_TEST_HTML_IN_MEMORY==='1'){test.info().annotations.push({type:'limite-locale',description:'HTML en mémoire ; CI ouvre file://.'});await reader.setContent(html);}else await reader.goto(pathToFileURL(file).href);
  await reader.getByRole('button',{name:'Ouvrir la présentation',exact:true}).click();await expect(reader.locator('.slide-background')).toHaveJSProperty('naturalWidth',1600);await reader.locator('.player').focus();await reader.keyboard.press('Space');const video=reader.locator('.transition-video');await expect(video).toBeVisible();await expect.poll(()=>video.evaluate(v=>!v.paused&&v.currentTime>0)).toBe(true);await video.evaluate(v=>v.currentTime=v.duration-.02);await expect(video).toHaveCount(0);await expect(reader.locator('.slide-info')).toContainText('Changez d’atmosphère');await reader.keyboard.press('ArrowLeft');await expect(reader.locator('.slide-info')).toContainText('Une nouvelle perspective');await reader.keyboard.press('f');await expect.poll(()=>reader.evaluate(()=>!!document.fullscreenElement)).toBe(true);
 }finally{await ctx.close();}
});
for(const mode of ['disque plein','annulation'])test(mode+' pendant écriture : transaction annulée, ancien fichier et projet conservés',async({page})=>{
 await start(page);const result=await page.evaluate(async mode=>{
  const d=await record(),before=JSON.stringify(d.pages),controller=new AbortController();let committed='ancien fichier',aborted=false,closed=false,writes=0;
  window.showSaveFilePicker=async()=>({createWritable:async()=>({write:async()=>{if(++writes===2){if(mode==='disque plein')throw Error('Disque plein');controller.abort();}},close:async()=>{closed=true;committed='nouveau fichier';},abort:async()=>{aborted=true;}})});
  let message='';try{await SingleExport.saveOriginalPresentation(d,{signal:controller.signal});}catch(e){message=e.name==='AbortError'?'annulé':e.message;}
  return {committed,aborted,closed,message,unchanged:JSON.stringify(d.pages)===before};
 },mode);expect(result.committed).toBe('ancien fichier');expect(result.aborted).toBe(true);expect(result.closed).toBe(false);expect(result.unchanged).toBe(true);expect(result.message).toContain(mode==='disque plein'?'Disque plein':'annulé');
});
test('annulation du choix de fichier : aucun début d’écriture',async({page})=>{await start(page);await page.evaluate(()=>{window.showSaveFilePicker=async()=>{throw new DOMException('Annulé','AbortError');};});await openDialog(page);await page.getByRole('button',{name:'Créer le fichier',exact:true}).click();await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Export annulé');await expect(page.getByRole('button',{name:'Créer le fichier',exact:true})).toBeEnabled();});
