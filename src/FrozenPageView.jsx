import {useLayoutEffect,useRef} from 'react';
// Runtime-only DOM snapshot; never persisted, exported or uploaded.
export function capturePageView(source){
 if(!source)return null;
 const clone=source.cloneNode(true),originals=[source,...source.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')];
 originals.forEach((node,i)=>{
  const copy=copies[i];if(!copy?.style)return;
  const style=getComputedStyle(node);
  for(const key of ['transform','transformOrigin','translate','rotate','scale','opacity','filter','clipPath','visibility','strokeDasharray'])copy.style[key]=style[key];
  copy.style.animation='none';copy.style.transition='none';
  if(node.tagName==='CANVAS'){try{copy.getContext('2d').drawImage(node,0,0);}catch{}}
  if(node.tagName==='VIDEO'){
   copy.autoplay=false;copy.removeAttribute('autoplay');
   if(node.readyState>=2){const canvas=node.ownerDocument.createElement('canvas');canvas.width=node.videoWidth;canvas.height=node.videoHeight;canvas.className=copy.className;canvas.style.cssText=copy.style.cssText;try{canvas.getContext('2d').drawImage(node,0,0);copy.replaceWith(canvas);}catch{copy.removeAttribute('src');}}
   else copy.removeAttribute('src');
  }
 });
 const scrollPositions=originals.map((node,i)=>({node:copies[i],left:node.scrollLeft,top:node.scrollTop})).filter(p=>p.left||p.top);
 clone.restoreSnapshotScroll=()=>scrollPositions.forEach(p=>{p.node.scrollLeft=p.left;p.node.scrollTop=p.top;});
 clone.inert=true;clone.setAttribute('aria-hidden','true');return clone;
}
export default function FrozenPageView({snapshot}){
 const root=useRef(null);
 useLayoutEffect(()=>{if(!snapshot)return;root.current.append(snapshot);snapshot.restoreSnapshotScroll?.();return()=>snapshot.remove();},[snapshot]);
 return <div ref={root} className="frozen-page-view" aria-hidden="true" inert/>;
}
