import YouTubeSettings from './YouTubeSettings.jsx';
import {youtubeAspectPatch} from './youtubeModel.js';
import {isTimelineLayer, timelineFramePatch} from "./milestoneTimeline.js";
import MilestoneTimelineSettings from './MilestoneTimelineSettings.jsx';
import VideoVisibilitySettings from './VideoVisibilitySettings.jsx';
import {videoLayerFlags} from './videoLayers.js';
import ColorInput from './ProjectColors.jsx';
import ObjectEffectsSettings from './ObjectEffectsSettings.jsx';
import LineSettings from './LineSettings.jsx';
import FrameSettings from './FrameSettings.jsx';
import {ChooseImage} from './MediaLibrary.jsx';
import ButtonStateVisibility from './ButtonStateVisibility.jsx';
import { clamp, MIN_BUTTON_SIZE, orderedLayers } from './document.js';
import TextSettings from './TextSettings.jsx';

export function LayerToolbar({ disabled, add, importImage, undo, redo, canUndo, canRedo }) {
  return <div className="layer-toolbar button-row" role="toolbar" aria-label="Ajouter des calques">
    <button className="ui-button" disabled={disabled} onClick={importImage}>+ Image</button>
    <button className="ui-button" disabled={disabled} onClick={() => add('text')}>+ Texte</button>
    <button className="ui-button" disabled={disabled} onClick={() => add('rectangle')}>+ Rectangle</button>
    <button className="ui-button" disabled={disabled} onClick={() => add('circle')}>+ Cercle</button>
    <button className="ui-button" disabled={disabled} onClick={() => add('line')}>+ Ligne</button>
    <button className="ui-button" disabled={disabled} onClick={() => add('button')}>+ Bouton</button>
    <span className="toolbar-spacer" />
    <button className="ui-button" disabled={disabled || !canUndo} title="Annuler (Ctrl+Z / Cmd+Z)" onClick={undo}>↶ Annuler</button>
    <button className="ui-button" disabled={disabled || !canRedo} title="Rétablir (Ctrl+Y / Ctrl+Maj+Z / Cmd+Maj+Z)" onClick={redo}>↷ Rétablir</button>
  </div>;
}

export function LayerPanel({page,selectedId,selectedIds=[],onGroup,onSelect,change,disabled,move,rename}) {
  const layers=orderedLayers(page).reverse(),groups=page.visualGroups||[],rendered=new Set();
  function row(layer){const active=selectedIds.includes(layer.id)||selectedId===layer.id;return <li draggable={!disabled&&!layer.locked} onDragStart={event=>event.dataTransfer.setData('application/studio-layer',layer.id)} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();event.stopPropagation();const id=event.dataTransfer.getData('application/studio-layer');if(layer.locked||orderedLayers(page).find(l=>l.id===id)?.locked)return;if(id)move?.(id,layer.id);}} key={layer.id} className={active?'selected':''}><button className="layer-select" disabled={disabled} aria-pressed={active} aria-label={`Sélectionner le calque ${layer.name}`} onDoubleClick={()=>rename?.(layer.id)} onClick={event=>onSelect(layer.id,event)}><span aria-hidden="true">{({image:'▧',text:'T',button:'▣',circle:'○',rectangle:'□',line:'╱',vectorLine:'╱',milestoneTimeline:'⏱',youtube:'▶'})[layer.type]}</span><span>{layer.name||'Sans nom'}{Object.values(videoLayerFlags(page,layer.id)).some(Boolean)&&<small className="video-layer-badge" title="Calque visible au-dessus de certaines vidéos" aria-label="Visibilité vidéo activée"> ▷</small>}</span></button><button disabled={disabled} aria-label={`${layer.visible?'Masquer':'Afficher'} le calque ${layer.name}`} title={layer.visible?'Masquer':'Afficher'} onClick={()=>change(layer.id,{visible:!layer.visible})}>{layer.visible?'◉':'○'}</button><button disabled={disabled||layer.folderLocked} aria-label={`${layer.locked?'Déverrouiller':'Verrouiller'} le calque ${layer.name}`} title={layer.locked?'Déverrouiller':'Verrouiller'} onClick={()=>change(layer.id,{locked:!layer.locked})}>{layer.locked?'🔒':'🔓'}</button></li>;}
  return <details className="layers-panel" open><summary>Calques <span>{layers.length}</span></summary><p className="help">Le premier élément de la liste est au premier plan. Maj + clic pour une sélection multiple.</p><ol className="layer-list">{layers.map(layer=>{const group=groups.find(g=>g.children.includes(layer.id));if(!group)return row(layer);if(rendered.has(group.id))return null;rendered.add(group.id);return <li className="visual-group-list" key={group.id}><details open><summary><button className="ui-button" disabled={disabled} onClick={event=>onGroup(group.children,event)}>▱ {group.name}</button></summary><ol className="layer-list group-children">{layers.filter(l=>group.children.includes(l.id)).map(row)}</ol></details></li>;})}</ol>{!layers.length&&<p className="help">Ajoutez un élément avec la barre d’outils à gauche de l’aperçu.</p>}</details>;
}

