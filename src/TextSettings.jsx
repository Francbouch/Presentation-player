import {contentPatch,toggleList,exitEmptyList} from './textLists.js';
import FontPicker from './FontPicker.jsx';
import {textWeight} from './fonts.js';
import ColorInput from './ProjectColors.jsx';
import { useEffect, useRef, useState } from 'react';
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
export default function TextSettings({ item, change, busy, buttonMode = false }) {
  const textInput=useRef(null),textSelection=useRef(null);
  useEffect(()=>{textSelection.current=null;},[item.id]);
  const style = item.textStyle;
  const disabled = busy || item.locked;
  function update(patch) { change(item.id, { textStyle: { ...style, ...patch, preset: 'custom' } }); }
  function number(key, value, min, max) { if (value !== '' && Number.isFinite(Number(value))) update({ [key]: clamp(Number(value), min, max) }); }
  function align(axis, edge) {
    change(item.id, axis === 'x' ? { x: edge === 'start' ? 0 : edge === 'center' ? (1 - item.width) / 2 : 1 - item.width } : { y: edge === 'start' ? 0 : edge === 'center' ? (1 - item.height) / 2 : 1 - item.height });
  }
  return <section className="text-settings" aria-label="Typographie"><h3>Texte et typographie</h3>
    <label className="field">Contenu du texte<textarea ref={textInput} onSelect={e=>{textSelection.current={start:e.target.selectionStart,end:e.target.selectionEnd};}} onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing&&e.currentTarget.selectionStart===e.currentTarget.selectionEnd){const list=exitEmptyList(item,e.currentTarget.selectionStart);if(list){e.preventDefault();change(item.id,{textList:list});}}}} aria-label="Contenu du texte" maxLength={10000} rows={4} disabled={disabled} value={item.content} onChange={event => change(item.id, contentPatch(item,event.target.value), { debounce: true, typingId: item.id })} /></label>
    {!buttonMode&&<div className="bullet-settings"><button className="ui-button" aria-label="Liste à puces" aria-pressed={!!item.textList?.bullets.length} disabled={disabled} onMouseDown={e=>e.preventDefault()} onClick={()=>{const selection=textSelection.current;change(item.id,{textList:toggleList(item,selection&&selection.start!==selection.end?selection.start:undefined,selection&&selection.start!==selection.end?selection.end:undefined)});textInput.current.focus();}}>☷ Liste à puces</button>{!!item.textList?.bullets.length&&<label className="field">Retrait des puces<input type="number" aria-label="Retrait des puces" min="0.75" max="4" step="0.25" value={item.textList.indent} disabled={disabled} onChange={e=>{const v=Number(e.target.value);if(v>=.75&&v<=4)change(item.id,{textList:{...item.textList,indent:v}});}}/></label>}</div>}
    <label className="field">Style rapide<select aria-label="Style rapide du texte" disabled={disabled} value={style.preset} onChange={event => { if (TEXT_PRESETS[event.target.value]) change(item.id, { textStyle: { ...style, ...TEXT_PRESETS[event.target.value].style, weight: TEXT_PRESETS[event.target.value].style.bold ? 700 : 400 } }); }}><option value="custom">Personnalisé</option>{Object.entries(TEXT_PRESETS).map(([key, preset]) => <option key={key} value={key}>{preset.name}</option>)}</select></label>
    <FontPicker value={style.font} disabled={disabled} change={font => { const weights=TEXT_FONTS[font].weights; const weight=textWeight(style); update({ font, ...(style.weight!==undefined ? {weight:weights?Math.max(weights[0],Math.min(weights.at(-1),weight)):weight}: {}) }); }} />
    <label className="field">Graisse<select aria-label="Graisse du texte" disabled={disabled} value={textWeight(style)} onChange={event=>update({weight:Number(event.target.value),bold:Number(event.target.value)>=700})}>{[...new Set([...(TEXT_FONTS[style.font]?.weights || [400,700]),textWeight(style)])].sort((a,b)=>a-b).map(weight=><option key={weight} value={weight}>{({100:'Fine',200:'Extra légère',300:'Légère',400:'Regular',500:'Medium',600:'Semibold',700:'Bold',800:'Extra Bold',900:'Black',1000:'Extra Black'})[weight] || weight} — {weight}</option>)}</select></label>
    <label className="field">Taille<NumberSetting label="Taille du texte" min={8} max={320} step={1} value={style.fontSize} disabled={disabled} change={value => number('fontSize', value, 8, 320)} /></label>
    <div className="text-format-controls button-row" role="group" aria-label="Apparence du texte">{[['bold', 'Gras', 'G'], ['italic', 'Italique', 'I'], ['underline', 'Souligné', 'S']].map(([key, label, icon]) => <button key={key} type="button" className={`ui-button format-${key}`} aria-label={label} aria-pressed={style[key]} disabled={disabled} onClick={() => update({ [key]: !style[key], ...(key==='bold'?{weight:style.bold?400:700}:{}) })}>{icon}</button>)}</div>
    <div className="text-color-controls"><label className="field">Couleur<ColorInput aria-label="Couleur du texte" type="color" colorPath={buttonMode?'labelText.color':'color'} value={item.color} disabled={disabled} onChange={event => change(item.id, { color: event.target.value })} /></label><HexColor color={item.color} disabled={disabled} change={color => change(item.id, { color })} /></div>
    <label className="field">Alignement du texte<select aria-label="Alignement du texte" value={style.align} disabled={disabled} onChange={event => update({ align: event.target.value })}><option value="left">Gauche</option><option value="center">Centré</option><option value="right">Droite</option></select></label>
    <label className="field">Alignement vertical<select aria-label="Alignement vertical du texte" value={style.verticalAlign} disabled={disabled} onChange={event => update({ verticalAlign: event.target.value })}><option value="top">Haut</option><option value="center">Centre</option><option value="bottom">Bas</option></select></label>
    <div className="text-number-controls"><label className="field">Interligne<NumberSetting label="Interligne du texte" min={.5} max={3} step={.05} disabled={disabled} value={style.lineHeight} change={value => number('lineHeight', value, .5, 3)} /></label><label className="field">Espacement des lettres<NumberSetting label="Espacement des lettres" min={-10} max={100} step={.5} disabled={disabled} value={style.letterSpacing} change={value => number('letterSpacing', value, -10, 100)} /></label></div>
    <label className="field">Marges intérieures<NumberSetting label="Marges intérieures du texte" min={0} max={200} step={1} value={style.padding} disabled={disabled} change={value => number('padding', value, 0, 200)} /></label>
    {[['uppercase', 'Afficher en majuscules'], ['wrap', 'Retour automatique à la ligne'], ...(!buttonMode ? [['autoHeight', 'Adapter la hauteur au contenu']] : [])].map(([key, label]) => <label className="checkbox-field" key={key}><input aria-label={label} type="checkbox" disabled={disabled} checked={style[key]} onChange={event => update({ [key]: event.target.checked })} />{label}</label>)}
    {!buttonMode && <><p className="help">Sans hauteur automatique, le bloc garde sa taille. Le repère ! signale un texte coupé. Redimensionner sa hauteur repasse en taille fixe.</p>
    <details className="text-slide-alignment"><summary>Aligner le bloc sur la page</summary><div className="button-row">{[['x', 'start', 'À gauche'], ['x', 'center', 'Centrer horizontalement'], ['x', 'end', 'À droite'], ['y', 'start', 'En haut'], ['y', 'center', 'Centrer verticalement'], ['y', 'end', 'En bas']].map(([axis, edge, label]) => <button key={label} className="ui-button" disabled={disabled} onClick={() => align(axis, edge)}>{label}</button>)}</div></details>
    <p className="help">Double-cliquez sur le texte dans l’aperçu pour écrire. Échap termine la saisie. Les polices Google sont hébergées avec l’application et chargées à la demande. Pour une utilisation hors ligne garantie, utilisez la version HTML autonome. Les favoris et polices récentes restent propres à ce navigateur.</p></>}
  </section>;
}
