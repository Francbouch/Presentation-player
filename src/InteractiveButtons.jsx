import { useRef, useState } from 'react';
import { clamp, MIN_BUTTON_SIZE } from './document.js';

// Une surface commune conserve le même ordre et la même géométrie pour tous
// les calques, y compris les boutons créés avant l’éditeur de calques.
export default function InteractiveButtons({ buttons, urls, activeButtonId, showActiveButton, onActivate, editing = false, selectedButtonId, onSelect, onGeometryChange, disabled = false }) {
  const layer = useRef(null);
  const gesture = useRef(null);
  const [draft, setDraft] = useState(null);

  function start(event, item, kind) {
    if (!editing || disabled || event.button !== 0 || gesture.current) return;
    event.preventDefault(); event.stopPropagation();
    onSelect(item.id);
    if (item.locked) return;
    const frame = event.currentTarget;
    const bounds = layer.current.getBoundingClientRect();
    const center = { x: bounds.left + (item.x + item.width / 2) * bounds.width, y: bounds.top + (item.y + item.height / 2) * bounds.height };
    gesture.current = { id: item.id, pointerId: event.pointerId, kind, clientX: event.clientX, clientY: event.clientY, bounds, center, angle: Math.atan2(event.clientY - center.y, event.clientX - center.x), rect: { x: item.x, y: item.y, width: item.width, height: item.height, rotation: item.rotation || 0 }, frame };
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
    current.next = rect;
    setDraft({ id: current.id, rect });
  }
  function end(event, cancelled = false) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    gesture.current = null; setDraft(null);
    if (!cancelled && current.next) onGeometryChange(current.id, current.next);
    if (current.frame.hasPointerCapture(event.pointerId)) current.frame.releasePointerCapture(event.pointerId);
  }
  function keyAdjust(event, item, resize = false) {
    if (!editing || disabled || item.locked || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const step = event.shiftKey ? .05 : .01;
    const dx = event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0;
    const dy = event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0;
    const rect = resize ? { width: clamp(item.width + dx, MIN_BUTTON_SIZE, 1 - item.x), height: clamp(item.height + dy, MIN_BUTTON_SIZE, 1 - item.y) } : { x: clamp(item.x + dx, 0, 1 - item.width), y: clamp(item.y + dy, 0, 1 - item.height) };
    onGeometryChange(item.id, rect);
  }
  const pointerEvents = { onPointerMove: move, onPointerUp: event => end(event), onPointerCancel: event => end(event, true), onLostPointerCapture: event => end(event, true) };
  return <div ref={layer} className={`interactive-button-layer ${editing ? 'positioning' : ''}`} aria-label="Calques de la diapositive">
    {buttons.filter(item => item.visible !== false).map(item => {
      const rect = draft?.id === item.id ? draft.rect : item;
      const selected = editing && selectedButtonId === item.id;
      const isButton = item.type === 'button' || !item.type;
      const active = isButton && activeButtonId === item.id;
      const Content = editing || isButton ? 'button' : 'div';
      return <div key={item.id} data-layer-id={item.id} data-button-id={isButton ? item.id : undefined} className={`interactive-button-frame layer-frame ${selected ? 'is-selected' : ''} ${item.locked ? 'is-locked' : ''} ${showActiveButton && active ? 'is-active' : ''}`} style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%`, transform: `rotate(${rect.rotation || 0}deg)`, pointerEvents: !editing && !isButton ? 'none' : undefined }}>
        <Content type={Content === 'button' ? 'button' : undefined} className={`interactive-button layer-content layer-${item.type || 'button'}`} aria-label={editing || isButton ? item.name || 'Calque sans nom' : undefined} title={editing || isButton ? item.name : undefined} aria-pressed={isButton ? active : undefined} disabled={Content === 'button' ? disabled || (!editing && !item.action) : undefined} style={{ opacity: item.opacity ?? 1, color: item.color }} onPointerDown={event => start(event, item, 'move')} {...pointerEvents} onKeyDown={event => keyAdjust(event, item)} onClick={event => { event.stopPropagation(); if (editing) onSelect(item.id); else if (isButton) onActivate(item); }}>
          {isButton || item.type === 'image' ? (urls[item.imageId] ? <img src={urls[item.imageId]} alt="" draggable={false} loading="lazy" /> : <span className="button-placeholder">{item.name}</span>) : item.type === 'text' ? <span className="layer-text-content">{item.content}</span> : <svg className="layer-shape" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{item.type === 'circle' ? <ellipse cx="50" cy="50" rx="50" ry="50" fill={item.color} /> : item.type === 'line' ? <line x1="0" y1="50" x2="100" y2="50" stroke={item.color} strokeWidth="100" /> : <rect width="100" height="100" fill={item.color} />}</svg>}
        </Content>
        {selected && !item.locked && <>{['nw', 'ne', 'sw', 'se'].map(corner => <button key={corner} type="button" className={`button-resize-handle layer-handle handle-${corner}`} aria-label={corner === 'se' ? `Redimensionner ${isButton ? 'le bouton' : 'le calque'} ${item.name}` : `Redimensionner ${item.name} ${corner}`} title="Glissez pour redimensionner" disabled={disabled} onPointerDown={event => start(event, item, corner)} {...pointerEvents} onKeyDown={event => keyAdjust(event, item, true)} onClick={event => event.stopPropagation()} />)}<button className="layer-rotation-handle" type="button" aria-label={`Faire pivoter ${item.name}`} disabled={disabled} title="Glissez pour faire pivoter" onPointerDown={event => start(event, item, 'rotate')} {...pointerEvents} onClick={event => event.stopPropagation()}>↻</button></>}
      </div>;
    })}
  </div>;
}
