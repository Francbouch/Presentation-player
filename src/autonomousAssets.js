import {decodeBase64Bytes as decode} from './base64Bytes.js';
function loadChunk(path){
 if(!/^medias\/media-\d+-\d+\.js$/.test(path))throw Error('Chemin média invalide.');
 return new Promise((resolve,reject)=>{
  const script=document.createElement('script');window.__studioMediaChunk=null;script.src=path;
  script.onload=()=>{const chunk=window.__studioMediaChunk;delete window.__studioMediaChunk;script.remove();chunk?resolve(chunk):reject(Error('Média incomplet. Demandez une nouvelle copie.'));};
  script.onerror=()=>{script.remove();reject(Error('Un fichier média manque. Décompressez et conservez le dossier complet.'));};
  document.head.append(script);
 });
}
export async function loadAutonomousAssets(assets,urls,isLive=()=>true,progress=()=>{}){
 let count=0;const total=assets.reduce((n,a)=>n+(a.chunks?.length||1),0);
 for(const asset of assets){
  if(asset.embedded!==undefined){
   const blob=window.__studioEmbeddedMedia?.[asset.embedded];if(!(blob instanceof Blob))throw Error('Un média intégré est manquant. Demandez une nouvelle copie.');
   const url=URL.createObjectURL(blob);for(const id of asset.ids)urls[id]=url;delete window.__studioEmbeddedMedia[asset.embedded];progress(Math.round(++count/total*100));continue;
  }
  const parts=[];
  for(const path of asset.chunks||[null]){
   if(!isLive())return;
   const chunk=path?await loadChunk(path):{base64:asset.base64,codec:'raw'};
   let blob=new Blob([decode(chunk.base64)]);
   if(chunk.codec==='gzip'){
    if(typeof DecompressionStream!=='function')throw Error('Cette présentation nécessite Chrome ou Edge récent.');
    blob=await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).blob();
   }else if(chunk.codec!=='raw')throw Error('Format média incompatible.');
   parts.push(blob);progress(Math.round(++count/total*100));
  }
  if(!isLive())return;
  const url=URL.createObjectURL(new Blob(parts,{type:asset.type}));for(const id of asset.ids)urls[id]=url;
 }
}