export function LayerProperties({ layer, change, duplicate, remove, reorder, importImage, media, busy, children, page, applyStateVisibility, importFrame, importTimelineMedia, adjusting, onAdjust, youtubeInteracting, setYoutubeInteracting, videoInteracting, setVideoInteracting }) {
  if (!layer) return <details className="layer-properties settings-panel" open><summary>Propriétés du calque</summary><p className="help">Cliquez sur un élément de l’aperçu ou du panneau Calques.</p></details>;
  function numeric(key, value) {
    if (value === '' || !Number.isFinite(Number(value))) return;
    const number = Number(value) / 100;
    if(isTimelineLayer(layer)){change(layer.id,timelineFramePatch(layer,{[key]:number}));return;}
    const max = key === 'x' ? 1 - layer.width : key === 'y' ? 1 - layer.height : key === 'width' ? 1 - layer.x : 1 - layer.y;
    change(layer.id,youtubeAspectPatch(layer,{[key]:clamp(number,['width','height'].includes(key)?MIN_BUTTON_SIZE:0,max)}));
  }
  return <details className="layer-properties settings-panel" open><summary>Propriétés du calque</summary><fieldset className="layer-property-fields" disabled={layer.locked}>{layer.locked&&<legend><label className="checkbox-field"><input type="checkbox" checked disabled={busy||layer.folderLocked} onChange={()=>change(layer.id,{locked:false})}/>Verrouiller le déplacement</label></legend>}
    <label className="field">Nom du calque<input aria-label="Nom du calque" maxLength={80} disabled={busy} value={layer.name} onChange={event => change(layer.id, { name: event.target.value })} /></label>
    {(layer.type==='text'||layer.type==='button')&&<button className="ui-button" disabled={busy||layer.locked||layer.nameMode==='auto'} onClick={()=>change(layer.id,{nameMode:'auto'})}>Réactiver le nom automatique</button>}
    <VideoVisibilitySettings value={layer.videoVisibility} disabled={busy||layer.locked} inherited={page.visualGroups?.some(g=>g.children.includes(layer.id)&&(g.videoVisibility?.page||g.videoVisibility?.action))} change={videoVisibility=>change(layer.id,{videoVisibility})}/>
    <ObjectEffectsSettings item={layer} change={change} busy={busy||layer.locked}/>{children}
    {layer.type==='youtube'&&<YouTubeSettings layer={layer} change={change} busy={busy} interacting={youtubeInteracting} setInteracting={setYoutubeInteracting}/>}
    {layer.type === 'text' && <details className="property-section" open><summary>Texte</summary><TextSettings item={layer} change={change} busy={busy} /></details>}
    {layer.type==='milestoneTimeline'&&<MilestoneTimelineSettings layer={layer} change={change} busy={busy||layer.locked} media={media} importMedia={importTimelineMedia}/>}
    {layer.type==='vectorLine'&&<LineSettings layer={layer} change={change} busy={busy}/>}
    {layer.type!=='vectorLine'&&<details className="property-section" open><summary>Position et dimensions</summary><div className="layer-coordinates">{[['x', 'X'], ['y', 'Y'], ['width', 'Largeur'], ['height', 'Hauteur']].map(([key, label]) => <label className="field" key={key}>{label} (%)<input aria-label={`${label} du calque (%)`} type="number" step="0.1" disabled={busy || layer.locked} value={Number((layer[key] * 100).toFixed(2))} onChange={event => numeric(key, event.target.value)} /></label>)}</div>
    <label className="field">Rotation (°)<input aria-label="Rotation du calque" type="number" min="-360" max="360" step="1" value={Math.round(layer.rotation * 10) / 10} disabled={busy || layer.locked} onChange={event => { if (event.target.value !== '') change(layer.id, { rotation: clamp(Number(event.target.value), -360, 360) }); }} /></label>
    <label className="field">Opacité : {Math.round(layer.opacity * 100)} %<input aria-label="Opacité du calque" type="range" min="0" max="100" value={Math.round(layer.opacity * 100)} disabled={busy} onChange={event => change(layer.id, { opacity: Number(event.target.value) / 100 })} /></label>
    </details>}<details className="property-section" open><summary>Visibilité</summary><label className="checkbox-field"><input type="checkbox" checked={layer.visible} disabled={busy} onChange={event => change(layer.id, { visible: event.target.checked })} />Calque visible</label>
    {layer.type === 'button' && <ButtonStateVisibility key={layer.id} page={page} button={layer} busy={busy} change={change} apply={applyStateVisibility} />}
    {!layer.locked&&<label className="checkbox-field"><input type="checkbox" checked={layer.locked} disabled={busy} onChange={event => change(layer.id, { locked: event.target.checked })} />Verrouiller le déplacement</label>}
    </details>{['rectangle', 'circle', 'line'].includes(layer.type) && <label className="field">Couleur<ColorInput aria-label="Couleur du calque" type="color" colorPath="color" disabled={busy} value={layer.color} onChange={event => change(layer.id, { color: event.target.value })} /></label>}
    {['circle','rectangle','line','image'].includes(layer.type)&&<FrameSettings interacting={videoInteracting} setInteracting={setVideoInteracting} layer={layer} media={media} change={change} busy={busy} importFrame={importFrame} adjusting={adjusting} onAdjust={onAdjust}/>}
    {layer.type === 'image' && <><ChooseImage disabled={busy} onChoose={id=>change(layer.id,{imageId:id})}/><label className="field">Réutiliser une image du projet<select aria-label="Image du calque" disabled={busy} value={layer.imageId || ''} onChange={event => change(layer.id, { imageId: event.target.value || null })}><option value="">Aucune image</option>{media.filter(item => item.type.startsWith('image/')).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className="ui-button" disabled={busy} onClick={() => importImage(layer.id)}>Remplacer l’image du calque</button></>}
    {layer.type === 'button' && <button className="ui-button" onClick={() => window.document.getElementById('button-settings')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Configurer l’image et l’arrière-plan du bouton</button>}
    <div className="layer-order-actions button-row">{[['front', 'Premier plan'], ['up', 'Monter le calque'], ['down', 'Descendre le calque'], ['back', 'Arrière-plan']].map(([action, label]) => <button className="ui-button" key={action} disabled={busy} onClick={() => reorder(layer.id, action)}>{label}</button>)}</div>
    <div className="button-row"><button className="ui-button" disabled={busy} onClick={() => duplicate(layer)}>Dupliquer le calque</button><button className="ui-button danger" disabled={busy} onClick={() => remove(layer)}>Supprimer le calque</button></div>
    <p className="help">Le cadre, la rotation et l’opacité sont identiques dans le lecteur.</p>
  </fieldset></details>;
}
