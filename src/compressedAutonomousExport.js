import {decodeBase64Bytes} from './base64Bytes.js';
import {autonomousSnapshot,base64,htmlEscape,jsonForScript} from './autonomousExport.js';
export const SHARE_LIMIT=250_000_000;
const CHUNK=3*1024*1024; // divisible by 3, bounded base64 allocation
const aborted=signal=>{if(signal?.aborted)throw new DOMException('Export annulé.','AbortError');};
export function videoBudget(maxBytes,overhead,imageBytes,duration,audioDuration){
 const available=(maxBytes-overhead)*.73-imageBytes; // base64 + scripts + safety margin
 if(available<=0)throw Error('Les images seules dépassent la place disponible. Utilisez le dossier autonome ou réduisez les images dans une copie du projet.');
 const bitrate=Math.floor((available*8*.85-audioDuration*128000)/Math.max(duration,1));
 if(bitrate<650000)throw Error('Cette présentation contient trop de vidéos pour tenir dans cette taille avec une qualité correcte. Utilisez le dossier autonome ou une présentation plus courte.');
 return Math.min(bitrate,6_000_000);
}
async function inspectVideo(item,mb,signal){
 aborted(signal);const input=new mb.Input({source:new mb.BlobSource(item.blob),formats:mb.ALL_FORMATS});
 try{
  const tracks=await input.getVideoTracks(),audio=await input.getAudioTracks(),duration=await input.computeDuration();
  if(!tracks.length||!Number.isFinite(duration)||duration<=0)throw Error('Durée ou piste vidéo invalide.');
  return {duration,tracks:tracks.length,audio:audio.length};
 }finally{input.dispose();}
}
export async function compressVideo(item,{bitrate,highQuality=false,signal,progress=()=>{}}){
 aborted(signal);const mb=await import('mediabunny');
 const input=new mb.Input({source:new mb.BlobSource(item.blob),formats:mb.ALL_FORMATS});
 let conversion;
 const cancel=()=>{void conversion?.cancel().catch(()=>{});};signal?.addEventListener('abort',cancel,{once:true});
 try{
  const qualityOptions=highQuality?{quality:mb.QUALITY_HIGH}:{bitrate};
  if(!await mb.canEncodeVideo('vp9',qualityOptions)||((await input.getAudioTracks()).length&&!await mb.canEncodeAudio('opus',{bitrate:128000})))throw Error('La compression vidéo n’est pas disponible dans ce navigateur. Essayez Chrome ou Edge récent sur ordinateur.');
  const target=new mb.BufferTarget(),output=new mb.Output({format:new mb.WebMOutputFormat(),target});
  conversion=await mb.Conversion.init({input,output,showWarnings:false,tags:{},video:async track=>{
   const width=await track.getDisplayWidth(),height=await track.getDisplayHeight(),maxWidth=!highQuality&&bitrate<1_500_000?1280:1920,maxHeight=!highQuality&&bitrate<1_500_000?720:1080;
   return {codec:'vp9',...qualityOptions,forceTranscode:true,width:Math.max(2,Math.floor(width*Math.min(1,maxWidth/width,maxHeight/height)/2)*2),keyFrameInterval:2,alpha:'keep',allowTransformationMetadata:false};
  },audio:{codec:'opus',bitrate:128000,forceTranscode:true}});
  if(!conversion.isValid||conversion.discardedTracks.length)throw Error('Une piste vidéo ou audio ne peut pas être conservée. La copie n’a pas été exportée ; essayez un autre navigateur ou le dossier autonome.');
  aborted(signal);conversion.onProgress=p=>progress(Math.round(p*100));await conversion.execute();aborted(signal);
  const blob=new Blob([target.buffer],{type:'video/webm'});
  // Never keep a recompressed copy larger than its source.
  return blob.size<item.blob.size?{...item,type:'video/webm',name:item.name.replace(/\.[^.]+$/,'')+'.webm',blob}:item;
 }catch(error){aborted(signal);throw error;}finally{signal?.removeEventListener('abort',cancel);if(conversion&&conversion.state!=='done')await conversion.cancel().catch(()=>{});input.dispose();}
}
const bootstrap=`window.__studioEmbeddedMedia={};window.__studioParts=[];window.__studioDecode=${decodeBase64Bytes.toString()};window.__studioAppend=function(s){window.__studioParts.push(new Blob([window.__studioDecode(s)]));};window.__studioFinish=function(i,t){window.__studioEmbeddedMedia[i]=new Blob(window.__studioParts,{type:t});window.__studioParts=[];};`;
export async function assembleSinglePresentation(snapshot,media,runtime,{signal,maxBytes=SHARE_LIMIT,progress=()=>{},writer,assetIds}={}){
 const assets=media.map((m,index)=>({ids:assetIds?.[index]||[m.id],type:m.type,embedded:index}));
 const payload={format:1,document:snapshot,assets,fonts:runtime.fonts};
 const style=runtime.css.replace(/<\/style/gi,'<\\/style'),script=runtime.js.replace(/<\/script/gi,'<\\/script');
 const opening=`<!doctype html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><title>${htmlEscape(snapshot.title)}</title><style>${style}</style></head><body><div id="root"><p>Préparation de la présentation…</p></div><script>${bootstrap}</script>`;
 const parts=[];let size=0;
 const append=async part=>{aborted(signal);const blob=new Blob([part]);size+=blob.size;if(size>maxBytes)throw Error('Le fichier final dépasse la taille choisie. Aucun fichier trop volumineux n’a été téléchargé. Utilisez le dossier autonome ou réduisez les vidéos.');if(writer)await writer.write(blob);else parts.push(blob);};
 await append(opening);
 for(let index=0;index<media.length;index++){
  const item=media[index];
  if(item.type.startsWith('image/')){try{const bitmap=await createImageBitmap(item.blob);bitmap.close();}catch{throw Error(`L’image « ${item.name} » est illisible. Réimportez-la puis réessayez ; votre projet est inchangé.`);}}
  progress(`Intégration des médias : ${index+1} / ${media.length}…`);
  for(let offset=0;offset<item.blob.size;offset+=CHUNK){aborted(signal);await append(`<script>window.__studioAppend("${await base64(item.blob.slice(offset,offset+CHUNK))}");document.currentScript.remove();</script>`);}
  await append(`<script>window.__studioFinish(${index},${jsonForScript(item.type)});document.currentScript.remove();</script>`);
 }
 await append(`<script>delete window.__studioAppend;delete window.__studioDecode;delete window.__studioFinish;delete window.__studioParts;window.__studioPresentation=${jsonForScript(payload)};</script><script>${script}</script>`);
 await append(`<script type="application/json" id="studio-licenses">${jsonForScript(runtime.licenses)}</script></body></html>`);
 aborted(signal);return writer?{size}:new Blob(parts,{type:'text/html;charset=utf-8'});
}
export async function buildCompressedPresentation(document,{maxBytes=SHARE_LIMIT,signal,progress=()=>{},writer}={}){
 const {snapshot,media}=autonomousSnapshot(document);aborted(signal);
 if(!snapshot.pages.length)throw Error('Ajoutez une page avant d’exporter.');
 progress('Préparation du lecteur…');const response=await fetch(`${import.meta.env.BASE_URL}autonomous-player.json`,{signal,cache:'no-store'});
 if(!response.ok)throw Error('Lecteur autonome indisponible. Rechargez puis réessayez.');
 const runtime=await response.json();if(runtime.format!==1||!runtime.js||!runtime.css||!runtime.fonts||!runtime.licenses)throw Error('Lecteur incompatible. Rechargez l’application.');
 const overhead=new Blob([runtime.js,runtime.css,jsonForScript({document:snapshot,fonts:runtime.fonts,licenses:runtime.licenses})]).size+65536;
 const total=media.reduce((n,m)=>n+m.blob.size,0);let prepared=media;
 if(total*4/3+overhead>maxBytes*.97){
  const videos=media.filter(m=>m.type.startsWith('video/')),images=media.filter(m=>!m.type.startsWith('video/')).reduce((n,m)=>n+m.blob.size,0);
  if(!videos.length)throw Error('Les images dépassent la taille choisie. Utilisez le dossier autonome ou réduisez les images.');
  const mb=await import('mediabunny'),details=[];
  for(const item of videos){progress(`Analyse de « ${item.name} »…`);try{details.push({item,...await inspectVideo(item,mb,signal)});}catch(error){if(signal?.aborted)throw new DOMException('Export annulé.','AbortError');throw Error(`Impossible de lire « ${item.name} » : ${error.message}`);}}
  const duration=details.reduce((n,v)=>n+v.duration*v.tracks,0),audioDuration=details.reduce((n,v)=>n+v.duration*v.audio,0);
  const bitrate=videoBudget(maxBytes,overhead,images,duration,audioDuration),replacements=new Map();
  for(let i=0;i<details.length;i++){
   const {item,duration,tracks,audio}=details[i];aborted(signal);
   if(item.blob.size<=duration*(bitrate*tracks+audio*128000)/8){replacements.set(item.id,item);continue;}
   progress(`Compression vidéo ${i+1} / ${details.length} : 0 %…`);
   try{replacements.set(item.id,await compressVideo(item,{bitrate,signal,progress:p=>progress(`Compression vidéo ${i+1} / ${details.length} : ${p} %…`)}));}
   catch(error){if(signal?.aborted)throw new DOMException('Export annulé.','AbortError');throw Error(`Impossible de compresser « ${item.name} » : ${error.message}`);}
  }
  prepared=media.map(m=>replacements.get(m.id)||m);
 }
 return assembleSinglePresentation(snapshot,prepared,runtime,{signal,maxBytes,progress,writer});
}
export function downloadSinglePresentation(blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='presentation-interactive.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}

// A single self-contained file, without size budget, video analysis or transcoding.
export function buildOriginalPresentation(document,options={}){
 return buildCompressedPresentation(document,{...options,maxBytes:Infinity});
}
export async function saveSinglePresentation(document,build,{signal,progress=()=>{}}={}){
 aborted(signal);
 const handle=await window.showSaveFilePicker({suggestedName:'presentation-interactive.html',types:[{description:'Présentation interactive HTML',accept:{'text/html':['.html']}}]});
 aborted(signal);let writer;
 try{
  writer=await handle.createWritable();
  const result=await build(document,{signal,progress,writer});
  aborted(signal);await writer.close();return {...result,saved:true};
 }catch(error){try{await writer?.abort();}catch{}throw error;}
}

export function saveOriginalPresentation(document,options={}){
 return saveSinglePresentation(document,buildOriginalPresentation,options);
}
