import {FitCanvas,Icon,ResizeHandle,useWorkspace} from './Workspace.jsx';
import {pasteLayer} from './layerClipboard.js';
import TextSettings from './TextSettings.jsx';
import {buttonTextItem} from './buttonText.js';
import ButtonAppearanceSettings from './ButtonAppearanceSettings.jsx';
import VisualPreview from './VisualAnimation.jsx';
import { EFFECTS, defaultEffect, decodeImage } from './visualEffects.js';
import Timeline from './Timeline.jsx';
import { passage, transitionVideo } from './timeline.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp, createInteractiveButton, createLayer, duplicatePageModel, emptyPage, orderedLayers, readMedia, resolveBackground, uid } from './document.js';
import { LayerPanel, LayerProperties } from './LayerSettings.jsx';
import { exportPresentation, importPresentation } from './archive.js';
import { markBackupExport, requestPersistentStorage, storageEstimate } from './storage.js';
import SlideView from './SlideView.jsx';
import ButtonSettings, {PageBackgroundSettings} from './ButtonSettings.jsx';
import useSlideInteraction from './useSlideInteraction.js';
import ActionSettings, { StateSettings } from './ActionSettings.jsx';
import ActionVideo from './ActionVideo.jsx';

function Confirmation({ action, onClose }) {
  const dialog = useRef(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { dialog.current.showModal(); }, []);
  async function confirm(backup = false) {
    setWorking(true); setError('');
    try { if (backup) await action.backup(); await action.run(); onClose(); }
    catch (error) { setError(error.message); }
    finally { setWorking(false); }
  }
  return <dialog ref={dialog} className="confirmation" onCancel={event => { event.preventDefault(); if (!working) onClose(); }} aria-labelledby="confirmation-title">
    <h2 id="confirmation-title">{action.title}</h2><p>{action.message}</p>
    {error && <p role="alert">{error}</p>}
    <div className="button-row"><button className="ui-button" disabled={working} autoFocus onClick={onClose}>Annuler</button>{action.backup && <button className="ui-button" disabled={working} onClick={() => confirm(true)}>Sauvegarder mon projet puis continuer</button>}<button className="ui-button primary" disabled={working} onClick={() => confirm()}>Confirmer</button></div>
  </dialog>;
}

