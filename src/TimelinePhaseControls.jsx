import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import TimelineSlideControls from './TimelineSlideControls.jsx';
import {phaseControlsPosition,setPhaseNavigation} from './timelinePhases.js';
import {TEXT_FONTS} from './textModel.js';
const clamp=v=>Math.max(0,Math.min(1,v));
export default function TimelinePhaseControls({root,item,editing,exit,change,detached,children}){
 const element=useRef(null),drag=useRef(null),base=useRef(null),[draft,setDraft]=useState(null);
 const t=item.timeline,d=t.design,host=root?.closest('.interactive-button-layer');
 const notify=position=>globalThis.document?.dispatchEvent(new CustomEvent('studio-timeline-phase-controls-preview',{detail:{layerId:item.id,position}}));
 useEffect(()=>{if(editing){base.current=d.phaseNavigationPosition||phaseControlsPosition(item);setDraft(null);}else base.current=null;return()=>notify(null);},[editing,item.id]);
 if(!t.phases.length||(!editing&&d.phaseNavigationVisible===false))return null;
 const position=draft||d.phaseNavigationPosition||base.current||phaseControlsPosition(item);
 if((!editing&&!d.phaseNavigationPosition)||!host)return <TimelineSlideControls root={root} item={item} enabled={detached} placement="phases">{children}</TimelineSlideControls>;
 function down(e){if(!editing||e.button!==0)return;e.preventDefault();e.stopPropagation();const r=host.getBoundingClientRect();drag.current={pointer:e.pointerId,x:e.clientX,y:e.clientY,position:{...position},latest:{...position},width:r.width,height:r.height};element.current.setPointerCapture(e.pointerId);element.current.focus({preventScroll:true});}
 function move(e){const g=drag.current;if(!g||g.pointer!==e.pointerId)return;e.preventDefault();e.stopPropagation();const next={x:clamp(g.position.x+(e.clientX-g.x)/g.width),y:clamp(g.position.y+(e.clientY-g.y)/g.height)};g.latest=next;setDraft(next);notify(next);}
 function finish(e,cancel=false){const g=drag.current;if(!g||e?.pointerId!==undefined&&g.pointer!==e.pointerId)return;e?.stopPropagation();drag.current=null;if(element.current?.hasPointerCapture(g.pointer))element.current.releasePointerCapture(g.pointer);if(!cancel&&(g.latest.x!==g.position.x||g.latest.y!==g.position.y))change(item.id,{timeline:setPhaseNavigation(t,g.latest)});setDraft(null);notify(null);}
 return createPortal(<div className={'timeline-phase-controls-plane '+(editing?'editing-phase-controls':'')} data-phase-controls-owner={item.id} style={{color:d.textColor,fontFamily:TEXT_FONTS[d.font].css,fontSize:`${d.fontSize/19.2}cqw`,opacity:item.opacity??1}}>
 <div className="timeline-phase-position" style={{left:position.x*100+'%',top:position.y*100+'%',maxWidth:`${Math.max(.02,1-position.x)*100}%`}} onPointerDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()} onKeyDown={e=>{
 if(!editing)return;
 if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(drag.current)finish(null,true);else exit();return;}
 if((e.ctrlKey||e.metaKey)&&['z','y'].includes(e.key.toLowerCase())){if(drag.current)finish(null,true);return;}
 if(['Delete','Backspace'].includes(e.key)){e.preventDefault();e.stopPropagation();return;}
 if(e.target.closest('input,textarea,select')||e.ctrlKey||e.metaKey||e.altKey)return;
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();e.stopPropagation();const n=e.shiftKey?10:1;change(item.id,{timeline:setPhaseNavigation(t,{x:clamp(position.x+(e.key==='ArrowLeft'?-n:e.key==='ArrowRight'?n:0)/1920),y:clamp(position.y+(e.key==='ArrowUp'?-n:e.key==='ArrowDown'?n:0)/1080)})});}
 }}>
 {editing&&<div className="phase-controls-edit-bar" style={position.y<.06?{top:'100%',bottom:'auto'}:{}}><button type="button" className="phase-controls-drag" aria-label="Déplacer les boutons de phases" ref={element} onPointerDown={down} onPointerMove={move} onPointerUp={finish} onPointerCancel={e=>finish(e,true)} onLostPointerCapture={e=>finish(e,true)}>↔ Déplacer les boutons de phases</button><button type="button" onClick={exit}>Terminer le positionnement des boutons de phases</button></div>}
 {children}
 </div></div>,host);
}
