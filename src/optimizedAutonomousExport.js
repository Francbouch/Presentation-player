import {autonomousSnapshot} from './autonomousExport.js';
import {assembleSinglePresentation,compressVideo,saveSinglePresentation} from './compressedAutonomousExport.js';
const check=signal=>{if(signal?.aborted)throw new DOMException('Export annulé.','AbortError');};
// Animated images must never be flattened to their first frame.
async function animated(blob,type){
 if(type==='image/webp'){const b=new Uint8Array(await blob.slice(0,32).arrayBuffer());return String.fromCharCode(...b.slice(12,16))==='VP8X'&&!!(b[20]&2);}
 if(type==='image/png'){
  let offset=8;
  for(let n=0;n<100&&offset+8<blob.size;n++){
   const b=new Uint8Array(await blob.slice(offset,offset+8).arrayBuffer()),kind=String.fromCharCode(...b.slice(4));
   if(kind==='acTL')return true;if(kind==='IDAT')return false;
   offset+=new DataView(b.buffer).getUint32(0)+12;
  }
  return true; // Unknown large metadata: preserve rather than risk flattening.
 }
 return false;
}
export async function optimizeImage(item,{signal}={}){
 check(signal);if(!['image/png','image/jpeg','image/jpg','image/webp'].includes(item.type)||await animated(item.blob,item.type))return item;
 const image=await createImageBitmap(item.blob);let canvas;
 try{
  check(signal);
  // Preserve small icons and inspect alpha at original resolution, before resizing.
  if(Math.max(image.width,image.height)<=512)return item;
  canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=Math.min(64,image.height);
  const context=canvas.getContext('2d',{willReadFrequently:true});
  // Scan strips instead of allocating an extra full-resolution RGBA copy.
  for(let y=0;y<image.height;y+=64){
   check(signal);const height=Math.min(64,image.height-y);context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,y,image.width,height,0,0,image.width,height);const data=context.getImageData(0,0,image.width,height).data;
   for(let i=3;i<data.length;i+=4)if(data[i]!==255)return item;
  }
  const scale=Math.min(1,2560/image.width,1440/image.height);
  canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
  context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(image,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.92));check(signal);
  if(!blob||blob.type!=='image/webp'||blob.size>=item.blob.size*.9)return item;
  return {...item,blob,type:'image/webp',name:item.name.replace(/\.[^.]+$/,'')+'.webp'};
 }finally{image.close();if(canvas){canvas.width=0;canvas.height=0;}}
}
async function fingerprint(item,signal){
 const hashes=[];
 for(let offset=0;offset<item.blob.size;offset+=4*1024*1024){
  check(signal);const bytes=await item.blob.slice(offset,offset+4*1024*1024).arrayBuffer();
  hashes.push(Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join(''));
 }
 check(signal);return item.type+':'+item.blob.size+':'+hashes.join(':');
}
export async function buildOptimizedPresentation(document,{signal,progress=()=>{},writer}={}){
 const {snapshot,media}=autonomousSnapshot(document);check(signal);
 if(!snapshot.pages.length)throw Error('Ajoutez une page avant d’exporter.');
 progress('Préparation de la copie optimisée…');
 const response=await fetch(`${import.meta.env.BASE_URL}autonomous-player.json`,{signal,cache:'no-store'});
 if(!response.ok)throw Error('Lecteur autonome indisponible. Rechargez puis réessayez.');
 const runtime=await response.json();if(runtime.format!==1||!runtime.js||!runtime.css||!runtime.fonts||!runtime.licenses)throw Error('Lecteur incompatible. Rechargez l’application.');
 const prepared=[],assetIds=[],seen=new Map(),summary={originalMediaBytes:media.reduce((n,m)=>n+m.blob.size,0),optimizedMediaBytes:0,imagesChanged:0,videosChanged:0,duplicatesRemoved:0,warnings:[]};
 for(let index=0;index<media.length;index++){
  check(signal);const item=media[index];let next=item;
  progress(`Optimisation : ${index+1} / ${media.length} · ${item.name}…`);
  const key=await fingerprint(item,signal),previous=seen.get(key);
  if(previous!==undefined){assetIds[previous].push(item.id);summary.duplicatesRemoved++;continue;}
  try{
   if(item.type.startsWith('video/'))next=await compressVideo(item,{highQuality:true,signal,progress:p=>progress(`Vidéo ${index+1} / ${media.length} : ${p} % · ${item.name}…`)});
   else next=await optimizeImage(item,{signal});
  }catch(error){check(signal);summary.warnings.push(`« ${item.name} » : original conservé (${error.message}).`);}
  if(next!==item){if(item.type.startsWith('video/'))summary.videosChanged++;else summary.imagesChanged++;}
  seen.set(key,prepared.length);prepared.push(next);assetIds.push([item.id]);summary.optimizedMediaBytes+=next.blob.size;
 }
 const output=await assembleSinglePresentation(snapshot,prepared,runtime,{signal,progress,writer,maxBytes:Infinity,assetIds});
 return {output,summary};
}
export async function saveOptimizedPresentation(document,options={}){
 let summary;
 const output=await saveSinglePresentation(document,async(project,settings)=>{const result=await buildOptimizedPresentation(project,settings);summary=result.summary;return result.output;},options);
 return {output,summary};
}