export default function Editor({ beginGesture, endGesture, document, urls, update, replace, recoverPrevious, hasPrevious, lastBackup, onBackup, selected, selectedIndex, onSelect, onLaunch, estimate, undo, redo, canUndo, canRedo, onBusyChange }) {
  const [layout,changeLayout]=useWorkspace();
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
  const [message, setMessage] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [selectedButtonId, storeSelectedButtonId] = useState(null);
  function setSelectedButtonId(id){storeSelectedButtonId(id);setEdge(null);if(id)requestAnimationFrame(()=>{inspector.current?.querySelector('.inspector-scroll')?.scrollTo({top:0});});}
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
  useEffect(() => { onBusyChange(!!testTransition || !!testVisual || interaction.blocked); return () => onBusyChange(false); }, [testTransition, testVisual, interaction.blocked, onBusyChange]);
  useEffect(() => { setSelectedButtonId(null);inspector.current?.querySelector('.inspector-scroll')?.scrollTo({top:0}); }, [selected?.id]);
  const mediaById = new Map(document.media.map(item => [item.id, item]));
  const selectedPassage = selected && passage(document,selected.id,document.pages[selectedIndex+1]?.id);
  const selectedLayer = selected && orderedLayers(selected).find(layer => layer.id === selectedButtonId);
  useEffect(()=>{if(!inspector.current)return;for(const detail of inspector.current.querySelectorAll('details')){const title=detail.querySelector(':scope > summary')?.textContent;if(Object.hasOwn(layout.sections,title))detail.open=!!layout.sections[title];}},[selectedButtonId,selected?.id]);

  useEffect(()=>{
    function shortcut(event){
      if(event.defaultPrevented || event.isComposing || event.repeat || event.altKey || !(event.ctrlKey||event.metaKey) || busy || confirmation || previewMode!=='position')return;
      if(!workspace.current?.contains(event.target) || event.target.closest('input,textarea,select,[contenteditable="true"],[contenteditable="plaintext-only"],[role="textbox"]'))return;
      const key=event.key.toLowerCase();if(event.shiftKey&&key!=='z')return;
      if(key==='z'||key==='y'){event.preventDefault();if(key==='y'||event.shiftKey){if(canRedo)redo();}else if(canUndo)undo();return;}
      if(['c','x'].includes(key)&&selectedLayer){event.preventDefault();clipboard.current={layer:structuredClone(selectedLayer),source:structuredClone(selected),count:0};if(key==='x')removeLayer(selectedLayer);setMessage(key==='x'?'Calque coupé.':'Calque copié.');}
      if(key==='v'&&clipboard.current&&selected){event.preventDefault();if(orderedLayers(selected).length>=500){setMessage('Limite de 500 calques par page atteinte.');return;}const copy=pasteLayer(clipboard.current,selected,document,++clipboard.current.count);
        const button=clipboard.current.layer.type==='button';changePage(selected.id,{[button?'buttons':'layers']:[...selected[button?'buttons':'layers'],copy],layerOrder:[...selected.layerOrder,copy.id]});setSelectedButtonId(copy.id);setMessage('Calque collé. Les références absentes de cette page ont été désactivées.');}
    }
    window.addEventListener('keydown',shortcut);return()=>window.removeEventListener('keydown',shortcut);
  });
  function rangeStart(event){if(event.target.matches('input[type="range"]'))beginGesture();}
  function rangeEnd(event){if(event.target.matches('input[type="range"]'))endGesture();}
  function changePage(pageId, change) {
    update(previous => ({ ...previous, pages: previous.pages.map(page => page.id === pageId ? { ...page, ...change } : page) }));
  }
  function changeButton(buttonId, change) {
    if ('target' in change && !('action' in change)) change = { ...change, action: change.target ? { type: 'background', target: change.target } : null };
    if (change.action?.type === 'background') change = { ...change, target: change.action.target };
    update(previous => ({ ...previous, pages: previous.pages.map(page => page.id === selected.id ? { ...page, buttons: page.buttons.map(button => button.id === buttonId ? { ...button, ...change } : button) } : page) }));
  }
  function preview(mode) {
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
    update(previous => ({ ...previous, pages: previous.pages.map(page => page.id !== selected.id ? page : {
      ...page, layers: page.layers.map(layer => layer.id === layerId ? { ...layer, ...change, ...(layer.type === 'text' && !options.autoMeasure && change.height !== undefined && Math.abs(change.height - layer.height) > .00001 ? { textStyle: { ...layer.textStyle, ...change.textStyle, autoHeight: false, preset: 'custom' } } : {}) } : layer), buttons: page.buttons.map(button => button.id === layerId ? { ...button, ...change } : button),
    }) }), options);
  }
  function addLayer(type) {
    if (orderedLayers(selected).length >= 500) { setMessage('Limite de 500 calques par page atteinte.'); return; }
    const layer = type === 'button' ? createInteractiveButton(selected.buttons.length + 1) : createLayer(type, selected.layers.length + 1);
    changePage(selected.id, type === 'button' ? { buttons: [...selected.buttons, layer] } : { layers: [...selected.layers, layer], layerOrder: [...selected.layerOrder, layer.id] });
    setSelectedButtonId(layer.id); setPreviewMode('position');
  }
  function duplicateLayer(layer) {
    if (orderedLayers(selected).length >= 500) { setMessage('Limite de 500 calques par page atteinte.'); return; }
    const copy = { ...layer, id: uid(), name: `${layer.name.slice(0, 70)} (copie)`, x: clamp(layer.x + .03, 0, 1 - layer.width), y: clamp(layer.y + .03, 0, 1 - layer.height) };
    const key = layer.type === 'button' ? 'buttons' : 'layers';
    if (key === 'buttons') {delete copy.type;copy.defaultSelected=false;}
    const order = [...selected.layerOrder];
    order.splice(order.indexOf(layer.id) + 1, 0, copy.id);
    changePage(selected.id, { [key]: [...selected[key], copy], layerOrder: order });
    setSelectedButtonId(copy.id);
  }
  function removeLayer(layer) {
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
  function addPage(position = document.pages.length) {
    if (document.pages.length >= 500) { setMessage('Limite de 500 diapositives atteinte.'); return; }
    const page = emptyPage(document.pages.length + 1);
    update(previous => ({ ...previous, pages: [...previous.pages.slice(0, position), page, ...previous.pages.slice(position)] }));
    onSelect(page.id);
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
  async function onMediaSelected(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    const target = importTarget.current;
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
          if (target.role === 'buttonImage' || target.role === 'buttonBackground') return { ...page, buttons: page.buttons.map(button => button.id === target.buttonId ? { ...button, ...(target.role === 'buttonImage' ? { imageId: media.id } : { target: { kind: 'media', mediaId: media.id }, action: { type: 'background', target: { kind: 'media', mediaId: media.id } } }) } : button) };
          if (target.addVariant) return { ...page, variants: [...page.variants, { id: uid(), name: `Variante ${page.variants.length + 1}`, mediaId: media.id }] };
          if (target.variantId) return { ...page, variants: page.variants.map(variant => variant.id === target.variantId ? { ...variant, mediaId: media.id } : variant) };
          return target.kind === 'video' ? { ...page, transitionId: media.id } : { ...page, imageId: media.id, demoTemplate: null };
        }),
      }));
      interaction.reset();
      if (newLayer) { setSelectedButtonId(newLayer.id); setPreviewMode('position'); }
      setMessage('Média importé.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
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
    catch(error){if(previewRun.current===token)setMessage(error.message);}
    finally { if(previewRun.current===token){previewRun.current=null;setBusy(false);} }
  }
  async function exportZip() {
    setBusy(true);
    setMessage('Préparation du ZIP…');
    try { await downloadBackup(); setMessage('Sauvegarde ZIP générée. Conservez le fichier téléchargé dans un endroit sûr.'); }
    catch (error) { setMessage(error.message || 'L’export n’a pas abouti. Vérifiez la mémoire disponible et réessayez.'); }
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
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  return <section ref={workspace} tabIndex={-1} className="editor" aria-label="Éditeur de présentation" onPointerDownCapture={rangeStart} onPointerUpCapture={rangeEnd} onPointerCancelCapture={rangeEnd} onFocusCapture={event=>{if(event.target.matches('input[type="color"]'))beginGesture();}} onBlurCapture={event=>{if(event.target.matches('input[type="range"],input[type="color"]'))endGesture();}} onKeyDownCapture={event=>{if(event.target.matches('input[type="range"]')&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))beginGesture();}} onKeyUpCapture={event=>{if(event.target.matches('input[type="range"]'))endGesture();}}>
    <div className="workspace-topbar"><div className="workspace-document"><span className="workspace-document-icon">▱</span><strong>{document.title || 'Ma présentation'}</strong><small>{document.pages.length} diapositives</small></div><div className="button-row"><button className="ui-button" disabled={busy || !canUndo} title="Annuler (Ctrl+Z / Cmd+Z)" onClick={undo}>↶ Annuler</button><button className="ui-button" disabled={busy || !canRedo} title="Rétablir (Ctrl+Y / Ctrl+Maj+Z / Cmd+Maj+Z)" onClick={redo}>↷ Rétablir</button><button className="ui-button primary" disabled={busy || !document.pages.length} onClick={onLaunch}>▶ Lancer la présentation</button></div></div>
    <div className="document-tools"><div className="button-row"><button className="ui-button primary" disabled={busy} onClick={exportZip}>Sauvegarder mon projet</button><button className="ui-button" disabled={busy} onClick={() => zipInput.current.click()}>↑ Importer un ZIP</button><button className="ui-button" disabled={busy} onClick={protectStorage}>Protéger le stockage local</button></div><span>{document.pages.length} page(s) · {Math.round(document.media.reduce((sum, item) => sum + item.blob.size, 0) / 1024 / 1024 * 10) / 10} Mo de médias{estimate?.quota ? ` · ${Math.round((estimate.quota - estimate.usage) / 1024 / 1024)} Mo disponibles` : ''}</span></div>
    <p className="help backup-reminder">{lastBackup ? `Dernier ZIP généré : ${new Date(lastBackup).toLocaleString('fr-CA')}. Vérifiez que le fichier est conservé.` : 'Aucune sauvegarde ZIP enregistrée. Sauvegardez votre projet à la fin de chaque séance et avant une mise à jour.'} Vos médias restent dans ce navigateur.</p>
    {hasPrevious && <button className="ui-button subtle" disabled={busy} onClick={() => setConfirmation({ title: 'Récupérer le projet précédent ?', message: 'La copie locale créée avant la dernière restauration sera rétablie. Sauvegardez le projet actuel en ZIP si vous souhaitez le conserver.', backup: downloadBackup, run: async () => { await recoverPrevious(); onSelect(null); setSelectedButtonId(null); interaction.reset(); setMessage('Projet précédent récupéré.'); } })}>Récupérer le projet précédent</button>}
    {document.pages.flatMap(p=>p.buttons.filter(b=>b.action?.missingPageId && !b.action.pageId).map(b=><div className="editor-message" role="status" key={b.id}>⚠ {p.title} · {b.name} : la diapositive cible a été supprimée. Choisissez une nouvelle destination dans les propriétés du bouton.</div>))}
    {message && <div className="editor-message" role="status">{message}</div>}

    <div className={`editor-layout workspace-shell ${layout.leftOpen?'':'left-closed'}`} style={{'--left-panel':`${layout.leftOpen?layout.left:0}px`,'--right-panel':`${layout.right}px`,'--timeline-height':`${layout.timeline}px`}}>
      <nav className="workspace-tools" role="toolbar" aria-orientation="vertical" aria-label="Outils de création">
       <button title="Sélectionner et positionner" aria-label="Outil Sélection" disabled={busy} aria-pressed={previewMode==='position'&&!selectedLayer} onClick={()=>{preview('position');setSelectedButtonId(null);}}><Icon name="select"/></button>
       {selected&&[['text','Texte','text'],['image','Image','image'],['rectangle','Rectangle','shape'],['circle','Cercle','circle'],['line','Ligne','line'],['button','Bouton','button']].map(([type,name,icon])=><button key={type} aria-label={`+ ${name}`} title={`Ajouter ${name.toLowerCase()}`} disabled={busy} aria-pressed={selectedLayer?.type===type} onClick={()=>type==='image'?importLayerImage():addLayer(type)}><Icon name={icon}/></button>)}
       <span className="tool-divider"/>
       <button title="Afficher ou fermer les calques" aria-label="Panneau Calques" aria-pressed={layout.leftOpen&&leftTab==='layers'} onClick={()=>{setLeftTab('layers');changeLayout({leftOpen:!layout.leftOpen||leftTab!=='layers'});}}><Icon name="layers"/></button>
       <button title="Médias et ressources du projet" aria-label="Panneau Médias" aria-pressed={layout.leftOpen&&leftTab==='media'} onClick={()=>{setLeftTab('media');changeLayout({leftOpen:!layout.leftOpen||leftTab!=='media'});}}><Icon name="media"/></button>
       <button title="Paramètres de la diapositive" aria-label="Paramètres de la diapositive" onClick={()=>{setSelectedButtonId(null);inspector.current?.querySelector('.page-actions')?.scrollIntoView({block:'start'});}}><Icon name="page"/></button>
       <button title="États et visibilité des calques" aria-label="Panneau États" onClick={()=>{inspector.current?.querySelector('.states-panel')?.scrollIntoView({block:'start'});}}><Icon name="states"/></button>
      </nav>
      <aside className="page-sidebar workspace-left" aria-label="Pages et calques" hidden={!layout.leftOpen}>
       <div className="panel-heading"><strong>{leftTab==='layers'?'Calques':'Ressources'}</strong><button aria-label="Fermer le panneau gauche" onClick={()=>changeLayout({leftOpen:false})}>×</button></div>
       {leftTab==='layers'?selected&&<LayerPanel move={(id,target)=>{const order=[...selected.layerOrder],from=order.indexOf(id),to=order.indexOf(target);if(from>=0&&to>=0&&from!==to){order.splice(from,1);order.splice(to,0,id);changePage(selected.id,{layerOrder:order});}}} rename={id=>{setSelectedButtonId(id);requestAnimationFrame(()=>inspector.current?.querySelector('[aria-label="Nom du calque"]')?.focus());}} page={selected} selectedId={selectedButtonId} onSelect={id=>{setSelectedButtonId(id);setPreviewMode('position');}} change={changeLayer} disabled={busy}/>:<div className="resource-list">{document.media.map(media=><div key={media.id}>{media.type.startsWith('image/')?<img src={urls[media.id]} alt="" loading="lazy"/>:<Icon name="media"/>}<span>{media.name}<small>{media.type} · {(media.blob.size/1024/1024).toFixed(1)} Mo</small></span></div>)}</div>}
      </aside>
      <ResizeHandle label="Largeur du panneau gauche" value={layout.left} min={160} max={340} change={left=>changeLayout({left})}/>
      <div className="editor-workspace">
        {!selected ? <div className="empty-editor"><span>▧</span><h2>Votre première page vous attend.</h2><p>Ajoutez une page, puis importez votre image.</p><button className="ui-button primary" disabled={busy} onClick={() => addPage()}>Ajouter une page</button></div> : <>
          <div className="preview-heading"><span>Aperçu · Page {selectedIndex + 1}</span><span>16:9</span></div>
          <div className="preview-controls">{previewMode === 'test' && <button className="ui-button" onClick={() => preview('position')}>Revenir au mode édition</button>}<div className="mode-tabs"><button aria-pressed={previewMode === 'position'} disabled={busy} onClick={() => preview('position')}>Positionner les boutons</button><button aria-pressed={previewMode === 'test'} disabled={busy} onClick={() => preview('test')}>Tester les interactions</button></div><button className="ui-button subtle" onClick={interaction.reset}>Afficher l’arrière-plan par défaut</button></div>
          <div className="layer-studio"><FitCanvas zoom={layout.zoom} change={zoom=>changeLayout({zoom})}><div className="stage editor-preview" onPointerDown={event=>{if(event.target===event.currentTarget||event.target.classList.contains('slide-background'))setSelectedButtonId(null);}}><SlideView page={selected} urls={urls} interaction={interaction} onBackgroundReady={testBackgroundReady} number={selectedIndex + 1} total={document.pages.length} buttonEditing={{ editing: previewMode === 'position', selectedButtonId, onSelect: setSelectedButtonId, onGeometryChange: changeLayer, disabled: editorBusy }} />{interaction.video && <ActionVideo key={interaction.video.id} playback={interaction.video} urls={urls} finish={interaction.finishVideo} stop={interaction.stopVideo} />}{testVisual && <VisualPreview playback={testVisual} urls={urls} total={document.pages.length} finish={error=>error?testNavigation.current?.reject(error):testNavigation.current?.resolve()} cancel={()=>testNavigation.current?.cancel(new Error('Animation annulée.'))}/ >}{testTransition && <ActionVideo key={testTransition.id} playback={testTransition} urls={urls} finish={(id, error) => error ? testNavigation.current?.reject(new Error('La transition spécifique ne peut pas être lue.')) : testNavigation.current?.resolve()} stop={() => testNavigation.current?.cancel(new Error('Navigation de test annulée.'))} />}</div>
          <div className="preview-help"><p className="help preview-hint">{previewMode === 'position' ? 'Glissez un calque pour le déplacer, ses poignées pour le redimensionner et ↻ pour le faire pivoter.' : 'Testez vos boutons et arrière-plans. Les calques restent fixes.'}</p></div></FitCanvas></div>{interaction.notice && <p className="editor-message" role="status">{interaction.notice}</p>}

        </>}
      </div>
      <ResizeHandle label="Largeur des propriétés" value={layout.right} min={280} max={520} reverse change={right=>changeLayout({right})}/>
      <aside className="workspace-inspector" aria-label="Inspecteur des propriétés" ref={inspector}>
       <div className="inspector-heading"><span>PROPRIÉTÉS</span><strong>{transitionPanel?'Transition':selectedLayer?selectedLayer.name:selected?.title||'Diapositive'}</strong></div>
       <div className="inspector-scroll" onToggleCapture={event=>{const d=event.target;if(d.tagName==='DETAILS'){const title=d.querySelector(':scope > summary')?.textContent;if(title)changeLayout(old=>({sections:{...old.sections,[title]:d.open}}));}}}>
       <div ref={setInspectorTarget} className="transition-inspector"/>
       <div hidden={transitionPanel}>{selected&&<>
{selectedLayer&&<LayerProperties layer={selectedLayer} change={changeLayer} duplicate={duplicateLayer} remove={removeLayer} reorder={reorderLayer} importImage={importLayerImage} media={document.media} busy={busy || previewMode === 'test'}>{selectedLayer?.type === 'button' && <><details className="property-section" open><summary>Texte</summary><TextSettings item={buttonTextItem(selectedLayer)} busy={busy || previewMode === 'test'} buttonMode change={(id,patch,options)=>changeLayer(id,{labelText:{content:buttonTextItem(selectedLayer).content,color:buttonTextItem(selectedLayer).color,textStyle:buttonTextItem(selectedLayer).textStyle,...patch}},options)}/></details><ButtonAppearanceSettings key={selectedLayer.id} button={selectedLayer} page={selected} changeButton={changeButton} changePage={changePage} test={testButton} busy={busy || previewMode === 'test'}/><ActionSettings button={selectedLayer} page={selected} document={document} changeButton={changeButton} importMedia={selectButtonMedia} test={testButton} busy={busy || previewMode === 'test'} /></>}          <ButtonSettings compact page={selected} urls={urls} mediaById={mediaById} selectedButtonId={selectedButtonId} onSelect={setSelectedButtonId} changePage={changePage} changeButton={changeButton} importButtonMedia={selectButtonMedia} busy={busy} interaction={interaction} setPreviewMode={preview} /></LayerProperties>}
       <div className="page-properties">
          <div className="page-actions button-row"><button className="ui-button" disabled={busy} onClick={duplicatePage}>Dupliquer la page</button><button className="ui-button" disabled={busy || selectedIndex === 0} onClick={() => movePage(-1)}>↑ Monter</button><button className="ui-button" disabled={busy || selectedIndex === document.pages.length - 1} onClick={() => movePage(1)}>↓ Descendre</button><button className="ui-button danger" disabled={busy} onClick={() => deletePage(selected.id)}>Supprimer la page</button></div>

<PageBackgroundSettings page={selected} mediaById={mediaById} busy={busy} changePage={changePage} interaction={interaction} importButtonMedia={selectButtonMedia}/><StateSettings page={selected} effectBusy={busy} preview={(from,to)=>{window.document.querySelector('.editor-preview')?.scrollIntoView({block:'center',behavior:'instant'});preview('test');interaction.previewStates(from,to);}} media={document.media} changePage={changePage} busy={busy || previewMode === 'test'} />
          <div className="settings-grid">
            <section className="settings-panel"><h2>Image de la page</h2><label className="field">Nom de la page<input aria-label="Nom de la page" maxLength={200} disabled={busy} value={selected.title} onChange={event => changePage(selected.id, { title: event.target.value })} /></label>
              <p className="media-name">{mediaById.get(selected.imageId)?.name || 'Aucune image importée'}</p><div className="button-row"><button className="ui-button" disabled={busy} onClick={() => selectMedia('image')}>Importer / remplacer l’image</button><button className="ui-button danger" disabled={busy || !selected.imageId} onClick={() => { changePage(selected.id, { imageId: null, demoTemplate: null }); interaction.reset(); }}>Supprimer l’image</button></div><p className="help">PNG, JPG, JPEG ou WebP. L’image est affichée sans déformation dans un cadre 16:9.</p>
              {selected.demoTemplate && <button className="ui-button subtle" disabled={busy} onClick={() => changePage(selected.id, { demoTemplate: null })}>Retirer le texte de démonstration</button>}
            </section>
            {!selectedLayer&&<section className="settings-panel"><h2>Transition vers la page suivante</h2><p className="help">Configurez les passages dans la timeline en bas de l’écran.</p><p className="media-name">{selectedPassage?.mode==='visual'?`${EFFECTS[selectedPassage.effect.type]} · ${selectedPassage.effect.duration} ms`:mediaById.get(transitionVideo(document, selected.id, document.pages[selectedIndex + 1]?.id))?.name || 'Aucune vidéo : passage direct à la page suivante.'}</p><button className="ui-button" disabled={busy} onClick={() => selectMedia('video')}>Importer / remplacer la transition MP4</button><button className="ui-button" disabled={busy || !passage(document, selected.id, document.pages[selectedIndex+1]?.id)} onClick={() => { const item=passage(document, selected.id, document.pages[selectedIndex+1]?.id); detachTransition(item.id); }}>Supprimer la transition</button></section>}
          </div>
          <section className="settings-panel variants-panel"><div className="panel-heading"><div><h2>Variantes d’image</h2><p className="help">Par exemple : Blanc, Noyer, Charbon. Les boutons apparaissent automatiquement dans le lecteur.</p></div><button className="ui-button" disabled={busy || selected.variants.length >= 100} onClick={() => selectMedia('image', null, true)}>+ Ajouter une variante</button></div>
            {!selected.variants.length && <p className="variants-empty">Aucune variante pour cette page. Ajoutez une image pour créer votre premier choix.</p>}
            <div className="variant-list">{selected.variants.map(variant => <div className="variant-row" key={variant.id}>
              <button className="variant-thumbnail" aria-label={`Prévisualiser ${variant.name}`} onClick={() => interaction.choose({ kind: 'variant', variantId: variant.id })}>{urls[variant.mediaId] && <img src={urls[variant.mediaId]} alt="" />}</button>
              <label className="field">Nom de la variante<input aria-label={`Nom de la variante ${variant.id}`} maxLength={80} value={variant.name} disabled={busy} onChange={event => changePage(selected.id, { variants: selected.variants.map(item => item.id === variant.id ? { ...item, name: event.target.value } : item) })} /></label>
              <div className="button-row"><button className="ui-button" disabled={busy} onClick={() => selectMedia('image', variant.id)}>Remplacer l’image</button><button className="ui-button danger" disabled={busy} aria-label={`Supprimer la variante ${variant.name}`} onClick={() => { changePage(selected.id, { variants: selected.variants.filter(item => item.id !== variant.id) }); interaction.reset(); }}>Supprimer</button></div>
            </div>)}</div>
          </section>
       </div></>}</div></div>
      </aside>
    </div>
    <div className="workspace-timeline" style={{height:layout.timeline}}><ResizeHandle label="Hauteur de la timeline" value={layout.timeline} min={140} max={400} axis="y" reverse change={timeline=>changeLayout({timeline})}/><Timeline edge={edge} setEdge={setEdge} inspectorTarget={inspectorTarget} onInspect={setTransitionPanel} document={document} urls={urls} selected={selected} select={onSelect} busy={busy} add={addPage} duplicate={duplicatePage} remove={deletePage} rename={id => { onSelect(id); window.document.querySelector('[aria-label="Nom de la page"]')?.focus(); }} move={moveTo} launch={onLaunch} chooseVideo={chooseTransition} changeEffect={(from,to,effect)=>update(previous=>({...previous,transitions:previous.transitions.map(t=>t.fromId===from && t.toId===to?{...t,effect}:t)}))} changeMode={(from,to,mode)=>chooseTransition(from,to,passage(document,from,to)?.mediaId || null,mode)} configure={(fromId,toId)=>{importTarget.current={pageId:fromId,toId,kind:'video'};mediaInput.current.accept='.mp4,.webm,video/mp4,video/webm';mediaInput.current.click();}} preview={previewPassage} detach={detachTransition} reassign={(id,fromId)=>{const toId=document.pages[document.pages.findIndex(p=>p.id===fromId)+1]?.id;update(previous=>{const old=passage(previous,fromId,toId);return {...previous,transitions:previous.transitions.map(t=>t.id===id?{...t,fromId,toId}:t.id===old?.id?{...t,fromId:null,toId:null}:t)};});}} />
    </div>
    <input hidden type="file" ref={mediaInput} data-testid="media-input" onChange={onMediaSelected} />
    <input hidden type="file" ref={zipInput} data-testid="zip-input" accept=".zip,application/zip" onChange={importZip} />
    {confirmation && <Confirmation action={confirmation} onClose={() => setConfirmation(null)} />}
  </section>;
}
