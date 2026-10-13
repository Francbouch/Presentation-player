import { clamp, createInteractiveButton, MIN_BUTTON_SIZE, orderedLayers, uid } from './document.js';

const targetValue = target => target?.kind === 'variant' ? `variant:${target.variantId}` : target?.kind === 'media' ? `media:${target.mediaId}` : target?.kind === 'initial' ? 'initial' : target?.kind === 'main' ? 'main' : '';
const targetFromValue = value => value === 'initial' ? { kind: 'initial' } : value === 'main' ? { kind: 'main' } : value.startsWith('variant:') ? { kind: 'variant', variantId: value.slice(8) } : value.startsWith('media:') ? { kind: 'media', mediaId: value.slice(6) } : null;

function BackgroundPicker({ page, mediaById, value, onChange, label, allowNone = false, disabled = false }) {
  const imported = new Map();
  for (const target of [page.defaultBackground, ...page.buttons.map(button => button.target)]) {
    if (target?.kind === 'media') imported.set(target.mediaId, mediaById.get(target.mediaId));
  }
  return <label className="field">{label}<select aria-label={label} disabled={disabled} value={targetValue(value)} onChange={event => onChange(targetFromValue(event.target.value))}>
    {allowNone && <><option value="">Aucun arrière-plan associé</option><option value="initial">Arrière-plan initial</option></>}
    <option value="main">Image principale de la page</option>
    {page.variants.map(variant => <option key={variant.id} value={`variant:${variant.id}`}>Variante : {variant.name || 'Sans nom'}</option>)}
    {[...imported].map(([id, media]) => <option key={id} value={`media:${id}`}>Image importée : {media?.name || 'Sans nom'}</option>)}
  </select></label>;
}

