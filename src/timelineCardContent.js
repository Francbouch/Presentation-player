import {validateTextStyles,DEFAULT_TEXT_STYLE} from './textModel.js';
import {validateEditorialText} from './textLists.js';
import {validateFrames,frameCrop,framePlayback} from './mediaFrames.js';
import {validateYouTube} from './youtubeModel.js';
import {validateObjectEffects} from './objectEffects.js';

// Geometry uses stable, card-local logical pixels (encoded in the existing
// 1920/1080 layer units). Resizing the card never rewrites its child geometry.
export const cardPixels=(l)=>({x:l.x*1920,y:l.y*1080,width:l.width*1920,height:l.height*1080});
export const cardAppearance=(d={})=>({background:d.cardBackground||'#242632',opacity:1,transparent:false,radius:d.cardRadius??16,borderColor:d.cardBorder||'#77718e',borderWidth:1,shadow:d.cardShadow??20,padding:16,overflow:'auto',grid:false,magnetism:true});
export function cardSize(step,design){const r=step.cardLayout||design.cardLayout;return {width:r?r.width*1920:design.cardWidth,height:r?r.height*1080:design.cardHeight};}
export function cardContentStyle(content,d){const a={...cardAppearance(d),...content.appearance};return {background:a.transparent?'transparent':`color-mix(in srgb, ${a.background} ${a.opacity*100}%, transparent)`,border:`${a.borderWidth}px solid ${a.borderColor}`,borderRadius:`${a.radius}px`,boxShadow:`0 ${a.shadow/2}px ${a.shadow}px #0008`,padding:0,overflow:a.overflow==='visible'?'visible':'hidden'};}
export function cardToView(l,size){return {...l,x:l.x*1920/size.width,y:l.y*1080/size.height,width:l.width*1920/size.width,height:l.height*1080/size.height};}
export function cardFromView(p,size){const n={...p};for(const k of ['x','width'])if(k in n)n[k]=n[k]*size.width/1920;for(const k of ['y','height'])if(k in n)n[k]=n[k]*size.height/1080;return n;}
export function cardContentLayers(document){return [...document.pages.flatMap(p=>p.layers||[]),...(document.components||[]).flatMap(c=>c.layers||[])].flatMap(l=>(l.timeline?.steps||[]).flatMap(s=>s.cardContent?.layers||[]));}
export function legacyCardContent(step,d,size){
 const layers=[],margin=16,width=Math.max(80,size.width-margin*2);let y=0;
 const base=(type,name,height)=>({id:crypto.randomUUID(),type,name:name.slice(0,80),x:0,y:y/1080,width:width/1920,height:height/1080,rotation:0,opacity:1,visible:true,locked:false,color:d.cardText||'#ffffff'});
 const text=(name,value,fontSize,bold=false)=>{if(!value)return;const height=Math.max(fontSize*1.4,Math.ceil(value.length/Math.max(10,width/(fontSize*.55)))*fontSize*1.3);layers.push({...base('text',name,height),content:value,textStyle:{...DEFAULT_TEXT_STYLE,font:d.font||'arial',fontSize:Math.max(8,Math.min(320,fontSize)),bold,autoHeight:false}});y+=height+10;};
 text('Titre',step.name,d.fontSize||24,true);text('Date et statut',[step.date,({upcoming:'À venir',current:'En cours',done:'Terminée'})[step.status]||step.status].filter(Boolean).join(' · '),Math.max(12,(d.fontSize||24)*.7));text('Description',step.description,d.fontSize||24);
 for(const kind of ['image','video'])if(step[`${kind}Id`]){layers.push({...base('rectangle',kind==='image'?'Image':'Vidéo',kind==='image'?150:180),frameMedia:{mediaId:step[`${kind}Id`],kind,crop:{...frameCrop(),mode:'contain'},playback:{...framePlayback(),controls:true,autoplay:kind==='video'&&d.cardAutoplay}}});y+=(kind==='image'?150:180)+10;}
 text('Détails',step.details,d.fontSize||24);
 return {version:1,layers,layerOrder:layers.map(l=>l.id),appearance:cardAppearance(d)};
}
export function validateCardContents(document){
 const fail=()=>{throw new Error('Le contenu des fiches Timeline est invalide. Votre projet est conservé.');},finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max,color=v=>/^#[0-9a-f]{6}$/i.test(v);
 for(const layer of [...document.pages.flatMap(p=>p.layers||[]),...(document.components||[]).flatMap(c=>c.layers||[])])for(const step of layer.timeline?.steps||[]){
  const c=step.cardContent;if(c===undefined)continue;
  if(!c||c.version!==1||!Array.isArray(c.layers)||c.layers.length>100||!Array.isArray(c.layerOrder))fail();
  const ids=new Set();for(const l of c.layers){if(!l||!['text','rectangle','circle','line','youtube'].includes(l.type)||typeof l.id!=='string'||!l.id||l.id.length>200||ids.has(l.id)||typeof l.name!=='string'||l.name.length>80||!['visible','locked'].every(k=>typeof l[k]==='boolean')||!['x','y','width','height'].every(k=>finite(l[k],0,100))||l.width<=0||l.height<=0||!finite(l.rotation,-360,360)||!finite(l.opacity,0,1)||!color(l.color))fail();ids.add(l.id);validateYouTube(l);validateObjectEffects(l.objectEffects);if(l.type==='text'&&(typeof l.content!=='string'||l.content.length>10000))fail();}
  if(c.layerOrder.length!==ids.size||new Set(c.layerOrder).size!==ids.size||c.layerOrder.some(id=>!ids.has(id)))fail();
  const a=c.appearance;if(!a||!color(a.background)||!color(a.borderColor)||!finite(a.opacity,0,1)||!finite(a.radius,0,100)||!finite(a.borderWidth,0,30)||!finite(a.shadow,0,80)||!finite(a.padding,0,100)||!['hidden','auto','visible'].includes(a.overflow)||!['transparent','grid','magnetism'].every(k=>typeof a[k]==='boolean'))fail();
  const page={layers:c.layers,buttons:[]};validateTextStyles([page]);validateEditorialText([page]);validateFrames({...document,pages:[page],components:[]});
 }
}
