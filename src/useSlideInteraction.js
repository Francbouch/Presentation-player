import {captureVideoLayers} from './videoLayers.js';
import {initialGroupVisibility,effectiveVisibility,applyGroupOperations} from './visibilityGroups.js';
import {stateView,stateImageSources} from './stateView.js';
import { defaultBackgroundEffect, stateEffect } from './visualEffects.js';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { orderedLayers, resolveBackground } from './document.js';

// L’état de lecture est distinct du document sauvegardé, dans les deux modes.
export default function useSlideInteraction(page, { urls = {}, onNavigate } = {}) {
  const [selections, setSelections] = useState({});
  const [groupSelections,setGroupSelections]=useState({});
  const [visual, setVisual] = useState(null);
  const visualRunning = useRef(null);
  const [video, setVideo] = useState(null);
  const [notice, setNotice] = useState('');
  const running = useRef(null);
  const framePlayers=useRef(new Map()),frameRequest=useRef(0);
  const registerVideo=useCallback((pageId,id,controller)=>{const key=pageId+':'+id;framePlayers.current.set(key,controller);return()=>{controller.pause();if(framePlayers.current.get(key)===controller)framePlayers.current.delete(key);frameRequest.current++;};},[]);
  useEffect(()=>{const pageId=page?.id;return()=>{frameRequest.current++;for(const [key,v] of framePlayers.current)if(key.startsWith(pageId+':'))v.pause();};},[page?.id]);
  const awaitingImage = useRef(null);
  const backgroundReady = useCallback(result => {
    const pending = awaitingImage.current;
    if (pending?.pageId === result.pageId && pending.source === result.source && (pending.stateId===undefined || pending.stateId===(result.stateId??null)) && (pending.readinessId===undefined || pending.readinessId===result.readinessId)) {
      awaitingImage.current = null;
      result.ready ? pending.resolve() : pending.reject(new Error('L’image finale ne peut pas être lue.'));
    }
  }, []);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; running.current = null; visualRunning.current = null; awaitingImage.current?.resolve(); }, []);
  const currentPageId=useRef(page?.id);currentPageId.current=page?.id;
  useLayoutEffect(()=>()=>{
    const pending=running.current;
    // The requested destination is being mounted underneath the last video
    // frame. Its readiness promise, not the page-ID change, ends playback.
    if(pending?.finishing && pending.action.end==='page' && pending.action.pageId===currentPageId.current)return;
    stopVideo();
  },[page?.id]);
  function stopVideo() { const pending=running.current;if(pending?.staged&&!pending.committed)setSelections(previous=>({...previous,[pending.page.id]:pending.base}));running.current = null; stopVisual(); awaitingImage.current?.resolve(); awaitingImage.current = null; setVideo(null); }
  function forPage(page) {
    const initial = page?.states?.find(state => state.id === page.initialStateId);
    const selection = page && selections[page.id];
    const target = selection?.target ?? initial?.background ?? page?.defaultBackground;
    const groupVisibility=selection?.groupVisibility??initialGroupVisibility(page||{states:[]},selection?.stateId===undefined?initial?.id??null:selection.stateId);
    const visibility = page?effectiveVisibility(page,selection?.visibility ?? initial?.visibility ?? {},groupVisibility):{};
    const activeButtonId = selection ? selection.buttonId : initial?.activeButtonId ?? null;
    const stateId = selection?.stateId === undefined ? initial?.id ?? null : selection.stateId;
    const selectedGroups=Object.create(null);
    for(const button of page?.buttons||[]){
      const group=button.selectionGroup;if(!group)continue;
      if(stateId!==null&&activeButtonId===button.id)selectedGroups[group]=button.id;
      if(button.action?.type==='state'){if(button.action.stateId && button.action.stateId===stateId && (!selectedGroups[group] || button.id===activeButtonId || button.defaultSelected && selectedGroups[group]!==activeButtonId))selectedGroups[group]=button.id;}
      else if(button.action?.type==='background'){const entries=groupSelections[page.id]||{};const chosen=Object.hasOwn(entries,group)?entries[group]:null;if(stateId===null && (chosen===button.id || !chosen && button.defaultSelected) && resolveBackground(page,button.action.target||page.defaultBackground)===resolveBackground(page,target))selectedGroups[group]=button.id;}
    }
    function change(update) {
      if (!page) return;
      setSelections(previous => {
        const base = previous[page.id] || { target: initial?.background ?? page.defaultBackground, visibility: { ...initial?.visibility }, buttonId: initial?.activeButtonId ?? null, stateId:initial?.id ?? null };
        return { ...previous, [page.id]: { ...base, ...update(base) } };
      });
    }
    function choose(target, buttonId = null) { if(visualRunning.current?.scope==='background')stopVisual(); if (!visualRunning.current && !running.current?.action.block && !running.current?.finishing) change(() => ({ target, buttonId, stateId:null })); }
    function reset() { frameRequest.current++;for(const v of framePlayers.current.values())v.pause(); if(page)setGroupSelections(previous=>({...previous,[page.id]:{}})); stopVisual(); stopVideo(); setNotice(''); if (page) setSelections(previous => { const next = { ...previous }; delete next[page.id]; return next; }); }
    async function activateButton(button) {
      const action = button.action;
      if (!action || visualRunning.current&&visualRunning.current.scope!=='background' || (running.current?.action.block||running.current?.finishing)) return;
      setNotice('');
      if(action.type==='visibilityGroups'){
        if(visualRunning.current)return;
        try{const next=applyGroupOperations(page,groupVisibility,action.operations);for(const g of page.visibilityGroups||[])if(next[g.id]&&!groupVisibility[g.id])for(const id of g.layerIds)framePlayers.current.get(page.id+':'+id)?.reveal();change(()=>({groupVisibility:next}));}catch(error){setNotice(error.message);}return;
      }
      if(action.type==='layerVideo'){
        const token=++frameRequest.current;
        const players=action.layerIds.map(id=>framePlayers.current.get(page.id+':'+id)).filter(Boolean);
        if(!players.length){setNotice('Choisissez au moins un cadre vidéo sur cette page.');return;}
        if(action.command==='pause'||action.command==='stop'){for(const p of players){p.prepare(action.command);p.execute(action.command);}return;}
        const ready=await Promise.all(players.map(p=>p.ready()));
        if(token!==frameRequest.current||!alive.current)return;
        const prepared=await Promise.all(players.map((p,i)=>ready[i]?p.prepare(action.command):false));
        if(token!==frameRequest.current||!alive.current)return;
        const available=players.filter((p,i)=>prepared[i]);
        if(ready.some(v=>!v))setNotice('Une vidéo est indisponible. Les autres vidéos peuvent continuer.');
        await Promise.allSettled(available.map(p=>p.execute(action.command)));
        return;
      }
      frameRequest.current++;
      if (action.type === 'background') {activateBackground(button);return;}
      if(visualRunning.current?.scope==='background')stopVisual();
      if (action.type === 'visibility') {
        for(const id of action.layerIds){const layer=orderedLayers(page).find(l=>l.id===id),mode=action.mode==='custom'?action.targetModes?.[id]||'toggle':action.mode;const shown=visibility[id]??layer?.visible??true;if(mode==='show'||mode==='toggle'&&!shown)framePlayers.current.get(page.id+':'+id)?.reveal();}
        change(base => ({ buttonId: button.id, stateId:null, visibility: { ...base.visibility, ...Object.fromEntries(action.layerIds.map(id => {
          const layer = orderedLayers(page).find(item => item.id === id);
          const visible = base.visibility[id] ?? layer?.visible ?? true;
          const mode=action.mode==='custom'?action.targetModes?.[id]||'toggle':action.mode;
          const next=mode === 'show' ? true : mode === 'hide' ? false : !visible;
          return [id,next];
        })) } })); return;
      }
      if (action.type === 'state') {
        const state = page.states.find(state => state.id === action.stateId);
        if (!state) { setNotice('Choisissez un état pour ce bouton.'); return; }
        activateState(state.id,null,button.selectionGroup || button.interactiveEffects || button.indicator ? button.id : null);
        return;
      }
      if (action.type === 'navigate') {
        if (!action.pageId) { setNotice(action.missingPageId ? 'La diapositive cible a été supprimée. Choisissez une nouvelle destination dans l’éditeur.' : 'Choisissez une page de destination.'); return; }
        stopVideo();
        try { await onNavigate?.(action.pageId, action.transitionId); } catch (error) { if (alive.current) setNotice(error.message); }
        return;
      }
      if (action.type === 'video') {
        if (running.current) {if(running.current.buttonId===button.id)return;stopVideo();} // Une autre vidéo non verrouillée remplace la précédente.
        if(action.end==='state'&&!page.states.some(s=>s.id===action.finalStateId)){setNotice('Choisissez un état existant à afficher après la vidéo.');return;}
        if (!urls[action.videoId]) { setNotice('Choisissez une vidéo lisible pour ce bouton.'); return; }
        const playback = { id: crypto.randomUUID(), page, action, buttonId: button.id, videoLayers:captureVideoLayers(page,forPage(page),'action'), base: { target, visibility, groupVisibility, buttonId: activeButtonId, stateId } };
        running.current = playback; setVideo(playback);
        change(() => ({ buttonId: button.id }));
      }
    }
    function activateBackground(button,base={target,visibility,buttonId:activeButtonId,stateId,groupVisibility}){
      const pending=visualRunning.current;
      if(pending?.scope==='background'&&pending.started){pending.queued={button,start:nextBase=>activateBackground(button,nextBase)};return;}
      if(pending)stopVisual();
      if(running.current)stopVideo();
      const next={...base,target:button.action.target||page.defaultBackground,buttonId:button.id,stateId:null};
      if(!urls[resolveBackground(page,next.target)]){setNotice('L’image de fond est indisponible. L’affichage précédent est conservé.');return;}
      const playback={id:crypto.randomUUID(),scope:'background',pageId:page.id,from:base,to:next,effect:button.backgroundEffect||defaultBackgroundEffect(),group:button.selectionGroup};
      visualRunning.current=playback;setVisual(playback);setNotice('');
    }
    function snapshot(id) { return stateView(page,id); }
    function activateState(id,from=null,buttonId=null,completion=null) {
      if(completion&&running.current===completion&&completion.finishing){const next=snapshot(id);change(()=>({...next,readinessId:completion.id}));return next;}
      if(visualRunning.current?.scope==='background')stopVisual();
      if(visualRunning.current || running.current?.action.block || running.current?.finishing)return;
      if(running.current)stopVideo(); // Une vidéo non verrouillée est interrompue avant l’effet.
      const base=from || {target,visibility,buttonId:activeButtonId,stateId,groupVisibility};
      if(id===base.stateId){if(buttonId)change(()=>({buttonId}));return;}
      const next=snapshot(id);if(buttonId&&!next.buttonId)next.buttonId=buttonId;const effect=stateEffect(page,base.stateId,id);
      if(effect.type==='none'){change(()=>next);return;}
      const playback={id:crypto.randomUUID(),pageId:page.id,from:base,to:next,effect};
      visualRunning.current=playback;setVisual(playback);setNotice('');
    }
    function inspectState(id){stopVideo();change(()=>snapshot(id));}
    function previewStates(fromId,toId){if(visualRunning.current || running.current?.action.block || running.current?.finishing)return;if(running.current)stopVideo();const base=snapshot(fromId);change(()=>base);activateState(toId,base);}
    return { registerVideo, target, activeButtonId, selectedGroups, visibility, stateId, readinessId:selection?.readinessId, choose, activateButton, reset, backgroundReady,activateState,inspectState,previewStates,visual:visual?.pageId===page?.id?visual:null,finishVisual,visualPrepared };

  }
  async function finishVideo(id, error = false) {
    const playback = running.current;
    if (!playback || playback.id !== id || playback.finishing) return;
    playback.finishing = true;setVideo({...playback});
    let finalTimer;
    try {
      if (error) throw new Error('La vidéo ne peut pas être lue. La diapositive est conservée.');
      const { action, page } = playback;
      if(action.end==='state') {
        if(!page.states.some(s=>s.id===action.finalStateId))throw new Error('L’état cible n’existe plus. Choisissez un autre état dans les propriétés du bouton.');
        const view=stateView(page,action.finalStateId);
        const deadline=new Promise((_,reject)=>{finalTimer=setTimeout(()=>reject(new Error('Les images de l’état cible mettent trop de temps à charger. L’affichage précédent est conservé.')),15000);});
        await Promise.race([Promise.all(stateImageSources(page,view,urls).map(src=>{const image=new Image();image.src=src;return image.decode();})),deadline]);
        if(running.current!==playback)return;
        const src=urls[resolveBackground(page,view.target)] || urls[resolveBackground(page,page.defaultBackground)];
        const wait=new Promise((resolve,reject)=>{awaitingImage.current={pageId:page.id,source:src,stateId:view.stateId,readinessId:playback.id,resolve,reject};});
        playback.staged=true;
        forPage(page).activateState(action.finalStateId,null,null,playback);
        await Promise.race([wait,deadline]);
        if(running.current!==playback)return;
        playback.committed=true;
      } else if (action.end === 'image') {
        const final = action.finalBackground || page.defaultBackground;
        const src = urls[resolveBackground(page, final)];
        if (!src) throw new Error('L’image finale est indisponible.');
        const image = new Image(); image.src = src;
        await image.decode();
        if (running.current !== playback) return;
        const wait = src === urls[resolveBackground(page, playback.base.target)] ? Promise.resolve() : new Promise((resolve, reject) => { awaitingImage.current = { pageId: page.id, source: src, resolve, reject }; });
        setSelections(previous => ({ ...previous, [page.id]: { ...previous[page.id], target: final, stateId:null } }));
        await wait;

      } else if (action.end === 'page') {
        if (!action.pageId) throw new Error('Choisissez une page de destination pour la fin de la vidéo.');
        await onNavigate?.(action.pageId, null);
      }
    } catch (error) { if (alive.current && running.current === playback) {
      setSelections(previous => ({ ...previous, [playback.page.id]: playback.base }));
      setNotice(error.message || 'Le média final ne peut pas être lu. La diapositive est conservée.');
    } }
    finally { clearTimeout(finalTimer);if (alive.current && running.current === playback) stopVideo(); }
  }
  function stopVisual(){visualRunning.current=null;setVisual(null);}
  const visualPrepared=useCallback(id=>{if(visualRunning.current?.id===id)visualRunning.current.started=true;},[]);
  function finishVisual(id,error){
    const pending=visualRunning.current;if(pending?.id!==id)return;
    const queued=pending.queued;
    if(error)setNotice(pending.scope==='background'?'L’image ou l’animation ne peut pas être préparée. L’affichage précédent est conservé.':'L’image ou l’animation ne peut pas être préparée. L’état précédent est conservé.');
    else {setSelections(previous=>({...previous,[pending.pageId]:pending.to}));if(pending.scope==='background'&&pending.group)setGroupSelections(previous=>({...previous,[pending.pageId]:{...previous[pending.pageId],[pending.group]:pending.to.buttonId}}));}
    stopVisual();
    if(queued)queued.start(error?pending.from:pending.to);
  }
  function resetAll() { frameRequest.current++;for(const v of framePlayers.current.values())v.pause();stopVisual(); stopVideo(); setGroupSelections({}); setSelections({}); setNotice(''); }
  return { ...forPage(page), forPage, video, blocked: !!visual&&visual.scope!=='background' || !!video?.action.block || !!video?.finishing, notice, finishVideo, stopVideo, resetAll };
}
