import NotesPanel from './NotesPanel.jsx';
import {createPortal} from 'react-dom';
import {ToolbarOverflow,ToolbarNotifications} from './CompactToolbar.jsx';
import StateManager from './StateManager.jsx';
import InteractionMap from './InteractionMap.jsx';
import {ProjectColorsProvider} from './ProjectColors.jsx';
import {detachChangedColors,recentColorsPatch} from './projectColors.js';
import PropertyClipboardSettings from './PropertyClipboardSettings.jsx';
import ProjectStylesSettings from './ProjectStylesSettings.jsx';
import {markStyleChanges} from './projectStyles.js';
import LayerFolders from './LayerFolders.jsx';
import {translated} from './manipulation.js';
import {frameCrop,framePlayback} from './mediaFrames.js';
import {existingImage} from './imageLibrary.js';
import ComponentLibrary from './ComponentLibrary.jsx';
import {createComponent,insertComponent,publishComponent,markOverrides,markBatchOverrides,resetInstance,detachInstance} from './componentsModel.js';
import SelectionTools from './SelectionTools.jsx';
import {patchLayers,cleanGroups,copySelection} from './visualGroups.js';
import MediaLibrary, {ImagePickerProvider,ChooseImage} from './MediaLibrary.jsx';
import {CropSettings} from './ImageCrop.jsx';
import {defaultCrop} from './imageLibrary.js';
import { applyButtonStateVisibility } from './stateVisibility.js';
import FileMenu from './FileMenu.jsx';
import {FitCanvas,Icon,ResizeHandle,useWorkspace} from './Workspace.jsx';
import {pasteLayer} from './layerClipboard.js';
import TextSettings from './TextSettings.jsx';
import {buttonTextItem} from './buttonText.js';
import ButtonAppearanceSettings from './ButtonAppearanceSettings.jsx';
import VisualPreview from './VisualAnimation.jsx';
import { EFFECTS, defaultEffect, decodeImage } from './visualEffects.js';
import Timeline from './Timeline.jsx';
import { passage, transitionVideo } from './timeline.js';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { clamp, createInteractiveButton, createLayer, duplicatePageModel, emptyPage, orderedLayers, readMedia, resolveBackground, uid } from './document.js';
import { LayerPanel, LayerProperties } from './LayerSettings.jsx';
import { exportPresentation, importPresentation } from './archive.js';
import { markBackupExport, requestPersistentStorage, storageEstimate } from './storage.js';
import SlideView from './SlideView.jsx';
import ButtonSettings, {PageBackgroundSettings} from './ButtonSettings.jsx';
import useSlideInteraction from './useSlideInteraction.js';
import ActionSettings, { StateSettings } from './ActionSettings.jsx';
import ActionVideo from './ActionVideo.jsx';

function componentPropertyName(path){const labels={backgroundEffect:'Transition du fond d’écran',appearance:'Apparence',interactiveEffects:'Effets interactifs',indicator:'Coche',imageId:'Image',imageCrop:'Cadrage',labelText:'Texte du bouton',content:'Texte',textStyle:'Typographie',color:'Couleur',opacity:'Opacité',x:'Position horizontale',y:'Position verticale',width:'Largeur',height:'Hauteur',rotation:'Rotation','appearance.background':'Fond du bouton','appearance.border':'Couleur de bordure','appearance.borderWidth':'Épaisseur de bordure','appearance.radius':'Coins arrondis','appearance.backgroundOpacity':'Opacité du fond'};return labels[path]||labels[path.split('.')[0]]||'Propriété personnalisée';}

function Confirmation({ action, onClose }) {
  const dialog = useRef(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { dialog.current.showModal(); }, []);
  async function confirm(backup = false, secondary = false) {
    setWorking(true); setError('');
    try { if (backup) await action.backup(); await (secondary?action.secondaryRun:action.run)(); onClose(); }
    catch (error) { setError(error.message); }
    finally { setWorking(false); }
  }
  return <dialog ref={dialog} className="confirmation" onCancel={event => { event.preventDefault(); if (!working) onClose(); }} aria-labelledby="confirmation-title">
    <h2 id="confirmation-title">{action.title}</h2><p>{action.message}</p>
    {error && <p role="alert">{error}</p>}
    <div className="button-row"><button className="ui-button" disabled={working} autoFocus onClick={onClose}>Annuler</button>{action.backup && <button className="ui-button" disabled={working} onClick={() => confirm(true)}>Sauvegarder mon projet puis continuer</button>}{action.secondaryRun&&<button className="ui-button" disabled={working} onClick={()=>confirm(false,true)}>{action.secondaryLabel}</button>}<button className="ui-button primary" disabled={working} onClick={() => confirm()}>Confirmer</button></div>
  </dialog>;
}

