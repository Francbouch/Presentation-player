import {boundsOf,snapGeometry} from './editorGeometry.js';
import {CropOverlay} from './ImageCrop.jsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp, MIN_BUTTON_SIZE } from './document.js';
import ButtonSurface, {effectFor} from './ButtonSurface.jsx';
import TextBlock from './TextBlock.jsx';

// Une surface commune conserve le même ordre et la même géométrie pour tous
// les calques, y compris les boutons créés avant l’éditeur de calques.
export default function InteractiveButtons({ buttons, urls, activeButtonId, selectedGroups = {}, showActiveButton, onActivate, editing = false, selectedButtonId, onSelect, onGeometryChange, disabled = false, cropId, onCrop, beginGesture, endGesture, magnetism = true, selection = [], onBatchChange, onEnterGroup, isVisualGroup = false }) {
  const [hovered,setHovered]=useState(null);
  const [pulse,setPulse]=useState(null);
  useEffect(()=>{if(!pulse)return;const timer=setTimeout(()=>setPulse(null),pulse.duration);return()=>clearTimeout(timer);},[pulse]);
  const layer = useRef(null);
  const gesture = useRef(null);
  const [draft, setDraft] = useState(null);
  const [marquee,setMarquee]=useState(null);
  const [multiDraft,setMultiDraft]=useState(null);
  const multiItems=buttons.filter(b=>selection.includes(b.id));
  const multiBox=boundsOf(multiItems.map(i=>({...i,...multiDraft?.[i.id]})));
  const [textEditingId, setTextEditingId] = useState(null);
  const [textHeights, setTextHeights] = useState({});
  const measuredHeight = useCallback((id, height) => setTextHeights(previous => Math.abs((previous[id] ?? -1) - height) < .00001 ? previous : { ...previous, [id]: height }), []);
  useEffect(() => { if (!editing || (textEditingId && textEditingId !== selectedButtonId)) setTextEditingId(null); }, [editing, selectedButtonId, textEditingId]);

  function start(event, item, kind) {
    if (cropId || !editing || disabled || event.button !== 0 || gesture.current || event.target.closest('[contenteditable]')) return;
    event.preventDefault(); event.stopPropagation();
    if(event.shiftKey){onSelect(item.id,event);return;}
    const resolved=selection.includes(item.id)?selection:onSelect(item.id,event);
    const resolvedItems=buttons.filter(b=>(resolved||[]).includes(b.id));
    const groupItems=selection.includes(item.id)&&multiItems.length>1?multiItems:resolvedItems.length>1?resolvedItems:null;
    if(groupItems){startMulti(event,kind,groupItems);return;}
    onSelect(item.id,event);
    if (item.locked) return;
    const frame = event.currentTarget;
    const bounds = layer.current.getBoundingClientRect();
    const center = { x: bounds.left + (item.x + item.width / 2) * bounds.width, y: bounds.top + (item.y + item.height / 2) * bounds.height };
    frame.focus();
    gesture.current = { id: item.id, type: item.type, pointerId: event.pointerId, kind, clientX: event.clientX, clientY: event.clientY, bounds, center, angle: Math.atan2(event.clientY - center.y, event.clientX - center.x), rect: { x: item.x, y: item.y, width: item.width, height: item.height, rotation: item.rotation || 0 }, frame };
    frame.setPointerCapture(event.pointerId);
  }
  function startMulti(event,kind,items=multiItems){if(items.some(i=>i.locked))return;event.preventDefault();event.stopPropagation();const frame=event.currentTarget,bounds=layer.current.getBoundingClientRect(),box=boundsOf(items);gesture.current={multi:true,items,box,bounds,kind,clientX:event.clientX,clientY:event.clientY,pointerId:event.pointerId,frame};frame.setPointerCapture(event.pointerId);}
  function move(event) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if(current.multi){const {bounds,box,items,kind}=current;const dx=(event.clientX-current.clientX)/bounds.width,dy=(event.clientY-current.clientY)/bounds.height;let next={...box};
      if(kind==='move'){next.x=Math.max(0,Math.min(1-box.width,box.x+dx));next.y=Math.max(0,Math.min(1-box.height,box.y+dy));if(magnetism&&!event.altKey){const snapped=snapGeometry(next,buttons.filter(b=>!items.some(i=>i.id===b.id)&&b.visible!==false),bounds);next=snapped.rect;setDraft({rect:next,guides:snapped.guides,measures:snapped.measures});}}
      else if(kind==='rotate'){const cx=bounds.left+(box.x+box.width/2)*bounds.width,cy=bounds.top+(box.y+box.height/2)*bounds.height;const angle=(Math.atan2(event.clientY-cy,event.clientX-cx)-Math.atan2(current.clientY-cy,current.clientX-cx));const patches=Object.fromEntries(items.map(i=>{const x=(i.x+i.width/2-box.x-box.width/2)*1920,y=(i.y+i.height/2-box.y-box.height/2)*1080;return[i.id,{x:box.x+box.width/2+(x*Math.cos(angle)-y*Math.sin(angle))/1920-i.width/2,y:box.y+box.height/2+(x*Math.sin(angle)+y*Math.cos(angle))/1080-i.height/2,rotation:((((i.rotation||0)+angle*180/Math.PI+180)%360)+360)%360-180}];}));if(items.every(i=>{const p=patches[i.id];return p.x>=0&&p.y>=0&&p.x+i.width<=1&&p.y+i.height<=1;})){current.patches=patches;setMultiDraft(patches);}return;}
      else{const west=kind.includes('w'),north=kind.includes('n');let scale=Math.max(...items.map(i=>MIN_BUTTON_SIZE/Math.min(i.width,i.height)),1+((west?-dx:dx)/box.width+(north?-dy:dy)/box.height)/2);scale=Math.min(scale,(west?box.x+box.width:1-box.x)/box.width,(north?box.y+box.height:1-box.y)/box.height);next.width=box.width*scale;next.height=box.height*scale;if(west)next.x=box.x+box.width-next.width;if(north)next.y=box.y+box.height-next.height;}
      const scale=next.width/box.width;const patches=Object.fromEntries(items.map(i=>[i.id,{x:next.x+(i.x-box.x)*scale,y:next.y+(i.y-box.y)*scale,width:i.width*scale,height:i.height*scale}]));if(Object.values(patches).every(p=>p.width>=MIN_BUTTON_SIZE&&p.height>=MIN_BUTTON_SIZE&&p.x>=0&&p.y>=0&&p.x+p.width<=1.00000001&&p.y+p.height<=1.00000001)){current.patches=patches;setMultiDraft(patches);}return;
    }
    const { bounds, rect: initial } = current;
    const dx = event.clientX - current.clientX;
    const dy = event.clientY - current.clientY;
    const rect = { ...initial };
    if (current.kind === 'rotate') {
      const angle = Math.atan2(event.clientY - current.center.y, event.clientX - current.center.x);
      rect.rotation = ((initial.rotation + (angle - current.angle) * 180 / Math.PI + 540) % 360) - 180;
    } else if (current.kind === 'move') {
      rect.x = clamp(rect.x + dx / bounds.width, 0, 1 - rect.width);
      rect.y = clamp(rect.y + dy / bounds.height, 0, 1 - rect.height);
    } else {
      const radians = initial.rotation * Math.PI / 180;
      const cos = Math.cos(radians), sin = Math.sin(radians);
      const localX = dx * cos + dy * sin, localY = -dx * sin + dy * cos;
      const west = current.kind.includes('w'), north = current.kind.includes('n');
      rect.width = clamp(initial.width + localX / bounds.width * (west ? -1 : 1), MIN_BUTTON_SIZE, 1);
      rect.height = clamp(initial.height + localY / bounds.height * (north ? -1 : 1), MIN_BUTTON_SIZE, 1);
      const shiftX = (rect.width - initial.width) * bounds.width / 2 * (west ? -1 : 1);
      const shiftY = (rect.height - initial.height) * bounds.height / 2 * (north ? -1 : 1);
      rect.x = clamp(initial.x + initial.width / 2 + (shiftX * cos - shiftY * sin) / bounds.width - rect.width / 2, 0, 1 - rect.width);
      rect.y = clamp(initial.y + initial.height / 2 + (shiftX * sin + shiftY * cos) / bounds.height - rect.height / 2, 0, 1 - rect.height);
    }
    let guides = [], measures = [];
    if(magnetism && !event.altKey && current.kind !== 'rotate') {
      const snapped=snapGeometry(rect,buttons.filter(item=>item.id!==current.id&&item.visible!==false),bounds,current.kind);
      Object.assign(rect,snapped.rect);guides=snapped.guides;measures=snapped.measures;
      rect.width=clamp(rect.width,MIN_BUTTON_SIZE,1);rect.height=clamp(rect.height,MIN_BUTTON_SIZE,1);
      rect.x=clamp(rect.x,0,1-rect.width);rect.y=clamp(rect.y,0,1-rect.height);
    }
    current.next = rect;
    setDraft({ id: current.id, rect, guides, measures });
  }
  function end(event, cancelled = false) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    gesture.current = null; setDraft(null);setMultiDraft(null);
    if(current.multi){if(!cancelled&&current.patches)onBatchChange?.(current.patches);if(current.frame.hasPointerCapture(event.pointerId))current.frame.releasePointerCapture(event.pointerId);return;}
    if (!cancelled && current.next) onGeometryChange(current.id, current.next);
    if (current.frame.hasPointerCapture(event.pointerId)) current.frame.releasePointerCapture(event.pointerId);
  }
  function keyAdjust(event, item, resize = false) {
    if (!editing || disabled || item.locked || event.target.closest('[contenteditable]') || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const step = event.shiftKey ? .05 : .01;
    const dx = event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0;
    const dy = event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0;
    const rect = resize ? { width: clamp(item.width + dx, MIN_BUTTON_SIZE, 1 - item.x), height: clamp(item.height + dy, MIN_BUTTON_SIZE, 1 - item.y) } : { x: clamp(item.x + dx, 0, 1 - item.width), y: clamp(item.y + dy, 0, 1 - item.height) };
    if(selection.includes(item.id)&&multiItems.length>1){if(multiItems.some(i=>i.locked))return;onBatchChange?.(Object.fromEntries(multiItems.map(i=>[i.id,{x:clamp(i.x+dx,0,1-i.width),y:clamp(i.y+dy,0,1-i.height)}])));}else onGeometryChange(item.id, rect);
  }
  const pointerEvents = { onPointerMove: move, onPointerUp: event => end(event), onPointerCancel: event => end(event, true), onLostPointerCapture: event => end(event, true) };
  const contrastGroups=new Map();
  if(!editing)for(const b of buttons){if(!b.selectionGroup||b.visible===false)continue;const f=effectFor(b,{active:selectedGroups[b.selectionGroup]===b.id,hovered:hovered===b.id,clicked:pulse?.id===b.id}).contrastEffect;if(f)contrastGroups.set(b.selectionGroup,{id:b.id,effect:f});}
  return <div ref={layer} className={`interactive-button-layer ${editing ? 'positioning' : ''}`} onPointerDown={event=>{if(!editing||disabled||event.target!==event.currentTarget)return;const b=layer.current.getBoundingClientRect(),start={x:(event.clientX-b.left)/b.width,y:(event.clientY-b.top)/b.height};event.currentTarget.setPointerCapture(event.pointerId);setMarquee({start,end:start,shift:event.shiftKey});}} onPointerMove={event=>{if(!marquee)return;const b=layer.current.getBoundingClientRect();setMarquee({...marquee,end:{x:(event.clientX-b.left)/b.width,y:(event.clientY-b.top)/b.height}});}} onPointerUp={event=>{if(!marquee)return;const x=Math.min(marquee.start.x,marquee.end.x),y=Math.min(marquee.start.y,marquee.end.y),r=Math.max(marquee.start.x,marquee.end.x),bottom=Math.max(marquee.start.y,marquee.end.y);const ids=buttons.filter(b=>!b.locked&&b.visible!==false).filter(b=>{const a=boundsOf([b]);return a.x>=x&&a.y>=y&&a.x+a.width<=r&&a.y+a.height<=bottom;}).map(b=>b.id);onSelect(null);if(ids.length)onSelect(ids,{marquee:true,shiftKey:marquee.shift});setMarquee(null);}} onPointerCancel={()=>setMarquee(null)} aria-label="Calques de la diapositive">
    {buttons.filter(item => item.visible !== false).map(item => {
      const rect = multiDraft?.[item.id] ? {...item,...multiDraft[item.id]} : draft?.id === item.id ? draft.rect : item.type === 'text' && item.textStyle.autoHeight && textHeights[item.id] !== undefined ? { ...item, height: Math.min(textHeights[item.id], 1 - item.y) } : item;
      const selected = editing && (selection.includes(item.id)||selectedButtonId === item.id);
      const isButton = item.type === 'button' || !item.type;
      const active = isButton && (item.selectionGroup ? selectedGroups[item.selectionGroup]===item.id : activeButtonId === item.id && (!item.interactiveEffects && !item.indicator || ['background','state'].includes(item.action?.type)));
      const effect=effectFor(item,{active:!editing&&active,hovered:!editing&&hovered===item.id,clicked:!editing&&pulse?.id===item.id});
      const contrastSource=contrastGroups.get(item.selectionGroup);
      const contrastEffect=contrastSource?.effect;
      const darkness=contrastSource&&contrastSource.id!==item.id?contrastEffect.darkness:0;
      const writing = textEditingId === item.id;
      const Content = item.type === 'text' ? 'div' : editing || isButton ? 'button' : 'div';
      return <div key={item.id} data-layer-id={item.id} data-button-id={isButton ? item.id : undefined} className={`interactive-button-frame layer-frame ${selected ? 'is-selected' : ''} ${item.locked ? 'is-locked' : ''} ${showActiveButton && active && !item.interactiveEffects && !item.indicator ? 'is-active' : ''}`} style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%`, transform: `rotate(${rect.rotation || 0}deg)`, opacity:item.entering ? 0 : undefined, pointerEvents: !editing && !isButton ? 'none' : undefined }}>
        <Content type={Content === 'button' ? 'button' : undefined} role={item.type === 'text' && editing ? 'button' : undefined} tabIndex={item.type === 'text' && editing && !disabled ? 0 : undefined} className={`interactive-button layer-content layer-${item.type || 'button'}`} aria-label={editing || isButton ? item.name || 'Calque sans nom' : undefined} title={editing || isButton ? item.name : undefined} aria-pressed={isButton ? active : undefined} disabled={Content === 'button' ? disabled || (!editing && !item.action) : undefined} style={{ opacity: item.opacity ?? 1, color: item.color }} onMouseEnter={()=>!editing&&setHovered(item.id)} onMouseLeave={()=>setHovered(null)} onFocus={()=>!editing&&setHovered(item.id)} onBlur={()=>setHovered(null)} onPointerDown={event => start(event, item, 'move')} {...pointerEvents} onKeyDown={event => keyAdjust(event, item)} onDoubleClick={event => { if(editing&&onEnterGroup?.(item.id)){event.preventDefault();event.stopPropagation();return;} if (isButton && editing && item.imageId && !disabled) { event.preventDefault(); event.stopPropagation(); onCrop?.(item.id); } else if (item.type === 'text' && editing && !disabled && !item.locked) { event.preventDefault(); event.stopPropagation(); onSelect(item.id); setTextEditingId(item.id); } }} onClick={event => { event.stopPropagation(); if (editing) {if(event.detail===0)onSelect(item.id,event);} else if (isButton) {setPulse({id:item.id,duration:item.interactiveEffects?.clickDuration||350,token:Date.now()});onActivate(item);} }}>
          {isButton ? <ButtonSurface item={item} urls={urls} active={active} effect={contrastEffect&&darkness?{...effect,duration:contrastEffect.duration}:effect} darkness={darkness}/> : item.type === 'image' ? (urls[item.imageId] ? <img src={urls[item.imageId]} alt="" draggable={false} loading="lazy" /> : <span className="button-placeholder">{item.name}</span>) : item.type === 'text' ? <TextBlock item={rect === item ? item : { ...item, ...rect }} storedHeight={item.height} onMeasuredHeight={measuredHeight} editingText={writing} canMeasure={editing && !disabled && draft?.id !== item.id} change={onGeometryChange} finish={() => setTextEditingId(null)} /> : <svg className="layer-shape" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{item.type === 'circle' ? <ellipse cx="50" cy="50" rx="50" ry="50" fill={item.color} /> : item.type === 'line' ? <line x1="0" y1="50" x2="100" y2="50" stroke={item.color} strokeWidth="100" /> : <rect width="100" height="100" fill={item.color} />}</svg>}
        </Content>
        {editing && cropId===item.id && <CropOverlay item={item} change={onGeometryChange} begin={beginGesture} end={endGesture} finish={()=>onCrop(null)}/>}{selected && multiItems.length<2 && !cropId && !item.locked && !writing && <>{['nw', 'ne', 'sw', 'se'].map(corner => <button key={corner} type="button" className={`button-resize-handle layer-handle handle-${corner}`} aria-label={corner === 'se' ? `Redimensionner ${isButton ? 'le bouton' : 'le calque'} ${item.name}` : `Redimensionner ${item.name} ${corner}`} title="Glissez pour redimensionner" disabled={disabled} onPointerDown={event => start(event, item, corner)} {...pointerEvents} onKeyDown={event => keyAdjust(event, item, true)} onClick={event => event.stopPropagation()} />)}<button className="layer-rotation-handle" type="button" aria-label={`Faire pivoter ${item.name}`} disabled={disabled} title="Glissez pour faire pivoter" onPointerDown={event => start(event, item, 'rotate')} {...pointerEvents} onClick={event => event.stopPropagation()}>↻</button></>}
      </div>;
    })}
    {editing&&multiItems.length>1&&multiBox&&!cropId&&<div className="multi-selection-frame" style={{left:`${multiBox.x*100}%`,top:`${multiBox.y*100}%`,width:`${multiBox.width*100}%`,height:`${multiBox.height*100}%`}}><button className="selection-move" aria-label="Déplacer la sélection" onPointerDown={e=>startMulti(e,'move')} {...pointerEvents}>✥</button>{['nw','ne','sw','se'].map(c=><button key={c} className={`button-resize-handle layer-handle handle-${c}`} aria-label={`Redimensionner la sélection ${c}`} onPointerDown={e=>startMulti(e,c)} {...pointerEvents}/>)}<button className="layer-rotation-handle" aria-label="Faire pivoter la sélection" onPointerDown={e=>startMulti(e,'rotate')} {...pointerEvents}>↻</button></div>}
    {marquee&&<div className="selection-marquee" style={{left:`${Math.min(marquee.start.x,marquee.end.x)*100}%`,top:`${Math.min(marquee.start.y,marquee.end.y)*100}%`,width:`${Math.abs(marquee.end.x-marquee.start.x)*100}%`,height:`${Math.abs(marquee.end.y-marquee.start.y)*100}%`}}/>}
    {draft?.measures?.map(m=><span key={m.axis} className="spacing-measure" style={{left:`${(m.axis==='x'?m.from:draft.rect.x)*100}%`,top:`${(m.axis==='y'?m.from:draft.rect.y)*100}%`}}>{m.label}</span>)}
    {draft?.guides?.map(guide => <div key={guide.axis} className={`layer-guide guide-${guide.axis}`} style={guide.axis === 'x' ? { left: `${guide.value * 100}%` } : { top: `${guide.value * 100}%` }} />)}
  </div>;
}
