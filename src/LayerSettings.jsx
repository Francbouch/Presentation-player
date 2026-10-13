import { clamp, MIN_BUTTON_SIZE, orderedLayers } from './document.js';

export function LayerToolbar({ disabled, add, importImage, undo, redo, canUndo, canRedo }) {
  return <div className="layer-toolbar button-row" role="toolbar" aria-label="Ajouter des calques">
    <button className="ui-button" disabled={disabled} onClick={importImage}>+ Image</button>
    <button className="ui-button" disabled={disabled} onClick={() => add('text')}>+ Texte</button>
    <button className="ui-button" disabled={disabled} onClick={() => add('rectangle')}>+ Rectangle</button>
    <button className="ui-button" disabled={disabled} onClick={() => add('circle')}>+ Cercle</button>
    <button className="ui-button" disabled={disabled} onClick={() => add('line')}>+ Ligne</button>
    <button className="ui-button" disabled={disabled} onClick={() => add('button')}>+ Bouton</button>
    <span className="toolbar-spacer" />
    <button className="ui-button" disabled={disabled || !canUndo} onClick={undo}>↶ Annuler</button>
    <button className="ui-button" disabled={disabled || !canRedo} onClick={redo}>↷ Rétablir</button>
  </div>;
}

export function LayerPanel({ page, selectedId, onSelect, change, disabled }) {
  return <details className="layers-panel" open><summary>Calques <span>{orderedLayers(page).length}</span></summary>
    <p className="help">Le premier élément de la liste est au premier plan.</p>
    <ol className="layer-list">{orderedLayers(page).reverse().map(layer => <li key={layer.id} className={selectedId === layer.id ? 'selected' : ''}>
      <button className="layer-select" disabled={disabled} aria-pressed={selectedId === layer.id} aria-label={`Sélectionner le calque ${layer.name}`} onClick={() => onSelect(layer.id)}><span aria-hidden="true">{({ image: '▧', text: 'T', button: '▣', circle: '○', rectangle: '□', line: '╱' })[layer.type]}</span><span>{layer.name || 'Sans nom'}</span></button>
      <button disabled={disabled} aria-label={`${layer.visible ? 'Masquer' : 'Afficher'} le calque ${layer.name}`} title={layer.visible ? 'Masquer' : 'Afficher'} onClick={() => change(layer.id, { visible: !layer.visible })}>{layer.visible ? '◉' : '○'}</button>
      <button disabled={disabled} aria-label={`${layer.locked ? 'Déverrouiller' : 'Verrouiller'} le calque ${layer.name}`} title={layer.locked ? 'Déverrouiller' : 'Verrouiller'} onClick={() => change(layer.id, { locked: !layer.locked })}>{layer.locked ? '🔒' : '🔓'}</button>
    </li>)}</ol>
    {!orderedLayers(page).length && <p className="help">Ajoutez un élément avec la barre d’outils au-dessus de l’aperçu.</p>}
  </details>;
}

export function LayerProperties({ layer, change, duplicate, remove, reorder, importImage, media, busy }) {
  if (!layer) return <details className="layer-properties settings-panel" open><summary>Propriétés du calque</summary><p className="help">Cliquez sur un élément de l’aperçu ou du panneau Calques.</p></details>;
  function numeric(key, value) {
    if (value === '' || !Number.isFinite(Number(value))) return;
    const number = Number(value) / 100;
    const max = key === 'x' ? 1 - layer.width : key === 'y' ? 1 - layer.height : key === 'width' ? 1 - layer.x : 1 - layer.y;
    change(layer.id, { [key]: clamp(number, ['width', 'height'].includes(key) ? MIN_BUTTON_SIZE : 0, max) });
  }
  return <details className="layer-properties settings-panel" open><summary>Propriétés du calque</summary><div className="layer-property-fields">
    <label className="field">Nom du calque<input aria-label="Nom du calque" maxLength={80} disabled={busy} value={layer.name} onChange={event => change(layer.id, { name: event.target.value })} /></label>
    <div className="layer-coordinates">{[['x', 'X'], ['y', 'Y'], ['width', 'Largeur'], ['height', 'Hauteur']].map(([key, label]) => <label className="field" key={key}>{label} (%)<input aria-label={`${label} du calque (%)`} type="number" step="0.1" disabled={busy || layer.locked} value={Number((layer[key] * 100).toFixed(2))} onChange={event => numeric(key, event.target.value)} /></label>)}</div>
    <label className="field">Rotation (°)<input aria-label="Rotation du calque" type="number" min="-360" max="360" step="1" value={Math.round(layer.rotation * 10) / 10} disabled={busy || layer.locked} onChange={event => { if (event.target.value !== '') change(layer.id, { rotation: clamp(Number(event.target.value), -360, 360) }); }} /></label>
    <label className="field">Opacité : {Math.round(layer.opacity * 100)} %<input aria-label="Opacité du calque" type="range" min="0" max="100" value={Math.round(layer.opacity * 100)} disabled={busy} onChange={event => change(layer.id, { opacity: Number(event.target.value) / 100 })} /></label>
    <label className="checkbox-field"><input type="checkbox" checked={layer.visible} disabled={busy} onChange={event => change(layer.id, { visible: event.target.checked })} />Calque visible</label>
    <label className="checkbox-field"><input type="checkbox" checked={layer.locked} disabled={busy} onChange={event => change(layer.id, { locked: event.target.checked })} />Verrouiller le déplacement</label>
    {layer.type === 'text' && <label className="field">Contenu du texte<textarea aria-label="Contenu du texte" maxLength={10000} rows={4} disabled={busy} value={layer.content} onChange={event => change(layer.id, { content: event.target.value })} /></label>}
    {['text', 'rectangle', 'circle', 'line'].includes(layer.type) && <label className="field">Couleur<input aria-label="Couleur du calque" type="color" disabled={busy} value={layer.color} onChange={event => change(layer.id, { color: event.target.value })} /></label>}
    {layer.type === 'image' && <><label className="field">Réutiliser une image du projet<select aria-label="Image du calque" disabled={busy} value={layer.imageId || ''} onChange={event => change(layer.id, { imageId: event.target.value || null })}><option value="">Aucune image</option>{media.filter(item => item.type.startsWith('image/')).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className="ui-button" disabled={busy} onClick={() => importImage(layer.id)}>Remplacer l’image du calque</button></>}
    {layer.type === 'button' && <button className="ui-button" onClick={() => window.document.getElementById('button-settings')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Configurer l’image et l’arrière-plan du bouton</button>}
    <div className="layer-order-actions button-row">{[['front', 'Premier plan'], ['up', 'Monter le calque'], ['down', 'Descendre le calque'], ['back', 'Arrière-plan']].map(([action, label]) => <button className="ui-button" key={action} disabled={busy} onClick={() => reorder(layer.id, action)}>{label}</button>)}</div>
    <div className="button-row"><button className="ui-button" disabled={busy} onClick={() => duplicate(layer)}>Dupliquer le calque</button><button className="ui-button danger" disabled={busy} onClick={() => remove(layer)}>Supprimer le calque</button></div>
    <p className="help">Le cadre, la rotation et l’opacité sont identiques dans le lecteur. La mise en forme avancée du texte viendra dans une prochaine phase.</p>
  </div></details>;
}
