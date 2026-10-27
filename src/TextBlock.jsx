import ParagraphText,{setEditableParagraphs,styleEditableParagraphs} from './ParagraphText.jsx';
import {contentPatch,exitEmptyList} from './textLists.js';
import {ensureFont,textWeight} from './fonts.js';
import { useLayoutEffect, useRef, useState } from 'react';
import { DEFAULT_TEXT_STYLE, TEXT_FONTS, TEXT_HEIGHT, TEXT_WIDTH } from './textModel.js';

// Lire les retours à la ligne du DOM sans innerText : celui-ci transformerait
// aussi le contenu en majuscules si le style d’affichage est activé.
function plainText(root) {
  let text = '', previousBlock = false;
  const nodes = [...root.childNodes].filter(node => node.nodeType !== Node.TEXT_NODE || node.data !== '');
  nodes.forEach((node, index) => {
    if (node.nodeType === Node.TEXT_NODE) { if (previousBlock) text += '\n'; text += node.data; previousBlock = false; }
    else if (node.nodeType === Node.ELEMENT_NODE) {
      const block = ['DIV', 'P'].includes(node.tagName);
      if (block && index > 0) text += '\n';
      if (node.tagName === 'BR') {
        const previous = nodes[index - 1];
        const nextIsBlock = ['DIV', 'P'].includes(nodes[index + 1]?.nodeName);
        const placeholder = nodes.length === 1 || (index === nodes.length - 1 && (previous?.nodeName === 'BR' || (previous?.nodeType === Node.TEXT_NODE && previous.data.endsWith('\n')))) || (nextIsBlock && (text === '' || text.endsWith('\n')));
        if (!placeholder) text += '\n';
      }
      else text += plainText(node);
      previousBlock = block;
    }
  });
  return text.replace(/\r\n?/g, '\n');
}

