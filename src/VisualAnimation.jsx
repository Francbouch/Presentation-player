import FrozenPageView from './FrozenPageView.jsx';
import { useLayoutEffect, useRef } from 'react';
import { animateViews, decodeImage } from './visualEffects.js';
import SlideView from './SlideView.jsx';

export function PageVisualAnimation({container,id,effect,ready,finish,cancel}) {
 const callback=useRef(finish);callback.current=finish;
 useLayoutEffect(()=>{
   if(!ready)return;const root=container.current;let stopped=false;
   root.classList.add('is-animating');if(effect.fullPage)root.classList.add('navigation-full-page');root.dataset.effectRunning=effect.type;
   if(effect.fullPage&&effect.type==='fade')root.style.setProperty('--navigation-fade-color',effect.fadeColor||'transparent');
   const animation=animateViews(root.querySelector('.visual-departure'),root.querySelector('.visual-arrival'),effect);
   animation.finished.then(()=>{if(!stopped)callback.current();}).catch(()=>{if(!stopped)callback.current(new Error('Animation interrompue. La vue précédente est conservée.'));});
   return()=>{stopped=true;animation.cancel();root.classList.remove('is-animating','navigation-full-page');delete root.dataset.effectRunning;root.style.removeProperty('--navigation-fade-color');};
 },[id,ready,effect,container]);
 return <button className="ui-button visual-cancel" onClick={cancel}>Annuler l’animation</button>;
}
export default function VisualPreview({playback,urls,finish,cancel,total}) {
 const container=useRef(null),callback=useRef(finish);callback.current=finish;
 useLayoutEffect(()=>{
   const root=container.current;let stopped=false,animation;
   const live=playback.liveDeparture?.closest('.editor-video-slot'),previous=live?.style.cssText;
   if(live){live.style.isolation='isolate';live.style.zIndex='0';}
   Promise.all([...root.querySelectorAll('.visual-arrival img')].map(img=>decodeImage(img))).then(()=>{
     if(stopped)return;if(playback.effect.fullPage&&playback.effect.type==='fade')root.style.setProperty('--navigation-fade-color',playback.effect.fadeColor||'transparent');root.classList.add('is-animating');root.dataset.effectRunning=playback.effect.type;
     animation=animateViews(root.querySelector('.visual-departure'),root.querySelector('.visual-arrival'),playback.liveDeparture?{...playback.effect,fullPage:false}:playback.effect);
     return animation.finished;
   }).then(()=>{if(!stopped)callback.current();}).catch(error=>{if(!stopped)callback.current(error);});
   return()=>{stopped=true;animation?.cancel();if(live)live.style.cssText=previous;};
 },[playback.id]);
 const selection=page=>({target:page.states.find(s=>s.id===page.initialStateId)?.background || page.defaultBackground,visibility:page.states.find(s=>s.id===page.initialStateId)?.visibility || {},activeButtonId:page.states.find(s=>s.id===page.initialStateId)?.activeButtonId ?? null,...((page.id===playback.fromPage.id?playback.fromView:playback.toView)||{}),visual:null,registerTimeline:undefined,registerVideo:undefined,backgroundReady:undefined,choose:()=>{},activateButton:()=>{}});
 return <div ref={container} className={`visual-preview visual-animation-container effect-${playback.effect.type} ${playback.effect.fullPage?'navigation-full-page':''} ${playback.liveDeparture?'live-video-departure':''}`}>
   <div className="visual-view-viewport"><div className="slide-slot visual-departure">{playback.liveDeparture?null:playback.departure?<FrozenPageView snapshot={playback.departure}/>:<SlideView page={playback.fromPage} urls={urls} interaction={selection(playback.fromPage)} number={playback.fromNumber} total={total} buttonEditing={{disabled:true,playbackEnabled:false}}/>}</div>
   <div className="slide-slot visual-arrival" aria-hidden="true" inert><SlideView page={playback.toPage} urls={urls} interaction={selection(playback.toPage)} number={playback.toNumber} total={total} buttonEditing={{disabled:true,playbackEnabled:false}}/></div>
   </div><button className="ui-button visual-cancel" onClick={cancel}>Annuler l’animation</button>
 </div>;
}
