import {useEffect,useLayoutEffect,useState} from 'react';
import {TLCheck,TLNumber} from './MilestoneTimelineSettings.jsx';
import {phaseControlsPosition,setPhaseNavigation} from './timelinePhases.js';
export default function TimelinePhaseNavigationSettings({layer,patch,change}){
 const t=layer.timeline,d=t.design,[preview,setPreview]=useState(null),[automatic,setAutomatic]=useState(null);
 useLayoutEffect(()=>{setAutomatic(phaseControlsPosition(layer));},[layer]);
 useEffect(()=>{const f=e=>{if(e.detail?.layerId===layer.id)setPreview(e.detail.position);};document.addEventListener('studio-timeline-phase-controls-preview',f);return()=>document.removeEventListener('studio-timeline-phase-controls-preview',f);},[layer.id]);
 const position=preview||d.phaseNavigationPosition||automatic||{x:layer.x,y:layer.y};
 const open=enabled=>document.dispatchEvent(new CustomEvent('studio-timeline-position-phases',{detail:{layerId:layer.id,enabled}}));
 return <details className="property-section" open><summary>Phases — Général</summary>
 <TLCheck label="Afficher les boutons de navigation des phases" value={d.phaseNavigationVisible??true} change={phaseNavigationVisible=>patch({design:{...d,phaseNavigationVisible}})}/>
 <button className="ui-button" disabled={!t.phases.length} onClick={()=>open(true)}>Positionner les boutons de phases</button>
 <p className="help">Position relative à la diapositive, indépendante du zoom. Les boutons masqués sont montrés temporairement pendant leur positionnement.</p>
 {['x','y'].map(k=><TLNumber key={k} label={`Position ${k.toUpperCase()} des boutons de phases (%)`} value={Number((position[k]*100).toFixed(2))} min={0} max={100} change={v=>change(layer.id,{timeline:setPhaseNavigation(t,{...(d.phaseNavigationPosition||automatic||phaseControlsPosition(layer)),[k]:v/100})})}/>)}
 <button className="ui-button" disabled={!d.phaseNavigationPosition} onClick={()=>{change(layer.id,{timeline:setPhaseNavigation(t,null)});open(false);}}>Réinitialiser la position des boutons de phases</button>
 </details>;
}
