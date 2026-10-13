import { stateEffect } from './visualEffects.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { orderedLayers, resolveBackground } from './document.js';

// L’état de lecture est distinct du document sauvegardé, dans les deux modes.
export default function useSlideInteraction(page, { urls = {}, onNavigate } = {}) {
  const [selections, setSelections] = useState({});
  const [visual, setVisual] = useState(null);
  const visualRunning = useRef(null);
  const [video, setVideo] = useState(null);
  const [notice, setNotice] = useState('');
  const running = useRef(null);
  const awaitingImage = useRef(null);
  const backgroundReady = useCallback(result => {
    const pending = awaitingImage.current;
    if (pending?.pageId === result.pageId && pending.source === result.source) {
      awaitingImage.current = null;
      result.ready ? pending.resolve() : pending.reject(new Error('L’image finale ne peut pas être lue.'));
    }
  }, []);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; running.current = null; visualRunning.current = null; awaitingImage.current?.resolve(); }, []);
  function stopVideo() { running.current = null; visualRunning.current = null; awaitingImage.current?.resolve(); awaitingImage.current = null; setVideo(null); }
  function forPage(page) {
    const initial = page?.states?.find(state => state.id === page.initialStateId);
    const selection = page && selections[page.id];
    const target = selection?.target ?? initial?.background ?? page?.defaultBackground;
    const visibility = selection?.visibility ?? initial?.visibility ?? {};
    const activeButtonId = selection ? selection.buttonId : initial?.activeButtonId ?? null;
    const stateId = selection?.stateId === undefined ? initial?.id ?? null : selection.stateId;
    function change(update) {
      if (!page) return;
      setSelections(previous => {
        const base = previous[page.id] || { target: initial?.background ?? page.defaultBackground, visibility: { ...initial?.visibility }, buttonId: initial?.activeButtonId ?? null, stateId:initial?.id ?? null };
        return { ...previous, [page.id]: { ...base, ...update(base) } };
      });
    }
    function choose(target, buttonId = null) { if (!visualRunning.current && !running.current?.action.block) change(() => ({ target, buttonId, stateId:null })); }
    function reset() { stopVisual(); stopVideo(); setNotice(''); if (page) setSelections(previous => { const next = { ...previous }; delete next[page.id]; return next; }); }
    async function activateButton(button) {
      const action = button.action;
      if (!action || visualRunning.current || running.current?.action.block) return;
      setNotice('');
      if (action.type === 'background') { choose(action.target || page.defaultBackground, button.id); return; }
      if (action.type === 'visibility') {
        change(base => ({ buttonId: button.id, stateId:null, visibility: { ...base.visibility, ...Object.fromEntries(action.layerIds.map(id => {
          const layer = orderedLayers(page).find(item => item.id === id);
          const visible = base.visibility[id] ?? layer?.visible ?? true;
          return [id, action.mode === 'show' ? true : action.mode === 'hide' ? false : !visible];
        })) } })); return;
      }
      if (action.type === 'state') {
        const state = page.states.find(state => state.id === action.stateId);
        if (!state) { setNotice('Choisissez un état pour ce bouton.'); return; }
        activateState(state.id);
        return;
      }
      if (action.type === 'navigate') {
        if (!action.pageId) { setNotice(action.missingPageId ? 'La diapositive cible a été supprimée. Choisissez une nouvelle destination dans l’éditeur.' : 'Choisissez une page de destination.'); return; }
        stopVideo();
        try { await onNavigate?.(action.pageId, action.transitionId); } catch (error) { if (alive.current) setNotice(error.message); }
        return;
      }
      if (action.type === 'video') {
        if (running.current) return; // Garde synchrone contre les doubles clics.
        if (!urls[action.videoId]) { setNotice('Choisissez une vidéo lisible pour ce bouton.'); return; }
        const playback = { id: crypto.randomUUID(), page, action, buttonId: button.id, base: { target, visibility, buttonId: activeButtonId, stateId } };
        running.current = playback; setVideo(playback);
        change(() => ({ buttonId: button.id }));
      }
    }
    function snapshot(id) {
      const state=page.states.find(s=>s.id===id);
      return {target:state?.background || page.defaultBackground,visibility:{...state?.visibility},buttonId:state?.activeButtonId ?? null,stateId:state?.id ?? null};
    }
    function activateState(id,from=null) {
      if(visualRunning.current || running.current?.action.block)return;
      if(running.current)stopVideo(); // Une vidéo non verrouillée est interrompue avant l’effet.
      const base=from || {target,visibility,buttonId:activeButtonId,stateId};
      if(id===base.stateId)return;
      const next=snapshot(id),effect=stateEffect(page,base.stateId,id);
      if(effect.type==='none'){change(()=>next);return;}
      const playback={id:crypto.randomUUID(),pageId:page.id,from:base,to:next,effect};
      visualRunning.current=playback;setVisual(playback);setNotice('');
    }
    function previewStates(fromId,toId){if(visualRunning.current || running.current?.action.block)return;if(running.current)stopVideo();const base=snapshot(fromId);change(()=>base);activateState(toId,base);}
    return { target, activeButtonId, visibility, stateId, choose, activateButton, reset, backgroundReady,activateState,previewStates,visual:visual?.pageId===page?.id?visual:null,finishVisual };

  }
  async function finishVideo(id, error = false) {
    const playback = running.current;
    if (!playback || playback.id !== id || playback.finishing) return;
    playback.finishing = true;
    try {
      if (error) throw new Error('La vidéo ne peut pas être lue. La diapositive est conservée.');
      const { action, page } = playback;
      if (action.end === 'image') {
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
    finally { if (alive.current && running.current === playback) stopVideo(); }
  }
  function stopVisual(){visualRunning.current=null;setVisual(null);}
  function finishVisual(id,error){const pending=visualRunning.current;if(pending?.id!==id)return;if(error)setNotice('L’image ou l’animation ne peut pas être préparée. L’état précédent est conservé.');else setSelections(previous=>({...previous,[pending.pageId]:pending.to}));stopVisual();}
  function resetAll() { stopVisual(); stopVideo(); setSelections({}); setNotice(''); }
  return { ...forPage(page), forPage, video, blocked: !!visual || !!video?.action.block, notice, finishVideo, stopVideo, resetAll };
}
