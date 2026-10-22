import {strokeDash} from './vectorLines.js';
import { useEffect, useRef, useState } from 'react';
import { orderedLayers, resolveBackground } from './document.js';
import { TEXT_FONTS } from './textModel.js';

// Cache partagé : miniatures de 480 px, aucune copie du média dans IndexedDB.
const cache = new Map();
let work = Promise.resolve();
function thumbnail(media) {
  if (cache.has(media.blob)) return cache.get(media.blob).promise;
  const entry = { url:null };
  entry.promise = work = work.catch(()=>{}).then(async()=>{
    if(!cache.has(media.blob))return null;
    const bitmap = await createImageBitmap(media.blob, { resizeWidth:480, resizeQuality:'medium' });
    try {
      const canvas=window.document.createElement('canvas');const scale=Math.min(1,270/bitmap.height);canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.75));
      if(blob)entry.url=URL.createObjectURL(blob);
      return entry.url;
    } finally { bitmap.close(); }
  });
  cache.set(media.blob,entry); return entry.promise;
}
export function releaseThumbnails(media) {
  const keep=new Set(media.map(m=>m.blob));
  for(const [blob,entry] of cache)if(!keep.has(blob)){cache.delete(blob);entry.promise.finally(()=>{if(entry.url)URL.revokeObjectURL(entry.url);}).catch(()=>{});}
}
export default function TimelineThumbnail({ page, media, number, total }) {
  const element=useRef(null), canvas=useRef(null), [visible,setVisible]=useState(false), [urls,setUrls]=useState({});
  useEffect(()=>{
    const observer=new IntersectionObserver(entries=>{setVisible(entries[0].isIntersecting);},{root:element.current.closest('.timeline-rail'),rootMargin:'200px'});
    observer.observe(element.current);return()=>observer.disconnect();
  },[]);
  const ids=[resolveBackground(page,{kind:'initial'}),...page.layers.flatMap(l=>[l.imageId,l.frameMedia?.kind==='image'?l.frameMedia.mediaId:null]),...page.buttons.map(b=>b.imageId)].filter(Boolean).join(',');
  useEffect(()=>{
    if(!visible)return;
    let cancelled=false;
    const wanted=new Set(ids.split(','));
    Promise.all(media.filter(m=>wanted.has(m.id)).map(async m=>{try{return [m.id,await thumbnail(m)];}catch{return [m.id,null];}})).then(entries=>{if(!cancelled)setUrls(Object.fromEntries(entries));});
    return()=>{cancelled=true;};
  },[visible,ids,media]);
  const initial=page.states.find(s=>s.id===page.initialStateId);
  useEffect(()=>{
    if(!visible)return;let cancelled=false;
    async function draw(){
      const images=new Map();await Promise.all(Object.entries(urls).filter(([,url])=>url).map(async([id,url])=>{const image=new Image();image.src=url;try{await image.decode();images.set(id,image);}catch{}}));
      if(cancelled || !canvas.current)return;
      const ctx=canvas.current.getContext('2d'),w=480,h=270;ctx.clearRect(0,0,w,h);ctx.fillStyle='#161325';ctx.fillRect(0,0,w,h);
      const background=images.get(resolveBackground(page,initial?.background || page.defaultBackground));
      const contain=(image,x,y,width,height)=>{const scale=Math.min(width/image.width,height/image.height);ctx.drawImage(image,x+(width-image.width*scale)/2,y+(height-image.height*scale)/2,image.width*scale,image.height*scale);};
      if(background)contain(background,0,0,w,h);
      for(const layer of orderedLayers(page)){
        if(!(initial?.visibility?.[layer.id] ?? layer.visible))continue;
        const x=layer.x*w,y=layer.y*h,width=layer.width*w,height=layer.height*h;
        ctx.save();ctx.globalAlpha=layer.opacity;ctx.translate(x+width/2,y+height/2);ctx.rotate(layer.rotation*Math.PI/180);ctx.translate(-width/2,-height/2);
        if(layer.type==='vectorLine'){
          const s=layer.stroke,e=layer.endpoints,ax=e.x1*width,ay=e.y1*height,bx=e.x2*width,by=e.y2*height;
          if(s.enabled&&s.width>0){ctx.strokeStyle=ctx.fillStyle=s.color;ctx.globalAlpha=layer.opacity*s.opacity;ctx.lineWidth=s.width/4;ctx.lineCap=s.pattern==='dots'?'round':s.cap;ctx.setLineDash((strokeDash(s)||[]).map(n=>n/4));ctx.lineDashOffset=s.offset/4;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();ctx.setLineDash([]);
            const size=Math.max(s.width,.5)*s.decorationScale/4,a=Math.atan2(by-ay,bx-ax);
            for(const [x,y,kind,angle] of [[ax,ay,s.start,a+Math.PI],[bx,by,s.end,a]]){if(kind==='none')continue;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.beginPath();if(kind==='dot')ctx.arc(0,0,size/2,0,Math.PI*2);else {ctx.moveTo(0,0);ctx.lineTo(-size,-size*.5);ctx.lineTo(-size,size*.5);ctx.closePath();}ctx.fill();ctx.restore();}
          }ctx.restore();continue;
        }
        ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();ctx.fillStyle=layer.color || '#b8a0ec';
        if(['circle','rectangle','line'].includes(layer.type)||layer.type==='image'&&layer.border){
          const shape=()=>{ctx.beginPath();if(layer.type==='circle')ctx.ellipse(width/2,height/2,width/2,height/2,0,0,Math.PI*2);else ctx.roundRect(0,0,width,height,(layer.cornerRadius||0)/4);};
          shape();ctx.clip();if(layer.type!=='image'&&layer.fillMode!=='transparent'){ctx.globalAlpha=layer.opacity*(layer.fillOpacity??1);ctx.fill();ctx.globalAlpha=layer.opacity;}
          const m=layer.frameMedia,c=m?.crop,image=images.get(m?.mediaId||layer.imageId);
          if(image){ctx.save();if(c){ctx.translate(width/2+c.x*width,height/2+c.y*height);ctx.rotate((c.rotation||0)*Math.PI/180);ctx.scale(c.zoom,c.zoom);const scale=(c.mode==='cover'?Math.max:Math.min)(width/image.width,height/image.height);ctx.drawImage(image,-image.width*scale/2,-image.height*scale/2,image.width*scale,image.height*scale);}else contain(image,0,0,width,height);ctx.restore();}
          if(m?.kind==='video'){ctx.fillStyle='#ffffff';ctx.font='14px Arial';ctx.textAlign='center';ctx.fillText('▶',width/2,height/2+4);}
          if(layer.border?.enabled){shape();ctx.globalAlpha=layer.opacity*layer.border.opacity;ctx.strokeStyle=layer.border.color;ctx.lineWidth=layer.border.width/2;ctx.stroke();}
        }else if(layer.type==='image' || layer.type==='button'){const image=images.get(layer.imageId);if(image)contain(image,0,0,width,height);}
        else if(layer.type==='circle'){ctx.beginPath();ctx.ellipse(width/2,height/2,width/2,height/2,0,0,Math.PI*2);ctx.fill();}
        else if(layer.type==='text'){
          const style=layer.textStyle,size=style.fontSize/4,padding=style.padding/4,line=size*style.lineHeight;
          ctx.font=`${style.italic?'italic ':''}${style.bold?'bold ':''}${size}px ${TEXT_FONTS[style.font]?.css || 'Arial'}`;
          ctx.textBaseline='top';ctx.textAlign=style.align;ctx.letterSpacing=`${style.letterSpacing/4}px`;
          const content=style.uppercase?layer.content.toUpperCase():layer.content,lines=[];
          for(const paragraph of content.split('\n')){if(!style.wrap){lines.push(paragraph);continue;}let current='';for(const char of paragraph){if(current && ctx.measureText(current+char).width>width-2*padding){lines.push(current);current='';}current+=char;}lines.push(current);}
          const offset=style.verticalAlign==='center'?(height-lines.length*line)/2:style.verticalAlign==='bottom'?height-padding-lines.length*line:padding;
          const left=style.align==='center'?width/2:style.align==='right'?width-padding:padding;
          lines.forEach((text,index)=>{ctx.fillText(text,left,offset+index*line);if(style.underline){const length=ctx.measureText(text).width;ctx.fillRect(left-(style.align==='center'?length/2:style.align==='right'?length:0),offset+index*line+size,length,Math.max(.5,size/20));}});
        }else ctx.fillRect(0,0,width,height);
        ctx.restore();
      }
    }
    draw();return()=>{cancelled=true;};
  },[page,urls,visible]);
  return <div ref={element} className="thumbnail-image timeline-slide"><canvas ref={canvas} width="480" height="270" aria-hidden="true"/><span className="thumbnail-number">{number}</span><span className="thumbnail-layer-count">{page.layers.length+page.buttons.length} calques</span></div>;
}
