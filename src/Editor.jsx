import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp, createInteractiveButton, createLayer, duplicatePageModel, emptyPage, orderedLayers, readMedia, resolveBackground, uid } from './document.js';
import { LayerPanel, LayerProperties, LayerToolbar } from './LayerSettings.jsx';
import { exportPresentation, importPresentation } from './archive.js';
import { markBackupExport, requestPersistentStorage, storageEstimate } from './storage.js';
import SlideView from './SlideView.jsx';
import ButtonSettings from './ButtonSettings.jsx';
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

export default function Editor({ document, urls, update, replace, recoverPrevious, hasPrevious, lastBackup, onBackup, selected, selectedIndex, onSelect, onLaunch, estimate, undo, redo, canUndo, canRedo, onBusyChange }) {
  const mediaInput = useRef(null);
  const zipInput = useRef(null);
  const importTarget = useRef(null);
  const [mediaBusy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [selectedButtonId, setSelectedButtonId] = useState(null);
  const [previewMode, setPreviewMode] = useState('position');
  const interaction = useSlideInteraction(selected, { urls, onNavigate: testNavigate });
  const testNavigation = useRef(null);
  const testOrigin = useRef(null);
  const renderedPage = useRef(null);
  const testBackgroundReady = useCallback(result => {
    const pending = renderedPage.current;
    if (pending?.pageId === result.pageId && pending.source === result.source) {
      renderedPage.current = null;
      result.ready ? pending.resolve() : pending.reject(new Error('L’image de destination ne peut pas être lue.'));
    }
  }, []);
  const [testTransition, setTestTransition] = useState(null);
  const busy = mediaBusy || !!testTransition || interaction.blocked;
  const editorBusy = busy;
  useEffect(() => { onBusyChange(!!testTransition || interaction.blocked); return () => onBusyChange(false); }, [testTransition, interaction.blocked, onBusyChange]);
  useEffect(() => { setSelectedButtonId(null); }, [selected?.id]);
  const mediaById = new Map(document.media.map(item => [item.id, item]));
  const selectedLayer = selected && orderedLayers(selected).find(layer => layer.id === selectedButtonId);

  function changePage(pageId, change) {
    update(previous => ({ ...previous, pages: previous.pages.map(page => page.id === pageId ? { ...page, ...change } : page) }));
  }
  function changeButton(buttonId, change) {
    if ('target' in change && !('action' in change)) change = { ...change, action: change.target ? { type: 'background', target: change.target } : null };
    if (change.action?.type === 'background') change = { ...change, target: change.action.target };
    update(previous => ({ ...previous, pages: previous.pages.map(page => page.id === selected.id ? { ...page, buttons: page.buttons.map(button => button.id === buttonId ? { ...button, ...change } : button) } : page) }));
  }
  function preview(mode) {
    if (mode === 'position') { interaction.resetAll(); testNavigation.current?.reject?.(new Error('Test terminé.')); renderedPage.current?.resolve(); renderedPage.current = null; setTestTransition(null); testNavigation.current = null; if (testOrigin.current && document.pages.some(page => page.id === testOrigin.current)) onSelect(testOrigin.current); }
    if (mode === 'test' && previewMode !== 'test') testOrigin.current = selected?.id;
    setPreviewMode(mode);
  }
  async function testNavigate(pageId, transitionId) {
    const page = document.pages.find(page => page.id === pageId);
    if (!page) throw new Error('Cette page de destination n’existe plus.');
    if (testNavigation.current) throw new Error('Une navigation est déjà en cours.');
    const operation = {};
    testNavigation.current = operation;
    try {
      if (urls[transitionId]) {
        await new Promise((resolve, reject) => {
          Object.assign(operation, { resolve, reject });
          setTestTransition({ id: uid(), page: selected, action: { videoId: transitionId, block: true } });
        });
      }
      const src = urls[resolveBackground(page, interaction.forPage(page).target)];
      if (src) { const image = new Image(); image.src = src; await image.decode(); }
      if (testNavigation.current !== operation) return;
      const rendered = pageId === selected.id ? Promise.resolve() : new Promise((resolve, reject) => { renderedPage.current = { pageId, source: src, resolve, reject }; });
      onSelect(pageId);
      await rendered;
    } catch (error) {
      if (testNavigation.current === operation) onSelect(selected.id);
      throw error;
    } finally {
      if (testNavigation.current === operation) { setTestTransition(null); testNavigation.current = null; }
    }
  }
  function testButton(button) { preview('test'); interaction.activateButton(button); }
  function changeLayer(layerId, change) {
    update(previous => ({ ...previous, pages: previous.pages.map(page => page.id !== selected.id ? page : {
      ...page, layers: page.layers.map(layer => layer.id === layerId ? { ...layer, ...change } : layer), buttons: page.buttons.map(button => button.id === layerId ? { ...button, ...change } : button),
    }) }));
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
    if (key === 'buttons') delete copy.type;
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
  function addPage() {
    const page = emptyPage(document.pages.length + 1);
    update(previous => ({ ...previous, pages: [...previous.pages, page] }));
    onSelect(page.id);
    setMessage('Page ajoutée. Importez son image pour commencer.');
  }
  function duplicatePage() {
    const copy = duplicatePageModel(selected);
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
      const space = await storageEstimate();
      if (space?.quota && file.size > space.quota - space.usage) throw new Error('Espace insuffisant pour ce média. Exportez un ZIP et libérez de l’espace avant de réessayer.');
      const media = await readMedia(file, target.kind);
      const newLayer = target.role === 'layerImage' && !target.buttonId ? { ...createLayer('image', selected.layers.length + 1), name: file.name.slice(0, 80), imageId: media.id } : null;
      update(previous => ({
        ...previous,
        media: [...previous.media, media],
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

  return <section className="editor" aria-label="Éditeur de présentation">
    <div className="editor-heading"><div><span className="eyebrow">VOTRE ESPACE DE CRÉATION</span><h1>Composez votre présentation.</h1><p>Ajoutez vos images, choisissez vos transitions, puis présentez.</p></div><button className="ui-button primary" disabled={busy || !document.pages.length} onClick={onLaunch}>▶ Lancer la présentation</button></div>
    <div className="document-tools"><div className="button-row"><button className="ui-button primary" disabled={busy} onClick={exportZip}>Sauvegarder mon projet</button><button className="ui-button" disabled={busy} onClick={() => zipInput.current.click()}>↑ Importer un ZIP</button><button className="ui-button" disabled={busy} onClick={protectStorage}>Protéger le stockage local</button></div><span>{document.pages.length} page(s) · {Math.round(document.media.reduce((sum, item) => sum + item.blob.size, 0) / 1024 / 1024 * 10) / 10} Mo de médias{estimate?.quota ? ` · ${Math.round((estimate.quota - estimate.usage) / 1024 / 1024)} Mo disponibles` : ''}</span></div>
    <p className="help backup-reminder">{lastBackup ? `Dernier ZIP généré : ${new Date(lastBackup).toLocaleString('fr-CA')}. Vérifiez que le fichier est conservé.` : 'Aucune sauvegarde ZIP enregistrée. Sauvegardez votre projet à la fin de chaque séance et avant une mise à jour.'} Vos médias restent dans ce navigateur.</p>
    {hasPrevious && <button className="ui-button subtle" disabled={busy} onClick={() => setConfirmation({ title: 'Récupérer le projet précédent ?', message: 'La copie locale créée avant la dernière restauration sera rétablie. Sauvegardez le projet actuel en ZIP si vous souhaitez le conserver.', backup: downloadBackup, run: async () => { await recoverPrevious(); onSelect(null); setSelectedButtonId(null); interaction.reset(); setMessage('Projet précédent récupéré.'); } })}>Récupérer le projet précédent</button>}
    {message && <div className="editor-message" role="status">{message}</div>}
    {selected && <LayerToolbar disabled={busy} add={addLayer} importImage={() => importLayerImage()} undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} />}
    <div className="editor-layout">
      <aside className="page-sidebar" aria-label="Pages et calques">{selected && <LayerPanel page={selected} selectedId={selectedButtonId} onSelect={id => { setSelectedButtonId(id); setPreviewMode('position'); }} change={changeLayer} disabled={busy} />}<details className="pages-details" open><summary>Pages · {document.pages.length}</summary><button className="ui-button add-page" disabled={busy} onClick={addPage}>+ Ajouter une page</button>
        <ol className="page-list">{document.pages.map((page, index) => <li key={page.id}><button className={`page-thumbnail ${page.id === selected?.id ? 'selected' : ''}`} disabled={busy} aria-label={`Sélectionner la page ${index + 1} : ${page.title}`} aria-current={page.id === selected?.id ? 'true' : undefined} onClick={() => onSelect(page.id)}>
          <div className="thumbnail-image">{urls[resolveBackground(page, page.defaultBackground)] ? <img src={urls[resolveBackground(page, page.defaultBackground)]} alt="" /> : <span>▧</span>}<span className="thumbnail-number">{index + 1}</span>{page.transitionId && <span className="video-badge">▶</span>}</div><span className="thumbnail-title">{page.title || 'Page sans nom'}</span>
        </button></li>)}</ol></details>
      </aside>
      <div className="editor-workspace">
        {!selected ? <div className="empty-editor"><span>▧</span><h2>Votre première page vous attend.</h2><p>Ajoutez une page, puis importez votre image.</p><button className="ui-button primary" disabled={busy} onClick={addPage}>Ajouter une page</button></div> : <>
          <div className="preview-heading"><span>Aperçu · Page {selectedIndex + 1}</span><span>16:9</span></div>
          <div className="preview-controls">{previewMode === 'test' && <button className="ui-button" onClick={() => preview('position')}>Revenir au mode édition</button>}<div className="mode-tabs"><button aria-pressed={previewMode === 'position'} disabled={busy} onClick={() => preview('position')}>Positionner les boutons</button><button aria-pressed={previewMode === 'test'} disabled={busy} onClick={() => preview('test')}>Tester les interactions</button></div><button className="ui-button subtle" onClick={interaction.reset}>Afficher l’arrière-plan par défaut</button></div>
          <div className="layer-studio"><div className="layer-canvas"><div className="stage editor-preview"><SlideView page={selected} urls={urls} interaction={interaction} onBackgroundReady={testBackgroundReady} number={selectedIndex + 1} total={document.pages.length} buttonEditing={{ editing: previewMode === 'position', selectedButtonId, onSelect: setSelectedButtonId, onGeometryChange: changeLayer, disabled: editorBusy }} />{interaction.video && <ActionVideo key={interaction.video.id} playback={interaction.video} urls={urls} finish={interaction.finishVideo} stop={interaction.stopVideo} />}{testTransition && <ActionVideo key={testTransition.id} playback={testTransition} urls={urls} finish={(id, error) => error ? testNavigation.current?.reject(new Error('La transition spécifique ne peut pas être lue.')) : testNavigation.current?.resolve()} stop={() => testNavigation.current?.reject(new Error('Navigation de test annulée.'))} />}</div>
          <div className="preview-help"><p className="help preview-hint">{previewMode === 'position' ? 'Glissez un calque pour le déplacer, ses poignées pour le redimensionner et ↻ pour le faire pivoter.' : 'Testez vos boutons et arrière-plans. Les calques restent fixes.'}</p></div></div><LayerProperties layer={selectedLayer} change={changeLayer} duplicate={duplicateLayer} remove={removeLayer} reorder={reorderLayer} importImage={importLayerImage} media={document.media} busy={busy || previewMode === 'test'}>{selectedLayer?.type === 'button' && <ActionSettings button={selectedLayer} page={selected} document={document} changeButton={changeButton} importMedia={selectButtonMedia} test={testButton} busy={busy || previewMode === 'test'} />}</LayerProperties></div>{interaction.notice && <p className="editor-message" role="status">{interaction.notice}</p>}
          <div className="page-actions button-row"><button className="ui-button" disabled={busy} onClick={duplicatePage}>Dupliquer la page</button><button className="ui-button" disabled={busy || selectedIndex === 0} onClick={() => movePage(-1)}>↑ Monter</button><button className="ui-button" disabled={busy || selectedIndex === document.pages.length - 1} onClick={() => movePage(1)}>↓ Descendre</button><button className="ui-button danger" disabled={busy} onClick={() => setConfirmation({ title: 'Supprimer cette page ?', message: `La page « ${selected.title} » sera supprimée, ainsi que ses médias non utilisés par d’autres pages.`, backup: downloadBackup, run: () => {
            update(previous => ({ ...previous, pages: previous.pages.filter(page => page.id !== selected.id) }));
            onSelect(document.pages[selectedIndex + 1]?.id || document.pages[selectedIndex - 1]?.id || null);
            setMessage('Page supprimée.');
          } })}>Supprimer la page</button></div>
          <ButtonSettings page={selected} urls={urls} mediaById={mediaById} selectedButtonId={selectedButtonId} onSelect={setSelectedButtonId} changePage={changePage} changeButton={changeButton} importButtonMedia={selectButtonMedia} busy={busy} interaction={interaction} setPreviewMode={preview} />
          <StateSettings page={selected} media={document.media} changePage={changePage} busy={busy || previewMode === 'test'} />
          <div className="settings-grid">
            <section className="settings-panel"><h2>Image de la page</h2><label className="field">Nom de la page<input aria-label="Nom de la page" maxLength={200} disabled={busy} value={selected.title} onChange={event => changePage(selected.id, { title: event.target.value })} /></label>
              <p className="media-name">{mediaById.get(selected.imageId)?.name || 'Aucune image importée'}</p><div className="button-row"><button className="ui-button" disabled={busy} onClick={() => selectMedia('image')}>Importer / remplacer l’image</button><button className="ui-button danger" disabled={busy || !selected.imageId} onClick={() => { changePage(selected.id, { imageId: null, demoTemplate: null }); interaction.reset(); }}>Supprimer l’image</button></div><p className="help">PNG, JPG, JPEG ou WebP. L’image est affichée sans déformation dans un cadre 16:9.</p>
              {selected.demoTemplate && <button className="ui-button subtle" disabled={busy} onClick={() => changePage(selected.id, { demoTemplate: null })}>Retirer le texte de démonstration</button>}
            </section>
            <section className="settings-panel"><h2>Transition vers la page suivante</h2><p className="help">{document.pages[selectedIndex + 1] ? `Vers « ${document.pages[selectedIndex + 1].title} »` : 'Dernière page : la transition sera utilisée si vous ajoutez une page après celle-ci.'}</p>
              {urls[selected.transitionId] ? <video className="video-preview" aria-label="Aperçu de la transition" src={urls[selected.transitionId]} controls muted playsInline preload="metadata" /> : <div className="cut-placeholder">↦ Passage direct — sans effet</div>}
              <p className="media-name">{mediaById.get(selected.transitionId)?.name || 'Aucune vidéo : passage direct à la page suivante.'}</p><div className="button-row"><button className="ui-button" disabled={busy} onClick={() => selectMedia('video')}>Importer / remplacer la transition MP4</button><button className="ui-button danger" disabled={busy || !selected.transitionId} onClick={() => changePage(selected.id, { transitionId: null })}>Supprimer la transition</button></div><p className="help">MP4 ou WebM. Lecture automatique sans son dans la présentation.</p>
            </section>
          </div>
          <section className="settings-panel variants-panel"><div className="panel-heading"><div><h2>Variantes d’image</h2><p className="help">Par exemple : Blanc, Noyer, Charbon. Les boutons apparaissent automatiquement dans le lecteur.</p></div><button className="ui-button" disabled={busy || selected.variants.length >= 100} onClick={() => selectMedia('image', null, true)}>+ Ajouter une variante</button></div>
            {!selected.variants.length && <p className="variants-empty">Aucune variante pour cette page. Ajoutez une image pour créer votre premier choix.</p>}
            <div className="variant-list">{selected.variants.map(variant => <div className="variant-row" key={variant.id}>
              <button className="variant-thumbnail" aria-label={`Prévisualiser ${variant.name}`} onClick={() => interaction.choose({ kind: 'variant', variantId: variant.id })}>{urls[variant.mediaId] && <img src={urls[variant.mediaId]} alt="" />}</button>
              <label className="field">Nom de la variante<input aria-label={`Nom de la variante ${variant.id}`} maxLength={80} value={variant.name} disabled={busy} onChange={event => changePage(selected.id, { variants: selected.variants.map(item => item.id === variant.id ? { ...item, name: event.target.value } : item) })} /></label>
              <div className="button-row"><button className="ui-button" disabled={busy} onClick={() => selectMedia('image', variant.id)}>Remplacer l’image</button><button className="ui-button danger" disabled={busy} aria-label={`Supprimer la variante ${variant.name}`} onClick={() => { changePage(selected.id, { variants: selected.variants.filter(item => item.id !== variant.id) }); interaction.reset(); }}>Supprimer</button></div>
            </div>)}</div>
          </section>
        </>}
      </div>
    </div>
    <input hidden type="file" ref={mediaInput} data-testid="media-input" onChange={onMediaSelected} />
    <input hidden type="file" ref={zipInput} data-testid="zip-input" accept=".zip,application/zip" onChange={importZip} />
    {confirmation && <Confirmation action={confirmation} onClose={() => setConfirmation(null)} />}
  </section>;
}
