import {createPortal} from 'react-dom';
import { PageVisualAnimation } from './VisualAnimation.jsx';
import { passage, transitionVideo } from './timeline.js';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import SlideView from './SlideView.jsx';
import useSlideInteraction from './useSlideInteraction.js';
import { resolveBackground } from './document.js';
import ActionVideo from './ActionVideo.jsx';
import {captureVideoLayers} from './videoLayers.js';

export default function Player({ document: presentation, pages, urls, startIndex = 0, onExit, autoFullscreen = false, onBusyChange, controls, onPageChange, presenterTarget, eventWindow = window }) {
  const [index, setIndex] = useState(Math.min(startIndex, pages.length - 1));
  const [transition, setTransition] = useState(null);
  const [notice, setNotice] = useState('');
  const stage = useRef(null);
  const video = useRef(null);
  const busy = useRef(false);
  const sequence = useRef(0);
  const pendingJump = useRef(null);
  const current = pages[index];
  useEffect(()=>{onPageChange?.(index);},[index,onPageChange]);
  const interaction = useSlideInteraction(current, { urls, onNavigate: goTo });
  useEffect(() => () => { pendingJump.current?.reject(new Error('Présentation terminée.')); pendingJump.current = null; }, []);

  function pageSource(page) {
    if (!page) return undefined;
    return urls[resolveBackground(page, interaction.forPage(page).target)] || urls[resolveBackground(page, page.defaultBackground)];
  }
  const previousSource = pageSource(pages[index - 1]);
  const nextSource = pageSource(pages[index + 1]);

  useEffect(() => {
    // Précharger dès l’arrivée sur la page, donc avant le début/la fin du MP4.
    const images = [...new Set([previousSource, nextSource].filter(Boolean))].map(source => {
      const image = new Image();
      image.src = source;
      image.decode().catch(() => {}); // Une erreur sera signalée par la page montée.
      return image;
    });
    return () => images.forEach(image => { image.src = ''; });
  }, [previousSource, nextSource]);

  useEffect(() => { onBusyChange(!!transition || interaction.blocked); }, [transition, interaction.blocked, onBusyChange]);

  const cancelTransition = useCallback(reason => {
    pendingJump.current?.reject(new Error(typeof reason === 'string' ? reason : 'Navigation annulée : la page actuelle est conservée.'));
    pendingJump.current = null;
    setTransition(null);
    busy.current = false;
  }, []);

  useLayoutEffect(() => {
    if (!transition?.videoDone) return;
    if (transition.imageError) {
      setNotice('L’image suivante ne peut pas être lue. La page actuelle est conservée ; remplacez cette image dans l’éditeur.');
      cancelTransition('L’image suivante ne peut pas être lue. La page actuelle est conservée ; remplacez cette image dans l’éditeur.');
    } else if (transition.imageReady && (!transition.effect || transition.visualDone)) {
      // Une seule mise à jour avant peinture : promouvoir la page déjà décodée,
      // conserver son élément <img>, puis retirer la vidéo dans le même commit.
      setIndex(transition.target);
      setTransition(null);
      busy.current = false;
      pendingJump.current?.resolve();
      pendingJump.current = null;
    }
  }, [transition, cancelTransition]);

  useEffect(()=>{if(!transition || transition.imageReady)return;const timer=setTimeout(()=>{setNotice('L’image suivante met trop de temps à charger. La page actuelle est conservée.');cancelTransition();},15000);return()=>clearTimeout(timer);},[transition?.id,transition?.imageReady,cancelTransition]);
  const destinationReady = useCallback(result => {
    setTransition(pending => {
      if (!pending || pending.pageId !== result.pageId || pending.imageReady || pending.imageError) return pending;
      return { ...pending, imageReady: result.ready, imageError: !result.ready };
    });
  }, []);

  function navigate(direction) {
    if (busy.current || interaction.blocked) return;
    const target = index + direction;
    if (target < 0 || target >= pages.length) return;
    interaction.stopVideo();
    goTo(pages[target].id, direction > 0 ? transitionVideo(presentation, current.id, pages[target].id) : null, direction > 0 && passage(presentation,current.id,pages[target].id)?.mode==='visual' ? passage(presentation,current.id,pages[target].id).effect : null).catch(error => setNotice(error.message));
  }
  function goTo(pageId, transitionId = null, effect=null) {
    const target = pages.findIndex(page => page.id === pageId);
    if (target < 0) return Promise.reject(new Error('Cette page de destination n’existe plus.'));
    if (target === index) return Promise.resolve();
    if (busy.current) return Promise.reject(new Error('Une navigation est déjà en cours.'));
    busy.current = true; setNotice('');
    const src = urls[transitionId];
    if(src || effect?.type==='none')effect=null;
    setTransition({ id: ++sequence.current, target, pageId, src, effect, videoLayers:src?captureVideoLayers(current,interaction.forPage(current),'page'):null, visualDone:false, videoDone: !src, frameReady: false, imageReady: false, imageError: false });
    return new Promise((resolve, reject) => { pendingJump.current = { resolve, reject }; });
  }

  const videoFinished = useCallback(id => {
    setTransition(pending => pending?.id === id && !pending.videoDone ? { ...pending, videoDone: true } : pending);
  }, []);

  const frameReady = useCallback(id => {
    setTransition(pending => pending?.id === id && !pending.frameReady ? { ...pending, frameReady: true } : pending);
  }, []);

  const fullscreen = useCallback(async () => {
    if (busy.current || interaction.blocked) return;
    try {
      if (stage.current.ownerDocument.fullscreenElement) await stage.current.ownerDocument.exitFullscreen();
      else if (stage.current.requestFullscreen) await stage.current.requestFullscreen();
      else setNotice('Le plein écran n’est pas disponible dans ce navigateur.');
    } catch { setNotice('Cliquez sur le bouton ⛶ pour activer le plein écran.'); }
  }, [interaction.blocked]);

  useEffect(() => {
    if (autoFullscreen) fullscreen();
    return () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  }, []);

  useEffect(() => {
    const onKey = event => {
      if (event.target.closest('input, textarea, select, [contenteditable="true"]') || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      if (event.code === 'Space' && event.target.closest('button')) return;
      if (event.code === 'Space' || event.code === 'ArrowRight') { event.preventDefault(); navigate(1); }
      if (event.code === 'ArrowLeft') { event.preventDefault(); navigate(-1); }
      if (event.key.toLowerCase() === 'f') { event.preventDefault(); fullscreen(); }
    };
    eventWindow.addEventListener('keydown', onKey);
    return () => eventWindow.removeEventListener('keydown', onKey);
  });

  const transitionId = transition?.id;
  const videoSource = transition?.src;
  useEffect(() => {
    if (!videoSource) return;
    const element = video.current;
    let frameCallback;
    // Ne pas exposer un élément vidéo sans première image décodée.
    if (element.requestVideoFrameCallback) frameCallback = element.requestVideoFrameCallback(() => frameReady(transitionId));
    element.play()?.catch(() => videoFinished(transitionId));
    let lastTime = element.currentTime;
    let stuckSince = Date.now();
    const timer = setInterval(() => {
      if (element.ended) return; // Garder la dernière image pendant le décodage.
      if (element.currentTime !== lastTime) { lastTime = element.currentTime; stuckSince = Date.now(); }
      if (Date.now() - stuckSince > 8000) { element.pause(); videoFinished(transitionId); }
    }, 1000);
    return () => {
      clearInterval(timer);
      if (frameCallback !== undefined) element.cancelVideoFrameCallback(frameCallback);
    };
  }, [transitionId, videoSource, frameReady, videoFinished]);

  if(controls)controls.current={navigate,fullscreen};
  const slots = transition ? [index, transition.target] : [index];
  const waitingForImage = transition?.videoDone && !transition.imageReady && !transition.imageError;

  return <div className="presentation-mode">
    {presenterTarget && createPortal(<SlideView page={current} urls={urls} interaction={{...interaction.forPage(current),visual:null,backgroundReady:undefined,registerVideo:undefined,finishVisual:undefined}} number={index+1} total={pages.length} buttonEditing={{playbackEnabled:false,disabled:false}}/>,presenterTarget)}
    <section className="intro"><div><span className="eyebrow">VOTRE SCÈNE, VOS IDÉES</span><h1>La présentation, autrement.</h1></div><button className="ui-button" onClick={onExit} disabled={!!transition || interaction.blocked}>← Revenir à l’éditeur</button></section>
    <section className="player" aria-label="Lecteur de présentation">
      <div className={`stage ${transition?.effect?`visual-animation-container effect-${transition.effect.type}`:''}`} ref={stage}>
        <div className="visual-view-viewport">{slots.map(slotIndex => {
          const page = pages[slotIndex];
          const active = slotIndex === index;
          const selection = interaction.forPage(page);
          const safeInteraction = {
            ...selection,
            choose: (...args) => { if (!busy.current) selection.choose(...args); },
            activateButton: button => { if (!busy.current) selection.activateButton(button); },
          };
          return <div key={page.id} className={`slide-slot ${active ? 'is-current visual-departure' : `is-preparing ${transition.effect?'visual-arrival':''}`}`} aria-hidden={!active} inert={!active ? true : undefined}>
            <SlideView videoLayers={active?(transition?.videoLayers||interaction.video?.videoLayers):null} videoSurface={active && videoSource ? <video key={transitionId} className="transition-video" style={{ visibility: transition.frameReady ? 'visible' : 'hidden' }} ref={video} src={videoSource} muted playsInline preload="auto" onLoadedData={event => { if (!event.currentTarget.requestVideoFrameCallback) frameReady(transitionId); }} onEnded={() => videoFinished(transitionId)} onError={() => videoFinished(transitionId)} /> : active && interaction.video?.page.id===page.id ? <ActionVideo key={interaction.video.id} playback={interaction.video} urls={urls} finish={interaction.finishVideo} stop={interaction.stopVideo} /> : null} page={page} urls={urls} interaction={safeInteraction} number={slotIndex + 1} total={pages.length} buttonEditing={{ playbackEnabled:active&&!transition, disabled: !!transition || interaction.blocked }} onBackgroundReady={active ? undefined : destinationReady} />
          </div>;
        })}</div>
        {transition?.effect && <PageVisualAnimation container={stage} id={transition.id} effect={transition.effect} ready={transition.imageReady} finish={error=>error?cancelTransition(error.message):setTransition(p=>p?.id===transition.id?{...p,visualDone:true}:p)} cancel={cancelTransition}/>}
        {waitingForImage && <div className="image-preparation" role="status">Préparation de l’image suivante… <button onClick={cancelTransition}>Annuler</button></div>}
        <button className="fullscreen-button" disabled={!!transition || interaction.blocked} onClick={fullscreen} aria-label="Activer ou quitter le plein écran">⛶</button>
        <button className="exit-fullscreen" disabled={!!transition || interaction.blocked} onClick={onExit}>Quitter la présentation</button>
      </div>
      <div className="toolbar"><div className="slide-info"><span className="live-dot" />{current.title}</div><nav aria-label="Navigation des diapositives"><button aria-label="Diapositive précédente" disabled={index === 0 || !!transition || interaction.blocked} onClick={() => navigate(-1)}>←</button><span aria-live="polite">{String(index + 1).padStart(2, '0')} <span className="muted">/ {String(pages.length).padStart(2, '0')}</span></span><button aria-label="Diapositive suivante" disabled={index === pages.length - 1 || !!transition || interaction.blocked} onClick={() => navigate(1)}>→</button></nav></div>
    </section>
    <div className="below"><span><i className="live-dot" /> Présentation interactive</span><div className="shortcuts"><span><kbd>Espace</kbd> Suivante</span><span><kbd>←</kbd> Précédente</span><span><kbd>F</kbd> Plein écran</span></div></div>
    {notice && <p role="status">{notice}</p>}
    {interaction.notice && <p role="status">{interaction.notice}</p>}
  </div>;
}