export default function ButtonSettings({ page, urls, mediaById, selectedButtonId, onSelect, changePage, changeButton, importButtonMedia, busy, interaction, setPreviewMode }) {
  const selected = page.buttons.find(button => button.id === selectedButtonId);
  function add() {
    const button = createInteractiveButton(page.buttons.length + 1);
    changePage(page.id, { buttons: [...page.buttons, button] });
    onSelect(button.id);
    setPreviewMode('position');
  }
  function duplicate() {
    const copy = { ...selected, id: uid(), name: `${selected.name.slice(0, 70)} (copie)`, x: clamp(selected.x + .03, 0, 1 - selected.width), y: clamp(selected.y + .03, 0, 1 - selected.height) };
    changePage(page.id, { buttons: [...page.buttons, copy] });
    onSelect(copy.id);
    setPreviewMode('position');
  }
  function numericChange(key, value) {
    if (value === '' || !Number.isFinite(Number(value))) return;
    const number = Number(value) / 100;
    const max = key === 'x' ? 1 - selected.width : key === 'y' ? 1 - selected.height : key === 'width' ? 1 - selected.x : 1 - selected.y;
    changeButton(selected.id, { [key]: clamp(number, ['width', 'height'].includes(key) ? MIN_BUTTON_SIZE : 0, max) });
  }

  return <section id="button-settings" className="settings-panel buttons-panel" aria-label="Boutons interactifs">
    <div className="panel-heading"><div><h2>Boutons interactifs</h2><p className="help">Placez vos boutons et configurez leur action dans les propriétés à droite.</p></div><button className="ui-button" disabled={busy || orderedLayers(page).length >= 500} onClick={add}>+ Ajouter un bouton</button></div>
    <div className="default-background-settings">
      <BackgroundPicker page={page} mediaById={mediaById} value={page.defaultBackground} disabled={busy} label="Arrière-plan affiché par défaut" onChange={target => { changePage(page.id, { defaultBackground: target }); interaction.reset(); }} />
      <button className="ui-button" disabled={busy} onClick={() => importButtonMedia('defaultBackground')}>Importer l’arrière-plan par défaut</button>
      <label className="checkbox-field"><input type="checkbox" checked={page.showActiveButton} disabled={busy} onChange={event => changePage(page.id, { showActiveButton: event.target.checked })} />Afficher un indicateur sur le bouton actif</label>
    </div>
    {!page.buttons.length ? <p className="variants-empty">Aucun bouton sur cette page. Cliquez sur « Ajouter un bouton » pour commencer.</p> : <div className="button-settings-layout">
      <div className="interactive-button-list" aria-label="Liste des boutons">{page.buttons.map((button, index) => <button key={button.id} className={`button-list-item ${selectedButtonId === button.id ? 'selected' : ''}`} disabled={busy} aria-pressed={selectedButtonId === button.id} onClick={() => onSelect(button.id)}>
        {urls[button.imageId] ? <img src={urls[button.imageId]} alt="" /> : <span className="button-list-icon">▧</span>}<span>{button.name || `Bouton ${index + 1}`}<small>{button.action ? ({ background: 'Arrière-plan associé', visibility: 'Action sur les calques', video: 'Lecture vidéo', navigate: 'Navigation', state: 'État interactif' })[button.action.type] : 'À configurer'}</small></span>
      </button>)}</div>
      {!selected ? <div className="button-properties-empty">Sélectionnez un bouton ici ou dans l’aperçu pour le modifier.</div> : <div className="button-properties" aria-label="Propriétés du bouton">
        <label className="field">Nom du bouton<input aria-label="Nom du bouton" maxLength={80} value={selected.name} disabled={busy} onChange={event => changeButton(selected.id, { name: event.target.value })} /></label>
        <div className="button-image-property">{urls[selected.imageId] && <img src={urls[selected.imageId]} alt="Aperçu de l’image du bouton" />}<div><p className="media-name">{mediaById.get(selected.imageId)?.name || 'Pas encore d’image : le nom est affiché.'}</p><div className="button-row"><button className="ui-button" disabled={busy} onClick={() => importButtonMedia('buttonImage', selected.id)}>Importer / remplacer l’image du bouton</button><button className="ui-button danger" disabled={busy || !selected.imageId} onClick={() => changeButton(selected.id, { imageId: null })}>Retirer l’image du bouton</button></div></div></div>
        {(!selected.action || selected.action.type === 'background') && <><BackgroundPicker page={page} mediaById={mediaById} value={selected.target} disabled={busy} label="Arrière-plan au clic" allowNone onChange={target => { changeButton(selected.id, { target }); interaction.reset(); }} /><button className="ui-button" disabled={busy} onClick={() => importButtonMedia('buttonBackground', selected.id)}>Importer un arrière-plan pour ce bouton</button></>}
        <div className="button-row"><button className="ui-button" disabled={busy || !selected.action} onClick={() => { setPreviewMode('test'); interaction.activateButton(selected); }}>Tester ce bouton</button></div>
        <div className="button-dimensions">{[['x', 'Position horizontale'], ['y', 'Position verticale'], ['width', 'Largeur'], ['height', 'Hauteur']].map(([key, label]) => <label className="field" key={key}>{label} (%)<input aria-label={`${label} du bouton (%)`} type="number" step="0.1" min={['width', 'height'].includes(key) ? 2 : 0} max="100" value={Number((selected[key] * 100).toFixed(2))} disabled={busy} onChange={event => numericChange(key, event.target.value)} /></label>)}</div>
        <p className="help">Dans l’aperçu, glissez le bouton pour le déplacer et sa poignée pour le redimensionner. Les valeurs sont proportionnelles au cadre 16:9. Les touches fléchées permettent aussi un réglage précis.</p>
        <div className="button-row"><button className="ui-button" disabled={busy} onClick={() => { setPreviewMode('position'); document.querySelector('.editor-preview')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>Positionner dans l’aperçu</button><button className="ui-button" disabled={busy || orderedLayers(page).length >= 500} onClick={duplicate}>Dupliquer le bouton</button><button className="ui-button danger" disabled={busy} onClick={() => { changePage(page.id, { buttons: page.buttons.filter(button => button.id !== selected.id) }); onSelect(null); }}>Supprimer le bouton</button></div>
      </div>}
    </div>}
  </section>;
}
