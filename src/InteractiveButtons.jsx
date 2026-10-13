import { useRef, useState } from 'react';
import { clamp, MIN_BUTTON_SIZE } from './document.js';

export default function InteractiveButtons({ buttons, urls, activeButtonId, showActiveButton, onActivate, editing = false, selectedButtonId, onSelect, onGeometryChange, disabled = false }) {
  const layer = useRef(null);
  const gesture = useRef(null);
  const [draft, setDraft] = useState(null);

  function start(event, button, kind) {
    if (!editing || disabled || event.button !== 0 || gesture.current) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect(button.id);
    const frame = event.currentTarget;
    gesture.current = { id: button.id, pointerId: event.pointerId, kind, clientX: event.clientX, clientY: event.clientY, bounds: layer.current.getBoundingClientRect(), rect: { x: button.x, y: button.y, width: button.width, height: button.height }, frame };
    frame.setPointerCapture(event.pointerId);
  }

  function move(event) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = (event.clientX - current.clientX) / current.bounds.width;
    const dy = (event.clientY - current.clientY) / current.bounds.height;
    const rect = { ...current.rect };
    if (current.kind === 'move') {
      rect.x = clamp(rect.x + dx, 0, 1 - rect.width);
      rect.y = clamp(rect.y + dy, 0, 1 - rect.height);
    } else {
      rect.width = clamp(rect.width + dx, MIN_BUTTON_SIZE, 1 - rect.x);
      rect.height = clamp(rect.height + dy, MIN_BUTTON_SIZE, 1 - rect.y);
    }
    current.next = rect;
    setDraft({ id: current.id, rect });
  }

  function end(event, cancelled = false) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    gesture.current = null;
    setDraft(null);
    if (!cancelled && current.next) onGeometryChange(current.id, current.next);
    if (current.frame.hasPointerCapture(event.pointerId)) current.frame.releasePointerCapture(event.pointerId);
  }

  function keyAdjust(event, button, resize = false) {
    if (!editing || disabled || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const step = event.shiftKey ? .05 : .01;
    const dx = event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0;
    const dy = event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0;
    const rect = resize ? { width: clamp(button.width + dx, MIN_BUTTON_SIZE, 1 - button.x), height: clamp(button.height + dy, MIN_BUTTON_SIZE, 1 - button.y) } : { x: clamp(button.x + dx, 0, 1 - button.width), y: clamp(button.y + dy, 0, 1 - button.height) };
    onGeometryChange(button.id, rect);
  }

  return <div ref={layer} className={`interactive-button-layer ${editing ? 'positioning' : ''}`} aria-label="Boutons de la diapositive">
    {buttons.map(button => {
      const rect = draft?.id === button.id ? draft.rect : button;
      const selected = editing && selectedButtonId === button.id;
      const active = activeButtonId === button.id;
      return <div key={button.id} data-button-id={button.id} className={`interactive-button-frame ${selected ? 'is-selected' : ''} ${showActiveButton && active ? 'is-active' : ''}`} style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%` }}>
        <button type="button" className="interactive-button" aria-label={button.name || 'Bouton sans nom'} title={button.name || 'Bouton sans nom'} aria-pressed={active} disabled={disabled || (!editing && !button.target)} onPointerDown={event => start(event, button, 'move')} onPointerMove={move} onPointerUp={event => end(event)} onPointerCancel={event => end(event, true)} onLostPointerCapture={event => end(event, true)} onKeyDown={event => keyAdjust(event, button)} onClick={event => { event.stopPropagation(); if (editing) onSelect(button.id); else onActivate(button); }}>
          {urls[button.imageId] ? <img src={urls[button.imageId]} alt="" draggable={false} /> : <span className="button-placeholder">{button.name || 'Bouton'}</span>}
        </button>
        {selected && <button type="button" className="button-resize-handle" aria-label={`Redimensionner le bouton ${button.name}`} title="Glissez pour redimensionner" disabled={disabled} onPointerDown={event => start(event, button, 'resize')} onPointerMove={move} onPointerUp={event => end(event)} onPointerCancel={event => end(event, true)} onLostPointerCapture={event => end(event, true)} onKeyDown={event => keyAdjust(event, button, true)} onClick={event => event.stopPropagation()} />}
      </div>;
    })}
  </div>;
}
