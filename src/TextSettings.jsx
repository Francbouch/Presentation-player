import { useEffect, useState } from 'react';
import { clamp } from './document.js';
import { TEXT_FONTS, TEXT_PRESETS } from './textModel.js';

function NumberSetting({ value, min, max, step, label, disabled, change }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(previous => previous !== '' && Number(previous) === value ? previous : String(value)); }, [value]);
  return <input aria-label={label} type="number" min={min} max={max} step={step} value={draft} disabled={disabled} onChange={event => {
    const raw = event.target.value; setDraft(raw);
    if (raw !== '' && Number.isFinite(Number(raw)) && Number(raw) >= min && Number(raw) <= max) change(Number(raw));
  }} onBlur={() => {
    const next = draft !== '' && Number.isFinite(Number(draft)) ? clamp(Number(draft), min, max) : value;
    setDraft(String(next)); if (next !== value) change(next);
  }} />;
}

function HexColor({ color, change, disabled }) {
  const [value, setValue] = useState(color);
  const [error, setError] = useState(false);
  useEffect(() => { setValue(color); setError(false); }, [color]);
  function apply(raw, blur = false) {
    let next = raw.startsWith('#') ? raw : `#${raw}`;
    if (blur && /^#[0-9a-f]{3}$/i.test(next)) next = '#' + [...next.slice(1)].map(char => char + char).join('');
    if (/^#[0-9a-f]{6}$/i.test(next)) { change(next.toLowerCase()); setError(false); if (blur) setValue(next); }
    else if (blur) setError(true);
  }
  return <label className="field">Valeur HEX<input aria-label="Couleur HEX du texte" maxLength={7} value={value} disabled={disabled} aria-invalid={error} onChange={event => { setValue(event.target.value); apply(event.target.value); }} onBlur={() => apply(value, true)} />{error && <small className="input-error">Utilisez une couleur comme #ffffff.</small>}</label>;
}
export default function TextSettings({ item, change, busy }) {
  const style = item.textStyle;
  const disabled = busy || item.locked;
  function update(patch) { change(item.id, { textStyle: { ...style, ...patch, preset: 'custom' } }); }
  function number(key, value, min, max) { if (value !== '' && Number.isFinite(Number(value))) update({ [key]: clamp(Number(value), min, max) }); }
  function align(axis, edge) {
    change(item.id, axis === 'x' ? { x: edge === 'start' ? 0 : edge === 'center' ? (1 - item.width) / 2 : 1 - item.width } : { y: edge === 'start' ? 0 : edge === 'center' ? (1 - item.height) / 2 : 1 - item.height });
  }
  return <section className="text-settings" aria-label="Typographie"><h3>Texte et typographie</h3>
    <label className="field">Contenu du texte<textarea aria-label="Contenu du texte" maxLength={10000} rows={4} disabled={disabled} value={item.content} onChange={event => change(item.id, { content: event.target.value }, { debounce: true, typingId: item.id })} /></label>
    <label className="field">Style rapide<select aria-label="Style rapide du texte" disabled={disabled} value={style.preset} onChange={event => { if (TEXT_PRESETS[event.target.value]) change(item.id, { textStyle: { ...style, ...TEXT_PRESETS[event.target.value].style } }); }}><option value="custom">Personnalisé</option>{Object.entries(TEXT_PRESETS).map(([key, preset]) => <option key={key} value={key}>{preset.name}</option>)}</select></label>
    <label className="field">Police<select aria-label="Police du texte" disabled={disabled} value={style.font} onChange={event => update({ font: event.target.value })}>{Object.entries(TEXT_FONTS).map(([key, font]) => <option key={key} value={key}>{font.name}</option>)}</select></label>
    <label className="field">Taille<NumberSetting label="Taille du texte" min={8} max={320} step={1} value={style.fontSize} disabled={disabled} change={value => number('fontSize', value, 8, 320)} /></label>
    <div className="text-format-controls button-row" role="group" aria-label="Apparence du texte">{[['bold', 'Gras', 'G'], ['italic', 'Italique', 'I'], ['underline', 'Souligné', 'S']].map(([key, label, icon]) => <button key={key} type="button" className={`ui-button format-${key}`} aria-label={label} aria-pressed={style[key]} disabled={disabled} onClick={() => update({ [key]: !style[key] })}>{icon}</button>)}</div>
    <div className="text-color-controls"><label className="field">Couleur<input aria-label="Couleur du texte" type="color" value={item.color} disabled={disabled} onChange={event => change(item.id, { color: event.target.value })} /></label><HexColor color={item.color} disabled={disabled} change={color => change(item.id, { color })} /></div>
    <label className="field">Alignement du texte<select aria-label="Alignement du texte" value={style.align} disabled={disabled} onChange={event => update({ align: event.target.value })}><option value="left">Gauche</option><option value="center">Centré</option><option value="right">Droite</option></select></label>
    <label className="field">Alignement vertical<select aria-label="Alignement vertical du texte" value={style.verticalAlign} disabled={disabled} onChange={event => update({ verticalAlign: event.target.value })}><option value="top">Haut</option><option value="center">Centre</option><option value="bottom">Bas</option></select></label>
    <div className="text-number-controls"><label className="field">Interligne<NumberSetting label="Interligne du texte" min={.5} max={3} step={.05} disabled={disabled} value={style.lineHeight} change={value => number('lineHeight', value, .5, 3)} /></label><label className="field">Espacement des lettres<NumberSetting label="Espacement des lettres" min={-10} max={100} step={.5} disabled={disabled} value={style.letterSpacing} change={value => number('letterSpacing', value, -10, 100)} /></label></div>
    <label className="field">Marges intérieures<NumberSetting label="Marges intérieures du texte" min={0} max={200} step={1} value={style.padding} disabled={disabled} change={value => number('padding', value, 0, 200)} /></label>
    {[['uppercase', 'Afficher en majuscules'], ['wrap', 'Retour automatique à la ligne'], ['autoHeight', 'Adapter la hauteur au contenu']].map(([key, label]) => <label className="checkbox-field" key={key}><input aria-label={label} type="checkbox" disabled={disabled} checked={style[key]} onChange={event => update({ [key]: event.target.checked })} />{label}</label>)}
    <p className="help">Sans hauteur automatique, le bloc garde sa taille. Le repère ! signale un texte coupé. Redimensionner sa hauteur repasse en taille fixe.</p>
    <details className="text-slide-alignment"><summary>Aligner le bloc sur la page</summary><div className="button-row">{[['x', 'start', 'À gauche'], ['x', 'center', 'Centrer horizontalement'], ['x', 'end', 'À droite'], ['y', 'start', 'En haut'], ['y', 'center', 'Centrer verticalement'], ['y', 'end', 'En bas']].map(([axis, edge, label]) => <button key={label} className="ui-button" disabled={disabled} onClick={() => align(axis, edge)}>{label}</button>)}</div></details>
    <p className="help">Double-cliquez sur le texte dans l’aperçu pour écrire. Échap termine la saisie. Les polices utilisent des remplacements locaux si nécessaire ; aucun téléchargement de police n’est requis.</p>
  </section>;
}
