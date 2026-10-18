import {orderedLayers,resolveBackground} from './document.js';
// Instantané commun à la sélection d’état et à la fin d’une action vidéo.
export function stateView(page,id) {
  const state=page.states.find(s=>s.id===id);
  return {target:state?.background || page.defaultBackground,visibility:{...state?.visibility},buttonId:state?.activeButtonId ?? null,stateId:state?.id ?? null};
}
export function stateImageSources(page,view,urls) {
  const ids=[resolveBackground(page,view.target),...orderedLayers(page).filter(layer=>view.visibility[layer.id] ?? layer.visible).map(layer=>layer.imageId)];
  return [...new Set(ids.map(id=>urls[id]).filter(Boolean))];
}
