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

export default function TextBlock({ item, storedHeight, editingText, canMeasure, change, finish, onMeasuredHeight }) {
  const viewport = useRef(null);
  const body = useRef(null);
  const lastInput = useRef(null);
  const [overflow, setOverflow] = useState(false);
  const style = item.textStyle || DEFAULT_TEXT_STYLE;
  const logicalWidth = item.width * TEXT_WIDTH;
  const logicalHeight = item.height * TEXT_HEIGHT;
  const callbacks = useRef({ item, storedHeight, style, change, canMeasure, onMeasuredHeight });
  callbacks.current = { item, storedHeight, style, change, canMeasure, onMeasuredHeight };

  useLayoutEffect(() => {
    function measure() {
      const width = parseFloat(getComputedStyle(viewport.current).width);
      const scale = width / logicalWidth;
      viewport.current.style.setProperty('--text-scale', scale);
      viewport.current.dataset.textScale = scale;
      const { item, storedHeight, style, change, canMeasure, onMeasuredHeight } = callbacks.current;
      const natural = body.current.scrollHeight + style.padding * 2;
      const maxHeight = (1 - item.y) * TEXT_HEIGHT;
      const height = Math.max(.02, Math.min(maxHeight, natural) / TEXT_HEIGHT);
      setOverflow(natural > item.height * TEXT_HEIGHT + 1 || body.current.scrollWidth > Math.max(0, item.width * TEXT_WIDTH - style.padding * 2) + 1);
      if (style.autoHeight) onMeasuredHeight(item.id, height);
      if (style.autoHeight && canMeasure && !item.locked && Math.abs(height - storedHeight) > .00001) change(item.id, { height }, { autoMeasure: true, debounce: true });
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport.current); observer.observe(body.current);
    let cancelled = false;
    document.fonts?.ready.then(() => { if (!cancelled) measure(); });
    return () => { cancelled = true; observer.disconnect(); };
  }, [logicalWidth, logicalHeight, item.y, item.content, style, canMeasure]);

  useLayoutEffect(() => {
    if (!editingText) { lastInput.current = null; body.current.parentElement.scrollTop = 0; viewport.current.scrollTop = 0; return; }
    if (lastInput.current !== item.content) { body.current.textContent = item.content; if (item.content.endsWith('\n')) body.current.appendChild(document.createElement('br')); lastInput.current = item.content; }
    body.current.focus();
  }, [editingText]);
  useLayoutEffect(() => {
    if (editingText && lastInput.current !== item.content) { body.current.textContent = item.content; if (item.content.endsWith('\n')) body.current.appendChild(document.createElement('br')); lastInput.current = item.content; }
  }, [item.content, editingText]);

  function input() {
    const raw = plainText(body.current);
    const content = raw.slice(0, 10000);
    if (raw.length > 10000) body.current.textContent = content;
    if (content === lastInput.current) return;
    lastInput.current = content;
    change(item.id, { content }, { debounce: true, typingId: item.id });
  }
  function paste(event) {
    event.preventDefault(); event.stopPropagation();
    const text = event.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n');
    const selection = window.getSelection();
    if (!selection.rangeCount || !body.current.contains(selection.anchorNode)) return;
    const range = selection.getRangeAt(0); range.deleteContents();
    const remaining = Math.max(0, 10000 - plainText(body.current).length);
    const node = document.createTextNode(text.slice(0, remaining));
    range.insertNode(node); range.setStartAfter(node); range.collapse(true);
    selection.removeAllRanges(); selection.addRange(range); input();
  }
  return <div ref={viewport} className={`text-viewport ${editingText ? 'is-writing' : ''}`} data-text-overflow={overflow}>
    <div className="layer-text-content text-layout" style={{ width: logicalWidth, height: logicalHeight, transform: 'scale(var(--text-scale, 1))', padding: style.padding, fontFamily: TEXT_FONTS[style.font]?.css || TEXT_FONTS.arial.css, fontSize: style.fontSize, fontWeight: style.bold ? 700 : 400, fontStyle: style.italic ? 'italic' : 'normal', textDecoration: style.underline ? 'underline' : 'none', textAlign: style.align, lineHeight: style.lineHeight, letterSpacing: style.letterSpacing, textTransform: style.uppercase ? 'uppercase' : 'none', justifyContent: ({ top: 'flex-start', center: 'center', bottom: 'flex-end' })[style.verticalAlign] }}>
      <div ref={body} className="text-body" data-trailing-newline={!editingText && item.content.endsWith('\n')} role={editingText ? 'textbox' : undefined} aria-label={editingText ? `Modifier le texte ${item.name}` : undefined} aria-multiline={editingText ? true : undefined} contentEditable={editingText ? 'plaintext-only' : undefined} suppressContentEditableWarning spellCheck={editingText} style={{ whiteSpace: style.wrap ? 'pre-wrap' : 'pre', overflowWrap: style.wrap ? 'anywhere' : 'normal' }} onPointerDown={event => { if (editingText) event.stopPropagation(); }} onClick={event => { if (editingText) event.stopPropagation(); }} onDoubleClick={event => { if (editingText) event.stopPropagation(); }} onBeforeInput={event => { if (event.nativeEvent.inputType?.startsWith('format')) event.preventDefault(); }} onInput={input} onPaste={paste} onBlur={() => { if (editingText) finish(); }} onKeyDown={event => {
        if (!editingText) return;
        event.stopPropagation();
        if (event.key === 'Escape' && !event.nativeEvent.isComposing) { event.preventDefault(); finish(); viewport.current.closest('.layer-content')?.focus(); }
      }}>{editingText ? undefined : item.content}</div>
    </div>
    {overflow && canMeasure && !editingText && <span className="text-overflow-indicator" title="Texte coupé : activez la hauteur automatique, agrandissez le bloc ou réduisez la taille." aria-label="Le texte dépasse son bloc">!</span>}
  </div>;
}
