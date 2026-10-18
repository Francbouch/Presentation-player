import {CropOverlay} from './ImageCrop.jsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp, MIN_BUTTON_SIZE } from './document.js';
import ButtonSurface, {effectFor} from './ButtonSurface.jsx';
import TextBlock from './TextBlock.jsx';

// Une surface commune conserve le même ordre et la même géométrie pour tous
// les calques, y compris les boutons créés avant l’éditeur de calques.
export default function InteractiveButtons({ buttons, urls, activeButtonId, selectedGroups = {}, showActiveButton, onActivate, editing = false, selectedButtonId, onSelect, onGeometryChange, disabled = false, cropId, onCrop, beginGesture, endGesture }) {
  const [hovered,setHovered]=useState(null);
  const [pulse,setPulse]=useState(null);
  useEffect(()=>{if(!pulse)return;const timer=setTimeout(()=>setPulse(null),pulse.duration);return()=>clearTimeout(timer);},[pulse]);
  const layer = useRef(null);
  const gesture = useRef(null);
  const [draft, setDraft] = useState(null);
  const [textEditingId, setTextEditingId] = useState(null);
  const [textHeights, setTextHeights] = useState({});
  const measuredHeight = useCallback((id, height) => setTextHeights(previous => Math.abs((previous[id] ?? -1) - height) < .00001 ? previous : { ...previous, [id]: height }), []);
  useEffect(() => { if (!editing || (textEditingId && textEditingId !== selectedButtonId)) setTextEditingId(null); }, [editing, selectedButtonId, textEditingId]);

  function start(event, item, kind) {
    if (cropId || !editing || disabled || event.button !== 0 || gesture.current || event.target.closest('[contenteditable]')) return;
    event.preventDefault(); event.stopPropagation();
    onSelect(item.id);
    if (item.locked) return;
    const frame = event.currentTarget;
    const bounds = layer.current.getBoundingClientRect();
    const center = { x: bounds.left + (item.x + item.width / 2) * bounds.width, y: bounds.top + (item.y + item.height / 2) * bounds.height };
    frame.focus();
    gesture.current = { id: item.id, type: item.type, pointerId: event.pointerId, kind, clientX: event.clientX, clientY: event.clientY, bounds, center, angle: Math.atan2(event.clientY - center.y, event.clientX - center.x), rect: { x: item.x, y: item.y, width: item.width, height: item.height, rotation: item.rotation || 0 }, frame };
    frame.setPointerCapture(event.pointerId);
  }
  function move(event) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
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
    const guides = [];
    if (current.type === 'text' && current.kind === 'move') {
      for (const [axis, dimension, pixels] of [['x', 'width', bounds.width], ['y', 'height', bounds.height]]) {
        const candidates = [0, .5, 1, ...buttons.filter(item => item.id !== current.id && item.visible !== false).flatMap(item => item.rotation ? [item[axis] + item[dimension] / 2] : [item[axis], item[axis] + item[dimension] / 2, item[axis] + item[dimension]])];
        const anchors = initial.rotation ? [.5] : [0, .5, 1];
        let best;
        for (const anchor of anchors) for (const value of candidates) {
          const delta = value - (rect[axis] + rect[dimension] * anchor);
          if (Math.abs(delta) * pixels <= 4 && (!best || Math.abs(delta) < Math.abs(best.delta))) best = { delta, value };
        }
        if (best) { rect[axis] = clamp(rect[axis] + best.delta, 0, 1 - rect[dimension]); guides.push({ axis, value: best.value }); }
      }
    }
    current.next = rect;
    setDraft({ id: current.id, rect, guides });
  }
  function end(event, cancelled = false) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    gesture.current = null; setDraft(null);
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
    onGeometryChange(item.id, rect);
  }
  const pointerEvents = { onPointerMove: move, onPointerUp: event => end(event), onPointerCancel: event => end(event, true), onLostPointerCapture: event => end(event, true) };
  const contrastGroups=new Map();
  if(!editing)for(const b of buttons){if(!b.selectionGroup||b.visible===false)continue;const f=effectFor(b,{active:selectedGroups[b.selectionGroup]===b.id,hovered:hovered===b.id,clicked:pulse?.id===b.id}).contrastEffect;if(f)contrastGroups.set(b.selectionGroup,{id:b.id,effect:f});}
  return <div ref={layer} className={`interactive-button-layer ${editing ? 'positioning' : ''}`} aria-label="Calques de la diapositive">
    {buttons.filter(item => item.visible !== false).map(item => {
      const rect = draft?.id === item.id ? draft.rect : item.type === 'text' && item.textStyle.autoHeight && textHeights[item.id] !== undefined ? { ...item, height: Math.min(textHeights[item.id], 1 - item.y) } : item;
      const selected = editing && selectedButtonId === item.id;
      const isButton = item.type === 'button' || !item.type;
      const active = isButton && (item.selectionGroup ? selectedGroups[item.selectionGroup]===item.id : activeButtonId === item.id && (!item.interactiveEffects && !item.indicator || ['background','state'].includes(item.action?.type)));
      const effect=effectFor(item,{active:!editing&&active,hovered:!editing&&hovered===item.id,clicked:!editing&&pulse?.id===item.id});
      const contrastSource=contrastGroups.get(item.selectionGroup);
      const contrastEffect=contrastSource?.effect;
      const darkness=contrastSource&&contrastSource.id!==item.id?contrastEffect.darkness:0;
      const writing = textEditingId === item.id;
      const Content = item.type === 'text' ? 'div' : editing || isButton ? 'button' : 'div';
      return <div key={item.id} data-layer-id={item.id} data-button-id={isButton ? item.id : undefined} className={`interactive-button-frame layer-frame ${selected ? 'is-selected' : ''} ${item.locked ? 'is-locked' : ''} ${showActiveButton && active && !item.interactiveEffects && !item.indicator ? 'is-active' : ''}`} style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%`, transform: `rotate(${rect.rotation || 0}deg)`, opacity:item.entering ? 0 : undefined, pointerEvents: !editing && !isButton ? 'none' : undefined }}>
        <Content type={Content === 'button' ? 'button' : undefined} role={item.type === 'text' && editing ? 'button' : undefined} tabIndex={item.type === 'text' && editing && !disabled ? 0 : undefined} className={`interactive-button layer-content layer-${item.type || 'button'}`} aria-label={editing || isButton ? item.name || 'Calque sans nom' : undefined} title={editing || isButton ? item.name : undefined} aria-pressed={isButton ? active : undefined} disabled={Content === 'button' ? disabled || (!editing && !item.action) : undefined} style={{ opacity: item.opacity ?? 1, color: item.color }} onMouseEnter={()=>!editing&&setHovered(item.id)} onMouseLeave={()=>setHovered(null)} onFocus={()=>!editing&&setHovered(item.id)} onBlur={()=>setHovered(null)} onPointerDown={event => start(event, item, 'move')} {...pointerEvents} onKeyDown={event => keyAdjust(event, item)} onDoubleClick={event => { if (isButton && editing && item.imageId && !disabled) { event.preventDefault(); event.stopPropagation(); onCrop?.(item.id); } else if (item.type === 'text' && editing && !disabled && !item.locked) { event.preventDefault(); event.stopPropagation(); onSelect(item.id); setTextEditingId(item.id); } }} onClick={event => { event.stopPropagation(); if (editing) onSelect(item.id); else if (isButton) {setPulse({id:item.id,duration:item.interactiveEffects?.clickDuration||350,token:Date.now()});onActivate(item);} }}>
          {isButton ? <ButtonSurface item={item} urls={urls} active={active} effect={contrastEffect&&darkness?{...effect,duration:contrastEffect.duration}:effect} darkness={darkness}/> : item.type === 'image' ? (urls[item.imageId] ? <img src={urls[item.imageId]} alt="" draggable={false} loading="lazy" /> : <span className="button-placeholder">{item.name}</span>) : item.type === 'text' ? <TextBlock item={rect === item ? item : { ...item, ...rect }} storedHeight={item.height} onMeasuredHeight={measuredHeight} editingText={writing} canMeasure={editing && !disabled && draft?.id !== item.id} change={onGeometryChange} finish={() => setTextEditingId(null)} /> : <svg className="layer-shape" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{item.type === 'circle' ? <ellipse cx="50" cy="50" rx="50" ry="50" fill={item.color} /> : item.type === 'line' ? <line x1="0" y1="50" x2="100" y2="50" stroke={item.color} strokeWidth="100" /> : <rect width="100" height="100" fill={item.color} />}</svg>}
        </Content>
        {editing && cropId===item.id && <CropOverlay item={item} change={onGeometryChange} begin={beginGesture} end={endGesture} finish={()=>onCrop(null)}/>}{selected && !cropId && !item.locked && !writing && <>{['nw', 'ne', 'sw', 'se'].map(corner => <button key={corner} type="button" className={`button-resize-handle layer-handle handle-${corner}`} aria-label={corner === 'se' ? `Redimensionner ${isButton ? 'le bouton' : 'le calque'} ${item.name}` : `Redimensionner ${item.name} ${corner}`} title="Glissez pour redimensionner" disabled={disabled} onPointerDown={event => start(event, item, corner)} {...pointerEvents} onKeyDown={event => keyAdjust(event, item, true)} onClick={event => event.stopPropagation()} />)}<button className="layer-rotation-handle" type="button" aria-label={`Faire pivoter ${item.name}`} disabled={disabled} title="Glissez pour faire pivoter" onPointerDown={event => start(event, item, 'rotate')} {...pointerEvents} onClick={event => event.stopPropagation()}>↻</button></>}
      </div>;
    })}
    {draft?.guides?.map(guide => <div key={guide.axis} className={`layer-guide guide-${guide.axis}`} style={guide.axis === 'x' ? { left: `${guide.value * 100}%` } : { top: `${guide.value * 100}%` }} />)}
  </div>;
}
