import {validTitleOffset} from './timelineTitlePosition.js';
export const PHASE_STATUSES={upcoming:'À venir',current:'En cours',done:'Terminé'};
export const phaseTitle = p => ({...p,id:'phase:'+p.id,summary:true,phase:p});
export function timelineTitleNode(t,id){return id?.startsWith('phase:')?phaseTitleOrNull(t.phases.find(p=>p.id===id.slice(6))):t.steps.find(s=>s.id===id);}
function phaseTitleOrNull(p){return p?phaseTitle(p):null;}
export const phaseSize=(t,p)=>p.dotSize??t.design.phaseDotSize??t.design.dotSize;
export const zoomVertical=(t,stepId)=>t.steps.find(s=>s.id===stepId)?.zoomVerticalPosition??t.design.zoomVerticalPosition??50;
export function validPhasePosition(p){return !!p&&!Array.isArray(p)&&['x','y'].every(k=>Number.isFinite(p[k])&&p[k]>=0&&p[k]<=1);}
export function validatePhaseSettings(t,fail){
 const percent=v=>Number.isFinite(v)&&v>=0&&v<=100,size=v=>Number.isFinite(v)&&v>=10&&v<=240;
 for(const p of t.phases){
  if(p.status!==undefined&&!Object.hasOwn(PHASE_STATUSES,p.status))fail();
  if(p.dotSize!==undefined&&!size(p.dotSize))fail();
  if(p.titleOffset!==undefined&&!validTitleOffset(p.titleOffset))fail();
 }
 for(const s of t.steps)if(s.zoomVerticalPosition!==undefined&&!percent(s.zoomVerticalPosition))fail();
 const d=t.design;
 if(d.phaseDotSize!==undefined&&!size(d.phaseDotSize))fail();
 if(d.zoomVerticalPosition!==undefined&&!percent(d.zoomVerticalPosition))fail();
 if(d.phaseNavigationVisible!==undefined&&typeof d.phaseNavigationVisible!=='boolean')fail();
 if(d.phaseNavigationPosition!==undefined&&!validPhasePosition(d.phaseNavigationPosition))fail();
}
export function phaseControlsElement(layerId){
 const doc=globalThis.document;if(!doc)return null;
 const portal=[...doc.querySelectorAll('[data-phase-controls-owner]')].find(e=>e.dataset.phaseControlsOwner===layerId);
 if(portal)return portal.querySelector('.milestone-phases');
 const frame=[...doc.querySelectorAll('.editor-preview [data-layer-id]')].find(e=>e.dataset.layerId===layerId);
 return frame?.querySelector('.milestone-phases')||null;
}
export function phaseControlsPosition(layer){
 const element=phaseControlsElement(layer.id),host=element?.closest('.interactive-button-layer');
 if(element&&host){const a=element.getBoundingClientRect(),b=host.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(a.left-b.left)/b.width)),y:Math.max(0,Math.min(1,(a.top-b.top)/b.height))};}
 return {x:Math.max(0,Math.min(1,layer.x)),y:Math.max(0,Math.min(1,layer.y))};
}
export function setPhaseNavigation(t,position){const design={...t.design};if(position===null)delete design.phaseNavigationPosition;else design.phaseNavigationPosition={...design.phaseNavigationPosition,...position};return {...t,design};}
