import TimelineTitleSettings from './TimelineTitleSettings.jsx';
import {TLCheck,TLNumber,TLSelect} from './MilestoneTimelineSettings.jsx';
import {PHASE_STATUSES,phaseTitle,phaseSize} from './timelinePhases.js';
export default function TimelinePhaseSettings({layer,phase:p,patch,change}){
 const t=layer.timeline;
 const edit=v=>patch({phases:t.phases.map(phase=>phase.id===p.id?{...phase,...v}:phase)});
 function reset(){const phases=t.phases.map(phase=>{if(phase.id!==p.id)return phase;const next={...phase};delete next.dotSize;return next;});patch({phases});}
 return <>
 <p className="help">La bulle et son statut sont visibles lorsque la phase est réduite. Le statut reste manuel, indépendant de ses étapes.</p>
 <TLSelect label={'Statut de la phase '+p.name} value={p.status??'upcoming'} options={PHASE_STATUSES} change={status=>edit({status})}/>
 <TLCheck label={'Taille personnalisée de la bulle de phase '+p.name} value={p.dotSize!==undefined} change={on=>on?edit({dotSize:phaseSize(t,p)}):reset()}/>
 {p.dotSize!==undefined&&<><TLNumber label={'Taille de la bulle de phase '+p.name+' (px)'} value={p.dotSize} min={10} max={240} change={dotSize=>edit({dotSize})}/><button className="ui-button" onClick={reset}>Réinitialiser la taille de phase {p.name}</button></>}
 <TimelineTitleSettings layer={layer} step={phaseTitle(p)} change={change}/>
 </>;
}
