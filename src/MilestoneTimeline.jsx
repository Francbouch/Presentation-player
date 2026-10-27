import TimelineCardCanvas from "./TimelineCardCanvas.jsx";
import {cardSize,cardContentStyle} from "./timelineCardContent.js";
import TimelineDurationIndicators from './TimelineDurationIndicators.jsx';
import TimelinePhaseControls from "./TimelinePhaseControls.jsx";
import {timelineTitleNode,PHASE_STATUSES,zoomVertical} from "./timelinePhases.js";
import TimelineParallelPaths from "./TimelineParallelPaths.jsx";
import {timelineUnits,groupCentre} from "./timelineParallel.js";
import TimelineStepTitle from "./TimelineStepTitle.jsx";
import TimelineTitleSettings from "./TimelineTitleSettings.jsx";
import {
  titleOffsetFor,
  setTimelineTitleOffset,
  boundedTitleOffset,
  titleElement,
} from "./timelineTitlePosition.js";
import TimelineSlideControls from "./TimelineSlideControls.jsx";
import TimelineCardFrame from "./TimelineCardFrame.jsx";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ensureFont } from "./fonts.js";
import { TEXT_FONTS } from "./textModel.js";
import {
  timelineGeometry,
  timelineStepActions,
  timelineSlideCentre,
  timelineItems,
  timelineOrder,
  timelineProgress,
  TIMELINE_STATUSES,
} from "./milestoneTimeline.js";
import FrameSurface from "./FrameSurface.jsx";
import { frameCrop, framePlayback } from "./mediaFrames.js";
import "./milestoneTimeline.css";
const unit = (n) => `${n / 19.2}cqw`;
export default function MilestoneTimeline({
  item,
  urls = {},
  editing = false,
  selected = false,
  disabled = false,
  contextKey,
  onChange,
  requestInternal = false,
  onExitInternal,
  registerTimeline,
  onTimelineFocus,
  beginGesture,
  endGesture,
}) {
  const t = item.timeline,
    d = t.design,
    root = useRef(null),
    viewport = useRef(null),
    canvas = useRef(null),
    movement = useRef(null),
    movementTarget = useRef(null),
    [internal, setInternal] = useState(false),
    [cardEditingId, setCardEditingId] = useState(null),
    [titleEditingId, setTitleEditingId] = useState(null),
    [durationEditingId,setDurationEditingId]=useState(null),
    [navEditing,setNavEditing]=useState(false),
    [active, setActive] = useState([]),
    [cardId, setCardId] = useState(null),
    [closing, setClosing] = useState(false),
    [anchor, setAnchor] = useState({ x: 0.5, y: 0.5 }),
    [collapsed, setCollapsed] = useState({}),
    [revealed, setRevealed] = useState(d.initialVisible),
    [zoomTarget, setZoomTarget] = useState(null),
    [internalStep, setInternalStep] = useState(t.steps[0]?.id || "");
  const interactive =
      !durationEditingId &&
      !titleEditingId &&
      !navEditing &&
      !cardEditingId &&
      (!editing || (internal && selected)) &&
      !disabled &&
      (!editing || !item.locked),
    all = timelineOrder(t).filter((s) => s.visible),
    units = timelineUnits(t,true),
    items = timelineItems(
      (titleEditingId||durationEditingId)
        ? {
            ...t,
            steps: t.steps.map((s) =>
              s.id === titleEditingId || s.id === durationEditingId ? { ...s, visible: true } : s,
            ),
          }
        : t,
      collapsed,
    ).filter(
      (s) =>
        zoomTarget?.kind !== "phase" ||
        s.phaseId === zoomTarget.id ||
        s.phase?.id === zoomTarget.id,
    ),
    g = timelineGeometry(item, items),
    shown = new Set(
      units.slice(0,d.reveal&&!editing?revealed:units.length).flatMap(u=>u.steps.map(s=>s.id)),
    ),
    card =
      interactive || (cardEditingId && selected && editing)
        ? t.steps.find(
            (s) =>
              s.id === (cardEditingId || cardId) &&
              (s.visible || cardEditingId),
          )
        : null,
    edited = t.steps.find((s) => s.id === internalStep),
    titleEdited = timelineTitleNode(t,titleEditingId);
  useEffect(()=>{
    if(!editing||!selected||disabled||item.locked){setDurationEditingId(null);return;}
    const listener=e=>{if(e.detail?.layerId!==item.id)return;const step=t.steps.find(s=>s.id===e.detail.stepId);if(!step)return;setTitleEditingId(null);setNavEditing(false);setCardEditingId(null);setCardId(null);setDurationEditingId(step.id);setZoomTarget(null);if(step.phaseId)setCollapsed(v=>({...v,[step.phaseId]:false}));};
    document.addEventListener('studio-timeline-edit-duration',listener);
    return()=>document.removeEventListener('studio-timeline-edit-duration',listener);
  },[editing,selected,disabled,item.locked,item.id,t.steps]);
  useEffect(() => {
    if (!editing || !selected || disabled || item.locked) {
      setCardEditingId(null);
      return;
    }
    const listener = (e) => {
      if (
        e.detail?.layerId !== item.id ||
        !t.steps.some((s) => s.id === e.detail.stepId)
      )
        return;
      setDurationEditingId(null);
      setTitleEditingId(null);
      setNavEditing(false);
      setCardEditingId(e.detail.stepId);
      setCardId(e.detail.stepId);
      setClosing(false);
    };
    document.addEventListener("studio-timeline-edit-card", listener);
    return () =>
      document.removeEventListener("studio-timeline-edit-card", listener);
  }, [editing, selected, disabled, item.locked, item.id, t.steps]);
  useEffect(() => {
    if (cardEditingId && !t.steps.some((s) => s.id === cardEditingId))
      setCardEditingId(null);
  }, [cardEditingId, t.steps]);
  function selectTitle(id) {
    setDurationEditingId(null);
    const step = timelineTitleNode(t,id);
    if (!step) return;
    setTitleEditingId(id);
    if(step.summary){setCollapsed(v=>({...v,[step.phase.id]:true}));return;}
    setInternalStep(id);
    if (step.phaseId) setCollapsed((v) => ({ ...v, [step.phaseId]: false }));
    root.current?.ownerDocument.dispatchEvent(
      new CustomEvent("studio-timeline-edit-step", {
        detail: { layerId: item.id, stepId: id },
      }),
    );
  }
  function changeTitle(id, offset) {
    if (!editing || !selected || disabled || item.locked) return;
    const phase=id.startsWith('phase:');
    onChange?.(item.id, { timeline: setTimelineTitleOffset(t, phase?id.slice(6):id, offset,false,phase?'phases':'steps') });
  }
  useEffect(() => {
    if (!editing || !selected || disabled || item.locked) {
      setDurationEditingId(null);
      setTitleEditingId(null);
      return;
    }
    const listener = (e) => {
      if (
        e.detail?.layerId !== item.id ||
        !timelineTitleNode(t,e.detail.stepId)
      )
        return;
      setNavEditing(false);
      setCardEditingId(null);
      setCardId(null);
      setClosing(false);
      if (zoomTarget?.kind === "phase") setZoomTarget(null);
      selectTitle(e.detail.stepId);
    };
    document.addEventListener("studio-timeline-edit-title", listener);
    return () =>
      document.removeEventListener("studio-timeline-edit-title", listener);
  }, [
    editing,
    selected,
    disabled,
    item.locked,
    item.id,
    t.steps,
    t.phases,
    zoomTarget?.kind,
  ]);
  useLayoutEffect(() => {
    if (!titleEditingId) return;
    if (!timelineTitleNode(t,titleEditingId)) {
      setDurationEditingId(null);
      setTitleEditingId(null);
      return;
    }
    canvas.current?.getAnimations().forEach((animation) => animation.finish());
    const label = titleElement(item.id, titleEditingId),
      v = viewport.current;
    if (!label || !v) return;
    const node = label.parentElement,
      zoom = Number(root.current.dataset.zoom) || 1;
    const left =
        (node.offsetLeft + label.offsetLeft + label.offsetWidth / 2) * zoom,
      top = (node.offsetTop + label.offsetTop) * zoom;
    v.scrollTo({
      left: Math.max(0, left - v.clientWidth / 2),
      top: Math.max(0, top - v.clientHeight / 2),
      behavior: "instant",
    });
    label.focus({ preventScroll: true });
  }, [titleEditingId, g.path, zoomTarget?.kind, item.id]);
  useEffect(()=>{
    if(!editing||!selected||disabled||item.locked||!t.phases.length){setNavEditing(false);return;}
    const listener=e=>{if(e.detail?.layerId!==item.id)return;setDurationEditingId(null);setNavEditing(e.detail.enabled!==false);setTitleEditingId(null);setCardEditingId(null);setCardId(null);setZoomTarget(null);};
    document.addEventListener('studio-timeline-position-phases',listener);
    return()=>document.removeEventListener('studio-timeline-position-phases',listener);
  },[editing,selected,disabled,item.locked,item.id,t.phases.length]);
  function closeCardEditor() {
    setCardEditingId(null);
    setCardId(null);
  }
  function updateCardLayout(cardLayout) {
    if (!card || !editing || item.locked) return;
    onChange?.(item.id, {
      timeline: card.cardLayout
        ? {
            ...t,
            steps: t.steps.map((s) =>
              s.id === card.id ? { ...s, cardLayout } : s,
            ),
          }
        : { ...t, design: { ...d, cardLayout } },
    });
  }
  useEffect(() => {
    ensureFont(d.font).catch(() => {});
  }, [d.font]);
  useLayoutEffect(() => {
    movement.current?.cancel();
    movement.current = null;
    movementTarget.current = null;
    if (canvas.current) canvas.current.style.transform = "scale(1)";
    setCardId(null);
    setCardEditingId(null);
    setTitleEditingId(null);
    setNavEditing(false);
    setClosing(false);
    viewport.current?.scrollTo({ left: 0, top: 0, behavior: "instant" });
    const first = timelineOrder(t).find((s) => s.visible);
    setActive(
      d.autoCenter && !editing && first && (!d.reveal || d.initialVisible > 0)
        ? [first.id]
        : [],
    );
    setCollapsed({});
    setZoomTarget(null);
    setRevealed(d.initialVisible);
  }, [
    contextKey,
    item.id,
    d.reveal,
    d.initialVisible,
    d.autoCenter,
    editing,
    internal,
  ]);
  useEffect(() => {
    if (!editing || !selected || disabled || item.locked) {
      setInternal(false);
      if (requestInternal) onExitInternal?.();
    } else if (requestInternal) setInternal(true);
    if (disabled || (editing && !selected)) {
      setCardId(null);
      setZoomTarget(null);
    }
  }, [editing, selected, disabled, item.locked, requestInternal]);
  useEffect(() => {
    if (
      zoomTarget &&
      !(zoomTarget.kind === "phase"
        ? t.phases.some((p) => p.id === zoomTarget.id)
        : zoomTarget.kind === 'parallel' ? t.parallelGroups?.some(g=>g.id===zoomTarget.id)
        : t.steps.some((s) => s.id === zoomTarget.id && s.visible))
    )
      setZoomTarget(null);
    if (!t.steps.some((s) => s.id === internalStep))
      setInternalStep(t.steps[0]?.id || "");
    if (cardId && !t.steps.some((s) => s.id === cardId && s.visible))
      setCardId(null);
    setActive((a) =>
      a.filter((id) => t.steps.some((s) => s.id === id && s.visible)),
    );
  }, [t.steps, t.phases, t.parallelGroups, cardId, internalStep, zoomTarget]);
  function closeCard() {
    setClosing(true);
  }
  useEffect(() => {
    if (!closing) return;
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : d.cardDuration;
    const timer = setTimeout(() => {
      setCardId(null);
      setClosing(false);
    }, delay);
    return () => clearTimeout(timer);
  }, [closing, d.cardDuration]);
  function choose(s, event) {
    setClosing(false);
    if (!interactive) return;
    const r = root.current.getBoundingClientRect(),
      n = event?.currentTarget.getBoundingClientRect();
    if (n)
      setAnchor({
        x: (n.left - r.left + n.width / 2) / r.width,
        y: (n.top - r.top + n.height / 2) / r.height,
      });
    if (s.summary) {
      setCollapsed((v) => ({ ...v, [s.phase.id]: false }));
      return;
    }
    if (editing) {
      setInternalStep(s.id);
      root.current.ownerDocument.dispatchEvent(
        new CustomEvent("studio-timeline-edit-step", {
          detail: { layerId: item.id, stepId: s.id },
        }),
      );
    }
    const actions = timelineStepActions(s);
    if (s.click === "none" && !actions.zoom && !actions.card && !editing)
      return;
    setActive((a) =>
      d.exclusive
        ? [s.id]
        : a.includes(s.id)
          ? a.filter((id) => id !== s.id)
          : [...a, s.id],
    );
    setCardId(actions.card ? s.id : null);
    if (actions.zoom && d.zoom) setZoomTarget({ kind: "step", id: s.id });
    else if((t.parallelGroups?.length&&zoomTarget?.kind==='step')||(zoomTarget?.kind==='parallel'&&!t.parallelGroups?.find(g=>g.id===zoomTarget.id)?.stepIds.includes(s.id)))setZoomTarget(null);
  }
  function next() {
    if (revealed >= units.length) return false;
    const unit=units[revealed],step=unit.steps[0];
    setActive((a) =>
      d.exclusive ? [step.id] : [...a.filter((id) => id !== step.id), step.id],
    );
    setCardId(null);
    if (zoomTarget?.kind === "phase" && step.phaseId !== zoomTarget.id)
      setZoomTarget(null);
    if(unit.kind==='parallel' && d.zoom)setZoomTarget({kind:'parallel',id:unit.id});
    else if(zoomTarget?.kind==='parallel'||(t.parallelGroups?.length&&zoomTarget?.kind==='step'))setZoomTarget(null);
    setRevealed((v) => Math.min(units.length, v + 1));
    return true;
  }
  const latest = useRef();
  latest.current = {
    next,
    hasNext: d.reveal && d.revealSpace && revealed < units.length,
  };
  useEffect(() => {
    if (editing || disabled || !registerTimeline) return;
    return registerTimeline(item.id, {
      next: () => latest.current.next(),
      hasNext: () => latest.current.hasNext,
    });
  }, [editing, disabled, registerTimeline, item.id]);
  const activeGroup=t.parallelGroups?.find(g=>g.stepIds.includes(active.at(-1))),
    zoomGroup=zoomTarget?.kind==='parallel'?t.parallelGroups?.find(g=>g.id===zoomTarget.id):null,
    groupPoint=zoomGroup?groupCentre(g.points,zoomGroup.stepIds.find(id=>g.points.some(p=>p.id===id))):null;
  const zoom = zoomTarget && d.zoom ? (groupPoint?Math.max(1,Math.min(d.zoomScale/100,1536/(groupPoint.groupBounds.width+d.spacing),756/(groupPoint.groupBounds.height+d.dotSize+100))):d.zoomScale / 100) : 1;
  const individualFraming=zoomTarget?.kind==='step'&&d.zoom&&(d.zoomVerticalPosition!==undefined||t.steps.find(s=>s.id===zoomTarget.id)?.zoomVerticalPosition!==undefined);
  const centering = (!!d.autoCenter||individualFraming) && !editing && !disabled;
  const detachedControls =
    !editing &&
    (item.x < 0 ||
      item.y < 0 ||
      item.x + item.width > 1 ||
      item.y + item.height > 1);
  useEffect(() => () => movement.current?.cancel(), []);
  useLayoutEffect(() => {
    if (!centering || !viewport.current || !canvas.current) {
      movement.current?.cancel();
      movementTarget.current = null;
      if (canvas.current) canvas.current.style.transform = `scale(${zoom})`;
      return;
    }
    const v = viewport.current,
      c = canvas.current;
    const reference=zoomTarget?.kind==='step'&&t.parallelGroups?.length?g.points.find(s=>s.id===zoomTarget.id):zoomTarget?.kind==='parallel'?groupPoint:groupCentre(g.points,active.at(-1)||zoomTarget?.id);
    const point = zoomTarget?.kind === "phase"
        ? g.points[Math.floor(g.points.length / 2)]
        : reference || g.points.find(s=>s.summary&&s.phase.id===t.steps.find(x=>x.id===active.at(-1))?.phaseId);
    const reposition = () => {
      const factor = c.offsetWidth / g.width;
      const host = root.current?.closest(".interactive-button-layer");
      const centre = host
        ? timelineSlideCentre(
            item,
            host.clientWidth,
            host.clientHeight,
            v.offsetLeft,
            v.offsetTop,
            zoomTarget?.kind==='step'?zoomVertical(t,zoomTarget.id)/100:0.5,
          )
        : { x: v.clientWidth / 2, y: v.clientHeight / 2 };
      const x =
        point && (d.layout !== "vertical" || zoomTarget || point.parallelId)
          ? centre.x - point.x * factor * zoom
          : 0;
      const y =
        point && (d.layout !== "horizontal" || zoomTarget || point.parallelId)
          ? centre.y - point.y * factor * zoom
          : 0;
      const target = `translate(${x}px, ${y}px) scale(${zoom})`;
      if (target === movementTarget.current) return;
      // Capture the currently rendered matrix BEFORE cancelling an interrupted animation.
      const from = getComputedStyle(c).transform;
      movement.current?.cancel();
      movement.current = null;
      movementTarget.current = target;
      c.style.transform = target;
      v.scrollTo({ left: 0, top: 0, behavior: "instant" });
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (point && (d.centerAnimated ?? true) && !reduced) {
        movement.current = c.animate(
          [{ transform: from }, { transform: target }],
          {
            duration: d.autoCenter?(d.centerDuration??700):d.zoomDuration,
            easing: d.centerEasing ?? "ease-in-out",
          },
        );
      }
    };
    reposition();
    const observer = new ResizeObserver(reposition);
    observer.observe(v);
    observer.observe(c);
    const host = root.current?.closest(".interactive-button-layer");
    if (host) observer.observe(host);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduce = () => {
      if (motion.matches) movement.current?.finish();
    };
    motion.addEventListener("change", reduce);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", reduce);
    };
  }, [
    centering,
    item.x,
    item.y,
    item.width,
    item.height,
    item.rotation,
    d.layout,
    g.points.map((p) => p.id).join(":"),
    active.at(-1),
    zoomTarget?.kind,
    zoomTarget?.id,
    zoom,
    g.path,
    g.width,
    g.height,
    contextKey,
    d.centerAnimated,
    d.centerDuration,
    d.centerEasing,
    d.zoomDuration,
    d.zoomVerticalPosition,
    t.steps.find(s=>s.id===zoomTarget?.id)?.zoomVerticalPosition,
  ]);
  const progressId = active.at(-1),
    activePhase = t.steps.find((s) => s.id === progressId)?.phaseId,
    progress = timelineProgress(
      g.points,
      g.points.some((s) => s.id === progressId)
        ? progressId
        : activePhase
          ? `phase:${activePhase}`
          : progressId,
      revealed,
      d,
    );
  useLayoutEffect(() => {
    if (
      centering ||
      !viewport.current ||
      !canvas.current ||
      (!zoomTarget && (!d.reveal || editing))
    )
      return;
    const point = zoomTarget
      ? zoomTarget.kind === "step"
        ? g.points.find((s) => s.id === zoomTarget.id)
        : zoomTarget.kind==='parallel'?groupPoint:g.points[Math.floor(g.points.length / 2)]
      : g.points.find(
          (s) =>
            s.id === units[Math.max(0,revealed-1)]?.steps[0]?.id ||
            (s.summary &&
              s.phase.id === units[Math.max(0,revealed-1)]?.steps[0]?.phaseId),
        );
    if (!point) return;
    const focusPoint=zoomTarget?.kind==='step'?point:groupCentre(g.points,point.id)||point;
    const v = viewport.current,
      factor = canvas.current.offsetWidth / g.width;
    const px = focusPoint.x * factor * zoom,
      py = focusPoint.y * factor * zoom,
      padX = Math.min(d.spacing * 0.5 * factor * zoom, v.clientWidth / 3),
      padY = Math.min(d.fontSize * 4 * factor * zoom, v.clientHeight / 3);
    if (
      !zoomTarget &&
      px >= v.scrollLeft + padX &&
      px <= v.scrollLeft + v.clientWidth - padX &&
      py >= v.scrollTop + padY &&
      py <= v.scrollTop + v.clientHeight - padY
    )
      return;
    v.scrollTo({
      left: Math.max(0, focusPoint.x * factor * zoom - v.clientWidth / 2),
      top: Math.max(0, focusPoint.y * factor * zoom - v.clientHeight / 2),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }, [centering, zoomTarget, zoom, g.width, g.height, revealed]);

  const nodeStyle = (s, i) => {
    const visible =
        !d.reveal ||
        editing ||
        (s.summary
          ? t.steps.some(
              (step) => step.phaseId === s.phase.id && shown.has(step.id),
            )
          : shown.has(s.id)),
      isActive = active.includes(s.id),
      color = s.color || (s.summary ? s.phase.color : d.statusColors[s.status]);
    return {
      visible,
      isActive,
      color,
      style: {
        left: unit(s.x),
        top: unit(s.y),
        width: unit(d.spacing * 0.85),
        visibility: visible ? "visible" : "hidden",
        opacity:
          active.length && d.highlight === "dim" && !isActive
            ? 1 - d.dimOthers / 100
            : d.highlight === "opacity" && !isActive
              ? 0.5
              : 1,
        "--tl-reveal-duration": `${d.revealDuration}ms`,
        "--tl-highlight": color,
        ...(s.summary&&(d.phaseDotSize!==undefined||s.phase.dotSize!==undefined)?{'--tl-phase-title-gap':unit(Math.max(24.96,s.dotSize/2+12))}:{}),
      },
    };
  };
  return (
    <div
      role="group"
      aria-label={`Ligne du temps ${item.name}`}
      ref={root}
      className={`milestone-timeline ${durationEditingId?'timeline-duration-positioning':''} ${navEditing?'timeline-phase-positioning':''} ${titleEditingId ? "timeline-title-positioning" : ""} ${centering ? "is-slide-centered" : ""} ${internal ? "is-internal-editing" : ""}`}
      data-layout={d.layout}
      data-keyboard-reveal={
        interactive && d.reveal && d.revealSpace ? "true" : "false"
      }
      data-active-step={active.at(-1) || ""}
      data-active-parallel={activeGroup?.id||''}
      data-revealed-units={Math.min(revealed,units.length)}
      data-zoom={zoom}
      data-progress={progress}
      style={{
        background: d.backgroundTransparent ? "transparent" : d.background,
        color: d.textColor,
        fontFamily: TEXT_FONTS[d.font].css,
        fontSize: unit(d.fontSize),
        borderRadius: unit(d.radius),
      }}
      onFocusCapture={() => {
        if (interactive) onTimelineFocus?.(item.id);
      }}
      onPointerDown={(e) => {
        if (interactive) {
          e.stopPropagation();
          onTimelineFocus?.(item.id);
        }
      }}
      onClick={(e) => {
        if (interactive) e.stopPropagation();
      }}
      onDoubleClick={(e) => {
        if (editing && !item.locked && !disabled) {
          e.stopPropagation();
          e.preventDefault();
          setInternal(true);
        }
      }}
      onKeyDown={(e) => {
        if(durationEditingId&&e.key==='Escape'){e.preventDefault();e.stopPropagation();setDurationEditingId(null);return;}
        if (
          e.target.closest(
            "input,textarea,select,video,audio,[contenteditable]",
          )
        ) {
          e.stopPropagation();
          return;
        }
        if (
          titleEditingId &&
          editing &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.altKey
        ) {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            setDurationEditingId(null);
      setTitleEditingId(null);
            return;
          }
          if (
            ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
              e.key,
            ) &&
            titleEdited
          ) {
            e.preventDefault();
            e.stopPropagation();
            const base = titleOffsetFor(item, titleEdited),
              n = e.shiftKey ? 10 : 1;
            changeTitle(
              titleEdited.id,
              boundedTitleOffset({
                x:
                  base.x +
                  (e.key === "ArrowRight" ? n : e.key === "ArrowLeft" ? -n : 0),
                y:
                  base.y +
                  (e.key === "ArrowDown" ? n : e.key === "ArrowUp" ? -n : 0),
              }),
            );
            return;
          }
        }
        if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
        if (interactive && ["ArrowLeft", "ArrowRight"].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          const i = units.findIndex(u=>u.steps.some(s=>s.id===active.at(-1))),
            step =
              units[
                Math.max(
                  0,
                  Math.min(
                    units.length - 1,
                    i + (e.key === "ArrowRight" ? 1 : -1),
                  ),
                )
              ]?.steps[0];
          if (step && shown.has(step.id)) choose({ ...step, click: "select" });
          return;
        }
        if (e.key === "Escape" && (internal || card || zoomTarget)) {
          e.preventDefault();
          e.stopPropagation();
          setInternal(false);
          onExitInternal?.();
          setCardId(null);
          setZoomTarget(null);
        }
      }}
    >
      {t.phases.length > 0 && (
        <TimelinePhaseControls root={root.current} item={item} editing={navEditing} exit={()=>setNavEditing(false)} change={onChange} detached={detachedControls}>
          <div
            className="milestone-phases"
            aria-label="Phases de la ligne du temps"
          >
            {t.phases.map((p) => (
              <span key={p.id}>
                <button
                  type="button"
                  disabled={disabled}
                  tabIndex={interactive ? 0 : -1}
                  aria-disabled={!interactive}
                  style={{ borderColor: p.color }}
                  aria-expanded={!(collapsed[p.id] ?? p.collapsed)}
                  onClick={() => {
                    if (!interactive) return;
                    setCollapsed((v) => ({
                      ...v,
                      [p.id]: !(v[p.id] ?? p.collapsed),
                    }));
                    setCardId(null);
                    setZoomTarget(null);
                  }}
                >
                  {p.name} · {all.filter((s) => s.phaseId === p.id).length}
                </button>
                {interactive && d.zoom && (
                  <button
                    type="button"
                    aria-label={`Zoomer sur la phase ${p.name}`}
                    onClick={() => {
                      setCollapsed((v) => ({ ...v, [p.id]: false }));
                      setCardId(null);
                      setZoomTarget({ kind: "phase", id: p.id });
                    }}
                  >
                    ⌕
                  </button>
                )}
              </span>
            ))}
          </div>
        </TimelinePhaseControls>
      )}
      <div
        ref={viewport}
        className={`milestone-viewport${centering ? " is-centering" : ""}`}
        style={{
          height: t.phases.length && d.phaseNavigationVisible!==false
            ? "calc(100% - 5.6cqw)"
            : "calc(100% - 2.6cqw)",
        }}
      >
        <div
          className="milestone-zoom-space"
          style={
            centering
              ? { width: "100%", height: "100%" }
              : { width: unit(g.width * zoom), height: unit(g.height * zoom) }
          }
        >
          <div
            ref={canvas}
            className="milestone-canvas"
            style={{
              width: unit(g.width),
              height: unit(g.height),
              ...(centering ? {} : { transform: `scale(${zoom})` }),
              transformOrigin: "0 0",
              transition: centering
                ? "none"
                : `transform ${d.zoomDuration}ms ease`,
            }}
          >
            <svg
              className="milestone-path"
              viewBox={`0 0 ${g.width} ${g.height}`}
              aria-hidden={editing?undefined:true}
            >
              {g.segments ? <TimelineParallelPaths geometry={g} design={d} shown={shown} editing={editing} progress={progress} started={!!active.length||(d.reveal&&revealed>0)||g.points.some(p=>!p.summary&&p.status==='done')||(d.progressMode==='manual'&&progress>0)} onGroup={groupId=>{
                document.dispatchEvent(new CustomEvent('studio-timeline-edit-group',{detail:{layerId:item.id,groupId}}));
              }}/> : <><polyline
                points={g.path}
                fill="none"
                stroke={d.lineColor}
                strokeWidth={d.lineWidth}
              />
              {d.progress && (
                <polyline
                  className="milestone-progress-path"
                  points={g.path}
                  pathLength="100"
                  fill="none"
                  stroke={d.progressColor}
                  strokeWidth={d.lineWidth}
                  strokeLinecap="round"
                  strokeDasharray={`${progress} 100`}
                  style={{
                    transition: `stroke-dasharray ${d.progressDuration}ms ease`,
                  }}
                />
              )}
</>}
            </svg>
            {g.points.map((s, i) => {
              const { visible, isActive, color, style } = nodeStyle(s, i),
                Content = interactive ? "button" : "div";
              return (
                <Content
                  type={interactive ? "button" : undefined}
                  className={`milestone-node ${s.summary?'is-phase-summary':''} title-${d.titlePosition === "alternating" ? (i % 2 ? "above" : "below") : d.titlePosition} ${visible && d.reveal && !editing ? `reveal-${d.revealType}` : ""} ${isActive ? "is-active" : ""}`}
                  key={s.id}
                  data-step-id={s.id}
                  aria-label={
                    s.summary
                      ? `Déployer la phase ${s.name}`
                      : `Étape ${s.name}`
                  }
                  aria-pressed={
                    interactive && !s.summary ? isActive : undefined
                  }
                  aria-hidden={!visible}
                  tabIndex={visible && interactive ? 0 : undefined}
                  style={style}
                  onClick={(e) => choose(s, e)}
                >
                  <span
                    className="milestone-dot"
                    style={{
                      width: unit(s.summary?s.dotSize:d.dotSize),
                      height: unit(s.summary?s.dotSize:d.dotSize),
                      background:
                        isActive && d.highlight === "color"
                          ? d.progressColor
                          : color,
                      transform:
                        isActive && d.highlight === "scale"
                          ? `scale(${d.highlightScale / 100})`
                          : undefined,
                      boxShadow:
                        isActive && d.highlight === "glow"
                          ? `0 0 ${unit(d.highlightIntensity)} ${color}`
                          : undefined,
                    }}
                  >
                    {s.summary ? "+" : d.showIcons && s.icon}
                  </span>
                  <TimelineStepTitle
                    item={item}
                    step={s}
                    positioning={!!titleEditingId && !!s.summary===!!titleEdited?.summary}
                    selected={titleEditingId === s.id}
                    change={changeTitle}
                    select={selectTitle}
                    fontWeight={
                      isActive && d.highlight === "bold" ? 800 : undefined
                    }
                  >
                    <strong title={s.name}>{s.name}</strong>
                    {s.summary && (
                      <small>
                        {
                          t.steps.filter((step) => step.phaseId === s.phase.id)
                            .length
                        }{" "}
                        étapes
                      </small>
                    )}
                    {d.showDates && s.date && <small>{s.date}</small>}
                    {d.showDescriptions && s.description && (
                      <small>{s.description}</small>
                    )}
                    <small className="milestone-status">
                      {s.summary?PHASE_STATUSES[s.status]:TIMELINE_STATUSES[s.status]}
                    </small>
                  </TimelineStepTitle>
                  {!s.summary&&<TimelineDurationIndicators item={item} step={s} points={g.points} editing={editing} positioning={durationEditingId===s.id} exit={()=>setDurationEditingId(null)} change={(id,v)=>onChange?.(item.id,{timeline:{...t,steps:t.steps.map(step=>step.id===id?{...step,timing:{...step.timing,...v}}:step)}})}/>}
                </Content>
              );
            })}
          </div>
        </div>
      </div>
      {interactive && (
        <TimelineSlideControls
          root={root.current}
          item={item}
          enabled={detachedControls}
          placement="navigation"
        >
          <div
            className="milestone-navigation"
            aria-label="Navigation de la ligne du temps"
          >
            {d.reveal && (
              <>
                <button
                  type="button"
                  disabled={revealed <= 0}
                  onClick={() => {
                    setRevealed((v) => Math.max(0, v - 1));
                    if(t.parallelGroups?.length)setZoomTarget(null);
                    setCardId(null);
                    setActive(
                      centering && revealed > 1 ? [units[Math.min(revealed-2,units.length-1)].steps[0].id] : [],
                    );
                  }}
                >
                  Étape précédente
                </button>
                <span>
                  {Math.min(revealed, units.length)} / {units.length}
                </span>
                {d.revealClick && (
                  <button
                    type="button"
                    disabled={revealed >= units.length}
                    onClick={next}
                  >
                    Étape suivante
                  </button>
                )}
              </>
            )}
            {d.zoom && (
              <>
                {activeGroup&&<button type="button" onClick={()=>{setZoomTarget({kind:'parallel',id:activeGroup.id});setCardId(null);}}>Zoom sur le groupe actif</button>}
                <button
                  type="button"
                  disabled={!active.length}
                  onClick={() => {
                    setCardId(null);
                    setZoomTarget({ kind: "step", id: active.at(-1) });
                  }}
                >
                  Zoom sur l’étape active
                </button>
                <button
                  type="button"
                  disabled={!zoomTarget}
                  onClick={() => {
                    setZoomTarget(null);
                    setCardId(null);
                  }}
                >
                  Vue d’ensemble
                </button>
              </>
            )}
            {internal && (
              <button
                type="button"
                onClick={() => {
                  setInternal(false);
                  onExitInternal?.();
                }}
              >
                Terminer l’édition interne
              </button>
            )}
          </div>
        </TimelineSlideControls>
      )}
      {editing && internal && edited && (
        <label className="milestone-inline-title">
          Titre de l’étape
          <input
            aria-label="Titre de l’étape dans le canevas"
            value={edited.name}
            maxLength={200}
            onChange={(e) =>
              onChange?.(item.id, {
                timeline: {
                  ...t,
                  steps: t.steps.map((s) =>
                    s.id === edited.id ? { ...s, name: e.target.value } : s,
                  ),
                },
              })
            }
          />
        </label>
      )}
      {titleEdited && editing && selected && (
        <TimelineTitleSettings
          layer={item}
          step={titleEdited}
          change={onChange}
          compact
          root={root.current}
          exit={() => setTitleEditingId(null)}
        />
      )}
      {card && (
        <TimelineCardFrame
          root={root.current}
          item={item}
          layout={card.cardLayout || d.cardLayout}
          editing={!!cardEditingId}
          scope={card.cardLayout ? "individual" : "common"}
          change={updateCardLayout}
          exit={closeCardEditor}
          editContent={()=>root.current.ownerDocument.dispatchEvent(new CustomEvent("studio-timeline-edit-card-content",{detail:{layerId:item.id,stepId:card.id}}))}
          beginGesture={beginGesture}
          endGesture={endGesture}
        >
          <div
            key={card.id}
            className={`milestone-card card-${d.cardMode} ${closing ? "is-closing" : ""}`}
            role="dialog"
            aria-label={`Fiche ${card.name}`}
            style={{
              width: unit(d.cardWidth),
              maxHeight: `min(${unit(d.cardHeight)},calc(100% - 1.2cqw))`,
              ...(d.cardMode === "floating"
                ? {
                    transform: "none",
                    left: `${Math.max(2, Math.min(anchor.x * 100, 98 - Math.min((d.cardWidth / (item.width * 1920)) * 100, 94)))}%`,
                    top: `${Math.max(2, Math.min(anchor.y * 100, 98 - Math.min((d.cardHeight / (item.height * 1080)) * 100, 94)))}%`,
                  }
                : {}),
              background: d.cardBackground,
              color: d.cardText,
              border: `1px solid ${d.cardBorder}`,
              borderRadius: unit(d.cardRadius),
              boxShadow: `0 ${unit(d.cardShadow / 2)} ${unit(d.cardShadow)} #0008`,
              animationDuration: `${d.cardDuration}ms`,
              transition: `opacity ${d.cardDuration}ms ease`,
              opacity: closing ? 0 : 1,
              ...(card.cardContent?cardContentStyle(card.cardContent,d):{}),
            }}
          >
            <button
              type="button"
              className="milestone-card-close"
              aria-label="Fermer la fiche"
              onClick={cardEditingId ? closeCardEditor : closeCard}
            >
              ×
            </button>
            {card.cardContent?<TimelineCardCanvas key={`${item.id}:${card.id}`} content={card.cardContent} design={d} size={cardSize(card,d)} urls={urls} pageId={`${item.id}:${card.id}`} playbackEnabled={interactive&&!closing&&!cardEditingId}/>:<>
            <strong>{card.name}</strong>
            <small>
              {card.date} · {TIMELINE_STATUSES[card.status]}
            </small>
            <p>{card.description}</p>
            {card.imageId &&
              (urls[card.imageId] ? (
                <img
                  className="milestone-card-image"
                  src={urls[card.imageId]}
                  alt={card.name}
                />
              ) : (
                <p role="status">Image indisponible</p>
              ))}
            {card.videoId &&
              (urls[card.videoId] ? (
                <div className="milestone-card-video">
                  <FrameSurface
                    key={`${card.id}:${card.videoId}`}
                    item={{
                      id: `${item.id}:${card.id}`,
                      type: "rectangle",
                      width: d.cardWidth / 1920,
                      height: (d.cardWidth * 0.5625) / 1080,
                      frameMedia: {
                        kind: "video",
                        mediaId: card.videoId,
                        crop: { ...frameCrop(), mode: "contain" },
                        playback: {
                          ...framePlayback(),
                          autoplay: d.cardAutoplay,
                        },
                      },
                    }}
                    urls={urls}
                    controls={!cardEditingId}
                    playbackEnabled={interactive && !closing && !cardEditingId}
                  />
                </div>
              ) : (
                <p role="status">Vidéo indisponible</p>
              ))}
            {card.details && <p>{card.details}</p>}
            </>}
          </div>
        </TimelineCardFrame>
      )}
    </div>
  );
}
