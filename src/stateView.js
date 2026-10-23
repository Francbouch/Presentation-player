import {initialGroupVisibility,effectiveVisibility} from './visibilityGroups.js';
import {orderedLayers,resolveBackground} from './document.js';
// Instantané commun à la sélection d’état et à la fin d’une action vidéo.
export function stateView(page,id) {
  const state=page.states.find(s=>s.id===id);
  return {target:state?.background || page.defaultBackground,visibility:effectiveVisibility(page,state?.visibility,initialGroupVisibility(page,id)),...(page.visibilityGroups?.length?{groupVisibility:initialGroupVisibility(page,id)}:{}),buttonId:state?.activeButtonId ?? null,stateId:state?.id ?? null};
}
export function stateImageSources(page,view,urls) {
  const ids=[resolveBackground(page,view.target),...orderedLayers(page).filter(layer=>view.visibility[layer.id] ?? layer.visible).flatMap(layer=>[layer.imageId,layer.frameMedia?.kind==='image'?layer.frameMedia.mediaId:null])];
  return [...new Set(ids.map(id=>urls[id]).filter(Boolean))];
}
