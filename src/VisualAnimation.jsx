import { useLayoutEffect, useRef } from 'react';
import { animateViews, decodeImage } from './visualEffects.js';
import SlideView from './SlideView.jsx';

export function PageVisualAnimation({container,id,effect,ready,finish,cancel}) {
 const callback=useRef(finish);callback.current=finish;
 useLayoutEffect(()=>{
   if(!ready)return;const root=container.current;let stopped=false;
   root.classList.add('is-animating');root.dataset.effectRunning=effect.type;
   const animation=animateViews(root.querySelector('.visual-departure'),root.querySelector('.visual-arrival'),effect);
   animation.finished.then(()=>{if(!stopped)callback.current();}).catch(()=>{if(!stopped)callback.current(new Error('Animation interrompue. La vue précédente est conservée.'));});
   return()=>{stopped=true;animation.cancel();root.classList.remove('is-animating');delete root.dataset.effectRunning;};
 },[id,ready,effect,container]);
 return <button className="ui-button visual-cancel" onClick={cancel}>Annuler l’animation</button>;
}
export default function VisualPreview({playback,urls,finish,cancel,total}) {
 const container=useRef(null),callback=useRef(finish);callback.current=finish;
 useLayoutEffect(()=>{
   const root=container.current;let stopped=false,animation;
   Promise.all([...root.querySelectorAll('.visual-arrival img')].map(img=>decodeImage(img))).then(()=>{
     if(stopped)return;root.classList.add('is-animating');root.dataset.effectRunning=playback.effect.type;
     animation=animateViews(root.querySelector('.visual-departure'),root.querySelector('.visual-arrival'),playback.effect);
     return animation.finished;
   }).then(()=>{if(!stopped)callback.current();}).catch(error=>{if(!stopped)callback.current(error);});
   return()=>{stopped=true;animation?.cancel();};
 },[playback.id]);
 const selection=page=>({target:page.states.find(s=>s.id===page.initialStateId)?.background || page.defaultBackground,visibility:page.states.find(s=>s.id===page.initialStateId)?.visibility || {},activeButtonId:page.states.find(s=>s.id===page.initialStateId)?.activeButtonId ?? null,choose:()=>{},activateButton:()=>{}});
 return <div ref={container} className={`visual-preview visual-animation-container effect-${playback.effect.type}`}>
   <div className="slide-slot visual-departure"><SlideView page={playback.fromPage} urls={urls} interaction={selection(playback.fromPage)} number={playback.fromNumber} total={total} buttonEditing={{disabled:true}}/></div>
   <div className="slide-slot visual-arrival" aria-hidden="true" inert><SlideView page={playback.toPage} urls={urls} interaction={selection(playback.toPage)} number={playback.toNumber} total={total} buttonEditing={{disabled:true}}/></div>
   <button className="ui-button visual-cancel" onClick={cancel}>Annuler l’animation</button>
 </div>;
}
