import {orderedLayers,resolveBackground,uid,clamp} from './document.js';
export function pasteLayer(clipboard,destination,document,count=1){
 const {layer,source}=clipboard;
 const mediaIds=new Set(document.media.map(m=>m.id));
 const copy={...structuredClone(layer),id:uid(),name:`${layer.name.slice(0,70)} (copie)`};
 copy.locked=layer.ownLocked??layer.locked;delete copy.ownLocked;delete copy.folderLocked;delete copy.folderHidden;
 const shift=(value,size)=>clamp(value+Math.min(count,5)*.03<=1-size?value+Math.min(count,5)*.03:value-.03,0,1-size);
 copy.x=shift(layer.x,layer.width);copy.y=shift(layer.y,layer.height);
 if(copy.imageId&&!mediaIds.has(copy.imageId))copy.imageId=null;
 if(copy.frameMedia&&!mediaIds.has(copy.frameMedia.mediaId))copy.frameMedia=null;
 const localIds=new Set(orderedLayers(destination).map(l=>l.id));localIds.add(copy.id);
 const remapId=id=>id===layer.id?copy.id:id;
 const crossPage=source.id!==destination.id;
 const background=target=>{if(!target)return target;if(target.kind==='media')return mediaIds.has(target.mediaId)?target:null;if(!crossPage)return target;const mediaId=resolveBackground(source,target);return mediaId&&mediaIds.has(mediaId)?{kind:'media',mediaId}:null;};
 if(copy.type==='button'){
  delete copy.type;copy.defaultSelected=false;
  copy.target=background(copy.target);
  if(copy.action){const a={...copy.action};if(a.target)a.target=background(a.target);if(a.finalBackground)a.finalBackground=background(a.finalBackground);
   if(a.layerIds){a.layerIds=a.layerIds.map(remapId).filter(id=>localIds.has(id));if(a.targetModes)a.targetModes=Object.fromEntries(Object.entries(a.targetModes).map(([id,mode])=>[remapId(id),mode]).filter(([id])=>a.layerIds.includes(id)));}
   if(a.type==='video'&&a.finalStateId&&!destination.states.some(s=>s.id===a.finalStateId)){a.missingFinalStateId=a.finalStateId;a.finalStateId=null;}
   if(a.type==='state'&&!destination.states.some(s=>s.id===a.stateId))a.stateId=null;
   for(const key of ['videoId','transitionId'])if(a[key]&&!mediaIds.has(a[key]))a[key]=null;
   if(a.pageId&&!document.pages.some(p=>p.id===a.pageId))a.pageId=null;
   copy.action=a;
  }
 }
 return copy;
}
