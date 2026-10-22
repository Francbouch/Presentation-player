import {useRef} from 'react';
import {defaultCrop} from './imageLibrary.js';
import {clamp} from './document.js';

export function CropSettings({button, change, adjusting, setAdjusting, busy, copied, copy}) {
  const c=button.imageCrop || defaultCrop();
  const set=patch=>change(button.id,{imageCrop:{...c,...patch}});
  return <details className="property-section" open><summary>Cadrage de l’image</summary>
    <button className="ui-button" disabled={busy} onClick={()=>setAdjusting(!adjusting)}>{adjusting?'Terminer':'Ajuster l’image'}</button>
    <label className="field">Ajustement<select aria-label="Ajustement de l’image du bouton" disabled={busy} value={c.mode} onChange={e=>set({mode:e.target.value})}><option value="contain">Image entière</option><option value="cover">Remplir le cadre</option></select></label>
    <label className="field">Zoom de l’image : {Math.round(c.zoom*100)} %<input aria-label="Zoom de l’image du bouton" type="range" min="10" max="500" step="1" disabled={busy} value={Math.round(c.zoom*100)} onChange={e=>set({zoom:Number(e.target.value)/100})}/></label>
    <label className="field">Rotation de l’image (°)<input aria-label="Rotation de l’image du bouton (°)" type="number" min="-360" max="360" step="1" value={c.rotation||0} disabled={busy} onChange={e=>{if(e.target.value!==''&&Number.isFinite(e.target.valueAsNumber))set({rotation:clamp(e.target.valueAsNumber,-360,360)});}}/></label>
    <div className="button-row"><button className="ui-button" disabled={busy} onClick={()=>set({x:0,y:0})}>Recentrer</button><button className="ui-button" disabled={busy} onClick={()=>change(button.id,{imageCrop:defaultCrop()})}>Réinitialiser le cadrage</button></div>
    <div className="button-row"><button className="ui-button" disabled={busy} onClick={()=>copy({...c})}>Copier le cadrage</button><button className="ui-button" disabled={busy||!copied} onClick={()=>change(button.id,{imageCrop:{...copied}})}>Coller le cadrage</button></div>
    <p className="help">Double-cliquez sur le bouton dans l’éditeur pour cadrer son image. Glissez l’image dans le cadre fixe ; Échap termine le cadrage. Le zoom et la position sont proportionnels au cadre, y compris lors d’un collage.</p>
  </details>;
}

export function CropOverlay({item, change, begin, end, finish}) {
  const drag=useRef(null);
  function stop(event){event.stopPropagation();if(drag.current){drag.current=null;end();}if(event.currentTarget.hasPointerCapture?.(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}
  return <div className="crop-overlay" role="group" aria-label={`Cadrage de ${item.name}`} tabIndex={0} onClick={e=>e.stopPropagation()} onDoubleClick={e=>e.stopPropagation()} onKeyDown={e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish();}
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();e.stopPropagation();const c=item.imageCrop||defaultCrop();change(item.id,{imageCrop:{...c,x:clamp(c.x+(e.key==='ArrowLeft'?-.01:e.key==='ArrowRight'?.01:0),-2,2),y:clamp(c.y+(e.key==='ArrowUp'?-.01:e.key==='ArrowDown'?.01:0),-2,2)}});}
  }} onPointerDown={e=>{
    e.preventDefault();e.stopPropagation();if(e.button!==0)return;
    const bounds=e.currentTarget.closest('.interactive-button-layer').getBoundingClientRect();
    drag.current={x:e.clientX,y:e.clientY,c:item.imageCrop||defaultCrop(),w:bounds.width*item.width,h:bounds.height*item.height};
    begin();e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);
  }} onPointerMove={e=>{const d=drag.current;if(!d)return;e.stopPropagation();const a=(item.rotation||0)*Math.PI/180,dx=e.clientX-d.x,dy=e.clientY-d.y;change(item.id,{imageCrop:{...d.c,x:clamp(d.c.x+(dx*Math.cos(a)+dy*Math.sin(a))/d.w,-2,2),y:clamp(d.c.y+(-dx*Math.sin(a)+dy*Math.cos(a))/d.h,-2,2)}});}} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={()=>{if(drag.current){drag.current=null;end();}}}><span className="crop-label">Ajuster l’image · Échap pour terminer</span></div>;
}
