import {buttonShapeRadius} from './buttonShapes.js';
import VectorLine from './VectorLine.jsx';
import LineHandles from './LineHandles.jsx';
import {drawLine} from './vectorLines.js';
import {
  resizeFrom,
  limitResize,
  translated,
  inside,
  angle15,
  wrapAngle,
  drawShape,
} from "./manipulation.js";
import { visualBounds } from "./editorGeometry.js";
import FrameSurface from "./FrameSurface.jsx";
import { isFrame } from "./mediaFrames.js";
import { boundsOf, snapGeometry } from "./editorGeometry.js";
import { CropOverlay } from "./ImageCrop.jsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { clamp, MIN_BUTTON_SIZE } from "./document.js";
import ButtonSurface, { effectFor } from "./ButtonSurface.jsx";
import TextBlock from "./TextBlock.jsx";

// Une surface commune conserve le même ordre et la même géométrie pour tous
// les calques, y compris les boutons créés avant l’éditeur de calques.
export default function InteractiveButtons({
  buttons,
  urls,
  activeButtonId,
  selectedGroups = {},
  showActiveButton,
  onActivate,
  editing = false,
  selectedButtonId,
  onSelect,
  onGeometryChange,
  disabled = false,
  cropId,
  onCrop,
  beginGesture,
  endGesture,
  magnetism = true,
  selection = [],
  onBatchChange,
  onEnterGroup,
  isVisualGroup = false,
  registerVideo,
  onFrameDrop,
  playbackEnabled = true,
  onDuplicateMove,
  onNudge,
  drawingTool,
  onDraw,
}) {
  const [hovered, setHovered] = useState(null);
  const [pulse, setPulse] = useState(null);
  useEffect(() => {
    if (!pulse) return;
    const timer = setTimeout(() => setPulse(null), pulse.duration);
    return () => clearTimeout(timer);
  }, [pulse]);
  const layer = useRef(null);
  const gesture = useRef(null);
  const [duplicateOrigin, setDuplicateOrigin] = useState(null);
  const [drawing, setDrawing] = useState(null);
  const [lineDraft,setLineDraft]=useState(null);
  const drawRef = useRef(null);
  const [draft, setDraft] = useState(null);
  const [marquee, setMarquee] = useState(null);
  const [multiDraft, setMultiDraft] = useState(null);
  const multiItems = buttons.filter((b) => selection.includes(b.id));
  const multiBox = boundsOf(
    multiItems.map((i) => ({ ...i, ...multiDraft?.[i.id] })),
  );
  const [textEditingId, setTextEditingId] = useState(null);
  const [textHeights, setTextHeights] = useState({});
  const measuredHeight = useCallback(
    (id, height) =>
      setTextHeights((previous) =>
        Math.abs((previous[id] ?? -1) - height) < 0.00001
          ? previous
          : { ...previous, [id]: height },
      ),
    [],
  );
  useEffect(() => {
    if (!editing || (textEditingId && textEditingId !== selectedButtonId))
      setTextEditingId(null);
  }, [editing, selectedButtonId, textEditingId]);

  function start(event, item, kind) {
    if (
      cropId ||
      !editing ||
      disabled ||
      drawingTool ||
      event.button !== 0 ||
      gesture.current ||
      event.target.closest("[contenteditable],.frame-preview")
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    const already = selection.includes(item.id);
    const resolved = already
      ? selection
      : onSelect(item.id, kind === "move" ? event : undefined);
    const items = buttons.filter((b) => (resolved || [item.id]).includes(b.id));
    if (items.some((i) => i.locked)) return;
    startItems(
      event,
      kind,
      items.length ? items : [item],
      already && event.shiftKey && kind === "move" ? item.id : null,
    );
  }
  function startItems(event, kind, items, shiftClick = false) {
    if (
      disabled ||
      !editing ||
      cropId ||
      items.some((i) => i.locked) ||
      event.button !== 0
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    const frame = event.currentTarget,
      bounds = layer.current.getBoundingClientRect();
    const box =
      items.length === 1
        ? { ...items[0] }
        : { ...boundsOf(items), rotation: 0 };
    frame.focus();
    frame.setPointerCapture(event.pointerId);
    gesture.current = {
      items,
      baseItems: items,
      kind,
      frame,
      bounds,
      box,
      base: { ...box },
      ratio: box.width / box.height,
      originX: event.clientX,
      originY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      pointerId: event.pointerId,
      mods: { shift: event.shiftKey, alt: event.altKey },
      startAngle: Math.atan2(
        event.clientY - (bounds.top + (box.y + box.height / 2) * bounds.height),
        event.clientX - (bounds.left + (box.x + box.width / 2) * bounds.width),
      ),
      shiftClick,
      duplicate: kind === "move" && event.altKey,
      moved: false,
    };
  }
  function startMulti(event, kind, items = multiItems) {
    startItems(event, kind, items);
  }
  function move(event) {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    const changed =
      g.mods.shift !== event.shiftKey || g.mods.alt !== event.altKey;
    if (changed) {
      g.base = g.preview || g.base;
      g.baseItems = g.items.map((i) => ({ ...i, ...g.patches?.[i.id] }));
      g.originX = g.lastX;
      g.originY = g.lastY;
      g.mods = { shift: event.shiftKey, alt: event.altKey };
      g.axis = null;
      if (g.kind === "rotate") {
        g.startAngle = Math.atan2(
          g.lastY -
            (g.bounds.top + (g.base.y + g.base.height / 2) * g.bounds.height),
          g.lastX -
            (g.bounds.left + (g.base.x + g.base.width / 2) * g.bounds.width),
        );
      }
      if (g.kind === "move" && event.altKey) g.duplicate = true;
    }
    g.lastEvent = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
    };
    const screenX = event.clientX - g.originX,
      screenY = event.clientY - g.originY;
    g.lastX = event.clientX;
    g.lastY = event.clientY;
    if (changed && !screenX && !screenY) return;
    if (Math.hypot(screenX, screenY) > 0.5) g.moved = true;
    let dx = screenX / g.bounds.width,
      dy = screenY / g.bounds.height,
      rect = { ...g.base },
      patches;
    let guides = [],
      measures = [];
    const others = buttons.filter(
      (b) => !g.items.some((i) => i.id === b.id) && b.visible !== false,
    );
    const snap = magnetism && !event.ctrlKey && !event.metaKey;
    if (g.kind === "move") {
      if (event.shiftKey) {
        if (!g.axis && Math.hypot(screenX, screenY) >= 2)
          g.axis = Math.abs(screenX) >= Math.abs(screenY) ? "x" : "y";
        if (g.axis === "x") dy = 0;
        else if (g.axis === "y") dx = 0;
        else {
          dx = 0;
          dy = 0;
        }
      }
      if (snap) {
        const found = snapGeometry(
          { ...rect, x: rect.x + dx, y: rect.y + dy },
          others,
          g.bounds,
        );
        if (!g.axis || g.axis === "x") dx = found.rect.x - rect.x;
        if (!g.axis || g.axis === "y") dy = found.rect.y - rect.y;
        guides = found.guides.filter((v) => !g.axis || v.axis === g.axis);
        measures = found.measures.filter((v) => !g.axis || v.axis === g.axis);
      }
      patches = translated(g.baseItems, dx, dy);
      rect = {
        ...rect,
        x: rect.x + (patches[g.baseItems[0].id].x - g.baseItems[0].x),
        y: rect.y + (patches[g.baseItems[0].id].y - g.baseItems[0].y),
      };
    } else if (g.kind === "rotate") {
      const cx = g.bounds.left + (rect.x + rect.width / 2) * g.bounds.width,
        cy = g.bounds.top + (rect.y + rect.height / 2) * g.bounds.height;
      let angle =
        ((Math.atan2(event.clientY - cy, event.clientX - cx) - g.startAngle) *
          180) /
        Math.PI;
      if (g.items.length === 1) {
        let rotation = wrapAngle((rect.rotation || 0) + angle);
        if (event.shiftKey) rotation = wrapAngle(angle15(rotation));
        rect.rotation = rotation;
        patches = { [g.items[0].id]: { rotation } };
      } else {
        if (event.shiftKey) angle = angle15(angle);
        const a = (angle * Math.PI) / 180;
        patches = Object.fromEntries(
          g.baseItems.map((i) => {
            const x = (i.x + i.width / 2 - rect.x - rect.width / 2) * 1920,
              y = (i.y + i.height / 2 - rect.y - rect.height / 2) * 1080;
            return [
              i.id,
              {
                x:
                  rect.x +
                  rect.width / 2 +
                  (x * Math.cos(a) - y * Math.sin(a)) / 1920 -
                  i.width / 2,
                y:
                  rect.y +
                  rect.height / 2 +
                  (x * Math.sin(a) + y * Math.cos(a)) / 1080 -
                  i.height / 2,
                rotation: wrapAngle((i.rotation || 0) + angle),
              },
            ];
          }),
        );
      }
      if (
        !g.baseItems.every(
          (i) =>
            inside({ ...i, ...patches[i.id] }) &&
            inside(visualBounds({ ...i, ...patches[i.id] })),
        )
      )
        return;
    } else {
      const minWidth = Math.max(
          ...g.baseItems.map((i) => (MIN_BUTTON_SIZE * rect.width) / i.width),
        ),
        minHeight = Math.max(
          ...g.baseItems.map((i) => (MIN_BUTTON_SIZE * rect.height) / i.height),
        );
      let next = resizeFrom(rect, dx * 1920, dy * 1080, g.kind, {
        shift: event.shiftKey,
        alt: event.altKey,
        ratio: g.ratio,
        blend: Math.min(1, Math.hypot(screenX, screenY) / 12),
        minWidth,
        minHeight,
      });
      if (snap && !event.shiftKey && !event.altKey) {
        const found = snapGeometry(next, others, g.bounds, g.kind);
        next = found.rect;
        guides = found.guides;
        measures = found.measures;
      }
      const project = (r) =>
        g.items.length === 1
          ? {
              [g.items[0].id]: Object.fromEntries(
                ["x", "y", "width", "height", "rotation"].map((key) => [
                  key,
                  r[key] ?? 0,
                ]),
              ),
            }
          : Object.fromEntries(
              g.baseItems.map((i) => [
                i.id,
                {
                  x: r.x + ((i.x - rect.x) * r.width) / rect.width,
                  y: r.y + ((i.y - rect.y) * r.height) / rect.height,
                  width: (i.width * r.width) / rect.width,
                  height: (i.height * r.height) / rect.height,
                },
              ]),
            );
      next = limitResize(rect, next, (r) => {
        const ps = project(r);
        return g.baseItems.every((i) => {
          const v = { ...i, ...ps[i.id] };
          return (
            v.width >= MIN_BUTTON_SIZE &&
            v.height >= MIN_BUTTON_SIZE &&
            inside(v) &&
            inside(visualBounds(v))
          );
        });
      });
      patches = project(next);
      rect = next;
    }
    g.patches = patches;
    g.preview = rect;
    if (g.duplicate && g.moved) setDuplicateOrigin(g.items);
    if (g.items.length === 1)
      setDraft({
        id: g.items[0].id,
        rect: { ...g.items[0], ...patches[g.items[0].id] },
        guides,
        measures,
      });
    else {
      setMultiDraft(patches);
      setDraft({ rect, guides, measures });
    }
  }
  function end(event, cancelled = false) {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    gesture.current = null;
    setDraft(null);
    setMultiDraft(null);
    setDuplicateOrigin(null);
    if (!cancelled && g.moved && g.patches) {
      if (g.duplicate)
        onDuplicateMove?.(
          g.items.map((i) => i.id),
          g.patches,
        );
      else if (g.items.length === 1)
        onGeometryChange(g.items[0].id, g.patches[g.items[0].id]);
      else onBatchChange?.(g.patches);
    } else if (!cancelled && g.shiftClick)
      onSelect(g.shiftClick, { shiftKey: true });
    if (g.frame.hasPointerCapture(event.pointerId))
      g.frame.releasePointerCapture(event.pointerId);
  }
  useEffect(() => {
    const modifiers = (e) => {
      if (drawRef.current && e.key === "Escape") {
        drawRef.current = null;
        setDrawing(null);
        return;
      }
      const g = gesture.current;
      if (!g) return;
      if (
        e.key === "Escape" ||
        ((e.ctrlKey || e.metaKey) && ["z", "y"].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
        e.stopPropagation();
        end({ pointerId: g.pointerId }, true);
        return;
      }
      if (["Shift", "Alt", "Control", "Meta"].includes(e.key) && g.lastEvent)
        move({
          ...g.lastEvent,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
        });
    };
    const cancel = () => {
      const g = gesture.current;
      if (g) end({ pointerId: g.pointerId }, true);
      if (drawRef.current) {
        drawRef.current = null;
        setDrawing(null);
      }
    };
    window.addEventListener("keydown", modifiers, true);
    window.addEventListener("keyup", modifiers, true);
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("keydown", modifiers, true);
      window.removeEventListener("keyup", modifiers, true);
      window.removeEventListener("blur", cancel);
    };
  });
  function keyAdjust(event, item, resize = false) {
    if (
      !editing ||
      disabled ||
      item.locked ||
      event.target.closest("[contenteditable]") ||
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    if (onNudge) {
      onNudge(
        event,
        selection.includes(item.id) ? selection : [item.id],
        resize,
      );
      return;
    }
  }
  const pointerEvents = {
    onPointerMove: move,
    onPointerUp: (event) => end(event),
    onPointerCancel: (event) => end(event, true),
    onLostPointerCapture: (event) => end(event, true),
  };
  const contrastGroups = new Map();
  if (!editing)
    for (const b of buttons) {
      if (!b.selectionGroup || b.visible === false) continue;
      const f = effectFor(b, {
        active: selectedGroups[b.selectionGroup] === b.id,
        hovered: hovered === b.id,
        clicked: pulse?.id === b.id,
      }).contrastEffect;
      if (f) contrastGroups.set(b.selectionGroup, { id: b.id, effect: f });
    }
  return (
    <div
      ref={layer}
      className={`interactive-button-layer ${editing ? "positioning" : ""} ${drawingTool ? "drawing-shape" : ""}`}
      onPointerDownCapture={(event) => {
        if (!drawingTool || !editing || disabled || event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        const b = layer.current.getBoundingClientRect(),
          start = {
            x: Math.max(0, Math.min(1, (event.clientX - b.left) / b.width)),
            y: Math.max(0, Math.min(1, (event.clientY - b.top) / b.height)),
          };
        drawRef.current = {
          start,
          bounds: b,
          x: event.clientX,
          y: event.clientY,
          type: drawingTool,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        setDrawing(drawingTool==='vectorLine'?null:{ ...start, width: 0, height: 0 });
      }}
      onPointerDown={(event) => {
        if (
          !editing ||
          disabled ||
          drawingTool ||
          event.target !== event.currentTarget
        )
          return;
        const b = layer.current.getBoundingClientRect(),
          start = {
            x: (event.clientX - b.left) / b.width,
            y: (event.clientY - b.top) / b.height,
          };
        event.currentTarget.setPointerCapture(event.pointerId);
        setMarquee({ start, end: start, shift: event.shiftKey });
      }}
      onPointerMove={(event) => {
        if (drawRef.current) {
          const d = drawRef.current;
          const rect = (d.type==='vectorLine'?drawLine:drawShape)(
            d.start,
            {
              x: (event.clientX - d.bounds.left) / d.bounds.width,
              y: (event.clientY - d.bounds.top) / d.bounds.height,
            },
            { shift: event.shiftKey, alt: event.altKey },
          );
          d.rect = rect;
          d.moved = Math.hypot(event.clientX - d.x, event.clientY - d.y) > 3;
          setDrawing(rect);
          return;
        }
        if (!marquee) return;
        const b = layer.current.getBoundingClientRect();
        setMarquee({
          ...marquee,
          end: {
            x: (event.clientX - b.left) / b.width,
            y: (event.clientY - b.top) / b.height,
          },
        });
      }}
      onPointerUp={(event) => {
        if (drawRef.current) {
          const d = drawRef.current;
          drawRef.current = null;
          setDrawing(null);
          onDraw?.(
            d.type,
            d.moved
              ? d.rect
              : d.type==='vectorLine'?null
              : {
                  x: Math.min(d.start.x, 1 - 200 / 1920),
                  y: Math.min(d.start.y, 1 - 200 / 1080),
                  width: 200 / 1920,
                  height: 200 / 1080,
                },
          );
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
          return;
        }
        if (!marquee) return;
        const x = Math.min(marquee.start.x, marquee.end.x),
          y = Math.min(marquee.start.y, marquee.end.y),
          r = Math.max(marquee.start.x, marquee.end.x),
          bottom = Math.max(marquee.start.y, marquee.end.y);
        const ids = buttons
          .filter((b) => !b.locked && b.visible !== false)
          .filter((b) => {
            const a = boundsOf([b]);
            return (
              a.x >= x &&
              a.y >= y &&
              a.x + a.width <= r &&
              a.y + a.height <= bottom
            );
          })
          .map((b) => b.id);
        onSelect(null);
        if (ids.length)
          onSelect(ids, { marquee: true, shiftKey: marquee.shift });
        setMarquee(null);
      }}
      onPointerCancel={() => {
        setMarquee(null);
        drawRef.current = null;
        setDrawing(null);
      }}
      aria-label="Calques de la diapositive"
    >
      {duplicateOrigin?.map((item) => (
        <div
          key={"origin:" + item.id}
          className="interactive-button-frame duplication-origin"
          aria-hidden="true"
          style={{
            left: `${item.x * 100}%`,
            top: `${item.y * 100}%`,
            width: `${item.width * 100}%`,
            height: `${item.height * 100}%`,
            transform: `rotate(${item.rotation || 0}deg)`,
            opacity: item.opacity,
            pointerEvents: "none",
          }}
        >
          <div
            className={`interactive-button layer-content layer-${item.type}`}
          >
            {item.type === "vectorLine" ? <VectorLine item={item}/> : item.type === "button" ? (
              <ButtonSurface
                editing={editing}
                item={item}
                urls={urls}
                active={false}
                darkness={0}
                effect={effectFor(item, {
                  active: false,
                  hovered: false,
                  clicked: false,
                })}
              />
            ) : item.type === "text" ? (
              <TextBlock
                item={item}
                storedHeight={item.height}
                canMeasure={false}
              />
            ) : (
              <FrameSurface item={item} urls={urls} playbackEnabled={false} />
            )}
          </div>
        </div>
      ))}
      {buttons
        .filter(
          (item) => item.visible !== false || item.frameMedia?.kind === "video",
        )
        .map((item) => {
          const rect = lineDraft?.id===item.id ? {...item,...lineDraft.patch} : multiDraft?.[item.id]
            ? { ...item, ...multiDraft[item.id] }
            : draft?.id === item.id
              ? draft.rect
              : item.type === "text" &&
                  item.textStyle.autoHeight &&
                  textHeights[item.id] !== undefined
                ? {
                    ...item,
                    height: Math.min(textHeights[item.id], 1 - item.y),
                  }
                : item;
          const selected =
            editing &&
            (selection.includes(item.id) || selectedButtonId === item.id);
          const isButton = item.type === "button" || !item.type;
          const active =
            isButton &&
            (item.selectionGroup
              ? selectedGroups[item.selectionGroup] === item.id
              : activeButtonId === item.id &&
                ((!item.interactiveEffects && !item.indicator) ||
                  ["background", "state"].includes(item.action?.type)));
          const effect = effectFor(item, {
            active: !editing && active,
            hovered: !editing && hovered === item.id,
            clicked: !editing && pulse?.id === item.id,
          });
          const contrastSource = contrastGroups.get(item.selectionGroup);
          const contrastEffect = contrastSource?.effect;
          const darkness =
            contrastSource && contrastSource.id !== item.id
              ? contrastEffect.darkness
              : 0;
          const writing = textEditingId === item.id;
          const Content =
            item.type === "text" || item.type==="vectorLine" || isFrame(item)
              ? "div"
              : editing || isButton
                ? "button"
                : "div";
          return (
            <div
              key={item.id}
              data-layer-id={item.id}
              data-button-id={isButton ? item.id : undefined}
              className={`interactive-button-frame layer-frame ${selected ? "is-selected" : ""} ${item.locked ? "is-locked" : ""} ${showActiveButton && active && !item.interactiveEffects && !item.indicator ? "is-active" : ""}`}
              style={{
                left: `${rect.x * 100}%`,
                top: `${rect.y * 100}%`,
                width: `${rect.width * 100}%`,
                height: `${rect.height * 100}%`,
                transform: `rotate(${rect.rotation || 0}deg)`,
                opacity: item.entering ? 0 : undefined,
                borderRadius:isButton&&item.buttonShape&&!editing?buttonShapeRadius(item,n=>`${n/19.2}cqw`):undefined,
                visibility: item.visible === false ? "hidden" : undefined,
                pointerEvents: item.type==="vectorLine"||!editing && !isButton ? "none" : undefined,
              }}
            >
              <Content
                type={Content === "button" ? "button" : undefined}
                role={
                  (item.type === "text" || item.type==="vectorLine" || isFrame(item)) && editing
                    ? "button"
                    : undefined
                }
                tabIndex={
                  (item.type === "text" || item.type==="vectorLine" || isFrame(item)) &&
                  editing &&
                  !disabled
                    ? 0
                    : undefined
                }
                className={`interactive-button layer-content layer-${item.type || "button"}`}
                aria-label={
                  editing || isButton
                    ? item.name || "Calque sans nom"
                    : undefined
                }
                title={editing || isButton ? item.name : undefined}
                aria-pressed={isButton ? active : undefined}
                disabled={
                  Content === "button"
                    ? disabled || (!editing && !item.action)
                    : undefined
                }
                style={{ opacity: item.opacity ?? 1, color: item.color, pointerEvents:isButton&&item.buttonShape&&!editing?"none":undefined }}
                onDragOver={(e) => {
                  if (editing && (isFrame(item)||isButton)) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                onDrop={(e) => {
                  if (editing && (isFrame(item)||isButton)) {
                    e.preventDefault();
                    e.stopPropagation();
                    onFrameDrop?.(item.id, e.dataTransfer);
                  }
                }}
                onMouseEnter={() => !editing && setHovered(item.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => !editing && setHovered(item.id)}
                onBlur={() => setHovered(null)}
                onPointerDown={(event) => start(event, item, "move")}
                {...pointerEvents}
                onKeyDown={(event) => keyAdjust(event, item)}
                onDoubleClick={(event) => {
                  if (editing && onEnterGroup?.(item.id)) {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                  }
                  if (
                    ((isButton && item.imageId) ||
                      (isFrame(item) && item.frameMedia)) &&
                    editing &&
                    !disabled
                  ) {
                    event.preventDefault();
                    event.stopPropagation();
                    onCrop?.(item.id);
                  } else if (
                    item.type === "text" &&
                    editing &&
                    !disabled &&
                    !item.locked
                  ) {
                    event.preventDefault();
                    event.stopPropagation();
                    onSelect(item.id);
                    setTextEditingId(item.id);
                  }
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  if (editing) {
                    if (event.detail === 0) onSelect(item.id, event);
                  } else if (isButton) {
                    setPulse({
                      id: item.id,
                      duration: item.interactiveEffects?.clickDuration || 350,
                      token: Date.now(),
                    });
                    onActivate(item);
                  }
                }}
              >
                {item.type==="vectorLine" ? <VectorLine item={rect} hit={editing&&!drawingTool}/> : isButton ? (
                  <ButtonSurface
                editing={editing}
                    item={item}
                    urls={urls}
                    active={active}
                    effect={
                      contrastEffect && darkness
                        ? { ...effect, duration: contrastEffect.duration }
                        : effect
                    }
                    darkness={darkness}
                  />
                ) : isFrame(item) || ["image", "line"].includes(item.type) ? (
                  <FrameSurface
                    item={item}
                    urls={urls}
                    editing={editing}
                    playbackEnabled={playbackEnabled}
                    visible={item.visible !== false}
                    registerVideo={registerVideo}
                  />
                ) : item.type === "text" ? (
                  <TextBlock
                    item={rect === item ? item : { ...item, ...rect }}
                    storedHeight={item.height}
                    onMeasuredHeight={measuredHeight}
                    editingText={writing}
                    canMeasure={editing && !disabled && draft?.id !== item.id}
                    change={onGeometryChange}
                    finish={() => setTextEditingId(null)}
                  />
                ) : (
                  <svg
                    className="layer-shape"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    {item.type === "circle" ? (
                      <ellipse
                        cx="50"
                        cy="50"
                        rx="50"
                        ry="50"
                        fill={item.color}
                      />
                    ) : item.type === "line" ? (
                      <line
                        x1="0"
                        y1="50"
                        x2="100"
                        y2="50"
                        stroke={item.color}
                        strokeWidth="100"
                      />
                    ) : (
                      <rect width="100" height="100" fill={item.color} />
                    )}
                  </svg>
                )}
              </Content>
              {editing && cropId === item.id && (
                <CropOverlay
                  item={
                    item.frameMedia
                      ? { ...item, imageCrop: item.frameMedia.crop }
                      : item
                  }
                  change={(id, patch) =>
                    onGeometryChange(
                      id,
                      item.frameMedia
                        ? {
                            frameMedia: {
                              ...item.frameMedia,
                              crop: patch.imageCrop,
                            },
                          }
                        : patch,
                    )
                  }
                  begin={beginGesture}
                  end={endGesture}
                  finish={() => onCrop(null)}
                />
              )}
              {selected&&item.type==='vectorLine'&&multiItems.length<2&&!item.locked&&<LineHandles item={rect} disabled={disabled} others={buttons.filter(b=>b.id!==item.id&&b.visible!==false)} magnetism={magnetism} preview={(patch,guides)=>setLineDraft({id:item.id,patch,guides})} commit={patch=>onGeometryChange(item.id,patch)} clear={()=>setLineDraft(null)}/>}
              {selected && item.type!=='vectorLine'&&
                multiItems.length < 2 &&
                !cropId &&
                !item.locked &&
                !writing && (
                  <>
                    {["nw", "ne", "sw", "se"].map((corner) => (
                      <button
                        key={corner}
                        type="button"
                        className={`button-resize-handle layer-handle handle-${corner}`}
                        aria-label={
                          corner === "se"
                            ? `Redimensionner ${isButton ? "le bouton" : "le calque"} ${item.name}`
                            : `Redimensionner ${item.name} ${corner}`
                        }
                        title="Glissez pour redimensionner"
                        disabled={disabled}
                        onPointerDown={(event) => start(event, item, corner)}
                        {...pointerEvents}
                        onKeyDown={(event) => keyAdjust(event, item, true)}
                        onClick={(event) => event.stopPropagation()}
                      />
                    ))}
                    <button
                      className="layer-rotation-handle"
                      type="button"
                      aria-label={`Faire pivoter ${item.name}`}
                      disabled={disabled}
                      title="Glissez pour faire pivoter"
                      onPointerDown={(event) => start(event, item, "rotate")}
                      {...pointerEvents}
                      onClick={(event) => event.stopPropagation()}
                    >
                      ↻
                    </button>
                  </>
                )}
            </div>
          );
        })}
      {editing && multiItems.length > 1 && multiBox && !cropId && (
        <div
          className="multi-selection-frame"
          style={{
            left: `${multiBox.x * 100}%`,
            top: `${multiBox.y * 100}%`,
            width: `${multiBox.width * 100}%`,
            height: `${multiBox.height * 100}%`,
          }}
        >
          <button
            className="selection-move"
            aria-label="Déplacer la sélection"
            onPointerDown={(e) => startMulti(e, "move")}
            {...pointerEvents}
          >
            ✥
          </button>
          {["nw", "ne", "sw", "se"].map((c) => (
            <button
              key={c}
              className={`button-resize-handle layer-handle handle-${c}`}
              aria-label={`Redimensionner la sélection ${c}`}
              onPointerDown={(e) => startMulti(e, c)}
              {...pointerEvents}
            />
          ))}
          <button
            className="layer-rotation-handle"
            aria-label="Faire pivoter la sélection"
            onPointerDown={(e) => startMulti(e, "rotate")}
            {...pointerEvents}
          >
            ↻
          </button>
        </div>
      )}
      {lineDraft?.guides?.map(guide=><div key={guide.axis} className={`layer-guide guide-${guide.axis}`} style={guide.axis==='x'?{left:`${guide.value*100}%`}:{top:`${guide.value*100}%`}}/>)}
      {drawing&&drawingTool==='vectorLine'&&<div className="line-drawing-preview" style={{left:`${drawing.x*100}%`,top:`${drawing.y*100}%`,width:`${drawing.width*100}%`,height:`${drawing.height*100}%`}}><VectorLine item={{...drawing,stroke:{enabled:true,color:'#b8a0ec',opacity:1,width:3,cap:'butt',pattern:'solid',dash:10,gap:5,offset:0,start:'none',end:'none',decorationScale:3}}}/></div>}
      {drawing && drawingTool!=='vectorLine'&&(
        <div
          className="shape-drawing-preview"
          style={{
            left: `${drawing.x * 100}%`,
            top: `${drawing.y * 100}%`,
            width: `${drawing.width * 100}%`,
            height: `${drawing.height * 100}%`,
            borderRadius: drawingTool === "circle" ? "50%" : 0,
          }}
        />
      )}
      {marquee && (
        <div
          className="selection-marquee"
          style={{
            left: `${Math.min(marquee.start.x, marquee.end.x) * 100}%`,
            top: `${Math.min(marquee.start.y, marquee.end.y) * 100}%`,
            width: `${Math.abs(marquee.end.x - marquee.start.x) * 100}%`,
            height: `${Math.abs(marquee.end.y - marquee.start.y) * 100}%`,
          }}
        />
      )}
      {draft?.measures?.map((m) => (
        <span
          key={m.axis}
          className="spacing-measure"
          style={{
            left: `${(m.axis === "x" ? m.from : draft.rect.x) * 100}%`,
            top: `${(m.axis === "y" ? m.from : draft.rect.y) * 100}%`,
          }}
        >
          {m.label}
        </span>
      ))}
      {draft?.guides?.map((guide) => (
        <div
          key={guide.axis}
          className={`layer-guide guide-${guide.axis}`}
          style={
            guide.axis === "x"
              ? { left: `${guide.value * 100}%` }
              : { top: `${guide.value * 100}%` }
          }
        />
      ))}
    </div>
  );
}
