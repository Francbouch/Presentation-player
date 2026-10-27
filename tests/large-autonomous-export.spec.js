import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
let helper;
test.beforeAll(async()=>{helper=(await build({entryPoints:['src/largeAutonomousExport.js'],bundle:true,write:false,format:'iife',globalName:'LargeExport',define:{'import.meta.env.BASE_URL':JSON.stringify('/')}})).outputFiles[0].text;});
async function setup(page,root,{fail=false,cancel=false,discard=false}={}){
 await page.goto('/');await expect(page.locator('.save-status')).toContainText('Sauvegardé');
 await page.exposeFunction('writeExportFile',async(name,text)=>{if(fail&&name.endsWith('.js'))throw Error('Disque plein');if(!discard){const target=path.join(root,name);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,text);}return text.length;});
 await page.evaluate(({cancel})=>{
  window.exportWrites=[];
  const dir=prefix=>({getDirectoryHandle:async name=>dir(prefix+name+'/'),getFileHandle:async name=>({createWritable:async()=>({write:async data=>{const n=await window.writeExportFile(prefix+name,data);window.exportWrites.push({name:prefix+name,size:n});},close:async()=>{},abort:async()=>{}})})});
  window.showDirectoryPicker=async()=>{if(cancel)throw new DOMException('Annulé','AbortError');return dir('');};
 },{cancel});
 await page.route('**/large-export-test.js',r=>r.fulfill({contentType:'text/javascript',body:helper}));await page.addScriptTag({url:'/large-export-test.js'});
}
async function exportUI(page){await page.getByRole('button',{name:'Fichier',exact:true}).click();await page.getByRole('menuitem',{name:'Exporter un dossier autonome (gros projets)',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Confirmer',exact:true}).click();}
async function stored(page){return page.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('presentation-studio',1);r.onsuccess=()=>{const q=r.result.transaction('documents').objectStore('documents').get('current');q.onsuccess=()=>{resolve(JSON.stringify(q.result.pages));r.result.close();};};}));}
test('dossier autonome réel : médias sans perte, MP4, navigation et plein écran, sans IndexedDB',async({page,browser},info)=>{
 const root=info.outputPath('export');await setup(page,root);const before=await stored(page);await exportUI(page);await expect(page.getByRole('dialog')).toHaveCount(0);expect(await stored(page)).toBe(before);
 const folder=(await fs.readdir(root))[0],base=path.join(root,folder),html=await fs.readFile(path.join(base,'Ouvrir la présentation.html'),'utf8');expect(html.length).toBeLessThan(2000);expect(await fs.readFile(path.join(base,'LIRE-MOI.txt'),'utf8')).toContain('qualité');
 const manifest=JSON.parse((await fs.readFile(path.join(base,'presentation.js'),'utf8')).slice('window.__studioPresentation='.length,-1));
 const originals=await page.evaluate(async()=>{const d=await new Promise(resolve=>{const r=indexedDB.open('presentation-studio',1);r.onsuccess=()=>{const q=r.result.transaction('documents').objectStore('documents').get('current');q.onsuccess=()=>{resolve(q.result);r.result.close();};};});return Object.fromEntries(await Promise.all(d.media.map(async m=>[m.id,Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await m.blob.arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join('')])));});
 for(const asset of manifest.assets){const parts=[];for(const file of asset.chunks){const chunk=JSON.parse((await fs.readFile(path.join(base,file),'utf8')).slice('window.__studioMediaChunk='.length,-1)),bytes=Buffer.from(chunk.base64,'base64');parts.push(chunk.codec==='gzip'?gunzipSync(bytes):bytes);}const digest=createHash('sha256').update(Buffer.concat(parts)).digest('hex');for(const id of asset.ids)expect(digest).toBe(originals[id]);}
 const ctx=await browser.newContext({offline:true});await ctx.addInitScript(()=>{indexedDB.open=()=>{throw Error('Stockage interdit');};});const reader=await ctx.newPage();
 try{
  if(process.env.STUDIO_TEST_HTML_IN_MEMORY==='1'){
   test.info().annotations.push({type:'limite-locale',description:'Chrome administré bloque file:// ; scripts réels servis par route en mémoire. CI ouvre file://.'});
   await reader.route('http://export.test/**',async route=>{const name=new URL(route.request().url()).pathname.slice(1);try{await route.fulfill({body:await fs.readFile(path.join(base,name)),contentType:name.endsWith('.css')?'text/css':'text/javascript'});}catch{await route.abort();}});
   await reader.setContent(html.replace('<head>','<head><base href="http://export.test/">'));
  }else await reader.goto(pathToFileURL(path.join(base,'Ouvrir la présentation.html')).href);
  await reader.getByRole('button',{name:'Ouvrir la présentation',exact:true}).click();await expect(reader.locator('.slide-background')).toHaveJSProperty('naturalWidth',1600);
  await reader.locator('.player').focus();await reader.keyboard.press('Space');const video=reader.locator('.transition-video');await expect(video).toBeVisible();await expect.poll(()=>video.evaluate(v=>!v.paused&&v.currentTime>0)).toBe(true);await video.evaluate(v=>v.currentTime=v.duration-.02);await expect(video).toHaveCount(0);await expect(reader.locator('.slide-info')).toContainText('Changez d’atmosphère');await reader.keyboard.press('ArrowLeft');await expect(reader.locator('.slide-info')).toContainText('Une nouvelle perspective');await reader.keyboard.press('f');await expect.poll(()=>reader.evaluate(()=>!!document.fullscreenElement)).toBe(true);
 }finally{await ctx.close();}
});
test('500 Mo : écritures bornées, compression sans perte et originaux intacts',async({page},info)=>{
 test.setTimeout(180000);await setup(page,info.outputPath('unused'),{discard:true});const result=await page.evaluate(async()=>{
  const d=await new Promise(resolve=>{const r=indexedDB.open('presentation-studio',1);r.onsuccess=()=>{const q=r.result.transaction('documents').objectStore('documents').get('current');q.onsuccess=()=>{resolve(q.result);r.result.close();};};});
  const video=d.media.find(m=>m.type.startsWith('video/')),old=video.blob,part=new Blob([new Uint8Array(1024*1024)]);video.blob=new Blob([old,...Array(500).fill(part)],{type:video.type});const size=video.blob.size;
  const destination=await window.showDirectoryPicker();await LargeExport.writeLargeAutonomousPresentation(d,destination);
  const bytes=Uint8Array.from({length:8192},(_,i)=>(i*31)%256),encoded=await LargeExport.encodeMediaChunk(new Blob([bytes]));const raw=Uint8Array.from(atob(encoded.base64),c=>c.charCodeAt(0));const decoded=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  return {size,unchanged:video.blob.size===size,codec:encoded.codec,equal:bytes.every((v,i)=>v===decoded[i]),writes:window.exportWrites};
 });expect(result.size).toBeGreaterThan(500*1024*1024);expect(result.unchanged).toBe(true);expect(result.codec).toBe('gzip');expect(result.equal).toBe(true);const chunks=result.writes.filter(w=>/media-\d+-\d+\.js$/.test(w.name));expect(chunks.length).toBeGreaterThan(125);expect(Math.max(...chunks.map(c=>c.size))).toBeLessThan(6*1024*1024);expect(result.writes.at(-1).name).toMatch(/Ouvrir la présentation.html$/);
});
test('disque plein : erreur, aucun HTML final, projet sauvegardé conservé',async({page},info)=>{await setup(page,info.outputPath('partial'),{fail:true});const before=await stored(page);await exportUI(page);await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Disque plein');expect(await stored(page)).toBe(before);expect(await page.evaluate(()=>window.exportWrites.some(w=>w.name.endsWith('.html')))).toBe(false);});
test('annulation du sélecteur : aucun fichier et projet conservé',async({page},info)=>{await setup(page,info.outputPath('cancel'),{cancel:true});const before=await stored(page);await exportUI(page);await expect(page.getByRole('dialog')).toHaveCount(0);expect(await page.evaluate(()=>window.exportWrites.length)).toBe(0);expect(await stored(page)).toBe(before);});
test('navigateur sans écriture de dossier : explication utile',async({page},info)=>{await setup(page,info.outputPath('unsupported'));await page.evaluate(()=>{window.showDirectoryPicker=undefined;});await exportUI(page);await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Chrome ou Edge');});
test('compression : morceau vidéo incompressible conservé octet pour octet sans recompression',async({page},info)=>{
 await setup(page,info.outputPath('raw'),{discard:true});const result=await page.evaluate(async()=>{
  const bytes=new Uint8Array(4*1024*1024);for(let i=0;i<bytes.length;i+=65536)crypto.getRandomValues(bytes.subarray(i,i+65536));
  const encoded=await LargeExport.encodeMediaChunk(new Blob([bytes],{type:'video/mp4'}));const raw=atob(encoded.base64);return {codec:encoded.codec,equal:raw.length===bytes.length&&bytes.every((b,i)=>b===raw.charCodeAt(i))};
 });expect(result).toEqual({codec:'raw',equal:true});
});