export default function Editor({ chrome, beginGesture, endGesture, document, urls, update:rawUpdate, commitMedia, replace, recoverPrevious, hasPrevious, lastBackup, onBackup, selected, selectedIndex, onSelect, onLaunch, estimate, undo, redo, canUndo, canRedo, onBusyChange }) {
  const [notesOpen,setNotesOpen]=useState(false);
  const [layout,changeLayout]=useWorkspace();
  const [toolsTarget,setToolsTarget]=useState(null);
  const [zoomTarget,setZoomTarget]=useState(null);
  const [graphOpen,setGraphOpen]=useState(false);
  const [statesOpen,setStatesOpen]=useState(false);
  const graphTarget=useRef(null);
  const [cropId,setCropId]=useState(null);
  const [drawingTool,setDrawingTool]=useState('');
  const nudgeTimer=useRef(null);
  useEffect(()=>()=>{clearTimeout(nudgeTimer.current);endGesture();},[]);
  const [copiedCrop,setCopiedCrop]=useState(null);
  useEffect(()=>{setCropId(null);},[selected?.id]);
  useEffect(()=>{if(!cropId)return;function escape(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setCropId(null);endGesture();}}window.addEventListener('keydown',escape,true);return()=>window.removeEventListener('keydown',escape,true);},[cropId]);
  const [magnetism,setMagnetism]=useState(true);
  const [masterEditing,setMasterEditing]=useState(null);
  const masterSession=useRef(null);
  function update(change,options={}){rawUpdate(change,{...options,...(masterEditing?{historyGroup:masterSession.current}: {})});}
  const [componentName,setComponentName]=useState('');
  const [leftTab,setLeftTab]=useState('layers');
  const [transitionPanel,setTransitionPanel]=useState(false);
  const [edge,setEdge]=useState(null);
  const [inspectorTarget,setInspectorTarget]=useState(null);
  const inspector=useRef(null);

  const clipboard = useRef(null);
  const workspace = useRef(null);
  const mediaInput = useRef(null);
  const zipInput = useRef(null);
  const importTarget = useRef(null);
  const [mediaBusy, setBusy] = useState(false);
  const [message, storeMessage] = useState('');
  const [messageAlert,setMessageAlert]=useState(0);
  function setMessage(value,urgent=false){storeMessage(value);setMessageAlert(previous=>urgent?previous+1:0);}
  const [confirmation, setConfirmation] = useState(null);
  const [selectedButtonId, storeSelectedButtonId] = useState(null);
  const [selection,setSelection]=useState([]);
  const [editingGroup,setEditingGroup]=useState(null);
  function setSelectedButtonId(id){setSelection(id?[id]:[]);if(id!==selectedButtonId)setCropId(null);storeSelectedButtonId(id);setEdge(null);if(id)requestAnimationFrame(()=>{inspector.current?.querySelector('.inspector-scroll')?.scrollTo({top:0});});}
  const [appearanceClipboard,setAppearanceClipboard]=useState(null);
  const [previewMode, setPreviewMode] = useState('position');
  const interaction = useSlideInteraction(selected, { urls, onNavigate: testNavigate });
  const liveInteraction=useRef(interaction);liveInteraction.current=interaction;
  const testNavigation = useRef(null);
  const testOrigin = useRef(null);
  const previewRun = useRef(null);
  const renderedPage = useRef(null);
  const testBackgroundReady = useCallback(result => {
    const pending = renderedPage.current;
    if (pending?.pageId === result.pageId && pending.source === result.source) {
      renderedPage.current = null;
      result.ready ? pending.resolve() : pending.reject(new Error('L’image de destination ne peut pas être lue.'));
    }
  }, []);
  const [testVisual,setTestVisual] = useState(null);
  const [testTransition, setTestTransition] = useState(null);
  const busy = mediaBusy || !!testTransition || !!testVisual || interaction.blocked;
  const editorBusy = busy;
  useEffect(() => { onBusyChange(mediaBusy || !!testTransition || !!testVisual || interaction.blocked); return () => onBusyChange(false); }, [mediaBusy,testTransition, testVisual, interaction.blocked, onBusyChange]);
  useEffect(() => { setDrawingTool('');setMasterEditing(null);setEditingGroup(null);setSelectedButtonId(null);inspector.current?.querySelector('.inspector-scroll')?.scrollTo({top:0}); }, [selected?.id]);
  useEffect(()=>{const target=graphTarget.current;if(graphOpen||!target||target.pageId!==selected?.id)return;graphTarget.current=null;setSelectedButtonId(target.layerId||null);if(target.stateId){setPreviewMode('test');liveInteraction.current.activateState(target.stateId);}else setPreviewMode('position');},[selected?.id,graphOpen]);
  function openGraphElement(target){if(!document.pages.some(p=>p.id===target.pageId))return;interaction.reset();graphTarget.current=target;onSelect(target.pageId);setGraphOpen(false);}
  const mediaById = new Map(document.media.map(item => [item.id, item]));
  const selectedPassage = selected && passage(document,selected.id,document.pages[selectedIndex+1]?.id);
  const selectedLayer = selected && orderedLayers(selected).find(layer => layer.id === selectedButtonId);
  const selectedItems=selected?orderedLayers(selected).filter(l=>selection.includes(l.id)):[];
  function selectLayer(id,event,direct=false){
    if(Array.isArray(id)){setSelection(id);storeSelectedButtonId(id.length===1?id[0]:null);return;}
    if(!id){setSelection([]);storeSelectedButtonId(null);setEditingGroup(null);return;}
    if(editingGroup&&!selected.visualGroups?.find(g=>g.id===editingGroup)?.children.includes(id))setEditingGroup(null);
    const group=!direct&&(selected.visualGroups||[]).find(g=>g.children.includes(id)&&editingGroup!==g.id);
    const ids=group?group.children:[id];
    const next=event?.shiftKey?(ids.every(id=>selection.includes(id))?selection.filter(id=>!ids.includes(id)):[...new Set([...selection,...ids])]):ids;
    setSelection(next);storeSelectedButtonId(next.length===1?next[0]:null);setCropId(null);setEdge(null);if(next.length===1)requestAnimationFrame(()=>inspector.current?.querySelector('.inspector-scroll')?.scrollTo({top:0}));return next;
  }
  function batchChange(patches){for(const [id,patch] of Object.entries(patches)){const item=orderedLayers(selected).find(l=>l.id===id);if(!item||item.locked||!Object.keys(patch).length){delete patches[id];continue;}patches[id]=markStyleChanges(item,detachChangedColors(item,patch));if(patch.x!==undefined)patch.x=clamp(patch.x,0,1-(patch.width??item.width));if(patch.y!==undefined)patch.y=clamp(patch.y,0,1-(patch.height??item.height));}if(!Object.keys(patches).length)return;update(previous=>({...previous,pages:previous.pages.map(p=>p.id===selected.id?markBatchOverrides(patchLayers(p,patches),patches,p):p)}));}
  function duplicateMove(ids,patches){
    const copied=copySelection(selected,ids,document,selected);if(orderedLayers(selected).length+copied.layers.length>500){setMessage('Limite de 500 calques par page atteinte.');return;}
    const originals=orderedLayers(selected).filter(l=>ids.includes(l.id));
    copied.layers.forEach((copy,index)=>Object.assign(copy,patches[originals[index].id]));
    changePage(selected.id,{layers:[...selected.layers,...copied.layers.filter(l=>l.type&&l.type!=='button')],buttons:[...selected.buttons,...copied.layers.filter(l=>!l.type||l.type==='button')],layerOrder:[...selected.layerOrder,...copied.ids],visualGroups:[...(selected.visualGroups||[]),...copied.groups],states:selected.states.map(state=>({...state,visibility:{...state.visibility,...copied.visibility[state.id]}})),componentInstances:[...(selected.componentInstances||[]),...copied.instances]});
    setSelection(copied.ids);storeSelectedButtonId(copied.ids.length===1?copied.ids[0]:null);
  }
  function nudge(event,ids=selection,resize=false){
    if(busy||previewMode!=='position'||event.target.closest('input,textarea,select,[contenteditable],[role="textbox"]'))return;
    const items=orderedLayers(selected).filter(i=>ids.includes(i.id));if(!items.length||items.some(i=>i.locked))return;
    event.preventDefault();event.stopPropagation();const pixels=event.shiftKey?10:1,dx=(event.key==='ArrowRight'?pixels:event.key==='ArrowLeft'?-pixels:0)/1920,dy=(event.key==='ArrowDown'?pixels:event.key==='ArrowUp'?-pixels:0)/1080;
    const patches=resize&&items.length===1?{[items[0].id]:{width:clamp(items[0].width+dx,.02,Math.max(.02,1-items[0].x)),height:clamp(items[0].height+dy,.02,Math.max(.02,1-items[0].y))}}:translated(items,dx,dy);
    beginGesture();clearTimeout(nudgeTimer.current);batchChange(patches);nudgeTimer.current=setTimeout(()=>{nudgeTimer.current=null;endGesture();},1000);
  }
  function groupSelection(){if(selectedItems.length<2||selectedItems.some(l=>l.locked)||(selected.visualGroups||[]).some(g=>g.children.some(id=>selection.includes(id))))return;changePage(selected.id,{visualGroups:[...(selected.visualGroups||[]),{id:uid(),name:`Groupe ${(selected.visualGroups||[]).length+1}`,children:selection}]});}
  function ungroup(id){changePage(selected.id,{visualGroups:(selected.visualGroups||[]).filter(g=>g.id!==id)});setEditingGroup(null);}
  function deleteSelection(){const ids=new Set(selectedItems.filter(l=>!l.locked).map(l=>l.id));const next=cleanGroups({...selected,layers:selected.layers.filter(l=>!ids.has(l.id)),buttons:selected.buttons.filter(l=>!ids.has(l.id)),layerOrder:selected.layerOrder.filter(id=>!ids.has(id)),componentInstances:(selected.componentInstances||[]).filter(i=>!Object.values(i.members).some(id=>ids.has(id)))});changePage(selected.id,next);selectLayer(null);}
  function pasteSelection(data=clipboard.current){if(!data)return;const copied=copySelection(data.source,data.ids,document,selected);if(orderedLayers(selected).length+copied.layers.length>500){setMessage('Limite de 500 calques par page atteinte.');return;}const safe=copied.layers;changePage(selected.id,{layers:[...selected.layers,...safe.filter(l=>l.type&&l.type!=='button')],buttons:[...selected.buttons,...safe.filter(l=>!l.type||l.type==='button')],layerOrder:[...selected.layerOrder,...copied.ids],visualGroups:[...(selected.visualGroups||[]),...copied.groups],states:selected.states.map(state=>({...state,visibility:{...state.visibility,...copied.visibility[state.id]}})),componentInstances:[...(selected.componentInstances||[]),...copied.instances]});setSelection(copied.ids);storeSelectedButtonId(copied.ids.length===1?copied.ids[0]:null);}
  useLayoutEffect(()=>{if(!inspector.current)return;for(const detail of inspector.current.querySelectorAll('details')){const title=detail.querySelector(':scope > summary')?.textContent;if(Object.hasOwn(layout.sections,title))detail.open=!!layout.sections[title];}},[selectedButtonId,selected?.id]);

  useEffect(()=>{
    function shortcut(event){
      if(event.defaultPrevented||event.isComposing||busy||confirmation||previewMode!=='position'||!workspace.current?.contains(event.target)||event.target.closest('dialog,input,textarea,select,[contenteditable],[role="textbox"]'))return;
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)&&selection.length){nudge(event);return;}
      if(event.repeat)return;
      const key=event.key.toLowerCase(),mod=event.ctrlKey||event.metaKey;
      if(key==='escape'){event.preventDefault();setDrawingTool('');selectLayer(null);return;}
      if(!mod){if(['delete','backspace'].includes(key)&&selection.length){event.preventDefault();deleteSelection();}return;}
      if(key==='a'){event.preventDefault();const ids=orderedLayers(selected).filter(l=>!l.locked&&(interaction.visibility?.[l.id]??l.visible)).map(l=>l.id);setSelection(ids);storeSelectedButtonId(ids.length===1?ids[0]:null);return;}
      if(key==='g'){event.preventDefault();if(event.shiftKey){const g=(selected.visualGroups||[]).find(g=>g.children.every(id=>selection.includes(id)));if(g)ungroup(g.id);}else groupSelection();return;}
      if(key==='z'||key==='y'){event.preventDefault();if(key==='y'||event.shiftKey){if(canRedo)redo();}else if(canUndo)undo();return;}
      if(['c','x'].includes(key)&&selection.length){event.preventDefault();clipboard.current={source:structuredClone(selected),ids:[...selection]};if(key==='x')deleteSelection();setMessage('Sélection copiée.');}
      if(key==='v'&&clipboard.current&&selected){event.preventDefault();pasteSelection();}
    }window.addEventListener('keydown',shortcut);const keyup=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&nudgeTimer.current){clearTimeout(nudgeTimer.current);nudgeTimer.current=setTimeout(()=>{nudgeTimer.current=null;endGesture();},180);}};window.addEventListener('keyup',keyup);return()=>{window.removeEventListener('keydown',shortcut);window.removeEventListener('keyup',keyup);};
  });
  const selectedInstance=(selected?.componentInstances||[]).find(i=>selection.some(id=>Object.values(i.members).includes(id)));
  const selectedMaster=document.components?.find(c=>c.id===selectedInstance?.componentId);
  function makeComponent(){if(!componentName.trim())return;try{update(previous=>createComponent(previous,selected,selection,componentName.trim().slice(0,80)));setComponentName('');setMessage('Composant créé. Les actions restent propres à chaque instance.');}catch(e){setMessage(e.message,true);}}
  function insertMaster(master){try{const next=insertComponent(document,master,selected);changePage(selected.id,next);const ids=Object.values(next.componentInstances.at(-1).members);setSelection(ids);storeSelectedButtonId(ids.length===1?ids[0]:null);setMessage('Instance insérée. Vérifiez ses actions dans cette diapositive.');}catch(e){setMessage(e.message,true);}}
  function editMaster(master){const source=document.pages.find(p=>p.componentInstances?.some(i=>i.componentId===master.id));if(!source){insertMaster(master);setMessage('Instance insérée. Sélectionnez « Modifier le composant maître » pour la modifier.');return;}const instance=source.componentInstances.find(i=>i.componentId===master.id);if(source.id!==selected.id){onSelect(source.id);setMessage('La page du composant est ouverte. Cliquez de nouveau sur « Modifier le maître ».');return;}const ids=Object.values(instance.members);setSelection(ids);storeSelectedButtonId(ids.length===1?ids[0]:null);masterSession.current=uid();setMasterEditing(instance.id);setEditingGroup(source.visualGroups?.find(g=>g.children.some(id=>ids.includes(id)))?.id||null);setPreviewMode('position');setMessage('Modification du maître : ajustez les propriétés, puis appliquez les modifications. Les actions demeurent locales.');}
  function publishMaster(){try{const instance=selected.componentInstances.find(i=>i.id===masterEditing);if(!instance)return;const group=(selected.visualGroups||[]).find(g=>g.children.some(id=>Object.values(instance.members).includes(id)));const ids=group?.children||Object.values(instance.members);const master=document.components.find(c=>c.id===instance.componentId);const removed=master.layers.some(l=>!instance.members[l.id]||!ids.includes(instance.members[l.id]));const run=removeMissing=>{update(previous=>publishComponent(previous,selected,instance,ids,removeMissing));setMasterEditing(null);setMessage('Maître mis à jour. Les personnalisations des autres instances ont été conservées.');};if(removed){setConfirmation({title:'Retirer ces éléments dans les instances ?',message:'Confirmer supprime les éléments retirés du maître dans toutes ses instances. Les actions qui les ciblent seront désactivées si nécessaire. Vous pouvez aussi les conserver comme éléments indépendants. Les médias seront conservés.',run:()=>run(true),secondaryLabel:'Conserver comme éléments indépendants',secondaryRun:()=>run(false)});}else run(false);}catch(error){setMessage(error.message,true);}}

  function deleteMaster(master){const used=document.pages.some(p=>p.componentInstances?.some(i=>i.componentId===master.id));const run=()=>update(previous=>({...previous,components:previous.components.filter(c=>c.id!==master.id),pages:previous.pages.map(p=>({...p,componentInstances:(p.componentInstances||[]).filter(i=>i.componentId!==master.id)}))}));if(used)setConfirmation({title:'Détacher les instances et supprimer le maître ?',message:'Toutes les instances seront converties en éléments indépendants. Leur apparence, leurs actions et leurs médias seront conservés.',run});else run();}
  function rangeStart(event){if(nudgeTimer.current){clearTimeout(nudgeTimer.current);nudgeTimer.current=null;endGesture();}if(event.target.matches('input[type="range"]'))beginGesture();}
  function rangeEnd(event){if(event.target.matches('input[type="range"]'))endGesture();}
  function changePage(pageId, change) {
    update(previous => ({ ...previous, pages: previous.pages.map(page => page.id === pageId ? { ...page, ...change } : page) }));
  }
  function applyStateVisibility(buttonId, visible) {
    update(previous => ({ ...previous, pages: previous.pages.map(page => page.id === selected.id ? applyButtonStateVisibility(page, buttonId, visible) : page) }));
    interaction.reset();
    setMessage(visible ? 'Bouton affiché dans tous les états existants.' : 'Bouton masqué dans tous les états existants. Il reste accessible dans les calques.');
  }
  function changeButton(buttonId, change) {
    change=markStyleChanges(orderedLayers(selected).find(l=>l.id===buttonId),detachChangedColors(orderedLayers(selected).find(l=>l.id===buttonId),change));
    if(orderedLayers(selected).find(l=>l.id===buttonId)?.locked)return;
    if ('target' in change && !('action' in change)) change = { ...change, action: change.target ? { type: 'background', target: change.target } : null };
    if (change.action?.type === 'background') change = { ...change, target: change.action.target };
    update(previous => ({ ...previous, ...recentColorsPatch(orderedLayers(selected).find(l=>l.id===buttonId),change,previous), pages: previous.pages.map(page => page.id === selected.id ? markOverrides({ ...page, buttons: page.buttons.map(button => button.id === buttonId ? { ...button, ...change } : button) },buttonId,change,page) : page) }));
  }
  function preview(mode) {
    setDrawingTool('');setCropId(null);endGesture();
    if (mode === 'position') { if(previewRun.current){previewRun.current=null;setBusy(false);} interaction.resetAll(); testNavigation.current?.cancel?.(new Error('Test terminé.')); renderedPage.current?.resolve(); renderedPage.current = null; setTestTransition(null); setTestVisual(null); testNavigation.current = null; if (testOrigin.current && document.pages.some(page => page.id === testOrigin.current)) onSelect(testOrigin.current); }
    if (mode === 'test' && previewMode !== 'test') testOrigin.current = selected?.id;
    setPreviewMode(mode);
  }
  async function testNavigate(pageId, transitionId, sourcePage = selected, effect=null) {
    const page = document.pages.find(page => page.id === pageId);
    if (!page) throw new Error('Cette page de destination n’existe plus.');
    if (testNavigation.current) throw new Error('Une navigation est déjà en cours.');
    const operation = {};
    const cancelled = new Promise((_, reject) => { operation.cancel = error => reject(error); });
    cancelled.catch(() => {}); // Annulation possible entre deux attentes.
    testNavigation.current = operation;
    try {
      const preloadedSource = urls[resolveBackground(page, liveInteraction.current.forPage(page).target)];
      if (preloadedSource) { const image = new Image(); image.src = preloadedSource; image.decode().catch(() => {}); }
      if(effect && effect.type!=='none' && !urls[transitionId]) {
        await Promise.race([cancelled,new Promise((resolve,reject)=>{Object.assign(operation,{resolve,reject});setTestVisual({id:uid(),fromPage:sourcePage,toPage:page,fromNumber:document.pages.findIndex(p=>p.id===sourcePage.id)+1,toNumber:document.pages.findIndex(p=>p.id===page.id)+1,effect});})]);
      }
      if (urls[transitionId]) {
        await Promise.race([cancelled, new Promise((resolve, reject) => {
          Object.assign(operation, { resolve, reject });
          setTestTransition({ id: uid(), page: sourcePage, action: { videoId: transitionId, block: true } });
        })]);
      }
      const src = urls[resolveBackground(page, liveInteraction.current.forPage(page).target)];
      if (src) { const image = new Image(); image.src = src; await Promise.race([decodeImage(image), cancelled]); }
      if (testNavigation.current !== operation) return;
      const rendered = pageId === sourcePage.id ? Promise.resolve() : new Promise((resolve, reject) => { renderedPage.current = { pageId, source: src, resolve, reject }; });
      onSelect(pageId);
      await Promise.race([rendered, cancelled]);
    } catch (error) {
      if (testNavigation.current === operation) onSelect(sourcePage.id);
      throw error;
    } finally {
      if (testNavigation.current === operation) { renderedPage.current = null; setTestTransition(null); setTestVisual(null); testNavigation.current = null; }
    }
  }
  function testButton(button) { preview('test'); interaction.activateButton(button); }
  function changeLayer(layerId, change, options = {}) {
    change=markStyleChanges(orderedLayers(selected).find(l=>l.id===layerId),detachChangedColors(orderedLayers(selected).find(l=>l.id===layerId),change));
    const current=orderedLayers(selected).find(l=>l.id===layerId);if(current?.locked&&!('locked' in change)&&!Object.keys(change).every(k=>k==='visible'))return;if(current?.folderLocked&&'locked' in change)return;
    update(previous => ({ ...previous, ...recentColorsPatch(current,change,previous), pages: previous.pages.map(page => page.id !== selected.id ? page : markOverrides({
      ...page, layers: page.layers.map(layer => layer.id === layerId ? { ...layer, ...change, ...(layer.type === 'text' && !options.autoMeasure && change.height !== undefined && Math.abs(change.height - layer.height) > .00001 ? { textStyle: { ...layer.textStyle, ...change.textStyle, autoHeight: false, preset: 'custom' } } : {}) } : layer), buttons: page.buttons.map(button => button.id === layerId ? { ...button, ...change } : button),
    },layerId,change,page)) }), options);
  }
  function addLayer(type,geometry=null) {
    if (orderedLayers(selected).length >= 500) { setMessage('Limite de 500 calques par page atteinte.'); return; }
    const layer = type === 'button' ? createInteractiveButton(selected.buttons.length + 1) : createLayer(type, selected.layers.length + 1);
    if(geometry)Object.assign(layer,geometry);
    changePage(selected.id, type === 'button' ? { buttons: [...selected.buttons, layer] } : { layers: [...selected.layers, layer], layerOrder: [...selected.layerOrder, layer.id] });
    setSelectedButtonId(layer.id); setPreviewMode('position');
  }
  function duplicateLayer(layer) {
    if (orderedLayers(selected).length >= 500) { setMessage('Limite de 500 calques par page atteinte.'); return; }
    const copy = { ...layer, id: uid(), name: `${layer.name.slice(0, 70)} (copie)`, x: clamp(layer.x + .03, 0, 1 - layer.width), y: clamp(layer.y + .03, 0, 1 - layer.height) };
    copy.locked=layer.ownLocked??layer.locked;delete copy.ownLocked;delete copy.folderLocked;delete copy.folderHidden;
    const key = layer.type === 'button' ? 'buttons' : 'layers';
    if (key === 'buttons') {delete copy.type;copy.defaultSelected=false;}
    const order = [...selected.layerOrder];
    order.splice(order.indexOf(layer.id) + 1, 0, copy.id);
    changePage(selected.id, { [key]: [...selected[key], copy], layerOrder: order });
    setSelectedButtonId(copy.id);
  }
  function removeLayer(layer) {
    if(layer.locked)return;
    const key = layer.type === 'button' ? 'buttons' : 'layers';
    changePage(selected.id, { [key]: selected[key].filter(item => item.id !== layer.id), layerOrder: selected.layerOrder.filter(id => id !== layer.id) });
    setSelectedButtonId(null);
  }
  function reorderLayer(id, action) {
    const order = [...selected.layerOrder];
    const from = order.indexOf(id);
    const to = action === 'front' ? order.length - 1 : action === 'back' ? 0 : clamp(from + (action === 'up' ? 1 : -1), 0, order.length - 1);
    order.splice(from, 1); order.splice(to, 0, id);
    changePage(selected.id, { layerOrder: order });
  }
  function importLayerImage(layerId = null) {
    if (!layerId && orderedLayers(selected).length >= 500) { setMessage('Limite de 500 calques par page atteinte.'); return; }
    selectButtonMedia('layerImage', layerId);
  }
  function addPage(position) {
    if (document.pages.length >= 500) { setMessage('Limite de 500 diapositives atteinte.'); return; }
    const page = emptyPage(document.pages.length + 1);
    rawUpdate(previous => {
      const index = previous.pages.findIndex(item => item.id === selected?.id);
      const insertion = position ?? (index >= 0 ? index + 1 : previous.pages.length);
      return { ...previous, pages: [...previous.pages.slice(0, insertion), page, ...previous.pages.slice(insertion)] };
    }, { pageSelection: { before: selected?.id ?? null, after: page.id } });
    onSelect(page.id);
    setPreviewMode('position');
    setMessage('Page ajoutée. Importez son image pour commencer.');
  }
  function duplicatePage() {
    if (document.pages.length >= 500) { setMessage('Limite de 500 diapositives atteinte.'); return; }
    const copy = { ...duplicatePageModel(selected), transitionId: null };
    update(previous => {
      const pages = [...previous.pages];
      pages.splice(selectedIndex + 1, 0, copy);
      return { ...previous, pages };
    });
    onSelect(copy.id);
    setMessage('Page dupliquée. Ses réglages peuvent être modifiés indépendamment.');
  }
  function movePage(offset) {
    update(previous => {
      const pages = [...previous.pages];
      [pages[selectedIndex], pages[selectedIndex + offset]] = [pages[selectedIndex + offset], pages[selectedIndex]];
      return { ...previous, pages };
    });
    onSelect(selected.id);
  }
  function selectMedia(kind, variantId = null, addVariant = false) {
    importTarget.current = { pageId: selected.id, kind, variantId, addVariant };
    mediaInput.current.accept = kind === 'image' ? '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp' : '.mp4,.webm,video/mp4,video/webm';
    mediaInput.current.click();
  }
  function selectButtonMedia(role, buttonId = null, kind = 'image') {
    importTarget.current = { pageId: selected.id, kind, role, buttonId };
    mediaInput.current.accept = kind === 'image' ? '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp' : '.mp4,.webm,video/mp4,video/webm';
    mediaInput.current.click();
  }
  async function frameDrop(id,transfer){
    if(orderedLayers(selected).find(l=>l.id===id)?.locked)return;
    const linked=transfer.getData('application/studio-media');
    const file=transfer.files?.[0];
    const isButton=selected.buttons.some(b=>b.id===id);
    if(isButton&&(file?.type.startsWith('video/')||/\.(mp4|webm)$/i.test(file?.name||''))){setMessage('Choisissez une image pour le bouton. Les vidéos restent réservées aux cadres.',true);return;}
    try{
      let media=document.media.find(m=>m.id===linked);
      if(!media&&file){if(document.media.length>=2000)throw Error('Limite de 2 000 médias atteinte.');const space=await storageEstimate();if(space?.quota&&file.size>space.quota-space.usage)throw Error('Espace insuffisant pour ce média. Exportez votre projet en ZIP.');setBusy(true);const incoming=await readMedia(file,file.type.startsWith('video/')||/\.(mp4|webm)$/i.test(file.name)?'video':'image');media=await existingImage(document.media,incoming)||incoming;}
      if(!media)return;
      if(isButton&&!media.type.startsWith('image/'))throw Error('Choisissez une image pour le bouton.');
      const frameMedia={mediaId:media.id,kind:media.type.startsWith('video/')?'video':'image',crop:frameCrop(),playback:framePlayback()};
      update(before=>({...before,media:before.media.some(m=>m.id===media.id)?before.media:[...before.media,media],pages:before.pages.map(p=>{if(p.id!==selected.id)return p;const previous=p.buttons.find(b=>b.id===id),patch=previous?{imageId:media.id,imageCrop:previous.imageCrop||defaultCrop()}:{frameMedia};const next={...p,buttons:p.buttons.map(b=>b.id===id?{...b,...patch}:b),layers:p.layers.map(l=>l.id===id?{...l,...patch}:l)};return markOverrides(next,id,patch,p);})}));
      setMessage('Média inséré dans le cadre.');
    }catch(error){setMessage(error.message,true);}finally{setBusy(false);}
  }
  function importFrame(id){importTarget.current={role:'frame',buttonId:id,pageId:selected.id};mediaInput.current.accept='.png,.jpg,.jpeg,.webp,.mp4,.webm';mediaInput.current.click();}
  async function onMediaSelected(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    const target = importTarget.current;
    if(target.role==='frame'){await frameDrop(target.buttonId,{getData:()=>'',files:[file]});return;}
    setBusy(true);
    setMessage('Vérification du média…');
    try {
      if (document.media.length >= 2000) throw new Error('Limite de 2 000 médias atteinte. Votre projet est conservé.');
      if (target.kind === 'video' && !target.role && document.transitions.length >= 2000 && !passage(document, target.pageId, target.toId ?? document.pages[document.pages.findIndex(p=>p.id===target.pageId)+1]?.id ?? null)) throw new Error('Limite de 2 000 configurations de transition atteinte.');
      const space = await storageEstimate();
      if (space?.quota && file.size > space.quota - space.usage) throw new Error('Espace insuffisant pour ce média. Exportez un ZIP et libérez de l’espace avant de réessayer.');
      const media = await readMedia(file, target.kind);
      const newLayer = target.role === 'layerImage' && !target.buttonId ? { ...createLayer('image', selected.layers.length + 1), name: file.name.slice(0, 80), imageId: media.id } : null;
      update(previous => ({
        ...previous,
        media: [...previous.media, media],
        transitions: target.kind === 'video' && !target.role ? assignTransition(previous, target.pageId, target.toId ?? previous.pages[previous.pages.findIndex(p => p.id === target.pageId)+1]?.id ?? null, media.id) : previous.transitions,
        pages: previous.pages.map(page => {
          if (page.id !== target.pageId) return page;
          if (target.role?.startsWith('action')) return { ...page, buttons: page.buttons.map(button => {
            if (button.id !== target.buttonId) return button;
            const patch = target.role === 'actionBackground' ? { target: { kind: 'media', mediaId: media.id } } : target.role === 'actionFinal' ? { finalBackground: { kind: 'media', mediaId: media.id } } : target.role === 'actionTransition' ? { transitionId: media.id } : { videoId: media.id };
            return { ...button, action: { ...button.action, ...patch }, ...(target.role === 'actionBackground' ? { target: patch.target } : {}) };
          }) };
          if (target.role === 'layerImage') return newLayer ? { ...page, layers: [...page.layers, newLayer], layerOrder: [...page.layerOrder, newLayer.id] } : { ...page, layers: page.layers.map(layer => layer.id === target.buttonId ? { ...layer, imageId: media.id } : layer) };
          if (target.role === 'defaultBackground') return { ...page, defaultBackground: { kind: 'media', mediaId: media.id } };
          if (target.role === 'buttonImage' || target.role === 'buttonBackground') return { ...page, buttons: page.buttons.map(button => button.id === target.buttonId ? { ...button, ...(target.role === 'buttonImage' ? { imageId: media.id, imageCrop: button.imageCrop || defaultCrop() } : { target: { kind: 'media', mediaId: media.id }, action: { type: 'background', target: { kind: 'media', mediaId: media.id } } }) } : button) };
          if (target.addVariant) return { ...page, variants: [...page.variants, { id: uid(), name: `Variante ${page.variants.length + 1}`, mediaId: media.id }] };
          if (target.variantId) return { ...page, variants: page.variants.map(variant => variant.id === target.variantId ? { ...variant, mediaId: media.id } : variant) };
          return target.kind === 'video' ? { ...page, transitionId: media.id } : { ...page, imageId: media.id, demoTemplate: null };
        }),
      }));
      interaction.reset();
      if (newLayer) { setSelectedButtonId(newLayer.id); setPreviewMode('position'); }
      setMessage('Média importé.');
    } catch (error) { setMessage(error.message,true); } finally { setBusy(false); }
  }
  function assignTransition(previous, fromId, toId, mediaId, mode = 'video') {
    const old = passage(previous, fromId, toId);
    return [...previous.transitions.filter(item => item.id !== old?.id), { ...old, id: old?.id || uid(), fromId, toId, mediaId, mode, effect:old?.effect || defaultEffect() }];
  }
  function chooseTransition(fromId,toId,mediaId,mode='video') {
    if (document.transitions.length >= 2000 && !passage(document,fromId,toId)) { setMessage('Limite de 2 000 configurations de transition atteinte.'); return; }
    update(previous=>({...previous, transitions:assignTransition(previous,fromId,toId,mediaId,mode),pages:previous.pages.map(p=>p.id===fromId?{...p,transitionId:mediaId}:p)}));
  }
  function detachTransition(id,remove=false) {
    update(previous=>({...previous, transitions: remove?previous.transitions.filter(t=>t.id!==id):previous.transitions.map(t=>t.id===id?{...t,fromId:null,toId:null}:t)}));
  }
  function moveTo(id,position) {
    const from=document.pages.findIndex(p=>p.id===id);if(from<0 || from===position-(from<position?1:0))return;
    update(previous=>{const from=previous.pages.findIndex(p=>p.id===id);if(from<0)return previous;const pages=[...previous.pages];const [page]=pages.splice(from,1);pages.splice(position-(from<position?1:0),0,page);return {...previous,pages};});
    onSelect(id);
  }
  function deletePage(id) {
    const page=document.pages.find(p=>p.id===id); if(!page)return;
    setConfirmation({title:'Supprimer cette page ?',message:`La page « ${page.title} » sera retirée. Les vidéos et médias sont conservés. Les boutons qui la ciblent seront signalés sans être redirigés.`,run:()=>{update(previous=>({...previous,pages:previous.pages.filter(p=>p.id!==id)}));onSelect(document.pages.find(p=>p.id!==id)?.id || null);setMessage('Page supprimée. Annuler permet de la récupérer.');}});
  }
  async function previewPassage(fromId,toId) {
    if (testNavigation.current || previewRun.current || mediaBusy) return;
    const token={};previewRun.current=token;
    setBusy(true);interaction.resetAll();setPreviewMode('test');testOrigin.current=fromId;onSelect(fromId);
    // Attendre le rendu de la diapositive de départ avant la lecture.
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const item=passage(document,fromId,toId);
    try {
      if(previewRun.current!==token)return;
      window.document.querySelector('.editor-preview')?.scrollIntoView({block:'center',behavior:'instant'});
      const sourceImage=window.document.querySelector('.editor-preview .slide-background');
      if(sourceImage)await decodeImage(sourceImage);
      if(previewRun.current!==token)return;
      await testNavigate(toId,item?.mode==='video'?item.mediaId:null,document.pages.find(p=>p.id===fromId),item?.mode==='visual'?item.effect:null);
    }
    catch(error){if(previewRun.current===token)setMessage(error.message,true);}
    finally { if(previewRun.current===token){previewRun.current=null;setBusy(false);} }
  }
  async function exportZip() {
    setBusy(true);
    setMessage('Préparation du ZIP…');
    try { await downloadBackup(); setMessage('Sauvegarde ZIP générée. Conservez le fichier téléchargé dans un endroit sûr.'); }
    catch (error) { setMessage(error.message || 'L’export n’a pas abouti. Vérifiez la mémoire disponible et réessayez.',true); }
    finally { setBusy(false); }
  }
  async function downloadBackup() {
    await exportPresentation(document);
    try { onBackup(await markBackupExport()); } catch { /* Le ZIP reste disponible même si l’historique ne peut pas être enregistré. */ }
  }
  async function protectStorage() {
    try {
      const granted = await requestPersistentStorage();
      setMessage(granted ? 'Stockage persistant autorisé. Il limite l’effacement automatique, mais ne remplace pas vos sauvegardes ZIP.' : 'Chrome n’a pas accordé le stockage persistant. Votre projet reste enregistré : conservez régulièrement une sauvegarde ZIP.');
    } catch { setMessage('Cette protection n’est pas disponible. Sauvegardez régulièrement votre projet en ZIP.'); }
  }
  async function importZip(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setMessage('Vérification du ZIP…');
    try {
      const imported = await importPresentation(file);
      const space = await storageEstimate();
      const size = imported.media.reduce((sum, item) => sum + item.blob.size, 0);
      if (space?.quota && size > space.quota - space.usage) throw new Error('Espace insuffisant pour restaurer ce ZIP. Exportez la présentation actuelle et libérez de l’espace.');
      setConfirmation({ title: 'Remplacer la présentation ?', message: `Ce ZIP contient ${imported.pages.length} page(s). Une copie locale du projet précédent sera conservée. Une sauvegarde ZIP indépendante reste recommandée.`, backup: downloadBackup, run: async () => {
        await replace(imported);
        onSelect(imported.pages[0]?.id || null);
        interaction.reset();
        setSelectedButtonId(null);
        setMessage('Présentation restaurée.');
      } });
      setMessage('ZIP vérifié. Confirmez la restauration.');
    } catch (error) { setMessage(error.message,true); } finally { setBusy(false); }
  }

  return <ProjectColorsProvider document={document} update={update} selected={selectedItems[0]}><ImagePickerProvider document={document} urls={urls}><section onDragOver={e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();}} onDrop={e=>{e.preventDefault();setMessage('Déposez les images dans le panneau Médias pour les importer.');}} ref={workspace} tabIndex={-1} className="editor" aria-label="Éditeur de présentation" onPointerDownCapture={rangeStart} onPointerUpCapture={rangeEnd} onPointerCancelCapture={rangeEnd} onFocusCapture={event=>{if(event.target.matches('input[type="color"]'))beginGesture();}} onBlurCapture={event=>{if(event.target.matches('input[type="range"],input[type="color"]'))endGesture();}} onKeyDownCapture={event=>{if(event.target.matches('input[type="range"]')&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))beginGesture();}} onKeyUpCapture={event=>{if(event.target.matches('input[type="range"]'))endGesture();}}>
    <header role="banner" className="compact-topbar" aria-label="Barre de l’éditeur">{chrome?.brand}<FileMenu busy={busy} hasPrevious={hasPrevious} onExport={exportZip} onImport={() => zipInput.current.click()} onProtect={protectStorage} onRecover={() => setConfirmation({ title: 'Récupérer le projet précédent ?', message: 'La copie locale créée avant la dernière restauration sera rétablie. Sauvegardez le projet actuel en ZIP si vous souhaitez le conserver.', backup: downloadBackup, run: async () => { await recoverPrevious(); onSelect(null); setSelectedButtonId(null); interaction.reset(); setMessage('Projet précédent récupéré.'); } })}><p>{document.pages.length} page(s) · {Math.round(document.media.reduce((sum, item) => sum + item.blob.size, 0) / 1024 / 1024 * 10) / 10} Mo de médias{estimate?.quota ? ` · ${Math.round((estimate.quota - estimate.usage) / 1024 / 1024)} Mo disponibles` : ''}</p><p>{lastBackup ? `Dernier ZIP généré : ${new Date(lastBackup).toLocaleString('fr-CA')}. Vérifiez que le fichier est conservé.` : 'Aucune sauvegarde ZIP enregistrée. Sauvegardez votre projet à la fin de chaque séance et avant une mise à jour.'} Vos médias restent dans ce navigateur.</p></FileMenu><div className="workspace-document" title={`${document.title || 'Ma présentation'} · Page ${selectedIndex+1} / ${document.pages.length}`}><span className="workspace-document-icon">▱</span><strong>{document.title || 'Ma présentation'}</strong><small>{selected ? `${selectedIndex+1} / ${document.pages.length}` : 'Aucune page'}</small></div>{chrome?.modes}<ToolbarOverflow><div className="topbar-tools" ref={setToolsTarget}/><div className="topbar-zoom" ref={setZoomTarget}/><div className="button-row"><button className="ui-button" disabled={busy} onClick={()=>setGraphOpen(true)} aria-label="Vue des interactions" data-toolbar-icon="⌘" title="Vue des interactions">Vue des interactions</button><button className="ui-button" role="tab" aria-selected={statesOpen} disabled={busy} onClick={()=>setStatesOpen(true)} aria-label="États" data-toolbar-icon="◇" title="États">États</button><button className="ui-button" disabled={busy || !canUndo} title="Annuler (Ctrl+Z / Cmd+Z)" onClick={undo} aria-label="↶ Annuler" data-toolbar-icon="↶">↶ Annuler</button><button className="ui-button" disabled={busy || !canRedo} title="Rétablir (Ctrl+Y / Ctrl+Maj+Z / Cmd+Maj+Z)" onClick={redo} aria-label="↷ Rétablir" data-toolbar-icon="↷">↷ Rétablir</button></div></ToolbarOverflow><button className="ui-button primary" disabled={busy || !document.pages.length} onClick={onLaunch} aria-label="▶ Lancer la présentation" data-toolbar-icon="▶︎" title="▶ Lancer la présentation">▶ Lancer la présentation</button><ToolbarNotifications count={(chrome?.noticeCount||0) + document.pages.flatMap(p=>p.buttons.filter(b=>b.action?.missingPageId && !b.action.pageId)).length + Number(!!message) + Number(!!interaction.notice)} urgent={chrome?.urgent || (messageAlert ? `${messageAlert}:${message}` : '')}>{chrome?.notices}

    {document.pages.flatMap(p=>p.buttons.filter(b=>b.action?.missingPageId && !b.action.pageId).map(b=><div className="editor-message" role="status" key={b.id}>⚠ {p.title} · {b.name} : la diapositive cible a été supprimée. Choisissez une nouvelle destination dans les propriétés du bouton.</div>))}
    {message && <div className="editor-message" role="status">{message}</div>}{interaction.notice && <p className="editor-message" role="status">{interaction.notice}</p>}</ToolbarNotifications>{chrome?.status}</header>
    {statesOpen&&selected&&<StateManager key={selected.id} page={selected} document={document} changePage={changePage} busy={mediaBusy} activeStateId={interaction.stateId} close={()=>setStatesOpen(false)} openState={id=>{setStatesOpen(false);preview('test');requestAnimationFrame(()=>liveInteraction.current.inspectState(id));}} previewTransition={(from,to)=>{setStatesOpen(false);preview('test');requestAnimationFrame(()=>liveInteraction.current.previewStates(from,to));}}/>}
    {graphOpen&&<InteractionMap document={document} pageId={selected?.id} close={()=>setGraphOpen(false)} openElement={openGraphElement}/>}


    <div className={`editor-layout workspace-shell ${layout.leftOpen?'':'left-closed'}`} style={{'--left-panel':`${layout.leftOpen?layout.left:0}px`,'--right-panel':`${layout.right}px`,'--timeline-height':`${layout.timeline}px`}}>
      <nav className="workspace-tools" role="toolbar" aria-orientation="vertical" aria-label="Outils de création">
       <button title="Sélectionner et positionner" aria-label="Outil Sélection" disabled={busy} aria-pressed={previewMode==='position'&&!selectedLayer} onClick={()=>{preview('position');setSelectedButtonId(null);}}><Icon name="select"/></button>
       {selected&&[['text','Texte','text'],['image','Image','image'],['rectangle','Rectangle','shape'],['circle','Cercle','circle'],['vectorLine','Ligne','line'],['button','Bouton','button']].map(([type,name,icon])=><button key={type} aria-label={`+ ${name}`} title={`Ajouter ${name.toLowerCase()}`} disabled={busy} aria-pressed={type==='vectorLine'?drawingTool==='vectorLine':selectedLayer?.type===type} onClick={()=>type==='image'?importLayerImage():type==='vectorLine'?(setCropId(null),setDrawingTool(drawingTool==='vectorLine'?'':'vectorLine')):addLayer(type)}><Icon name={icon}/></button>)}
       <span className="tool-divider"/>
       <button title="Afficher ou fermer les calques" aria-label="Panneau Calques" aria-pressed={layout.leftOpen&&leftTab==='layers'} onClick={()=>{setLeftTab('layers');changeLayout({leftOpen:!layout.leftOpen||leftTab!=='layers'});}}><Icon name="layers"/></button>
       <button title="Bibliothèque de composants" aria-label="Panneau Composants" onClick={()=>{setLeftTab('components');changeLayout({leftOpen:true});}}>◇</button><button title="Médias et ressources du projet" aria-label="Panneau Médias" aria-pressed={layout.leftOpen&&leftTab==='media'} onClick={()=>{setLeftTab('media');changeLayout({leftOpen:!layout.leftOpen||leftTab!=='media'});}}><Icon name="media"/></button>
       <button title="Paramètres de la diapositive" aria-label="Paramètres de la diapositive" onClick={()=>{setSelectedButtonId(null);inspector.current?.querySelector('.page-actions')?.scrollIntoView({block:'start'});}}><Icon name="page"/></button>
       <button title="États et visibilité des calques" aria-label="Panneau États" onClick={()=>setStatesOpen(true)}><Icon name="states"/></button>
      </nav>
      <aside className="page-sidebar workspace-left" aria-label="Pages et calques" hidden={!layout.leftOpen}>
       <div className="panel-heading"><strong>{leftTab==='layers'?'Calques':leftTab==='components'?'Composants':'Bibliothèque'}</strong><button aria-label="Fermer le panneau gauche" onClick={()=>changeLayout({leftOpen:false})}>×</button></div>
       {leftTab==='layers'?selected&&<LayerFolders page={selected} update={patch=>changePage(selected.id,patch)} disabled={busy} selection={selection} render={folderPage=><LayerPanel move={(id,target)=>{const order=[...selected.layerOrder],from=order.indexOf(id),to=order.indexOf(target);if(from>=0&&to>=0&&from!==to){order.splice(from,1);order.splice(to,0,id);changePage(selected.id,{layerOrder:order});}}} rename={id=>{setSelectedButtonId(id);requestAnimationFrame(()=>inspector.current?.querySelector('[aria-label="Nom du calque"]')?.focus());}} page={folderPage} selectedIds={selection} selectedId={selectedButtonId} onGroup={(ids,event)=>{setEditingGroup(null);const next=event?.shiftKey?(ids.every(id=>selection.includes(id))?selection.filter(id=>!ids.includes(id)):[...new Set([...selection,...ids])]):ids;setSelection(next);storeSelectedButtonId(next.length===1?next[0]:null);}} onSelect={(id,event)=>{selectLayer(id,event,true);setPreviewMode('position');}} change={changeLayer} disabled={busy}/>} />:leftTab==='components'?<ComponentLibrary components={document.components||[]} urls={urls} busy={busy} insert={insertMaster} edit={editMaster} remove={deleteMaster} rename={(id,name)=>update(previous=>({...previous,components:previous.components.map(c=>c.id===id?{...c,name}:c)}))}/>:<MediaLibrary document={document} urls={urls} update={update} commitMedia={commitMedia} busy={busy} setBusy={setBusy} message={setMessage}/>}
      </aside>
      <ResizeHandle label="Largeur du panneau gauche" value={layout.left} min={160} max={340} change={left=>changeLayout({left})}/>
      <div className="editor-workspace">
        {!selected ? <div className="empty-editor"><span>▧</span><h2>Votre première page vous attend.</h2><p>Ajoutez une page, puis importez votre image.</p><button className="ui-button primary" disabled={busy} onClick={() => addPage()}>Ajouter une page</button></div> : <>

          {toolsTarget && createPortal(<div className="preview-controls">{previewMode === 'test' && <button className="ui-button" onClick={() => preview('position')} aria-label="Revenir au mode édition" title="Revenir au mode édition" data-toolbar-icon="↩">Revenir au mode édition</button>}<div className="mode-tabs"><button aria-pressed={previewMode === 'position'} disabled={busy} onClick={() => preview('position')} aria-label="Positionner les boutons" title="Positionner les boutons" data-toolbar-icon="↔">Positionner les boutons</button><button aria-pressed={previewMode === 'test'} disabled={busy} onClick={() => preview('test')} aria-label="Tester les interactions" title="Tester les interactions" data-toolbar-icon="▷">Tester les interactions</button></div><select title="Outil de création sur le canevas" aria-label="Création sur le canevas" value={drawingTool} disabled={busy||previewMode!=='position'} onChange={e=>{setCropId(null);setDrawingTool(e.target.value);}}><option value="">Sélectionner / déplacer</option><option value="rectangle">Dessiner un rectangle</option><option value="circle">Dessiner un cercle</option><option value="vectorLine">Dessiner une ligne</option></select><button className="ui-button magnet-toggle" aria-label={`⌖ Magnétisme ${magnetism?'actif':'inactif'}`} data-toolbar-icon="⌖" aria-pressed={magnetism} onClick={()=>setMagnetism(!magnetism)} title="Magnétisme — Ctrl / Cmd désactive temporairement l’accrochage pendant le glissement">⌖ Magnétisme {magnetism?'actif':'inactif'}</button><button className="ui-button subtle" onClick={interaction.reset} aria-label="Afficher l’arrière-plan par défaut" title="Afficher l’arrière-plan par défaut" data-toolbar-icon="▧">Afficher l’arrière-plan par défaut</button></div>, toolsTarget)}
          <div className="layer-studio"><FitCanvas controlsTarget={zoomTarget} selection={selectedItems} editing={previewMode === 'position'} zoom={layout.zoom} change={zoom=>changeLayout({zoom})}><div className="stage editor-preview" onPointerDown={event=>{if(event.target===event.currentTarget||event.target.classList.contains('slide-background'))selectLayer(null);}}><SlideView page={selected} urls={urls} interaction={interaction} onBackgroundReady={testBackgroundReady} number={selectedIndex + 1} total={document.pages.length} buttonEditing={{ drawingTool, onDraw:(type,rect)=>{if(rect)addLayer(type,rect);setDrawingTool('');}, onDuplicateMove:duplicateMove, onNudge:nudge, onFrameDrop:frameDrop, selection, isVisualGroup:(selected.visualGroups||[]).some(g=>g.children.length===selection.length&&g.children.every(id=>selection.includes(id))), onBatchChange:batchChange, onEnterGroup:id=>{const g=(selected.visualGroups||[]).find(g=>g.children.includes(id));if(g&&editingGroup!==g.id){setEditingGroup(g.id);setSelectedButtonId(id);return true;}return false;}, magnetism, editing: previewMode === 'position', selectedButtonId, onSelect: selectLayer, onGeometryChange: changeLayer, disabled: editorBusy, cropId, onCrop:id=>{if(id){setSelectedButtonId(id);setCropId(id);if(!orderedLayers(selected).find(b=>b.id===id)?.frameMedia&&!selected.buttons.find(b=>b.id===id)?.imageCrop)changeLayer(id,{imageCrop:defaultCrop()});}else setCropId(null);}, beginGesture,endGesture }} />{interaction.video && <ActionVideo key={interaction.video.id} playback={interaction.video} urls={urls} finish={interaction.finishVideo} stop={interaction.stopVideo} />}{testVisual && <VisualPreview playback={testVisual} urls={urls} total={document.pages.length} finish={error=>error?testNavigation.current?.reject(error):testNavigation.current?.resolve()} cancel={()=>testNavigation.current?.cancel(new Error('Animation annulée.'))}/ >}{testTransition && <ActionVideo key={testTransition.id} playback={testTransition} urls={urls} finish={(id, error) => error ? testNavigation.current?.reject(new Error('La transition spécifique ne peut pas être lue.')) : testNavigation.current?.resolve()} stop={() => testNavigation.current?.cancel(new Error('Navigation de test annulée.'))} />}</div>
          <div className="preview-help"><p className="help preview-hint">{previewMode === 'position' ? 'Glissez un calque pour le déplacer, ses poignées pour le redimensionner et ↻ pour le faire pivoter.' : 'Testez vos boutons et arrière-plans. Les calques restent fixes.'}</p></div></FitCanvas></div>

        </>}
      </div>
      <ResizeHandle label="Largeur des propriétés" value={layout.right} min={280} max={520} reverse change={right=>changeLayout({right})}/>
      <aside className="workspace-inspector" aria-label="Inspecteur des propriétés" ref={inspector}>
       <div className="inspector-heading"><span>PROPRIÉTÉS</span><strong>{transitionPanel?'Transition':selectedLayer?selectedLayer.name:selected?.title||'Diapositive'}</strong></div>
       <div className="inspector-scroll" onClickCapture={event=>{const summary=event.target.closest('summary');if(!summary||!event.currentTarget.contains(summary))return;const d=summary.parentElement;if(d.tagName==='DETAILS'){const title=summary.textContent;if(title)changeLayout(old=>({sections:{...old.sections,[title]:!d.open}}));}}}>
       <div ref={setInspectorTarget} className="transition-inspector"/>
       <div hidden={transitionPanel}>{selected&&<>
{(selectedMaster||masterEditing||selectedItems.length===1&&selectedItems[0].type==='button'||(selected.visualGroups||[]).some(g=>g.children.length===selection.length&&g.children.every(id=>selection.includes(id))))&&<section className="component-properties settings-panel"><h3>Composant</h3>{masterEditing&&<div className="editor-message">Modification du maître<button className="ui-button primary" onClick={publishMaster} disabled={busy}>Appliquer au maître et aux instances</button><button className="ui-button" onClick={()=>setMasterEditing(null)}>Terminer sans publier</button></div>}{selectedMaster?<><p>◇ {selectedMaster.name}</p><button className="ui-button" onClick={()=>{const ids=Object.values(selectedInstance.members);setSelection(ids);storeSelectedButtonId(ids.length===1?ids[0]:null);}}>Sélectionner toute l’instance</button><p className="help">Personnalisations : {[...new Set(Object.values(selectedInstance.overrides).flat().map(componentPropertyName))].join(', ')||'Aucune'}</p><div className="button-row"><button className="ui-button" disabled={busy} onClick={()=>editMaster(selectedMaster)}>Modifier le composant maître</button><button className="ui-button" disabled={busy} onClick={()=>changePage(selected.id,resetInstance(selected,selectedInstance,selectedMaster))}>Réinitialiser au style du composant</button><button className="ui-button" disabled={busy} onClick={()=>changePage(selected.id,detachInstance(selected,selectedInstance.id))}>Détacher du composant</button></div></>:<><label className="field">Nom du nouveau composant<input aria-label="Nom du nouveau composant" maxLength={80} value={componentName} onChange={e=>setComponentName(e.target.value)}/></label><button className="ui-button" disabled={busy||!componentName.trim()||!(selectedItems.length===1&&selectedItems[0].type==='button'||(selected.visualGroups||[]).some(g=>g.children.length===selection.length&&g.children.every(id=>selection.includes(id))))} onClick={makeComponent}>Créer un composant</button></>}</section>}
{editingGroup&&<div className="editor-message">Édition du groupe · <button onClick={()=>{setEditingGroup(null);selectLayer(null);}}>Terminer</button></div>}{editingGroup&&<section className="settings-panel"><h3>Contenu du groupe</h3>{orderedLayers(selected).map(l=><label className="checkbox-field" key={l.id}><input type="checkbox" checked={selected.visualGroups.find(g=>g.id===editingGroup)?.children.includes(l.id)||false} onChange={e=>{const g=selected.visualGroups.find(g=>g.id===editingGroup);if(!g||!e.target.checked&&g.children.length===1)return;if(e.target.checked&&(selected.visualGroups||[]).some(other=>other.id!==g.id&&other.children.includes(l.id))){setMessage('Les groupes imbriqués ne sont pas autorisés.');return;}changePage(selected.id,{visualGroups:selected.visualGroups.map(other=>other.id===g.id?{...g,children:e.target.checked?[...g.children,l.id]:g.children.filter(id=>id!==l.id)}:other)});}}/>{l.name}</label>)}</section>}{selectedItems.length>1&&<SelectionTools editingGroup={editingGroup} items={selectedItems} groups={selected.visualGroups||[]} change={batchChange} group={groupSelection} ungroup={ungroup} remove={deleteSelection} duplicate={()=>pasteSelection({source:selected,ids:selection})} busy={busy||previewMode==='test'} rename={(id,name)=>changePage(selected.id,{visualGroups:selected.visualGroups.map(g=>g.id===id?{...g,name}:g)})}/>}
{selectedItems.length>0&&<PropertyClipboardSettings items={selectedItems} clipboard={appearanceClipboard} copy={setAppearanceClipboard} change={batchChange} busy={busy||previewMode==='test'} styles={document.projectStyles||[]}/>}
{selectedItems.length>0&&<ProjectStylesSettings document={document} page={selected} items={selectedItems} update={update} busy={busy||previewMode==='test'}/>}
{selectedLayer&&<LayerProperties importFrame={importFrame} adjusting={cropId===selectedLayer.id} onAdjust={value=>setCropId(value?selectedLayer.id:null)} page={selected} applyStateVisibility={applyStateVisibility} layer={selectedLayer} change={changeLayer} duplicate={duplicateLayer} remove={removeLayer} reorder={reorderLayer} importImage={importLayerImage} media={document.media} busy={busy || previewMode === 'test'}>{selectedLayer?.type === 'button' && <>{selectedLayer.imageId&&<CropSettings button={selectedLayer} change={changeLayer} adjusting={cropId===selectedLayer.id} setAdjusting={value=>{setCropId(value?selectedLayer.id:null);if(value&&!selectedLayer.imageCrop)changeLayer(selectedLayer.id,{imageCrop:defaultCrop()});}} busy={busy||previewMode==='test'} copied={copiedCrop} copy={setCopiedCrop}/>}<details className="property-section" open><summary>Texte</summary><TextSettings item={buttonTextItem(selectedLayer)} busy={busy || previewMode === 'test'} buttonMode change={(id,patch,options)=>changeLayer(id,{labelText:{content:buttonTextItem(selectedLayer).content,color:buttonTextItem(selectedLayer).color,textStyle:buttonTextItem(selectedLayer).textStyle,...patch}},options)}/></details><ButtonAppearanceSettings key={selectedLayer.id} button={selectedLayer} page={selected} changeButton={changeButton} changePage={changePage} test={testButton} busy={busy || previewMode === 'test'}/><ActionSettings button={selectedLayer} page={selected} document={document} changeButton={changeButton} importMedia={selectButtonMedia} test={testButton} busy={busy || previewMode === 'test'} /></>}          <ButtonSettings compact page={selected} urls={urls} mediaById={mediaById} selectedButtonId={selectedButtonId} onSelect={setSelectedButtonId} changePage={changePage} changeButton={changeButton} importButtonMedia={selectButtonMedia} busy={busy} interaction={interaction} setPreviewMode={preview} /></LayerProperties>}
       <div className="page-properties">
          <div className="page-actions button-row"><button className="ui-button" disabled={busy} onClick={duplicatePage}>Dupliquer la page</button><button className="ui-button" disabled={busy || selectedIndex === 0} onClick={() => movePage(-1)}>↑ Monter</button><button className="ui-button" disabled={busy || selectedIndex === document.pages.length - 1} onClick={() => movePage(1)}>↓ Descendre</button><button className="ui-button danger" disabled={busy} onClick={() => deletePage(selected.id)}>Supprimer la page</button></div>

<PageBackgroundSettings page={selected} mediaById={mediaById} busy={busy} changePage={changePage} interaction={interaction} importButtonMedia={selectButtonMedia}/><StateSettings page={selected} effectBusy={busy} preview={(from,to)=>{window.document.querySelector('.editor-preview')?.scrollIntoView({block:'center',behavior:'instant'});preview('test');interaction.previewStates(from,to);}} media={document.media} changePage={changePage} busy={busy || previewMode === 'test'} />
          <div className="settings-grid">
            <section className="settings-panel"><h2>Image de la page</h2><label className="field">Nom de la page<input aria-label="Nom de la page" maxLength={200} disabled={busy} value={selected.title} onChange={event => changePage(selected.id, { title: event.target.value })} /></label>
              <ChooseImage disabled={busy} label="Choisir l’image principale dans la bibliothèque" onChoose={id=>{changePage(selected.id,{imageId:id,demoTemplate:null});interaction.reset();}}/><p className="media-name">{mediaById.get(selected.imageId)?.name || 'Aucune image importée'}</p><div className="button-row"><button className="ui-button" disabled={busy} onClick={() => selectMedia('image')}>Importer / remplacer l’image</button><button className="ui-button danger" disabled={busy || !selected.imageId} onClick={() => { changePage(selected.id, { imageId: null, demoTemplate: null }); interaction.reset(); }}>Supprimer l’image</button></div><p className="help">PNG, JPG, JPEG ou WebP. L’image est affichée sans déformation dans un cadre 16:9.</p>
              {selected.demoTemplate && <button className="ui-button subtle" disabled={busy} onClick={() => changePage(selected.id, { demoTemplate: null })}>Retirer le texte de démonstration</button>}
            </section>
            {!selectedLayer&&<section className="settings-panel"><h2>Transition vers la page suivante</h2><p className="help">Configurez les passages dans la timeline en bas de l’écran.</p><p className="media-name">{selectedPassage?.mode==='visual'?`${EFFECTS[selectedPassage.effect.type]} · ${selectedPassage.effect.duration} ms`:mediaById.get(transitionVideo(document, selected.id, document.pages[selectedIndex + 1]?.id))?.name || 'Aucune vidéo : passage direct à la page suivante.'}</p><button className="ui-button" disabled={busy} onClick={() => selectMedia('video')}>Importer / remplacer la transition MP4</button><button className="ui-button" disabled={busy || !passage(document, selected.id, document.pages[selectedIndex+1]?.id)} onClick={() => { const item=passage(document, selected.id, document.pages[selectedIndex+1]?.id); detachTransition(item.id); }}>Supprimer la transition</button></section>}
          </div>
          <section className="settings-panel variants-panel"><div className="panel-heading"><div><h2>Variantes d’image</h2><p className="help">Par exemple : Blanc, Noyer, Charbon. Les boutons apparaissent automatiquement dans le lecteur.</p></div><button className="ui-button" disabled={busy || selected.variants.length >= 100} onClick={() => selectMedia('image', null, true)}>+ Ajouter une variante</button></div>
            {!selected.variants.length && <p className="variants-empty">Aucune variante pour cette page. Ajoutez une image pour créer votre premier choix.</p>}
            <div className="variant-list">{selected.variants.map(variant => <div className="variant-row" key={variant.id}>
              <button className="variant-thumbnail" aria-label={`Prévisualiser ${variant.name}`} onClick={() => interaction.choose({ kind: 'variant', variantId: variant.id })}>{urls[variant.mediaId] && <img src={urls[variant.mediaId]} alt="" />}</button>
              <label className="field">Nom de la variante<input aria-label={`Nom de la variante ${variant.id}`} maxLength={80} value={variant.name} disabled={busy} onChange={event => changePage(selected.id, { variants: selected.variants.map(item => item.id === variant.id ? { ...item, name: event.target.value } : item) })} /></label>
              <ChooseImage disabled={busy} label={`Choisir l’image de la variante ${variant.name}`} onChoose={id=>changePage(selected.id,{variants:selected.variants.map(v=>v.id===variant.id?{...v,mediaId:id}:v)})}/><div className="button-row"><button className="ui-button" disabled={busy} onClick={() => selectMedia('image', variant.id)}>Remplacer l’image</button><button className="ui-button danger" disabled={busy} aria-label={`Supprimer la variante ${variant.name}`} onClick={() => { changePage(selected.id, { variants: selected.variants.filter(item => item.id !== variant.id) }); interaction.reset(); }}>Supprimer</button></div>
            </div>)}</div>
          </section>
       </div></>}</div></div>
      </aside>
    </div>
    {notesOpen && selected && <NotesPanel page={selected} number={selectedIndex+1} close={()=>setNotesOpen(false)} change={notes=>rawUpdate(previous=>({...previous,pages:previous.pages.map(p=>p.id===selected.id?{...p,notes}:p)}),{typingId:`notes:${selected.id}`})}/>}
    <div className="workspace-timeline" style={{height:layout.timeline}}><ResizeHandle label="Hauteur de la timeline" value={layout.timeline} min={140} max={400} axis="y" reverse change={timeline=>changeLayout({timeline})}/><Timeline presenter={chrome?.presenter} notesOpen={notesOpen} toggleNotes={()=>setNotesOpen(v=>!v)} edge={edge} setEdge={setEdge} inspectorTarget={inspectorTarget} onInspect={setTransitionPanel} document={document} urls={urls} selected={selected} select={onSelect} busy={busy} add={addPage} duplicate={duplicatePage} remove={deletePage} rename={id => { onSelect(id); window.document.querySelector('[aria-label="Nom de la page"]')?.focus(); }} move={moveTo} launch={onLaunch} chooseVideo={chooseTransition} changeEffect={(from,to,effect)=>update(previous=>({...previous,transitions:previous.transitions.map(t=>t.fromId===from && t.toId===to?{...t,effect}:t)}))} changeMode={(from,to,mode)=>chooseTransition(from,to,passage(document,from,to)?.mediaId || null,mode)} configure={(fromId,toId)=>{importTarget.current={pageId:fromId,toId,kind:'video'};mediaInput.current.accept='.mp4,.webm,video/mp4,video/webm';mediaInput.current.click();}} preview={previewPassage} detach={detachTransition} reassign={(id,fromId)=>{const toId=document.pages[document.pages.findIndex(p=>p.id===fromId)+1]?.id;update(previous=>{const old=passage(previous,fromId,toId);return {...previous,transitions:previous.transitions.map(t=>t.id===id?{...t,fromId,toId}:t.id===old?.id?{...t,fromId:null,toId:null}:t)};});}} />
    </div>
    <input hidden type="file" ref={mediaInput} data-testid="media-input" onChange={onMediaSelected} />
    <input hidden type="file" ref={zipInput} data-testid="zip-input" accept=".zip,application/zip" onChange={importZip} />
    {confirmation && <Confirmation action={confirmation} onClose={() => setConfirmation(null)} />}
  </section></ImagePickerProvider></ProjectColorsProvider>;
}
