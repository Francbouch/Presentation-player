import {VIDEO_LAYER_OPTIONS} from './videoLayers.js';
export default function VideoVisibilitySettings({value,change,disabled,inherited}){
 return <details className="property-section video-visibility-settings" open><summary>Visibilité pendant les vidéos</summary>{VIDEO_LAYER_OPTIONS.map(([key,label])=><label className="checkbox-field" key={key}><input type="checkbox" aria-label={label} checked={!!value?.[key]} disabled={disabled} onChange={e=>change({...value,[key]:e.target.checked})}/>{label}</label>)}{inherited&&<p className="help">Un groupe active également cette visibilité. Désactivez son option dans les propriétés du groupe pour la retirer.</p>}<p className="help">Les calques masqués restent masqués. Les boutons affichés au-dessus d’une vidéo sont temporairement non interactifs.</p></details>;
}
export function SelectionVideoVisibility({page,items,batch,changePage,disabled}){
 const group=(page.visualGroups||[]).find(g=>g.children.length===items.length&&g.children.every(id=>items.some(l=>l.id===id)));
 const value=group?.videoVisibility||Object.fromEntries(VIDEO_LAYER_OPTIONS.map(([key])=>[key,items.every(l=>!!l.videoVisibility?.[key])]));
 return <VideoVisibilitySettings value={value} disabled={disabled||items.some(l=>l.locked)} change={videoVisibility=>group?changePage(page.id,{visualGroups:page.visualGroups.map(g=>g.id===group.id?{...g,videoVisibility}:g)}):batch(Object.fromEntries(items.map(l=>[l.id,{videoVisibility:{...l.videoVisibility,...videoVisibility}}])))}/>;
}
