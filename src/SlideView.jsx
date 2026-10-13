import { useEffect, useRef } from 'react';
import { demoComponents } from './slides.jsx';
import { orderedLayers, resolveBackground } from './document.js';
import InteractiveButtons from './InteractiveButtons.jsx';

export default function SlideView({ page, urls, interaction, number, total, buttonEditing, onBackgroundReady }) {
  const target = interaction.target || page.defaultBackground;
  const source = urls[resolveBackground(page, target)] || urls[resolveBackground(page, page.defaultBackground)];
  const Demo = demoComponents[page.demoTemplate];
  const image = useRef(null);
  useEffect(() => {
    if (!onBackgroundReady && !interaction.backgroundReady) return;
    let cancelled = false;
    // Décoder l’image réellement montée, pas seulement une copie de préchargement.
    const ready = source ? image.current.decode() : Promise.resolve();
    const report = ready => { if (!cancelled) { const result = { pageId: page.id, source, ready }; onBackgroundReady?.(result); interaction.backgroundReady?.(result); } };
    ready.then(() => report(true)).catch(() => report(false));
    return () => { cancelled = true; };
  }, [source, page.id, onBackgroundReady, interaction.backgroundReady]);
  return <div className="slide" key={page.id}>
    {source ? <img ref={image} className="slide-background" src={source} alt={page.title} /> : <div className="empty-slide"><span>▧</span><p>Aucune image</p><small>Importez une image dans l’éditeur.</small></div>}
    {Demo && <><div className="slide-shade" /><Demo /></>}
    {page.variants.length > 0 && <div className="choices variant-choices" aria-label="Variantes d’image">
      <button aria-pressed={target?.kind === 'main'} onClick={() => interaction.choose({ kind: 'main' })}>Image principale</button>
      {page.variants.map(item => <button key={item.id} aria-pressed={target?.kind === 'variant' && target.variantId === item.id} onClick={() => interaction.choose({ kind: 'variant', variantId: item.id })}>{item.name}</button>)}
    </div>}
    <InteractiveButtons key={page.id} buttons={orderedLayers(page).map(layer => ({ ...layer, visible: interaction.visibility?.[layer.id] ?? layer.visible }))} urls={urls} activeButtonId={interaction.activeButtonId} showActiveButton={page.showActiveButton} onActivate={interaction.activateButton} {...buttonEditing} />
    <span className="slide-number">{String(number).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
  </div>;
}