export default function TextBlock({ item, storedHeight, editingText, canMeasure, change, finish, onMeasuredHeight, coordinateSize }) {
  const viewport = useRef(null);
  const body = useRef(null);
  const lastInput = useRef(null);
  const [overflow, setOverflow] = useState(false);
  const style = item.textStyle || DEFAULT_TEXT_STYLE;
  const referenceWidth=coordinateSize?.width||TEXT_WIDTH, referenceHeight=coordinateSize?.height||TEXT_HEIGHT;
  const logicalWidth = item.width * referenceWidth;
  const logicalHeight = item.height * referenceHeight;
  const callbacks = useRef({ item, storedHeight, style, change, canMeasure, onMeasuredHeight, coordinateSize });
  callbacks.current = { item, storedHeight, style, change, canMeasure, onMeasuredHeight };

  useLayoutEffect(() => {
    function measure() {
      const width = parseFloat(getComputedStyle(viewport.current).width);
      const scale = width / logicalWidth;
      viewport.current.style.setProperty('--text-scale', scale);
      viewport.current.dataset.textScale = scale;
      const { item, storedHeight, style, change, canMeasure, onMeasuredHeight } = callbacks.current;
      const natural = body.current.scrollHeight + style.padding * 2;
      const maxHeight = (1 - item.y) * referenceHeight;
      const height = Math.max(.02, Math.min(maxHeight, natural) / referenceHeight);
      setOverflow(natural > item.height * referenceHeight + 1 || body.current.scrollWidth > Math.max(0, item.width * referenceWidth - style.padding * 2) + 1);
      if (style.autoHeight) onMeasuredHeight(item.id, height);
      if (style.autoHeight && canMeasure && !item.locked && Math.abs(height - storedHeight) > .00001) change(item.id, { height }, { autoMeasure: true, debounce: true });
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport.current); observer.observe(body.current);
    let cancelled = false;
    ensureFont(style.font, style.italic).then(() => { if (!cancelled) measure(); }).catch(() => {});
    document.fonts?.ready.then(() => { if (!cancelled) measure(); });
    return () => { cancelled = true; observer.disconnect(); };
  }, [referenceWidth,referenceHeight,logicalWidth, logicalHeight, item.y, item.content, item.textList, style, canMeasure, editingText]);

  useLayoutEffect(() => {
    if (!editingText) { lastInput.current = null; body.current.parentElement.scrollTop = 0; viewport.current.scrollTop = 0; return; }
    if (lastInput.current !== item.content) { if(item.textList)setEditableParagraphs(body.current,item);else body.current.textContent = item.content; if (!item.textList && item.content.endsWith('\n')) body.current.appendChild(document.createElement('br')); lastInput.current = item.content; }
    body.current.focus();
  }, [editingText]);
  useLayoutEffect(() => {
    if (editingText && lastInput.current !== item.content) { if(item.textList)setEditableParagraphs(body.current,item);else body.current.textContent = item.content; if (!item.textList && item.content.endsWith('\n')) body.current.appendChild(document.createElement('br')); lastInput.current = item.content; }
  }, [item.content, editingText]);

  useLayoutEffect(()=>{if(editingText&&item.textList)styleEditableParagraphs(body.current,item);},[item.textList,editingText,item.content]);
  function input() {
    const raw = plainText(body.current);
    const content = raw.slice(0, 10000);
    if (raw.length > 10000) body.current.textContent = content;
    if (content === lastInput.current) return;
    lastInput.current = content;
    change(item.id, contentPatch(item,content), { debounce: true, typingId: item.id });
  }
  function paste(event) {
    event.preventDefault(); event.stopPropagation();
    const text = event.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n');
    const selection = window.getSelection();
    if (!selection.rangeCount || !body.current.contains(selection.anchorNode)) return;
    const range = selection.getRangeAt(0);
    const remaining = Math.max(0, 10000 - plainText(body.current).length + range.toString().length);
    // insertText conserve l’historique natif du champ pour Ctrl/Cmd+Z.
    if (document.queryCommandSupported?.('insertText') && document.execCommand('insertText', false, text.slice(0, remaining))) { input(); return; }
    range.deleteContents();
    const node = document.createTextNode(text.slice(0, remaining));
    range.insertNode(node); range.setStartAfter(node); range.collapse(true);
    selection.removeAllRanges(); selection.addRange(range); input();
  }
  return <div ref={viewport} className={`text-viewport ${editingText ? 'is-writing' : ''}`} data-text-overflow={overflow}>
    <div className="layer-text-content text-layout" style={{ width: logicalWidth, height: logicalHeight, transform: 'scale(var(--text-scale, 1))', padding: style.padding, fontFamily: TEXT_FONTS[style.font]?.css || TEXT_FONTS.arial.css, fontSize: style.fontSize, fontWeight: textWeight(style), fontStyle: style.italic ? 'italic' : 'normal', textDecoration: style.underline ? 'underline' : 'none', textAlign: style.align, lineHeight: style.lineHeight, letterSpacing: style.letterSpacing, textTransform: style.uppercase ? 'uppercase' : 'none', justifyContent: ({ top: 'flex-start', center: 'center', bottom: 'flex-end' })[style.verticalAlign] }}>
      <div key={item.textList?`list-${editingText}`:'plain'} ref={body} className={`text-body ${item.textList?'has-paragraph-lists':''}`} data-trailing-newline={!item.textList && !editingText && item.content.endsWith('\n')} role={editingText ? 'textbox' : undefined} aria-label={editingText ? `Modifier le texte ${item.name}` : undefined} aria-multiline={editingText ? true : undefined} contentEditable={editingText ? (item.textList?'true':'plaintext-only') : undefined} suppressContentEditableWarning spellCheck={editingText} style={{ whiteSpace: style.wrap ? 'pre-wrap' : 'pre', overflowWrap: style.wrap ? 'anywhere' : 'normal' }} onPointerDown={event => { if (editingText) event.stopPropagation(); }} onClick={event => { if (editingText) event.stopPropagation(); }} onDoubleClick={event => { if (editingText) event.stopPropagation(); }} onBeforeInput={event => { if (event.nativeEvent.inputType?.startsWith('format')) event.preventDefault(); }} onInput={input} onPaste={paste} onBlur={() => { if (editingText) finish(); }} onKeyDown={event => {
        if (!editingText) return;
        event.stopPropagation();
        if(event.key==='Enter'&&!event.nativeEvent.isComposing&&item.textList){const selection=window.getSelection();let node=selection?.anchorNode;while(node&&node.parentNode!==body.current)node=node.parentNode;const index=[...body.current.childNodes].indexOf(node);if(selection?.isCollapsed&&index>=0){const pos=item.content.split('\n').slice(0,index).reduce((n,line)=>n+line.length+1,0);const list=exitEmptyList(item,pos);if(list){event.preventDefault();change(item.id,{textList:list});}}}

        if (event.key === 'Escape' && !event.nativeEvent.isComposing) { event.preventDefault(); finish(); viewport.current.closest('.layer-content')?.focus(); }
      }}>{editingText ? undefined : item.textList ? <ParagraphText item={item}/> : item.content}</div>
    </div>
    {overflow && canMeasure && !editingText && <span className="text-overflow-indicator" title="Texte coupé : activez la hauteur automatique, agrandissez le bloc ou réduisez la taille." aria-label="Le texte dépasse son bloc">!</span>}
  </div>;
}
